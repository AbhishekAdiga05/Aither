"use client";

import React, { useState } from "react";
import { Sparkles, Newspaper, Code, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const CHAT_TAB_MESSAGE = [
  {
    tabName: "Create",
    icon: <Sparkles className="h-4 w-4" />,
    messages: [
      "Write a short story about a robot discovering emotions",
      "Help me outline a sci-fi novel set in a post-apocalyptic world",
      "Create a character profile for a complex villain with sympathetic motives",
      "Give me 5 creative writing prompts for flash fiction",
    ],
  },
  {
    tabName: "Explore",
    icon: <Newspaper className="h-4 w-4" />,
    messages: [
      "Good books for fans of Rick Rubin",
      "Countries ranked by number of corgis",
      "Most successful companies in the world",
      "How much does Claude cost?",
    ],
  },
  {
    tabName: "Code",
    icon: <Code className="h-4 w-4" />,
    messages: [
      "Write code to invert a binary search tree in Python",
      "What is the difference between Promise.all and Promise.allSettled?",
      "Explain React's useEffect cleanup function",
      "Best practices for error handling in async/await",
    ],
  },
  {
    tabName: "Learn",
    icon: <GraduationCap className="h-4 w-4" />,
    messages: [
      "Beginner's guide to TypeScript",
      "Explain the CAP theorem in distributed systems",
      "Why is AI so expensive?",
      "Are black holes real?",
    ],
  },
];

function ChatWelcomeTabs({ userName, onMessageSelect }) {
  const [activeTab, setActiveTab] = useState(0);
  const firstName =
    typeof userName === "string" && userName.trim()
      ? userName.trim().split(" ")[0]
      : "there";

  return (
    <div className="flex flex-col items-center justify-center px-4 w-full min-h-0 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="w-full max-w-3xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            How can I help you,
            <br />
            {firstName}?
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick a starter below or write your own prompt.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full">
          {CHAT_TAB_MESSAGE.map((tab, index) => (
            <button
              key={tab.tabName}
              type="button"
              aria-pressed={activeTab === index}
              onClick={() => setActiveTab(index)}
              className={cn(
                "flex items-center justify-center gap-2 flex-1 min-w-[110px] rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === index
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {tab.icon}
              <span>{tab.tabName}</span>
            </button>
          ))}
        </div>

        <div className="w-full rounded-xl border border-border bg-card p-2 shadow-sm">
          <div className="space-y-1">
            {CHAT_TAB_MESSAGE[activeTab].messages.map((prompt, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onMessageSelect(prompt)}
                className="group flex w-full items-center justify-between rounded-md p-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span className="font-medium">{prompt}</span>
                <span className="translate-x-1 text-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                  &rarr;
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatWelcomeTabs;
