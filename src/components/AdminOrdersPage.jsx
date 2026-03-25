import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../constants/api";

/* ── Constants ── */
const STATUS_OPTIONS = ["Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];
const STATUS_COLOR = {
    Confirmed: { bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0" },
    Processing: { bg: "#DBEAFE", text: "#1D4ED8", border: "#BFDBFE" },
    Shipped: { bg: "#F3E8FF", text: "#7C3AED", border: "#E9D5FF" },
    Delivered: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
    Cancelled: { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" },
};
const METHOD_ICONS = { upi: "📲", card: "💳", netbanking: "🏦", wallet: "👛", cod: "💵" };

function adminHeaders() {
    const token = localStorage.getItem("adminToken");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function applyOrders(raw, setOrders, setStats) {
    setOrders(raw);
    const revenue = raw.reduce((s, o) => s + Number(o.total || 0), 0);
    const pending = raw.filter(o => ["Confirmed", "Processing", "Shipped"].includes(o.status)).length;
    const delivered = raw.filter(o => o.status === "Delivered").length;
    setStats({ total: raw.length, revenue, pending, delivered });
}

function fmt(dateStr) {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    } catch { return dateStr; }
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════*/
export default function AdminOrdersPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [stats, setStats] = useState({ total: 0, revenue: 0, pending: 0, delivered: 0 });
    const [page, setPage] = useState(1);
    const perPage = 10;

    useEffect(() => {
        loadOrders();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [search, filterStatus]);

    function loadOrders() {
        try {
            const raw = JSON.parse(localStorage.getItem("mv_orders") || "[]");
            applyOrders(raw, setOrders, setStats);
        } catch { setOrders([]); }
    }

    async function updateStatus(orderId, newStatus) {
        try {
            const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
                method: "PUT",
                headers: adminHeaders(),
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to sync order status");
            }

            const raw = JSON.parse(localStorage.getItem("mv_orders") || "[]");
            const updated = raw.map(o => o.orderId === orderId ? { ...o, status: newStatus } : o);
            localStorage.setItem("mv_orders", JSON.stringify(updated));
            applyOrders(updated, setOrders, setStats);
            if (selected?.orderId === orderId) setSelected(prev => ({ ...prev, status: newStatus }));
            window.dispatchEvent(new Event("inventory:refresh"));
        } catch (error) {
            window.alert(error.message || "Unable to update order status");
        }
    }

    function deleteOrder(orderId) {
        if (!window.confirm("Are you sure you want to delete this order?")) return;
        try {
            const raw = JSON.parse(localStorage.getItem("mv_orders") || "[]");
            const updated = raw.filter(o => o.orderId !== orderId);
            localStorage.setItem("mv_orders", JSON.stringify(updated));
            applyOrders(updated, setOrders, setStats);
            if (selected?.orderId === orderId) setSelected(null);
        } catch { }
    }

    const filtered = orders.filter(o => {
        const matchSearch =
            !search ||
            o.orderId?.toLowerCase().includes(search.toLowerCase()) ||
            o.address?.name?.toLowerCase().includes(search.toLowerCase()) ||
            o.items?.some(i => i.name?.toLowerCase().includes(search.toLowerCase()));
        const matchStatus = filterStatus === "All" || o.status === filterStatus;
        return matchSearch && matchStatus;
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const pagedOrders = filtered.slice((page - 1) * perPage, page * perPage);

    return (
        <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "Inter, sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes aopFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .aop-row { transition: background .15s; cursor: pointer; }
        .aop-row:hover { background: #F0FDFA !important; }
        .aop-status-badge { display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase; }
        .aop-btn { border:none;cursor:pointer;font-family:inherit;font-weight:700;transition:transform .14s,box-shadow .14s; }
        .aop-btn:hover { transform:translateY(-1px); }
        .aop-btn:active { transform:scale(.97); }
        .aop-select { border:1.5px solid #E2E8F0;border-radius:8px;padding:5px 10px;font-family:inherit;font-size:13px;font-weight:600;color:#0F172A;background:#F8FAFC;outline:none;cursor:pointer; }
        .aop-select:focus { border-color:#00A3A0; }
        @keyframes aopModal { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:none} }
      `}</style>

            {/* ── Header ── */}
            <header style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "14px 24px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 100 }}>
                <img src="/app_icon.png" alt="Medical Vault" style={{ width: 28, height: 28, objectFit: "contain" }} />
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#0F172A" }}>Medical Vault — Admin Orders</div>
                    <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>Manage all customer orders</div>
                </div>
                <button
                    className="aop-btn"
                    onClick={() => navigate("/admin/dashboard")}
                    style={{ height: 38, padding: "0 16px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "white", color: "#475569", fontSize: 13 }}
                >
                    ← Dashboard
                </button>
            </header>

            <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 80px" }}>

                {/* ── Stats Row ── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28, animation: "aopFade .3s ease" }}>
                    {[
                        { label: "Total Orders", value: stats.total, icon: "📦", color: "#2563EB" },
                        { label: "Total Revenue", value: `₹${Number(stats.revenue).toLocaleString()}`, icon: "💰", color: "#16A34A" },
                        { label: "Active Orders", value: stats.pending, icon: "🔄", color: "#F59E0B" },
                        { label: "Delivered", value: stats.delivered, icon: "✅", color: "#00A3A0" },
                    ].map((s, i) => (
                        <div key={i} style={{ background: "white", borderRadius: 16, border: "1.5px solid #E2E8F0", padding: "18px 20px", boxShadow: "0 2px 12px rgba(0,0,0,.04)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{s.icon}</div>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".07em" }}>{s.label}</div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: "#0F172A", marginTop: 2 }}>{s.value}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Filters ── */}
                <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #E2E8F0", padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input
                            type="text"
                            placeholder="Search by order ID, customer, product…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ width: "100%", height: 40, paddingLeft: 36, paddingRight: 14, borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#F8FAFC", fontSize: 13, fontFamily: "inherit", color: "#0F172A", outline: "none", boxSizing: "border-box" }}
                        />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Status:</span>
                        <select className="aop-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option>All</option>
                            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <button className="aop-btn" onClick={loadOrders} style={{ height: 40, padding: "0 16px", borderRadius: 10, background: "linear-gradient(135deg,#00A3A0,#2563EB)", color: "white", fontSize: 13 }}>
                        🔄 Refresh
                    </button>
                </div>

                {/* ── Orders Table ── */}
                <div style={{ background: "white", borderRadius: 18, border: "1.5px solid #E2E8F0", overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,.04)" }}>

                    {/* table header */}
                    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 130px 110px 100px 120px", gap: 0, padding: "12px 20px", background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
                        {["Order ID", "Customer & Items", "Date", "Total", "Payment", "Status"].map((h, i) => (
                            <div key={i} style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</div>
                        ))}
                    </div>

                    {filtered.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "60px 24px" }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A" }}>No Orders Found</div>
                            <div style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>
                                {orders.length === 0 ? "No orders have been placed yet." : "Try adjusting your search or filter."}
                            </div>
                        </div>
                    ) : (
                        pagedOrders.map((order, idx) => {
                            const sc = STATUS_COLOR[order.status] || STATUS_COLOR.Confirmed;
                            return (
                                <div
                                    key={order.orderId || idx}
                                    className="aop-row"
                                    onClick={() => setSelected(order)}
                                    style={{ display: "grid", gridTemplateColumns: "160px 1fr 130px 110px 100px 120px", gap: 0, padding: "14px 20px", borderBottom: idx < filtered.length - 1 ? "1px solid #F1F5F9" : "none", alignItems: "center", background: "white" }}
                                >
                                    {/* Order ID */}
                                    <div>
                                        <code style={{ fontSize: 12, fontWeight: 800, color: "#00A3A0", background: "rgba(0,163,160,.08)", padding: "2px 8px", borderRadius: 6 }}>{order.orderId}</code>
                                    </div>

                                    {/* Customer & Items */}
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{order.address?.name || "—"}</div>
                                        <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                                            {order.items?.map(i => i.name).join(", ") || "—"}
                                            {order.items?.length > 0 && <span style={{ marginLeft: 6, color: "#94A3B8" }}>({order.items.reduce((s, i) => s + (i.qty || 1), 0)} item{order.items.reduce((s, i) => s + (i.qty || 1), 0) !== 1 ? "s" : ""})</span>}
                                        </div>
                                        {order.address?.city && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>📍 {order.address.city}</div>}
                                    </div>

                                    {/* Date */}
                                    <div style={{ fontSize: 12, color: "#64748B" }}>{fmt(order.date)}</div>

                                    {/* Total */}
                                    <div style={{ fontSize: 15, fontWeight: 900, color: "#0F172A" }}>₹{Number(order.total || 0).toLocaleString()}</div>

                                    {/* Payment */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                        <span style={{ fontSize: 16 }}>{METHOD_ICONS[order.paymentMethod] || "💳"}</span>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase" }}>{order.paymentMethod || "—"}</span>
                                    </div>

                                    {/* Status */}
                                    <div onClick={e => e.stopPropagation()}>
                                        <select
                                            className="aop-select"
                                            value={order.status || "Confirmed"}
                                            onChange={e => updateStatus(order.orderId, e.target.value)}
                                            style={{ background: sc.bg, color: sc.text, border: `1.5px solid ${sc.border}`, fontSize: 11, fontWeight: 700, padding: "4px 8px" }}
                                        >
                                            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Footer summary */}
                    {filtered.length > 0 && (
                        <div style={{ padding: "12px 20px", background: "#F8FAFC", borderTop: "1.5px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>{filtered.length} order{filtered.length !== 1 ? "s" : ""} total • Page {page}/{totalPages}</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>
                                Subtotal: ₹{filtered.reduce((s, o) => s + Number(o.total || 0), 0).toLocaleString()}
                            </span>
                        </div>
                    )}
                    {filtered.length > 0 && (
                      <div style={{ padding: "10px 20px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button
                          className="aop-btn"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          style={{ height: 32, padding: "0 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", color: "#334155", fontSize: 12, opacity: page <= 1 ? 0.5 : 1 }}
                        >
                          Prev
                        </button>
                        <button
                          className="aop-btn"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          style={{ height: 32, padding: "0 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", color: "#334155", fontSize: 12, opacity: page >= totalPages ? 0.5 : 1 }}
                        >
                          Next
                        </button>
                      </div>
                    )}
                </div>
            </main>

            {/* ── Order Detail Modal ── */}
            {selected && (
                <AdminOrderModal
                    order={selected}
                    onClose={() => setSelected(null)}
                    onStatusChange={updateStatus}
                    onDelete={deleteOrder}
                />
            )}
        </div>
    );
}

/* ══════════════════════════════════════════
   ADMIN ORDER DETAIL MODAL
══════════════════════════════════════════*/
function AdminOrderModal({ order, onClose, onStatusChange, onDelete }) {
    const sc = STATUS_COLOR[order.status] || STATUS_COLOR.Confirmed;

    useEffect(() => {
        const h = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    return (
        <div
            style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,.6)", backdropFilter: "blur(7px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "Inter,sans-serif" }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{ background: "white", borderRadius: 22, boxShadow: "0 32px 80px rgba(15,23,42,.24)", width: "100%", maxWidth: 520, maxHeight: "92vh", overflow: "auto", animation: "aopModal .26s cubic-bezier(.22,1,.36,1)" }}>

                {/* Modal Header */}
                <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #F1F5F9", background: "linear-gradient(135deg,#0F172A,#1E293B)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, borderRadius: "22px 22px 0 0" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#00A3A0,#2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡️</div>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>Admin — Order Details</div>
                                <code style={{ fontSize: 12, color: "#00A3A0", fontWeight: 700 }}>{order.orderId}</code>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.12)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white", transition: "background .15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.22)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.12)"}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                <div style={{ padding: "22px" }}>

                    {/* Status & Date row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".07em" }}>Order Date</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{fmt(order.date)}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>Status</div>
                            <select
                                value={order.status || "Confirmed"}
                                onChange={e => onStatusChange(order.orderId, e.target.value)}
                                style={{ background: sc.bg, color: sc.text, border: `2px solid ${sc.border}`, borderRadius: 8, padding: "5px 12px", fontFamily: "inherit", fontSize: 12, fontWeight: 800, cursor: "pointer", outline: "none" }}
                            >
                                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Customer */}
                    <AdminSection title="👤 Customer">
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>{order.address?.name || "N/A"}</div>
                        <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>📱 {order.address?.phone || "—"}</div>
                        <div style={{ fontSize: 13, color: "#475569", marginTop: 2, lineHeight: 1.5 }}>
                            📍 {order.address?.line1}, {order.address?.city}
                            {order.address?.state ? `, ${order.address.state}` : ""} — {order.address?.pin}
                        </div>
                    </AdminSection>

                    {/* Items */}
                    <AdminSection title="📦 Items Ordered">
                        {order.items?.map((item, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < order.items.length - 1 ? "1px dashed #F1F5F9" : "none" }}>
                                <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", border: "1px solid #E2E8F0", flexShrink: 0 }}>
                                    <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{item.name}</div>
                                    <div style={{ fontSize: 12, color: "#64748B" }}>Qty: {item.qty || 1} × ₹{Number(item.unitPrice || 0).toLocaleString()}</div>
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>₹{((item.qty || 1) * (item.unitPrice || 0)).toLocaleString()}</div>
                            </div>
                        ))}
                    </AdminSection>

                    {/* Pricing */}
                    <AdminSection title="💰 Pricing">
                        {[
                            { l: "Discount Applied", v: `–₹${Number(order.discount || 0).toLocaleString()}`, green: true },
                            { l: "Platform Fee", v: `₹${order.platformFee || 49}` },
                        ].map((r, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed #F1F5F9", fontSize: 13 }}>
                                <span style={{ color: "#64748B" }}>{r.l}</span>
                                <span style={{ fontWeight: 700, color: r.green ? "#16A34A" : "#0F172A" }}>{r.v}</span>
                            </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, marginTop: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Total</span>
                            <span style={{ fontSize: 22, fontWeight: 900, color: "#0F172A" }}>₹{Number(order.total || 0).toLocaleString()}</span>
                        </div>
                    </AdminSection>

                    {/* Payment */}
                    <AdminSection title="💳 Payment">
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 24 }}>{METHOD_ICONS[order.paymentMethod] || "💳"}</span>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{(order.paymentMethod || "—").toUpperCase()}</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: order.paymentMethod === "cod" ? "#92400E" : "#16A34A", marginTop: 1 }}>{order.paymentStatus || "—"}</div>
                                {order.utrRef && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>UTR: {order.utrRef}</div>}
                            </div>
                        </div>
                    </AdminSection>

                    {/* Admin Actions */}
                    <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                        <button
                            onClick={() => { onStatusChange(order.orderId, "Delivered"); }}
                            style={{ flex: 1, height: 44, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#16A34A,#15803D)", color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", transition: "transform .14s" }}
                            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                            onMouseLeave={e => e.currentTarget.style.transform = "none"}
                        >
                            ✅ Mark Delivered
                        </button>
                        <button
                            onClick={() => { onStatusChange(order.orderId, "Cancelled"); }}
                            style={{ height: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", transition: "transform .14s" }}
                            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                            onMouseLeave={e => e.currentTarget.style.transform = "none"}
                        >
                            ✕ Cancel
                        </button>
                        <button
                            onClick={() => { onDelete(order.orderId); }}
                            style={{ height: 44, padding: "0 14px", borderRadius: 12, border: "1.5px solid #E2E8F0", background: "#F8FAFC", color: "#94A3B8", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "transform .14s" }}
                            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                            onMouseLeave={e => e.currentTarget.style.transform = "none"}
                            title="Delete Order"
                        >
                            🗑️
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
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>{title}</div>
            <div style={{ background: "#F8FAFC", borderRadius: 12, border: "1.5px solid #E2E8F0", padding: "12px 14px" }}>
                {children}
            </div>
        </div>
    );
}
