"use server";

import db from "@/lib/db";
import { currentUser } from "@/app/modules/authentication/actions";
import { MessageRole, MessageType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompt";
import { DEFAULT_MODEL_ID } from "@/lib/ai-models";

const provider = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const resolveModelId = (model) => model || DEFAULT_MODEL_ID;

export const createMessageInChat = async (values, chatId) => {
  const user = await currentUser();

  if (!user) {
    return {
      success: false,
      message: "Unauthorized user",
    };
  }

  const { content, model: inputModel } = values;

  if (!content || content.trim() === "") {
    return {
      success: false,
      message: "Message content is required",
    };
  }

  // Resolve model: use the provided model or fall back to the chat's stored model
  let model = inputModel;
  if (!model) {
    const chat = await db.chat.findUnique({
      where: { id: chatId },
      select: { model: true },
    });
    model = chat?.model;
  }

  model = resolveModelId(model);

  const userMessage = await db.message.create({
    data: {
      model,
      content,
      messageRole: MessageRole.USER,
      messageType: MessageType.NORMAL,
      chatId,
    },
  });

  // Fetch all messages (including the one just created) for AI context
  const previousMessages = await db.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });

  const aiMessages = previousMessages.map((msg) => ({
    role: msg.messageRole === MessageRole.USER ? "user" : "assistant",
    content: msg.content,
  }));

  let assistantContent = null;

  try {
    const result = await generateText({
      model: provider.chat(model),
      system: CHAT_SYSTEM_PROMPT,
      messages: aiMessages,
    });
    assistantContent = result.text;
  } catch (error) {
    console.error("AI generation error:", error);
    return { success: false, message: "Failed to generate AI response" };
  }

  const Assistantmessage = await db.message.create({
    data: {
      model,
      chatId,
      content: assistantContent,
      messageRole: MessageRole.ASSISTANT,
      messageType: MessageType.NORMAL,
    },
  });

  revalidatePath(`/chat/${chatId}`);
  return {
    success: true,
    message: "Chat created successfully",
    data: {
      userMessage,
      Assistantmessage,
    },
  };
};

export const createChatWithMessage = async (values) => {
  try {
    const user = await currentUser();
    if (!user) return { success: false, message: "Unauthorized user" };

    const { content, model: inputModel } = values;
    if (!content || !content.trim()) {
      return { success: false, message: "Message content is required" };
    }

    const model = resolveModelId(inputModel);

    const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");

    // Create chat WITH initial user message
    const chat = await db.chat.create({
      data: {
        title,
        model,
        userId: user.id,
        messages: {
          create: {
            content,
            messageRole: MessageRole.USER,
            messageType: MessageType.NORMAL,
            model,
          },
        },
      },
      include: { messages: true }, // Include messages in response
    });

    revalidatePath("/");
    return { success: true, message: "Chat created successfully", data: chat };
  } catch (error) {
    console.error("Error creating chat:", error);
    return { success: false, message: "Failed to create chat" };
  }
};

export const getAllChats = async () => {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        message: "Unauthorized user",
      };
    }

    const chats = await db.chat.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        title: true,
        model: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          take: 5,
          select: { content: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // revalidatePath("/");
    return {
      success: true,
      message: "Chats fetched successfully",
      data: chats,
    };
  } catch (error) {
    console.error("Error fetching chats:", error);
    return {
      success: false,
      message: "Failed to fetch chats",
    };
  }
};

export const getChatById = async (chatId) => {
  const user = await currentUser();

  if (!user) {
    return {
      success: false,
      message: "Unauthorized user",
    };
  }

  try {
    const chat = await db.chat.findUnique({
      where: {
        id: chatId,
        userId: user.id,
      },
      include: {
        messages: {
          take: 50,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (chat && chat.messages) {
      chat.messages.reverse();
    }

    return {
      success: true,
      message: "Chat fetched successfully",
      data: chat,
    };
  } catch (error) {
    console.error("Error fetching chat:", error);
    return {
      success: false,
      message: "Failed to fetch chat",
    };
  }
};

/**
 * Generate only the AI response for an existing chat.
 * Used by auto-trigger — the user message already exists in DB, so we must
 * NOT create another one (that would cause duplicates).
 */
export const generateAiResponse = async (chatId) => {
  const user = await currentUser();
  if (!user) return { success: false, message: "Unauthorized user" };

  const chat = await db.chat.findUnique({
    where: { id: chatId, userId: user.id },
    select: { model: true },
  });

  if (!chat?.model) {
    return { success: false, message: "Chat not found or has no model" };
  }

  const model = resolveModelId(chat.model);

  const previousMessages = await db.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });

  const aiMessages = previousMessages.map((msg) => ({
    role: msg.messageRole === MessageRole.USER ? "user" : "assistant",
    content: msg.content,
  }));

  let assistantContent = null;
  try {
    const result = await generateText({
      model: provider.chat(model),
      system: CHAT_SYSTEM_PROMPT,
      messages: aiMessages,
    });
    assistantContent = result.text;
  } catch (error) {
    console.error("AI generation error (auto-trigger):", error);
    return { success: false, message: "Failed to generate AI response" };
  }

  const assistantMessage = await db.message.create({
    data: {
      model,
      chatId,
      content: assistantContent,
      messageRole: MessageRole.ASSISTANT,
      messageType: MessageType.NORMAL,
    },
  });

  revalidatePath(`/chat/${chatId}`);
  return {
    success: true,
    message: "AI response generated",
    data: { assistantMessage },
  };
};

export const deleteChat = async (chatId) => {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        message: "Unauthorized user",
      };
    }

    const chat = await db.chat.findUnique({
      where: {
        id: chatId,
        userId: user.id,
      },
    });

    if (!chat) {
      return {
        success: false,
        message: "Chat not found",
      };
    }

    await db.chat.delete({
      where: {
        id: chatId,
      },
    });
    revalidatePath(`/chat/${chatId}`);
    return {
      success: true,
      message: "Chat deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting chat:", error);
    return {
      success: false,
      message: "Failed to delete chat",
    };
  }
};
