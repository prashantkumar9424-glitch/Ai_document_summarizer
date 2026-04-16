import { createContext, useContext, useState } from "react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info", duration = 5000) => {
    const id = Date.now();
    const toast = { id, message, type };
    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-md">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

function Toast({ message, type, onClose }) {
  const getStyles = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-gradient-to-r from-green-500/90 to-emerald-500/90",
          icon: "✅",
          border: "border-green-400/30"
        };
      case "error":
        return {
          bg: "bg-gradient-to-r from-red-500/90 to-rose-500/90",
          icon: "❌",
          border: "border-red-400/30"
        };
      case "warning":
        return {
          bg: "bg-gradient-to-r from-amber-500/90 to-orange-500/90",
          icon: "⚠️",
          border: "border-amber-400/30"
        };
      default:
        return {
          bg: "bg-gradient-to-r from-blue-500/90 to-cyan-500/90",
          icon: "ℹ️",
          border: "border-blue-400/30"
        };
    }
  };

  const { bg, icon, border } = getStyles();

  return (
    <div
      className={`${bg} backdrop-blur-xl border ${border} text-white px-5 py-4 rounded-xl shadow-2xl flex items-center justify-between gap-3 min-w-64 animate-slide-in-right`}
      role="alert"
    >
      <div className="flex items-center gap-3 flex-1">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium leading-snug">{message}</span>
      </div>
      <button
        onClick={onClose}
        className="ml-4 text-white/70 hover:text-white transition-colors flex-shrink-0"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}