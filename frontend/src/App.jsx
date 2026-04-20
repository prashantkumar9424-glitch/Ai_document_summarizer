import { useEffect, useRef, useState } from "react";
import { api } from "./services/api";
import { loadUserChatHistory, saveUserChatHistoryEntry } from "./services/chatHistory";
import { supabaseAuth } from "./services/supabaseAuth";

const FALLBACK_APPLICATION_MODEL = {
  identity: {
    brand: "iNSIGHTS",
    execution: "Project HUB",
    structure: "AI To-Do engine",
    continuation: "Grant + onboarding",
    productThinking: "Deep Search",
    referenceDirection: "https://thorecoin.com/"
  },
  blueprint: [
    { label: "Execution", value: "Project HUB" },
    { label: "Structure", value: "AI To-Do engine" },
    { label: "Continuation", value: "Grant + onboarding" },
    { label: "Product thinking", value: "Deep Search" }
  ],
  workspace: {
    currentMode: {
      mode: "document-text",
      modeLabel: "iNSIGHTS",
      operatingLayer: "AI To-Do engine"
    }
  }
};

const MODE_GUIDES = {
  notes: {
    signal: "Raw-to-action pipeline",
    bestFor: "Best for pasted notes, memos, reports, and meeting captures."
  },
  document: {
    signal: "Structured file intake",
    bestFor: "Best for PDFs, DOCX, and source material entering the Project HUB."
  },
  image: {
    signal: "OCR + visual extraction",
    bestFor: "Best for screenshots, whiteboards, scans, and mobile captures."
  },
  summary: {
    signal: "Execution refinement",
    bestFor: "Best for turning an existing summary into immediate next actions."
  },
  goal: {
    signal: "Outcome ranking",
    bestFor: "Best for grant review, onboarding, and goal-specific prioritization."
  },
  conversation: {
    signal: "Continuation tracking",
    bestFor: "Best for chat logs, call transcripts, and commitment extraction."
  }
};

const AUTH_SESSION_STORAGE_KEY = "insights-auth-session";

function appendTranscript(currentValue, transcript) {
  const existing = String(currentValue || "").trim();
  const next = String(transcript || "").trim();

  if (!next) {
    return existing;
  }

  return existing ? `${existing}\n${next}` : next;
}

function getApplicationIdentity(applicationModel) {
  return applicationModel?.identity || FALLBACK_APPLICATION_MODEL.identity;
}

function getWorkspaceModes(applicationModel) {
  const identity = getApplicationIdentity(applicationModel);

  return [
    {
      id: "notes",
      label: identity.brand,
      hint: "Turn raw text into tasks, key signals, and a daily plan."
    },
    {
      id: "document",
      label: identity.execution,
      hint: "Upload source documents into the execution workspace."
    },
    {
      id: "image",
      label: "Visual Intake",
      hint: "Generate tasks from screenshots, scans, or whiteboards."
    },
    {
      id: "summary",
      label: "Execution",
      hint: "Convert an existing summary into the next concrete actions."
    },
    {
      id: "goal",
      label: identity.continuation,
      hint: "Rank only the actions that move a user toward the target outcome."
    },
    {
      id: "conversation",
      label: "Continuation",
      hint: "Extract commitments and follow-ups from conversation history."
    }
  ];
}

function getProductPillars(applicationModel) {
  return applicationModel?.blueprint || FALLBACK_APPLICATION_MODEL.blueprint;
}

function getHeroSignalItems(applicationModel) {
  const identity = getApplicationIdentity(applicationModel);

  return [
    identity.structure,
    `${identity.execution} structure`,
    identity.continuation,
    identity.productThinking,
    "Execution graphs",
    "Voice continuation"
  ];
}

function formatLabel(mode, applicationModel) {
  const match = getWorkspaceModes(applicationModel).find((item) => item.id === mode);
  return match?.label || mode;
}

function totalGraphValue(items) {
  return items.reduce((sum, item) => sum + item.value, 0);
}

function svgToDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function downloadSvgAsset(asset) {
  const blob = new Blob([asset.svg], { type: asset.mimeType || "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = asset.filename || "asset.svg";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function svgFilenameToPng(filename = "asset.svg") {
  return filename.toLowerCase().endsWith(".svg")
    ? `${filename.slice(0, -4) || "asset"}.png`
    : `${filename || "asset"}.png`;
}

async function downloadPngAsset(asset) {
  if (!asset?.svg) {
    throw new Error("No SVG asset is available for PNG export.");
  }

  const svgBlob = new Blob([asset.svg], { type: asset.mimeType || "image/svg+xml" });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Unable to render SVG as PNG in this browser."));
      nextImage.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.width || 1200;
    canvas.height = image.height || 720;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas rendering is not available in this browser.");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Unable to convert the generated SVG into a PNG file."));
          return;
        }

        resolve(blob);
      }, "image/png");
    });

    const downloadUrl = URL.createObjectURL(pngBlob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = svgFilenameToPng(asset.filename);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function summarizeHealth(health) {
  if (!health) {
    return "Checking backend";
  }

  if (!health.groqConfigured) {
    return "Groq key missing";
  }

  return health.hindsightConfigured ? "AI + memory ready" : "AI ready";
}

function readStorageValue(key, fallbackValue) {
  if (typeof window === "undefined") {
    return fallbackValue;
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function writeStorageValue(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  if (value === null || value === undefined) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function readStoredSession() {
  const session = readStorageValue(AUTH_SESSION_STORAGE_KEY, null);
  return session?.token && session?.user ? session : null;
}

function formatHistoryTimestamp(value) {
  const timestamp = Date.parse(value || "");

  if (!Number.isFinite(timestamp)) {
    return "Saved recently";
  }

  const difference = Date.now() - timestamp;
  const minutes = Math.round(difference / 60000);

  if (minutes < 1) {
    return "Saved just now";
  }

  if (minutes < 60) {
    return `Saved ${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `Saved ${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return `Saved ${days}d ago`;
}

function AuthScreen({ applicationModel, health, authNotice, onAuthenticated }) {
  const identity = getApplicationIdentity(applicationModel);
  const [activeView, setActiveView] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetMessages() {
    setError("");
  }

  function switchView(nextView) {
    setActiveView(nextView);
    resetMessages();
  }

  async function handleGuestAccess() {
    resetMessages();
    setSubmitting(true);

    try {
      const session = await api.guest({});
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError.message || "Unable to continue as guest.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    resetMessages();

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();

    if (!normalizedEmail || !password.trim()) {
      setError("Enter your email and password to continue.");
      return;
    }

    setSubmitting(true);

    try {
      if (activeView === "signup") {
        if (!trimmedName) {
          setError("Enter your name to create an account.");
          return;
        }

        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }

        const session = await api.signup({
          fullName: trimmedName,
          email: normalizedEmail,
          password
        });

        onAuthenticated(session);
        return;
      }

      const session = await api.login({
        email: normalizedEmail,
        password
      });

      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError.message || "Unable to complete authentication.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-page">
        <section className="auth-copy-block">
          <p className="eyebrow">Secure access</p>
          <h1 className="auth-title">Login to {identity.brand}</h1>
          <p className="auth-copy-text">
            Sign in to continue to the {identity.execution}. If you are new here, create an account first or use
            guest access for a quick session.
          </p>

          <div className="auth-status-row">
            <span className="status-chip">{summarizeHealth(health)}</span>
            <span className="status-chip">Backend auth enabled</span>
          </div>

          <div className="auth-simple-list">
            <article className="auth-simple-item">
              <strong>Member access</strong>
              <p>Use your email and password to enter the workspace.</p>
            </article>
            <article className="auth-simple-item">
              <strong>Guest access</strong>
              <p>Open the app without creating an account when you only need a quick session.</p>
            </article>
          </div>
        </section>

        <section className="auth-card panel">
          <div className="auth-card-top">
            <div>
              <p className="eyebrow">{activeView === "login" ? "Welcome back" : "Create account"}</p>
              <h2 className="panel-title">
                {activeView === "login" ? "Enter your account" : "Create your login"}
              </h2>
            </div>

            <div className="auth-switch" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                className={`auth-switch-button ${activeView === "login" ? "is-active" : ""}`}
                onClick={() => switchView("login")}
                disabled={submitting}
              >
                Login
              </button>
              <button
                type="button"
                className={`auth-switch-button ${activeView === "signup" ? "is-active" : ""}`}
                onClick={() => switchView("signup")}
                disabled={submitting}
              >
                Sign up
              </button>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {authNotice ? <div className="auth-notice">{authNotice}</div> : null}

            {activeView === "signup" ? (
              <>
                <label className="input-label" htmlFor="auth-name">
                  Full name
                </label>
                <input
                  id="auth-name"
                  className="workspace-field"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  disabled={submitting}
                />
              </>
            ) : null}

            <label className="input-label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              className="workspace-field"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
            />

            <label className="input-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              className="workspace-field"
              placeholder={activeView === "login" ? "Enter your password" : "Choose a password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
            />

            {activeView === "signup" ? (
              <>
                <label className="input-label" htmlFor="auth-confirm-password">
                  Confirm password
                </label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  className="workspace-field"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={submitting}
                />
              </>
            ) : null}

            {error ? <div className="error-banner">{error}</div> : null}

            <button type="submit" className="primary-button auth-submit-button" disabled={submitting}>
              {submitting ? "Please wait..." : activeView === "login" ? "Login" : "Create account"}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="ghost-button auth-guest-button"
            onClick={handleGuestAccess}
            disabled={submitting}
          >
            {submitting ? "Please wait..." : "Continue as guest"}
          </button>
        </section>
      </div>
    </div>
  );
}

function LoadingAuthScreen({ applicationModel, health }) {
  const identity = getApplicationIdentity(applicationModel);

  return (
    <div className="auth-shell">
      <section className="auth-loading panel">
        <p className="eyebrow">{identity.structure}</p>
        <h2 className="panel-title">Checking your login</h2>
        <p className="auth-copy-text">
          Restoring saved access before opening the {identity.execution}.
        </p>
        <div className="loading-row">
          <span className="spinner" />
          <span>Validating saved session</span>
        </div>
        <div className="auth-status-row">
          <span className="status-chip">{summarizeHealth(health)}</span>
          <span className="status-chip">Restoring access</span>
        </div>
      </section>
    </div>
  );
}

function SessionSidebarCard({ session, onSignOut }) {
  const isGuest = session?.user?.type === "guest";

  return (
    <div className="session-card">
      <div className="session-card-top">
        <div>
          <p className="eyebrow">Access</p>
          <strong>{session?.user?.name || "Workspace user"}</strong>
        </div>
        <span className="status-chip">{isGuest ? "Guest" : "Member"}</span>
      </div>
      <p className="session-card-copy">
        {isGuest
          ? "You are using guest mode through a backend-issued session."
          : session?.user?.email || "Signed in with a protected backend account."}
      </p>
      <button type="button" className="ghost-button button-compact" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}

function SidebarAccountCard({
  user,
  authMode,
  authEmail,
  authPassword,
  authLoading,
  authFeedback,
  hasSupabase,
  onAuthModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onLogout
}) {
  if (user) {
    return (
      <div className="session-card">
        <div className="session-card-top">
          <div>
            <p className="eyebrow">Account</p>
            <strong>{user.email || "Supabase user"}</strong>
          </div>
          <span className="status-chip">Logged in</span>
        </div>
        <p className="session-card-copy">
          Your deep-search chats are saved for this account and can be reopened from the sidebar.
        </p>
        {authFeedback ? <div className="inline-feedback">{authFeedback}</div> : null}
        <button type="button" className="ghost-button button-compact" onClick={onLogout} disabled={authLoading}>
          {authLoading ? "Please wait..." : "Log out"}
        </button>
      </div>
    );
  }

  return (
    <div className="session-card">
      <div className="session-card-top">
        <div>
          <p className="eyebrow">Optional login</p>
          <strong>Save previous chats</strong>
        </div>
        <span className="status-chip">Guest mode</span>
      </div>
      <p className="session-card-copy">
        Use the app without logging in, or sign in to reopen your previous deep-search chats from this sidebar.
      </p>

      {!hasSupabase ? (
        <div className="inline-feedback">
          Supabase is not configured yet. Add your frontend env values to enable login.
        </div>
      ) : (
        <>
          <div className="sidebar-segment">
            <button
              type="button"
              className={`sidebar-segment-button ${authMode === "login" ? "is-active" : ""}`}
              onClick={() => onAuthModeChange("login")}
              disabled={authLoading}
            >
              Login
            </button>
            <button
              type="button"
              className={`sidebar-segment-button ${authMode === "signup" ? "is-active" : ""}`}
              onClick={() => onAuthModeChange("signup")}
              disabled={authLoading}
            >
              Sign up
            </button>
          </div>

          <form className="sidebar-form" onSubmit={onSubmit}>
            <input
              type="email"
              className="workspace-field sidebar-field"
              placeholder="Email address"
              value={authEmail}
              onChange={(event) => onEmailChange(event.target.value)}
              disabled={authLoading}
            />
            <input
              type="password"
              className="workspace-field sidebar-field"
              placeholder="Password"
              value={authPassword}
              onChange={(event) => onPasswordChange(event.target.value)}
              disabled={authLoading}
            />
            {authFeedback ? <div className="inline-feedback">{authFeedback}</div> : null}
            <button type="submit" className="primary-button button-compact sidebar-submit" disabled={authLoading}>
              {authLoading ? "Please wait..." : authMode === "login" ? "Login" : "Create account"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function SidebarChatHistoryCard({ user, items, onSelect }) {
  return (
    <div className="sidebar-history-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Previous chats</p>
          <h3 className="panel-title">Saved deep-search history</h3>
        </div>
        <span className="status-chip">{user ? `${items.length} saved` : "Login required"}</span>
      </div>

      {!user ? (
        <p className="sidebar-history-empty">
          Continue as a guest if you want. Login is only needed to reopen saved chats later.
        </p>
      ) : items.length === 0 ? (
        <p className="sidebar-history-empty">
          Run a few deep-search questions and they will appear here for this account.
        </p>
      ) : (
        <div className="sidebar-history-list">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="sidebar-history-item"
              onClick={() => onSelect(item)}
            >
              <strong>{item.query}</strong>
              <span>{formatHistoryTimestamp(item.createdAt)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InsightList({ title, items, emptyMessage }) {
  return (
    <section className="summary-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Insights</p>
          <h3 className="panel-title">{title}</h3>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state empty-state-small">
          <h3>No insights yet</h3>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="bullet-stack">
          {items.map((item, index) => (
            <div key={`${item}-${index}`} className="bullet-card">
              <span className="bullet-index">{index + 1}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ProductPillars({ applicationModel }) {
  const identity = getApplicationIdentity(applicationModel);
  const pillars = getProductPillars(applicationModel);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{identity.brand}</p>
          <h3 className="panel-title">Execution language for the {identity.execution}</h3>
        </div>
        <span className="status-chip">{identity.execution}</span>
      </div>

      <div className="pillar-grid">
        {pillars.map((pillar) => (
          <article key={pillar.label} className="pillar-card">
            <h4>{pillar.label}</h4>
            <p>{pillar.value}</p>
          </article>
        ))}
      </div>

      <p className="section-footnote">
        Product direction is being shaped around the premium tone and dark, high-signal presentation seen on
        <a href={identity.referenceDirection} target="_blank" rel="noreferrer"> {identity.referenceDirection.replace(/^https?:\/\//, "")}</a>.
      </p>
    </section>
  );
}

function HeroLandingCard({ mode, health, metrics, applicationModel }) {
  const identity = getApplicationIdentity(applicationModel);
  const microCards = [
    {
      icon: "01",
      title: "Capture",
      copy: "Drop raw notes, docs, images, or conversations into one flow."
    },
    {
      icon: "02",
      title: "Prioritize",
      copy: "Turn insights into ranked tasks, deadlines, and today-first execution."
    },
    {
      icon: "03",
      title: "Continue",
      copy: "Use Deep Search to continue grant review and onboarding after the first pass."
    }
  ];

  return (
    <div className="panel hero-main-card">
      <div className="hero-frame-bar">
        <span className="hero-frame-dot" />
        <span className="hero-frame-dot" />
        <span className="hero-frame-dot" />
        <p>{identity.brand} / {identity.execution} / Execution Surface</p>
      </div>

      <div className="hero-stage">
        <div className="hero-stage-copy">
          <p className="eyebrow">{identity.brand}</p>
          <h2>Execution inside your {identity.execution}.</h2>
          <p className="hero-copy">
            Use {identity.brand} for the intelligence layer, {identity.execution} for execution, {identity.structure} for structure,
            {identity.continuation} for continuation, and {identity.productThinking} for product thinking after the first summary.
          </p>
          <div className="hero-badges">
            <span className="status-chip">Structure: {identity.execution}</span>
            <span className="status-chip">Mode: {formatLabel(mode, applicationModel)}</span>
            <span className="status-chip">Backend: {health?.status || "checking"}</span>
          </div>
        </div>

        <div className="hero-stage-card">
          <span className="hero-stage-label">Active execution signal</span>
          <strong>{metrics.taskCount}</strong>
          <p>Actionable tasks connected to insights, search, and daily execution.</p>
          <div className="hero-stage-stats">
            <div>
              <span>Insights</span>
              <strong>{metrics.insightCount}</strong>
            </div>
            <div>
              <span>Words</span>
              <strong>{metrics.wordCount}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-micro-grid">
        {microCards.map((item) => (
          <article key={item.title} className="hero-micro-card">
            <span className="hero-micro-icon">{item.icon}</span>
            <div>
              <h4>{item.title}</h4>
              <p>{item.copy}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CapabilityTicker({ applicationModel }) {
  const items = [...getHeroSignalItems(applicationModel), ...getHeroSignalItems(applicationModel)];

  return (
    <section className="signal-ticker" aria-label="Product capabilities">
      <div className="signal-ticker-track">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className="signal-ticker-item">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function SidebarIntelCard({ metrics, health, applicationModel }) {
  const identity = getApplicationIdentity(applicationModel);

  return (
    <div className="sidebar-intel-card">
      <div className="sidebar-intel-top">
        <p className="eyebrow">Signal Layer</p>
        <span className="status-chip">{summarizeHealth(health)}</span>
      </div>

      <div className="sidebar-intel-grid">
        <div>
          <span>Tasks</span>
          <strong>{metrics.taskCount}</strong>
        </div>
        <div>
          <span>Insights</span>
          <strong>{metrics.insightCount}</strong>
        </div>
        <div>
          <span>Priority</span>
          <strong>{metrics.highPriorityCount}</strong>
        </div>
      </div>

      <div className="sidebar-token-row">
        <span>{identity.productThinking}</span>
        <span>Voice</span>
        <span>Execution</span>
      </div>
    </div>
  );
}

function WorkspacePanelIntro({ mode, applicationModel }) {
  const guide = MODE_GUIDES[mode] || MODE_GUIDES.notes;
  const identity = getApplicationIdentity(applicationModel);

  return (
    <div className="workspace-helper-grid">
      <article className="workspace-helper-card">
        <span className="workspace-helper-label">Flow signal</span>
        <strong>{guide.signal}</strong>
        <p>This panel is tuned for a specific operating mode inside the {identity.execution}.</p>
      </article>
      <article className="workspace-helper-card">
        <span className="workspace-helper-label">Best for</span>
        <strong>{formatLabel(mode, applicationModel)}</strong>
        <p>{guide.bestFor}</p>
      </article>
    </div>
  );
}

function DeepSearchIntro({ applicationModel }) {
  const identity = getApplicationIdentity(applicationModel);

  return (
    <div className="search-callout">
      <div>
        <span className="workspace-helper-label">Search mode</span>
        <strong>Grounded continuation</strong>
      </div>
      <p>Use {identity.productThinking} after analysis to clarify blockers, decisions, deadlines, and the next best move.</p>
    </div>
  );
}

function HeroSignalPanel({ metrics, analysis, mode, applicationModel }) {
  const identity = getApplicationIdentity(applicationModel);
  const signalRows = [
    {
      label: "Insights captured",
      value: metrics.insightCount,
      tone: "gold"
    },
    {
      label: "High-priority actions",
      value: metrics.highPriorityCount,
      tone: "cyan"
    },
    {
      label: "Today queue",
      value: analysis?.dailyPlan?.length || 0,
      tone: "emerald"
    }
  ];

  return (
    <div className="hero-panel hero-signal-panel">
      <div className="signal-shell">
        <div className="signal-orbit">
          <div className="signal-core">
            <span className="signal-core-label">{identity.execution}</span>
            <strong>{formatLabel(mode, applicationModel)}</strong>
          </div>
          <span className="signal-node signal-node-a">AI</span>
          <span className="signal-node signal-node-b">Search</span>
          <span className="signal-node signal-node-c">Tasks</span>
        </div>

        <div className="signal-stack">
          {signalRows.map((row) => (
            <article key={row.label} className={`signal-card signal-${row.tone}`}>
              <span className="signal-card-label">{row.label}</span>
              <strong>{row.value}</strong>
            </article>
          ))}
        </div>
      </div>

      <div className="signal-footer">
        <span>Execution signal</span>
        <span>{identity.productThinking} ready</span>
        <span>{identity.continuation} continuation</span>
      </div>
    </div>
  );
}

function TaskBoard({ tasks }) {
  return (
    <section className="summary-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Execution</p>
          <h3 className="panel-title">Actionable Tasks</h3>
        </div>
        <span className="status-chip">{tasks.length} items</span>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state empty-state-small">
          <h3>No direct tasks found</h3>
          <p>This source may be informational rather than action-oriented.</p>
        </div>
      ) : (
        <div className="task-stack">
          {tasks.map((task, index) => (
            <article key={`${task.task}-${index}`} className="task-card">
              <div className="task-topline">
                <h4>{task.task}</h4>
                <span className={`priority-chip priority-${task.priority}`}>{task.priority}</span>
              </div>
              {task.description ? <p>{task.description}</p> : null}
              <div className="task-meta">
                {task.deadline ? <span>Deadline: {task.deadline}</span> : <span>Deadline: none</span>}
                {task.impactLevel ? <span>Impact: {task.impactLevel}</span> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DailyPlan({ items }) {
  return (
    <section className="summary-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Today</p>
          <h3 className="panel-title">Top 3 To Work On</h3>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state empty-state-small">
          <h3>No daily plan yet</h3>
          <p>Once tasks are extracted, the workspace will rank what should happen today.</p>
        </div>
      ) : (
        <div className="task-stack">
          {items.map((task, index) => (
            <article key={`${task.task}-${index}`} className="task-card task-card-accent">
              <div className="task-topline">
                <h4>
                  {index + 1}. {task.task}
                </h4>
                <span className={`priority-chip priority-${task.priority}`}>{task.priority}</span>
              </div>
              {task.reason ? <p>{task.reason}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function GraphCard({ title, items, onGenerate, generating }) {
  const total = totalGraphValue(items) || 1;

  return (
    <section className="summary-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Graphs</p>
          <h3 className="panel-title">{title}</h3>
        </div>
        <button
          type="button"
          className="ghost-button button-compact"
          onClick={() => onGenerate?.(title, items)}
          disabled={generating || items.length === 0}
        >
          {generating ? "Generating..." : "Generate image"}
        </button>
      </div>

      <div className="chart-stack">
        {items.map((item) => (
          <div key={item.label} className="chart-row">
            <div className="chart-copy">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <div className="chart-track">
              <div
                className="chart-fill"
                style={{
                  width: `${Math.max((item.value / total) * 100, item.value > 0 ? 8 : 0)}%`,
                  background: item.color
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function GeneratedAssetPanel({ asset, loading, onDownloadSvg, onDownloadPng, downloadBusy }) {
  return (
    <section className="summary-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Generated Media</p>
          <h3 className="panel-title">Graphs and images</h3>
        </div>
        {asset ? (
          <div className="asset-action-row">
            <button
              type="button"
              className="ghost-button button-compact"
              onClick={() => onDownloadSvg?.(asset)}
              disabled={downloadBusy}
            >
              Download SVG
            </button>
            <button
              type="button"
              className="primary-button button-compact"
              onClick={() => onDownloadPng?.(asset)}
              disabled={downloadBusy}
            >
              {downloadBusy ? "Preparing PNG..." : "Download PNG"}
            </button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="empty-state empty-state-small">
          <h3>Generating asset</h3>
          <p>The backend is building an SVG you can preview and download.</p>
        </div>
      ) : asset ? (
        <div className="asset-preview-stack">
          <div className="asset-preview-frame">
            <img src={svgToDataUrl(asset.svg)} alt={asset.filename} className="asset-preview-image" />
          </div>
          <p className="small-copy">{asset.filename}</p>
        </div>
      ) : (
        <div className="empty-state empty-state-small">
          <h3>No generated asset yet</h3>
          <p>Use the graph or poster actions to generate downloadable SVG charts and branded images.</p>
        </div>
      )}
    </section>
  );
}

function SearchResults({ result }) {
  if (!result) {
    return (
      <div className="empty-state empty-state-small">
        <h3>Deep search is ready</h3>
        <p>Ask for decisions, deadlines, blockers, or hidden action items from the latest analysis.</p>
      </div>
    );
  }

  return (
    <div className="summary-body">
      <div className="detail-block">
        <h4>Answer</h4>
        <p>{result.answer}</p>
      </div>

      <div className="detail-block">
        <h4>Key findings</h4>
        <div className="bullet-stack">
          {result.keyFindings.map((item, index) => (
            <div key={`${item}-${index}`} className="bullet-card">
              <span className="bullet-index">{index + 1}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-block">
        <h4>Supporting snippets</h4>
        <div className="snippet-stack">
          {result.supportingSnippets.map((item, index) => (
            <article key={`${item.source}-${index}`} className="snippet-card">
              <span className="snippet-source">{item.source}</span>
              <p>{item.snippet}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContinuationCard({ analysis, applicationModel }) {
  const identity = getApplicationIdentity(applicationModel);
  const filename = analysis?.filename || "current workspace";

  return (
    <section className="summary-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Continuation</p>
          <h3 className="panel-title">{identity.continuation} flow</h3>
        </div>
      </div>

      <div className="bullet-stack">
        <div className="bullet-card">
          <span className="bullet-index">1</span>
          <p>Capture insights from {filename} and convert them into a structured operating view.</p>
        </div>
        <div className="bullet-card">
          <span className="bullet-index">2</span>
          <p>Push the highest-impact items into the {identity.structure} so execution stays prioritized.</p>
        </div>
        <div className="bullet-card">
          <span className="bullet-index">3</span>
          <p>Use {identity.productThinking} to continue onboarding, clarify blockers, and surface what still needs decisions.</p>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [mode, setMode] = useState("notes");
  const [health, setHealth] = useState(null);
  const [applicationModel, setApplicationModel] = useState(FALLBACK_APPLICATION_MODEL);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [searchResult, setSearchResult] = useState(null);
  const [assetLoading, setAssetLoading] = useState(false);
  const [generatedAsset, setGeneratedAsset] = useState(null);
  const [assetDownloadLoading, setAssetDownloadLoading] = useState(false);
  const [documentText, setDocumentText] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [goalText, setGoalText] = useState("");
  const [goalDocumentText, setGoalDocumentText] = useState("");
  const [conversationText, setConversationText] = useState("");
  const [deepSearchQuery, setDeepSearchQuery] = useState("");
  const [savedChats, setSavedChats] = useState([]);
  const [accountMode, setAccountMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState("");
  const [supabaseSession, setSupabaseSession] = useState(() => supabaseAuth.readStoredSession());
  const [supabaseUser, setSupabaseUser] = useState(() => supabaseAuth.readStoredSession()?.user || null);
  const [isListening, setIsListening] = useState(false);
  const [listeningTarget, setListeningTarget] = useState("documentText");
  const [voiceFeedback, setVoiceFeedback] = useState("");
  const documentInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const identity = getApplicationIdentity(applicationModel);
  const workspaceModes = getWorkspaceModes(applicationModel);
  const hasSupabase = supabaseAuth.hasConfig();

  useEffect(() => {
    api.setAuthToken("");
    api.setUnauthorizedHandler(null);
    writeStorageValue(AUTH_SESSION_STORAGE_KEY, null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!supabaseSession?.accessToken) {
      return () => {
        cancelled = true;
      };
    }

    supabaseAuth
      .getUser(supabaseSession.accessToken)
      .then((user) => {
        if (cancelled) {
          return;
        }

        const nextSession = {
          ...supabaseSession,
          user: {
            id: user.id,
            email: user.email || supabaseSession.user?.email || "",
            createdAt: user.created_at || supabaseSession.user?.createdAt || null
          }
        };

        setSupabaseSession(nextSession);
        setSupabaseUser(nextSession.user);
        supabaseAuth.writeStoredSession(nextSession);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        supabaseAuth.clearStoredSession();
        setSupabaseSession(null);
        setSupabaseUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, [supabaseSession?.accessToken]);

  useEffect(() => {
    setSavedChats(supabaseUser?.id ? loadUserChatHistory(supabaseUser.id) : []);
  }, [supabaseUser]);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([api.health(), api.applicationModel()])
      .then(([healthResult, applicationResult]) => {
        if (cancelled) {
          return;
        }

        if (healthResult.status === "fulfilled") {
          setHealth(healthResult.value);

          if (healthResult.value?.application) {
            setApplicationModel((current) => ({
              ...current,
              identity: {
                ...current.identity,
                ...healthResult.value.application
              }
            }));
          }
        } else {
          setHealth({
            status: "error",
            groqConfigured: false,
            hindsightConfigured: false
          });
        }

        if (applicationResult.status === "fulfilled") {
          setApplicationModel(applicationResult.value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({
            status: "error",
            groqConfigured: false,
            hindsightConfigured: false
          });
        }
      });

    return () => {
      cancelled = true;
      recognitionRef.current?.stop?.();
    };
  }, []);

  function resetWorkspaceMessages() {
    setError("");
    setSearchError("");
    setVoiceFeedback("");
  }

  function resetWorkspaceState() {
    recognitionRef.current?.stop?.();
    setMode("notes");
    setLoading(false);
    setSearchLoading(false);
    setError("");
    setSearchError("");
    setAnalysis(null);
    setSearchResult(null);
    setAssetLoading(false);
    setGeneratedAsset(null);
    setAssetDownloadLoading(false);
    setDocumentText("");
    setSummaryText("");
    setGoalText("");
    setGoalDocumentText("");
    setConversationText("");
    setDeepSearchQuery("");
    setIsListening(false);
    setListeningTarget("documentText");
    setVoiceFeedback("");
  }

  async function handleSupabaseAuth(event) {
    event.preventDefault();

    if (!hasSupabase) {
      setAuthFeedback("Supabase is not configured for this frontend.");
      return;
    }

    const normalizedEmail = authEmail.trim().toLowerCase();

    if (!normalizedEmail || !authPassword.trim()) {
      setAuthFeedback("Enter both email and password to continue.");
      return;
    }

    setAuthLoading(true);
    setAuthFeedback("");

    try {
      if (accountMode === "signup") {
        const result = await supabaseAuth.signUp({
          email: normalizedEmail,
          password: authPassword
        });

        if (!result.session) {
          setAccountMode("login");
          setAuthFeedback("Account created. If email confirmation is enabled, verify your inbox and then log in.");
          return;
        }

        setSupabaseSession(result.session);
        setSupabaseUser(result.session.user);
        supabaseAuth.writeStoredSession(result.session);
        setAuthFeedback("Account created. Saved chat history is now enabled.");
      } else {
        const session = await supabaseAuth.signIn({
          email: normalizedEmail,
          password: authPassword
        });

        setSupabaseSession(session);
        setSupabaseUser(session.user);
        supabaseAuth.writeStoredSession(session);
        setAuthFeedback("Logged in. Your saved chats are ready.");
      }

      setAuthPassword("");
    } catch (authError) {
      setAuthFeedback(authError.message || "Unable to complete Supabase authentication.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSupabaseLogout() {
    setAuthLoading(true);

    try {
      await supabaseAuth.signOut(supabaseSession?.accessToken || "");
    } catch {
      // Clear local state even if the remote session is already gone.
    } finally {
      supabaseAuth.clearStoredSession();
      setSupabaseSession(null);
      setSupabaseUser(null);
      setSavedChats([]);
      setAuthPassword("");
      setAuthLoading(false);
      setAuthFeedback("Logged out. You can still use the app as a guest.");
    }
  }

  function handleOpenSavedChat(item) {
    setDeepSearchQuery(item.query || "");
    setSearchError("");
    setSearchResult({
      mode: "deep-search",
      query: item.query || "",
      answer: item.answer || "",
      keyFindings: Array.isArray(item.keyFindings) ? item.keyFindings : [],
      supportingSnippets: Array.isArray(item.supportingSnippets) ? item.supportingSnippets : []
    });
  }

  async function handleGenerateGraphImage(title, items) {
    if (!items || items.length === 0) {
      return;
    }

    setError("");
    setAssetLoading(true);

    try {
      const asset = await api.graphImage({ title, items });
      setGeneratedAsset(asset);
    } catch (requestError) {
      setError(requestError.message || "Unable to generate graph image.");
    } finally {
      setAssetLoading(false);
    }
  }

  async function handleGenerateInsightImage() {
    if (!analysis) {
      return;
    }

    setError("");
    setAssetLoading(true);

    try {
      const asset = await api.insightImage({
        title: analysis.filename || "Insight Poster",
        analysis
      });
      setGeneratedAsset(asset);
    } catch (requestError) {
      setError(requestError.message || "Unable to generate insight image.");
    } finally {
      setAssetLoading(false);
    }
  }

  async function handleDownloadPng(asset) {
    setError("");
    setAssetDownloadLoading(true);

    try {
      await downloadPngAsset(asset);
    } catch (downloadError) {
      setError(downloadError.message || "Unable to download PNG.");
    } finally {
      setAssetDownloadLoading(false);
    }
  }

  function applyTranscript(target, transcript) {
    if (target === "documentText") {
      setDocumentText((current) => appendTranscript(current, transcript));
      return;
    }

    if (target === "conversationText") {
      setConversationText((current) => appendTranscript(current, transcript));
      return;
    }

    setDeepSearchQuery((current) => appendTranscript(current, transcript));
  }

  function startVoiceCapture(target) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceFeedback("Speech recognition is not available in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop?.();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListeningTarget(target);
      setIsListening(true);
      setVoiceFeedback("Listening for voice input...");
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      applyTranscript(target, transcript);
      setVoiceFeedback("Voice note captured.");
    };

    recognition.onerror = (event) => {
      setVoiceFeedback(event.error === "not-allowed" ? "Microphone permission was denied." : "Voice capture failed.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  async function handleAnalyzeCurrentMode() {
    resetWorkspaceMessages();
    setLoading(true);
    setSearchResult(null);

    try {
      let result;

      if (mode === "notes") {
        result = await api.analyzeText({ documentText });
      } else if (mode === "summary") {
        result = await api.analyzeSummary({ summaryText });
      } else if (mode === "goal") {
        result = await api.analyzeGoal({
          userGoal: goalText,
          documentText: goalDocumentText
        });
      } else if (mode === "conversation") {
        result = await api.analyzeChatHistory({ chatHistory: conversationText });
      } else {
        throw new Error("Use the upload action for this mode.");
      }

      setAnalysis(result);
      if (result.applicationModel) {
        setApplicationModel(result.applicationModel);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to analyze this content.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDocumentUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    resetWorkspaceMessages();
    setLoading(true);
    setSearchResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api.analyzeDocument(formData);
      setAnalysis(result);
      if (result.applicationModel) {
        setApplicationModel(result.applicationModel);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to process this document.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    resetWorkspaceMessages();
    setLoading(true);
    setSearchResult(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const result = await api.analyzeImage(formData);
      setAnalysis(result);
      if (result.applicationModel) {
        setApplicationModel(result.applicationModel);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to process this image.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  async function handleDeepSearch() {
    if (!analysis) {
      setSearchError("Analyze some content first so deep search has context.");
      return;
    }

    resetWorkspaceMessages();
    setSearchLoading(true);

    try {
      const result = await api.deepSearch({
        query: deepSearchQuery,
        sourceText: analysis.sourceText,
        summary: analysis.summary,
        tasks: analysis.normalizedTasks
      });

      setSearchResult(result);

      if (supabaseUser?.id) {
        setSavedChats(
          saveUserChatHistoryEntry(supabaseUser.id, {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            query: deepSearchQuery.trim(),
            answer: result.answer,
            keyFindings: result.keyFindings || [],
            supportingSnippets: result.supportingSnippets || [],
            createdAt: new Date().toISOString()
          })
        );
      }
    } catch (requestError) {
      setSearchError(requestError.message || "Deep search failed.");
    } finally {
      setSearchLoading(false);
    }
  }

  const metrics = analysis?.metrics || {
    taskCount: 0,
    highPriorityCount: 0,
    insightCount: 0,
    wordCount: 0
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">{identity.structure}</p>
          <h1>{identity.brand}</h1>
          <p className="brand-copy">
            {identity.execution} for turning insights into execution. Use voice notes, {identity.productThinking}, and structured
            task extraction to keep {identity.continuation.toLowerCase()} moving forward.
          </p>
        </div>

        <SidebarAccountCard
          user={supabaseUser}
          authMode={accountMode}
          authEmail={authEmail}
          authPassword={authPassword}
          authLoading={authLoading}
          authFeedback={authFeedback}
          hasSupabase={hasSupabase}
          onAuthModeChange={setAccountMode}
          onEmailChange={setAuthEmail}
          onPasswordChange={setAuthPassword}
          onSubmit={handleSupabaseAuth}
          onLogout={handleSupabaseLogout}
        />

        <SidebarChatHistoryCard
          user={supabaseUser}
          items={savedChats}
          onSelect={handleOpenSavedChat}
        />

        <SidebarIntelCard metrics={metrics} health={health} applicationModel={applicationModel} />

        <nav className="nav-stack">
          {workspaceModes.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-button ${mode === item.id ? "is-active" : ""}`}
              onClick={() => {
                setMode(item.id);
                setError("");
                setVoiceFeedback("");
              }}
            >
              <span className="nav-label">{item.label}</span>
              <span className="nav-hint">{item.hint}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="status-chip">{summarizeHealth(health)}</span>
          <p>
            Voice capture uses the browser microphone, while summaries, task extraction, and deep search use the backend AI routes.
          </p>
        </div>
      </aside>

      <main className="app-main">
        <section className="hero">
          <HeroLandingCard mode={mode} health={health} metrics={metrics} applicationModel={applicationModel} />

          <HeroSignalPanel metrics={metrics} analysis={analysis} mode={mode} applicationModel={applicationModel} />
        </section>

        <CapabilityTicker applicationModel={applicationModel} />

        <ProductPillars applicationModel={applicationModel} />

        <section className="workspace-grid">
          <div className="workspace-primary">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Input</p>
                  <h3 className="panel-title">{formatLabel(mode, applicationModel)}</h3>
                </div>
                <span className="status-chip">{mode === "document" || mode === "image" ? "Upload flow" : "Text flow"}</span>
              </div>

              <WorkspacePanelIntro mode={mode} applicationModel={applicationModel} />

              {mode === "notes" ? (
                <div className="input-stack">
                  <label className="input-label" htmlFor="document-text">
                    Document content
                  </label>
                  <textarea
                    id="document-text"
                    className="workspace-input"
                    placeholder="Paste raw text or dictate meeting notes here..."
                    value={documentText}
                    onChange={(event) => setDocumentText(event.target.value)}
                  />
                  <div className="action-row">
                    <button type="button" className="primary-button" onClick={handleAnalyzeCurrentMode} disabled={loading || !documentText.trim()}>
                      {loading ? "Analyzing..." : "Extract tasks"}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => startVoiceCapture("documentText")}
                    >
                      {isListening && listeningTarget === "documentText" ? "Stop mic" : "Voice command"}
                    </button>
                  </div>
                </div>
              ) : null}

              {mode === "document" ? (
                <div className="input-stack">
                  <div className="dropzone">
                    <div className="dropzone-icon">DOC</div>
                    <h4 className="dropzone-title">Upload a document</h4>
                    <p className="dropzone-copy">
                      Supports PDF, DOCX, and TXT. The backend will summarize the file, extract tasks,
                      create key insights, and prepare graph data for the dashboard.
                    </p>
                    <button type="button" className="primary-button" onClick={() => documentInputRef.current?.click()} disabled={loading}>
                      {loading ? "Processing..." : "Choose file"}
                    </button>
                    <input
                      ref={documentInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="visually-hidden"
                      onChange={handleDocumentUpload}
                    />
                  </div>
                </div>
              ) : null}

              {mode === "image" ? (
                <div className="input-stack">
                  <div className="dropzone">
                    <div className="dropzone-icon">IMG</div>
                    <h4 className="dropzone-title">Upload an image for OCR</h4>
                    <p className="dropzone-copy">
                      Use this for screenshots, whiteboards, scanned pages, or photos with embedded text.
                    </p>
                    <button type="button" className="primary-button" onClick={() => imageInputRef.current?.click()} disabled={loading}>
                      {loading ? "Processing..." : "Choose image"}
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="visually-hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>
              ) : null}

              {mode === "summary" ? (
                <div className="input-stack">
                  <label className="input-label" htmlFor="summary-text">
                    Summary text
                  </label>
                  <textarea
                    id="summary-text"
                    className="workspace-input"
                    placeholder="Paste the AI-generated summary here..."
                    value={summaryText}
                    onChange={(event) => setSummaryText(event.target.value)}
                  />
                  <div className="action-row">
                    <button type="button" className="primary-button" onClick={handleAnalyzeCurrentMode} disabled={loading || !summaryText.trim()}>
                      {loading ? "Analyzing..." : "Generate next actions"}
                    </button>
                  </div>
                </div>
              ) : null}

              {mode === "goal" ? (
                <div className="input-stack">
                  <label className="input-label" htmlFor="goal-text">
                    User goal
                  </label>
                  <input
                    id="goal-text"
                    className="workspace-field"
                    placeholder='Example: "Launch the onboarding flow this week"'
                    value={goalText}
                    onChange={(event) => setGoalText(event.target.value)}
                  />
                  <label className="input-label" htmlFor="goal-document">
                    Supporting document
                  </label>
                  <textarea
                    id="goal-document"
                    className="workspace-input"
                    placeholder="Paste the source content that contains relevant actions..."
                    value={goalDocumentText}
                    onChange={(event) => setGoalDocumentText(event.target.value)}
                  />
                  <div className="action-row">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleAnalyzeCurrentMode}
                      disabled={loading || !goalText.trim() || !goalDocumentText.trim()}
                    >
                      {loading ? "Analyzing..." : "Rank by goal impact"}
                    </button>
                  </div>
                </div>
              ) : null}

              {mode === "conversation" ? (
                <div className="input-stack">
                  <label className="input-label" htmlFor="conversation-text">
                    Conversation history
                  </label>
                  <textarea
                    id="conversation-text"
                    className="workspace-input"
                    placeholder="Paste a meeting transcript, chat log, or call notes..."
                    value={conversationText}
                    onChange={(event) => setConversationText(event.target.value)}
                  />
                  <div className="action-row">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleAnalyzeCurrentMode}
                      disabled={loading || !conversationText.trim()}
                    >
                      {loading ? "Analyzing..." : "Extract commitments"}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => startVoiceCapture("conversationText")}
                    >
                      {isListening && listeningTarget === "conversationText" ? "Stop mic" : "Voice note"}
                    </button>
                  </div>
                </div>
              ) : null}

              {voiceFeedback ? <p className="small-copy">{voiceFeedback}</p> : null}
              {error ? <div className="error-banner">{error}</div> : null}
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Deep Search</p>
                  <h3 className="panel-title">Ask follow-up questions on the latest analysis</h3>
                </div>
                <span className="status-chip">{analysis ? "Context loaded" : "Waiting for source"}</span>
              </div>

              <DeepSearchIntro applicationModel={applicationModel} />

              <div className="input-stack">
                <textarea
                  className="workspace-input workspace-input-compact"
                  placeholder="Example: Which tasks are urgent this week? What decision is still pending? What blockers were mentioned?"
                  value={deepSearchQuery}
                  onChange={(event) => setDeepSearchQuery(event.target.value)}
                />
                <div className="action-row">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleDeepSearch}
                    disabled={searchLoading || !deepSearchQuery.trim() || !analysis}
                  >
                    {searchLoading ? "Searching..." : "Run deep search"}
                  </button>
                  <button type="button" className="ghost-button" onClick={() => startVoiceCapture("deepSearchQuery")}>
                    {isListening && listeningTarget === "deepSearchQuery" ? "Stop mic" : "Voice query"}
                  </button>
                </div>
                {searchError ? <div className="error-banner">{searchError}</div> : null}
              </div>

              <SearchResults result={searchResult} />
            </section>
          </div>

          <div className="workspace-secondary summary-stack">
            {!analysis ? (
              <section className="summary-card">
                <div className="empty-state">
                  <div className="empty-state-icon transition-float">AI</div>
                  <h3>Run an analysis to populate the dashboard</h3>
                  <p>
                    The results panel will show JSON-driven tasks, bullet insights, graph breakdowns, and a
                    ranked daily execution plan.
                  </p>
                </div>
              </section>
            ) : (
              <>
                <section className="summary-card">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Summary</p>
                      <h3 className="panel-title">
                        {analysis.filename || formatLabel(analysis.mode, applicationModel)}
                      </h3>
                    </div>
                    <span className="status-chip">{analysis.analysisMode || analysis.fileType || analysis.mode}</span>
                  </div>

                  <div className="action-row">
                    <button
                      type="button"
                      className="ghost-button button-compact"
                      onClick={handleGenerateInsightImage}
                      disabled={assetLoading}
                    >
                      {assetLoading ? "Generating..." : "Generate poster"}
                    </button>
                  </div>

                  {analysis.summary ? (
                    <div className="rich-output">{analysis.summary}</div>
                  ) : (
                    <div className="detail-block">
                      <h4>No generated summary</h4>
                      <p>This mode focused directly on task extraction.</p>
                    </div>
                  )}

                  <div className="detail-grid">
                    <div className="detail-block">
                      <span className="detail-label">Words</span>
                      <p>{analysis.metrics.wordCount}</p>
                    </div>
                    <div className="detail-block">
                      <span className="detail-label">Insights</span>
                      <p>{analysis.metrics.insightCount}</p>
                    </div>
                    <div className="detail-block">
                      <span className="detail-label">Deadlines found</span>
                      <p>{analysis.metrics.withDeadlineCount}</p>
                    </div>
                  </div>
                </section>

                <InsightList
                  title="Key Bullet Insights"
                  items={analysis.keyInsights || []}
                  emptyMessage="Insights will be derived from the generated summary or source text."
                />

                <GeneratedAssetPanel
                  asset={generatedAsset}
                  loading={assetLoading}
                  onDownloadSvg={downloadSvgAsset}
                  onDownloadPng={handleDownloadPng}
                  downloadBusy={assetDownloadLoading}
                />
                <ContinuationCard analysis={analysis} applicationModel={applicationModel} />
                <TaskBoard tasks={analysis.normalizedTasks || []} />
                <DailyPlan items={analysis.dailyPlan || []} />
                <GraphCard
                  title="Priority Distribution"
                  items={analysis.graphData?.priorityBreakdown || []}
                  onGenerate={handleGenerateGraphImage}
                  generating={assetLoading}
                />
                <GraphCard
                  title="Deadline Outlook"
                  items={analysis.graphData?.deadlineBuckets || []}
                  onGenerate={handleGenerateGraphImage}
                  generating={assetLoading}
                />
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
