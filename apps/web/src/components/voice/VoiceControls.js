import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
export function VoiceControls(props) {
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
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
            }
            finally {
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
    return (_jsxs("div", { className: "voice-controls", children: [_jsxs("label", { className: "field compact-field", children: [_jsx("span", { children: "Input language" }), _jsx("select", { value: props.language, onChange: (event) => props.onLanguageChange(event.target.value), children: languages.map((language) => (_jsx("option", { value: language.value, children: language.label }, language.value))) })] }), _jsxs("button", { className: isRecording ? "mic-button mic-button-active" : "mic-button", onClick: () => void (isRecording ? stopRecording() : startRecording()), children: [_jsx("span", { className: "mic-button-icon", "aria-hidden": "true" }), _jsx("span", { children: isRecording ? "Stop mic" : isTranscribing ? "Transcribing..." : "Mic" })] }), _jsx("button", { className: "button button-secondary", onClick: speakReply, children: "Read reply" })] }));
}
