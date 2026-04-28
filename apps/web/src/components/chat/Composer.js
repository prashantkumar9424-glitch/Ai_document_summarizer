import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VoiceControls } from "../voice/VoiceControls";
export function Composer(props) {
    function handleKeyDown(event) {
        if (event.key !== "Enter" || event.shiftKey) {
            return;
        }
        event.preventDefault();
        if (!props.isSending) {
            void props.onSend(false);
        }
    }
    return (_jsxs("section", { className: "composer-shell panel", children: [_jsx("textarea", { value: props.draft, onChange: (event) => props.setDraft(event.target.value), onKeyDown: handleKeyDown, placeholder: "Ask for a summary, action plan, reply draft, issue breakdown, risk review, or follow-up message.", rows: 5 }), _jsx("p", { className: "composer-hint", children: "Press Enter to send. Press Shift+Enter for a new line." }), _jsxs("div", { className: "composer-actions", children: [_jsx(VoiceControls, { language: props.language, onLanguageChange: props.setLanguage, onTranscript: props.onTranscript, speakText: props.lastAssistantReply }), _jsxs("div", { className: "composer-buttons", children: [_jsx("button", { className: "button button-secondary", onClick: () => void props.onSend(true), children: "Fresh response" }), _jsx("button", { className: "button", disabled: props.isSending, onClick: () => void props.onSend(false), children: props.isSending ? "Working..." : "Send" })] })] })] }));
}
