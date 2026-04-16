function kindLabel(kind) {
  if (kind === "document") return "Document";
  if (kind === "image") return "Image";
  return "Chat";
}

export default function SessionActivityFeed({ activities, onJump, expanded = false }) {
  return (
    <section className={`panel ${expanded ? "" : "panel-tight"}`}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Recent Activity</p>
          <h2 className="panel-title">
            {expanded ? "Session timeline and quick return points." : "What happened in this session."}
          </h2>
        </div>
        {!expanded && (
          <button type="button" className="ghost-button" onClick={() => onJump?.("history")}>
            Open history
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="empty-state empty-state-small">
          <div className="empty-state-icon">LOG</div>
          <h3>No activity yet</h3>
          <p>Summaries and chat highlights will appear here as you work.</p>
        </div>
      ) : (
        <div className="activity-list">
          {activities.map((item) => (
            <article className="activity-card" key={item.id}>
              <div className="activity-topline">
                <span className="status-chip">{kindLabel(item.kind)}</span>
                <span className="activity-time">{item.timestamp}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
              <button type="button" className="link-button" onClick={() => onJump?.(item.tab || "chat")}>
                Jump back
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
