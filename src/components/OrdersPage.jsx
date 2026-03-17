import React, { useState, useEffect } from "react";

const METHOD_ICONS = { upi: "📲", card: "💳", netbanking: "🏦", wallet: "👛", cod: "💵" };
const STATUS_COLOR = { "Confirmed": "#16A34A", "Processing": "#2563EB", "Cancelled": "#DC2626" };

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem("mv_orders") || "[]");
            setOrders(saved);
        } catch (e) { setOrders([]); }
    }, []);

    return (
        <div style={{
            minHeight: "100vh", background: "#F8FAFC",
            fontFamily: "Inter, sans-serif", padding: "32px 16px 80px",
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes opFade { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        .op-card { background:white;border-radius:16px;border:1.5px solid #E2E8F0;padding:18px 20px;cursor:pointer;transition:box-shadow .18s,border-color .18s,transform .18s;animation:opFade .28s ease; }
        .op-card:hover { box-shadow:0 6px 24px rgba(15,23,42,.09);border-color:#CBD5E1;transform:translateY(-1px); }
        @keyframes odIn { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:none} }
      `}</style>

            {/* Header */}
            <div style={{ maxWidth: 680, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
                    <button onClick={() => window.history.back()} style={{ width: 40, height: 40, borderRadius: "50%", border: "1.5px solid #E2E8F0", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", transition: "background .15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                        onMouseLeave={e => e.currentTarget.style.background = "white"}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                    </button>
                    <div>
                        <h1 style={{ fontSize: "clamp(22px,4vw,30px)", fontWeight: 900, color: "#0F172A", letterSpacing: "-0.03em", margin: 0 }}>My Orders</h1>
                        <p style={{ fontSize: 14, color: "#64748B", margin: "4px 0 0", fontWeight: 500 }}>
                            {orders.length} order{orders.length !== 1 ? "s" : ""} placed
                        </p>
                    </div>
                </div>

                {/* Empty state */}
                {orders.length === 0 && (
                    <div style={{ textAlign: "center", padding: "72px 24px", background: "white", borderRadius: 20, border: "1.5px solid #E2E8F0" }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>No orders yet</div>
                        <div style={{ fontSize: 14, color: "#64748B", marginTop: 8, marginBottom: 24 }}>Products you buy will appear here.</div>
                        <button onClick={() => window.location.href = "/products"} style={{ height: 48, padding: "0 28px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#00A3A0,#2563EB)", color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(0,163,160,.28)" }}>
                            Shop Now →
                        </button>
                    </div>
                )}

                {/* Order list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {orders.map((order, i) => (
                        <div key={order.orderId || i} className="op-card" onClick={() => setSelected(order)}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                        <code style={{ fontSize: 13, fontWeight: 800, color: "#00A3A0", background: "rgba(0,163,160,.08)", padding: "2px 8px", borderRadius: 6 }}>{order.orderId}</code>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[order.status] || "#16A34A", background: `${STATUS_COLOR[order.status] || "#16A34A"}15`, padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: ".06em" }}>
                                            {order.status || "Confirmed"}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                                        {order.items?.map(i => i.name).join(", ") || "Order"}
                                    </div>
                                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                                        {method(order.paymentMethod)} {order.paymentStatus} · {fmt(order.date)}
                                    </div>
                                </div>
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: "#0F172A" }}>₹{Number(order.total || 0).toLocaleString()}</div>
                                    <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                                        {order.items?.reduce((s, i) => s + i.qty, 0) || 1} item{(order.items?.reduce((s, i) => s + i.qty, 0) || 1) > 1 ? "s" : ""}
                                    </div>
                                </div>
                            </div>

                            {/* Address snippet */}
                            {order.address?.city && (
                                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed #E2E8F0", fontSize: 12, color: "#64748B", display: "flex", alignItems: "center", gap: 6 }}>
                                    <span>📍</span> {order.address.name}, {order.address.city} – {order.address.pin}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Order Detail Modal */}
            {selected && <OrderDetailModal order={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}

/* ── Order Detail Modal ── */
function OrderDetailModal({ order, onClose }) {
    useEffect(() => {
        const h = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "Inter,sans-serif" }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: "white", borderRadius: 20, boxShadow: "0 32px 80px rgba(15,23,42,.22)", width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", animation: "odIn .28s cubic-bezier(.22,1,.36,1)" }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid #F1F5F9", background: "linear-gradient(135deg,#F0FDFA,#F8FAFC)", position: "sticky", top: 0 }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>Order Details</div>
                        <code style={{ fontSize: 13, color: "#00A3A0", fontWeight: 700 }}>{order.orderId}</code>
                    </div>
                    <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                <div style={{ padding: "20px" }}>
                    {/* Status badge */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                        <span style={{ fontSize: 13, color: "#64748B" }}>Placed on: <b style={{ color: "#0F172A" }}>{fmt(order.date)}</b></span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: STATUS_COLOR[order.status] || "#16A34A", background: `${STATUS_COLOR[order.status] || "#16A34A"}15`, padding: "4px 12px", borderRadius: 99, textTransform: "uppercase", letterSpacing: ".07em" }}>
                            {order.status || "Confirmed"}
                        </span>
                    </div>

                    {/* Items */}
                    <Section title="Items Ordered">
                        {order.items?.map((item, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px dashed #F1F5F9" }}>
                                <div style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", border: "1px solid #E2E8F0", flexShrink: 0 }}>
                                    <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{item.name}</div>
                                    <div style={{ fontSize: 12, color: "#64748B" }}>Qty: {item.qty} × ₹{Number(item.unitPrice).toLocaleString()}</div>
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>₹{(item.qty * item.unitPrice).toLocaleString()}</div>
                            </div>
                        ))}
                    </Section>

                    {/* Address */}
                    {order.address?.name && (
                        <Section title="Delivery Address">
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{order.address.name}</div>
                            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginTop: 2 }}>{order.address.line1}, {order.address.city}{order.address.state ? `, ${order.address.state}` : ""} – {order.address.pin}</div>
                            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>📱 {order.address.phone}</div>
                        </Section>
                    )}

                    {/* Price breakdown */}
                    <Section title="Price Breakdown">
                        {[
                            { l: "MRP", v: `₹${Number(order.items?.[0]?.mrp || 0).toLocaleString()}`, muted: true },
                            { l: "Discount", v: `–₹${Number(order.discount || 0).toLocaleString()}`, green: true },
                            { l: "Platform fee", v: `₹${order.platformFee || 49}` },
                        ].map((r, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px dashed #F1F5F9", fontSize: 13 }}>
                                <span style={{ color: "#64748B" }}>{r.l}</span>
                                <span style={{ fontWeight: 700, color: r.green ? "#16A34A" : r.muted ? "#94A3B8" : "#0F172A" }}>{r.v}</span>
                            </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, marginTop: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Total</span>
                            <span style={{ fontSize: 20, fontWeight: 900, color: "#0F172A" }}>₹{Number(order.total || 0).toLocaleString()}</span>
                        </div>
                    </Section>

                    {/* Payment */}
                    <Section title="Payment">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 22 }}>{METHOD_ICONS[order.paymentMethod] || "💳"}</span>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{order.paymentMethod?.toUpperCase()}</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: order.paymentMethod === "cod" ? "#92400E" : "#16A34A", marginTop: 1 }}>{order.paymentStatus}</div>
                                {order.utrRef && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>UTR: {order.utrRef}</div>}
                            </div>
                        </div>
                    </Section>

                    {/* Delivery note */}
                    <div style={{ background: "#F0FDFA", borderRadius: 12, padding: "12px 14px", border: "1px solid #CCFBF1", fontSize: 13, color: "#0F766E", fontWeight: 600, textAlign: "center" }}>
                        🚚 Expected delivery in 3–5 business days
                    </div>
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>{title}</div>
            {children}
        </div>
    );
}

function method(m) {
    return METHOD_ICONS[m] || "💳";
}

function fmt(dateStr) {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return dateStr; }
}
