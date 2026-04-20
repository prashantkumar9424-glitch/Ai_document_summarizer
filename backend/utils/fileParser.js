import fs from "fs/promises";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import path from "path";

const TEXT_BASED_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".rtf",
  ".xml",
  ".html",
  ".htm",
  ".yaml",
  ".yml",
  ".log"
]);

const TEXT_BASED_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/rtf",
  "text/rtf",
  "application/xml",
  "text/xml",
  "text/html",
  "application/x-yaml",
  "text/yaml"
]);

export const SUPPORTED_DOCUMENT_LABEL =
  "PDF, DOCX, TXT, MD, CSV, TSV, JSON, RTF, XML, HTML, YAML, and LOG";

function normalizeText(value) {
  return value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function getFileExtension(file) {
  return path.extname(file?.originalname || "").toLowerCase();
}

function isTextBasedDocument(file) {
  const mimeType = file?.mimetype || "";
  const extension = getFileExtension(file);

  return mimeType.startsWith("text/") || TEXT_BASED_MIME_TYPES.has(mimeType) || TEXT_BASED_EXTENSIONS.has(extension);
}

export function isSupportedDocumentFile(file) {
  const mimeType = file?.mimetype || "";

  return (
    mimeType === "application/pdf" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    isTextBasedDocument(file)
  );
}

export async function parseFile(file) {
  try {
    if (file.mimetype === "application/pdf") {
      const dataBuffer = await fs.readFile(file.path);
      const data = await pdf(dataBuffer);
      let text = normalizeText(data.text || "");

      if (!text || text.trim().length === 0) {
        console.log("PDF appears to be image-based or empty. Pages detected:", data.numpages);
        text = `[Document Summary: PDF file with ${data.numpages} page(s) detected. This appears to be an image-based PDF. For better text extraction, try uploading as images using the Image Analysis feature.]`;
      }
      return text;
    }

    if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ path: file.path });
      return normalizeText(result.value || "");
    }

    if (isTextBasedDocument(file)) {
      return normalizeText(await fs.readFile(file.path, "utf-8"));
    }

    throw new Error(`Unsupported file type: ${file.mimetype}`);
  } catch (error) {
    console.error("File parsing error:", error);
    throw new Error(`Failed to parse file: ${error.message}`);
  }
}
