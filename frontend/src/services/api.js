const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const url = `${API_BASE}${path}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      credentials: "omit"
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        typeof payload === "string" ? payload : payload?.error || `Request failed with ${response.status}`;
      throw new Error(message);
    }

    return payload;
  } catch (error) {
    // Network error or fetch failure
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
  health() {
    return request("/health");
  }
};
