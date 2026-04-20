const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const SUPABASE_SESSION_STORAGE_KEY = "insights-supabase-session";

function hasConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

function buildHeaders(accessToken) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    "Content-Type": "application/json"
  };
}

function parseError(payload, fallbackMessage) {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return (
    payload?.msg ||
    payload?.error_description ||
    payload?.error ||
    fallbackMessage
  );
}

async function request(path, { method = "GET", body, accessToken } = {}) {
  if (!hasConfig()) {
    throw new Error("Supabase is not configured for this frontend.");
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: buildHeaders(accessToken),
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(parseError(payload, "Supabase request failed."));
  }

  return payload;
}

function normalizeSession(payload) {
  const session = payload?.session || payload;
  const user = payload?.user || session?.user;
  const accessToken = session?.access_token;
  const refreshToken = session?.refresh_token;

  if (!accessToken || !user?.id) {
    return null;
  }

  return {
    accessToken,
    refreshToken: refreshToken || "",
    expiresAt: session?.expires_at || null,
    user: {
      id: user.id,
      email: user.email || "",
      createdAt: user.created_at || null
    }
  };
}

function readStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SUPABASE_SESSION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.accessToken && parsed?.user?.id ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(SUPABASE_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SUPABASE_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export const supabaseAuth = {
  hasConfig,
  readStoredSession,
  writeStoredSession,
  clearStoredSession() {
    writeStoredSession(null);
  },
  async signUp({ email, password }) {
    const payload = await request("/auth/v1/signup", {
      method: "POST",
      body: { email, password }
    });

    return {
      session: normalizeSession(payload),
      raw: payload
    };
  },
  async signIn({ email, password }) {
    const payload = await request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: { email, password }
    });

    const session = normalizeSession(payload);

    if (!session) {
      throw new Error("Supabase did not return a session for this login.");
    }

    return session;
  },
  async getUser(accessToken) {
    return request("/auth/v1/user", { accessToken });
  },
  async signOut(accessToken) {
    if (!accessToken || !hasConfig()) {
      return;
    }

    await request("/auth/v1/logout", {
      method: "POST",
      accessToken
    });
  }
};
