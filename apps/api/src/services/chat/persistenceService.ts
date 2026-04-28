import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Attachment, ChatDetail, ChatSummary, Message, UserMode } from "@platform/shared";
import { env, flags } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { guestStore } from "./guestStore.js";

type StoredChatRow = {
  id: string;
  title: string;
  mode: UserMode;
  created_at: string;
  last_message_at: string;
  user_id: string;
};

type StoredMessageRow = {
  id: string;
  chat_id: string;
  role: Message["role"];
  content: string;
  created_at: string;
  attachment_ids: string[] | null;
  recall: Message["recall"] | null;
};

type StoredAttachmentRow = {
  id: string;
  chat_id: string | null;
  user_id: string | null;
  name: string;
  mime_type: string;
  kind: Attachment["kind"];
  storage_path: string;
  preview_url: string | null;
  extracted_text: string | null;
  insight: Attachment["insight"];
  created_at: string;
};

function chatRowToSummary(row: StoredChatRow, attachmentCount: number): ChatSummary {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode,
    lastMessageAt: row.last_message_at,
    attachmentCount
  };
}

function messageRowToDomain(row: StoredMessageRow): Message {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    attachmentIds: row.attachment_ids ?? [],
    recall: row.recall ?? []
  };
}

function attachmentRowToDomain(row: StoredAttachmentRow): Attachment {
  return {
    id: row.id,
    chatId: row.chat_id,
    name: row.name,
    mimeType: row.mime_type,
    kind: row.kind,
    storagePath: row.storage_path,
    previewUrl: row.preview_url,
    extractedText: row.extracted_text,
    insight: row.insight,
    createdAt: row.created_at
  };
}

function resolveGuestSessionId(guestSessionId: string | null | undefined) {
  return guestSessionId ?? "anonymous-guest";
}

export class PersistenceService {
  private readonly admin: SupabaseClient | null;

  constructor() {
    this.admin =
      flags.hasSupabaseAdmin && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
        ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false }
          })
        : null;
  }

  private getAdminClient() {
    if (!this.admin) {
      throw new Error("Supabase service role is required for authenticated persistence.");
    }

    return this.admin;
  }

  async listChats(userId: string | null, mode: UserMode, guestSessionId?: string | null): Promise<ChatSummary[]> {
    if (mode === "guest" || !userId) {
      return guestStore.listChats(resolveGuestSessionId(guestSessionId));
    }

    const admin = this.getAdminClient();
    const { data: chats, error } = await admin
      .from("chats")
      .select("id,title,mode,created_at,last_message_at,user_id,attachments(count)")
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false });

    if (error) {
      logger.error("Failed to list chats", { error: error.message, userId });
      throw new Error("Unable to load chat history.");
    }

    return (chats ?? []).map((row: any) => chatRowToSummary(row, Number(row.attachments?.[0]?.count ?? 0)));
  }

  async getChat(chatId: string, userId: string | null, mode: UserMode, guestSessionId?: string | null): Promise<ChatDetail | null> {
    if (mode === "guest" || !userId) {
      return guestStore.getChat(resolveGuestSessionId(guestSessionId), chatId);
    }

    const admin = this.getAdminClient();
    const { data: chatRow, error: chatError } = await admin
      .from("chats")
      .select("id,title,mode,created_at,last_message_at,user_id")
      .eq("id", chatId)
      .eq("user_id", userId)
      .maybeSingle<StoredChatRow>();

    if (chatError) {
      logger.error("Failed to fetch chat", { error: chatError.message, chatId, userId });
      throw new Error("Unable to load chat.");
    }

    if (!chatRow) {
      return null;
    }

    const [{ data: messageRows, error: messageError }, { data: attachmentRows, error: attachmentError }] = await Promise.all([
      admin
        .from("messages")
        .select("id,chat_id,role,content,created_at,attachment_ids,recall")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true }),
      admin
        .from("attachments")
        .select("id,chat_id,user_id,name,mime_type,kind,storage_path,preview_url,extracted_text,insight,created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })
    ]);

    if (messageError || attachmentError) {
      logger.error("Failed to fetch chat resources", {
        chatId,
        messageError: messageError?.message,
        attachmentError: attachmentError?.message
      });
      throw new Error("Unable to load chat details.");
    }

    return {
      id: chatRow.id,
      title: chatRow.title,
      mode: chatRow.mode,
      createdAt: chatRow.created_at,
      lastMessageAt: chatRow.last_message_at,
      messages: (messageRows ?? []).map(messageRowToDomain),
      attachments: (attachmentRows ?? []).map(attachmentRowToDomain)
    };
  }

  async createChat(
    userId: string | null,
    mode: UserMode,
    title = "New intelligence thread",
    guestSessionId?: string | null
  ): Promise<ChatDetail> {
    const id = randomUUID();

    if (mode === "guest" || !userId) {
      return guestStore.createEmptyChat(resolveGuestSessionId(guestSessionId), id, title, "guest");
    }

    const admin = this.getAdminClient();
    const now = new Date().toISOString();
    const row = {
      id,
      title,
      user_id: userId,
      mode,
      created_at: now,
      last_message_at: now
    };

    const { error } = await admin.from("chats").insert(row);
    if (error) {
      logger.error("Failed to create chat", { error: error.message, userId });
      throw new Error("Unable to create chat.");
    }

    return {
      id,
      title,
      mode,
      createdAt: now,
      lastMessageAt: now,
      messages: [],
      attachments: []
    };
  }

  async saveAttachment(input: {
    attachment: Attachment;
    userId: string | null;
    mode: UserMode;
    guestSessionId?: string | null;
  }): Promise<Attachment> {
    const { attachment, userId, mode, guestSessionId } = input;

    if (mode === "guest" || !userId) {
      const sessionId = resolveGuestSessionId(guestSessionId);
      guestStore.saveAttachment(sessionId, attachment);
      if (attachment.chatId) {
        const chat = guestStore.getChat(sessionId, attachment.chatId);
        if (chat) {
          guestStore.upsertChat(sessionId, {
            ...chat,
            attachments: [...chat.attachments, attachment]
          });
        }
      }
      return attachment;
    }

    const admin = this.getAdminClient();
    const row = {
      id: attachment.id,
      chat_id: attachment.chatId,
      user_id: userId,
      name: attachment.name,
      mime_type: attachment.mimeType,
      kind: attachment.kind,
      storage_path: attachment.storagePath,
      preview_url: attachment.previewUrl,
      extracted_text: attachment.extractedText,
      insight: attachment.insight,
      created_at: attachment.createdAt
    };

    const { error } = await admin.from("attachments").insert(row);
    if (error) {
      logger.error("Failed to save attachment", { error: error.message, attachmentId: attachment.id });
      throw new Error("Unable to store uploaded asset.");
    }

    return attachment;
  }

  async appendConversation(input: {
    chatId: string;
    userId: string | null;
    mode: UserMode;
    messages: Message[];
    attachmentIds: string[];
    title?: string;
    guestSessionId?: string | null;
  }): Promise<ChatDetail> {
    const { chatId, userId, mode, messages, attachmentIds, title, guestSessionId } = input;

    if (mode === "guest" || !userId) {
      const sessionId = resolveGuestSessionId(guestSessionId);
      const attachments = guestStore.getAttachments(sessionId, attachmentIds);
      const chat = guestStore.appendMessages(sessionId, chatId, messages, attachments);
      if (!chat) {
        throw new Error("Guest chat no longer exists.");
      }
      if (title && chat.title === "New intelligence thread") {
        const renamed = { ...chat, title };
        guestStore.upsertChat(sessionId, renamed);
        return renamed;
      }
      return chat;
    }

    const admin = this.getAdminClient();
    const messageRows = messages.map((message) => ({
      id: message.id,
      chat_id: chatId,
      role: message.role,
      content: message.content,
      created_at: message.createdAt,
      attachment_ids: message.attachmentIds,
      recall: message.recall
    }));

    const { error: insertError } = await admin.from("messages").insert(messageRows);
    if (insertError) {
      logger.error("Failed to append messages", { error: insertError.message, chatId });
      throw new Error("Unable to persist conversation.");
    }

    const patch: Record<string, unknown> = {
      last_message_at: messages[messages.length - 1]?.createdAt ?? new Date().toISOString()
    };
    if (title) {
      patch.title = title;
    }

    const { error: updateError } = await admin.from("chats").update(patch).eq("id", chatId).eq("user_id", userId);
    if (updateError) {
      logger.error("Failed to update chat metadata", { error: updateError.message, chatId });
      throw new Error("Unable to update conversation metadata.");
    }

    const chat = await this.getChat(chatId, userId, mode, guestSessionId);
    if (!chat) {
      throw new Error("Conversation was saved but could not be reloaded.");
    }

    return chat;
  }
}
