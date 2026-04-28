import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
const useCases = [
    {
        title: "Meeting follow-up",
        body: "Turn minutes or spoken notes into decisions, owners, and action items."
    },
    {
        title: "Proposal and document review",
        body: "Upload files and ask for summaries, objections, risks, or response drafts."
    },
    {
        title: "Research workspace",
        body: "Keep related questions, file context, and previous sessions connected for one user."
    }
];
export function AccessGate(props) {
    const [intent, setIntent] = useState("signin");
    const [credentialType, setCredentialType] = useState("email");
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [localError, setLocalError] = useState(null);
    const [localNotice, setLocalNotice] = useState(null);
    async function submit(event) {
        event?.preventDefault();
        if (!identifier.trim()) {
            setLocalNotice(null);
            setLocalError(credentialType === "email" ? "Enter your email address." : "Enter your phone number.");
            return;
        }
        if (!password.trim()) {
            setLocalNotice(null);
            setLocalError("Enter your password.");
            return;
        }
        setBusy(true);
        setLocalError(null);
        setLocalNotice(null);
        try {
            if (intent === "signin" && credentialType === "email") {
                await props.onSignIn(identifier, password);
            }
            else if (intent === "signin") {
                await props.onPhoneSignIn(identifier, password);
            }
            else if (credentialType === "email") {
                const notice = await props.onSignUp(identifier, password);
                setLocalNotice(notice);
            }
            else {
                const notice = await props.onPhoneSignUp(identifier, password);
                setLocalNotice(notice);
            }
            setPassword("");
        }
        catch (error) {
            setLocalError(error instanceof Error ? error.message : "Authentication failed.");
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs("div", { className: "entry-shell", children: [_jsx("div", { className: "background-pattern" }), _jsx("div", { className: "ambient ambient-one" }), _jsx("div", { className: "ambient ambient-two" }), _jsxs("section", { className: "entry-panel entry-hero", children: [_jsx("p", { className: "eyebrow", children: "AI Ops for Documents & Visual Data" }), _jsx("h1", { children: "Start with a real task, then keep the useful sessions." }), _jsx("p", { className: "entry-copy", children: "This application is built for practical work: summarize uploaded files, capture microphone notes, and revisit previous sessions when you sign in with your own account." }), _jsx("div", { className: "entry-card-grid", children: useCases.map((item) => (_jsxs("article", { className: "entry-card", children: [_jsx("strong", { children: item.title }), _jsx("p", { children: item.body })] }, item.title))) })] }), _jsxs("section", { className: "entry-panel auth-card", children: [_jsx("p", { className: "eyebrow", children: "Access" }), _jsx("h2", { children: "Log in, sign up, or continue as a guest." }), _jsx("p", { className: "muted", children: "Signed-in users get unique history across visits. Guest mode starts faster but does not keep saved sessions." }), _jsx("p", { className: "muted", children: "If your Supabase project requires email confirmation, confirm the email first and then log in." }), props.hasSupabase ? (_jsxs(_Fragment, { children: [_jsxs("form", { onSubmit: (event) => void submit(event), children: [_jsxs("div", { className: "auth-tabs", role: "tablist", "aria-label": "Authentication mode", children: [_jsx("button", { type: "button", className: intent === "signin" ? "auth-tab auth-tab-active" : "auth-tab", onClick: () => setIntent("signin"), children: "Log in" }), _jsx("button", { type: "button", className: intent === "signup" ? "auth-tab auth-tab-active" : "auth-tab", onClick: () => setIntent("signup"), children: "Sign up" })] }), _jsxs("div", { className: "auth-tabs", role: "tablist", "aria-label": "Credential type", children: [_jsx("button", { type: "button", className: credentialType === "email" ? "auth-tab auth-tab-active" : "auth-tab", onClick: () => setCredentialType("email"), children: "Email" }), _jsx("button", { type: "button", className: credentialType === "phone" ? "auth-tab auth-tab-active" : "auth-tab", onClick: () => setCredentialType("phone"), children: "Phone" })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: credentialType === "email" ? "Email" : "Phone number" }), _jsx("input", { value: identifier, onChange: (event) => setIdentifier(event.target.value), type: credentialType === "email" ? "email" : "tel", placeholder: credentialType === "email" ? "you@example.com" : "+91XXXXXXXXXX" })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "Password" }), _jsx("input", { value: password, onChange: (event) => setPassword(event.target.value), type: "password", placeholder: "Enter your password" })] }), intent === "signup" && credentialType === "email" ? (_jsx("p", { className: "notice-text", children: "After signup, a confirmation email will be sent to your inbox. Confirm it before logging in." })) : null, _jsxs("div", { className: "entry-actions", children: [_jsx("button", { className: "button", disabled: busy, type: "submit", children: busy ? "Working..." : intent === "signin" ? "Open my workspace" : "Create account" }), _jsx("button", { className: "button button-secondary", type: "button", onClick: props.onContinueAsGuest, children: "Continue as guest" })] }), localNotice ? _jsx("p", { className: "notice-text", children: localNotice }) : null, (localError || props.authError) && _jsx("p", { className: "error-text", children: localError ?? props.authError })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "empty-card", children: [_jsx("p", { children: "Authentication is not configured yet." }), _jsx("span", { children: "Add the Supabase web environment variables, then return here to enable login and signup." })] }), _jsx("div", { className: "entry-actions", children: _jsx("button", { className: "button", onClick: props.onContinueAsGuest, children: "Continue as guest" }) })] }))] })] }));
}
