const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
let authToken = "";
let unauthorizedHandler = null;

function withAuthHeaders(headers) {
  if (!authToken) {
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${authToken}`
  };
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const url = `${API_BASE}${path}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: withAuthHeaders(headers),
      body,
      credentials: "omit"
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (response.status === 401 && typeof unauthorizedHandler === "function" && !path.startsWith("/auth/")) {
      unauthorizedHandler(payload);
    }

    if (!response.ok) {
      const message =
        typeof payload === "string" ? payload : payload?.error || `Request failed with ${response.status}`;
      throw new Error(message);
    }

    return payload;
  } catch (error) {
    if (error instanceof TypeError) {
      console.error("Network Error:", error);
      throw new Error(
        `Network error: Unable to reach server at ${API_BASE}. Make sure the backend is running on localhost:5000`
      );
    }
    throw error;
  }
}

export const api = {
  setAuthToken(token) {
    authToken = String(token || "").trim();
  },
  setUnauthorizedHandler(handler) {
    unauthorizedHandler = typeof handler === "function" ? handler : null;
  },
  signup(payload) {
    return request("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  login(payload) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  guest(payload = {}) {
    return request("/auth/guest", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  me() {
    return request("/auth/me");
  },
  logout() {
    return request("/auth/logout", {
      method: "POST"
    });
  },
  summarizeDocument(formData) {
    return request("/summarize", {
      method: "POST",
      body: formData
    });
  },
  summarizeImage(formData) {
    return request("/image", {
      method: "POST",
      body: formData
    });
  },
  chat(payload) {
    return request("/chat", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  analyzeDocument(formData) {
    return request("/tasks/document-upload", {
      method: "POST",
      body: formData
    });
  },
  analyzeImage(formData) {
    return request("/tasks/image-upload", {
      method: "POST",
      body: formData
    });
  },
  analyzeText(payload) {
    return request("/tasks/document-text", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  analyzeSummary(payload) {
    return request("/tasks/summary", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  analyzeGoal(payload) {
    return request("/tasks/goal", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  analyzeChatHistory(payload) {
    return request("/tasks/chat", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  dailyExecution(payload) {
    return request("/tasks/daily", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  deepSearch(payload) {
    return request("/tasks/deep-search", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  graphImage(payload) {
    return request("/tasks/graph-image", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  insightImage(payload) {
    return request("/tasks/insight-image", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  applicationModel() {
    return request("/application-model");
  },
  health() {
    return request("/health");
  }
};
