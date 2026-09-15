"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAIModels } from "@/app/modules/ai-agent/hook/ai-agent";
import { ModelSelector } from "./model-selector";
import { Spinner } from "@/components/ui/spinner";
import { useCreateChat } from "../hooks/chat";
import AttachmentsPreview from "./attachments-preview";
import { DEFAULT_MODEL_ID } from "@/lib/ai-models";
import {
  ACCEPTED_ATTACHMENT_EXTENSIONS,
  filesToFileUIParts,
  isImageFile,
  MAX_ATTACHMENTS,
  validateAttachments,
} from "../lib/attachments";

const fileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;

export default function ChatMessageForm({ initialMessage, onMessageChange }) {
  const { data: models, isPending } = useAIModels();

  const [message, setMessage] = useState("");
  const [selectedModelOverride, setSelectedModelOverride] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [previewUrls, setPreviewUrls] = useState({});
  const fileInputRef = useRef(null);
  const createdUrlsRef = useRef([]);
  const { mutateAsync, isPending: isChatPending } = useCreateChat();

  const defaultAvailableModel =
    models?.models?.find((m) => m.id === DEFAULT_MODEL_ID)?.id ??
    models?.models?.[0]?.id ??
    null;
  const selectedModel =
    selectedModelOverride ?? defaultAvailableModel;
  const hasInput = message.trim().length > 0;
  const hasAttachments = attachments.length > 0;
  const canSend = hasInput || hasAttachments;

  const selectedModelInfo = models?.models?.find(
    (m) => m.id === selectedModel,
  );
  const selectedModelSupportsImages =
    selectedModelInfo?.architecture?.input_modalities?.includes("image") ??
    false;
  const hasImageAttachments = attachments.some((f) => isImageFile(f));

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

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!canSend) return;

    const content = message.trim();
    const fileParts = hasAttachments
      ? await filesToFileUIParts(attachments)
      : [];
    setMessage("");
    try {
      const result = await mutateAsync({
        content,
        model: selectedModel,
        files: fileParts,
      });
      if (result && !result.success) {
        setMessage(content);
      } else {
        clearAttachments();
        onMessageChange?.("");
      }
    } catch (error) {
      console.error("Error creating chat:", error);
      toast.error("Failed to create chat. Please try again.");
      setMessage(content);
    }
  };

  return (
    <div className="w-full pb-[calc(env(safe-area-inset-bottom)+1rem)]">
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
            hasAttachments && "rounded-b-none",
          )}
        >
          <TextareaAutosize
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask anything, start with your first prompt..."
            maxRows={6}
            aria-label="Your message"
            className="w-full resize-none border-0 bg-transparent px-5 pt-4 pb-2 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          {hasAttachments && (
            <AttachmentsPreview
              files={attachments}
              previewUrls={previewUrls}
              onRemove={removeFile}
            />
          )}

          {hasImageAttachments && !selectedModelSupportsImages && (
            <p className="px-5 pb-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              The selected model may not support image input. Switch to a
              vision model for best results.
            </p>
          )}

          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                title="Attach a file"
                aria-label="Attach a file"
                disabled={isChatPending}
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
                  onModelSelect={setSelectedModelOverride}
                  className="h-9 rounded-xl border-none bg-transparent px-2.5 text-xs hover:bg-accent/70"
                />
              )}
            </div>

            <Button
              type="submit"
              disabled={!canSend || isChatPending}
              aria-label="Send message"
              className={cn(
                "h-10 w-10 shrink-0 rounded-md p-0 transition-colors",
                canSend && !isChatPending
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
        AI can make mistakes. Check important info.
      </p>
    </div>
  );
}