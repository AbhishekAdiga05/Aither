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
import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    error: chatError,
  } = useChat({
    api: "/api/chat",
    initialMessages,
    experimental_throttle: 30,
    body: {
      chatId,
      model: chatModel,
    },
    onError: (e) => {
      console.error("Chat stream error:", e);
      toast.error(e.message || "Failed to generate AI response.");
    },
    onFinish: (message) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["chats", chatId] });
    },
  });

  React.useEffect(() => {
    if (chatError) {
      // Surface fetch/stream errors even when they arrive via the hook.
      toast.error(chatError.message || "Failed to generate AI response.");
    }
  }, [chatError]);

  const [input, setInput] = useState("");
  const handleInputChange = (e) => setInput(e.target.value);
  const handleSubmit = (e, options) => {
    e?.preventDefault?.();
    if (!input.trim()) return;
    sendMessage({ text: input }, options);
    setInput("");
  };

  const isLoading = status === "submitted" || status === "streaming";

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
      initialMessages.length === 1 &&
      initialMessages[0].role === "user" &&
      messages.length >= 1 &&
      last?.role === "user"
    ) {
      hasAutoTriggeredRef.current = true;
      regenerate({
        body: { skipUserMessage: true, chatId, model: chatModel },
      });
    }
  }, [
    autoTrigger,
    messages,
    initialMessages,
    regenerate,
    chatId,
    chatModel,
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

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Message Form */}
      <div className="relative z-10">
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
          />
        </div>
      </div>
    </div>
  );
};

export default MessageViewWithForm;