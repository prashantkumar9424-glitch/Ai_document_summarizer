import { useRef, useState } from "react";
import { httpApi } from "../services/httpApi";

export default function ImageUploadPanel({ onSummary }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPEG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await httpApi.summarizeImage(formData);
      onSummary(response);
    } catch (err) {
      setError(err.message || "Failed to process image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Image Summarizer</p>
          <h2 className="panel-title">Analyze screenshots, posters, receipts, and slides.</h2>
        </div>
        <span className="status-chip">Vision + OCR</span>
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
        <div className="dropzone-icon">IMG</div>
        <p className="dropzone-title">Drop an image for analysis</p>
        <p className="dropzone-copy">
          The backend uses OCR plus Groq vision when available, then saves the result for the
          chatbot.
        </p>

        <button
          type="button"
          className="primary-button"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose image
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="visually-hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </div>

      <div className="panel-meta">
        <span>Best results come from readable screenshots and clean scans.</span>
        <span>Large files may use OCR-only fallback.</span>
      </div>

      {loading && (
        <div className="loading-row">
          <span className="spinner" />
          <span>Inspecting the image and preparing highlights...</span>
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
