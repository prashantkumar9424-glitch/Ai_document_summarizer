const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body
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
}

export const httpApi = {
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
