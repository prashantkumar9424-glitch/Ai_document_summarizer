import type { FastifyInstance } from "fastify";
import { GroqService } from "../services/ai/groqService.js";

const groq = new GroqService();

function readFieldValue(field: unknown) {
  if (!field || Array.isArray(field) || typeof field !== "object") {
    return null;
  }

  if ("value" in field && typeof field.value === "string") {
    return field.value;
  }

  return null;
}

export async function voiceRoutes(app: FastifyInstance) {
  app.post("/voice/transcribe", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      reply.code(400);
      return { message: "No audio uploaded." };
    }

    const buffer = await file.toBuffer();
    const language = readFieldValue(file.fields.language);

    return groq.transcribeAudio({
      buffer,
      fileName: file.filename,
      language
    });
  });
}
