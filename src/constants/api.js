import { getSecureItem } from "../utils/secureAuthStorage";

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const env = typeof import.meta !== "undefined" ? import.meta.env : {};
const isDevEnvironment = Boolean(env?.DEV);

const normalizeApiBase = (rawValue) => {
  const trimmed = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!trimmed) return "";

  const normalized = trimmed.replace(/\/+$/, "");
  if (/\/api(?:\/v\d+)?$/i.test(normalized)) {
    return normalized;
  }
  return `${normalized}/api`;
};

const configuredApiBase = normalizeApiBase(env?.VITE_API_BASE);

const normalizeGoogleClientId = (rawValue) => {
  const trimmed = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!trimmed) return "";
  if (/^%VITE_[A-Z0-9_]+%$/.test(trimmed)) return "";
  return trimmed;
};

const configuredGoogleClientId = normalizeGoogleClientId(
  env?.VITE_GOOGLE_CLIENT_ID
);

const runtimeGoogleClientId = normalizeGoogleClientId(
  typeof window !== "undefined" ? window.__GOOGLE_CLIENT_ID__ : ""
);

const isPlaceholderGoogleClientId =
  !configuredGoogleClientId ||
  configuredGoogleClientId === "your-google-client-id.apps.googleusercontent.com";

export const API_BASE =
  configuredApiBase ||
  (isDevEnvironment || isLocalhost
    ? "http://localhost:5000/api"
    : "https://backend-medicalvault.onrender.com/api");

export const GOOGLE_CLIENT_ID =
  (!isPlaceholderGoogleClientId ? configuredGoogleClientId : "") ||
  runtimeGoogleClientId;

export const DOCTOR_API_BASE = `${API_BASE}/doctors`;

export const getAuthHeaders = () => {
  const token = getSecureItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const getAuthHeadersMultipart = () => {
  const token = getSecureItem("token");
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const doctorSignup = async (name, email, mobile, password) => {
  const res = await fetch(`${DOCTOR_API_BASE}/signup`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, mobile, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const doctorLogin = async (email, password) => {
  const res = await fetch(`${DOCTOR_API_BASE}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const googleWebAuth = async (idToken) => {
  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || `Google auth failed (${res.status})`);
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || "Google auth failed" };
  }
};
