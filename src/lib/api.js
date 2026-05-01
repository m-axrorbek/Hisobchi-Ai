const API_BASE_URL = (import.meta.env?.VITE_API_URL || "").trim();

const buildUrl = (path) => (API_BASE_URL ? `${API_BASE_URL}${path}` : path);

const request = async (path, options = {}) => {
  let response;

  try {
    response = await fetch(buildUrl(path), {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch (_error) {
    const networkError = new Error("NETWORK_ERROR");
    networkError.code = "NETWORK_ERROR";
    throw networkError;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(data?.message || data || "REQUEST_FAILED");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const assistantApi = {
  analyze(text) {
    return request("/api/assistant/analyze", {
      method: "POST",
      body: { text }
    });
  }
};

export const currencyApi = {
  rates() {
    return request("/api/currency/rates");
  }
};

export { API_BASE_URL };
