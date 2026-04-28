import { useRef, useState } from "react";

const languages = [
  { value: "auto", label: "Auto detect" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ar", label: "Arabic" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" }
];

type VoiceControlsProps = {
  language: string;
  onLanguageChange: (language: string) => void;
  onTranscript: (blob: Blob) => Promise<void>;
  speakText: string;
};

export function VoiceControls(props: VoiceControlsProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setIsTranscribing(true);
      try {
        await props.onTranscript(blob);
      } finally {
        setIsTranscribing(false);
      }
      stream.getTracks().forEach((track) => track.stop());
    };
    recorder.start();
    setIsRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setIsRecording(false);
  }

  function speakReply() {
    if (!props.speakText) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(props.speakText);
    if (props.language !== "auto") {
      utterance.lang = props.language;
    }
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="voice-controls">
      <label className="field compact-field">
        <span>Input language</span>
        <select value={props.language} onChange={(event) => props.onLanguageChange(event.target.value)}>
          {languages.map((language) => (
            <option key={language.value} value={language.value}>
              {language.label}
            </option>
          ))}
        </select>
      </label>

      <button className={isRecording ? "mic-button mic-button-active" : "mic-button"} onClick={() => void (isRecording ? stopRecording() : startRecording())}>
        <span className="mic-button-icon" aria-hidden="true" />
        <span>{isRecording ? "Stop mic" : isTranscribing ? "Transcribing..." : "Mic"}</span>
      </button>

      <button className="button button-secondary" onClick={speakReply}>
        Read reply
      </button>
    </div>
  );
}
