import { buildApp } from "./app.js";
import { env, flags } from "./config/env.js";
import { logger } from "./lib/logger.js";

const app = buildApp();

app
  .listen({ port: env.PORT, host: "0.0.0.0" })
  .then(() => {
    logger.info("API listening", { port: env.PORT });
    logger.info("Runtime integrations", {
      groqConfigured: flags.hasGroq,
      groqChatModel: env.GROQ_CHAT_MODEL,
      groqTranscriptionModel: env.GROQ_TRANSCRIPTION_MODEL,
      hindsightEnabled: flags.hasHindsight,
      hindsightBaseUrl: env.HINDSIGHT_BASE_URL
    });
  })
  .catch((error) => {
    logger.error("Failed to start API", { message: error.message });
    process.exit(1);
  });
