import type { Attachment, Insight, MemoryEvent, Message } from "@platform/shared";
import Groq from "groq-sdk";
import { env, flags } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

const chatSystemPrompt = `
You are the reasoning engine for an enterprise knowledge intelligence platform.
Respond with concise, professional, decision-ready guidance.
The platform can provide persistent Hindsight memory. Use it naturally when it is relevant, but do not invent details that are not present in memory or the current chat.
When the user shares stable preferences, identity details, constraints, or asks you to remember something, acknowledge that briefly and keep the reply useful.
Return valid JSON with:
{
  "reply": "assistant response",
  "title": "short chat title under 70 chars",
  "insight": {
    "title": "optional insight title",
    "summary": "short summary",
    "decisions": [],
    "actionItems": [],
    "risks": [],
    "highlights": []
  }
}
`;

const insightPrompt = `
Extract structured intelligence from the provided material.
Return valid JSON with:
{
  "title": "artifact title",
  "summary": "executive summary",
  "decisions": [],
  "actionItems": [],
  "risks": [],
  "highlights": []
}
`;

const imageExtractionPrompt = `
Extract readable text and structured intelligence from the provided image.
If the image contains text, perform OCR and return it in the "text" field.
Return valid JSON with:
{
  "text": "all readable text from the image, or empty string if none",
  "insight": {
    "title": "artifact title",
    "summary": "executive summary",
    "decisions": [],
    "actionItems": [],
    "risks": [],
    "highlights": []
  }
}
`;

function parseJsonObject<T>(input: string): T {
  const match = input.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Model did not return JSON.");
  }

  return JSON.parse(match[0]) as T;
}

function fallbackInsight(title: string, summary: string): Insight {
  return {
    title,
    summary,
    decisions: [],
    actionItems: [],
    risks: [],
    highlights: []
  };
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }

    if (typeof record.error === "object" && record.error !== null) {
      const nested = record.error as Record<string, unknown>;
      if (typeof nested.message === "string" && nested.message.trim()) {
        return nested.message;
      }
    }
  }

  return "Unknown provider error.";
}

function readStatusCode(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.status === "number") {
      return record.status;
    }
    if (typeof record.statusCode === "number") {
      return record.statusCode;
    }
  }

  return null;
}

function isAuthenticationFailure(error: unknown) {
  const statusCode = readStatusCode(error);
  const message = readErrorMessage(error).toLowerCase();
  return statusCode === 401 || statusCode === 403 || message.includes("invalid api key") || message.includes("invalid_api_key");
}

export class GroqService {
  private readonly client: Groq | null;
  private providerDisabledReason: string | null = null;

  constructor() {
    this.client = flags.hasGroq ? new Groq({ apiKey: env.GROQ_API_KEY! }) : null;
  }

  private providerUnavailable() {
    return !this.client || Boolean(this.providerDisabledReason);
  }

  private providerFailureText(operation: "chat" | "analysis" | "transcription") {
    const noun =
      operation === "transcription"
        ? "Voice transcription"
        : operation === "analysis"
          ? "AI analysis"
          : "The AI provider";

    if (!this.client) {
      return `${noun} is unavailable right now because no Groq API key is configured.`;
    }

    if (this.providerDisabledReason && this.providerDisabledReason.toLowerCase().includes("invalid api key")) {
      return `${noun} is unavailable right now because the configured Groq API key was rejected.`;
    }

    if (this.providerDisabledReason) {
      return `${noun} is unavailable right now because the AI provider is temporarily disabled after a prior request failed.`;
    }

    return `${noun} is unavailable right now because the AI provider could not be reached.`;
  }

  private fallbackReply(input: { message: string; attachments: Attachment[] }) {
    const summary = input.attachments.map((item) => item.insight?.summary).filter(Boolean).join(" ");

    return {
      reply: [
        `${this.providerFailureText("chat")} The platform is running in fallback mode.`,
        summary ? `Uploaded context: ${summary}` : "",
        `Your message: ${input.message}`
      ]
        .filter(Boolean)
        .join("\n\n"),
      title: input.message.slice(0, 64),
      insight: null
    };
  }

  private handleProviderFailure(operation: string, error: unknown) {
    const message = readErrorMessage(error);
    const statusCode = readStatusCode(error);

    if (isAuthenticationFailure(error)) {
      this.providerDisabledReason = message;
      logger.warn("Groq authentication failed; switching to fallback mode", {
        operation,
        statusCode: statusCode ?? undefined,
        message
      });
      return;
    }

    logger.warn("Groq request failed; using fallback mode for this operation", {
      operation,
      statusCode: statusCode ?? undefined,
      message
    });
  }

  async generateReply(input: {
    message: string;
    language: string;
    history: Message[];
    attachments: Attachment[];
    recalledMemory: MemoryEvent[];
    memoryContext?: string;
  }): Promise<{ reply: string; title: string; insight: Insight | null }> {
    if (this.providerUnavailable()) {
      return this.fallbackReply(input);
    }

    const memorySection = input.memoryContext?.trim()
      ? `Persistent memory context:\n${input.memoryContext}`
      : input.recalledMemory.length > 0
        ? `Relevant recalled memory:\n${input.recalledMemory
            .map((memory, index) => `${index + 1}. ${memory.summary}`)
            .join("\n")}`
        : "No prior memory was injected for this turn.";

    const attachmentSection =
      input.attachments.length > 0
        ? `Attachments in context:\n${input.attachments
            .map((item) => `- ${item.name}: ${item.insight?.summary ?? item.extractedText?.slice(0, 500) ?? "No extracted content"}`)
            .join("\n")}`
        : "No attachments supplied.";

    try {
      const completion = await this.client!.chat.completions.create({
        model: env.GROQ_CHAT_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: chatSystemPrompt },
          {
            role: "system",
            content: `Reply in the user's preferred language when possible. Language hint: ${input.language}.`
          },
          {
            role: "system",
            content: memorySection
          },
          {
            role: "system",
            content: attachmentSection
          },
          ...input.history.slice(-8).map((message) => ({
            role: message.role,
            content: message.content
          })),
          {
            role: "user",
            content: input.message
          }
        ]
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = parseJsonObject<{
        reply?: string;
        title?: string;
        insight?: Insight;
      }>(raw);

      return {
        reply: parsed.reply ?? "I processed the request but could not formulate a complete response.",
        title: parsed.title ?? input.message.slice(0, 64),
        insight: parsed.insight ?? null
      };
    } catch (error) {
      this.handleProviderFailure("generateReply", error);
      return this.fallbackReply(input);
    }
  }

  async extractDocumentInsight(fileName: string, extractedText: string): Promise<Insight> {
    if (!extractedText.trim()) {
      return fallbackInsight(fileName, "No machine-readable text could be extracted from this document.");
    }

    if (this.providerUnavailable()) {
      return fallbackInsight(fileName, `${this.providerFailureText("analysis")} Showing extracted text preview instead.\n\n${extractedText.slice(0, 400)}`);
    }

    try {
      const completion = await this.client!.chat.completions.create({
        model: env.GROQ_CHAT_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: insightPrompt },
          {
            role: "user",
            content: `File: ${fileName}\n\nContent:\n${extractedText.slice(0, 12000)}`
          }
        ]
      });

      return parseJsonObject<Insight>(completion.choices[0]?.message?.content ?? "{}");
    } catch (error) {
      this.handleProviderFailure("extractDocumentInsight", error);
      return fallbackInsight(fileName, `${this.providerFailureText("analysis")} Showing extracted text preview instead.\n\n${extractedText.slice(0, 400)}`);
    }
  }

  async extractImageInsight(input: { fileName: string; mimeType: string; buffer: Buffer }): Promise<Insight> {
    const result = await this.extractImageContent(input);
    return result.insight;
  }

  async extractImageContent(input: { fileName: string; mimeType: string; buffer: Buffer }): Promise<{ extractedText: string; insight: Insight }> {
    if (this.providerUnavailable()) {
      return {
        extractedText: "",
        insight: fallbackInsight(input.fileName, `${this.providerFailureText("analysis")} Image uploaded successfully.`)
      };
    }

    const imageBase64 = input.buffer.toString("base64");

    try {
      const completion = await this.client!.chat.completions.create({
        model: env.GROQ_VISION_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: imageExtractionPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image as a business artifact and extract any readable text. File: ${input.fileName}`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.mimeType};base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      });

      const parsed = parseJsonObject<{
        text?: string;
        insight?: Insight;
      }>(completion.choices[0]?.message?.content ?? "{}");

      return {
        extractedText: typeof parsed.text === "string" ? parsed.text.trim() : "",
        insight: parsed.insight ?? fallbackInsight(input.fileName, "Image uploaded successfully.")
      };
    } catch (error) {
      this.handleProviderFailure("extractImageInsight", error);
      return {
        extractedText: "",
        insight: fallbackInsight(input.fileName, `${this.providerFailureText("analysis")} Image uploaded successfully.`)
      };
    }
  }

  async transcribeAudio(input: { buffer: Buffer; fileName: string; language?: string | null }) {
    if (this.providerUnavailable()) {
      return {
        text: this.providerFailureText("transcription"),
        language: input.language ?? "unknown"
      };
    }

    try {
      const transcription = await this.client!.audio.transcriptions.create({
        file: new File([new Uint8Array(input.buffer)], input.fileName),
        model: env.GROQ_TRANSCRIPTION_MODEL,
        language: input.language && input.language !== "auto" ? input.language : undefined,
        response_format: "verbose_json",
        temperature: 0
      });

      return {
        text: "text" in transcription ? transcription.text : "",
        language:
          "language" in transcription && typeof transcription.language === "string"
            ? transcription.language
            : input.language ?? "unknown"
      };
    } catch (error) {
      this.handleProviderFailure("transcribeAudio", error);
      return {
        text: this.providerFailureText("transcription"),
        language: input.language ?? "unknown"
      };
    }
  }
}
