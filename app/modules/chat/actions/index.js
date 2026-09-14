"use server";

import db from "@/lib/db";
import { currentUser } from "@/app/modules/authentication/actions";
import { MessageRole, MessageType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompt";
import { DEFAULT_MODEL_ID } from "@/lib/ai-models";
import { getAllowedFreeModelIds } from "@/lib/free-models.mjs";
import { classifyAiError } from "@/lib/ai-errors";

const provider = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const resolveModelId = (model) => model || DEFAULT_MODEL_ID;

/**
 * Parse a stored message's content. Messages are stored as either a JSON
 * string of parts (streaming route / home form) or plain text.
 * Returns a parts array.
 */
const parseStoredParts = (content) => {
  if (typeof content !== "string") {
    return [{ type: "text", text: content ?? "" }];
  }
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.type) {
      return parsed;
    }
  } catch {
    // Not JSON — plain text.
  }
  return [{ type: "text", text: content }];
};

/**
 * Convert parts to model message content (text parts → text, file parts →
 * file/image data) so attachments reach the model correctly.
 */
const partsToModelContent = (parts) =>
  parts
    .filter((p) => p.type === "text" || p.type === "file")
    .map((p) => {
      if (p.type === "text") return { type: "text", text: p.text };
      if (p.type === "file") {
        return { type: "file", data: p.url, mediaType: p.mediaType, filename: p.filename };
      }
      return null;
    })
    .filter(Boolean);

const storedMessagesToModelMessages = (messages) =>
  messages.map((msg) => ({
    role: msg.messageRole === MessageRole.USER ? "user" : "assistant",
    content: partsToModelContent(parseStoredParts(msg.content)),
  }));

/**
 * Validate that a model ID is in the allowed free-model list.
 * Returns null on success, or a structured error object on failure.
 */
async function validateModel(modelId) {
  try {
    const allowed = await getAllowedFreeModelIds();
    if (!allowed.includes(modelId)) {
      return {
        success: false,
        message:
          "The selected model is unavailable in this app. Please pick a different model.",
        code: "MODEL_NOT_ALLOWED",
      };
    }
  } catch {
    // If we can't fetch the catalog, allow the request — the provider
    // itself will reject truly invalid models.
  }
  return null;
}

export const createMessageInChat = async (values, chatId) => {
  const user = await currentUser();

  if (!user) {
    return {
      success: false,
      message: "Unauthorized user",
    };
  }

  const { content, model: inputModel } = values;

  if (!content || content.trim() === "") {
    return {
      success: false,
      message: "Message content is required",
    };
  }

  // Resolve model: use the provided model or fall back to the chat's stored model
  let model = inputModel;
  if (!model) {
    const chat = await db.chat.findUnique({
      where: { id: chatId },
      select: { model: true },
    });
    model = chat?.model;
  }

  model = resolveModelId(model);

  const modelError = await validateModel(model);
  if (modelError) return modelError;

  const userMessage = await db.message.create({
    data: {
      model,
      content: JSON.stringify([{ type: "text", text: content }]),
      messageRole: MessageRole.USER,
      messageType: MessageType.NORMAL,
      chatId,
    },
  });

  // Fetch all messages (including the one just created) for AI context
  const previousMessages = await db.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });

  const aiMessages = storedMessagesToModelMessages(previousMessages);

  let assistantContent = null;

  try {
    const result = await generateText({
      model: provider.chat(model),
      system: CHAT_SYSTEM_PROMPT,
      messages: aiMessages,
    });
    assistantContent = result.text;
  } catch (error) {
    console.error("AI generation error:", error);
    const classified = classifyAiError(error);
    return {
      success: false,
      message: classified.message,
      code: classified.code,
      status: classified.status,
    };
  }

  const Assistantmessage = await db.message.create({
    data: {
      model,
      chatId,
      content: assistantContent,
      messageRole: MessageRole.ASSISTANT,
      messageType: MessageType.NORMAL,
    },
  });

  revalidatePath(`/chat/${chatId}`);
  return {
    success: true,
    message: "Chat created successfully",
    data: {
      userMessage,
      Assistantmessage,
    },
  };
};

export const createChatWithMessage = async (values) => {
  try {
    const user = await currentUser();
    if (!user) return { success: false, message: "Unauthorized user" };

    const { content, model: inputModel, files } = values;
    if (!content || !content.trim()) {
      return { success: false, message: "Message content is required" };
    }

    const model = resolveModelId(inputModel);

    const modelError = await validateModel(model);
    if (modelError) return modelError;

    const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");

    // Store the user message as both text and file parts, matching the
    // format the streaming API route writes to the DB so hydration works.
    const parts = [
      { type: "text", text: content },
      ...(Array.isArray(files)
        ? files.map((f) => ({
            type: "file",
            mediaType: f.mediaType,
            url: f.url,
            filename: f.filename,
          }))
        : []),
    ];

    // Create chat WITH initial user message
    const chat = await db.chat.create({
      data: {
        title,
        model,
        userId: user.id,
        messages: {
          create: {
            content: JSON.stringify(parts),
            messageRole: MessageRole.USER,
            messageType: MessageType.NORMAL,
            model,
          },
        },
      },
      include: { messages: true }, // Include messages in response
    });

    revalidatePath("/");
    return { success: true, message: "Chat created successfully", data: chat };
  } catch (error) {
    console.error("Error creating chat:", error);
    return { success: false, message: "Failed to create chat" };
  }
};

export const getAllChats = async () => {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        message: "Unauthorized user",
      };
    }

    const chats = await db.chat.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        title: true,
        model: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          take: 5,
          select: { content: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // revalidatePath("/");
    return {
      success: true,
      message: "Chats fetched successfully",
      data: chats,
    };
  } catch (error) {
    console.error("Error fetching chats:", error);
    return {
      success: false,
      message: "Failed to fetch chats",
    };
  }
};

export const getChatById = async (chatId) => {
  const user = await currentUser();

  if (!user) {
    return {
      success: false,
      message: "Unauthorized user",
    };
  }

  try {
    const chat = await db.chat.findUnique({
      where: {
        id: chatId,
        userId: user.id,
      },
      include: {
        messages: {
          take: 50,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (chat && chat.messages) {
      chat.messages.reverse();
    }

    return {
      success: true,
      message: "Chat fetched successfully",
      data: chat,
    };
  } catch (error) {
    console.error("Error fetching chat:", error);
    return {
      success: false,
      message: "Failed to fetch chat",
    };
  }
};

/**
 * Generate only the AI response for an existing chat.
 * Used by auto-trigger — the user message already exists in DB, so we must
 * NOT create another one (that would cause duplicates).
 */
export const generateAiResponse = async (chatId) => {
  const user = await currentUser();
  if (!user) return { success: false, message: "Unauthorized user" };

  const chat = await db.chat.findUnique({
    where: { id: chatId, userId: user.id },
    select: { model: true },
  });

  if (!chat?.model) {
    return { success: false, message: "Chat not found or has no model" };
  }

  const model = resolveModelId(chat.model);

  const modelError = await validateModel(model);
  if (modelError) return modelError;

  const previousMessages = await db.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });

  const aiMessages = storedMessagesToModelMessages(previousMessages);

  let assistantContent = null;
  try {
    const result = await generateText({
      model: provider.chat(model),
      system: CHAT_SYSTEM_PROMPT,
      messages: aiMessages,
    });
    assistantContent = result.text;
  } catch (error) {
    console.error("AI generation error (auto-trigger):", error);
    const classified = classifyAiError(error);
    return {
      success: false,
      message: classified.message,
      code: classified.code,
      status: classified.status,
    };
  }

  const assistantMessage = await db.message.create({
    data: {
      model,
      chatId,
      content: assistantContent,
      messageRole: MessageRole.ASSISTANT,
      messageType: MessageType.NORMAL,
    },
  });

  revalidatePath(`/chat/${chatId}`);
  return {
    success: true,
    message: "AI response generated",
    data: { assistantMessage },
  };
};

export const deleteChat = async (chatId) => {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        message: "Unauthorized user",
      };
    }

    const chat = await db.chat.findUnique({
      where: {
        id: chatId,
        userId: user.id,
      },
    });

    if (!chat) {
      return {
        success: false,
        message: "Chat not found",
      };
    }

    await db.chat.delete({
      where: {
        id: chatId,
      },
    });
    revalidatePath(`/chat/${chatId}`);
    return {
      success: true,
      message: "Chat deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting chat:", error);
    return {
      success: false,
      message: "Failed to delete chat",
    };
  }
};
