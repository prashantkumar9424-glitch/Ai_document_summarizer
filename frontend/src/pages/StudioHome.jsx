import { useState } from "react";
import AssistantChatPanel from "../components/AssistantChatPanel";
import DocumentUploadPanel from "../components/DocumentUploadPanel";
import ImageUploadPanel from "../components/ImageUploadPanel";
import ResultSummaryPanel from "../components/ResultSummaryPanel";
import SessionActivityFeed from "../components/SessionActivityFeed";
import StudioSidebar from "../components/StudioSidebar";

export default function StudioHome() {
  const [activeTab, setActiveTab] = useState("upload");
  const [documentSummary, setDocumentSummary] = useState(null);
  const [imageSummary, setImageSummary] = useState(null);
  const [activity, setActivity] = useState([]);

  const addActivity = ({ kind, title, detail, tab }) => {
    setActivity((current) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          kind,
          title,
          detail,
          tab,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })
        },
        ...current
      ].slice(0, 12)
    );
  };

  const handleDocumentSummary = (result) => {
    setDocumentSummary(result);
    setActiveTab("chat");
    addActivity({
      kind: "document",
      title: result.filename || "Document uploaded",
      detail: result.summary,
      tab: "upload"
    });
  };

  const handleImageSummary = (result) => {
    setImageSummary(result);
    setActiveTab("chat");
    addActivity({
      kind: "image",
      title: result.filename || "Image uploaded",
      detail: result.summary,
      tab: "image"
    });
  };

  const hasContext = Boolean(documentSummary || imageSummary);

  const renderPrimaryPanel = () => {
    switch (activeTab) {
      case "upload":
        return <DocumentUploadPanel onSummary={handleDocumentSummary} />;
      case "image":
        return <ImageUploadPanel onSummary={handleImageSummary} />;
      case "chat":
        return <AssistantChatPanel hasContext={hasContext} onActivity={addActivity} />;
      case "history":
        return <SessionActivityFeed activities={activity} onJump={setActiveTab} expanded />;
      default:
        return <DocumentUploadPanel onSummary={handleDocumentSummary} />;
    }
  };

  return (
    <div className="app-shell">
      <StudioSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="app-main">
        <section className="hero">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>Turn raw files into quick answers.</h2>
            <p className="hero-copy">
              Upload a document or image, generate a summary with Groq, and keep the context ready
              for follow-up chat with Hindsight-backed memory.
            </p>
            <div className="hero-badges">
              <span className="status-chip">Document summaries</span>
              <span className="status-chip">Image analysis</span>
              <span className="status-chip">Chat follow-ups</span>
            </div>
          </div>

          <div className="hero-panel">
            <div className="metric-card">
              <span className="metric-value">{activity.length}</span>
              <span className="metric-label">Recent actions</span>
            </div>
            <div className="metric-card">
              <span className="metric-value">{hasContext ? "Ready" : "Idle"}</span>
              <span className="metric-label">Chat context</span>
            </div>
            <div className="metric-card">
              <span className="metric-value">{documentSummary ? "1" : "0"}/{imageSummary ? "1" : "0"}</span>
              <span className="metric-label">Doc / image assets</span>
            </div>
          </div>
        </section>

        <section className="workspace-grid">
          <div className="workspace-primary">{renderPrimaryPanel()}</div>
          <div className="workspace-secondary">
            <ResultSummaryPanel
              documentSummary={documentSummary}
              imageSummary={imageSummary}
            />
            {activeTab !== "history" && (
              <SessionActivityFeed activities={activity} onJump={setActiveTab} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
