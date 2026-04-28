import { existsSync, readFileSync } from "node:fs";
import { dirname, parse, resolve } from "node:path";
import { z } from "zod";

function parseEnvValue(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function findEnvPath(startDir: string) {
  let currentDir = startDir;
  const { root } = parse(startDir);

  while (true) {
    const envPath = resolve(currentDir, ".env");
    if (existsSync(envPath)) {
      return envPath;
    }

    if (currentDir === root) {
      return null;
    }

    currentDir = dirname(currentDir);
  }
}

function loadLocalEnvFile() {
  const envPath = findEnvPath(process.cwd());
  if (!envPath) {
    return;
  }

  const shouldOverride = process.env.NODE_ENV !== "production";
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = parseEnvValue(trimmed.slice(separatorIndex + 1));

    if (shouldOverride || !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

try {
  loadLocalEnvFile();
} catch {
  // Allow environments that provide variables by other means.
}

const rawHindsightBaseUrl = process.env.HINDSIGHT_BASE_URL?.trim();
const rawHindsightApiKey = process.env.HINDSIGHT_API_KEY?.trim();
const rawHindsightBankId = process.env.HINDSIGHT_BANK_ID?.trim();

const booleanLikeSchema = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off", ""].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

function isLocalUrl(value?: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

const usesLocalHindsightServer = isLocalUrl(rawHindsightBaseUrl);
const hasHindsightApiKey = Boolean(rawHindsightApiKey);
const hasUsableHindsightConfiguration = Boolean(rawHindsightBaseUrl && (hasHindsightApiKey || usesLocalHindsightServer));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("knowledge-assets"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_CHAT_MODEL: z.string().default("llama-3.3-70b-versatile"),
  GROQ_VISION_MODEL: z.string().default("meta-llama/llama-4-scout-17b-16e-instruct"),
  GROQ_TRANSCRIPTION_MODEL: z.string().default("whisper-large-v3-turbo"),
  HINDSIGHT_API_KEY: z.string().optional(),
  HINDSIGHT_BASE_URL: z.string().url().default("http://localhost:8888"),
  HINDSIGHT_ENABLED: booleanLikeSchema.default(true),
  HINDSIGHT_BANK_ID: z.string().min(1).optional(),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(25)
});

export const env = envSchema.parse(process.env);

export const flags = {
  hasSupabaseAuth: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
  hasSupabaseAdmin: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
  hasGroq: Boolean(env.GROQ_API_KEY),
  hasHindsight: env.HINDSIGHT_ENABLED && hasUsableHindsightConfiguration
};

export const hindsightConfig = {
  enabled: env.HINDSIGHT_ENABLED,
  sharedBankId: rawHindsightBankId || null,
  baseUrl: rawHindsightBaseUrl || null,
  hasApiKey: hasHindsightApiKey,
  usesLocalServer: usesLocalHindsightServer
};
