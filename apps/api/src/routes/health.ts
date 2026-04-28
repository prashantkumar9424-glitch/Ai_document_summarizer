import type { FastifyInstance } from "fastify";
import { env, flags } from "../config/env.js";

const bootedAt = new Date().toISOString();

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    status: "ok",
    bootedAt,
    integrations: {
      supabaseAuth: flags.hasSupabaseAuth,
      supabaseAdmin: flags.hasSupabaseAdmin,
      groq: flags.hasGroq,
      hindsight: flags.hasHindsight
    },
    runtime: {
      groqChatModel: env.GROQ_CHAT_MODEL,
      groqTranscriptionModel: env.GROQ_TRANSCRIPTION_MODEL,
      hindsightBaseUrl: env.HINDSIGHT_BASE_URL,
      hindsightEnabled: env.HINDSIGHT_ENABLED
    }
  }));
}
