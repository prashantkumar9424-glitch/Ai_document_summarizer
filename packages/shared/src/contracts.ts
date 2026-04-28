import { z } from "zod";

export const roleSchema = z.enum(["system", "user", "assistant"]);
export type Role = z.infer<typeof roleSchema>;

export const userModeSchema = z.enum(["guest", "authenticated"]);
export type UserMode = z.infer<typeof userModeSchema>;

function coerceInsightListItem(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const preferredKeys = ["text", "summary", "title", "label", "highlight", "value", "content", "description", "quote"];

  for (const key of preferredKeys) {
    const candidate = record[key];
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  try {
    return JSON.stringify(record);
  } catch {
    return null;
  }
}

function coerceInsightList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(coerceInsightListItem).filter((item): item is string => Boolean(item));
}

const insightListSchema = z.preprocess(coerceInsightList, z.array(z.string())).default([]);

export const insightSchema = z.object({
  title: z.string(),
  summary: z.string(),
  decisions: insightListSchema,
  actionItems: insightListSchema,
  risks: insightListSchema,
  highlights: insightListSchema
});
export type Insight = z.infer<typeof insightSchema>;

export const attachmentSchema = z.object({
  id: z.string(),
  chatId: z.string().nullable(),
  name: z.string(),
  mimeType: z.string(),
  kind: z.enum(["document", "image", "audio"]),
  storagePath: z.string(),
  previewUrl: z.string().nullable(),
  extractedText: z.string().nullable(),
  insight: insightSchema.nullable(),
  createdAt: z.string()
});
export type Attachment = z.infer<typeof attachmentSchema>;

export const memoryEventSchema = z.object({
  id: z.string(),
  summary: z.string(),
  relevance: z.number().min(0).max(1),
  sourceChatId: z.string().nullable()
});
export type MemoryEvent = z.infer<typeof memoryEventSchema>;

export const memoryStatusSchema = z.object({
  enabled: z.boolean(),
  configured: z.boolean(),
  reachable: z.boolean(),
  authenticated: z.boolean(),
  authFailed: z.boolean().default(false),
  baseUrl: z.string(),
  reason: z.string().optional()
});
export type MemoryStatus = z.infer<typeof memoryStatusSchema>;

export const memoryBankEntrySchema = z.object({
  id: z.string(),
  summary: z.string(),
  content: z.string(),
  kind: z.string().nullable(),
  context: z.string().nullable(),
  source: z.string().nullable(),
  sourceChatId: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().nullable(),
  timestamp: z.string().nullable()
});
export type MemoryBankEntry = z.infer<typeof memoryBankEntrySchema>;

export const memoryBankSchema = z.object({
  bankId: z.string().nullable(),
  items: z.array(memoryBankEntrySchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative()
});
export type MemoryBank = z.infer<typeof memoryBankSchema>;

export const messageSchema = z.object({
  id: z.string(),
  role: roleSchema,
  content: z.string(),
  createdAt: z.string(),
  attachmentIds: z.array(z.string()).default([]),
  recall: z.array(memoryEventSchema).default([])
});
export type Message = z.infer<typeof messageSchema>;

export const chatSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  mode: userModeSchema,
  lastMessageAt: z.string(),
  attachmentCount: z.number().int().nonnegative()
});
export type ChatSummary = z.infer<typeof chatSummarySchema>;

export const chatDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  mode: userModeSchema,
  createdAt: z.string(),
  lastMessageAt: z.string(),
  messages: z.array(messageSchema),
  attachments: z.array(attachmentSchema)
});
export type ChatDetail = z.infer<typeof chatDetailSchema>;

export const authSessionSchema = z.object({
  mode: userModeSchema,
  accessToken: z.string().nullable(),
  user: z
    .object({
      id: z.string(),
      email: z.string().email().nullable()
    })
    .nullable()
});
export type AuthSession = z.infer<typeof authSessionSchema>;

export const createChatSchema = z.object({
  title: z.string().min(1).max(120).optional()
});
export type CreateChatInput = z.infer<typeof createChatSchema>;

export const sendMessageSchema = z.object({
  chatId: z.string().optional(),
  content: z.string().min(1),
  attachmentIds: z.array(z.string()).default([]),
  resetContext: z.boolean().default(false),
  language: z.string().default("auto")
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const chatResponseSchema = z.object({
  chat: chatDetailSchema,
  reply: messageSchema,
  recalledMemory: z.array(memoryEventSchema),
  generatedInsight: insightSchema.nullable()
});
export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const uploadKindSchema = z.enum(["document", "image", "audio"]);
export type UploadKind = z.infer<typeof uploadKindSchema>;

export const uploadResponseSchema = z.object({
  attachment: attachmentSchema,
  linkedChatId: z.string().nullable()
});
export type UploadResponse = z.infer<typeof uploadResponseSchema>;

export const voiceTranscriptionSchema = z.object({
  text: z.string(),
  language: z.string()
});
export type VoiceTranscription = z.infer<typeof voiceTranscriptionSchema>;
