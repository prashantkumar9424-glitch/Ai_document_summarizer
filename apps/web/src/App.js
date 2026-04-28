import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useChat } from "./hooks/useChat";
import { Sidebar } from "./components/layout/Sidebar";
import { MessageList } from "./components/chat/MessageList";
import { UploadDropzone } from "./components/uploads/UploadDropzone";
import { Composer } from "./components/chat/Composer";
import { InsightPanel } from "./components/context/InsightPanel";
import { AccessGate } from "./components/auth/AccessGate";
export default function App() {
    const auth = useAuth();
    const [guestAccess, setGuestAccess] = useState(false);
    const hasWorkspaceAccess = auth.mode === "authenticated" || guestAccess;
    const chat = useChat({
        token: auth.accessToken,
        mode: auth.mode,
        enabled: hasWorkspaceAccess
    });
    useEffect(() => {
        if (auth.mode === "authenticated") {
            setGuestAccess(false);
        }
    }, [auth.mode]);
    const lastAssistantReply = useMemo(() => [...(chat.activeChat?.messages ?? [])]
        .reverse()
        .find((message) => message.role === "assistant")?.content ?? "", [chat.activeChat]);
    async function handleSignOut() {
        await auth.signOut();
        setGuestAccess(false);
    }
    if (auth.isLoading) {
        return (_jsx("div", { className: "entry-shell", children: _jsxs("div", { className: "entry-panel loading-panel", children: [_jsx("p", { className: "eyebrow", children: "Preparing workspace" }), _jsx("h1", { children: "Checking your session and loading saved conversations." })] }) }));
    }
    if (!hasWorkspaceAccess) {
        return (_jsx(AccessGate, { hasSupabase: auth.hasSupabase, authError: auth.error, onSignIn: auth.signIn, onPhoneSignIn: auth.signInWithPhone, onSignUp: auth.signUp, onPhoneSignUp: auth.signUpWithPhone, onContinueAsGuest: () => {
                auth.clearError();
                setGuestAccess(true);
            } }));
    }
    return (_jsxs("div", { className: "app-shell", children: [_jsx("div", { className: "background-pattern" }), _jsx("div", { className: "ambient ambient-one" }), _jsx("div", { className: "ambient ambient-two" }), _jsx(Sidebar, { chats: chat.chats, activeChatId: chat.activeChat?.id ?? null, mode: auth.mode, userEmail: auth.userEmail, onNewChat: chat.newChat, onClearChat: chat.newChat, onSelectChat: (chatId) => void chat.loadChat(chatId), onOpenAccess: () => {
                    auth.clearError();
                    setGuestAccess(false);
                }, onSignOut: handleSignOut }), _jsxs("main", { className: "workspace", children: [_jsxs("header", { className: "workspace-header panel", children: [_jsxs("div", { className: "workspace-heading", children: [_jsx("p", { className: "eyebrow", children: "Use case workspace" }), _jsx("h2", { children: chat.activeChat?.title ?? "Start a new working session" }), _jsx("p", { className: "workspace-subtitle", children: "Use this app to turn meeting notes, research files, proposals, screenshots, and voice notes into summaries, action lists, and reusable saved sessions." })] }), _jsxs("div", { className: "workspace-auth-cluster", children: [_jsxs("div", { className: "header-badges", children: [_jsx("span", { className: auth.mode === "authenticated" ? "status-badge status-authenticated" : "status-badge status-guest", children: auth.mode === "authenticated" ? "Saved to your account" : "Guest session" }), _jsx("span", { className: "status-badge status-neutral", children: chat.activeChat ? "Working session open" : "Ready for first prompt" })] }), _jsxs("div", { className: "auth-chip", children: [_jsx("strong", { children: auth.mode === "authenticated" ? auth.userEmail ?? "Signed-in workspace" : "Guest workspace" }), _jsx("span", { children: auth.mode === "authenticated"
                                                    ? "Your previous sessions and future chats stay linked to this account."
                                                    : "Guest mode works immediately, but only signed-in users keep session history across visits." })] })] })] }), _jsxs("section", { className: "workspace-metrics", children: [_jsxs("article", { className: "metric-card panel", children: [_jsx("span", { className: "metric-label", children: "Meeting follow-up" }), _jsx("strong", { children: "Turn notes into next steps" }), _jsx("p", { children: "Upload minutes or speak a recap to get decisions, owners, and action items in one place." })] }), _jsxs("article", { className: "metric-card panel", children: [_jsx("span", { className: "metric-label", children: "Document review" }), _jsx("strong", { children: "Ask across files and screenshots" }), _jsx("p", { children: "Compare documents, summarize dense material, and extract the risks or highlights that matter." })] }), _jsxs("article", { className: "metric-card panel", children: [_jsx("span", { className: "metric-label", children: "Session history" }), _jsx("strong", { children: auth.mode === "authenticated" ? "Previous work is saved" : "History unlocks after login" }), _jsx("p", { children: auth.mode === "authenticated"
                                            ? "Open any earlier session from the sidebar to continue where you left off."
                                            : "Sign in when you want your research, summaries, and follow-ups to stay available later." })] })] }), _jsxs("section", { className: "panel workspace-stage", children: [_jsx(UploadDropzone, { onUpload: chat.uploadFile }), chat.uploads.length > 0 && (_jsx("div", { className: "upload-list", children: chat.uploads.map((upload) => (_jsxs("div", { className: "upload-row", children: [_jsx("span", { children: upload.name }), _jsx("div", { className: "upload-progress", children: _jsx("div", { style: { width: `${upload.progress}%` } }) }), _jsx("small", { children: upload.status })] }, upload.id))) })), _jsx(MessageList, { chat: chat.activeChat })] }), _jsx(Composer, { draft: chat.draft, setDraft: chat.setDraft, language: chat.language, setLanguage: chat.setLanguage, isSending: chat.isSending, onSend: chat.send, onTranscript: chat.transcribeVoice, lastAssistantReply: lastAssistantReply }), chat.error ? _jsx("div", { className: "error-banner", children: chat.error }) : null] }), _jsx(InsightPanel, { attachments: chat.activeAttachments, memoryStatus: chat.memoryStatus, memoryBank: chat.memoryBank, isLoadingMemory: chat.isLoadingMemory, memoryError: chat.memoryError, lastHistoryRefreshAt: chat.lastMemoryRefreshAt, onRefreshMemory: () => void chat.refreshMemoryBank() })] }));
}
