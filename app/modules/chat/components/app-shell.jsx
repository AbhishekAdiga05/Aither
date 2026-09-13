"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { ChatSidebar } from "./chat-sidebar";
import Header from "./header";

export function AppShell({ user, chats, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  React.useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <ChatSidebar
        user={user}
        chats={chats}
        className="hidden w-64 md:flex"
      />

      <main className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-background/70 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur-md md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="shrink-0"
          >
            <Menu className="size-6" />
          </Button>

          <Image
            src="/logoText.png"
            alt="App logo"
            width={160}
            height={50}
            unoptimized
            className="h-6 w-auto object-contain invert dark:invert-0 sm:h-7"
          />

          <ModeToggle />
        </div>

        <Header className="hidden md:flex" />

        <div className="relative flex-1 overflow-hidden">{children}</div>
      </main>

      {/* Mobile drawer sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <ChatSidebar
            user={user}
            chats={chats}
            onNavigate={() => setSidebarOpen(false)}
            className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] shadow-2xl pt-[env(safe-area-inset-top)]"
          />
        </div>
      )}
    </div>
  );
}