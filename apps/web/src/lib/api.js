import { authSessionSchema, chatDetailSchema, chatResponseSchema, chatSummarySchema, memoryBankSchema, memoryStatusSchema, uploadResponseSchema, voiceTranscriptionSchema } from "@platform/shared";
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const guestSessionHeader = "x-guest-session-id";
const guestSessionStorageKey = "session-intelligence-guest-id";
async function request(path, options, parser) {
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
    const next = typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(guestSessionStorageKey, next);
    return next;
}
function buildHeaders(token, contentType) {
    const headers = new Headers();
    if (contentType) {
        headers.set("Content-Type", contentType);
    }
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    else {
        const guestSessionId = getGuestSessionId();
        if (guestSessionId) {
            headers.set(guestSessionHeader, guestSessionId);
        }
    }
    return headers;
}
export const api = {
    fetchSession(token) {
        return request("/auth/session", { headers: buildHeaders(token), method: "GET" }, authSessionSchema);
    },
    listChats(token) {
        return request("/chats", { headers: buildHeaders(token), method: "GET" }, { parse: (data) => chatSummarySchema.array().parse(data) });
    },
    createChat(title, token) {
        return request("/chats", {
            headers: buildHeaders(token, "application/json"),
            method: "POST",
            body: JSON.stringify(title ? { title } : {})
        }, chatDetailSchema);
    },
    getChat(chatId, token) {
        return request(`/chats/${chatId}`, { headers: buildHeaders(token), method: "GET" }, chatDetailSchema);
    },
    sendMessage(input) {
        return request("/messages", {
            headers: buildHeaders(input.token, "application/json"),
            method: "POST",
            body: JSON.stringify({
                chatId: input.chatId,
                content: input.content,
                attachmentIds: input.attachmentIds,
                resetContext: input.resetContext,
                language: input.language
            })
        }, chatResponseSchema);
    },
    getMemoryStatus(token) {
        return request("/memory/status", { headers: buildHeaders(token), method: "GET" }, memoryStatusSchema);
    },
    listMemory(input) {
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
        return request(`/memory/list${query ? `?${query}` : ""}`, { headers: buildHeaders(input?.token), method: "GET" }, memoryBankSchema);
    },
    uploadFile(input) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append("file", input.file);
            if (input.chatId) {
                formData.append("chatId", input.chatId);
            }
            const xhr = new XMLHttpRequest();
            xhr.open("POST", `${baseUrl}/api/uploads`);
            if (input.token) {
                xhr.setRequestHeader("Authorization", `Bearer ${input.token}`);
            }
            else {
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
                }
                catch (error) {
                    reject(error);
                }
            };
            xhr.send(formData);
        });
    },
    async transcribeAudio(input) {
        const formData = new FormData();
        formData.append("file", input.file, "voice.webm");
        formData.append("language", input.language);
        return request("/voice/transcribe", {
            method: "POST",
            headers: buildHeaders(input.token),
            body: formData
        }, voiceTranscriptionSchema);
    }
};
