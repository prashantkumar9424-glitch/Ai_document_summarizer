import { useRef, useState } from "react";
import { httpApi } from "../services/httpApi";

export default function DocumentUploadPanel({ onSummary }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await httpApi.summarizeDocument(formData);
      onSummary(response);
    } catch (err) {
      setError(err.message || "Failed to process document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Document Summarizer</p>
          <h2 className="panel-title">Upload a file and get a structured AI brief.</h2>
        </div>
        <span className="status-chip">Groq summary</span>
      </div>

      <div
        className={`dropzone ${dragActive ? "is-active" : ""}`}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragActive(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
      >
        <div className="dropzone-icon">DOC</div>
        <p className="dropzone-title">Drag a document here</p>
        <p className="dropzone-copy">
          Supports PDF, DOCX, and TXT up to 10MB. The assistant creates a concise summary and
          stores it for follow-up chat.
        </p>

        <button
          type="button"
          className="primary-button"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose document
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="visually-hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </div>

      <div className="panel-meta">
        <span>Best for reports, notes, contracts, and articles.</span>
        <span>Memory ready for chat follow-ups.</span>
      </div>

      {loading && (
        <div className="loading-row">
          <span className="spinner" />
          <span>Reading your document and building the summary...</span>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <p>{error}</p>
        </div>
      )}
    </section>
  );
}
