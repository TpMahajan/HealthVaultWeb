// API Configuration
export const API_BASE =
  process.env.REACT_APP_API_BASE || "https://backend-medicalvault.onrender.com/api";

// ✅ Use this one because your backend exposes /api/auth/doctor/*
export const DOCTOR_API_BASE = `${API_BASE}/doctors`;

// Helper to get JSON headers with token
export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Helper to get multipart headers with token (no Content-Type here)
export const getAuthHeadersMultipart = () => {
  const token = localStorage.getItem("token");
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// ---------------- DOCTOR AUTH ----------------

// Doctor signup
export const doctorSignup = async (name, email, mobile, password) => {
  const res = await fetch(`${DOCTOR_API_BASE}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, mobile, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// Doctor login
export const doctorLogin = async (email, password) => {
  const res = await fetch(`${DOCTOR_API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ---------------- PATIENT GOOGLE AUTH (WEB) ----------------
export const googleWebAuth = async (idToken) => {
  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || `Google auth failed (${res.status})`);
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Google auth failed' };
  }
};