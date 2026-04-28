import { useEffect, useMemo, useState } from "react";
import type { Attachment, ChatDetail, ChatSummary, MemoryBank, MemoryStatus } from "@platform/shared";
import { api } from "../lib/api";

type UploadState = {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "processing" | "ready" | "error";
  error?: string;
};

export function useChat(input: { token: string | null; mode: "guest" | "authenticated"; enabled: boolean }) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<ChatDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [language, setLanguage] = useState("auto");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAttachmentIds, setPendingAttachmentIds] = useState<string[]>([]);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [memoryStatus, setMemoryStatus] = useState<MemoryStatus | null>(null);
  const [memoryBank, setMemoryBank] = useState<MemoryBank | null>(null);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [lastMemoryRefreshAt, setLastMemoryRefreshAt] = useState<string | null>(null);

  async function refreshMemoryBank(options?: { quiet?: boolean }) {
    if (!input.enabled) {
      return;
    }

    if (!options?.quiet) {
      setIsLoadingMemory(true);
    }

    setMemoryError(null);

    try {
      const status = await api.getMemoryStatus(input.token);
      setMemoryStatus(status);

      if (!status.enabled || !status.reachable || status.authFailed) {
        setMemoryBank({
          bankId: null,
          items: [],
          total: 0,
          limit: 12,
          offset: 0
        });
        setLastMemoryRefreshAt(new Date().toISOString());
        return;
      }

      const bank = await api.listMemory({
        token: input.token,
        limit: 12
      });
      setMemoryBank(bank);
      setLastMemoryRefreshAt(new Date().toISOString());
    } catch (requestError) {
      setMemoryError(requestError instanceof Error ? requestError.message : "Failed to load stored memory.");
    } finally {
      if (!options?.quiet) {
        setIsLoadingMemory(false);
      }
    }
  }

  useEffect(() => {
    if (!input.enabled) {
      setChats([]);
      setActiveChat(null);
      setDraft("");
      setLanguage("auto");
      setIsSending(false);
      setError(null);
      setPendingAttachmentIds([]);
      setUploads([]);
      setMemoryStatus(null);
      setMemoryBank(null);
      setIsLoadingMemory(false);
      setMemoryError(null);
      setLastMemoryRefreshAt(null);
      return;
    }

    setActiveChat(null);
    setPendingAttachmentIds([]);
    setUploads([]);
    setError(null);
    setMemoryError(null);

    api
      .listChats(input.token)
      .then(setChats)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Failed to load chats."));

    void refreshMemoryBank();
  }, [input.enabled, input.token, input.mode]);

  async function ensureChat() {
    if (activeChat) {
      return activeChat;
    }

    const created = await api.createChat(undefined, input.token);
    setActiveChat(created);
    setChats((current) => [summaryFromChat(created), ...current]);
    return created;
  }

  async function loadChat(chatId: string) {
    const detail = await api.getChat(chatId, input.token);
    setActiveChat(detail);
    setPendingAttachmentIds([]);
    setError(null);
  }

  function newChat() {
    setActiveChat(null);
    setDraft("");
    setPendingAttachmentIds([]);
    setUploads([]);
    setError(null);
  }

  async function send(resetContext = false) {
    if (!draft.trim()) {
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      const chat = await ensureChat();
      const response = await api.sendMessage({
        chatId: chat.id,
        content: draft.trim(),
        attachmentIds: pendingAttachmentIds,
        resetContext,
        language,
        token: input.token
      });

      setActiveChat(response.chat);
      setChats((current) => upsertSummary(current, summaryFromChat(response.chat)));
      setDraft("");
      setPendingAttachmentIds([]);
      void refreshMemoryBank({ quiet: true });
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          void refreshMemoryBank({ quiet: true });
        }, 2200);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  }

  async function uploadFile(file: File) {
    const uploadId = `${file.name}-${Date.now()}`;
    setUploads((current) => [...current, { id: uploadId, name: file.name, progress: 0, status: "uploading" }]);

    try {
      const chat = await ensureChat();
      const response = await api.uploadFile({
        file,
        chatId: chat.id,
        token: input.token,
        onProgress: (progress) => {
          setUploads((current) => current.map((item) => (item.id === uploadId ? { ...item, progress } : item)));
        }
      });

      setUploads((current) => current.map((item) => (item.id === uploadId ? { ...item, status: "ready", progress: 100 } : item)));
      setPendingAttachmentIds((current) => [...current, response.attachment.id]);
      const detail = await api.getChat(chat.id, input.token);
      setActiveChat(detail);
      setChats((current) => upsertSummary(current, summaryFromChat(detail)));
    } catch (requestError) {
      setUploads((current) =>
        current.map((item) =>
          item.id === uploadId
            ? {
                ...item,
                status: "error",
                error: requestError instanceof Error ? requestError.message : "Upload failed."
              }
            : item
        )
      );
      setError(requestError instanceof Error ? requestError.message : "Upload failed.");
    }
  }

  async function transcribeVoice(blob: Blob) {
    const result = await api.transcribeAudio({
      file: blob,
      language,
      token: input.token
    });

    setDraft((current) => [current, result.text].filter(Boolean).join(current ? " " : ""));
  }

  const activeAttachments = useMemo(() => activeChat?.attachments ?? [], [activeChat]);

  return {
    chats,
    activeChat,
    activeAttachments,
    draft,
    setDraft,
    language,
    setLanguage,
    isSending,
    error,
    memoryStatus,
    memoryBank,
    isLoadingMemory,
    memoryError,
    lastMemoryRefreshAt,
    uploads,
    pendingAttachmentIds,
    loadChat,
    newChat,
    send,
    refreshMemoryBank,
    uploadFile,
    transcribeVoice
  };
}

function summaryFromChat(chat: ChatDetail): ChatSummary {
  return {
    id: chat.id,
    title: chat.title,
    mode: chat.mode,
    lastMessageAt: chat.lastMessageAt,
    attachmentCount: chat.attachments.length
  };
}

function upsertSummary(items: ChatSummary[], next: ChatSummary) {
  return [next, ...items.filter((item) => item.id !== next.id)].sort((left, right) =>
    right.lastMessageAt.localeCompare(left.lastMessageAt)
  );
}
