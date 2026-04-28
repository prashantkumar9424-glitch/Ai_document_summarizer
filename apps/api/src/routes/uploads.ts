import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { Attachment } from "@platform/shared";
import { env } from "../config/env.js";
import { ChatService } from "../services/chat/chatService.js";
import { extractTextFromDocument } from "../services/files/extractors.js";
import { StorageService } from "../services/storage/storageService.js";
import { GroqService } from "../services/ai/groqService.js";

const storage = new StorageService();
const groq = new GroqService();
const chatService = new ChatService();

function readFieldValue(field: unknown) {
  if (!field || Array.isArray(field) || typeof field !== "object") {
    return null;
  }

  if ("value" in field && typeof field.value === "string") {
    return field.value;
  }

  return null;
}

function inferKind(mimeType: string, fileName: string): Attachment["kind"] {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(fileName)) {
    return "image";
  }
  return "document";
}

export async function uploadRoutes(app: FastifyInstance) {
  app.post("/uploads", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      reply.code(400);
      return { message: "No file uploaded." };
    }

    const buffer = await file.toBuffer();
    const sizeLimit = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
    if (buffer.byteLength > sizeLimit) {
      reply.code(413);
      return { message: `File exceeds the ${env.MAX_UPLOAD_SIZE_MB}MB limit.` };
    }

    const chatId = readFieldValue(file.fields.chatId);
    const kind = inferKind(file.mimetype, file.filename);
    const stored = await storage.storeFile({
      fileName: file.filename,
      mimeType: file.mimetype,
      buffer,
      userId: request.authContext.userId,
      guestSessionId: request.authContext.guestSessionId,
      preferRemote: request.authContext.mode === "authenticated"
    });

    const imageExtraction =
      kind === "image" ? await groq.extractImageContent({ fileName: file.filename, mimeType: file.mimetype, buffer }) : null;
    const extractedText =
      kind === "document"
        ? await extractTextFromDocument(file.filename, file.mimetype, buffer)
        : kind === "image"
          ? imageExtraction?.extractedText ?? null
          : null;
    const insight =
      kind === "image"
        ? imageExtraction?.insight ?? null
        : kind === "document"
          ? await groq.extractDocumentInsight(file.filename, extractedText ?? "")
          : null;

    const attachment: Attachment = {
      id: randomUUID(),
      chatId,
      name: file.filename,
      mimeType: file.mimetype,
      kind,
      storagePath: stored.storagePath,
      previewUrl: stored.previewUrl,
      extractedText,
      insight,
      createdAt: new Date().toISOString()
    };

    await chatService.saveAttachment({
      attachment,
      userId: request.authContext.userId,
      mode: request.authContext.mode,
      guestSessionId: request.authContext.guestSessionId
    });

    return {
      attachment,
      linkedChatId: chatId
    };
  });
}
