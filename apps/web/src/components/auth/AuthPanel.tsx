import { useState } from "react";

type AuthPanelProps = {
  mode: "guest" | "authenticated";
  userEmail: string | null;
  onOpenAccess: () => void;
  onSignOut: () => Promise<void>;
};

export function AuthPanel(props: AuthPanelProps) {
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await props.onSignOut();
    } finally {
      setBusy(false);
    }
  }

  if (props.mode === "authenticated") {
    return (
      <section className="panel auth-panel">
        <div className="badge-row auth-topline">
          <span className="status-badge status-authenticated">Signed in</span>
          <span className="mini-glass-tag">History enabled</span>
        </div>
        <p className="panel-title">{props.userEmail}</p>
        <p className="muted">This account can reopen previous sessions and keep new chats saved automatically.</p>
        <div className="auth-actions">
          <button className="button button-secondary" disabled={busy} onClick={() => void handleSignOut()}>
            {busy ? "Signing out..." : "Log out"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel auth-panel">
      <div className="badge-row auth-topline">
        <span className="status-badge status-guest">Guest mode</span>
        <span className="mini-glass-tag">Temporary session</span>
      </div>
      <p className="panel-title">Guest access is active</p>
      <p className="muted">Use the access screen whenever you want to sign in and keep future sessions attached to your account.</p>
      <div className="auth-actions">
        <button className="button button-secondary" onClick={props.onOpenAccess}>
          Login or sign up
        </button>
      </div>
    </section>
  );
}
