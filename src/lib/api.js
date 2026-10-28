import { useAuth } from "./auth";

const strip = (s) => (s || "").replace(/\/$/, "");
const API_BASE = strip(import.meta.env.VITE_API_BASE_URL);

export function wsUrl(path) {
  const base = strip(import.meta.env.VITE_WS_BASE_URL);
  if (base) return `${base}${path}`;
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${path}`;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function detail(data) {
  if (!data) return "";
  if (typeof data === "string") return data.slice(0, 200);
  const d = data.detail ?? data.message ?? data.error;
  if (Array.isArray(d)) {
    return d
      .map((e) => {
        const f = Array.isArray(e.loc) ? e.loc.filter((x) => x !== "body").join(".") : "";
        return f ? `${f}: ${e.msg}` : e.msg;
      })
      .join("; ");
  }
  return typeof d === "string" ? d : "";
}

function messageFor(status, data, auth) {
  const d = detail(data);
  if (status === 401) return auth ? "Your session has expired. Please sign in again." : d || "Incorrect username, password or CAPTCHA.";
  if (status === 404) return d || "Not found. Tasks expire one hour after their last change.";
  if (status === 422) return `Invalid input${d ? `: ${d}` : "."}`;
  if (status === 503) return "The service is temporarily unavailable. Try again shortly.";
  return d || `Request failed (HTTP ${status}).`;
}

export async function apiRequest(path, { method = "GET", json, body, contentType, signal, auth = true, stream = false } = {}) {
  const token = useAuth.getState().token;
  const headers = { Accept: "application/json, text/plain, */*" };
  let payload = body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(json);
  } else if (contentType) {
    headers["Content-Type"] = contentType;
  }
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload, signal, credentials: "include" });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new ApiError("Cannot reach the server. Check your connection and try again.", 0);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let data = text;
    try { data = JSON.parse(text); } catch { /* plain text */ }
    if (res.status === 401 && auth) useAuth.getState().logout("Your session has expired. Please sign in again.");
    throw new ApiError(messageFor(res.status, data, auth), res.status);
  }
  if (stream) return res;
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}
