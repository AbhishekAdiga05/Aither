import { convertToModelMessages, streamText } from "ai";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompt";
import db from "@/lib/db";
import { MessageRole, MessageType } from "@prisma/client";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { DEFAULT_MODEL_ID } from "@/lib/ai-models";
import { getAllowedFreeModelIds, isModelAllowedSync } from "@/lib/free-models.mjs";
import { rateLimit } from "@/lib/rate-limit.mjs";
import { classifyAiError } from "@/lib/ai-errors";

// Allow the streaming response up to 60 s on Vercel/Netlify before the
// serverless function is killed. Without this the default timeout (10-30s)
// cuts off slow free models mid-stream.
export const maxDuration = 60;

const MAX_CONTEXT_MESSAGES = 20;
const MAX_CONTEXT_CHARS = parseInt(process.env.MAX_CONTEXT_CHARS ?? "12000", 10);

// OpenRouter requires HTTP-Referer + X-Title for free model access.
// Without these headers free models may return 403 or be deprioritised.
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const provider = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": appUrl,
    "X-Title": "NeonChat",
  },
});

const toPlainTextContent = (msg) => {
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");
  }

  if (typeof msg.content === "string") {
    try {
      const parsed = JSON.parse(msg.content);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("\n");
      }
    } catch {
      // Not JSON, fall through to plain text.
    }
  }

  return msg.content || "";
};

const toSimpleTextMessage = (msg) => ({
  role: msg.role,
  content: toPlainTextContent(msg),
});

const TEXT_PART_TYPES = new Set(["text", "file"]);

const ensurePartsArray = (msg) => {
  if (Array.isArray(msg.parts) && msg.parts.length > 0) {
    return msg.parts;
  }

  if (typeof msg.content === "string") {
    try {
      const parsed = JSON.parse(msg.content);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.type) {
        return parsed;
      }
    } catch {
      // Not JSON, fall through.
    }
  }

  return [{ type: "text", text: msg.content || "" }];
};

// Keep only user-visible content (text/file). Drops reasoning traces,
// step-start markers, tool calls, etc. before they reach the model or DB.
const textOnlyParts = (msg) =>
  ensurePartsArray(msg).filter((p) => TEXT_PART_TYPES.has(p.type));

const partsToJSON = (msg) => JSON.stringify(textOnlyParts(msg));

export async function POST(req) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const {
      chatId,
      messages: newMessages,
      model: requestedModel,
      skipUserMessage,
      useWebSearch,
    } = body;
    const model = requestedModel || DEFAULT_MODEL_ID;

    if (typeof chatId !== "string" || !chatId) {
      return new Response(JSON.stringify({ error: "chatId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 🚦 Rate limit: per-user sliding-free window so a single account can't
    // hammer the AI backend on the deployed app.
    const rl = rateLimit(`chat:${session.user.id}`);
    const rateLimitHeaders = {
      "X-RateLimit-Limit": String(rl.limit),
      "X-RateLimit-Remaining": String(rl.remaining),
      "X-RateLimit-Reset": String(rl.resetAt),
    };

    if (!rl.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please wait a moment and try again.",
          retryAfter: rl.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...rateLimitHeaders,
            "Retry-After": String(rl.retryAfterSeconds),
          },
        },
      );
    }

    // 🔒 Cost guard + ownership check — run in parallel to cut latency.
    // Fast path: isModelAllowedSync is O(1) and covers all static safe models,
    // so most requests skip the async network round-trip entirely.
    // Slow path: only needed for models from the live catalog not yet in the
    // static snapshot (rare). Both checks run concurrently with the DB query.
    const isInStaticList = isModelAllowedSync(model);

    const [allowedModelIds, chat] = await Promise.all([
      // Only fetch the full async list if the sync check failed
      isInStaticList ? Promise.resolve(null) : getAllowedFreeModelIds(),
      // Ownership check in parallel
      db.chat.findUnique({
        where: { id: chatId, userId: session.user.id },
        select: { id: true, model: true },
      }),
    ]);

    // Evaluate model permission
    const isAllowed =
      isInStaticList ||
      (Array.isArray(allowedModelIds) && allowedModelIds.includes(model));

    if (!isAllowed) {
      return new Response(
        JSON.stringify({
          error: "The requested model is unavailable in this app.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...rateLimitHeaders },
        },
      );
    }

    if (!chat) {
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const normalizedNewMessages = Array.isArray(newMessages)
      ? newMessages
      : [newMessages].filter(Boolean);

    if (normalizedNewMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // 📏 Cap total prompt size so a logged-in user can't spam multi-MB payloads
    // that burn tokens/bandwidth/DB on the deployed app.
    const totalChars = normalizedNewMessages.reduce(
      (sum, msg) => sum + toPlainTextContent(msg).length,
      0,
    );
    if (totalChars > MAX_CONTEXT_CHARS) {
      return new Response(
        JSON.stringify({
          error: `Message is too long (max ${MAX_CONTEXT_CHARS} characters).`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Sent to the model as context — stripped of reasoning/step-start/tool
    // parts so the AI only sees clean user-visible conversation history.
    const messagesForContext = normalizedNewMessages
      .slice(-MAX_CONTEXT_MESSAGES)
      .map((m) => ({ ...m, parts: textOnlyParts(m) }));

    let modelMessages;
    try {
      modelMessages = await convertToModelMessages(messagesForContext);
    } catch (conversionError) {
      console.error("Message conversion error:", conversionError);
      modelMessages = messagesForContext.map(toSimpleTextMessage).filter((m) => m.content);
    }

    // ✅ Persist the user message BEFORE streaming so a stopped/refreshed
    // stream never loses it. Guard against duplicate retries.
    if (!skipUserMessage) {
      const latestUserMessage =
        normalizedNewMessages[normalizedNewMessages.length - 1];

      if (latestUserMessage?.role === "user") {
        const lastStored = await db.message.findFirst({
          where: { chatId, messageRole: MessageRole.USER },
          orderBy: { createdAt: "desc" },
          select: { content: true, createdAt: true },
        });

        // Compare the full serialized parts (text + files) so consecutive
        // image-only or attachment-heavy messages are never dropped.
        const incoming = partsToJSON(latestUserMessage);
        const recent =
          lastStored &&
          Date.now() - new Date(lastStored.createdAt).getTime() < 10_000;
        const sameContent = lastStored && lastStored.content === incoming;

        if (!recent || !sameContent) {
          await db.message.create({
            data: {
              chatId,
              content: partsToJSON(latestUserMessage),
              messageRole: MessageRole.USER,
              model,
              messageType: MessageType.NORMAL,
            },
          });
        }
      }
    }

    const result = streamText({
      model: provider.chat(model),
      messages: modelMessages,
      system: CHAT_SYSTEM_PROMPT,
      maxRetries: 0, // surface errors immediately; don't silently retry and freeze the UI
      providerOptions: {
        openrouter: useWebSearch
          ? {
              plugins: [{ id: "web", max_results: 5 }],
            }
          : undefined,
      },
      onError: (error) => {
        console.error("❌ Stream error:", error);
      },
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: false,
      originalMessages: normalizedNewMessages,
      headers: {
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
        ...rateLimitHeaders,
      },
      onFinish: async ({ responseMessage }) => {
        try {
          const ops = [];

          if (skipUserMessage) {
            // ✅ Regenerate path: replace the latest assistant reply instead of
            // appending another duplicate.
            const lastAssistant = await db.message.findFirst({
              where: { chatId, messageRole: MessageRole.ASSISTANT },
              orderBy: { createdAt: "desc" },
              select: { id: true },
            });
            if (lastAssistant) {
              ops.push(db.message.delete({ where: { id: lastAssistant.id } }));
            }
          }

          const assistantTextParts = textOnlyParts(responseMessage);
          if (assistantTextParts.length > 0) {
            ops.push(
              db.message.create({
                data: {
                  chatId,
                  content: JSON.stringify(assistantTextParts),
                  messageRole: MessageRole.ASSISTANT,
                  model,
                  messageType: MessageType.NORMAL,
                },
              }),
            );
          }

          // Keep the chat's model in sync and bump updatedAt so sidebar
          // ordering stays accurate.
          ops.push(db.chat.update({ where: { id: chatId }, data: { model } }));

          if (ops.length > 0) {
            await db.$transaction(ops);
          }
        } catch (error) {
          console.error("❌ Error saving messages:", error);
        }
      },
    });
  } catch (error) {
    console.error("❌ API Route Error:", error);
    const classified = classifyAiError(error);
    return new Response(
      JSON.stringify({
        error: classified.message,
        code: classified.code,
      }),
      {
        status: classified.status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}