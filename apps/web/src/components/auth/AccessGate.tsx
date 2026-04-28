import { useState, type FormEvent } from "react";

type AccessGateProps = {
  hasSupabase: boolean;
  authError: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onPhoneSignIn: (phone: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<string>;
  onPhoneSignUp: (phone: string, password: string) => Promise<string>;
  onContinueAsGuest: () => void;
};

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

export function AccessGate(props: AccessGateProps) {
  const [intent, setIntent] = useState<"signin" | "signup">("signin");
  const [credentialType, setCredentialType] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  async function submit(event?: FormEvent<HTMLFormElement>) {
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
      } else if (intent === "signin") {
        await props.onPhoneSignIn(identifier, password);
      } else if (credentialType === "email") {
        const notice = await props.onSignUp(identifier, password);
        setLocalNotice(notice);
      } else {
        const notice = await props.onPhoneSignUp(identifier, password);
        setLocalNotice(notice);
      }
      setPassword("");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="entry-shell">
      <div className="background-pattern" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="entry-panel entry-hero">
        <p className="eyebrow">AI Ops for Documents & Visual Data</p>
        <h1>Start with a real task, then keep the useful sessions.</h1>
        <p className="entry-copy">
          This application is built for practical work: summarize uploaded files, capture microphone notes, and revisit
          previous sessions when you sign in with your own account.
        </p>

        <div className="entry-card-grid">
          {useCases.map((item) => (
            <article key={item.title} className="entry-card">
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="entry-panel auth-card">
        <p className="eyebrow">Access</p>
        <h2>Log in, sign up, or continue as a guest.</h2>
        <p className="muted">Signed-in users get unique history across visits. Guest mode starts faster but does not keep saved sessions.</p>
        <p className="muted">If your Supabase project requires email confirmation, confirm the email first and then log in.</p>

        {props.hasSupabase ? (
          <>
            <form onSubmit={(event) => void submit(event)}>
              <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
                <button
                  type="button"
                  className={intent === "signin" ? "auth-tab auth-tab-active" : "auth-tab"}
                  onClick={() => setIntent("signin")}
                >
                  Log in
                </button>
                <button
                  type="button"
                  className={intent === "signup" ? "auth-tab auth-tab-active" : "auth-tab"}
                  onClick={() => setIntent("signup")}
                >
                  Sign up
                </button>
              </div>

              <div className="auth-tabs" role="tablist" aria-label="Credential type">
                <button
                  type="button"
                  className={credentialType === "email" ? "auth-tab auth-tab-active" : "auth-tab"}
                  onClick={() => setCredentialType("email")}
                >
                  Email
                </button>
                <button
                  type="button"
                  className={credentialType === "phone" ? "auth-tab auth-tab-active" : "auth-tab"}
                  onClick={() => setCredentialType("phone")}
                >
                  Phone
                </button>
              </div>

              <label className="field">
                <span>{credentialType === "email" ? "Email" : "Phone number"}</span>
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  type={credentialType === "email" ? "email" : "tel"}
                  placeholder={credentialType === "email" ? "you@example.com" : "+91XXXXXXXXXX"}
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Enter your password"
                />
              </label>

              {intent === "signup" && credentialType === "email" ? (
                <p className="notice-text">After signup, a confirmation email will be sent to your inbox. Confirm it before logging in.</p>
              ) : null}

              <div className="entry-actions">
                <button className="button" disabled={busy} type="submit">
                  {busy ? "Working..." : intent === "signin" ? "Open my workspace" : "Create account"}
                </button>
                <button className="button button-secondary" type="button" onClick={props.onContinueAsGuest}>
                  Continue as guest
                </button>
              </div>

              {localNotice ? <p className="notice-text">{localNotice}</p> : null}
              {(localError || props.authError) && <p className="error-text">{localError ?? props.authError}</p>}
            </form>
          </>
        ) : (
          <>
            <div className="empty-card">
              <p>Authentication is not configured yet.</p>
              <span>Add the Supabase web environment variables, then return here to enable login and signup.</span>
            </div>
            <div className="entry-actions">
              <button className="button" onClick={props.onContinueAsGuest}>
                Continue as guest
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
