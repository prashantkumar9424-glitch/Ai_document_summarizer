export default function StudioSidebar({ activeTab, onTabChange }) {
  const tabs = [
    { id: "upload", label: "Documents", hint: "PDF, DOCX, TXT" },
    { id: "image", label: "Images", hint: "Screenshots and photos" },
    { id: "chat", label: "Chat", hint: "Ask follow-up questions" },
    { id: "history", label: "History", hint: "Recent activity" }
  ];

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <p className="eyebrow">Hindsight + Groq</p>
        <h1>AI Content Studio</h1>
        <p className="brand-copy">
          Summarize documents, inspect images, and chat against saved context from one workspace.
        </p>
      </div>

      <nav className="nav-stack">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`nav-button ${activeTab === tab.id ? "is-active" : ""}`}
          >
            <span className="nav-label">{tab.label}</span>
            <span className="nav-hint">{tab.hint}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-note">
        <span className="status-chip">Session memory</span>
        <p>
          Hindsight keeps long-term recall when configured, while the app keeps a local working
          memory so chat still feels grounded during development.
        </p>
      </div>
    </aside>
  );
}
