import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
export function AuthPanel(props) {
    const [busy, setBusy] = useState(false);
    async function handleSignOut() {
        setBusy(true);
        try {
            await props.onSignOut();
        }
        finally {
            setBusy(false);
        }
    }
    if (props.mode === "authenticated") {
        return (_jsxs("section", { className: "panel auth-panel", children: [_jsxs("div", { className: "badge-row auth-topline", children: [_jsx("span", { className: "status-badge status-authenticated", children: "Signed in" }), _jsx("span", { className: "mini-glass-tag", children: "History enabled" })] }), _jsx("p", { className: "panel-title", children: props.userEmail }), _jsx("p", { className: "muted", children: "This account can reopen previous sessions and keep new chats saved automatically." }), _jsx("div", { className: "auth-actions", children: _jsx("button", { className: "button button-secondary", disabled: busy, onClick: () => void handleSignOut(), children: busy ? "Signing out..." : "Log out" }) })] }));
    }
    return (_jsxs("section", { className: "panel auth-panel", children: [_jsxs("div", { className: "badge-row auth-topline", children: [_jsx("span", { className: "status-badge status-guest", children: "Guest mode" }), _jsx("span", { className: "mini-glass-tag", children: "Temporary session" })] }), _jsx("p", { className: "panel-title", children: "Guest access is active" }), _jsx("p", { className: "muted", children: "Use the access screen whenever you want to sign in and keep future sessions attached to your account." }), _jsx("div", { className: "auth-actions", children: _jsx("button", { className: "button button-secondary", onClick: props.onOpenAccess, children: "Login or sign up" }) })] }));
}
