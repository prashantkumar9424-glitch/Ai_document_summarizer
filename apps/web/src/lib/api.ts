import type { AuthSession, ChatDetail, ChatResponse, ChatSummary, MemoryBank, MemoryStatus, UploadResponse, VoiceTranscription } from "@platform/shared";
import {
  authSessionSchema,
  chatDetailSchema,
  chatResponseSchema,
  chatSummarySchema,
  memoryBankSchema,
  memoryStatusSchema,
  uploadResponseSchema,
  voiceTranscriptionSchema
} from "@platform/shared";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const guestSessionHeader = "x-guest-session-id";
const guestSessionStorageKey = "session-intelligence-guest-id";

async function request<T>(path: string, options: RequestInit, parser: { parse: (data: unknown) => T }) {
  const response = await fetch(`${baseUrl}/api${path}`, options);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.");
  }

  return parser.parse(payload);
}

function getGuestSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.localStorage.getItem(guestSessionStorageKey);
  if (existing) {
    return existing;
  }

  const next =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(guestSessionStorageKey, next);
  return next;
}

function buildHeaders(token?: string | null, contentType?: string) {
  const headers = new Headers();
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    const guestSessionId = getGuestSessionId();
    if (guestSessionId) {
      headers.set(guestSessionHeader, guestSessionId);
    }
  }
  return headers;
}

export const api = {
  fetchSession(token?: string | null) {
    return request<AuthSession>(
      "/auth/session",
      { headers: buildHeaders(token), method: "GET" },
      authSessionSchema
    );
  },
  listChats(token?: string | null) {
    return request<ChatSummary[]>(
      "/chats",
      { headers: buildHeaders(token), method: "GET" },
      { parse: (data) => chatSummarySchema.array().parse(data) }
    );
  },
  createChat(title: string | undefined, token?: string | null) {
    return request<ChatDetail>(
      "/chats",
      {
        headers: buildHeaders(token, "application/json"),
        method: "POST",
        body: JSON.stringify(title ? { title } : {})
      },
      chatDetailSchema
    );
  },
  getChat(chatId: string, token?: string | null) {
    return request<ChatDetail>(
      `/chats/${chatId}`,
      { headers: buildHeaders(token), method: "GET" },
      chatDetailSchema
    );
  },
  sendMessage(input: {
    chatId?: string;
    content: string;
    attachmentIds: string[];
    resetContext: boolean;
    language: string;
    token?: string | null;
  }) {
    return request<ChatResponse>(
      "/messages",
      {
        headers: buildHeaders(input.token, "application/json"),
        method: "POST",
        body: JSON.stringify({
          chatId: input.chatId,
          content: input.content,
          attachmentIds: input.attachmentIds,
          resetContext: input.resetContext,
          language: input.language
        })
      },
      chatResponseSchema
    );
  },
  getMemoryStatus(token?: string | null) {
    return request<MemoryStatus>(
      "/memory/status",
      { headers: buildHeaders(token), method: "GET" },
      memoryStatusSchema
    );
  },
  listMemory(input?: { token?: string | null; limit?: number; offset?: number; q?: string }) {
    const params = new URLSearchParams();
    if (typeof input?.limit === "number") {
      params.set("limit", String(input.limit));
    }
    if (typeof input?.offset === "number") {
      params.set("offset", String(input.offset));
    }
    if (input?.q) {
      params.set("q", input.q);
    }

    const query = params.toString();
    return request<MemoryBank>(
      `/memory/list${query ? `?${query}` : ""}`,
      { headers: buildHeaders(input?.token), method: "GET" },
      memoryBankSchema
    );
  },
  uploadFile(input: {
    file: File;
    chatId?: string | null;
    token?: string | null;
    onProgress?: (progress: number) => void;
  }) {
    return new Promise<UploadResponse>((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", input.file);
      if (input.chatId) {
        formData.append("chatId", input.chatId);
      }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${baseUrl}/api/uploads`);
      if (input.token) {
        xhr.setRequestHeader("Authorization", `Bearer ${input.token}`);
      } else {
        const guestSessionId = getGuestSessionId();
        if (guestSessionId) {
          xhr.setRequestHeader(guestSessionHeader, guestSessionId);
        }
      }
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && input.onProgress) {
          input.onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onerror = () => reject(new Error("Upload failed."));
      xhr.onload = () => {
        try {
          const payload = JSON.parse(xhr.responseText);
          if (xhr.status >= 400) {
            reject(new Error(payload.message ?? "Upload failed."));
            return;
          }
          resolve(uploadResponseSchema.parse(payload));
        } catch (error) {
          reject(error);
        }
      };
      xhr.send(formData);
    });
  },
  async transcribeAudio(input: { file: Blob; language: string; token?: string | null }) {
    const formData = new FormData();
    formData.append("file", input.file, "voice.webm");
    formData.append("language", input.language);
    return request<VoiceTranscription>(
      "/voice/transcribe",
      {
        method: "POST",
        headers: buildHeaders(input.token),
        body: formData
      },
      voiceTranscriptionSchema
    );
  }
};
