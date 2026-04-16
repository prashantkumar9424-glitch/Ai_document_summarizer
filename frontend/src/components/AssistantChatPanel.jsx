import { useEffect, useRef, useState } from "react";
import { httpApi } from "../services/httpApi";

export default function AssistantChatPanel({ hasContext, onActivity }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) {
      return;
    }

    const userMessage = { role: "user", content: input.trim() };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMessage].slice(-6);
      const response = await httpApi.chat({
        message: userMessage.content,
        history
      });

      const aiMessage = {
        role: "assistant",
        content: response.response,
        contextUsed: response.contextUsed
      };

      setMessages((current) => [...current, aiMessage]);
      onActivity?.({
        kind: "chat",
        title: userMessage.content,
        detail: response.response,
        tab: "chat"
      });
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error.message || "Sorry, I encountered an error. Please try again.",
          error: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel panel-chat">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Chat Assistant</p>
          <h2 className="panel-title">Ask follow-up questions about anything you uploaded.</h2>
        </div>
        <span className="status-chip">{hasContext ? "Context loaded" : "General mode"}</span>
      </div>

      <div className="chat-window">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">AI</div>
            <h3>Start with a question.</h3>
            <p>
              {hasContext
                ? "Your recent summaries are available to ground the answer."
                : "You can ask general questions now, then upload a file or image to make the chat grounded."}
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`message-row ${message.role === "user" ? "is-user" : ""}`}>
            <div
              className={`message-bubble ${
                message.role === "user"
                  ? "is-user"
                  : message.error
                  ? "is-error"
                  : "is-assistant"
              }`}
            >
              <p>{message.content}</p>
              {message.role === "assistant" && !message.error && (
                <span className="message-meta">
                  {message.contextUsed ? "Using saved context" : "Reply without saved context"}
                </span>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-row">
            <div className="message-bubble is-assistant">
              <div className="loading-row">
                <span className="spinner" />
                <span>Thinking through the answer...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-wrap">
        <textarea
          rows="3"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Ask for a summary, explanation, key facts, action items, or comparisons..."
          className="chat-input"
          disabled={loading}
        />

        <div className="chat-actions">
          <p className="small-copy">Press Enter to send, Shift+Enter for a new line.</p>
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="primary-button"
          >
            Send
          </button>
        </div>
      </div>
    </section>
  );
}
