import type { ChatDetail } from "@platform/shared";

type MessageListProps = {
  chat: ChatDetail | null;
};

export function MessageList({ chat }: MessageListProps) {
  if (!chat || chat.messages.length === 0) {
    return (
      <div className="empty-state">
        <p>Use this space for actual work sessions.</p>
        <span>Try a meeting summary, a document Q&A, a follow-up email draft, or a quick transcription from your microphone.</span>
      </div>
    );
  }

  return (
    <div className="message-list">
      {chat.messages.map((message) => (
        <article key={message.id} className={message.role === "assistant" ? "message message-assistant" : "message message-user"}>
          <div className="message-meta">
            <strong>{message.role === "assistant" ? "Assistant" : "You"}</strong>
            <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <p>{message.content}</p>
        </article>
      ))}
    </div>
  );
}
