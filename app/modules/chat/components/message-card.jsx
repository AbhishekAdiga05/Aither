import { Response } from "@/components/ai-elements/response";
import { cn } from "@/lib/utils";
import { format } from "date-fns/format";
import { Bot, PaperclipIcon } from "lucide-react";
import React from "react";
import { CopyButton } from "./message-actions";

const AttachmentList = ({ attachments = [] }) => {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((attachment, index) => (
        <a
          key={`${attachment.url}-${index}`}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs hover:bg-background"
        >
          <PaperclipIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate max-w-48">
            {attachment.filename || "Attachment"}
          </span>
        </a>
      ))}
    </div>
  );
};

const UserMessage = ({ content, attachments }) => {
  return (
    <div className="mb-5 flex justify-end pl-10">
      <div className="flex max-w-[85%] flex-col items-end gap-1">
        <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-[15px] leading-7 text-primary-foreground shadow-sm">
          {content}
        </div>
        <AttachmentList attachments={attachments} />
      </div>
    </div>
  );
};

const AssistantMessage = ({ content, createdAt, type }) => {
  const formattedDate = createdAt
    ? format(new Date(createdAt), "MMM dd, yyyy - HH:mm")
    : null;

  return (
    <div
      className={cn(
        "group mb-5 flex gap-3",
        type === "ERROR" && "text-red-600 dark:text-red-400",
      )}
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card/80 text-primary shadow-sm">
        <Bot className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 py-0.5">
          <span className="text-sm font-semibold text-foreground">NeonChat</span>
          {formattedDate && (
            <span className="text-xs text-muted-foreground/60">{formattedDate}</span>
          )}
        </div>

        <div className="mt-2 text-foreground/95">
          <Response>{content}</Response>
        </div>

        <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
          <CopyButton value={typeof content === "string" ? content : ""} />
        </div>
      </div>
    </div>
  );
};

const MessageCard = ({ content, type, role, createdAt, attachments = [] }) => {
  if (role === "ASSISTANT") {
    return (
      <AssistantMessage content={content} type={type} createdAt={createdAt} />
    );
  }

  return <UserMessage content={content} attachments={attachments} />;
};

export default MessageCard;