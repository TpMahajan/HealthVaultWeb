const ADMIN_ORDERS_STORAGE_KEY = "mv_orders";

export const STORE_GST_RATE = 0.18;
export const STORE_BASE_DELIVERY_FEE = 40;
export const STORE_FREE_DELIVERY_THRESHOLD = 599;

const asText = (value) => (value == null ? "" : String(value).trim());

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
    // Ignore persistence failures.
  }
};

export const computeCheckoutBreakdown = (subtotalValue) => {
  const subtotal = toMoney(subtotalValue);
  const gst = toMoney(subtotal * STORE_GST_RATE);
  const deliveryCharges =
    subtotal >= STORE_FREE_DELIVERY_THRESHOLD ? 0 : STORE_BASE_DELIVERY_FEE;
  const total = toMoney(subtotal + gst + deliveryCharges);

  return {
    subtotal,
    gst,
    deliveryCharges,
    total,
  };
};

export const persistOrderForAdminPanel = ({ order, totalsOverride } = {}) => {
  if (typeof window === "undefined") return null;

  const createdAt = order?.createdAt || new Date().toISOString();
  const orderId =
    asText(order?._id) ||
    asText(order?.id) ||
    `MV-${Date.now().toString(36).toUpperCase()}`;

  const delivery = order?.delivery || {};
  const items = Array.isArray(order?.items)
    ? order.items.map((item) => ({
        id: asText(item?.productId || item?._id),
        name: asText(item?.name) || "Product",
        qty: Math.max(1, Number(item?.quantity || item?.qty || 1)),
        unitPrice: toMoney(item?.unitPrice || 0),
        imageUrl: asText(item?.imageUrl),
      }))
    : [];

  const fallbackSubtotal = toMoney(
    items.reduce(
      (sum, item) => sum + toMoney(item.unitPrice) * Math.max(1, Number(item.qty || 1)),
      0
    )
  );

  const backendSubtotal = toMoney(order?.totals?.subtotal ?? fallbackSubtotal);
  const computedTotals = computeCheckoutBreakdown(backendSubtotal);
  const mergedTotals = {
    ...computedTotals,
    ...(totalsOverride || {}),
  };

  const normalized = {
    orderId,
    backendOrderId: asText(order?._id || order?.id),
    date: createdAt,
    status: "Pending",
    paymentMethod: asText(order?.paymentMethod || "cod").toLowerCase(),
    paymentStatus: "Pending",
    subtotal: toMoney(mergedTotals.subtotal),
    gst: toMoney(mergedTotals.gst),
    deliveryCharges: toMoney(mergedTotals.deliveryCharges),
    total: toMoney(mergedTotals.total),
    items,
    address: {
      name: asText(delivery.fullName) || "Customer",
      phone: asText(delivery.phone),
      line1: asText(delivery.addressLine1),
      line2: asText(delivery.addressLine2),
      city: asText(delivery.city),
      state: asText(delivery.state),
      pin: asText(delivery.pincode),
    },
  };

  const previous = safeStorageGet(ADMIN_ORDERS_STORAGE_KEY, []);
  const existing = Array.isArray(previous) ? previous : [];
  const merged = [
    normalized,
    ...existing.filter((entry) => asText(entry?.orderId) !== normalized.orderId),
  ];

  safeStorageSet(ADMIN_ORDERS_STORAGE_KEY, merged);
  return normalized;
};
