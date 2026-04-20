import { useState, useRef } from "react";
import { api } from "../services/api";
import { useToast } from "./Toast";

export default function ImageUpload({ onSummary }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  const handleFile = async (file) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
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

      const response = await api.summarizeImage(formData);
      onSummary(response);
      addToast("Image analyzed successfully.", "success");
    } catch (err) {
      const errorMessage = err.message || "Failed to process image";
      setError(errorMessage);
      addToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-8 shadow-2xl transition-all">
      <div className="mb-8">
        <div className="inline-block px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 mb-3">
          <p className="text-xs font-semibold text-purple-300">IMAGE ANALYSIS</p>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Analyze Images
        </h2>
        <p className="text-gray-400">
          Extract text and get AI-powered visual insights
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer group ${
          dragActive
            ? "border-purple-400 bg-purple-500/20"
            : "border-white/20 hover:border-white/40 hover:bg-white/5"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="space-y-4">
          <div className="text-6xl group-hover:scale-110 transition-transform">🖼️</div>

          <div>
            <p className="text-white mb-2 font-semibold text-lg">
              Drag and drop your image, or{" "}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-purple-400 hover:text-purple-300 font-bold underline"
              >
                browse
              </button>
            </p>
            <p className="text-sm text-gray-400">
              JPEG, PNG, WEBP • Max 5MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={loading}
            className="hidden"
          />
        </div>
      </div>

      {loading && (
        <div className="mt-6 p-4 flex items-center gap-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-white/10">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-400 border-t-white"></div>
          <div>
            <p className="text-white font-semibold">Processing your image...</p>
            <p className="text-xs text-gray-400 mt-0.5">Running OCR and analysis</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 rounded-xl">
          <p className="text-sm text-red-300 font-semibold mb-2">❌ {error}</p>
          <div className="text-xs text-red-200/80 space-y-1">
            {error.includes("Network error") ? (
              <>
                <p>✓ Ensure backend is running: <code className="bg-red-900/50 px-2 py-0.5 rounded">npm start</code></p>
                <p>✓ Check backend is on localhost:5000</p>
              </>
            ) : error.includes("image") ? (
              <p>✓ Supported formats: JPEG, PNG, WEBP</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
