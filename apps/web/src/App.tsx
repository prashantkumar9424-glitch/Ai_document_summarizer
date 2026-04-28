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

  const lastAssistantReply = useMemo(
    () =>
      [...(chat.activeChat?.messages ?? [])]
        .reverse()
        .find((message) => message.role === "assistant")?.content ?? "",
    [chat.activeChat]
  );

  async function handleSignOut() {
    await auth.signOut();
    setGuestAccess(false);
  }

  if (auth.isLoading) {
    return (
      <div className="entry-shell">
        <div className="entry-panel loading-panel">
          <p className="eyebrow">Preparing workspace</p>
          <h1>Checking your session and loading saved conversations.</h1>
        </div>
      </div>
    );
  }

  if (!hasWorkspaceAccess) {
    return (
      <AccessGate
        hasSupabase={auth.hasSupabase}
        authError={auth.error}
        onSignIn={auth.signIn}
        onPhoneSignIn={auth.signInWithPhone}
        onSignUp={auth.signUp}
        onPhoneSignUp={auth.signUpWithPhone}
        onContinueAsGuest={() => {
          auth.clearError();
          setGuestAccess(true);
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="background-pattern" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <Sidebar
        chats={chat.chats}
        activeChatId={chat.activeChat?.id ?? null}
        mode={auth.mode}
        userEmail={auth.userEmail}
        onNewChat={chat.newChat}
        onClearChat={chat.newChat}
        onSelectChat={(chatId) => void chat.loadChat(chatId)}
        onOpenAccess={() => {
          auth.clearError();
          setGuestAccess(false);
        }}
        onSignOut={handleSignOut}
      />

      <main className="workspace">
        <header className="workspace-header panel">
          <div className="workspace-heading">
            <p className="eyebrow">Use case workspace</p>
            <h2>{chat.activeChat?.title ?? "Start a new working session"}</h2>
            <p className="workspace-subtitle">
              Use this app to turn meeting notes, research files, proposals, screenshots, and voice notes into summaries,
              action lists, and reusable saved sessions.
            </p>
          </div>

          <div className="workspace-auth-cluster">
            <div className="header-badges">
              <span className={auth.mode === "authenticated" ? "status-badge status-authenticated" : "status-badge status-guest"}>
                {auth.mode === "authenticated" ? "Saved to your account" : "Guest session"}
              </span>
              <span className="status-badge status-neutral">
                {chat.activeChat ? "Working session open" : "Ready for first prompt"}
              </span>
            </div>
            <div className="auth-chip">
              <strong>{auth.mode === "authenticated" ? auth.userEmail ?? "Signed-in workspace" : "Guest workspace"}</strong>
              <span>
                {auth.mode === "authenticated"
                  ? "Your previous sessions and future chats stay linked to this account."
                  : "Guest mode works immediately, but only signed-in users keep session history across visits."}
              </span>
            </div>
          </div>
        </header>

        <section className="workspace-metrics">
          <article className="metric-card panel">
            <span className="metric-label">Meeting follow-up</span>
            <strong>Turn notes into next steps</strong>
            <p>Upload minutes or speak a recap to get decisions, owners, and action items in one place.</p>
          </article>
          <article className="metric-card panel">
            <span className="metric-label">Document review</span>
            <strong>Ask across files and screenshots</strong>
            <p>Compare documents, summarize dense material, and extract the risks or highlights that matter.</p>
          </article>
          <article className="metric-card panel">
            <span className="metric-label">Session history</span>
            <strong>{auth.mode === "authenticated" ? "Previous work is saved" : "History unlocks after login"}</strong>
            <p>
              {auth.mode === "authenticated"
                ? "Open any earlier session from the sidebar to continue where you left off."
                : "Sign in when you want your research, summaries, and follow-ups to stay available later."}
            </p>
          </article>
        </section>

        <section className="panel workspace-stage">
          <UploadDropzone onUpload={chat.uploadFile} />
          {chat.uploads.length > 0 && (
            <div className="upload-list">
              {chat.uploads.map((upload) => (
                <div key={upload.id} className="upload-row">
                  <span>{upload.name}</span>
                  <div className="upload-progress">
                    <div style={{ width: `${upload.progress}%` }} />
                  </div>
                  <small>{upload.status}</small>
                </div>
              ))}
            </div>
          )}
          <MessageList chat={chat.activeChat} />
        </section>

        <Composer
          draft={chat.draft}
          setDraft={chat.setDraft}
          language={chat.language}
          setLanguage={chat.setLanguage}
          isSending={chat.isSending}
          onSend={chat.send}
          onTranscript={chat.transcribeVoice}
          lastAssistantReply={lastAssistantReply}
        />

        {chat.error ? <div className="error-banner">{chat.error}</div> : null}
      </main>

      <InsightPanel
        attachments={chat.activeAttachments}
        memoryStatus={chat.memoryStatus}
        memoryBank={chat.memoryBank}
        isLoadingMemory={chat.isLoadingMemory}
        memoryError={chat.memoryError}
        lastHistoryRefreshAt={chat.lastMemoryRefreshAt}
        onRefreshMemory={() => void chat.refreshMemoryBank()}
      />
    </div>
  );
}
