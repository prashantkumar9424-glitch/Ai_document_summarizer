import type { ChatSummary } from "@platform/shared";
import { AuthPanel } from "../auth/AuthPanel";

type SidebarProps = {
  chats: ChatSummary[];
  activeChatId: string | null;
  mode: "guest" | "authenticated";
  userEmail: string | null;
  onNewChat: () => void;
  onClearChat: () => void;
  onSelectChat: (chatId: string) => void;
  onOpenAccess: () => void;
  onSignOut: () => Promise<void>;
};

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <p className="eyebrow">AI Ops for Documents & Visual Data</p>
        <h1>Summaries, answers, and saved work from one shared workspace.</h1>
        <p className="brand-copy">
          Bring in documents, screenshots, and microphone notes. Then keep the useful sessions attached to the right user account.
        </p>
        <div className="brand-stats">
          <div className="brand-stat">
            <strong>{props.mode === "authenticated" ? "Saved" : "Guest"}</strong>
            <span>access mode</span>
          </div>
          <div className="brand-stat">
            <strong>{props.chats.length}</strong>
            <span>{props.mode === "authenticated" ? "saved sessions" : "current sessions"}</span>
          </div>
        </div>
        <div className="brand-actions">
          <button className="button" onClick={props.onNewChat}>
            New session
          </button>
          <button className="button button-secondary" onClick={props.onClearChat}>
            Clear chat
          </button>
        </div>
      </div>

      <AuthPanel mode={props.mode} userEmail={props.userEmail} onOpenAccess={props.onOpenAccess} onSignOut={props.onSignOut} />

      <section className="panel history-panel">
        <div className="panel-header">
          <h2>{props.mode === "authenticated" ? "Saved sessions" : "Guest sessions"}</h2>
          <span className="muted">{props.mode === "authenticated" ? "Account history" : "Temporary access"}</span>
        </div>
        <div className="history-list">
          {props.chats.length === 0 ? (
            <div className="empty-card">
              <p>No sessions yet.</p>
              <span>Start with a prompt, a file upload, or a quick microphone note.</span>
            </div>
          ) : (
            props.chats.map((chat) => (
              <button
                key={chat.id}
                className={chat.id === props.activeChatId ? "history-item history-item-active" : "history-item"}
                onClick={() => props.onSelectChat(chat.id)}
              >
                <span>{chat.title}</span>
                <small>
                  {chat.attachmentCount} file{chat.attachmentCount === 1 ? "" : "s"} •{" "}
                  {new Date(chat.lastMessageAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </small>
              </button>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}
