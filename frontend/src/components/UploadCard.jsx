import { useRef, useState } from "react";
import { api } from "../services/api";
import { useToast } from "./Toast";

export default function UploadCard({ onSummary }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  const handleFile = async (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PDF, DOCX, or TXT file.");
      addToast("❌ Invalid file type. Supported: PDF, DOCX, TXT", "error");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB.");
      addToast("❌ File too large. Maximum size: 10MB", "error");
      return;
    }

    setLoading(true);
    setError("");
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 30, 90));
      }, 300);

      const response = await api.summarizeDocument(formData);
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      onSummary(response.summary);
      addToast(`✅ Document summarized successfully!`, "success");
      
      // Reset after success
      setTimeout(() => {
        setUploadProgress(0);
      }, 500);

    } catch (err) {
      const errorMessage = err.message || "Failed to process document";
      setError(errorMessage);
      
      if (errorMessage.includes("Network error")) {
        addToast("❌ Backend server is not running", "error", 7000);
      } else if (errorMessage.includes("extract")) {
        addToast("⚠️ Could not extract text. Try image upload instead.", "warning", 7000);
      } else {
        addToast(`❌ ${errorMessage}`, "error", 7000);
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
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
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-8 shadow-2xl transition-all animate-fade-in">
      <div className="mb-8">
        <div className="inline-block px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30 mb-4">
          <p className="text-xs font-bold text-blue-300 tracking-widest">📄 DOCUMENT PROCESSING</p>
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">
          Upload & Summarize
        </h2>
        <p className="text-gray-400 text-sm">
          Get instant AI-powered summaries with intelligent text extraction
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer group ${
          dragActive
            ? "border-blue-400 bg-blue-500/20 scale-[1.02]"
            : "border-white/20 hover:border-white/40 hover:bg-white/5"
        } ${loading ? "opacity-60 pointer-events-none" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="space-y-5">
          <div className="text-6xl group-hover:scale-125 transition-transform duration-300">📄</div>

          <div>
            <p className="text-white mb-2 font-semibold text-lg">
              Drag and drop, or{" "}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-400 hover:text-blue-300 font-bold underline transition-colors"
                disabled={loading}
              >
                click to browse
              </button>
            </p>
            <p className="text-sm text-gray-500">
              PDF, DOCX, TXT • Up to 10MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
            disabled={loading}
            className="hidden"
          />
        </div>
      </div>

      {loading && (
        <div className="mt-6 space-y-3 animate-fade-in">
          <div className="p-4 flex items-center gap-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-white/10">
            <div className="loader h-5 w-5"></div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Processing your document...</p>
              <p className="text-xs text-gray-400 mt-1">Extracting and analyzing content</p>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg overflow-hidden border border-white/10">
            <div
              className="h-1 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-5 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 rounded-xl animate-fade-in">
          <p className="text-sm text-red-300 font-semibold mb-3">⚠️ Processing Issue</p>
          <p className="text-sm text-red-200 mb-4">{error}</p>
          
          <div className="space-y-2 text-xs text-red-200/80">
            {error.includes("extract") && (
              <>
                <p className="font-semibold">💡 This file might be image-based or scanned:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Try using the <strong>Image Analysis</strong> feature instead</li>
                  <li>Or convert your PDF to images first</li>
                </ul>
              </>
            )}
            {error.includes("Network error") && (
              <>
                <p className="font-semibold">💡 Backend server is offline:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Make sure backend is running: <code className="bg-red-900/50 px-2 py-0.5 rounded">npm start</code></li>
                  <li>Check that it's on localhost:5000</li>
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
