import { API_BASE, getAuthHeaders } from "../constants/api";
import { getSecureItem } from "./secureAuthStorage";

const FORCED_LOGOUT_CODES = new Set([
  "USER_DISABLED",
  "SESSION_INVALID",
  "TOKEN_VERSION_MISMATCH",
]);

const DEFAULT_DISABLED_MESSAGE = "Your account has been deactivated by admin.";
const DEFAULT_INVALID_MESSAGE =
  "Your session is no longer valid. Please login again.";

export const STORE_AUTH_REQUIRED_MESSAGE =
  "Please login to access cart and place orders.";
export const STORE_LOGIN_TO_PLACE_ORDER_MESSAGE =
  "Please login to place your order.";

const GUEST_CART_STORAGE_KEY = "mv_guest_store_cart_v1";
const GUEST_ORDERS_STORAGE_KEY = "mv_guest_store_orders_v1";
const GUEST_ORDER_PRINCIPAL_KEY = "mv_guest_store_principal_v1";
const MAX_CART_ITEM_QUANTITY = 20;

const getAccessToken = () => String(getSecureItem("token") || "").trim();

export const hasStoreAuthSession = () => Boolean(getAccessToken());

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

const asText = (value) => (value == null ? "" : String(value).trim());

const toPositiveInt = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
};

const toMoney = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Number(Math.max(0, parsed).toFixed(2));
};

const safeStorageGet = (key, fallbackValue) => {
  if (typeof window === "undefined") return fallbackValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallbackValue;
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
};

const safeStorageSet = (key, value) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
};

const safeStorageRemove = (key) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
};

const createGuestPrincipalId = () =>
  `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

const getGuestPrincipalId = ({ createIfMissing = true } = {}) => {
  const existing = asText(safeStorageGet(GUEST_ORDER_PRINCIPAL_KEY, ""));
  if (existing) return existing;
  if (!createIfMissing) return "";
  const next = createGuestPrincipalId();
  safeStorageSet(GUEST_ORDER_PRINCIPAL_KEY, next);
  return next;
};

const normalizeGuestCartItem = (item) => {
  const productId = asText(item?.productId || item?.itemId || item?.id);
  if (!productId) return null;
  return {
    itemId: productId,
    productId,
    quantity: Math.min(
      MAX_CART_ITEM_QUANTITY,
      Math.max(1, toPositiveInt(item?.quantity, 1))
    ),
    name: asText(item?.name) || "Product",
    category: asText(item?.category),
    imageUrl: asText(item?.imageUrl),
    unitPrice: toMoney(item?.unitPrice),
  };
};

const readGuestCartItems = () => {
  const rawItems = safeStorageGet(GUEST_CART_STORAGE_KEY, []);
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map(normalizeGuestCartItem).filter(Boolean);
};

const writeGuestCartItems = (items) => {
  const normalized = Array.isArray(items)
    ? items.map(normalizeGuestCartItem).filter(Boolean)
    : [];
  safeStorageSet(GUEST_CART_STORAGE_KEY, normalized);
  return normalized;
};

const mapGuestCartForClient = (items) => {
  const mappedItems = items.map((item) => {
    const quantity = Math.min(
      MAX_CART_ITEM_QUANTITY,
      Math.max(1, toPositiveInt(item?.quantity, 1))
    );
    const unitPrice = toMoney(item?.unitPrice);
    const lineTotal = toMoney(unitPrice * quantity);
    return {
      itemId: asText(item?.itemId || item?.productId),
      productId: asText(item?.productId || item?.itemId),
      quantity,
      name: asText(item?.name) || "Product",
      category: asText(item?.category),
      imageUrl: asText(item?.imageUrl),
      unitPrice,
      lineTotal,
      productStatus: null,
    };
  });

  const itemCount = mappedItems.reduce(
    (sum, item) => sum + Math.max(1, toPositiveInt(item.quantity, 1)),
    0
  );
  const subtotal = toMoney(
    mappedItems.reduce((sum, item) => sum + toMoney(item.lineTotal), 0)
  );

  return {
    items: mappedItems,
    totals: {
      itemCount,
      subtotal,
    },
    updatedAt: new Date().toISOString(),
  };
};

const buildGuestCartResponse = () => ({
  success: true,
  cart: mapGuestCartForClient(readGuestCartItems()),
});

const upsertGuestCartItem = ({ productId, quantity = 1, product } = {}) => {
  const resolvedProductId = asText(productId || product?.id || product?._id);
  if (!resolvedProductId) {
    throw new Error("Invalid productId");
  }

  const incomingQty = Math.min(
    MAX_CART_ITEM_QUANTITY,
    Math.max(1, toPositiveInt(quantity, 1))
  );
  const source = product || {};
  const snapshot = normalizeGuestCartItem({
    itemId: resolvedProductId,
    productId: resolvedProductId,
    quantity: incomingQty,
    name: source?.name,
    category: source?.category,
    imageUrl: source?.imageUrl,
    unitPrice: source?.sellingPrice ?? source?.price ?? source?.unitPrice,
  });

  const existing = readGuestCartItems();
  const index = existing.findIndex((item) => item.productId === resolvedProductId);

  if (index >= 0) {
    const current = existing[index];
    existing[index] = normalizeGuestCartItem({
      ...current,
      quantity: Math.min(
        MAX_CART_ITEM_QUANTITY,
        Math.max(1, toPositiveInt(current.quantity, 1) + incomingQty)
      ),
      // Keep latest metadata from product payload if provided.
      name: snapshot?.name || current.name,
      category: snapshot?.category || current.category,
      imageUrl: snapshot?.imageUrl || current.imageUrl,
      unitPrice:
        snapshot?.unitPrice > 0 ? snapshot.unitPrice : toMoney(current.unitPrice),
    });
  } else if (snapshot) {
    existing.push(snapshot);
  }

  writeGuestCartItems(existing);
  return mapGuestCartForClient(existing);
};

const updateGuestCartItem = ({ itemId, quantity }) => {
  const resolvedItemId = asText(itemId);
  if (!resolvedItemId) {
    throw new Error("Cart item not found");
  }

  const items = readGuestCartItems();
  const index = items.findIndex((item) => item.itemId === resolvedItemId);
  if (index < 0) {
    throw new Error("Cart item not found");
  }

  const nextQty = Math.floor(Number(quantity) || 0);
  if (nextQty <= 0) {
    items.splice(index, 1);
  } else {
    items[index] = normalizeGuestCartItem({
      ...items[index],
      quantity: Math.min(MAX_CART_ITEM_QUANTITY, Math.max(1, nextQty)),
    });
  }

  writeGuestCartItems(items);
  return mapGuestCartForClient(items);
};

const removeGuestCartItem = ({ itemId }) => {
  const resolvedItemId = asText(itemId);
  if (!resolvedItemId) {
    throw new Error("Cart item not found");
  }

  const items = readGuestCartItems();
  const before = items.length;
  const filtered = items.filter((item) => item.itemId !== resolvedItemId);
  if (filtered.length === before) {
    throw new Error("Cart item not found");
  }

  writeGuestCartItems(filtered);
  return mapGuestCartForClient(filtered);
};

const clearGuestCart = () => {
  safeStorageRemove(GUEST_CART_STORAGE_KEY);
};

const readGuestOrders = () => {
  const raw = safeStorageGet(GUEST_ORDERS_STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(Boolean);
};

const writeGuestOrders = (orders) => {
  const normalized = Array.isArray(orders) ? orders.filter(Boolean) : [];
  safeStorageSet(GUEST_ORDERS_STORAGE_KEY, normalized);
  return normalized;
};

const upsertGuestOrder = (order) => {
  const orderId = asText(order?._id || order?.id);
  if (!orderId) return;
  const existing = readGuestOrders();
  const merged = [
    order,
    ...existing.filter((entry) => asText(entry?._id || entry?.id) !== orderId),
  ];
  writeGuestOrders(merged);
};

let syncGuestCartPromise = null;

const request = async (path, { method = "GET", body, requiresAuth = false } = {}) => {
  if (requiresAuth && !hasStoreAuthSession()) {
    throw new Error(STORE_AUTH_REQUIRED_MESSAGE);
  }

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
  const responseMessage = String(data?.message || data?.msg || "").trim();

  if ((response.status === 401 || response.status === 403) && FORCED_LOGOUT_CODES.has(code)) {
    emitForcedLogout(code, String(data?.message || "").trim());
  }

  if (!response.ok || data?.success === false) {
    const error = new Error(responseMessage || "Request failed");
    error.status = response.status;
    error.code = code || "";
    throw error;
  }

  return data;
};

const syncGuestCartToServerIfNeeded = async () => {
  if (!hasStoreAuthSession()) return;

  const guestItems = readGuestCartItems();
  if (!guestItems.length) return;

  if (syncGuestCartPromise) {
    await syncGuestCartPromise;
    return;
  }

  syncGuestCartPromise = (async () => {
    for (const item of guestItems) {
      await request("/cart/items", {
        method: "POST",
        requiresAuth: true,
        body: {
          productId: item.productId,
          quantity: Math.max(1, toPositiveInt(item.quantity, 1)),
        },
      });
    }
    clearGuestCart();
  })();

  try {
    await syncGuestCartPromise;
  } finally {
    syncGuestCartPromise = null;
  }
};

export const syncGuestCartAfterLogin = async () => {
  if (!hasStoreAuthSession()) return;
  try {
    await syncGuestCartToServerIfNeeded();
  } catch {
    // Keep login resilient even if cart sync fails.
  }
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

export const fetchStoreCart = async () => {
  if (!hasStoreAuthSession()) {
    return buildGuestCartResponse();
  }

  await syncGuestCartToServerIfNeeded();
  return request("/cart", { requiresAuth: true });
};

export const addStoreCartItem = async ({ productId, quantity = 1, product } = {}) => {
  if (!hasStoreAuthSession()) {
    return {
      success: true,
      message: "Item added to cart",
      cart: upsertGuestCartItem({ productId, quantity, product }),
    };
  }

  await syncGuestCartToServerIfNeeded();
  return request("/cart/items", {
    method: "POST",
    requiresAuth: true,
    body: { productId, quantity: Math.max(1, Number(quantity) || 1) },
  });
};

export const updateStoreCartItem = async ({ itemId, quantity }) => {
  if (!hasStoreAuthSession()) {
    return {
      success: true,
      message: "Cart updated",
      cart: updateGuestCartItem({ itemId, quantity }),
    };
  }

  await syncGuestCartToServerIfNeeded();
  return request(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    requiresAuth: true,
    body: { quantity: Math.max(0, Number(quantity) || 0) },
  });
};

export const removeStoreCartItem = async ({ itemId }) => {
  if (!hasStoreAuthSession()) {
    return {
      success: true,
      message: "Item removed",
      cart: removeGuestCartItem({ itemId }),
    };
  }

  await syncGuestCartToServerIfNeeded();
  return request(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    requiresAuth: true,
  });
};

export const createStoreOrder = async ({ delivery, paymentMethod, items } = {}) => {
  const explicitItems = Array.isArray(items)
    ? items
        .map((item) => ({
          productId: asText(item?.productId || item?.id || item?._id),
          quantity: Math.max(1, toPositiveInt(item?.quantity ?? item?.qty, 1)),
        }))
        .filter((item) => Boolean(item.productId))
    : [];
  const hasExplicitItems = explicitItems.length > 0;

  if (hasStoreAuthSession()) {
    await syncGuestCartToServerIfNeeded();
    return request("/store/orders", {
      method: "POST",
      requiresAuth: true,
      body: {
        delivery,
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(hasExplicitItems ? { items: explicitItems } : {}),
      },
    });
  }

  const guestItems = hasExplicitItems
    ? explicitItems
    : readGuestCartItems().map((item) => ({
        productId: item.productId,
        quantity: Math.max(1, toPositiveInt(item.quantity, 1)),
      }));
  if (!guestItems.length) {
    throw new Error("Cart is empty");
  }

  const guestPrincipalId = getGuestPrincipalId();
  const response = await request("/store/orders", {
    method: "POST",
    body: {
      delivery,
      ...(paymentMethod ? { paymentMethod } : {}),
      guestPrincipalId,
      items: guestItems,
    },
  });

  if (!hasExplicitItems) {
    clearGuestCart();
  }
  if (response?.order) {
    upsertGuestOrder(response.order);
  }
  return response;
};

export const fetchStoreOrders = async ({ page = 1, limit = 20 } = {}) => {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, page)));
  params.set("limit", String(Math.max(1, limit)));

  if (hasStoreAuthSession()) {
    return request(`/store/orders?${params.toString()}`, { requiresAuth: true });
  }

  const guestPrincipalId = getGuestPrincipalId({ createIfMissing: false });
  if (!guestPrincipalId) {
    return {
      success: true,
      orders: [],
      pagination: {
        page: 1,
        limit: Math.max(1, limit),
        total: 0,
        totalPages: 1,
      },
    };
  }

  try {
    return await request(
      `/store/orders?${params.toString()}&guestPrincipalId=${encodeURIComponent(
        guestPrincipalId
      )}`
    );
  } catch {
    const cached = readGuestOrders();
    return {
      success: true,
      orders: cached,
      pagination: {
        page: 1,
        limit: Math.max(1, limit),
        total: cached.length,
        totalPages: 1,
      },
    };
  }
};
