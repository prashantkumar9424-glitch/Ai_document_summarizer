import { VoiceControls } from "../voice/VoiceControls";

type ComposerProps = {
  draft: string;
  setDraft: (value: string) => void;
  language: string;
  setLanguage: (value: string) => void;
  isSending: boolean;
  onSend: (resetContext?: boolean) => Promise<void>;
  onTranscript: (blob: Blob) => Promise<void>;
  lastAssistantReply: string;
};

export function Composer(props: ComposerProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    if (!props.isSending) {
      void props.onSend(false);
    }
  }

  return (
    <section className="composer-shell panel">
      <textarea
        value={props.draft}
        onChange={(event) => props.setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask for a summary, action plan, reply draft, issue breakdown, risk review, or follow-up message."
        rows={5}
      />
      <p className="composer-hint">Press Enter to send. Press Shift+Enter for a new line.</p>
      <div className="composer-actions">
        <VoiceControls
          language={props.language}
          onLanguageChange={props.setLanguage}
          onTranscript={props.onTranscript}
          speakText={props.lastAssistantReply}
        />
        <div className="composer-buttons">
          <button className="button button-secondary" onClick={() => void props.onSend(true)}>
            Fresh response
          </button>
          <button className="button" disabled={props.isSending} onClick={() => void props.onSend(false)}>
            {props.isSending ? "Working..." : "Send"}
          </button>
        </div>
      </div>
    </section>
  );
}
