import express from "express";
import fs from "fs/promises";
import multer from "multer";
import path from "path";
import { MAX_DOCUMENT_SIZE, MAX_IMAGE_SIZE, UPLOAD_DIR } from "../config.js";
import { summarizeDocument, summarizeImage } from "../services/groqService.js";
import {
  buildWorkspacePayload,
  extractCoreTasksFromDocument,
  extractGoalAwareTasks,
  extractTasksFromChat,
  extractTasksFromSummary,
  normalizeIncomingTasks,
  runDeepSearch,
  selectDailyExecutionTasks
} from "../services/taskEngineService.js";
import {
  buildSvgAssetResponse,
  generateGraphSvg,
  generateInsightPosterSvg
} from "../services/assetGenerationService.js";
import { saveDocumentSummary, saveImageSummary } from "../services/hindsightService.js";
import { isSupportedDocumentFile, parseFile, SUPPORTED_DOCUMENT_LABEL } from "../utils/fileParser.js";
import { ocrImage } from "../utils/ocr.js";

const router = express.Router();

const documentUpload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: MAX_DOCUMENT_SIZE },
  fileFilter: (req, file, cb) => {
    if (isSupportedDocumentFile(file)) {
      cb(null, true);
      return;
    }

    cb(new Error(`Invalid file type. Supported files: ${SUPPORTED_DOCUMENT_LABEL}.`));
  }
});

const imageUpload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error("Invalid file type. Only JPEG, PNG, and WEBP images are allowed."));
  }
});

function requireText(value, fieldName) {
  if (!value || String(value).trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }
}

router.post("/document-text", async (req, res) => {
  try {
    const { documentText } = req.body;
    requireText(documentText, "Document text");

    const [summary, taskResult] = await Promise.all([
      summarizeDocument(documentText),
      extractCoreTasksFromDocument(documentText)
    ]);

    await saveDocumentSummary("Typed workspace notes", summary, documentText);

    res.json(
      await buildWorkspacePayload({
        mode: "document-text",
        summary,
        sourceText: documentText,
        structuredOutput: taskResult.structuredOutput,
        normalizedTasks: taskResult.normalizedTasks,
        filename: "Typed workspace notes",
        fileType: ".txt"
      })
    );
  } catch (error) {
    console.error("Document text task extraction error:", error);
    res.status(400).json({ error: error.message || "Failed to extract tasks from document text" });
  }
});

router.post("/document-upload", documentUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const documentText = await parseFile(req.file);
    requireText(documentText, "Parsed document text");

    const [summary, taskResult] = await Promise.all([
      summarizeDocument(documentText),
      extractCoreTasksFromDocument(documentText)
    ]);

    await saveDocumentSummary(req.file.originalname, summary, documentText);

    res.json(
      await buildWorkspacePayload({
        mode: "document-upload",
        filename: req.file.originalname,
        fileType: path.extname(req.file.originalname),
        summary,
        sourceText: documentText,
        structuredOutput: taskResult.structuredOutput,
        normalizedTasks: taskResult.normalizedTasks
      })
    );
  } catch (error) {
    console.error("Document upload task extraction error:", error);
    res.status(500).json({ error: error.message || "Failed to process document upload" });
  } finally {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => undefined);
    }
  }
});

router.post("/image-upload", imageUpload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const extractedText = await ocrImage(req.file.path);
    const imageResult = await summarizeImage({
      ocrText: extractedText,
      imagePath: req.file.path,
      mimeType: req.file.mimetype
    });
    const taskResult = await extractTasksFromSummary(imageResult.summary);

    await saveImageSummary(req.file.originalname, imageResult.summary, extractedText);

    res.json(
      await buildWorkspacePayload({
        mode: "image-upload",
        filename: req.file.originalname,
        fileType: path.extname(req.file.originalname),
        summary: imageResult.summary,
        sourceText: extractedText,
        analysisMode: imageResult.mode,
        structuredOutput: taskResult.structuredOutput,
        normalizedTasks: taskResult.normalizedTasks
      })
    );
  } catch (error) {
    console.error("Image task extraction error:", error);
    res.status(500).json({ error: error.message || "Failed to process image upload" });
  } finally {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => undefined);
    }
  }
});

router.post("/summary", async (req, res) => {
  try {
    const { summaryText } = req.body;
    requireText(summaryText, "Summary text");

    const taskResult = await extractTasksFromSummary(summaryText);

    res.json(
      await buildWorkspacePayload({
        mode: "summary",
        summary: summaryText,
        structuredOutput: taskResult.structuredOutput,
        normalizedTasks: taskResult.normalizedTasks
      })
    );
  } catch (error) {
    console.error("Summary task extraction error:", error);
    res.status(400).json({ error: error.message || "Failed to extract tasks from summary" });
  }
});

router.post("/goal", async (req, res) => {
  try {
    const { userGoal, documentText } = req.body;
    requireText(userGoal, "User goal");
    requireText(documentText, "Document text");

    const taskResult = await extractGoalAwareTasks({ userGoal, documentText });

    res.json(
      await buildWorkspacePayload({
        mode: "goal",
        summary: null,
        sourceText: documentText,
        structuredOutput: taskResult.structuredOutput,
        normalizedTasks: taskResult.normalizedTasks
      })
    );
  } catch (error) {
    console.error("Goal-aware task extraction error:", error);
    res.status(400).json({ error: error.message || "Failed to extract goal-aware tasks" });
  }
});

router.post("/chat", async (req, res) => {
  try {
    const { chatHistory } = req.body;
    requireText(chatHistory, "Chat history");

    const taskResult = await extractTasksFromChat(chatHistory);

    res.json(
      await buildWorkspacePayload({
        mode: "chat",
        sourceText: chatHistory,
        structuredOutput: taskResult.structuredOutput,
        normalizedTasks: taskResult.normalizedTasks
      })
    );
  } catch (error) {
    console.error("Chat task extraction error:", error);
    res.status(400).json({ error: error.message || "Failed to extract chat tasks" });
  }
});

router.post("/daily", async (req, res) => {
  try {
    const { tasks } = req.body;
    const normalizedTasks = normalizeIncomingTasks(tasks);

    if (normalizedTasks.length === 0) {
      return res.status(400).json({ error: "At least one task is required" });
    }

    const result = await selectDailyExecutionTasks(normalizedTasks);

    res.json({
      mode: "daily",
      sourceTasks: normalizedTasks,
      structuredOutput: result.structuredOutput,
      recommendations: result.recommendations
    });
  } catch (error) {
    console.error("Daily execution selection error:", error);
    res.status(400).json({ error: error.message || "Failed to select daily tasks" });
  }
});

router.post("/deep-search", async (req, res) => {
  try {
    const { query, sourceText = "", summary = "", tasks = [] } = req.body;
    requireText(query, "Search query");

    if (!String(sourceText || summary || "").trim() && normalizeIncomingTasks(tasks).length === 0) {
      return res.status(400).json({ error: "Source content is required for deep search" });
    }

    const result = await runDeepSearch({
      query,
      sourceText,
      summary,
      tasks
    });

    res.json({
      mode: "deep-search",
      query,
      answer: result.answer,
      keyFindings: result.keyFindings,
      supportingSnippets: result.supportingSnippets,
      structuredOutput: result.structuredOutput
    });
  } catch (error) {
    console.error("Deep search error:", error);
    res.status(400).json({ error: error.message || "Failed to run deep search" });
  }
});

router.post("/graph-image", async (req, res) => {
  try {
    const { title, items } = req.body;

    if (!title || String(title).trim().length === 0) {
      return res.status(400).json({ error: "Graph title is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "At least one graph item is required" });
    }

    const svg = generateGraphSvg({
      title: String(title).trim(),
      items
    });

    res.json(
      buildSvgAssetResponse({
        svg,
        filename: `${String(title).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "graph"}.svg`
      })
    );
  } catch (error) {
    console.error("Graph image generation error:", error);
    res.status(400).json({ error: error.message || "Failed to generate graph image" });
  }
});

router.post("/insight-image", async (req, res) => {
  try {
    const { analysis = {}, title } = req.body;

    const svg = generateInsightPosterSvg({
      analysis,
      title: String(title || analysis?.filename || "Insight Poster").trim()
    });

    res.json(
      buildSvgAssetResponse({
        svg,
        filename: `${String(title || analysis?.filename || "insight-poster").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}.svg`
      })
    );
  } catch (error) {
    console.error("Insight poster generation error:", error);
    res.status(400).json({ error: error.message || "Failed to generate insight image" });
  }
});

export default router;
