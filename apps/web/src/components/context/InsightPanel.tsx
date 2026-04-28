import type { Attachment, MemoryBank, MemoryStatus } from "@platform/shared";

type InsightPanelProps = {
  attachments: Attachment[];
  memoryStatus: MemoryStatus | null;
  memoryBank: MemoryBank | null;
  isLoadingMemory: boolean;
  memoryError: string | null;
  lastHistoryRefreshAt: string | null;
  onRefreshMemory: () => void;
};

function formatMemoryDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function InsightPanel({
  attachments,
  memoryStatus,
  memoryBank,
  isLoadingMemory,
  memoryError,
  lastHistoryRefreshAt,
  onRefreshMemory
}: InsightPanelProps) {
  const memoryUnavailable = memoryStatus && (!memoryStatus.enabled || !memoryStatus.reachable || memoryStatus.authFailed);

  return (
    <aside className="context-panel panel">
      <section className="context-section">
        <div className="panel-header">
          <h2>File context</h2>
          <span className="muted">{attachments.length} linked</span>
        </div>
        {attachments.length === 0 ? (
          <div className="empty-card">
            <p>No uploaded context yet.</p>
            <span>Add a document, screenshot, or audio file to generate helpful summaries and extract key details.</span>
          </div>
        ) : (
          attachments.map((attachment) => (
            <article key={attachment.id} className="artifact-card">
              <div className="artifact-header">
                <strong>{attachment.name}</strong>
                <span>{attachment.kind}</span>
              </div>
              <p>{attachment.insight?.summary ?? "Processing complete."}</p>
              {attachment.insight?.decisions?.length ? <small>Decisions: {attachment.insight.decisions.join(" | ")}</small> : null}
              {attachment.insight?.actionItems?.length ? <small>Actions: {attachment.insight.actionItems.join(" | ")}</small> : null}
              {attachment.insight?.risks?.length ? <small>Risks: {attachment.insight.risks.join(" | ")}</small> : null}
            </article>
          ))
        )}
      </section>

      <section className="context-section">
        <div className="panel-header">
          <div>
            <h2>History</h2>
            <span className="muted">
              {isLoadingMemory
                ? "Refreshing stored history for this account or guest session."
                : lastHistoryRefreshAt
                  ? `Last updated ${formatMemoryDate(lastHistoryRefreshAt) ?? "just now"}.`
                  : "Stored history for this account or guest session."}
            </span>
          </div>
          <button className="button panel-inline-button" type="button" disabled={isLoadingMemory} onClick={onRefreshMemory}>
            {isLoadingMemory ? "Refreshing..." : "Refresh history"}
          </button>
        </div>

        {memoryStatus ? (
          <div className="memory-status-row">
            <span
              className={
                memoryStatus.enabled && memoryStatus.reachable && !memoryStatus.authFailed
                  ? "status-badge status-authenticated"
                  : memoryStatus.enabled
                    ? "status-badge status-guest"
                    : "status-badge status-neutral"
              }
            >
              {memoryStatus.enabled && memoryStatus.reachable
                ? memoryStatus.authFailed
                  ? "Hindsight auth failed"
                  : "Hindsight connected"
                : memoryStatus.enabled
                  ? "Hindsight unavailable"
                  : "Hindsight off"}
            </span>
            <span className="mini-glass-tag">{memoryBank?.bankId ?? "No active history yet"}</span>
          </div>
        ) : null}

        {memoryError ? (
          <div className="empty-card">
            <p>History could not be loaded.</p>
            <span>{memoryError}</span>
          </div>
        ) : isLoadingMemory && !memoryBank ? (
          <div className="empty-card">
            <p>Loading history.</p>
            <span>Checking status and fetching recent retained items.</span>
          </div>
        ) : memoryUnavailable ? (
          <div className="empty-card">
            <p>History is not currently available.</p>
            <span>{memoryStatus?.reason ?? "The Hindsight backend could not be reached from the API."}</span>
          </div>
        ) : !memoryBank || memoryBank.items.length === 0 ? (
          <div className="empty-card">
            <p>No history is visible yet.</p>
            <span>Send a few messages and refresh after a short delay. Retention runs in the background.</span>
          </div>
        ) : (
          <div className="memory-bank-list">
            {memoryBank.items.map((memory) => (
              <article key={memory.id} className="memory-entry">
                <div className="memory-entry-header">
                  <strong>{memory.summary}</strong>
                  <span>{formatMemoryDate(memory.timestamp ?? memory.createdAt) ?? "Stored"}</span>
                </div>
                <p>{memory.content}</p>
                <div className="memory-entry-meta">
                  {memory.kind ? <small>Type: {memory.kind}</small> : null}
                  {memory.sourceChatId ? <small>Chat: {memory.sourceChatId}</small> : null}
                  {memory.source ? <small>Source: {memory.source}</small> : null}
                </div>
                {memory.tags.length > 0 ? (
                  <div className="memory-tag-row" aria-label="Memory tags">
                    {memory.tags.map((tag) => (
                      <span key={`${memory.id}-${tag}`} className="memory-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
