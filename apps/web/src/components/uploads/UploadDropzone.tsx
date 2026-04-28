import { useRef, useState } from "react";

type UploadDropzoneProps = {
  onUpload: (file: File) => Promise<void>;
};

export function UploadDropzone({ onUpload }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files) {
      return;
    }

    for (const file of Array.from(files)) {
      await onUpload(file);
    }
  }

  return (
    <section
      className={dragging ? "upload-dropzone upload-dropzone-active" : "upload-dropzone"}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void handleFiles(event.dataTransfer.files);
      }}
    >
      <div>
        <p>Drop your files here</p>
        <span>Use PDFs, DOCX, TXT, PPTX, PNG, JPG, WebP, MP3, WAV, and similar formats.</span>
      </div>
      <button className="button button-secondary" onClick={() => inputRef.current?.click()}>
        Choose files
      </button>
      <input
        ref={inputRef}
        className="hidden-input"
        type="file"
        multiple
        onChange={(event) => void handleFiles(event.target.files)}
      />
    </section>
  );
}
