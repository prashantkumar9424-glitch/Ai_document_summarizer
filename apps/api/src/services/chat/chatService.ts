import { randomUUID } from "node:crypto";
import type { Attachment, ChatDetail, ChatResponse, CreateChatInput, Message, SendMessageInput } from "@platform/shared";
import { PersistenceService } from "./persistenceService.js";
import { HindsightService } from "../memory/hindsightService.js";
import { GroqService } from "../ai/groqService.js";

export class ChatService {
  constructor(
    private readonly persistence = new PersistenceService(),
    private readonly groq = new GroqService(),
    private readonly hindsight = new HindsightService()
  ) {}

  listChats(userId: string | null, mode: "guest" | "authenticated", guestSessionId?: string | null) {
    return this.persistence.listChats(userId, mode, guestSessionId);
  }

  getChat(chatId: string, userId: string | null, mode: "guest" | "authenticated", guestSessionId?: string | null) {
    return this.persistence.getChat(chatId, userId, mode, guestSessionId);
  }

  createChat(input: CreateChatInput, userId: string | null, mode: "guest" | "authenticated", guestSessionId?: string | null) {
    return this.persistence.createChat(userId, mode, input.title ?? "New intelligence thread", guestSessionId);
  }

  async sendMessage(
    input: SendMessageInput,
    userId: string | null,
    mode: "guest" | "authenticated",
    guestSessionId?: string | null
  ): Promise<ChatResponse> {
    let chat: ChatDetail | null = null;

    if (input.chatId) {
      chat = await this.persistence.getChat(input.chatId, userId, mode, guestSessionId);
    }

    if (!chat) {
      chat = await this.persistence.createChat(userId, mode, "New intelligence thread", guestSessionId);
    }

    const attachments = chat.attachments.filter((attachment) => input.attachmentIds.includes(attachment.id));
    const shouldRecall = !input.resetContext && (chat.messages.length > 0 || input.content.length > 20);
    const recalledMemory = await this.hindsight.recall({
      mode,
      userId,
      guestSessionId,
      query: input.content,
      shouldRecall,
      chatId: chat.id,
      chatTitle: chat.title,
      history: input.resetContext ? [] : chat.messages,
      attachmentSummaries: attachments.map((attachment) => attachment.insight?.summary ?? attachment.name)
    });

    const userMessage: Message = {
      id: randomUUID(),
      role: "user",
      content: input.content,
      createdAt: new Date().toISOString(),
      attachmentIds: input.attachmentIds,
      recall: []
    };

    const generation = await this.groq.generateReply({
      message: input.content,
      language: input.language,
      history: input.resetContext ? [] : chat.messages,
      attachments,
      recalledMemory: recalledMemory.events,
      memoryContext: recalledMemory.promptContext
    });

    const assistantMessage: Message = {
      id: randomUUID(),
      role: "assistant",
      content: generation.reply,
      createdAt: new Date(Date.now() + 1).toISOString(),
      attachmentIds: [],
      recall: recalledMemory.events
    };

    const updatedChat = await this.persistence.appendConversation({
      chatId: chat.id,
      userId,
      mode,
      messages: [userMessage, assistantMessage],
      attachmentIds: input.attachmentIds,
      title: chat.title === "New intelligence thread" ? generation.title : undefined,
      guestSessionId
    });

    void this.hindsight.retainConversation({
      mode,
      userId,
      guestSessionId,
      chatId: updatedChat.id,
      title: updatedChat.title,
      userMessage: userMessage.content,
      assistantMessage: assistantMessage.content,
      attachmentSummaries: attachments.map((attachment) => attachment.insight?.summary ?? attachment.name)
    });

    return {
      chat: updatedChat,
      reply: assistantMessage,
      recalledMemory: recalledMemory.events,
      generatedInsight: generation.insight
    };
  }

  saveAttachment(input: {
    attachment: Attachment;
    userId: string | null;
    mode: "guest" | "authenticated";
    guestSessionId?: string | null;
  }) {
    return this.persistence.saveAttachment(input);
  }
}
