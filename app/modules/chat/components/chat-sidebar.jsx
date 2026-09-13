"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import UserButton from "@/app/modules/authentication/components/user-button";
import { PlusIcon, SearchIcon, EllipsisIcon, Trash, XIcon } from "lucide-react";
import Link from "next/link";
import { useChatStore } from "../store/chat-store";
import { useGetChats } from "../hooks/chat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DeleteChatModal from "@/components/ui/delete-chat-modal";
import { useState, useMemo } from "react";
import Image from "next/image";

function ChatItemSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-4 shrink-0" />
    </div>
  );
}

function SidebarSkeletons() {
  return (
    <div className="space-y-1 px-2">
      <Skeleton className="h-3 w-16 mx-2 mb-2" />
      {[1, 2, 3].map((i) => (
        <ChatItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChatSidebar({ user, chats: initialChats, className, onNavigate }) {
  const { activeChatId, setActiveChatId } = useChatStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState(null);

  // React Query — initialData hydrated from server-fetch to avoid flash
  const { data, isLoading } = useGetChats(initialChats);
  const chats = useMemo(
    () => data?.data ?? initialChats ?? [],
    [data?.data, initialChats],
  );

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter(
      (chat) =>
        chat.title?.toLowerCase().includes(query) ||
        chat.messages?.some((msg) =>
          msg.content?.toLowerCase().includes(query),
        ),
    );
  }, [chats, searchQuery]);

  // Group chats by relative date
  const groupedChats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 30);

    const groups = {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    };

    filteredChats.forEach((chat) => {
      const chatDate = new Date(chat.updatedAt ?? chat.createdAt);
      if (chatDate >= today) groups.today.push(chat);
      else if (chatDate >= yesterday) groups.yesterday.push(chat);
      else if (chatDate >= lastWeek) groups.lastWeek.push(chat);
      else if (chatDate >= lastMonth) groups.lastMonth.push(chat);
      else groups.older.push(chat);
    });

    return groups;
  }, [filteredChats]);

  const onDelete = (e, chatId) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedChatId(chatId);
    setIsModalOpen(true);
  };

  const renderChatGroup = (label, chatList) => {
    if (chatList.length === 0) return null;
    return (
      <div className="mb-4">
        <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
          {label}
        </div>
        {chatList.map((chat) => (
          <Link
            key={chat.id}
            href={`/chat/${chat.id}`}
            onClick={() => {
              setActiveChatId(chat.id);
              onNavigate?.();
            }}
            className={cn(
              "group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
              chat.id === activeChatId
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
            aria-current={chat.id === activeChatId ? "true" : undefined}
          >
            <span className="flex-1 min-w-0 truncate">{chat.title}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 shrink-0 rounded-md opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  onClick={(e) => e.preventDefault()}
                >
                  <EllipsisIcon className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-35">
                <DropdownMenuLabel className="text-xs">
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                  onClick={(e) => onDelete(e, chat.id)}
                >
                  <Trash className="h-3.5 w-3.5" />
                  Delete chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Link>
        ))}
      </div>
    );
  };

return (
    <div
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-sidebar",
        className,
      )}
    >
      {/* Logo */}
      <div className="relative flex items-center justify-center border-b border-sidebar-border px-3 py-2 h-14">
        <Image
          src="/logoText.png"
          alt="App logo"
          width={200}
          height={63}
          unoptimized
          className="h-full w-auto max-w-full object-contain invert transition dark:invert-0"
        />
        {onNavigate && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onNavigate}
            aria-label="Close sidebar"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* New Chat */}
      <div className="px-3 pt-3 pb-2">
        <Link
          href="/"
          onClick={() => {
            setActiveChatId(null);
            onNavigate?.();
          }}
        >
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-sm h-10 rounded-md bg-background transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <PlusIcon className="h-4 w-4" />
            New Chat
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative group/search">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors pointer-events-none" />
          <Input
            placeholder="Search chats..."
            className="pl-10 pr-9 h-10 text-sm bg-sidebar-accent/40 border-sidebar-border rounded-md focus-visible:ring-1 focus-visible:ring-foreground/20 focus-visible:border-foreground/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
              aria-label="Clear search"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-1.5 text-xs text-muted-foreground px-1">
            {filteredChats.length}{" "}
            {filteredChats.length === 1 ? "result" : "results"}
          </p>
        )}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-1 pb-2">
        {isLoading && !initialChats?.length ? (
          <SidebarSkeletons />
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No chats match your search" : "No chats yet"}
            </p>
            {!searchQuery && (
              <p className="mt-1 text-xs text-muted-foreground/70">
                Start a conversation to get started
              </p>
            )}
          </div>
        ) : (
          <>
            {renderChatGroup("Today", groupedChats.today)}
            {renderChatGroup("Yesterday", groupedChats.yesterday)}
            {renderChatGroup("Last 7 days", groupedChats.lastWeek)}
            {renderChatGroup("Last 30 days", groupedChats.lastMonth)}
            {renderChatGroup("Older", groupedChats.older)}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 p-3 flex items-center gap-2 border-t border-sidebar-border">
        <UserButton user={user} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
            {user?.name}
          </p>
          <p className="text-xs text-muted-foreground truncate leading-tight">
            {user?.email}
          </p>
        </div>
      </div>

      <DeleteChatModal
        chatId={selectedChatId}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
      />
    </div>
  );
}
