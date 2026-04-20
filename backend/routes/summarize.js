import express from "express";
import fs from "fs/promises";
import multer from "multer";
import path from "path";
import { MAX_DOCUMENT_SIZE, UPLOAD_DIR } from "../config.js";
import { isSupportedDocumentFile, parseFile, SUPPORTED_DOCUMENT_LABEL } from "../utils/fileParser.js";
import { summarizeDocument } from "../services/groqService.js";
import { saveDocumentSummary } from "../services/hindsightService.js";

const router = express.Router();
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: MAX_DOCUMENT_SIZE },
  fileFilter: (req, file, cb) => {
    if (isSupportedDocumentFile(file)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Supported files: ${SUPPORTED_DOCUMENT_LABEL}.`));
    }
  }
});

router.post("/text", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const summary = await summarizeDocument(text);

    await saveDocumentSummary("Voice or typed notes", summary, text);

    res.json({
      summary,
      filename: "Voice or typed notes",
      fileType: ".txt",
      excerpt: text.slice(0, 1200)
    });
  } catch (error) {
    console.error("Summarize text error:", error);
    res.status(500).json({ error: error.message || "Failed to summarize text" });
  }
});

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const text = await parseFile(req.file);

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Unable to extract content from this file. Please ensure the file contains readable text or try uploading as an image." });
    }

    const summary = await summarizeDocument(text);

    await saveDocumentSummary(req.file.originalname, summary, text);

    res.json({
      summary,
      filename: req.file.originalname,
      fileType: path.extname(req.file.originalname),
      excerpt: text.slice(0, 1200)
    });
  } catch (error) {
    console.error("Summarize error:", error);
    res.status(500).json({ error: error.message || "Failed to summarize document" });
  } finally {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => undefined);
    }
  }
});

export default router;
