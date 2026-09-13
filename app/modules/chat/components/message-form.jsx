"use client";

import { useMemo, useState } from "react";
import { Send, Globe, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";

import { cn } from "@/lib/utils";
import { useAIModels } from "@/app/modules/ai-agent/hook/ai-agent";
import { ModelSelector } from "./model-selector";
import { Spinner } from "@/components/ui/spinner";

export default function MessageForm({
  model,
  chatId,
  input = "",
  handleInputChange = () => {},
  handleSubmit = () => {},
  isLoading,
  isStreaming = false,
  onStop,
}) {
  const { data: models, isPending } = useAIModels();

  const [useWebSearch, setUseWebSearch] = useState(false);
  const [selectedModelOverride, setSelectedModelOverride] = useState(null);
  const selectedModel =
    selectedModelOverride ?? model ?? models?.models?.[0]?.id ?? null;
  const hasInput = input.trim().length > 0;

  const onFormSubmit = (e) => {
    if (!hasInput) {
      e?.preventDefault();
      return;
    }

    handleSubmit(e, {
      body: {
        chatId,
        model: selectedModel,
        useWebSearch,
      },
    });
  };

  const modelLabel = useMemo(() => {
    const m = models?.models;
    if (!m || m.length === 0) return null;
    return m.find((x) => x.id === selectedModel)?.name;
  }, [models, selectedModel]);

  return (
    <div className="w-full pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <form
        onSubmit={onFormSubmit}
        className="relative group/form"
        aria-label="Send a message"
      >
        {/* Main Input Container - Floating Glassmorphism */}
        <div
          className={cn(
            "relative rounded-2xl border border-border bg-card shadow-sm transition-colors",
            "focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-foreground/5",
            "hover:border-border",
          )}
        >
          {/* Textarea */}
          <TextareaAutosize
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message here..."
            maxRows={8}
            aria-label="Your message"
            className="w-full resize-none border-0 bg-transparent px-5 pt-4 pb-2 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onFormSubmit(e);
              }
            }}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            {/* Left side tools */}
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

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setUseWebSearch(!useWebSearch)}
                title="Toggle web search"
                aria-pressed={useWebSearch}
                className={cn(
                  "h-9 gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                  useWebSearch
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Globe className={cn("h-4 w-4", useWebSearch && "animate-pulse")} />
                <span className="hidden sm:inline">Search</span>
              </Button>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {modelLabel && (
                <span className="hidden truncate text-[11px] font-medium text-muted-foreground/70 sm:inline max-w-36">
                  {modelLabel}
                </span>
              )}

              {isStreaming || isLoading ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onStop}
                  title="Stop generating"
                  aria-label="Stop generating"
                  className="h-10 w-10 shrink-0 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-90"
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!hasInput}
                  aria-label="Send message"
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-md p-0 transition-colors",
                    hasInput
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
      <p className="mt-2 text-center text-[10px] font-medium tracking-[0.18em] text-muted-foreground/40 uppercase">
        AI can make mistakes. Check important info.
      </p>
    </div>
  );
}