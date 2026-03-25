import { API_BASE } from "../constants/api";

const SUPERADMIN_API_BASE = `${API_BASE}/superadmin`;
const PUBLIC_API_BASE = `${API_BASE}/public`;
const SUPERADMIN_TOKEN_KEY = "superadmin_token";
const SUPERADMIN_USER_KEY = "superadmin_user";

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const buildHeaders = (authRequired = true) => {
  const token = getSuperAdminToken();
  return {
    "Content-Type": "application/json",
    ...(authRequired && token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const request = async (
  path,
  {
    method = "GET",
    body,
    authRequired = true,
  } = {}
) => {
  const response = await fetch(`${SUPERADMIN_API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: buildHeaders(authRequired),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await parseJsonSafely(response);
  if (!response.ok || data?.success === false) {
    const error = new Error(
      data?.message || `Request failed with status ${response.status}`
    );
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
};

const decodeTokenExpiry = (token) => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    if (typeof payload?.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
};

export const getSuperAdminToken = () =>
  localStorage.getItem(SUPERADMIN_TOKEN_KEY);

export const getSuperAdminUser = () => {
  try {
    const raw = localStorage.getItem(SUPERADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const hasValidSuperAdminSession = () => {
  const token = getSuperAdminToken();
  if (!token) return false;
  const expiry = decodeTokenExpiry(token);
  if (!expiry) return false;
  return Date.now() < expiry;
};

export const setSuperAdminSession = (token, user) => {
  localStorage.setItem(SUPERADMIN_TOKEN_KEY, token);
  localStorage.setItem(SUPERADMIN_USER_KEY, JSON.stringify(user || {}));
};

export const clearSuperAdminSession = () => {
  localStorage.removeItem(SUPERADMIN_TOKEN_KEY);
  localStorage.removeItem(SUPERADMIN_USER_KEY);
};

export const superAdminLogin = async (email, password) => {
  const data = await request("/auth/login", {
    method: "POST",
    authRequired: false,
    body: { email, password },
  });
  if (data?.token) {
    setSuperAdminSession(data.token, data.user);
  }
  return data;
};

export const superAdminMe = () => request("/auth/me");
export const fetchDashboardStats = () => request("/dashboard/stats");
export const fetchSuperAdminAnalytics = () => request("/analytics");
export const fetchActivities = (limit = 30) =>
  request(`/activities?limit=${encodeURIComponent(limit)}`);

export const fetchUsers = ({ role = "ALL", status = "" } = {}) => {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  return request(`/users?${params.toString()}`);
};
export const createUser = (payload) =>
  request("/users", { method: "POST", body: payload });
export const updateUser = (role, id, payload) =>
  request(`/users/${encodeURIComponent(role)}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
  });
export const updateUserStatus = (role, id, status) =>
  request(`/users/${encodeURIComponent(role)}/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status },
  });
export const deleteUser = (role, id) =>
  request(`/users/${encodeURIComponent(role)}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

export const fetchAdmins = () => request("/admins");
export const createAdmin = (payload) =>
  request("/admins", { method: "POST", body: payload });
export const updateAdminPermissions = (id, permissions) =>
  request(`/admins/${encodeURIComponent(id)}/permissions`, {
    method: "PATCH",
    body: { permissions },
  });
export const updateAdminStatus = (id, status) =>
  request(`/admins/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status },
  });

export const fetchAdvertisements = (placement = "") => {
  const params = new URLSearchParams();
  if (typeof placement === "string" && placement.trim()) {
    params.set("placement", placement.trim());
  } else if (placement && typeof placement === "object") {
    if (placement.placement) params.set("placement", placement.placement);
    if (placement.country) params.set("country", placement.country);
    if (placement.state) params.set("state", placement.state);
    if (placement.region) params.set("region", placement.region);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return request(`/advertisements${query}`);
};

export const uploadAdvertisementImage = async (file) => {
  if (!file) throw new Error("Image file is required");

  const formData = new FormData();
  formData.append("image", file);

  const token = getSuperAdminToken();
  const response = await fetch(
    `${SUPERADMIN_API_BASE}/advertisements/upload-image`,
    {
      method: "POST",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }
  );

  const data = await parseJsonSafely(response);
  if (!response.ok || data?.success === false) {
    const error = new Error(
      data?.message || `Image upload failed with status ${response.status}`
    );
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
};
export const createAdvertisement = (payload) =>
  request("/advertisements", { method: "POST", body: payload });
export const updateAdvertisement = (id, payload) =>
  request(`/advertisements/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
  });
export const deleteAdvertisement = (id) =>
  request(`/advertisements/${encodeURIComponent(id)}`, { method: "DELETE" });

export const fetchProducts = (category = "") => {
  const params = new URLSearchParams();
  if (typeof category === "string" && category.trim()) {
    params.set("category", category.trim());
  } else if (category && typeof category === "object") {
    if (category.category) params.set("category", category.category);
    if (category.country) params.set("country", category.country);
    if (category.state) params.set("state", category.state);
    if (category.region) params.set("region", category.region);
    if (category.search) params.set("search", category.search);
    if (category.subCategory) params.set("subCategory", category.subCategory);
    if (category.availability) params.set("availability", category.availability);
    if (category.page) params.set("page", String(category.page));
    if (category.limit) params.set("limit", String(category.limit));
    if (typeof category.isActive === "boolean") {
      params.set("isActive", category.isActive ? "true" : "false");
    }
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return request(`/products${query}`);
};
export const fetchProductById = (id) =>
  request(`/products/${encodeURIComponent(id)}`);
export const fetchPublicProducts = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", String(filters.category).trim());
  if (filters?.country) params.set("country", String(filters.country).trim());
  if (filters?.state) params.set("state", String(filters.state).trim());
  if (filters?.region) params.set("region", String(filters.region).trim());
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${PUBLIC_API_BASE}/products${query}`, {
    headers: { "Content-Type": "application/json" },
  });
  const data = await parseJsonSafely(response);
  if (!response.ok || data?.success === false) {
    const error = new Error(
      data?.message || `Request failed with status ${response.status}`
    );
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
};
export const createProduct = (payload) =>
  request("/products", { method: "POST", body: payload });
export const updateProduct = (id, payload) =>
  request(`/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
  });
export const deleteProduct = (id) =>
  request(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });

export const fetchUiConfig = () => request("/ui-config");
export const updateUiConfig = (payload) =>
  request("/ui-config", { method: "PUT", body: payload });
export const fetchAlerts = (includeExpired = false, limit = 50) =>
  request(
    `/alerts?includeExpired=${encodeURIComponent(
      includeExpired ? "true" : "false"
    )}&limit=${encodeURIComponent(limit)}`
  );
export const broadcastAlert = (payload) =>
  request("/alerts/broadcast", { method: "POST", body: payload });
export const fetchSuperAdminNotifications = (limit = 50) =>
  request(`/notifications?limit=${encodeURIComponent(limit)}`);
export const broadcastSuperAdminNotification = (payload) =>
  request("/notifications/broadcast", { method: "POST", body: payload });

export const fetchSecurityAuditLogs = async ({
  page = 1,
  limit = 10,
  source = "",
  action = "",
} = {}) => {
  const token = getSuperAdminToken();
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (source) params.set("source", source);
  if (action) params.set("action", action);

  const response = await fetch(`${API_BASE}/admin/audit-logs?${params.toString()}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
  const data = await parseJsonSafely(response);
  if (!response.ok || data?.success === false) {
    const error = new Error(data?.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
};

export const fetchWebLandingAds = async () => {
  const response = await fetch(
    `${PUBLIC_API_BASE}/ads?placement=${encodeURIComponent("WEB_LANDING")}`,
    { headers: { "Content-Type": "application/json" } }
  );
  const data = await parseJsonSafely(response);
  if (!response.ok || data?.success === false) return [];
  return Array.isArray(data?.ads) ? data.ads : [];
};

export const fetchTrackedAdUrl = async ({
  adId,
  platform = "web",
  surface = "WEB_LANDING",
  userId = "",
  userType = "",
  sourceApp = "web",
  sessionId = "",
}) => {
  if (!adId) return "";
  try {
    const response = await fetch(
      `${PUBLIC_API_BASE}/ads/${encodeURIComponent(adId)}/click`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          surface,
          userId,
          userType,
          sourceApp,
          sessionId,
        }),
      }
    );
    const data = await parseJsonSafely(response);
    if (!response.ok || data?.success === false) return "";
    return data?.trackedUrl ? String(data.trackedUrl) : "";
  } catch {
    return "";
  }
};

export const PERMISSIONS = [
  "MANAGE_PRODUCTS",
  "MANAGE_ORDERS",
  "VIEW_SOS",
  "HANDLE_SOS",
  "VIEW_TICKETS",
  "REPLY_TICKETS",
  "VIEW_AUDIT_LOGS",
  "VIEW_SECURITY_ALERTS",
];
export const USER_ROLES = ["PATIENT", "DOCTOR", "ADMIN"];
export const USER_STATUS = ["ACTIVE", "BLOCKED"];
export const AD_PLACEMENTS = ["APP_DASHBOARD", "WEB_LANDING", "QR_PAGE"];
export const GEO_SCOPES = ["GLOBAL", "TARGETED"];
export const CARD_STYLES = ["ROUNDED", "GLASS", "SOLID", "MINIMAL"];
export const THEME_MODES = ["LIGHT", "DARK", "SYSTEM"];
export const ALERT_AUDIENCES = ["ALL", "PATIENT", "DOCTOR"];
export const ALERT_PLATFORM_OPTIONS = ["ALL", "APP", "WEB"];
export const ALERT_PLATFORMS = ["APP", "WEB"];
