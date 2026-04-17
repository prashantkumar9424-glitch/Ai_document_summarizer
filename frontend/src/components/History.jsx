import { useState, useEffect } from "react";

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      // Note: This would require a backend endpoint to retrieve history
      // For now, we'll show a placeholder
      setHistory([]);
    } catch (err) {
      setError("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border-default bg-secondary p-8 shadow-panel backdrop-blur-xl">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-primary mb-3">
          Processing History
        </h2>
        <p className="text-sm text-secondary">
          View your previous document and image processing sessions
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent-primary"></div>
          <span className="ml-4 text-secondary font-medium">Loading history...</span>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-6 drop-shadow-lg">📋</div>
          <p className="text-secondary mb-6 font-medium">{error}</p>
          <button
            onClick={loadHistory}
            className="px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-hover text-white rounded-xl hover:shadow-accent-soft shadow-lg transition-all font-semibold hover:from-accent-hover"
          >
            Try Again
          </button>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-6 drop-shadow-lg">📋</div>
          <h3 className="text-xl font-bold text-primary mb-3">No History Yet</h3>
          <p className="text-secondary max-w-md mx-auto leading-relaxed">
            Your processing history will appear here once you upload documents or images.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item, index) => (
            <div key={index} className="border border-border-subtle rounded-xl p-6 bg-elevated/50 backdrop-blur-sm hover:bg-elevated hover:shadow-soft transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-bold text-primary text-lg mb-1">{item.title}</h4>
                  <p className="text-secondary text-sm mb-2 leading-relaxed">{item.description}</p>
                  <p className="text-muted text-xs">{item.timestamp}</p>
                </div>
                <span className={`px-3 py-1.5 text-xs rounded-full font-semibold ${
                  item.type === 'document'
                    ? 'bg-accent-bg text-accent-primary'
                    : 'bg-success/20 text-success border border-success/30'
                }`}>
                  {item.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
