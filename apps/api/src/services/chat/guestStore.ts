import type { Attachment, ChatDetail, ChatSummary, Message, UserMode } from "@platform/shared";

type GuestChat = ChatDetail;

const guestChats = new Map<string, Map<string, GuestChat>>();
const guestAttachments = new Map<string, Map<string, Attachment>>();

function toSummary(chat: GuestChat): ChatSummary {
  return {
    id: chat.id,
    title: chat.title,
    mode: chat.mode,
    lastMessageAt: chat.lastMessageAt,
    attachmentCount: chat.attachments.length
  };
}

function getSessionChats(sessionId: string) {
  let sessionChats = guestChats.get(sessionId);
  if (!sessionChats) {
    sessionChats = new Map<string, GuestChat>();
    guestChats.set(sessionId, sessionChats);
  }
  return sessionChats;
}

function getSessionAttachments(sessionId: string) {
  let sessionAttachments = guestAttachments.get(sessionId);
  if (!sessionAttachments) {
    sessionAttachments = new Map<string, Attachment>();
    guestAttachments.set(sessionId, sessionAttachments);
  }
  return sessionAttachments;
}

export const guestStore = {
  listChats(sessionId: string): ChatSummary[] {
    return Array.from(getSessionChats(sessionId).values())
      .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt))
      .map(toSummary);
  },
  getChat(sessionId: string, chatId: string): GuestChat | null {
    return getSessionChats(sessionId).get(chatId) ?? null;
  },
  upsertChat(sessionId: string, chat: GuestChat) {
    getSessionChats(sessionId).set(chat.id, chat);
  },
  saveAttachment(sessionId: string, attachment: Attachment) {
    getSessionAttachments(sessionId).set(attachment.id, attachment);
  },
  getAttachments(sessionId: string, ids: string[]) {
    const sessionAttachments = getSessionAttachments(sessionId);
    return ids
      .map((id) => sessionAttachments.get(id))
      .filter((attachment): attachment is Attachment => Boolean(attachment));
  },
  createEmptyChat(sessionId: string, chatId: string, title: string, mode: UserMode): GuestChat {
    const now = new Date().toISOString();
    const chat: GuestChat = {
      id: chatId,
      title,
      mode,
      createdAt: now,
      lastMessageAt: now,
      messages: [],
      attachments: []
    };
    getSessionChats(sessionId).set(chatId, chat);
    return chat;
  },
  appendMessages(sessionId: string, chatId: string, messages: Message[], attachments: Attachment[]) {
    const sessionChats = getSessionChats(sessionId);
    const chat = sessionChats.get(chatId);
    if (!chat) {
      return null;
    }

    const mergedAttachments = [...chat.attachments];
    for (const attachment of attachments) {
      const exists = mergedAttachments.some((item) => item.id === attachment.id);
      if (!exists) {
        mergedAttachments.push(attachment);
      }
    }

    const updated: GuestChat = {
      ...chat,
      messages: [...chat.messages, ...messages],
      attachments: mergedAttachments,
      lastMessageAt: messages[messages.length - 1]?.createdAt ?? chat.lastMessageAt
    };
    sessionChats.set(chatId, updated);
    return updated;
  }
};
