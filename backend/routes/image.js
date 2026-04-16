import express from "express";
import fs from "fs/promises";
import multer from "multer";
import path from "path";
import { MAX_IMAGE_SIZE, UPLOAD_DIR } from "../config.js";
import { ocrImage } from "../utils/ocr.js";
import { summarizeImage } from "../services/groqService.js";
import { saveImageSummary } from "../services/hindsightService.js";

const router = express.Router();
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and WEBP images are allowed."));
    }
  }
});

router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const ocrText = await ocrImage(req.file.path);

    const result = await summarizeImage({
      ocrText,
      imagePath: req.file.path,
      mimeType: req.file.mimetype
    });
    const { summary, mode } = result;

    await saveImageSummary(req.file.originalname, summary, ocrText);

    res.json({
      summary,
      filename: req.file.originalname,
      ocrText: ocrText.trim(),
      fileType: path.extname(req.file.originalname),
      analysisMode: mode
    });
  } catch (error) {
    console.error("Image processing error:", error);
    res.status(500).json({ error: error.message || "Failed to process image" });
  } finally {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => undefined);
    }
  }
});

export default router;
