import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from "react";
export function UploadDropzone({ onUpload }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    async function handleFiles(files) {
        if (!files) {
            return;
        }
        for (const file of Array.from(files)) {
            await onUpload(file);
        }
    }
    return (_jsxs("section", { className: dragging ? "upload-dropzone upload-dropzone-active" : "upload-dropzone", onDragOver: (event) => {
            event.preventDefault();
            setDragging(true);
        }, onDragLeave: () => setDragging(false), onDrop: (event) => {
            event.preventDefault();
            setDragging(false);
            void handleFiles(event.dataTransfer.files);
        }, children: [_jsxs("div", { children: [_jsx("p", { children: "Drop your files here" }), _jsx("span", { children: "Use PDFs, DOCX, TXT, PPTX, PNG, JPG, WebP, MP3, WAV, and similar formats." })] }), _jsx("button", { className: "button button-secondary", onClick: () => inputRef.current?.click(), children: "Choose files" }), _jsx("input", { ref: inputRef, className: "hidden-input", type: "file", multiple: true, onChange: (event) => void handleFiles(event.target.files) })] }));
}
