import fs from "fs/promises";
import axios from "axios";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const VISION_MODEL = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
const MAX_DOCUMENT_CHARS = 14000;
const MAX_CONTEXT_CHARS = 7000;
const MAX_HISTORY_MESSAGES = 6;
const MAX_VISION_BYTES = 3 * 1024 * 1024;

function requireGroqKey() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
}

function compactText(value, maxChars) {
  if (!value) {
    return "";
  }

  const normalized = value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, maxChars).trim()}\n\n[Truncated for model context]`;
}

function formatHistory(history = []) {
  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((entry) => {
      const role = entry.role === "assistant" ? "Assistant" : "User";
      return `${role}: ${compactText(entry.content || "", 400)}`;
    })
    .join("\n");
}

async function requestGroq({
  messages,
  model = TEXT_MODEL,
  temperature = 0.2,
  maxTokens = 1100
}) {
  requireGroqKey();

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      },
      {
        timeout: 60000,
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices?.[0]?.message?.content?.trim() || "";
  } catch (error) {
    const apiMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message;

    throw new Error(`Groq request failed: ${apiMessage}`);
  }
}

async function summarizeImageWithVision(imagePath, mimeType, ocrText) {
  const imageBuffer = await fs.readFile(imagePath);
  if (imageBuffer.byteLength > MAX_VISION_BYTES) {
    return null;
  }

  const base64Image = imageBuffer.toString("base64");
  const ocrSnippet = compactText(ocrText, 5000);

  return requestGroq({
    model: VISION_MODEL,
    temperature: 0.2,
    maxTokens: 900,
    messages: [
      {
        role: "system",
        content:
          "You are an expert visual analyst. Summarize uploaded images in markdown with sections for Overview, Key Details, and Suggested Follow-ups."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Summarize this image for a user-facing dashboard.

If visible text appears in the image, connect it to the visual layout.
${ocrSnippet ? `\nOCR extracted text:\n${ocrSnippet}` : "\nNo OCR text was available."}`
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`
            }
          }
        ]
      }
    ]
  });
}

export async function summarizeDocument(text) {
  const documentText = compactText(text, MAX_DOCUMENT_CHARS);

  return requestGroq({
    temperature: 0.25,
    maxTokens: 1200,
    messages: [
      {
        role: "system",
        content:
          "You turn long documents into crisp, useful markdown summaries for busy users."
      },
      {
        role: "user",
        content: `Create a document summary with these sections:

## Executive Summary
Write 2-3 sentences.

## Key Points
List 4-6 bullets.

## Notable Details
Call out concrete names, dates, figures, or decisions when present.

## Suggested Questions
Offer 2 follow-up questions the user may want to ask in chat.

Document content:
${documentText}`
      }
    ]
  });
}

export async function summarizeImage({ ocrText = "", imagePath, mimeType }) {
  const normalizedOcr = compactText(ocrText, 6000);

  if (imagePath && mimeType && process.env.GROQ_ENABLE_VISION !== "false") {
    try {
      const visionSummary = await summarizeImageWithVision(imagePath, mimeType, normalizedOcr);
      if (visionSummary) {
        return {
          summary: visionSummary,
          mode: normalizedOcr ? "vision+ocr" : "vision"
        };
      }
    } catch (error) {
      console.warn("Vision summary fallback triggered:", error.message);
    }
  }

  const ocrSummary = await requestGroq({
    temperature: 0.3,
    maxTokens: 900,
    messages: [
      {
        role: "system",
        content:
          "You summarize images from OCR text when direct vision analysis is unavailable."
      },
      {
        role: "user",
        content: `Use the OCR text below to infer what the image is about. If details are uncertain, say so clearly.

Respond with:
## Overview
## Extracted Text Highlights
## What To Ask Next

OCR text:
${normalizedOcr || "No readable text was extracted from the image."}`
      }
    ]
  });

  return {
    summary: ocrSummary,
    mode: "ocr"
  };
}

export async function generateChatResponse({ message, context = "", history = [] }) {
  const memoryContext = compactText(context, MAX_CONTEXT_CHARS);
  const recentHistory = formatHistory(history);

  return requestGroq({
    temperature: 0.35,
    maxTokens: 900,
    messages: [
      {
        role: "system",
        content:
          "You are a grounded AI assistant. Prefer uploaded document and image context when available, cite what you are relying on, and say when context is missing."
      },
      {
        role: "user",
        content: `Answer the user's latest question.

${memoryContext ? `Relevant uploaded context:\n${memoryContext}\n` : "No uploaded context was found in memory.\n"}
${recentHistory ? `Recent conversation:\n${recentHistory}\n` : ""}
Latest user message:
${message}

Keep the answer practical and concise.`
      }
    ]
  });
}
