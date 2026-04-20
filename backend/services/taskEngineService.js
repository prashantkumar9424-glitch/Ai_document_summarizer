import { compactText, requestGroq } from "./groqService.js";
import { buildApplicationModel, getProductPromptContext } from "./productModelService.js";

const TASK_JSON_SYSTEM_PROMPT =
  `You are an AI productivity assistant. Return valid JSON only. Do not use markdown fences, headings, or commentary.

${getProductPromptContext()}`;
const PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2
};

function normalizePriority(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }

  return "medium";
}

function normalizeDeadline(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function extractJsonCandidate(rawResponse) {
  const fencedMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectStart = rawResponse.indexOf("{");
  const arrayStart = rawResponse.indexOf("[");

  if (objectStart === -1 && arrayStart === -1) {
    return rawResponse.trim();
  }

  const useArray = arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart);
  const startIndex = useArray ? arrayStart : objectStart;
  const endChar = useArray ? "]" : "}";
  const endIndex = rawResponse.lastIndexOf(endChar);

  if (endIndex === -1 || endIndex <= startIndex) {
    return rawResponse.trim();
  }

  return rawResponse.slice(startIndex, endIndex + 1).trim();
}

function parseStructuredJson(rawResponse) {
  const candidate = extractJsonCandidate(rawResponse);

  try {
    return JSON.parse(candidate);
  } catch (error) {
    throw new Error(`Model returned invalid JSON: ${error.message}`);
  }
}

function normalizeTaskItem(item) {
  const task = String(
    item?.task ||
      item?.title ||
      item?.name ||
      item?.action ||
      ""
  ).trim();

  if (!task) {
    return null;
  }

  const description = String(
    item?.description ||
      item?.reason ||
      item?.details ||
      item?.short_description ||
      ""
  ).trim();

  return {
    task,
    description: description || null,
    priority: normalizePriority(item?.priority),
    deadline: normalizeDeadline(item?.deadline),
    reason: item?.reason ? String(item.reason).trim() : null,
    impactLevel: item?.impact_level ? String(item.impact_level).trim().toLowerCase() : null
  };
}

function normalizeTaskCollection(parsed) {
  const rawItems = Array.isArray(parsed) ? parsed : parsed?.tasks;

  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems.map(normalizeTaskItem).filter(Boolean);
}

function cleanInsightLine(line) {
  return String(line || "")
    .replace(/^[-*•\d.)\s]+/, "")
    .replace(/^#+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeTextItems(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = cleanInsightLine(item).toLowerCase();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sortTasksForExecution(tasks) {
  return [...tasks].sort((left, right) => {
    const leftPriority = PRIORITY_ORDER[left.priority] ?? PRIORITY_ORDER.medium;
    const rightPriority = PRIORITY_ORDER[right.priority] ?? PRIORITY_ORDER.medium;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    if (left.deadline && right.deadline) {
      return left.deadline.localeCompare(right.deadline);
    }

    if (left.deadline) return -1;
    if (right.deadline) return 1;

    return left.task.localeCompare(right.task);
  });
}

function fallbackDailyPlan(tasks) {
  return sortTasksForExecution(tasks)
    .slice(0, 3)
    .map((task) => ({
      task: task.task,
      description: task.description,
      reason: task.reason || "High-priority or time-sensitive work should be handled first.",
      priority: task.priority,
      deadline: task.deadline
    }));
}

export function extractKeyInsightsFromText(text, maxItems = 5) {
  const normalized = compactText(text || "", 6000);

  if (!normalized) {
    return [];
  }

  const bulletCandidates = normalized
    .split("\n")
    .map(cleanInsightLine)
    .filter((line) => line.length >= 24 && !line.endsWith(":"));

  if (bulletCandidates.length >= 3) {
    return dedupeTextItems(bulletCandidates).slice(0, maxItems);
  }

  const sentenceCandidates = normalized
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(cleanInsightLine)
    .filter((line) => line.length >= 40 && line.length <= 220);

  return dedupeTextItems(sentenceCandidates).slice(0, maxItems);
}

function getDeadlineBucket(deadline) {
  if (!deadline) {
    return "No deadline";
  }

  const parsedDeadline = new Date(deadline);
  if (Number.isNaN(parsedDeadline.getTime())) {
    return "No deadline";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(parsedDeadline.getFullYear(), parsedDeadline.getMonth(), parsedDeadline.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays <= 3) {
    return "Due soon";
  }

  if (diffDays <= 14) {
    return "This month";
  }

  return "Later";
}

export function buildTaskGraphData(tasks) {
  const normalizedTasks = normalizeIncomingTasks(tasks);
  const priorityCounts = {
    high: 0,
    medium: 0,
    low: 0
  };
  const deadlineCounts = {
    "Due soon": 0,
    "This month": 0,
    Later: 0,
    "No deadline": 0
  };

  normalizedTasks.forEach((task) => {
    priorityCounts[task.priority] += 1;
    deadlineCounts[getDeadlineBucket(task.deadline)] += 1;
  });

  return {
    priorityBreakdown: [
      { label: "High", value: priorityCounts.high, color: "#f97316" },
      { label: "Medium", value: priorityCounts.medium, color: "#38bdf8" },
      { label: "Low", value: priorityCounts.low, color: "#10b981" }
    ],
    deadlineBuckets: [
      { label: "Due soon", value: deadlineCounts["Due soon"], color: "#fb7185" },
      { label: "This month", value: deadlineCounts["This month"], color: "#f59e0b" },
      { label: "Later", value: deadlineCounts.Later, color: "#818cf8" },
      { label: "No deadline", value: deadlineCounts["No deadline"], color: "#64748b" }
    ]
  };
}

function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function buildTaskMetrics({ sourceText = "", tasks = [], keyInsights = [], dailyPlan = [] } = {}) {
  const normalizedTasks = normalizeIncomingTasks(tasks);
  const highPriorityCount = normalizedTasks.filter((task) => task.priority === "high").length;
  const withDeadlineCount = normalizedTasks.filter((task) => Boolean(task.deadline)).length;

  return {
    wordCount: countWords(sourceText),
    taskCount: normalizedTasks.length,
    highPriorityCount,
    withDeadlineCount,
    insightCount: keyInsights.length,
    recommendedTodayCount: dailyPlan.length
  };
}

export async function buildWorkspacePayload({
  mode,
  summary = null,
  sourceText = "",
  structuredOutput = null,
  normalizedTasks = [],
  filename = null,
  fileType = null,
  analysisMode = null
}) {
  let dailyPlan = [];

  if (normalizedTasks.length > 0) {
    try {
      const dailyResult = await selectDailyExecutionTasks(normalizedTasks);
      dailyPlan = dailyResult.recommendations;
    } catch (error) {
      console.warn("Daily plan fallback triggered:", error.message);
      dailyPlan = fallbackDailyPlan(normalizedTasks);
    }
  }

  const insightSeed =
    summary ||
    sourceText ||
    normalizedTasks
      .map((task) => [task.task, task.description, task.reason].filter(Boolean).join(". "))
      .join("\n");

  const keyInsights = extractKeyInsightsFromText(insightSeed);

  return {
    mode,
    applicationModel: buildApplicationModel(mode),
    filename,
    fileType,
    summary,
    sourceText: sourceText || null,
    excerpt: sourceText ? sourceText.slice(0, 1800) : null,
    analysisMode,
    structuredOutput,
    normalizedTasks,
    dailyPlan,
    keyInsights,
    graphData: buildTaskGraphData(normalizedTasks),
    metrics: buildTaskMetrics({
      sourceText: sourceText || summary || "",
      tasks: normalizedTasks,
      keyInsights,
      dailyPlan
    })
  };
}

function tokenize(value) {
  return Array.from(
    new Set(
      String(value || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((token) => token.length > 2)
    )
  );
}

function getSnippetCandidates({ sourceText = "", summary = "", tasks = [] }) {
  const snippets = [];

  compactText(sourceText, 8000)
    .split(/\n{2,}/)
    .map(cleanInsightLine)
    .filter((snippet) => snippet.length >= 50)
    .forEach((snippet) => {
      snippets.push({ source: "document", snippet });
    });

  extractKeyInsightsFromText(summary, 6).forEach((snippet) => {
    snippets.push({ source: "summary", snippet });
  });

  normalizeIncomingTasks(tasks).forEach((task) => {
    const snippet = [task.task, task.description, task.reason].filter(Boolean).join(". ");
    if (snippet.length >= 20) {
      snippets.push({ source: "task", snippet });
    }
  });

  return snippets.slice(0, 24);
}

function findRelevantSnippets({ query, sourceText = "", summary = "", tasks = [] }) {
  const queryTokens = tokenize(query);
  const candidates = getSnippetCandidates({ sourceText, summary, tasks });

  return candidates
    .map((candidate) => {
      let score = 0;
      const haystack = candidate.snippet.toLowerCase();

      queryTokens.forEach((token) => {
        if (haystack.includes(token)) {
          score += 1;
        }
      });

      return {
        ...candidate,
        score
      };
    })
    .filter((candidate) => candidate.score > 0 || queryTokens.length === 0)
    .sort((left, right) => right.score - left.score || right.snippet.length - left.snippet.length)
    .slice(0, 4)
    .map(({ source, snippet }) => ({ source, snippet }));
}

export async function runDeepSearch({ query, sourceText = "", summary = "", tasks = [] }) {
  const safeQuery = String(query || "").trim();
  const relevantSnippets = findRelevantSnippets({ query: safeQuery, sourceText, summary, tasks });
  const searchPrompt = `You are a deep-search assistant for a productivity workspace.

${getProductPromptContext()}

Answer the user's query using only the provided source material.

If the answer is uncertain, say so clearly.

Return JSON only with this schema:
{
  "answer": "Short grounded answer",
  "key_findings": ["Finding 1", "Finding 2"],
  "supporting_snippets": [
    {
      "source": "document",
      "snippet": "Quoted or paraphrased supporting text"
    }
  ]
}

User query:
${safeQuery}

Summary:
${compactText(summary, 2500) || "No summary available."}

Relevant snippets:
${JSON.stringify(relevantSnippets, null, 2)}

Tasks:
${JSON.stringify(normalizeIncomingTasks(tasks), null, 2)}`;

  const { rawResponse, parsed } = await requestTaskJson(searchPrompt, 1200);
  const answer = String(parsed?.answer || "").trim() || rawResponse;
  const keyFindings = Array.isArray(parsed?.key_findings)
    ? parsed.key_findings.map(cleanInsightLine).filter(Boolean).slice(0, 5)
    : extractKeyInsightsFromText(answer, 4);
  const supportingSnippets = Array.isArray(parsed?.supporting_snippets)
    ? parsed.supporting_snippets
        .map((item) => ({
          source: cleanInsightLine(item?.source || "source"),
          snippet: cleanInsightLine(item?.snippet || "")
        }))
        .filter((item) => item.snippet)
    : relevantSnippets;

  return {
    rawResponse,
    structuredOutput: parsed,
    answer,
    keyFindings,
    supportingSnippets
  };
}

async function requestTaskJson(userPrompt, maxTokens = 1200) {
  const rawResponse = await requestGroq({
    temperature: 0.2,
    maxTokens,
    messages: [
      {
        role: "system",
        content: TASK_JSON_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: userPrompt
      }
    ]
  });

  return {
    rawResponse,
    parsed: parseStructuredJson(rawResponse)
  };
}

export async function extractCoreTasksFromDocument(documentText) {
  const safeDocumentText = compactText(documentText, 14000);
  const prompt = `You are an AI productivity assistant.

${getProductPromptContext()}

Read the following document content carefully and extract all actionable tasks.

A task is an action that a human needs to perform. Ignore general information and explanations.

For each task, provide:

Task title (clear and concise)
Short description (what needs to be done)
Priority (high, medium, low)
Suggested deadline (if mentioned or reasonably inferred, otherwise null)

Only return tasks that are directly implied by the document.

Respond in JSON format only.

Use this strict schema:
{
  "tasks": [
    {
      "task": "Review compliance section",
      "description": "Analyze section 4 for legal risks",
      "priority": "high",
      "deadline": "2026-04-30"
    }
  ]
}

Document content:

${safeDocumentText}`;

  const { rawResponse, parsed } = await requestTaskJson(prompt, 1400);

  return {
    rawResponse,
    structuredOutput: parsed,
    normalizedTasks: normalizeTaskCollection(parsed)
  };
}

export async function extractTasksFromSummary(summaryText) {
  const safeSummaryText = compactText(summaryText, 10000);
  const prompt = `${getProductPromptContext()}

Based on the summary below, identify the next concrete actions that should be taken.

Focus on execution, follow-ups, reviews, decisions, or implementation steps.

Do not restate the summary. Convert insights into actions.

Return the result as a JSON array with:

task
reason (why this task matters)
priority

Summary:

${safeSummaryText}`;

  const { rawResponse, parsed } = await requestTaskJson(prompt, 1200);

  return {
    rawResponse,
    structuredOutput: parsed,
    normalizedTasks: normalizeTaskCollection(parsed)
  };
}

export async function extractGoalAwareTasks({ userGoal, documentText }) {
  const safeGoal = String(userGoal || "").trim();
  const safeDocumentText = compactText(documentText, 12000);
  const prompt = `You are helping a user achieve a specific goal.

${getProductPromptContext()}

User goal:
"${safeGoal}"

Using the document content below, extract only tasks that move the user closer to this goal.

Exclude tasks that are irrelevant or optional.

Rank tasks by importance toward the goal.

Output JSON with:

task
impact_level (high / medium / low)
priority

Document:

${safeDocumentText}`;

  const { rawResponse, parsed } = await requestTaskJson(prompt, 1200);

  return {
    rawResponse,
    structuredOutput: parsed,
    normalizedTasks: normalizeTaskCollection(parsed)
  };
}

export async function extractTasksFromChat(chatHistory) {
  const safeChatHistory = compactText(chatHistory, 10000);
  const prompt = `${getProductPromptContext()}

Review the conversation below and identify any commitments, next steps, or implied actions.

Convert them into actionable tasks a human should perform next.

If no clear tasks exist, return an empty array.

Output JSON only.

Conversation:

${safeChatHistory}`;

  const { rawResponse, parsed } = await requestTaskJson(prompt, 1200);

  return {
    rawResponse,
    structuredOutput: parsed,
    normalizedTasks: normalizeTaskCollection(parsed)
  };
}

export function normalizeIncomingTasks(taskInput) {
  if (Array.isArray(taskInput)) {
    return taskInput.map(normalizeTaskItem).filter(Boolean);
  }

  if (taskInput && typeof taskInput === "object") {
    return normalizeTaskCollection(taskInput);
  }

  return [];
}

export async function selectDailyExecutionTasks(taskInput) {
  const normalizedTasks = normalizeIncomingTasks(taskInput);

  const prompt = `You are an execution assistant.

${getProductPromptContext()}

Given the list of tasks below, select the top 3 tasks the user should work on today.

Prioritize:

High impact
Urgency
Logical order of execution

Explain your reasoning briefly for each selected task.

Return the result as a JSON array with:

task
reason
priority

Tasks:

${JSON.stringify(normalizedTasks, null, 2)}`;

  const { rawResponse, parsed } = await requestTaskJson(prompt, 1000);

  return {
    rawResponse,
    structuredOutput: parsed,
    normalizedTasks,
    recommendations: normalizeTaskCollection(parsed)
  };
}
