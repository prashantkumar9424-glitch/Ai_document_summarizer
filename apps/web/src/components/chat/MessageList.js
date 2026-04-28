import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function MessageList({ chat }) {
    if (!chat || chat.messages.length === 0) {
        return (_jsxs("div", { className: "empty-state", children: [_jsx("p", { children: "Use this space for actual work sessions." }), _jsx("span", { children: "Try a meeting summary, a document Q&A, a follow-up email draft, or a quick transcription from your microphone." })] }));
    }
    return (_jsx("div", { className: "message-list", children: chat.messages.map((message) => (_jsxs("article", { className: message.role === "assistant" ? "message message-assistant" : "message message-user", children: [_jsxs("div", { className: "message-meta", children: [_jsx("strong", { children: message.role === "assistant" ? "Assistant" : "You" }), _jsx("span", { children: new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })] }), _jsx("p", { children: message.content })] }, message.id))) }));
}
