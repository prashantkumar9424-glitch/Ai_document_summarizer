import axios from "axios";

/* =======================
   Configuration
======================= */

const BASE = process.env.HINDSIGHT_API_URL || "https://api.hindsight.ai";
const MEMORY_PATH = process.env.HINDSIGHT_MEMORY_PATH || "/memory";
const SEARCH_PATH = process.env.HINDSIGHT_SEARCH_PATH || "/search";
const MAX_LOCAL_MEMORIES = 80;

const localMemories = [];

/* =======================
   Helpers
======================= */

function hasRemoteConfig() {
  return Boolean(process.env.HINDSIGHT_API_KEY);
}

function compactText(value, maxChars = 5000) {
  if (!value) return "";

  const normalized = value
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalized.length <= maxChars) return normalized;

  return `${normalized.slice(0, maxChars).trim()}\n\n[Truncated]`;
}

function addLocalMemory(record) {
  localMemories.unshift(record);
  if (localMemories.length > MAX_LOCAL_MEMORIES) {
    localMemories.length = MAX_LOCAL_MEMORIES;
  }
}

function tokenize(value) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((t) => t.length > 2)
  );
}

function searchLocalMemories(query, limit) {
  const tokens = tokenize(query);

  return localMemories
    .map((memory) => {
      const haystack = `${memory.type} ${memory.content}`.toLowerCase();
      let score = 0;

      tokens.forEach((token) => {
        if (haystack.includes(token)) score += 1;
      });

      if (!tokens.size) score = 1;

      return { ...memory, score };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* =======================
   Core API
======================= */

export async function saveMemory(content, type = "general", metadata = {}) {
  const record = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content: compactText(content),
    type,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };

  addLocalMemory(record);

  if (!hasRemoteConfig()) return;

  try {
    await axios.post(
      `${BASE}${MEMORY_PATH}`,
      {
        content: record.content,
        type: record.type,
        metadata: record.metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HINDSIGHT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("Hindsight save error:", err.message);
  }
}

export async function recallMemory(query, limit = 5) {
  const localResults = searchLocalMemories(query, limit);

  if (!hasRemoteConfig()) return localResults;

  try {
    const res = await axios.post(
      `${BASE}${SEARCH_PATH}`,
      {
        query,
        limit,
        include_metadata: true,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HINDSIGHT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const remoteResults = res.data?.results || [];
    const merged = [...remoteResults];

    localResults.forEach((local) => {
      if (!merged.some((r) => r.content === local.content)) {
        merged.push(local);
      }
    });

    return merged.slice(0, limit);
  } catch (err) {
    console.error("Hindsight recall error:", err.message);
    return localResults;
  }
}

/* =======================
   Specialized Saves
======================= */

export async function saveDocumentSummary(filename, summary, sourceText = "") {
  await saveMemory(
    `Document Summary - ${filename}

Summary:
${summary}

Source:
${compactText(sourceText, 3500)}`,
    "document_summary",
    { filename }
  );
}

export async function saveImageSummary(filename, summary, ocrText = "") {
  await saveMemory(
    `Image Summary - ${filename}

Summary:
${summary}

OCR:
${compactText(ocrText, 2500)}`,
    "image_summary",
    { filename }
  );
}

export async function saveChatMessage(userMessage, aiResponse) {
  await saveMemory(
    `User: ${userMessage}\nAI: ${aiResponse}`,
    "chat",
    { userMessage, aiResponse }
  );
}