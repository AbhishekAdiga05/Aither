"use client";

import React, { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const FENCE_REGEX = /^```([\w-]+)?\s*$/;
const ORDERED_LIST_REGEX = /^\s*(\d+)\.\s+(.*)$/;
const UNORDERED_LIST_REGEX = /^\s*[-*+]\s+(.*)$/;
const HEADING_REGEX = /^\s{0,3}(#{1,6})\s+(.*)$/;
const BLOCKQUOTE_REGEX = /^\s*>\s?(.*)$/;
const TABLE_DIVIDER_REGEX = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/;
const LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/;
const BOLD_REGEX = /(\*\*|__)(.+?)\1/;
const ITALIC_REGEX = /(\*|_)([^*_]+?)\1/;

const copyToClipboard = async (value) => {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
};

function CopyButton({ value, label = "Copy", className }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const didCopy = await copyToClipboard(value);

    if (!didCopy) {
      return;
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={handleCopy}
      className={cn("h-7 rounded-full px-2.5 text-xs", className)}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? "Copied" : label}</span>
    </Button>
  );
}

function renderFormattedText(text, keyPrefix) {
  if (!text) {
    return "";
  }

  const patterns = [
    {
      regex: /(`[^`]+`)/,
      render: (match, index) => (
        <code
          key={`${keyPrefix}-inline-${index}`}
          className="rounded-md border border-border/80 bg-muted/70 px-1.5 py-0.5 font-mono text-[0.92em] text-foreground"
        >
          {match.slice(1, -1)}
        </code>
      ),
    },
    {
      regex: LINK_REGEX,
      render: (match, index, groups) => (
        <a
          key={`${keyPrefix}-link-${index}`}
          href={groups[2]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary underline decoration-primary/35 underline-offset-4 transition hover:decoration-primary"
        >
          {renderFormattedText(groups[1], `${keyPrefix}-link-text-${index}`)}
        </a>
      ),
    },
    {
      regex: BOLD_REGEX,
      render: (match, index, groups) => (
        <strong key={`${keyPrefix}-bold-${index}`} className="font-semibold text-foreground">
          {renderFormattedText(groups[2], `${keyPrefix}-bold-text-${index}`)}
        </strong>
      ),
    },
    {
      regex: ITALIC_REGEX,
      render: (match, index, groups) => (
        <em key={`${keyPrefix}-italic-${index}`} className="italic text-foreground/95">
          {renderFormattedText(groups[2], `${keyPrefix}-italic-text-${index}`)}
        </em>
      ),
    },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (!match || match.index === undefined) {
      continue;
    }

    const before = text.slice(0, match.index);
    const after = text.slice(match.index + match[0].length);

    return [
      before ? renderFormattedText(before, `${keyPrefix}-before-${match.index}`) : null,
      pattern.render(match[0], match.index, match),
      after ? renderFormattedText(after, `${keyPrefix}-after-${match.index}`) : null,
    ];
  }

  return text;
}

function renderInlineContent(text, keyPrefix = "inline") {
  return renderFormattedText(text, keyPrefix);
}

function splitTableRow(row) {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function highlightCode(language, code) {
  const normalizedLanguage = (language || "").toLowerCase();
  const tokenRegex =
    normalizedLanguage === "json"
      ? /("(?:\\.|[^"])*")|(\btrue\b|\bfalse\b|\bnull\b)|(-?\b\d+(?:\.\d+)?\b)|([{}\[\]:,])/g
      : /("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`)|(\/\/.*$|#.*$)|(\/\*[\s\S]*?\*\/)|(\b(?:const|let|var|function|return|if|else|for|while|switch|case|break|continue|import|from|export|default|async|await|try|catch|finally|class|new|extends|throw|interface|type|public|private|protected)\b)|(\b(?:true|false|null|undefined|this)\b)|(-?\b\d+(?:\.\d+)?\b)/gm;

  const tokens = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "plain",
        value: code.slice(lastIndex, match.index),
      });
    }

    let type = "plain";
    if (match[1]) {
      type = "string";
    } else if (match[2]) {
      type = normalizedLanguage === "json" ? "boolean" : "comment";
    } else if (match[3]) {
      type = normalizedLanguage === "json" ? "number" : "comment";
    } else if (match[4]) {
      type = normalizedLanguage === "json" ? "punctuation" : "keyword";
    } else if (match[5]) {
      type = "boolean";
    } else if (match[6]) {
      type = "number";
    }

    tokens.push({
      type,
      value: match[0],
    });

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < code.length) {
    tokens.push({
      type: "plain",
      value: code.slice(lastIndex),
    });
  }

  return tokens;
}

function parseList(lines, startIndex) {
  const stack = [];
  const rootItems = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      break;
    }

    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    const unorderedMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    const match = orderedMatch || unorderedMatch;

    if (!match) {
      break;
    }

    const indent = match[1].length;
    const ordered = Boolean(orderedMatch);
    const content = ordered ? orderedMatch[3] : unorderedMatch[2];
    const item = { content, ordered, indent, children: [] };

    while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      rootItems.push(item);
    } else {
      stack[stack.length - 1].children.push(item);
    }

    stack.push(item);
    index += 1;
  }

  const normalizeItems = (items) =>
    items.map((item) => ({
      content: item.content,
      ordered: item.ordered,
      children: normalizeItems(item.children),
    }));

  return {
    block: {
      type: "list",
      ordered: rootItems[0]?.ordered ?? false,
      items: normalizeItems(rootItems),
    },
    nextIndex: index,
  };
}

function renderListItems(items, ordered, keyPrefix) {
  const ListTag = ordered ? "ol" : "ul";

  return (
    <ListTag
      className={cn(
        "space-y-2 pl-6 text-[15px] leading-7 text-foreground/95",
        ordered
          ? "list-decimal marker:font-semibold marker:text-primary/80"
          : "list-disc marker:text-primary/80",
      )}
    >
      {items.map((item, index) => (
        <li key={`${keyPrefix}-${index}`} className="pl-1">
          <div>{renderInlineContent(item.content, `${keyPrefix}-content-${index}`)}</div>
          {item.children.length > 0 ? (
            <div className="mt-2">
              {renderListItems(
                item.children,
                item.children[0]?.ordered ?? false,
                `${keyPrefix}-child-${index}`,
              )}
            </div>
          ) : null}
        </li>
      ))}
    </ListTag>
  );
}

function CodeBlock({ language, code }) {
  const highlightedTokens = useMemo(
    () => highlightCode(language, code),
    [language, code],
  );

  const tokenClasses = {
    plain: "text-zinc-100",
    string: "text-emerald-300",
    comment: "text-zinc-500 italic",
    keyword: "text-sky-300",
    boolean: "text-fuchsia-300",
    number: "text-amber-300",
    punctuation: "text-zinc-400",
  };

  return (
    <div className="group/code overflow-hidden rounded-2xl border border-border/70 bg-zinc-950 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 bg-linear-to-r from-white/8 to-white/3 px-3 py-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300/80">
          {language || "code"}
        </span>
        <CopyButton
          value={code}
          label="Copy code"
          className="text-zinc-100 opacity-100 sm:opacity-0 sm:transition sm:group-hover/code:opacity-100 hover:bg-white/10 hover:text-white focus-visible:opacity-100"
        />
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-sm leading-7 text-zinc-100">
        <code className="font-mono">
          {highlightedTokens.map((token, index) => (
            <span
              key={`${token.type}-${index}`}
              className={tokenClasses[token.type] || tokenClasses.plain}
            >
              {token.value}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function renderTextBlock(block, index) {
  if (block.type === "heading") {
    const sizes = {
      1: "text-2xl font-semibold tracking-tight",
      2: "text-xl font-semibold tracking-tight",
      3: "text-lg font-semibold",
      4: "text-base font-semibold",
      5: "text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground",
      6: "text-sm font-medium text-muted-foreground",
    };

    const Tag = `h${block.level}`;

    return (
      <Tag key={`heading-${index}`} className={cn("text-foreground", sizes[block.level])}>
        {renderInlineContent(block.text, `heading-${index}`)}
      </Tag>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote
        key={`quote-${index}`}
        className="rounded-r-xl border-l-4 border-primary/45 bg-primary/5 px-4 py-3 text-[15px] italic text-foreground/90"
      >
        {block.lines.map((line, lineIndex) => (
          <p key={`quote-line-${lineIndex}`} className={lineIndex === 0 ? "m-0" : "mt-2"}>
            {renderInlineContent(line, `quote-${index}-${lineIndex}`)}
          </p>
        ))}
      </blockquote>
    );
  }

  if (block.type === "list") {
    return (
      <div key={`list-${index}`}>
        {renderListItems(block.items, block.ordered, `list-${index}`)}
      </div>
    );
  }

  if (block.type === "table") {
    return (
      <div
        key={`table-${index}`}
        className="overflow-x-auto rounded-2xl border border-border/70 bg-background/70"
      >
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              {block.headers.map((header, headerIndex) => (
                <TableHead
                  key={`table-header-${headerIndex}`}
                  className="h-11 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {renderInlineContent(header, `table-head-${index}-${headerIndex}`)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.rows.map((row, rowIndex) => (
              <TableRow key={`table-row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <TableCell
                    key={`table-cell-${rowIndex}-${cellIndex}`}
                    className="px-3 py-2 whitespace-normal text-[14px] leading-6 text-foreground/95"
                  >
                    {renderInlineContent(
                      cell,
                      `table-cell-${index}-${rowIndex}-${cellIndex}`,
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div key={`paragraph-${index}`} className="space-y-3 text-[15px] leading-7 text-foreground/95">
      {block.lines.map((line, lineIndex) => (
        <p key={`paragraph-line-${lineIndex}`} className="m-0">
          {line ? renderInlineContent(line, `paragraph-${index}-${lineIndex}`) : <span className="opacity-0">.</span>}
        </p>
      ))}
    </div>
  );
}

function parseRichContent(content) {
  const lines = content.split(/\r?\n/);
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fenceMatch = line.match(FENCE_REGEX);
    if (fenceMatch) {
      const language = fenceMatch[1] ?? "";
      index += 1;
      const codeLines = [];

      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({
        type: "code",
        language,
        code: codeLines.join("\n").trimEnd(),
      });
      continue;
    }

    const headingMatch = line.match(HEADING_REGEX);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      index += 1;
      continue;
    }

    const blockquoteMatch = line.match(BLOCKQUOTE_REGEX);
    if (blockquoteMatch) {
      const quoteLines = [blockquoteMatch[1]];
      index += 1;

      while (index < lines.length) {
        const match = lines[index].match(BLOCKQUOTE_REGEX);
        if (!match) {
          break;
        }

        quoteLines.push(match[1]);
        index += 1;
      }

      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    const orderedMatch = line.match(ORDERED_LIST_REGEX);
    const unorderedMatch = line.match(UNORDERED_LIST_REGEX);
    if (orderedMatch || unorderedMatch) {
      const { block, nextIndex } = parseList(lines, index);
      blocks.push(block);
      index = nextIndex;
      continue;
    }

    if (
      line.includes("|") &&
      index + 1 < lines.length &&
      lines[index + 1].match(TABLE_DIVIDER_REGEX)
    ) {
      const headers = splitTableRow(line);
      index += 2;
      const rows = [];

      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }

      blocks.push({ type: "table", headers, rows });
      continue;
    }

    const paragraphLines = [line];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index];
      if (
        !nextLine.trim() ||
        nextLine.match(FENCE_REGEX) ||
        nextLine.match(HEADING_REGEX) ||
        nextLine.match(BLOCKQUOTE_REGEX) ||
        nextLine.match(ORDERED_LIST_REGEX) ||
        nextLine.match(UNORDERED_LIST_REGEX) ||
        (nextLine.includes("|") &&
          index + 1 < lines.length &&
          lines[index + 1].match(TABLE_DIVIDER_REGEX))
      ) {
        break;
      }

      paragraphLines.push(nextLine);
      index += 1;
    }

    blocks.push({ type: "paragraph", lines: paragraphLines });
  }

  return blocks;
}

export function Response({ children }) {
  const content =
    typeof children === "string" ? children : String(children ?? "");
  const blocks = useMemo(() => parseRichContent(content), [content]);

  return (
    <div className="max-w-none space-y-4 text-[15px] leading-7 text-foreground/95">
      {blocks.length > 0 ? (
        blocks.map((block, index) =>
          block.type === "code" ? (
            <CodeBlock
              key={`code-${index}`}
              language={block.language}
              code={block.code}
            />
          ) : (
            renderTextBlock(block, index)
          ),
        )
      ) : (
        <p className="text-[15px] leading-7 text-foreground/95">{content}</p>
      )}
    </div>
  );
}
