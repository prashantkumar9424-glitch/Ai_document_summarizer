import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { authContextHook } from "./middleware/authContext.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { chatRoutes } from "./routes/chats.js";
import { memoryRoutes } from "./routes/memory.js";
import { uploadRoutes } from "./routes/uploads.js";
import { voiceRoutes } from "./routes/voice.js";

export function buildApp() {
  const app = Fastify({
    logger: false,
    bodyLimit: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024
  });

  app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true
  });

  app.register(multipart, {
    limits: {
      fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    }
  });

  app.setErrorHandler((error, request, reply) => {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    logger.error("Request failed", {
      message,
      path: request.url,
      statusCode: reply.statusCode || 500
    });
    reply.code(reply.statusCode >= 400 ? reply.statusCode : 500).send({
      message
    });
  });

  app.addHook("preHandler", authContextHook);

  app.register(async (api) => {
    api.register(healthRoutes);
    api.register(authRoutes);
    api.register(chatRoutes);
    api.register(memoryRoutes);
    api.register(uploadRoutes);
    api.register(voiceRoutes);
  }, { prefix: "/api" });

  return app;
}
