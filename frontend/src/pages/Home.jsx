import { useState } from "react";
import Sidebar from "../components/Sidebar";
import UploadCard from "../components/UploadCard";
import ImageUpload from "../components/ImageUpload";
import ChatBox from "../components/ChatBox";
import History from "../components/History";
import Summary from "../components/Summary";

export default function Home() {
  const [activeTab, setActiveTab] = useState("upload");
  const [summary, setSummary] = useState("");
  const [imageSummary, setImageSummary] = useState("");

  const renderContent = () => {
    switch (activeTab) {
      case "upload":
        return <UploadCard onSummary={setSummary} />;
      case "image":
        return <ImageUpload onSummary={setImageSummary} />;
      case "chat":
        return <ChatBox />;
      case "history":
        return <History />;
      default:
        return <UploadCard onSummary={setSummary} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-950 dark:via-purple-950 dark:to-slate-950">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row gap-6 p-4 lg:p-8">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1">
          <div className="space-y-6">
            {/* Header Section */}
            <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-8 shadow-2xl">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 border border-blue-400/30">
                    <p className="text-xs font-semibold text-blue-300">AI-POWERED DOCUMENT ASSISTANT</p>
                  </div>
                  <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-white mb-3">
                    Smart Content <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Analysis</span>
                  </h1>
                  <p className="text-lg text-gray-300 leading-relaxed max-w-2xl">
                    Upload documents & images. Get instant AI-powered summaries. Chat with your content using advanced memory and context awareness.
                  </p>
                </div>
                <div className="flex items-center gap-4 px-6 py-4 rounded-xl bg-gradient-to-br from-green-400/20 to-emerald-400/20 border border-green-400/30">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="text-sm font-bold text-green-300">Status</p>
                    <p className="text-xs text-green-200">Backend Ready</p>
                  </div>
                </div>
              </div>
            </section>

            {renderContent()}

            {(summary || imageSummary) && (
              <Summary
                documentSummary={summary}
                imageSummary={imageSummary}
              />
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}