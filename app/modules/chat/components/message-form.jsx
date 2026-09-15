"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Globe, Square, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAIModels } from "@/app/modules/ai-agent/hook/ai-agent";
import { ModelSelector } from "./model-selector";
import { Spinner } from "@/components/ui/spinner";
import AttachmentsPreview from "./attachments-preview";
import { DEFAULT_MODEL_ID } from "@/lib/ai-models";
import {
  ACCEPTED_ATTACHMENT_EXTENSIONS,
  isImageFile,
  MAX_ATTACHMENTS,
  validateAttachments,
} from "../lib/attachments";

const fileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;

export default function MessageForm({
  model,
  chatId,
  input = "",
  handleInputChange = () => {},
  handleSubmit = () => {},
  isLoading,
  isStreaming = false,
  onStop,
  onModelSelect, // optional: notifies parent when the user picks a model
}) {
  const { data: models, isPending } = useAIModels();

  const [useWebSearch, setUseWebSearch] = useState(false);
  const [selectedModelOverride, setSelectedModelOverride] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [previewUrls, setPreviewUrls] = useState({});
  const fileInputRef = useRef(null);
  const createdUrlsRef = useRef([]);

  const defaultAvailableModel =
    models?.models?.find((m) => m.id === DEFAULT_MODEL_ID)?.id ??
    models?.models?.[0]?.id ??
    null;
  const selectedModel =
    selectedModelOverride ?? model ?? defaultAvailableModel;
  const hasInput = input.trim().length > 0;
  const hasAttachments = attachments.length > 0;
  const canSend = hasInput || hasAttachments;

  // Model capability hints (vision models only accept images).
  const selectedModelInfo = models?.models?.find(
    (m) => m.id === selectedModel,
  );
  const selectedModelSupportsImages =
    selectedModelInfo?.architecture?.input_modalities?.includes("image") ??
    false;
  const hasImageAttachments = attachments.some((f) => isImageFile(f));

  // Clean up object URLs on unmount.
  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFilesSelected = (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const incoming = Array.from(fileList);
    const combined = [...attachments, ...incoming];
    const errors = validateAttachments(combined);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    const nextPreviews = { ...previewUrls };
    incoming.forEach((file) => {
      if (isImageFile(file)) {
        const url = URL.createObjectURL(file);
        createdUrlsRef.current.push(url);
        nextPreviews[fileKey(file)] = url;
      }
    });

    setAttachments(combined.slice(0, MAX_ATTACHMENTS));
    setPreviewUrls(nextPreviews);
  };

  const removeFile = (file) => {
    const key = fileKey(file);
    if (previewUrls[key]) {
      URL.revokeObjectURL(previewUrls[key]);
      createdUrlsRef.current = createdUrlsRef.current.filter(
        (url) => url !== previewUrls[key],
      );
    }
    const nextPreviews = { ...previewUrls };
    delete nextPreviews[key];
    setPreviewUrls(nextPreviews);
    setAttachments((prev) => prev.filter((f) => fileKey(f) !== key));
  };

  const clearAttachments = () => {
    createdUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    createdUrlsRef.current = [];
    setAttachments([]);
    setPreviewUrls({});
  };

  const onFormSubmit = (e) => {
    if (!canSend) {
      e?.preventDefault();
      return;
    }

    handleSubmit(e, {
      files: attachments,
      body: {
        chatId,
        model: selectedModel,
        useWebSearch,
      },
    });
    clearAttachments();
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
            hasAttachments && "rounded-b-none",
          )}
        >
          {/* Textarea */}
          <TextareaAutosize
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message here..."
            maxRows={8}
            aria-label="Your message"
            className="w-full resize-none border-0 bg-transparent px-5 pt-4 pb-2 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onFormSubmit(e);
              }
            }}
          />

          {/* Selected file previews */}
          {hasAttachments && (
            <AttachmentsPreview
              files={attachments}
              previewUrls={previewUrls}
              onRemove={removeFile}
            />
          )}

          {/* Vision capability hint */}
          {hasImageAttachments && !selectedModelSupportsImages && (
            <p className="px-5 pb-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              The selected model may not support image input. Switch to a
              vision model for best results.
            </p>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            {/* Left side tools */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                title="Attach a file"
                aria-label="Attach a file"
                disabled={isLoading || isStreaming}
                className={cn(
                  "h-9 gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  hasAttachments &&
                    "bg-foreground text-background hover:bg-foreground/90 hover:text-background",
                )}
              >
                <Paperclip
                  className={cn("h-4 w-4", hasAttachments && "animate-pulse")}
                />
                <span className="hidden sm:inline">Attach</span>
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_ATTACHMENT_EXTENSIONS}
                className="hidden"
                onChange={(e) => {
                  handleFilesSelected(e.target.files);
                  e.target.value = "";
                }}
              />

              {isPending ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <ModelSelector
                  models={models?.models}
                  selectedModelId={selectedModel}
                  onModelSelect={(id) => {
                    setSelectedModelOverride(id);
                    onModelSelect?.(id); // bubble up to parent for body override
                  }}
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
                  disabled={!canSend}
                  aria-label="Send message"
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-md p-0 transition-colors",
                    canSend
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