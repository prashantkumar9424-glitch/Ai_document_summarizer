import fs from "fs/promises";
import pdf from "pdf-parse";
import mammoth from "mammoth";

function normalizeText(value) {
  return value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

export async function parseFile(file) {
  try {
    if (file.mimetype === "application/pdf") {
      const dataBuffer = await fs.readFile(file.path);
      const data = await pdf(dataBuffer);
      let text = normalizeText(data.text || "");
      
      // If PDF has no text, provide helpful information
      if (!text || text.trim().length === 0) {
        console.log("PDF appears to be image-based or empty. Pages detected:", data.numpages);
        // Return at least some content so the flow continues
        text = `[Document Summary: PDF file with ${data.numpages} page(s) detected. This appears to be an image-based PDF. For better text extraction, try uploading as images using the Image Analysis feature.]`;
      }
      return text;
    }

    if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ path: file.path });
      return normalizeText(result.value || "");
    }

    if (file.mimetype === "text/plain") {
      return normalizeText(await fs.readFile(file.path, "utf-8"));
    }

    throw new Error(`Unsupported file type: ${file.mimetype}`);

  } catch (error) {
    console.error("File parsing error:", error);
    throw new Error(`Failed to parse file: ${error.message}`);
  }
}
