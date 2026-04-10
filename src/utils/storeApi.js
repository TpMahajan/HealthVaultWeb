import { API_BASE, getAuthHeaders } from "../constants/api";

const FORCED_LOGOUT_CODES = new Set([
  "USER_DISABLED",
  "SESSION_INVALID",
  "TOKEN_VERSION_MISMATCH",
]);

const DEFAULT_DISABLED_MESSAGE = "Your account has been deactivated by admin.";
const DEFAULT_INVALID_MESSAGE =
  "Your session is no longer valid. Please login again.";

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const emitForcedLogout = (code, message) => {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("auth-force-logout", {
        detail: {
          code,
          message:
            message ||
            (code === "USER_DISABLED"
              ? DEFAULT_DISABLED_MESSAGE
              : DEFAULT_INVALID_MESSAGE),
        },
      })
    );
  } catch {
    // Ignore event dispatch failures.
  }
};

const request = async (path, { method = "GET", body } = {}) => {
  const hasBody = body != null;
  const headers = {
    ...getAuthHeaders(),
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers,
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  const data = await parseJsonSafe(response);
  const code = String(data?.code || "").trim().toUpperCase();

  if ((response.status === 401 || response.status === 403) && FORCED_LOGOUT_CODES.has(code)) {
    emitForcedLogout(code, String(data?.message || "").trim());
  }

  if (!response.ok || data?.success === false) {
    throw new Error(
      String(data?.message || data?.msg || "Request failed").trim() ||
          "Request failed"
    );
  }

  return data;
};

export const fetchStoreProducts = async ({
  search = "",
  category = "",
  minRating = 0,
  sort = "newest",
  page = 1,
  limit = 20,
} = {}) => {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, page)));
  params.set("limit", String(Math.max(1, limit)));
  if (search.trim()) params.set("search", search.trim());
  if (category.trim()) params.set("category", category.trim());
  if (minRating > 0) params.set("minRating", String(minRating));
  if (sort.trim()) params.set("sort", sort.trim());
  return request(`/products?${params.toString()}`);
};

export const fetchStoreCart = async () => request("/cart");

export const addStoreCartItem = async ({ productId, quantity = 1 }) =>
  request("/cart/items", {
    method: "POST",
    body: { productId, quantity: Math.max(1, Number(quantity) || 1) },
  });

export const updateStoreCartItem = async ({ itemId, quantity }) =>
  request(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: { quantity: Math.max(0, Number(quantity) || 0) },
  });

export const removeStoreCartItem = async ({ itemId }) =>
  request(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });

export const createStoreOrder = async ({ delivery }) =>
  request("/orders", {
    method: "POST",
    body: { delivery },
  });

export const fetchStoreOrders = async ({ page = 1, limit = 20 } = {}) => {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, page)));
  params.set("limit", String(Math.max(1, limit)));
  return request(`/orders?${params.toString()}`);
};
