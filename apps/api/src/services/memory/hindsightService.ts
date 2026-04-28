import { randomUUID } from "node:crypto";
import { HindsightClient } from "@vectorize-io/hindsight-client";
import type { MemoryBankEntry, MemoryEvent, Message, UserMode } from "@platform/shared";
import { env, flags, hindsightConfig } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

type MemoryOwner = {
  mode: UserMode;
  userId: string | null;
  guestSessionId?: string | null;
  email?: string | null;
};

type BankFailureState = {
  authFailed: boolean;
  reason: string;
  retryAt: number | null;
};

type MemoryIntent = {
  wantsReflection: boolean;
  wantsPersonalRecall: boolean;
  wantsExplicitRemember: boolean;
};

type RecallInput = MemoryOwner & {
  query: string;
  shouldRecall: boolean;
  chatId?: string | null;
  chatTitle?: string | null;
  history?: Message[];
  attachmentSummaries?: string[];
  maxResults?: number;
};

type RetainConversationInput = MemoryOwner & {
  chatId: string;
  title: string;
  userMessage: string;
  assistantMessage: string;
  attachmentSummaries: string[];
};

type ManualRetainInput = MemoryOwner & {
  content: string;
  chatId?: string | null;
  context?: string;
  tags?: string[];
  metadata?: Record<string, string>;
  timestamp?: string;
};

type ReflectInput = MemoryOwner & {
  query: string;
  chatId?: string | null;
  chatTitle?: string | null;
  history?: Message[];
  attachmentSummaries?: string[];
};

type ListMemoriesInput = MemoryOwner & {
  limit?: number;
  offset?: number;
  q?: string;
  type?: string;
  consolidationState?: "failed" | "pending" | "done";
};

export type HindsightRecallPayload = {
  bankId: string | null;
  events: MemoryEvent[];
  promptContext: string;
  reflection: string | null;
  ops: {
    recalled: boolean;
    reflected: boolean;
  };
};

export type HindsightStatus = {
  enabled: boolean;
  configured: boolean;
  reachable: boolean;
  authenticated: boolean;
  authFailed: boolean;
  baseUrl: string;
  reason?: string;
};

export type HindsightMemoryBankPayload = {
  bankId: string | null;
  items: MemoryBankEntry[];
  total: number;
  limit: number;
  offset: number;
};

const reflectPattern =
  /\b(reflect|analy[sz]e|synthesi[sz]e|summari[sz]e what you know|what do you know about me|who am i|remember me|patterns?|insights?|overview of)\b/i;
const personalRecallPattern =
  /\b(my name|who am i|what do you know about me|remember me|my preferences|tell me about myself)\b/i;
const explicitRememberPattern = /\b(remember that|please remember|don't forget|keep in mind)\b/i;
const bankRetryDelayMs = 30_000;

const factPatterns = [
  /(?:my name is|i am called|call me)\s+([a-z][a-z' -]{1,40})/i,
  /i (?:work|am employed) (?:at|for|with)\s+([a-z0-9&.,' -]{2,80})/i,
  /i am (?:a|an)\s+([a-z][a-z0-9,' -]{2,60})/i,
  /i (?:live|am based) in\s+([a-z ,'-]{2,80})/i,
  /i prefer\s+(.{5,120})/i,
  /i (?:like|love|hate|enjoy|use)\s+(.{3,100})/i,
  /my (?:email|phone|age|birthday|company|team)\s+(?:is|:)\s*(.{2,100})/i
] as const;

function detectIntent(message: string): MemoryIntent {
  return {
    wantsReflection: reflectPattern.test(message),
    wantsPersonalRecall: personalRecallPattern.test(message),
    wantsExplicitRemember: explicitRememberPattern.test(message)
  };
}

function normalizeFact(fact: string) {
  return fact.replace(/\s+/g, " ").replace(/[.?!\s]+$/, "").trim();
}

function extractRetainableFacts(message: string) {
  const facts = new Set<string>();

  for (const pattern of factPatterns) {
    const match = message.match(pattern);
    if (!match) {
      continue;
    }

    facts.add(normalizeFact(match[0]));
  }

  return [...facts];
}

function clip(text: string, limit: number) {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit - 3).trimEnd()}...`;
}

function toMetadata(record: Record<string, string | null | undefined>) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => Boolean(value))) as Record<string, string>;
}

function toRecord(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readString(record: Record<string, unknown> | null, ...keys: string[]) {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function readStringArray(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function readStatusCode(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.statusCode === "number") {
      return record.statusCode;
    }
    if (typeof record.status === "number") {
      return record.status;
    }
  }

  return null;
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
  }

  return "Unknown Hindsight error.";
}

function isAuthenticationFailure(error: unknown) {
  const statusCode = readStatusCode(error);
  const message = readErrorMessage(error).toLowerCase();
  return statusCode === 401 || statusCode === 403 || message.includes("invalid api key") || message.includes("invalid_api_key");
}

export class HindsightService {
  private readonly client: HindsightClient | null;
  private readonly ensuredBanks = new Map<string, Promise<void>>();
  private readonly bankFailures = new Map<string, BankFailureState>();

  constructor() {
    this.client = flags.hasHindsight
      ? new HindsightClient({
          baseUrl: env.HINDSIGHT_BASE_URL,
          apiKey: env.HINDSIGHT_API_KEY
        })
      : null;
  }

  private bankIdFor(owner: MemoryOwner) {
    if (hindsightConfig.sharedBankId) {
      return hindsightConfig.sharedBankId;
    }

    if (owner.mode === "authenticated" && owner.userId) {
      return `user-${owner.userId}`;
    }

    if (owner.mode === "guest" && owner.guestSessionId) {
      return `guest-${owner.guestSessionId}`;
    }

    return null;
  }

  private readBankFailure(bankId: string) {
    const failure = this.bankFailures.get(bankId);
    if (!failure) {
      return null;
    }

    if (!failure.authFailed && failure.retryAt !== null && failure.retryAt <= Date.now()) {
      this.bankFailures.delete(bankId);
      return null;
    }

    return failure;
  }

  private recordBankFailure(bankId: string, error: unknown) {
    const authFailed = isAuthenticationFailure(error);

    this.bankFailures.set(bankId, {
      authFailed,
      reason: readErrorMessage(error),
      retryAt: authFailed ? null : Date.now() + bankRetryDelayMs
    });
  }

  private clearBankFailure(bankId: string) {
    this.bankFailures.delete(bankId);
  }

  private missingConfigurationReason() {
    if (!hindsightConfig.enabled) {
      return "Hindsight is disabled in the local environment.";
    }

    if (hindsightConfig.baseUrl && !hindsightConfig.usesLocalServer && !hindsightConfig.hasApiKey) {
      return "HINDSIGHT_API_KEY is required when HINDSIGHT_BASE_URL points to a remote server.";
    }

    return "Hindsight is not configured.";
  }

  private async initializeBank(bankId: string, owner: MemoryOwner) {
    if (!this.client) {
      return;
    }

    const actorLabel =
      owner.mode === "authenticated"
        ? owner.email || owner.userId || "authenticated user"
        : owner.guestSessionId || "guest session";

    await this.client.createBank(bankId, {
      name: `Knowledge memory for ${actorLabel}`,
      reflectMission:
        "Provide grounded, concise answers from prior chats, attachments, user preferences, decisions, and operating context. State uncertainty plainly when memories are sparse or conflicting.",
      retainMission:
        "Extract durable facts, user identity details, preferences, decisions, action items, project context, and important constraints from each chat turn.",
      retainExtractionMode: "concise",
      enableObservations: true,
      observationsMission:
        "Synthesize stable user preferences, recurring project context, and high-signal decisions that will help future assistant responses stay accurate and personalized."
    });
  }

  private async ensureBank(owner: MemoryOwner) {
    const bankId = this.bankIdFor(owner);
    if (!this.client || !bankId) {
      return null;
    }

    if (this.readBankFailure(bankId)) {
      return null;
    }

    let pending = this.ensuredBanks.get(bankId);
    if (!pending) {
      pending = this.initializeBank(bankId, owner)
        .then(() => {
          this.clearBankFailure(bankId);
        })
        .catch((error) => {
          this.ensuredBanks.delete(bankId);
          this.recordBankFailure(bankId, error);
          throw error;
        });
      this.ensuredBanks.set(bankId, pending);
    }

    await pending;
    this.clearBankFailure(bankId);
    return bankId;
  }

  private buildRecallEvents(results: Array<{ id?: string; text?: string; content?: string; score?: number; document_id?: string | null }>, maxResults: number) {
    return results.slice(0, maxResults).map((item) => ({
      id: item.id ?? randomUUID(),
      summary: clip(item.text ?? item.content ?? "Relevant prior context", 260),
      relevance: Math.max(0, Math.min(1, item.score ?? 0.7)),
      sourceChatId: item.document_id ?? null
    }));
  }

  private buildPromptContext(input: {
    events: MemoryEvent[];
    reflection: string | null;
    chatTitle?: string | null;
  }) {
    const sections: string[] = [];

    if (input.events.length > 0) {
      sections.push(
        `Relevant long-term memory:\n${input.events
          .map((memory, index) => `${index + 1}. ${memory.summary}`)
          .join("\n")}`
      );
    }

    if (input.reflection) {
      sections.push(`Memory reflection:\n${clip(input.reflection, 1400)}`);
    }

    if (input.chatTitle && input.chatTitle !== "New intelligence thread") {
      sections.push(`Current thread title: ${input.chatTitle}`);
    }

    return sections.join("\n\n");
  }

  private buildStoredMemoryItem(item: unknown): MemoryBankEntry | null {
    const record = toRecord(item);
    if (!record) {
      return null;
    }

    const metadata = toRecord(record.metadata);
    const content = readString(record, "text", "content") ?? "Stored memory";
    const id = readString(record, "id");

    if (!id) {
      return null;
    }

    return {
      id,
      summary: clip(content, 140),
      content: clip(content, 420),
      kind: readString(record, "type"),
      context: readString(record, "context"),
      source: readString(metadata, "source"),
      sourceChatId: readString(record, "document_id") ?? readString(metadata, "chatId"),
      tags: readStringArray(record, "tags"),
      createdAt: readString(record, "created_at", "updated_at"),
      timestamp: readString(record, "mentioned_at", "occurred_start", "occurred_end")
    };
  }

  private buildReflectContext(input: { chatTitle?: string | null; history?: Message[]; attachmentSummaries?: string[] }) {
    const historyLines =
      input.history?.slice(-6).map((message) => `${message.role}: ${clip(message.content, 240)}`).join("\n") ?? "";

    const attachmentLine =
      input.attachmentSummaries && input.attachmentSummaries.length > 0
        ? `Attachments in play: ${input.attachmentSummaries.join(" | ")}`
        : "";

    return [input.chatTitle ? `Thread: ${input.chatTitle}` : "", historyLines, attachmentLine].filter(Boolean).join("\n");
  }

  async getStatus(owner?: MemoryOwner): Promise<HindsightStatus> {
    if (!this.client) {
      return {
        enabled: false,
        configured: false,
        reachable: false,
        authenticated: Boolean(env.HINDSIGHT_API_KEY),
        authFailed: false,
        baseUrl: env.HINDSIGHT_BASE_URL,
        reason: this.missingConfigurationReason()
      };
    }

    const bankId = owner ? this.bankIdFor(owner) : null;
    if (bankId) {
      const bankFailure = this.readBankFailure(bankId);
      if (bankFailure) {
        return {
          enabled: true,
          configured: true,
          reachable: !bankFailure.authFailed,
          authenticated: Boolean(env.HINDSIGHT_API_KEY),
          authFailed: bankFailure.authFailed,
          baseUrl: env.HINDSIGHT_BASE_URL,
          reason: bankFailure.authFailed
            ? bankFailure.reason
            : `Hindsight memory setup failed recently: ${bankFailure.reason}. Retrying shortly.`
        };
      }
    }

    try {
      const response = await fetch(new URL("/health", env.HINDSIGHT_BASE_URL), {
        signal: AbortSignal.timeout(3_000)
      });

      return {
        enabled: true,
        configured: true,
        reachable: response.ok,
        authenticated: Boolean(env.HINDSIGHT_API_KEY),
        authFailed: false,
        baseUrl: env.HINDSIGHT_BASE_URL,
        reason: response.ok ? undefined : `Health check returned ${response.status}.`
      };
    } catch (error) {
      return {
        enabled: true,
        configured: true,
        reachable: false,
        authenticated: Boolean(env.HINDSIGHT_API_KEY),
        authFailed: false,
        baseUrl: env.HINDSIGHT_BASE_URL,
        reason: error instanceof Error ? error.message : "Unable to reach Hindsight."
      };
    }
  }

  async getDetailedStatus(owner?: MemoryOwner): Promise<HindsightStatus> {
    const baseStatus = await this.getStatus(owner);
    if (!baseStatus.enabled || !baseStatus.reachable) {
      return baseStatus;
    }

    try {
      const response = await fetch(new URL("/v1/default/banks", env.HINDSIGHT_BASE_URL), {
        headers: env.HINDSIGHT_API_KEY
          ? {
              Authorization: `Bearer ${env.HINDSIGHT_API_KEY}`
            }
          : undefined,
        signal: AbortSignal.timeout(3_000)
      });

      if (response.ok) {
        return {
          ...baseStatus,
          authFailed: false
        };
      }

      return {
        ...baseStatus,
        authFailed: response.status === 401 || response.status === 403,
        reason:
          response.status === 401 || response.status === 403
            ? `Hindsight authentication failed with status ${response.status}.`
            : `Hindsight bank listing returned ${response.status}.`
      };
    } catch (error) {
      return {
        ...baseStatus,
        authFailed: isAuthenticationFailure(error),
        reason: readErrorMessage(error)
      };
    }
  }

  async listMemories(input: ListMemoriesInput): Promise<HindsightMemoryBankPayload> {
    const fallback = {
      bankId: this.bankIdFor(input),
      items: [],
      total: 0,
      limit: input.limit ?? 12,
      offset: input.offset ?? 0
    };

    if (!this.client) {
      return fallback;
    }

    try {
      const bankId = await this.ensureBank(input);
      if (!bankId) {
        return fallback;
      }

      const result = await this.client.listMemories(bankId, {
        limit: input.limit ?? 12,
        offset: input.offset ?? 0,
        q: input.q,
        type: input.type,
        consolidationState: input.consolidationState
      });

      const items = (result.items ?? [])
        .map((item) => this.buildStoredMemoryItem(item))
        .filter((item): item is MemoryBankEntry => Boolean(item));

      return {
        bankId,
        items,
        total: typeof result.total === "number" ? result.total : items.length,
        limit: typeof result.limit === "number" ? result.limit : input.limit ?? 12,
        offset: typeof result.offset === "number" ? result.offset : input.offset ?? 0
      };
    } catch (error) {
      logger.warn("Hindsight memory list failed", {
        authFailed: isAuthenticationFailure(error),
        message: readErrorMessage(error)
      });
      return fallback;
    }
  }

  async recall(input: RecallInput): Promise<HindsightRecallPayload> {
    if (!this.client || !input.shouldRecall) {
      return {
        bankId: this.bankIdFor(input),
        events: [],
        promptContext: "",
        reflection: null,
        ops: {
          recalled: false,
          reflected: false
        }
      };
    }

    let bankId: string | null = null;
    try {
      bankId = await this.ensureBank(input);
      if (!bankId) {
        return {
          bankId: null,
          events: [],
          promptContext: "",
          reflection: null,
          ops: {
            recalled: false,
            reflected: false
          }
        };
      }

      const intent = detectIntent(input.query);
      const recallResult = await this.client.recall(bankId, input.query, {
        budget: intent.wantsReflection || intent.wantsPersonalRecall ? "mid" : "low",
        includeEntities: true,
        includeSourceFacts: true,
        maxEntityTokens: 500,
        maxSourceFactsTokens: 1200
      });

      const events = this.buildRecallEvents(recallResult.results ?? [], input.maxResults ?? 4);
      let reflection: string | null = null;

      if ((intent.wantsReflection || intent.wantsPersonalRecall) && (recallResult.results?.length ?? 0) > 0) {
        try {
          const reflectResult = await this.client.reflect(bankId, input.query, {
            budget: "low",
            context: this.buildReflectContext(input)
          });
          reflection = reflectResult.text?.trim() || null;
        } catch (error) {
          logger.warn("Hindsight reflect failed", {
            bankId,
            authFailed: isAuthenticationFailure(error),
            message: readErrorMessage(error)
          });
        }
      }

      return {
        bankId,
        events,
        promptContext: this.buildPromptContext({
          events,
          reflection,
          chatTitle: input.chatTitle
        }),
        reflection,
        ops: {
          recalled: events.length > 0,
          reflected: Boolean(reflection)
        }
      };
    } catch (error) {
      logger.warn("Hindsight recall failed", {
        bankId,
        authFailed: isAuthenticationFailure(error),
        message: readErrorMessage(error)
      });
      return {
        bankId,
        events: [],
        promptContext: "",
        reflection: null,
        ops: {
          recalled: false,
          reflected: false
        }
      };
    }
  }

  async reflect(input: ReflectInput) {
    if (!this.client) {
      return null;
    }

    try {
      const bankId = await this.ensureBank(input);
      if (!bankId) {
        return null;
      }

      const result = await this.client.reflect(bankId, input.query, {
        budget: "low",
        context: this.buildReflectContext(input)
      });

      return {
        bankId,
        text: result.text
      };
    } catch (error) {
      logger.warn("Hindsight reflect failed", {
        authFailed: isAuthenticationFailure(error),
        message: readErrorMessage(error)
      });
      return null;
    }
  }

  async retainManual(input: ManualRetainInput) {
    if (!this.client) {
      return false;
    }

    try {
      const bankId = await this.ensureBank(input);
      if (!bankId) {
        return false;
      }

      await this.client.retain(bankId, input.content, {
        context: input.context,
        documentId: input.chatId ?? undefined,
        timestamp: input.timestamp,
        tags: input.tags,
        metadata: input.metadata
      });

      return true;
    } catch (error) {
      logger.warn("Hindsight manual retain failed", {
        authFailed: isAuthenticationFailure(error),
        message: readErrorMessage(error)
      });
      return false;
    }
  }

  async retainConversation(input: RetainConversationInput) {
    if (!this.client) {
      return;
    }

    try {
      const bankId = await this.ensureBank(input);
      if (!bankId) {
        return;
      }

      const intent = detectIntent(input.userMessage);
      const extractedFacts = extractRetainableFacts(input.userMessage);
      const conversationRecord = [
        `Thread: ${input.title}`,
        `Chat ID: ${input.chatId}`,
        `User: ${input.userMessage}`,
        `Assistant: ${input.assistantMessage}`,
        input.attachmentSummaries.length > 0 ? `Artifacts: ${input.attachmentSummaries.join(" | ")}` : ""
      ]
        .filter(Boolean)
        .join("\n");

      const items = [
        {
          content: conversationRecord,
          context: "conversation-turn",
          document_id: input.chatId,
          tags: ["conversation", input.mode],
          metadata: toMetadata({
            chatId: input.chatId,
            title: input.title,
            source: "chat-turn"
          })
        },
        ...extractedFacts.map((fact) => ({
          content: fact,
          context: "user-fact",
          document_id: input.chatId,
          tags: ["user-fact", input.mode],
          metadata: toMetadata({
            chatId: input.chatId,
            source: "fact-extraction"
          })
        })),
        ...input.attachmentSummaries.map((summary, index) => ({
          content: `Attachment insight: ${summary}`,
          context: "attachment-summary",
          document_id: input.chatId,
          tags: ["attachment", input.mode],
          metadata: toMetadata({
            chatId: input.chatId,
            source: `attachment-${index + 1}`
          })
        }))
      ];

      if (intent.wantsExplicitRemember) {
        items.push({
          content: `Explicit memory request: ${input.userMessage}`,
          context: "explicit-memory-request",
          document_id: input.chatId,
          tags: ["memory-request", input.mode],
          metadata: toMetadata({
            chatId: input.chatId,
            source: "explicit-memory-request"
          })
        });
      }

      await this.client.retainBatch(bankId, items, {
        documentId: input.chatId,
        documentTags: ["chat-thread", input.mode],
        async: true
      });
    } catch (error) {
      logger.warn("Hindsight retain failed", {
        userId: input.userId ?? undefined,
        guestSessionId: input.guestSessionId ?? undefined,
        authFailed: isAuthenticationFailure(error),
        message: readErrorMessage(error)
      });
    }
  }
}
