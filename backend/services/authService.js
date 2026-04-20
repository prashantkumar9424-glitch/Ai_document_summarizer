import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import {
  AUTH_PASSWORD_ITERATIONS,
  AUTH_SESSION_TTL_MS,
  AUTH_STORE_FILE
} from "../config.js";

const EMPTY_STORE = {
  users: [],
  sessions: []
};

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeName(name, fallback = "Guest user") {
  const trimmed = String(name || "").trim();
  return trimmed || fallback;
}

function buildTokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeStore(store) {
  return {
    users: Array.isArray(store?.users) ? store.users : [],
    sessions: Array.isArray(store?.sessions) ? store.sessions : []
  };
}

async function ensureAuthStore() {
  await fs.mkdir(path.dirname(AUTH_STORE_FILE), { recursive: true });

  try {
    await fs.access(AUTH_STORE_FILE);
  } catch {
    await fs.writeFile(AUTH_STORE_FILE, JSON.stringify(EMPTY_STORE, null, 2));
  }
}

async function readStore() {
  await ensureAuthStore();

  try {
    const raw = await fs.readFile(AUTH_STORE_FILE, "utf8");
    return sanitizeStore(JSON.parse(raw));
  } catch {
    return { ...EMPTY_STORE };
  }
}

async function writeStore(store) {
  await ensureAuthStore();
  await fs.writeFile(AUTH_STORE_FILE, JSON.stringify(sanitizeStore(store), null, 2));
}

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, AUTH_PASSWORD_ITERATIONS, 64, "sha512")
    .toString("hex");

  return {
    salt,
    hash,
    iterations: AUTH_PASSWORD_ITERATIONS
  };
}

function verifyPassword(password, passwordRecord) {
  if (!passwordRecord?.salt || !passwordRecord?.hash || !passwordRecord?.iterations) {
    return false;
  }

  const candidateHash = crypto
    .pbkdf2Sync(password, passwordRecord.salt, passwordRecord.iterations, 64, "sha512")
    .toString("hex");

  if (candidateHash.length !== passwordRecord.hash.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(candidateHash, "hex"),
    Buffer.from(passwordRecord.hash, "hex")
  );
}

function buildPublicSession({ token, sessionRecord }) {
  return {
    token,
    user: {
      id: sessionRecord.userId || null,
      name: sessionRecord.name,
      email: sessionRecord.email,
      type: sessionRecord.type
    },
    authenticatedAt: sessionRecord.createdAt,
    expiresAt: sessionRecord.expiresAt
  };
}

function createSessionRecord({ type, userId = null, name, email = "" }) {
  const token = crypto.randomBytes(32).toString("hex");
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS).toISOString();

  return {
    token,
    sessionRecord: {
      id: crypto.randomUUID(),
      tokenHash: buildTokenHash(token),
      userId,
      type,
      name,
      email,
      createdAt,
      expiresAt
    }
  };
}

function assertValidPassword(password) {
  if (String(password || "").length < 6) {
    throw new Error("Choose a password with at least 6 characters.");
  }
}

function assertValidEmail(email) {
  if (!validateEmail(email)) {
    throw new Error("Enter a valid email address.");
  }
}

async function pruneExpiredSessions(store) {
  const now = Date.now();
  const nextSessions = store.sessions.filter((session) => {
    const expiresAt = Date.parse(session.expiresAt || "");
    return Number.isFinite(expiresAt) && expiresAt > now;
  });

  if (nextSessions.length !== store.sessions.length) {
    store.sessions = nextSessions;
    await writeStore(store);
  }

  return store;
}

export async function registerUser({ fullName, email, password }) {
  const trimmedName = normalizeName(fullName, "");
  const normalizedEmail = normalizeEmail(email);

  if (!trimmedName) {
    throw new Error("Enter your name to create an account.");
  }

  assertValidEmail(normalizedEmail);
  assertValidPassword(password);

  const store = await pruneExpiredSessions(await readStore());

  if (store.users.some((user) => user.email === normalizedEmail)) {
    throw new Error("An account with this email already exists.");
  }

  const passwordRecord = createPasswordRecord(password);
  const user = {
    id: crypto.randomUUID(),
    fullName: trimmedName,
    email: normalizedEmail,
    passwordHash: passwordRecord.hash,
    passwordSalt: passwordRecord.salt,
    passwordIterations: passwordRecord.iterations,
    createdAt: new Date().toISOString()
  };

  const { token, sessionRecord } = createSessionRecord({
    type: "member",
    userId: user.id,
    name: user.fullName,
    email: user.email
  });

  store.users.push(user);
  store.sessions.push(sessionRecord);
  await writeStore(store);

  return buildPublicSession({ token, sessionRecord });
}

export async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const store = await pruneExpiredSessions(await readStore());
  const user = store.users.find((item) => item.email === normalizedEmail);

  if (!user) {
    throw new Error("We couldn't find an account with those details.");
  }

  const passwordMatches = verifyPassword(password, {
    salt: user.passwordSalt,
    hash: user.passwordHash,
    iterations: user.passwordIterations
  });

  if (!passwordMatches) {
    throw new Error("We couldn't find an account with those details.");
  }

  const { token, sessionRecord } = createSessionRecord({
    type: "member",
    userId: user.id,
    name: user.fullName,
    email: user.email
  });

  store.sessions.push(sessionRecord);
  await writeStore(store);

  return buildPublicSession({ token, sessionRecord });
}

export async function createGuestAccess({ name }) {
  const store = await pruneExpiredSessions(await readStore());
  const { token, sessionRecord } = createSessionRecord({
    type: "guest",
    name: normalizeName(name),
    email: ""
  });

  store.sessions.push(sessionRecord);
  await writeStore(store);

  return buildPublicSession({ token, sessionRecord });
}

export async function getSessionFromToken(token) {
  if (!token) {
    return null;
  }

  const store = await pruneExpiredSessions(await readStore());
  const tokenHash = buildTokenHash(token);
  const sessionRecord = store.sessions.find((session) => session.tokenHash === tokenHash);

  if (!sessionRecord) {
    return null;
  }

  if (sessionRecord.type === "member") {
    const user = store.users.find((item) => item.id === sessionRecord.userId);

    if (!user) {
      return null;
    }

    return {
      token,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        type: "member"
      },
      authenticatedAt: sessionRecord.createdAt,
      expiresAt: sessionRecord.expiresAt
    };
  }

  return {
    token,
    user: {
      id: null,
      name: sessionRecord.name,
      email: "",
      type: "guest"
    },
    authenticatedAt: sessionRecord.createdAt,
    expiresAt: sessionRecord.expiresAt
  };
}

export async function revokeSession(token) {
  if (!token) {
    return;
  }

  const store = await readStore();
  const tokenHash = buildTokenHash(token);
  const nextSessions = store.sessions.filter((session) => session.tokenHash !== tokenHash);

  if (nextSessions.length !== store.sessions.length) {
    store.sessions = nextSessions;
    await writeStore(store);
  }
}
