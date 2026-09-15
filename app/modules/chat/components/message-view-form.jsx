"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGetChatById } from "../hooks/chat";
import { Spinner } from "@/components/ui/spinner";
import MessageCard from "./message-card";
import MessageForm from "./message-form";
import { useChat } from "@ai-sdk/react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { filesToFileUIParts } from "../lib/attachments";

const getMessageParts = (content) => {
  try {
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
      return parsed;
    }
  } catch {
    // Fall back to plain text messages.
  }

  return [{ type: "text", text: content }];
};

/**
 * Extract a user-friendly error message from an AI SDK / fetch error.
 * The error can be an Error, a Response, or a nested SDK error object.
 */
async function extractErrorMessage(err) {
  if (!err) return "Something went wrong. Please try again.";

  // The AI SDK may pass the raw Response — read its JSON body for the
  // server's classified error message.
  if (err instanceof Response || typeof err?.json === "function") {
    try {
      const body = await err.clone().json();
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    } catch {
      // Can't parse body, fall through.
    }
    return "The AI model failed to respond. Try a different model.";
  }

  // Try multiple paths where the message might live
  let raw =
    err.message ??
    err.error?.message ??
    err.cause?.message ??
    err.body?.error ??
    "";

  // If raw is JSON, unwrap the nested error
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.error) raw = parsed.error;
      else if (parsed.message) raw = parsed.message;
    } catch {
      // Not JSON — use as-is.
    }
  }

  if (!raw) return "Something went wrong. Please try again.";

  // Map technical messages to actionable user-friendly text
  if (/fetch failed|network|ECONNREFUSED|ENOTFOUND/i.test(raw)) {
    return "Could not reach the AI provider. Check your connection and try again.";
  }
  if (/timeout|abort/i.test(raw)) {
    return "The model took too long to respond. Try switching to a faster model.";
  }
  if (/401|unauthorized/i.test(raw)) {
    return "Authentication error. Please refresh the page.";
  }
  if (/429|rate.?limit|provider returned error/i.test(raw)) {
    return "This model is overloaded. Switch to a different model and try again.";
  }
  if (/403|forbidden|agentic|harness/i.test(raw)) {
    return "This model is not available for chat. Please switch to a different model.";
  }
  if (/404|not.?found|no endpoints/i.test(raw)) {
    return "This model is currently unavailable. Please switch to a different model.";
  }
  if (/402|insufficient|credits/i.test(raw)) {
    return "This model requires credits. Please switch to a free model.";
  }

  return raw.length > 120 ? "The AI model returned an error. Try a different model." : raw;
}

const getMessageTextContent = (message) =>
  message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n") ?? message.content;

const getMessageAttachments = (message) =>
  message.parts?.filter((part) => part.type === "file") ?? [];

const MessageViewWithForm = ({ chatId }) => {
  const { data, isPending, isError, error } = useGetChatById(chatId);
  const searchParams = useSearchParams();
  const autoTrigger = searchParams.get("autoTrigger") === "true";
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const queryClient = useQueryClient();
  const storedMessages = data?.data?.messages;
  const chatModel = data?.data?.model;

  const initialMessages = React.useMemo(
    () => {
      if (!storedMessages) {
        return [];
      }

      return storedMessages.map((msg) => {
        const parts = getMessageParts(msg.content);

        return {
          id: msg.id,
          role: msg.messageRole.toLowerCase(),
          content: msg.content,
          parts,
          createdAt: msg.createdAt,
        };
      });
    },
    [storedMessages],
  );

  const {
    messages,
    sendMessage,
    regenerate,
    stop,
    status,
    setMessages,
    clearError,
    error: chatError,
  } = useChat({
    api: "/api/chat",
    initialMessages,
    experimental_throttle: 8, // reduced from 30 — smoother streaming rendering
    body: {
      chatId,
      model: chatModel,
    },
    onError: async (e) => {
      console.error("Chat stream error:", e);
      const msg = await extractErrorMessage(e);
      toast.error(msg, { duration: 6000 });
    },
    onFinish: (message) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["chats", chatId] });
    },
  });

  // Deduplicated: onError above already shows the toast, so we only handle
  // persistent chatError state (set when the stream closes with an error but
  // onError wasn't called, e.g. network interruption after stream started).
  React.useEffect(() => {
    if (chatError && status === "error") {
      extractErrorMessage(chatError).then((msg) => toast.error(msg, { duration: 6000 }));
    }
  }, [chatError, status]);

  const [input, setInput] = useState("");
  // Track model selected inside MessageForm so it flows through sendMessage body
  const [selectedModel, setSelectedModel] = useState(null);
  const handleInputChange = (e) => setInput(e.target.value);
  const handleSubmit = async (e, options) => {
    e?.preventDefault?.();
    const files = options?.files || [];
    if (!input.trim() && files.length === 0) return;

    // Convert File objects to FileUIPart[] (base64 data URLs) so the
    // streaming API can attach images/files to the user message.
    const parts = files.length ? await filesToFileUIParts(files) : [];

    const payload = {
      ...(input.trim() ? { text: input } : {}),
      ...(parts.length ? { files: parts } : {}),
    };

    // Merge the actively-selected model into the body so it overrides the
    // useChat default body (which may have an undefined chatModel during
    // initial hydration — fixing the silent model-mismatch bug).
    const bodyOverride = {
      ...options?.body,
      model: selectedModel ?? options?.body?.model ?? chatModel,
    };

    try {
      await sendMessage(payload, { ...options, body: bodyOverride });
      setInput("");
    } catch (err) {
      // The stream error is already surfaced via useChat's onError + the
      // inline retry banner — just keep the typed text so nothing is lost.
      console.error("Failed to send message:", err);
    }
  };

  const isLoading = status === "submitted" || status === "streaming";

  // ✅ One-tap recovery when a model fails: re-send the last user message
  // on the streaming route (the server auto-falls-back to another free model).
  const handleRetry = () => {
    clearError();
    regenerate({
      body: { skipUserMessage: true, chatId, model: chatModel },
    });
  };

  // Hydrate messages once the chat loads (only when we have no messages yet).
  useEffect(() => {
    if (initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages, messages.length, setMessages]);

  // Auto-trigger a fresh AI reply when a chat is created from the home screen.
  // Waits for the conversation to be hydrated so `regenerate` has messages to work with.
  const hasAutoTriggeredRef = useRef(false);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (
      autoTrigger &&
      !hasAutoTriggeredRef.current &&
      // Only fire when the stream is idle — prevents double-fire during React
      // re-renders that happen after the initial regenerate() call.
      status === "ready" &&
      initialMessages.length === 1 &&
      initialMessages[0].role === "user" &&
      messages.length >= 1 &&
      last?.role === "user"
    ) {
      hasAutoTriggeredRef.current = true;
      try {
        regenerate({
          body: { skipUserMessage: true, chatId, model: chatModel },
        });
      } catch (err) {
        // If the stream transport throws synchronously, fall back to the
        // inline retry banner so the user is never left stuck.
        console.error("Auto-trigger regenerate failed:", err);
      }
    }
  }, [
    autoTrigger,
    messages,
    initialMessages,
    regenerate,
    chatId,
    chatModel,
    status,
  ]);

  const lastMessage = messages[messages.length - 1];
  const isWaitingForAi = isLoading && lastMessage?.role === "user";
  const isStreamingAssistant = status === "streaming";

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, isWaitingForAi]);

  if (isPending && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="text-primary" />
      </div>
    );
  }

  if (isError && messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm font-medium text-red-500">
            Failed to load this chat.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {error?.message || "Please try refreshing the page."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {messages.length === 0 && !isLoading ? (
            <div className="flex h-full min-h-[40vh] flex-col items-center justify-center text-center">
              <p className="text-base font-medium text-muted-foreground">
                Start the conversation below.
              </p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                Your messages are saved automatically.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageCard
                key={message.id}
                content={getMessageTextContent(message)}
                attachments={getMessageAttachments(message)}
                role={message.role === "assistant" ? "ASSISTANT" : "USER"}
                type="NORMAL"
                createdAt={message.createdAt}
              />
            ))
          )}

          {/* AI Generating Indicator */}
          {isWaitingForAi && (
            <div className="flex items-center gap-3 px-2 py-4">
              <div className="flex items-center gap-2 rounded-full border border-border/50 bg-card/60 px-4 py-2 backdrop-blur">
                <Spinner className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Generating response...
                </span>
              </div>
            </div>
          )}

          {/* AI Error Banner with one-tap retry */}
          {status === "error" &&
            messages[messages.length - 1]?.role === "user" && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-destructive">
                    The AI didn&apos;t respond.
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    The model may be overloaded or briefly unavailable. Retry
                    now and the app will fall back to another working model.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Try again
                </Button>
              </div>
            )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Message Form */}
      <div className="relative z-10 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto w-full max-w-3xl">
          <MessageForm
            model={chatModel}
            chatId={chatId}
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            isStreaming={isStreamingAssistant}
            onStop={stop}
            onModelSelect={setSelectedModel}
          />
        </div>
      </div>
    </div>
  );
};

export default MessageViewWithForm;