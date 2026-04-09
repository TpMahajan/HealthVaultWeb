import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { API_BASE } from "../constants/api";

/* ─── Constants ─── */
const MERCHANT_UPI = "medicalvault@upi";
const MERCHANT_NAME = "Medical Vault";

const PLATFORM_FEE = 49;
const MRP_MULT = 1.18;

const STEPS = ["Address", "Order Details", "Payment", "Confirm"];

/* ─── Pricing ─── */
function calcPricing(unitPrice, qty, cartItems) {
    // If a full cart is passed, compute base from all items
    const base = cartItems
        ? cartItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
        : unitPrice * qty;
    const mrp = Math.round(base * MRP_MULT);
    const discount = mrp - base;
    const total = base + PLATFORM_FEE;
    return { base, mrp, discount, total };
}

/* ─── Shared styles injected once ─── */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
@keyframes ocmIn   { from{opacity:0;transform:translateY(24px) scale(.97)} to{opacity:1;transform:none} }
@keyframes ocmFade { from{opacity:0} to{opacity:1} }
@keyframes ocmPop  { 0%{transform:scale(.8)} 60%{transform:scale(1.06)} 100%{transform:scale(1)} }
.ocm-overlay { position:fixed;inset:0;z-index:10001;background:rgba(15,23,42,.6);backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:12px;animation:ocmFade .22s ease;font-family:'Inter',sans-serif; }
.ocm-modal   { background:#fff;border-radius:22px;box-shadow:0 32px 80px rgba(15,23,42,.22),0 0 0 1px rgba(15,23,42,.06);width:100%;max-width:530px;display:flex;flex-direction:column;max-height:94vh;animation:ocmIn .28s cubic-bezier(.22,1,.36,1);overflow:hidden; }
.ocm-body    { overflow-y:auto;flex:1;padding:22px 24px 8px; }
.ocm-footer  { padding:14px 24px 18px;border-top:1px solid #F1F5F9;background:#fff;display:flex;align-items:center;gap:12px;flex-shrink:0; }
.ocm-inp { width:100%;height:44px;border-radius:10px;border:1.5px solid #E2E8F0;padding:0 13px;font-size:14px;font-family:inherit;color:#0F172A;background:#F8FAFC;outline:none;transition:border-color .18s,box-shadow .18s;box-sizing:border-box; }
.ocm-inp:focus { border-color:#00A3A0;box-shadow:0 0 0 3px rgba(0,163,160,.12);background:#fff; }
.ocm-inp.err { border-color:#DC2626; }
.ocm-btn-primary { height:50px;border:none;cursor:pointer;border-radius:14px;font-size:15px;font-weight:800;font-family:inherit;transition:transform .16s,box-shadow .16s,opacity .16s;background:linear-gradient(135deg,#F59E0B,#F97316);color:#fff;padding:0 28px; }
.ocm-btn-primary:hover  { transform:translateY(-1px);box-shadow:0 8px 24px rgba(245,158,11,.4); }
.ocm-btn-primary:active { transform:scale(.98); }
.ocm-btn-primary:disabled { opacity:.4;cursor:not-allowed;transform:none!important;box-shadow:none!important; }
.ocm-btn-back { height:50px;padding:0 18px;border-radius:14px;border:1.5px solid #E2E8F0;background:#fff;color:#475569;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;transition:background .15s; }
.ocm-btn-back:hover { background:#F8FAFC; }
.ocm-pay-card { border:2px solid #E2E8F0;border-radius:14px;padding:14px 16px;cursor:pointer;transition:border-color .18s,background .18s,box-shadow .18s;display:flex;align-items:center;gap:12px; }
.ocm-pay-card.active { border-color:#00A3A0;background:#F0FDFA;box-shadow:0 0 0 3px rgba(0,163,160,.10); }
.ocm-pay-card:hover:not(.active) { border-color:#CBD5E1;background:#F8FAFC; }
.ocm-qty-btn { width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s,background .14s; }
.ocm-qty-btn:active { transform:scale(.85); }
`;

/* ═══════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════ */
export default function OrderCheckoutModal({ product, onClose }) {
    const [step, setStep] = useState(0);
    const [qty, setQty] = useState(1);
    const [confirmed, setConfirmed] = useState(false);
    const [orderId, setOrderId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [addr, setAddr] = useState({ name: "", phone: "", line1: "", city: "", state: "", pin: "" });
    const [addrOk, setAddrOk] = useState(false);
    const [editAddr, setEditAddr] = useState(true);
    const [payment, setPayment] = useState({ method: "upi", utrRef: "", paid: false });

    const isCartCheckout = !!product.isCartCheckout;
    const cartItems = product.cartItems || null;
    const pricing = calcPricing(product.unitPrice, qty, isCartCheckout ? cartItems : null);

    // ESC closes
    useEffect(() => {
        const h = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    async function confirmOrder() {
        if (submitting) return;

        const id = "MV-" + Date.now().toString().slice(-7);
        // Build items list: cart checkout uses all cartItems, single uses product+qty
        const items = isCartCheckout
            ? cartItems.map(item => ({
                productId: item.id, name: item.name, imageUrl: item.imageUrl,
                unitPrice: item.unitPrice,
                mrp: Math.round(item.unitPrice * MRP_MULT),
                qty: item.qty,
            }))
            : [{
                productId: product.id, name: product.name, imageUrl: product.imageUrl,
                unitPrice: product.unitPrice, mrp: Math.round(product.unitPrice * MRP_MULT), qty
            }];
        const order = {
            orderId: id, date: new Date().toISOString(),
            address: addr,
            items,
            platformFee: PLATFORM_FEE,
            discount: pricing.discount,
            total: pricing.total,
            paymentMethod: payment.method,
            paymentStatus: payment.method === "cod" ? "Pending (COD)" : "Paid (Simulated)",
            utrRef: payment.utrRef,
            status: "Confirmed",
        };

        setSubmitting(true);
        setSubmitError("");

        try {
            const res = await fetch(`${API_BASE}/create-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(order),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Unable to place order");
            }

            const orders = JSON.parse(localStorage.getItem("mv_orders") || "[]");
            orders.unshift(order);
            localStorage.setItem("mv_orders", JSON.stringify(orders));
            window.dispatchEvent(new Event("inventory:refresh"));
            setOrderId(data?.data?.order?.orderId || id);
            setConfirmed(true);
        } catch (e) {
            setSubmitError(e.message || "Unable to place order");
        } finally {
            setSubmitting(false);
        }
    }

    const canGoNext = () => {
        if (step === 0) return addrOk;
        if (step === 2) return payment.method === "cod" || payment.paid;
        return true;
    };

    const handleNext = () => {
        if (step < 3) { setStep(s => s + 1); }
        else { confirmOrder(); }
    };

    return (
        <>
            <style>{GLOBAL_CSS}</style>
            <div className="ocm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
                <div className="ocm-modal" role="dialog" aria-modal="true" aria-label="Order Checkout">

                    {/* ═══ HEADER ═══ */}
                    <ModalHeader onClose={onClose} confirmed={confirmed} />

                    {/* ═══ STEPPER ═══ */}
                    {!confirmed && <StepBar step={step} />}

                    {/* ═══ BODY ═══ */}
                    <div className="ocm-body">
                        {confirmed ? (
                            <SuccessScreen orderId={orderId} pricing={pricing}
                                paymentMethod={payment.method} onClose={onClose} />
                        ) : (
                            <>
                                {step === 0 && (
                                    <AddressStep addr={addr} setAddr={setAddr}
                                        addrOk={addrOk} setAddrOk={setAddrOk}
                                        editAddr={editAddr} setEditAddr={setEditAddr} />
                                )}
                                {step === 1 && (
                                    <OrderDetailsStep
                                        product={product} qty={qty} setQty={setQty}
                                        pricing={pricing}
                                        isCartCheckout={isCartCheckout}
                                        cartItems={cartItems}
                                    />
                                )}
                                {step === 2 && (
                                    <PaymentStep payment={payment} setPayment={setPayment}
                                        total={pricing.total} orderId={"PREVIEW-" + Date.now().toString().slice(-5)} />
                                )}
                                {step === 3 && (
                                    <ConfirmStep addr={addr} product={product} qty={qty}
                                        pricing={pricing} payment={payment}
                                        isCartCheckout={isCartCheckout} cartItems={cartItems}
                                        onEditAddr={() => setStep(0)} onEditOrder={() => setStep(1)} />
                                )}
                            </>
                        )}
                    </div>

                    {!confirmed && submitError && (
                        <div style={{
                            padding: "0 24px 14px",
                            color: "#DC2626",
                            fontSize: 12.5,
                            fontWeight: 700,
                            lineHeight: 1.5,
                        }}>
                            Error: {submitError}
                        </div>
                    )}

                    {/* ═══ FOOTER ═══ */}
                    {!confirmed && (
                        <div className="ocm-footer">
                            {step > 0 && (
                                <button className="ocm-btn-back" onClick={() => setStep(s => s - 1)}>← Back</button>
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>Total</div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: "#0F172A" }}>₹{pricing.total.toLocaleString()}</div>
                            </div>
                            <button className="ocm-btn-primary" disabled={!canGoNext() || submitting}
                                onClick={handleNext}>
                                {submitting ? "Placing Order..." : step < 3 ? "Continue →" : "✓ Confirm Order"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

/* ═════════════════ HEADER ═════════════════ */
function ModalHeader({ onClose, confirmed }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 22px 14px",
            borderBottom: "1px solid #F1F5F9",
            background: "linear-gradient(135deg,#F0FDFA 0%,#F8FAFC 100%)",
            flexShrink: 0,
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#00A3A0,#2563EB)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                </div>
                <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>{confirmed ? "Order Placed!" : "Checkout"}</div>
                    <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>Medical Vault Shop</div>
                </div>
            </div>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", transition: "background .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#E2E8F0"}
                onMouseLeave={e => e.currentTarget.style.background = "#F1F5F9"}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
        </div>
    );
}

/* ═════════════════ STEP BAR ═════════════════ */
function StepBar({ step }) {
    return (
        <div style={{ padding: "16px 24px 0", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
                {STEPS.map((label, i) => {
                    const done = i < step;
                    const active = i === step;
                    const last = i === STEPS.length - 1;
                    return (
                        <React.Fragment key={i}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                                <div style={{
                                    width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                                    background: done ? "#16A34A" : active ? "#00A3A0" : "#E2E8F0",
                                    color: (done || active) ? "white" : "#94A3B8",
                                    fontWeight: 800, fontSize: 12,
                                    boxShadow: active ? "0 0 0 4px rgba(0,163,160,.18)" : "none",
                                    transition: "background .28s,box-shadow .28s",
                                }}>
                                    {done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : i + 1}
                                </div>
                                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? "#00A3A0" : done ? "#16A34A" : "#94A3B8", whiteSpace: "nowrap", transition: "color .28s" }}>{label}</span>
                            </div>
                            {!last && (
                                <div style={{ flex: 1, height: 2, background: "#E2E8F0", margin: "0 5px", marginBottom: 18, overflow: "hidden", position: "relative" }}>
                                    <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: done ? "100%" : "0%", background: "#16A34A", transition: "width .4s ease" }} />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

/* ═════════════════ STEP 1 — ADDRESS ═════════════════ */
function AddressStep({ addr, setAddr, addrOk, setAddrOk, editAddr, setEditAddr }) {
    const [errors, setErrors] = useState({});
    const firstRef = useRef(null);

    useEffect(() => { if (editAddr) setTimeout(() => firstRef.current?.focus(), 80); }, [editAddr]);

    function validate() {
        const e = {};
        if (!addr.name.trim()) e.name = "Required";
        if (!addr.phone.trim()) e.phone = "Required";
        if (!addr.line1.trim()) e.line1 = "Required";
        if (!addr.city.trim()) e.city = "Required";
        if (!/^\d{6}$/.test(addr.pin)) e.pin = "6-digit PIN";
        setErrors(e);
        return !Object.keys(e).length;
    }

    function save() { if (validate()) { setAddrOk(true); setEditAddr(false); } }

    const inp = (key, ph, type = "text", ref = undefined) => (
        <div>
            <input ref={ref} type={type} placeholder={ph} value={addr[key]}
                className={`ocm-inp${errors[key] ? " err" : ""}`}
                onChange={e => { setAddr(a => ({ ...a, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: "" })); }} />
            {errors[key] && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 3, marginLeft: 3 }}>{errors[key]}</div>}
        </div>
    );

    return (
        <div style={{ animation: "ocmFade .2s ease" }}>
            <SectionLabel icon="📍" title="Delivery Address" sub="Where should we send your order?" />
            <div style={{ height: 14 }} />

            {!editAddr && addrOk ? (
                <div style={{ background: "#F0FDFA", borderRadius: 14, border: "1.5px solid #CCFBF1", padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: "#00A3A0", marginTop: 2, fontSize: 18 }}>📍</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>{addr.name} · {addr.phone}</div>
                        <div style={{ fontSize: 13, color: "#475569", marginTop: 3, lineHeight: 1.5 }}>{addr.line1}, {addr.city}{addr.state ? `, ${addr.state}` : ""} – {addr.pin}</div>
                    </div>
                    <button onClick={() => setEditAddr(true)} style={{ height: 30, padding: "0 12px", borderRadius: 50, border: "1.5px solid #2563EB", background: "transparent", color: "#2563EB", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏️ Edit</button>
                </div>
            ) : (
                <div style={{ background: "#F8FAFC", borderRadius: 16, border: "1.5px solid #E2E8F0", padding: 18 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        {inp("name", "Full name *", "text", firstRef)}
                        {inp("phone", "Phone *", "tel")}
                    </div>
                    {inp("line1", "House / Street / Area *")}
                    <div style={{ height: 10 }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        {inp("city", "City *")}
                        {inp("state", "State")}
                        {inp("pin", "PIN code *", "number")}
                    </div>
                    <div style={{ height: 14 }} />
                    <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={save} style={{ flex: 1, height: 42, borderRadius: 10, background: "#00A3A0", color: "white", border: "none", fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: "pointer", transition: "background .15s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#008F8C"}
                            onMouseLeave={e => e.currentTarget.style.background = "#00A3A0"}>Save Address</button>
                        {addrOk && <button onClick={() => setEditAddr(false)} style={{ height: 42, padding: "0 16px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#fff", color: "#475569", fontWeight: 600, fontFamily: "inherit", cursor: "pointer", fontSize: 14 }}>Cancel</button>}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ═════════════════ STEP 2 — ORDER DETAILS ═════════════════ */
function OrderDetailsStep({ product, qty, setQty, pricing, isCartCheckout, cartItems }) {
    const { mrp, discount, total } = pricing;

    /* ── CART CHECKOUT: show all items, no qty editing ── */
    if (isCartCheckout && cartItems) {
        return (
            <div style={{ animation: "ocmFade .2s ease" }}>
                <SectionLabel icon="🛍️" title="Order Details" sub="All selected items in your cart" />
                <div style={{ height: 14 }} />

                {/* Items list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                    {cartItems.map((item, idx) => (
                        <div key={item.id} style={{
                            background: "#F8FAFC", borderRadius: 14,
                            border: "1.5px solid #E2E8F0", padding: "12px 14px",
                            display: "flex", alignItems: "center", gap: 12,
                            animation: `ocmFade .2s ease ${idx * 0.04}s both`,
                        }}>
                            {/* Thumbnail */}
                            <div style={{
                                width: 52, height: 52, borderRadius: 10, overflow: "hidden",
                                border: "1.5px solid #E2E8F0", background: "white", flexShrink: 0,
                            }}>
                                <img src={item.imageUrl} alt={item.name}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", lineHeight: 1.3 }}>{item.name}</div>
                                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                                    <span style={{ fontWeight: 600, color: "#00A3A0" }}>Qty {item.qty}</span>
                                    {" · "}
                                    ₹{item.unitPrice.toLocaleString()} /unit
                                </div>
                            </div>
                            {/* Line total */}
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ fontSize: 15, fontWeight: 900, color: "#0F172A" }}>₹{(item.unitPrice * item.qty).toLocaleString()}</div>
                                <div style={{ fontSize: 10, color: "#94A3B8", textDecoration: "line-through" }}>₹{Math.round(item.unitPrice * item.qty * MRP_MULT).toLocaleString()}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Items count summary */}
                <div style={{
                    background: "rgba(0,163,160,0.06)", borderRadius: 10,
                    border: "1px solid rgba(0,163,160,0.15)",
                    padding: "8px 14px", marginBottom: 14,
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 13, color: "#0F172A", fontWeight: 600,
                }}>
                    <span style={{ fontSize: 16 }}>🛒</span>
                    {cartItems.reduce((s, i) => s + i.qty, 0)} items from {cartItems.length} product{cartItems.length > 1 ? "s" : ""} selected
                </div>

                {/* Price breakdown */}
                <PriceBox mrp={mrp} discount={discount} total={total} />
            </div>
        );
    }

    /* ── SINGLE PRODUCT CHECKOUT (original) ── */
    return (
        <div style={{ animation: "ocmFade .2s ease" }}>
            <SectionLabel icon="🛍️" title="Order Details" sub="Review your item and pricing" />
            <div style={{ height: 14 }} />

            {/* Product card */}
            <div style={{ background: "#F8FAFC", borderRadius: 16, border: "1.5px solid #E2E8F0", padding: 16, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 66, height: 66, borderRadius: 12, overflow: "hidden", border: "1.5px solid #E2E8F0", background: "white", flexShrink: 0 }}>
                        <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#00A3A0", background: "rgba(0,163,160,.1)", padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: ".06em" }}>{product.category}</span>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", marginTop: 4, lineHeight: 1.3 }}>{product.name}</div>
                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>₹{product.unitPrice.toLocaleString()} / unit</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: "#0F172A" }}>₹{(product.unitPrice * qty).toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8", textDecoration: "line-through" }}>₹{Math.round(product.unitPrice * qty * MRP_MULT).toLocaleString()}</div>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid #E2E8F0" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Quantity</span>
                    <div style={{ display: "flex", alignItems: "center", background: "white", borderRadius: 50, border: "1.5px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,.05)" }}>
                        <button className="ocm-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}
                            style={{ background: qty <= 1 ? "#F1F5F9" : "#F0FDFA", color: qty <= 1 ? "#CBD5E1" : "#00A3A0", cursor: qty <= 1 ? "not-allowed" : "pointer" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                        <span style={{ minWidth: 36, textAlign: "center", fontSize: 15, fontWeight: 800, color: "#0F172A" }}>{qty}</span>
                        <button className="ocm-qty-btn" onClick={() => setQty(q => q + 1)} style={{ background: "#00A3A0", color: "white" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Price breakdown */}
            <PriceBox mrp={mrp} discount={discount} total={total} />
        </div>
    );
}

/* ═════════════════ STEP 3 — PAYMENT ═════════════════ */
const PAY_METHODS = [
    { id: "upi", icon: "📲", label: "UPI / QR Code" },
    { id: "card", icon: "💳", label: "Credit / Debit Card" },
    { id: "netbanking", icon: "🏦", label: "Net Banking" },
    { id: "wallet", icon: "👛", label: "Wallets" },
    { id: "cod", icon: "💵", label: "Cash on Delivery" },
];

function PaymentStep({ payment, setPayment, total, orderId }) {
    const upiLink = `upi://pay?pa=${MERCHANT_UPI}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${total}&cu=INR&tn=${orderId}`;

    const set = (key, val) => setPayment(p => ({ ...p, [key]: val }));

    return (
        <div style={{ animation: "ocmFade .2s ease" }}>
            <SectionLabel icon="💳" title="Select Payment Method" sub="Choose how you'd like to pay" />
            <div style={{ height: 14 }} />

            {/* Method selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {PAY_METHODS.map(m => (
                    <div key={m.id} className={`ocm-pay-card${payment.method === m.id ? " active" : ""}`}
                        onClick={() => set("method", m.id)}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: payment.method === m.id ? "rgba(0,163,160,.12)" : "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, transition: "background .18s" }}>{m.icon}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{m.label}</div>
                            {m.id === "cod" && <div style={{ fontSize: 11, color: "#64748B" }}>Pay when your order arrives</div>}
                        </div>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${payment.method === m.id ? "#00A3A0" : "#CBD5E1"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "border-color .18s" }}>
                            {payment.method === m.id && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00A3A0", animation: "ocmPop .2s ease" }} />}
                        </div>
                    </div>
                ))}
            </div>

            {/* UPI Panel */}
            {payment.method === "upi" && (
                <UpiPanel upiLink={upiLink} total={total} orderId={orderId} payment={payment} set={set} />
            )}

            {/* Card Panel */}
            {payment.method === "card" && (
                <CardPanel payment={payment} set={set} />
            )}

            {/* COD notice */}
            {payment.method === "cod" && (
                <div style={{ background: "#FFFBEB", borderRadius: 14, border: "1.5px solid #FDE68A", padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20 }}>📦</span>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#92400E" }}>Cash on Delivery</div>
                        <div style={{ fontSize: 13, color: "#78350F", marginTop: 3, lineHeight: 1.5 }}>Pay ₹{total.toLocaleString()} in cash when your order arrives. No advance payment needed.</div>
                    </div>
                </div>
            )}

            {/* Generic "sim paid" for netbanking/wallet */}
            {(payment.method === "netbanking" || payment.method === "wallet") && (
                <SimulatedPanel payment={payment} set={set} methodLabel={payment.method === "netbanking" ? "Net Banking" : "Wallet"} />
            )}
        </div>
    );
}

function UpiPanel({ upiLink, total, orderId, payment, set }) {
    const [copied, setCopied] = useState(false);
    function copy() { navigator.clipboard?.writeText(MERCHANT_UPI); setCopied(true); setTimeout(() => setCopied(false), 2000); }

    return (
        <div style={{ background: "#F8FAFC", borderRadius: 16, border: "1.5px solid #E2E8F0", padding: 18 }}>
            <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 3 }}>Scan with any UPI app to pay</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#0F172A" }}>₹{total.toLocaleString()}</div>
            </div>

            {/* QR Code */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <div style={{ background: "white", padding: 14, borderRadius: 16, border: "1.5px solid #E2E8F0", boxShadow: "0 4px 16px rgba(0,0,0,.07)", display: "inline-flex" }}>
                    <QRCodeSVG value={upiLink} size={180} fgColor="#0F172A" bgColor="#FFFFFF"
                        level="M" includeMargin={false} />
                </div>
            </div>

            {/* UPI ID row */}
            <div style={{ background: "white", borderRadius: 10, border: "1.5px solid #E2E8F0", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>UPI ID</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>{MERCHANT_UPI}</div>
                </div>
                <button onClick={copy} style={{ height: 30, padding: "0 14px", borderRadius: 50, border: "1.5px solid #E2E8F0", background: copied ? "#DCFCE7" : "white", color: copied ? "#16A34A" : "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all .15s" }}>
                    {copied ? "✓ Copied" : "Copy"}
                </button>
            </div>

            <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.6, marginBottom: 14, textAlign: "center" }}>
                📱 Open any UPI app → Scan QR or enter UPI ID → Enter amount → Pay → Enter UTR below
            </div>

            {/* UTR input */}
            <input className="ocm-inp" placeholder="Enter UTR / Transaction ID (optional)"
                value={payment.utrRef} onChange={e => { set("utrRef", e.target.value); }} />
            <div style={{ height: 10 }} />
            <button onClick={() => set("paid", true)} style={{
                width: "100%", height: 44, borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                fontWeight: 800, fontSize: 14,
                background: payment.paid ? "linear-gradient(135deg,#16A34A,#15803D)" : "linear-gradient(135deg,#00A3A0,#2563EB)",
                color: "white", transition: "all .2s",
            }}>
                {payment.paid ? "✓ Payment Confirmed!" : "I've Paid — Confirm Payment"}
            </button>
        </div>
    );
}

function CardPanel({ payment, set }) {
    const [num, setNum] = useState(""); const [ex, setEx] = useState(""); const [cv, setCv] = useState(""); const [nm, setNm] = useState("");
    function submit() { set("paid", true); }
    return (
        <div style={{ background: "#F8FAFC", borderRadius: 16, border: "1.5px solid #E2E8F0", padding: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input className="ocm-inp" placeholder="Card number" maxLength={19} value={num}
                    onChange={e => setNum(e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim())} />
                <input className="ocm-inp" placeholder="Name on card" value={nm} onChange={e => setNm(e.target.value)} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input className="ocm-inp" placeholder="MM / YY" maxLength={5} value={ex}
                        onChange={e => { let v = e.target.value.replace(/\D/g, ""); if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2); setEx(v); }} />
                    <input className="ocm-inp" placeholder="CVV" maxLength={4} type="password" value={cv} onChange={e => setCv(e.target.value.replace(/\D/g, ""))} />
                </div>
                <button onClick={submit} disabled={num.length < 19 || ex.length < 5 || cv.length < 3 || !nm}
                    style={{
                        height: 44, borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14,
                        background: payment.paid ? "linear-gradient(135deg,#16A34A,#15803D)" : "linear-gradient(135deg,#2563EB,#1D4ED8)",
                        color: "white", opacity: (num.length < 19 || ex.length < 5 || cv.length < 3 || !nm) ? 0.5 : 1, transition: "all .2s"
                    }}>
                    {payment.paid ? "✓ Card Verified!" : "Verify & Pay (Demo)"}
                </button>
            </div>
        </div>
    );
}

function SimulatedPanel({ payment, set, methodLabel }) {
    return (
        <div style={{ background: "#F8FAFC", borderRadius: 16, border: "1.5px solid #E2E8F0", padding: 18, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🏦</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>{methodLabel} selected</div>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 14 }}>Click below to simulate a successful payment in demo mode.</div>
            <button onClick={() => set("paid", true)} style={{
                height: 44, padding: "0 24px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14,
                background: payment.paid ? "linear-gradient(135deg,#16A34A,#15803D)" : "linear-gradient(135deg,#00A3A0,#2563EB)",
                color: "white", transition: "all .2s",
            }}>
                {payment.paid ? "✓ Payment Successful!" : "Simulate Payment"}
            </button>
        </div>
    );
}

/* ═════════════════ STEP 4 — CONFIRM ═════════════════ */
function ConfirmStep({ addr, product, qty, pricing, payment, isCartCheckout, cartItems, onEditAddr, onEditOrder }) {
    const { mrp, discount, total } = pricing;
    const methodLabel = PAY_METHODS.find(m => m.id === payment.method)?.label || payment.method;
    return (
        <div style={{ animation: "ocmFade .2s ease", display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionLabel icon="✅" title="Confirm Your Order" sub="Final review before we process" />

            {/* Address row */}
            <ReviewCard title="Delivery To" onEdit={onEditAddr}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{addr.name}</div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>{addr.line1}, {addr.city} – {addr.pin}</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>📱 {addr.phone}</div>
            </ReviewCard>

            {/* Items row */}
            <ReviewCard title={isCartCheckout ? `Items (${cartItems?.length || 1} products)` : "Item"} onEdit={onEditOrder}>
                {isCartCheckout && cartItems ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {cartItems.map(item => (
                            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", border: "1px solid #E2E8F0", flexShrink: 0 }}>
                                    <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                                    <div style={{ fontSize: 12, color: "#64748B" }}>Qty: {item.qty} × ₹{item.unitPrice.toLocaleString()}</div>
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", flexShrink: 0 }}>₹{(item.unitPrice * item.qty).toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", border: "1px solid #E2E8F0", flexShrink: 0 }}>
                            <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{product.name}</div>
                            <div style={{ fontSize: 13, color: "#64748B" }}>Qty: {qty} × ₹{product.unitPrice.toLocaleString()}</div>
                        </div>
                    </div>
                )}
            </ReviewCard>

            {/* Payment method */}
            <ReviewCard title="Payment">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{PAY_METHODS.find(m => m.id === payment.method)?.icon}</span>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{methodLabel}</div>
                        <div style={{ fontSize: 12, color: payment.method === "cod" ? "#92400E" : "#16A34A", fontWeight: 600 }}>
                            {payment.method === "cod" ? "Pending (pay on delivery)" : "Paid (Demo)"}
                        </div>
                    </div>
                </div>
            </ReviewCard>

            {/* Price box */}
            <PriceBox mrp={mrp} discount={discount} total={total} />
        </div>
    );
}

function ReviewCard({ title, onEdit, children }) {
    return (
        <div style={{ background: "#F8FAFC", borderRadius: 14, border: "1.5px solid #E2E8F0", padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".07em" }}>{title}</span>
                {onEdit && <button onClick={onEdit} style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>✏️ Edit</button>}
            </div>
            {children}
        </div>
    );
}

/* ═════════════════ SUCCESS SCREEN ═════════════════ */
function SuccessScreen({ orderId, pricing, paymentMethod, onClose }) {
    const methodLabel = PAY_METHODS.find(m => m.id === paymentMethod)?.label || paymentMethod;
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 20px 28px", textAlign: "center", gap: 16, animation: "ocmFade .3s ease" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", border: "3px solid #16A34A", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 10px rgba(22,163,74,.10)", animation: "ocmPop .4s ease" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#0F172A" }}>Order Confirmed! 🎉</div>
                <div style={{ fontSize: 14, color: "#64748B", marginTop: 6 }}>Thank you! Your order is being processed.</div>
            </div>
            <div style={{ background: "#F8FAFC", borderRadius: 14, padding: "14px 22px", border: "1.5px solid #E2E8F0", width: "100%", display: "flex", justifyContent: "space-between" }}>
                <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>Order ID</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#00A3A0", fontFamily: "monospace" }}>{orderId}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>Total Paid</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#0F172A" }}>₹{pricing.total.toLocaleString()}</div>
                </div>
            </div>
            <div style={{ background: "#F0FDFA", borderRadius: 10, padding: "10px 16px", border: "1px solid #CCFBF1", width: "100%", fontSize: 13, color: "#0F766E", fontWeight: 600 }}>
                🚚 Estimated delivery: 3–5 business days<br />
                <span style={{ fontSize: 12, fontWeight: 500 }}>Payment: {methodLabel}</span>
            </div>
            <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 4 }}>
                <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 12, border: "1.5px solid #E2E8F0", background: "white", color: "#475569", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background .15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                    onMouseLeave={e => e.currentTarget.style.background = "white"}>Close</button>
                <button onClick={() => { onClose(); window.location.href = "/orders"; }} style={{ flex: 1, height: 48, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#00A3A0,#2563EB)", color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(0,163,160,.28)", transition: "transform .15s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>📦 See My Orders</button>
            </div>
        </div>
    );
}

/* ═════════════════ SHARED COMPONENTS ═════════════════ */
function SectionLabel({ icon, title, sub }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,163,160,.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
            <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>{title}</div>
                <div style={{ fontSize: 12, color: "#64748B" }}>{sub}</div>
            </div>
        </div>
    );
}

function PriceBox({ mrp, discount, total }) {
    return (
        <div style={{ background: "#F8FAFC", borderRadius: 16, border: "1.5px solid #E2E8F0", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px" }}>
                {[
                    { label: "MRP (incl. taxes)", val: `₹${mrp.toLocaleString()}`, color: "#94A3B8", through: true },
                    { label: "Discount", val: `–₹${discount.toLocaleString()}`, color: "#16A34A" },
                    { label: "Platform fee", val: `₹${PLATFORM_FEE}`, color: "#475569" },
                ].map((r, i, arr) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 9, marginBottom: 9, borderBottom: i < arr.length - 1 ? "1px dashed #E2E8F0" : "none" }}>
                        <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>{r.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: r.color, textDecoration: r.through ? "line-through" : "none" }}>{r.val}</span>
                    </div>
                ))}
            </div>
            <div style={{ borderTop: "2px solid #E2E8F0", padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "white" }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Total Payable</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: "#0F172A" }}>₹{total.toLocaleString()}</span>
            </div>
            <div style={{ background: "linear-gradient(135deg,#DCFCE7,#D1FAE5)", borderTop: "1px solid #BBF7D0", padding: "9px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>🏷️</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>You save ₹{discount.toLocaleString()} on this order!</span>
            </div>
        </div>
    );
}


