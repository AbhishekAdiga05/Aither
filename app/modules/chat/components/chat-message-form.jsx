"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";

import { cn } from "@/lib/utils";
import { useAIModels } from "@/app/modules/ai-agent/hook/ai-agent";
import { ModelSelector } from "./model-selector";
import { Spinner } from "@/components/ui/spinner";
import { useCreateChat } from "../hooks/chat";

export default function ChatMessageForm({ initialMessage, onMessageChange }) {
  const { data: models, isPending } = useAIModels();

  const [message, setMessage] = useState("");
  const [selectedModelOverride, setSelectedModelOverride] = useState(null);
  const { mutateAsync, isPending: isChatPending } = useCreateChat();

  const selectedModel = selectedModelOverride ?? models?.models?.[0]?.id ?? null;

  // Sync suggestion message from parent using render-time derived state.
  // Empty → empty transitions are ignored so clearing the parent's selection
  // never wipes what the user already has in the box.
  const [prevInitialMessage, setPrevInitialMessage] = useState(initialMessage);
  if (initialMessage !== prevInitialMessage) {
    setPrevInitialMessage(initialMessage);
    if (initialMessage) {
      setMessage(initialMessage);
    }
  }

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!message.trim()) return;

    const content = message.trim();
    setMessage("");
    try {
      await mutateAsync({ content, model: selectedModel });
      onMessageChange?.("");
    } catch (error) {
      console.error("Error creating chat:", error);
      setMessage(content);
    }
  };

  return (
    <div className="w-full pb-4">
      <form
        onSubmit={handleSubmit}
        className="relative group/form"
        aria-label="Start a new chat"
      >
        <div
          className={cn(
            "relative rounded-2xl border border-border bg-card shadow-sm transition-colors",
            "focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-foreground/5",
            "hover:border-border",
          )}
        >
          <TextareaAutosize
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask anything, start with your first prompt..."
            maxRows={6}
            aria-label="Your message"
            className="w-full resize-none border-0 bg-transparent px-5 pt-4 pb-2 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              {isPending ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <ModelSelector
                  models={models?.models}
                  selectedModelId={selectedModel}
                  onModelSelect={setSelectedModelOverride}
                  className="h-9 rounded-xl border-none bg-transparent px-2.5 text-xs hover:bg-accent/70"
                />
              )}
            </div>

            <Button
              type="submit"
              disabled={!message.trim() || isChatPending}
              aria-label="Send message"
              className={cn(
                "h-10 w-10 shrink-0 rounded-md p-0 transition-colors",
                message.trim() && !isChatPending
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {isChatPending ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </form>
      <p className="mt-2 text-center text-[10px] font-medium tracking-[0.18em] text-muted-foreground/40 uppercase">
        Neon Chat can make mistakes. Check important info.
      </p>
    </div>
  );
}