"use client";

import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatFileSize, isImageFile } from "../lib/attachments";

// Shared preview row for files a user is about to send.
// `previewUrls` maps a file key to an object URL for image thumbnails.
export default function AttachmentsPreview({
  files = [],
  previewUrls = {},
  onRemove,
  className,
}) {
  if (files.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border/60 bg-background/50 px-3 py-2",
        className,
      )}
    >
      {files.map((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        const isImage = isImageFile(file);
        const url = previewUrls[key];

        return (
          <div
            key={key}
            className="group/att relative flex max-w-[220px] items-center gap-2 rounded-xl border border-border bg-card p-1.5 pr-2 shadow-sm"
          >
            {isImage && url ? (
              // next/image can't optimize blob: object URLs, so use a plain
              // <img> for the client-side thumbnail previews.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={file.name}
                className="h-10 w-10 shrink-0 cursor-pointer rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <FileText className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="max-w-[120px] truncate text-xs font-medium">
                {file.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove?.(file)}
              aria-label={`Remove ${file.name}`}
              className="ml-1 h-6 w-6 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}