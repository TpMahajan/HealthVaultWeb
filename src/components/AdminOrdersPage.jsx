import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../constants/api";

const STATUS_OPTIONS = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const STATUS_COLOR = {
  Pending: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  Confirmed: { bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0" },
  Processing: { bg: "#DBEAFE", text: "#1D4ED8", border: "#BFDBFE" },
  Shipped: { bg: "#F3E8FF", text: "#7C3AED", border: "#E9D5FF" },
  Delivered: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
  Cancelled: { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" },
};

const PAYMENT_BADGE = {
  upi: "UPI",
  card: "CARD",
  netbanking: "BANK",
  wallet: "WALLET",
  cod: "COD",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

function adminHeaders() {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizeStatus(value) {
  const status = String(value || "").trim().toUpperCase();
  if (!status) return "Pending";
  if (status === "PLACED" || status === "PENDING") return "Pending";
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "PROCESSING") return "Processing";
  if (status === "SHIPPED") return "Shipped";
  if (status === "DELIVERED") return "Delivered";
  if (status === "CANCELLED" || status === "CANCELED") return "Cancelled";
  return "Pending";
}

function formatDate(value) {
  if (!value) return "-";
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    const datePart = parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timePart = parsed
      .toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .toUpperCase();
    return `${datePart}, ${timePart}`;
  } catch {
    return String(value);
  }
}

function formatDateOnly(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatTimeOnly(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "-";
  }
}

function normalizePaymentStatus(value, paymentMethod) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "PAID") return "Paid";
  if (normalized === "FAILED") return "Failed";
  if (normalized === "PENDING_PAYMENT") return "Pending Payment";
  if (normalized) return normalized;
  return String(paymentMethod || "").toLowerCase() === "cod"
    ? "Pending Payment"
    : "Paid";
}

function mapOrderForAdmin(raw) {
  const orderId = String(raw?.orderId || raw?._id || "").trim();
  const delivery = raw?.address || raw?.delivery || {};
  const items = Array.isArray(raw?.items) ? raw.items : [];
  const subtotal = Number(raw?.subtotal ?? raw?.totals?.subtotal ?? 0);
  const total = Number(raw?.total ?? raw?.totals?.total ?? subtotal);
  const paymentMethod = String(raw?.paymentMethod || "cod").toLowerCase();
  const date = raw?.date || raw?.createdAt || raw?.orderDate || null;

  return {
    _id: String(raw?._id || orderId),
    orderId,
    status: normalizeStatus(raw?.status || raw?.orderStatus),
    date,
    subtotal,
    total,
    paymentMethod,
    paymentStatus: normalizePaymentStatus(raw?.paymentStatus, paymentMethod),
    items: items.map((item, index) => ({
      id: String(item?.id || item?._id || item?.productId || index),
      name: String(item?.name || "Product"),
      qty: Math.max(1, Number(item?.qty || item?.quantity || 1)),
      unitPrice: Math.max(0, Number(item?.unitPrice || 0)),
      imageUrl: String(item?.imageUrl || ""),
    })),
    address: {
      name: String(
        delivery?.name || delivery?.fullName || delivery?.customerName || "Customer"
      ),
      phone: String(delivery?.phone || ""),
      alternatePhone: String(delivery?.alternatePhone || ""),
      email: String(
        delivery?.email ||
          raw?.email ||
          raw?.customerEmail ||
          raw?.userEmail ||
          raw?.customer?.email ||
          raw?.user?.email ||
          ""
      ),
      line1: String(delivery?.line1 || delivery?.addressLine1 || ""),
      line2: String(delivery?.line2 || delivery?.addressLine2 || ""),
      areaStreet: String(
        delivery?.area || delivery?.street || delivery?.line2 || delivery?.addressLine2 || ""
      ),
      city: String(delivery?.city || ""),
      state: String(delivery?.state || ""),
      pin: String(delivery?.pin || delivery?.pincode || ""),
      landmark: String(
        delivery?.landmark || delivery?.landMark || delivery?.locationHint || ""
      ),
      notes: String(delivery?.notes || ""),
    },
  };
}

function computeStats(orders) {
  const total = orders.length;
  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pending = orders.filter((order) =>
    ["Pending", "Confirmed", "Processing", "Shipped"].includes(order.status)
  ).length;
  const delivered = orders.filter((order) => order.status === "Delivered").length;

  return { total, revenue, pending, delivered };
}

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [stats, setStats] = useState({ total: 0, revenue: 0, pending: 0, delivered: 0 });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const perPage = 10;

  const applyOrders = (rawOrders) => {
    const normalized = Array.isArray(rawOrders)
      ? rawOrders.map(mapOrderForAdmin).filter((entry) => entry.orderId)
      : [];
    setOrders(normalized);
    setStats(computeStats(normalized));
  };

  const loadOrders = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/orders?limit=500`, {
        method: "GET",
        credentials: "include",
        headers: adminHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Failed to fetch admin orders");
      }
      const rows = data?.data?.orders || data?.orders || [];
      applyOrders(rows);
    } catch (err) {
      setError(err?.message || "Failed to fetch admin orders");
      applyOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const refreshHandler = () => loadOrders();
    window.addEventListener("inventory:refresh", refreshHandler);
    return () => window.removeEventListener("inventory:refresh", refreshHandler);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus]);

  const updateStatus = async (orderId, nextStatus) => {
    if (!orderId) return;
    try {
      const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: "PUT",
        credentials: "include",
        headers: adminHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Failed to update order status");
      }

      setOrders((prev) => {
        const nextOrders = prev.map((order) =>
          order.orderId === orderId
            ? { ...order, status: normalizeStatus(nextStatus) }
            : order
        );
        setStats(computeStats(nextOrders));
        return nextOrders;
      });
      setSelected((prev) =>
        prev && prev.orderId === orderId
          ? { ...prev, status: normalizeStatus(nextStatus) }
          : prev
      );
      window.dispatchEvent(new Event("inventory:refresh"));
    } catch (err) {
      window.alert(err?.message || "Unable to update status");
    }
  };

  const deleteOrder = () => {
    window.alert("Delete is not enabled for synced orders.");
  };

  const filtered = useMemo(
    () =>
      orders.filter((order) => {
        const q = search.trim().toLowerCase();
        const matchSearch =
          !q ||
          order.orderId.toLowerCase().includes(q) ||
          order.address.name.toLowerCase().includes(q) ||
          order.items.some((item) => item.name.toLowerCase().includes(q));
        const matchStatus = filterStatus === "All" || order.status === filterStatus;
        return matchSearch && matchStatus;
      }),
    [orders, search, filterStatus]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pagedOrders = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes aopFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes aopModal { from { opacity: 0; transform: scale(.97); } to { opacity: 1; transform: none; } }
        .aop-row { transition: background .15s; cursor: pointer; }
        .aop-row:hover { background: #F0FDFA !important; }
        .aop-btn { border: none; cursor: pointer; font-family: inherit; font-weight: 700; transition: transform .14s, box-shadow .14s; }
        .aop-btn:hover { transform: translateY(-1px); }
        .aop-btn:active { transform: scale(.97); }
        .aop-select { border: 1.5px solid #E2E8F0; border-radius: 8px; padding: 5px 10px; font-family: inherit; font-size: 13px; font-weight: 600; color: #0F172A; background: #F8FAFC; outline: none; cursor: pointer; }
        .aop-select:focus { border-color: #00A3A0; }
      `}</style>

      <header
        style={{
          background: "white",
          borderBottom: "1px solid #E2E8F0",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <img src="/app_icon.png" alt="Medical Vault" style={{ width: 28, height: 28, objectFit: "contain" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#0F172A" }}>Medical Vault - Admin Orders</div>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>Manage all customer orders</div>
        </div>
        <button
          className="aop-btn"
          onClick={() => navigate("/admin/dashboard")}
          style={{
            height: 38,
            padding: "0 16px",
            borderRadius: 10,
            border: "1.5px solid #E2E8F0",
            background: "white",
            color: "#475569",
            fontSize: 13,
          }}
        >
          {"<"} Dashboard
        </button>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 80px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginBottom: 28,
            animation: "aopFade .3s ease",
          }}
        >
          {[
            { label: "Total Orders", value: stats.total, icon: "ORD", color: "#2563EB" },
            { label: "Total Revenue", value: formatCurrency(stats.revenue), icon: "REV", color: "#16A34A" },
            { label: "Active Orders", value: stats.pending, icon: "ACT", color: "#F59E0B" },
            { label: "Delivered", value: stats.delivered, icon: "DONE", color: "#00A3A0" },
          ].map((card, index) => (
            <div
              key={index}
              style={{
                background: "white",
                borderRadius: 16,
                border: "1.5px solid #E2E8F0",
                padding: "18px 20px",
                boxShadow: "0 2px 12px rgba(0,0,0,.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: `${card.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {card.icon}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".07em" }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#0F172A", marginTop: 2 }}>
                    {card.value}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 16,
            border: "1.5px solid #E2E8F0",
            padding: "16px 20px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <svg
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by order ID, customer, product..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{
                width: "100%",
                height: 40,
                paddingLeft: 36,
                paddingRight: 14,
                borderRadius: 10,
                border: "1.5px solid #E2E8F0",
                background: "#F8FAFC",
                fontSize: 13,
                fontFamily: "inherit",
                color: "#0F172A",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Status:</span>
            <select className="aop-select" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
              <option>All</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <button
            className="aop-btn"
            onClick={loadOrders}
            style={{
              height: 40,
              padding: "0 16px",
              borderRadius: 10,
              background: "linear-gradient(135deg,#00A3A0,#2563EB)",
              color: "white",
              fontSize: 13,
            }}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 18,
            border: "1.5px solid #E2E8F0",
            overflow: "hidden",
            boxShadow: "0 2px 16px rgba(0,0,0,.04)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "170px minmax(260px,1fr) 190px 140px 150px 150px",
              gap: 14,
              padding: "12px 20px",
              background: "#F8FAFC",
              borderBottom: "1.5px solid #E2E8F0",
            }}
          >
            {[
              { label: "Order ID", align: "left" },
              { label: "Customer & Items", align: "left" },
              { label: "Date", align: "left" },
              { label: "Total", align: "right" },
              { label: "Payment", align: "left" },
              { label: "Status", align: "left" },
            ].map((header, index) => (
              <div
                key={index}
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#94A3B8",
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  textAlign: header.align,
                  whiteSpace: "nowrap",
                }}
              >
                {header.label}
              </div>
            ))}
          </div>

          {error ? (
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #FECACA", background: "#FEF2F2", color: "#B91C1C", fontSize: 13, fontWeight: 700 }}>
              {error}
            </div>
          ) : null}

          {pagedOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontSize: 32, marginBottom: 12, fontWeight: 900, color: "#94A3B8" }}>
                ORDERS
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A" }}>No Orders Found</div>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>
                {orders.length === 0
                  ? "No orders have been placed yet."
                  : "Try adjusting your search or filter."}
              </div>
            </div>
          ) : (
            pagedOrders.map((order, index) => {
              const style = STATUS_COLOR[order.status] || STATUS_COLOR.Pending;
              const itemCount = order.items.reduce((sum, item) => sum + (item.qty || 1), 0);
              const itemNames = order.items.map((item) => item.name).filter(Boolean).join(", ");
              const itemSummary = `${itemNames || "-"}${itemCount > 0 ? ` (${itemCount} item${itemCount !== 1 ? "s" : ""})` : ""}`;
              const locationSummary =
                [order.address.city, order.address.state].filter(Boolean).join(", ") ||
                order.address.pin ||
                "-";
              return (
                <div
                  key={order.orderId || index}
                  className="aop-row"
                  onClick={() => setSelected(order)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "170px minmax(260px,1fr) 190px 140px 150px 150px",
                    gap: 14,
                    padding: "16px 20px",
                    borderBottom: index < pagedOrders.length - 1 ? "1px solid #F1F5F9" : "none",
                    alignItems: "center",
                    background: "white",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <code
                      title={order.orderId}
                      style={{
                        display: "inline-block",
                        maxWidth: "100%",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#00A3A0",
                        background: "rgba(0,163,160,.08)",
                        padding: "3px 9px",
                        borderRadius: 6,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        verticalAlign: "top",
                      }}
                    >
                      {order.orderId}
                    </code>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      title={order.address.name || "-"}
                      style={{
                        fontSize: 13.5,
                        fontWeight: 800,
                        color: "#0F172A",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {order.address.name || "-"}
                    </div>
                    <div
                      title={itemSummary}
                      style={{
                        fontSize: 12,
                        color: "#64748B",
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {itemSummary}
                    </div>
                    <div
                      title={locationSummary}
                      style={{
                        fontSize: 11,
                        color: "#94A3B8",
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {locationSummary}
                    </div>
                  </div>

                  <div
                    title={formatDate(order.date)}
                    style={{
                      fontSize: 12.5,
                      color: "#475569",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {formatDate(order.date)}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 900,
                      color: "#0F172A",
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatCurrency(order.total)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#0F172A",
                        background: "#E2E8F0",
                        borderRadius: 6,
                        padding: "4px 7px",
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      {PAYMENT_BADGE[order.paymentMethod] || "PAY"}
                    </span>
                    <span
                      title={order.paymentMethod || "-"}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#475569",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {order.paymentMethod || "-"}
                    </span>
                  </div>

                  <div onClick={(event) => event.stopPropagation()} style={{ minWidth: 0 }}>
                    <select
                      className="aop-select"
                      value={order.status || "Pending"}
                      onChange={(event) => updateStatus(order.orderId, event.target.value)}
                      style={{
                        background: style.bg,
                        color: style.text,
                        border: `1.5px solid ${style.border}`,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "5px 10px",
                        width: 122,
                        minWidth: 122,
                        height: 30,
                        borderRadius: 8,
                      }}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })
          )}

          {filtered.length > 0 ? (
            <div
              style={{
                padding: "12px 20px",
                background: "#F8FAFC",
                borderTop: "1.5px solid #E2E8F0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
                {filtered.length} order{filtered.length !== 1 ? "s" : ""} total • Page {page}/{totalPages}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>
                Subtotal: {formatCurrency(filtered.reduce((sum, order) => sum + Number(order.total || 0), 0))}
              </span>
            </div>
          ) : null}

          {filtered.length > 0 ? (
            <div style={{ padding: "10px 20px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                className="aop-btn"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1.5px solid #E2E8F0",
                  background: "#fff",
                  color: "#334155",
                  fontSize: 12,
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                Prev
              </button>
              <button
                className="aop-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1.5px solid #E2E8F0",
                  background: "#fff",
                  color: "#334155",
                  fontSize: 12,
                  opacity: page >= totalPages ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </main>

      {selected ? (
        <AdminOrderModal
          order={selected}
          onClose={() => setSelected(null)}
          onStatusChange={updateStatus}
          onDelete={deleteOrder}
        />
      ) : null}
    </div>
  );
}

function AdminOrderModal({ order, onClose, onStatusChange, onDelete }) {
  const style = STATUS_COLOR[order.status] || STATUS_COLOR.Pending;
  const fullAddressLines = [
    order.address?.line1,
    order.address?.line2,
    order.address?.landmark,
    [order.address?.city, order.address?.state, order.address?.pin]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);
  const fullAddressText = fullAddressLines.length ? fullAddressLines.join("\n") : "-";
  const areaStreetText = order.address?.areaStreet || order.address?.line2 || order.address?.line1 || "-";
  const paymentStatusColor = order.paymentStatus === "Pending Payment" ? "#92400E" : "#16A34A";

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15,23,42,.6)",
        backdropFilter: "blur(7px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "Inter,sans-serif",
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 22,
          boxShadow: "0 32px 80px rgba(15,23,42,.24)",
          width: "100%",
          maxWidth: 520,
          maxHeight: "92vh",
          overflow: "auto",
          animation: "aopModal .26s cubic-bezier(.22,1,.36,1)",
        }}
      >
        <div
          style={{
            padding: "18px 22px 14px",
            borderBottom: "1px solid #F1F5F9",
            background: "linear-gradient(135deg,#0F172A,#1E293B)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            borderRadius: "22px 22px 0 0",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "linear-gradient(135deg,#00A3A0,#2563EB)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 800,
                  color: "white",
                }}
              >
                ORD
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>Admin - Order Details</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", marginTop: 2, letterSpacing: ".05em", textTransform: "uppercase" }}>
                  Order ID
                </div>
                <code
                  style={{
                    display: "inline-block",
                    fontSize: 12,
                    color: "#00A3A0",
                    fontWeight: 800,
                    marginTop: 2,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "rgba(0,163,160,.12)",
                    border: "1px solid rgba(0,163,160,.22)",
                    wordBreak: "break-all",
                  }}
                >
                  {order.orderId}
                </code>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "rgba(255,255,255,.12)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".07em" }}>
                Order Date
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{formatDateOnly(order.date)}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginTop: 2 }}>{formatTimeOnly(order.date)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>
                Status
              </div>
              <select
                value={order.status || "Pending"}
                onChange={(event) => onStatusChange(order.orderId, event.target.value)}
                style={{
                  background: style.bg,
                  color: style.text,
                  border: `2px solid ${style.border}`,
                  borderRadius: 8,
                  padding: "5px 12px",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <AdminSection title="Customer">
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>{order.address?.name || "N/A"}</div>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 4, lineHeight: 1.5 }}>
              <div>Phone: {order.address?.phone || "-"}</div>
              <div>Alternate Phone: {order.address?.alternatePhone || "-"}</div>
              <div>Email: {order.address?.email || "-"}</div>
            </div>
          </AdminSection>

          <AdminSection title="Delivery Address">
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
              Full Address
            </div>
            <div style={{ fontSize: 13, color: "#0F172A", lineHeight: 1.6, whiteSpace: "pre-line", marginBottom: 10 }}>
              {fullAddressText}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 5, columnGap: 8, fontSize: 13 }}>
              <span style={{ color: "#64748B", fontWeight: 600 }}>Area / Street</span>
              <span style={{ color: "#0F172A", fontWeight: 600 }}>{areaStreetText}</span>
              <span style={{ color: "#64748B", fontWeight: 600 }}>City</span>
              <span style={{ color: "#0F172A", fontWeight: 600 }}>{order.address?.city || "-"}</span>
              <span style={{ color: "#64748B", fontWeight: 600 }}>State</span>
              <span style={{ color: "#0F172A", fontWeight: 600 }}>{order.address?.state || "-"}</span>
              <span style={{ color: "#64748B", fontWeight: 600 }}>Pincode</span>
              <span style={{ color: "#0F172A", fontWeight: 600 }}>{order.address?.pin || "-"}</span>
              <span style={{ color: "#64748B", fontWeight: 600 }}>Landmark</span>
              <span style={{ color: "#0F172A", fontWeight: 600 }}>{order.address?.landmark || "-"}</span>
            </div>
          </AdminSection>

          <AdminSection title="Items Ordered">
            {order.items?.map((item, index) => (
              <div
                key={item.id || index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: index < order.items.length - 1 ? "1px dashed #F1F5F9" : "none",
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", border: "1px solid #E2E8F0", flexShrink: 0 }}>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Qty: {item.qty || 1}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>
                    Unit Price: {formatCurrency(item.unitPrice || 0)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>
                    Line Total
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", marginTop: 2 }}>
                    {formatCurrency((item.qty || 1) * (item.unitPrice || 0))}
                  </div>
                </div>
              </div>
            ))}
          </AdminSection>

          <AdminSection title="Pricing">
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed #F1F5F9", fontSize: 13 }}>
              <span style={{ color: "#64748B" }}>Subtotal</span>
              <span style={{ fontWeight: 700, color: "#0F172A" }}>{formatCurrency(order.subtotal || 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed #F1F5F9", fontSize: 13 }}>
              <span style={{ color: "#64748B" }}>Total</span>
              <span style={{ fontWeight: 700, color: "#0F172A" }}>{formatCurrency(order.total || 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, marginTop: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Order Value</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: "#0F172A" }}>{formatCurrency(order.total || 0)}</span>
            </div>
          </AdminSection>

          <AdminSection title="Payment">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#0F172A",
                  background: "#E2E8F0",
                  borderRadius: 6,
                  padding: "6px 8px",
                }}
              >
                {PAYMENT_BADGE[order.paymentMethod] || "PAY"}
              </span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".05em" }}>
                  Method
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 1 }}>
                  {(order.paymentMethod || "-").toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#94A3B8",
                    marginTop: 6,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                  }}
                >
                  Payment Status
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: paymentStatusColor,
                    marginTop: 1,
                  }}
                >
                  {order.paymentStatus || "-"}
                </div>
              </div>
            </div>
          </AdminSection>

          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <button
              onClick={() => onStatusChange(order.orderId, "Delivered")}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg,#16A34A,#15803D)",
                color: "white",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Mark Delivered
            </button>
            <button
              onClick={() => onStatusChange(order.orderId, "Cancelled")}
              style={{
                height: 44,
                padding: "0 16px",
                borderRadius: 12,
                border: "1.5px solid #FECACA",
                background: "#FEF2F2",
                color: "#DC2626",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(order.orderId)}
              style={{
                height: 44,
                padding: "0 14px",
                borderRadius: 12,
                border: "1.5px solid #E2E8F0",
                background: "#F8FAFC",
                color: "#94A3B8",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              title="Delete Order"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminSection({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "#94A3B8",
          textTransform: "uppercase",
          letterSpacing: ".08em",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div
        style={{
          background: "#F8FAFC",
          borderRadius: 12,
          border: "1.5px solid #E2E8F0",
          padding: "12px 14px",
        }}
      >
        {children}
      </div>
    </div>
  );
}
