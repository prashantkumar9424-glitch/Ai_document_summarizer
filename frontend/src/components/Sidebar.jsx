import { useState, useEffect } from "react";

export default function Sidebar({ activeTab, onTabChange }) {
  const tabs = [
    { id: "upload", label: "Document Upload", icon: "📄", color: "from-accent-primary via-accent-hover to-purple-600" },
    { id: "image", label: "Image Analysis", icon: "🖼️", color: "from-accent-primary/80 via-pink-500 to-accent-hover" },
    { id: "chat", label: "Chat Assistant", icon: "💬", color: "from-success via-emerald-500 to-success/80" },
    { id: "history", label: "History", icon: "🕘", color: "from-orange-500 to-orange-400" }
  ];

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      const systemPref = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = saved === 'light' ? false : (saved === 'dark' ? true : systemPref);
      setIsDark(initial);
      document.documentElement.classList.toggle('dark', initial);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  return (
    <div className="w-full lg:w-72 rounded-2xl border border-border-default bg-secondary/90 backdrop-blur-xl p-6 shadow-panel h-fit lg:sticky lg:top-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black bg-gradient-to-r from-accent-primary via-purple-400 to-accent-hover bg-clip-text text-transparent">
          ContentAI
        </h1>
        <p className="text-xs text-secondary mt-1">Smart Document Assistant</p>
      </div>

      <nav className="space-y-2 mb-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium text-sm group shadow-soft hover:shadow-panel ${activeTab === tab.id
              ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
              : "bg-elevated hover:bg-secondary text-secondary hover:text-primary border border-border-subtle"
            }`}
          >
            <span className="mr-3 text-lg group-hover:scale-125 transition-transform">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="space-y-4 pt-6 border-t border-border-subtle">
        <div className="p-4 rounded-xl bg-gradient-to-br from-accent-primary/10 to-accent-hover/10 border border-accent-primary/20">
          <h3 className="text-sm font-bold text-accent-primary mb-3">✨ Features</h3>
          <ul className="text-xs text-secondary space-y-2">
            <li className="flex items-center"><span className="mr-2">🚀</span>Instant Summarization</li>
            <li className="flex items-center"><span className="mr-2">🎯</span>OCR & Analysis</li>
            <li className="flex items-center"><span className="mr-2">🧠</span>Smart Chat</li>
            <li className="flex items-center"><span className="mr-2">💾</span>Memory Persistence</li>
          </ul>
        </div>

        <div className="p-3 rounded-xl bg-gradient-to-br from-warning/10 to-orange-400/10 border border-warning/20">
          <p className="text-xs text-secondary">
            <strong>💡 Tip:</strong> Backend on localhost:5000
          </p>
        </div>

        <button 
          onClick={toggleTheme}
          className="w-full p-3 rounded-xl bg-elevated border border-border-subtle hover:bg-secondary hover:border-accent-primary/40 transition-all shadow-soft hover:shadow-panel flex items-center justify-center group"
          title="Toggle theme"
        >
          <span className={`text-xl transition-transform group-hover:scale-110 ${isDark ? 'text-yellow-400 drop-shadow-lg' : 'text-accent-primary'}`}>
            {isDark ? '☀️' : '🌙'}
          </span>
          <span className="ml-2 text-xs font-medium text-secondary group-hover:text-primary transition-colors">Theme</span>
        </button>
      </div>
    </div>
  );
}
