import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createChatWithMessage,
  createMessageInChat,
  deleteChat,
  generateAiResponse,
  getAllChats,
  getChatById,
} from "../actions";
import { useRouter } from "next/navigation";
import { useChatStore } from "../store/chat-store";
import { toast } from "sonner";
import { useEffect } from "react";

export const useGetChats = (initialChats) => {
  const { setChats } = useChatStore();

  const query = useQuery({
    queryKey: ["chats"],
    queryFn: getAllChats,
    initialData: initialChats
      ? { success: true, data: initialChats, message: "" }
      : undefined,
  });

  // Sync to Zustand store whenever data changes
  useEffect(() => {
    if (query.data?.data) {
      setChats(query.data.data);
    }
  }, [query.data, setChats]);

  return query;
};

export const useCreateMessageInChat = (chatId) => {
  const queryClient = useQueryClient();
  const { addMessage, setMessages, messages } = useChatStore();

  return useMutation({
    mutationFn: (values) => createMessageInChat(values, chatId),
    // Optimistic update: update both the zustand store and React Query cache
    onMutate: async (values) => {
      // Cancel any outgoing refetches for this chat so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["chats", chatId] });

      const previousChat = queryClient.getQueryData(["chats", chatId]);
      const previousMessages = previousChat?.data?.messages ?? messages;

      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content: values.content,
        messageRole: "USER",
        messageType: "NORMAL",
        model: values.model ?? null,
        createdAt: new Date().toISOString(),
      };

      // Update zustand store immediately
      addMessage(optimisticMessage);
      setMessages([...previousMessages, optimisticMessage]);

      const optimisticChat = previousChat
        ? {
            ...previousChat,
            data: {
              ...previousChat.data,
              messages: [...previousMessages, optimisticMessage],
            },
          }
        : {
            success: true,
            message: "optimistic-chat",
            data: {
              id: chatId,
              title: "",
              model: values.model ?? null,
              userId: null,
              messages: [...previousMessages, optimisticMessage],
            },
          };

      queryClient.setQueryData(["chats", chatId], optimisticChat);

      return { previousChat, previousMessages };
    },

    onError: (_error, _variables, context) => {
      // Rollback zustand store
      if (context?.previousMessages) {
        setMessages(context.previousMessages);
      }

      // Rollback React Query cache
      if (context?.previousChat) {
        queryClient.setQueryData(["chats", chatId], context.previousChat);
      }

      // Ensure chats list is refreshed
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },

    onSuccess: (res, _variables, context) => {
      if (res.success && res.data) {
        const { userMessage, Assistantmessage } = res.data;

        const newMessages = (context?.previousMessages || []).concat(
          userMessage,
        );
        if (Assistantmessage) newMessages.push(Assistantmessage);

        setMessages(newMessages);

        const previousChat = context?.previousChat;
        if (previousChat) {
          const updatedChat = {
            ...previousChat,
            data: {
              ...previousChat.data,
              messages: newMessages,
            },
          };
          queryClient.setQueryData(["chats", chatId], updatedChat);
        }

        queryClient.invalidateQueries({ queryKey: ["chats"] });
      }
    },
  });
};

export const useCreateChat = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { addChat, setActiveChatId, setMessages } = useChatStore();

  return useMutation({
    mutationFn: (values) => createChatWithMessage(values),
    onSuccess: (res) => {
      if (res.success && res.data) {
        const chat = res.data;
        addChat(chat);
        setActiveChatId(chat.id);

        // Set messages from the created chat
        setMessages(chat.messages || []);

        queryClient.invalidateQueries({ queryKey: ["chats"] });

        // Redirect WITH autoTrigger to stream AI response
        router.push(`/chat/${chat.id}?autoTrigger=true`);
      } else if (!res.success) {
        // Server returned a structured error (e.g. model unavailable)
        toast.error(res.message || "Failed to create chat");
      }
    },
    onError: (error) => {
      console.error("Create chat error:", error);
      toast.error("Failed to create chat");
    },
  });
};

export const useGetChatById = (chatId) => {
  return useQuery({
    queryKey: ["chats", chatId],
    queryFn: () => getChatById(chatId),
    staleTime: 30 * 1000, // messages are managed via Zustand; avoid refetch on every focus
  });
};

export const useDeleteChat = (chatId) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { clearMessages, activeChatId, setActiveChatId } = useChatStore();
  return useMutation({
    mutationFn: () => deleteChat(chatId),
    onSuccess: () => {
      // Remove from Zustand store immediately (read fresh state to avoid stale closures)
      const currentChats = useChatStore.getState().chats;
      useChatStore.getState().setChats(
        currentChats.filter((c) => c.id !== chatId),
      );
      if (activeChatId === chatId) {
        clearMessages();
        setActiveChatId(null);
      }
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      router.push("/");
    },
    onError: () => {
      toast.error("Failed to delete chat");
    },
  });
};

export const useGenerateAiResponse = (chatId) => {
  const queryClient = useQueryClient();
  const { setMessages } = useChatStore();

  return useMutation({
    mutationFn: () => generateAiResponse(chatId),
    onSuccess: (res) => {
      if (res.success && res.data?.assistantMessage) {
        const assistantMsg = res.data.assistantMessage;
        // Use getState() to always read the latest messages, never stale closure
        const currentMessages = useChatStore.getState().messages;
        setMessages([...currentMessages, assistantMsg]);
        queryClient.invalidateQueries({ queryKey: ["chats", chatId] });
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      } else if (!res.success) {
        toast.error(res.message || "Failed to generate AI response");
      }
    },
    onError: () => {
      toast.error("Failed to generate AI response");
    },
  });
};
