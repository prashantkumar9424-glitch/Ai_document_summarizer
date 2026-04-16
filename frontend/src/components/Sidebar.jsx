export default function Sidebar({ activeTab, onTabChange }) {
  const tabs = [
    { id: "upload", label: "Document Upload", icon: "📄", color: "from-blue-500 to-cyan-500" },
    { id: "image", label: "Image Analysis", icon: "🖼️", color: "from-purple-500 to-pink-500" },
    { id: "chat", label: "Chat Assistant", icon: "💬", color: "from-green-500 to-emerald-500" },
    { id: "history", label: "History", icon: "🕘", color: "from-orange-500 to-red-500" }
  ];

  return (
    <div className="w-full lg:w-72 rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl p-6 shadow-2xl h-fit lg:sticky lg:top-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          ContentAI
        </h1>
        <p className="text-xs text-gray-400 mt-1">Smart Document Assistant</p>
      </div>

      <nav className="space-y-2 mb-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all font-medium text-sm group ${
              activeTab === tab.id
                ? `bg-gradient-to-r ${tab.color} text-white shadow-lg shadow-blue-500/50`
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="mr-3 text-lg group-hover:scale-125 transition-transform">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="space-y-4 pt-6 border-t border-white/10">
        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
          <h3 className="text-sm font-bold text-blue-300 mb-3">✨ Features</h3>
          <ul className="text-xs text-gray-300 space-y-2">
            <li className="flex items-center"><span className="mr-2">🚀</span>Instant Summarization</li>
            <li className="flex items-center"><span className="mr-2">🎯</span>OCR & Analysis</li>
            <li className="flex items-center"><span className="mr-2">🧠</span>Smart Chat</li>
            <li className="flex items-center"><span className="mr-2">💾</span>Memory Persistence</li>
          </ul>
        </div>

        <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10">
          <p className="text-xs text-amber-200">
            <strong>💡 Tip:</strong> Make sure backend runs on localhost:5000
          </p>
        </div>
      </div>
    </div>
  );
}