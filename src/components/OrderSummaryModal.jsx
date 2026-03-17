import React, { useState, useEffect, useRef } from "react";

/* ─── helpers ─── */
const MRP_MULTIPLIER = 1.18;
const PLATFORM_FEE = 49;
const DISCOUNT_RATE = 0.08;

function calcPricing(unitPrice, qty) {
    const base = unitPrice * qty;
    const mrp = Math.round(base * MRP_MULTIPLIER);
    const discount = Math.round(base * DISCOUNT_RATE);
    const total = base - discount + PLATFORM_FEE;
    return { base, mrp, discount, total };
}

/* ─── tiny icon SVGs ─── */
const Icon = {
    X: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    MapPin: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
    Pencil: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    Cart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>,
    BigCheck: () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    Tag: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
};

const STEPS = ["Address", "Review Order", "Confirm"];

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function OrderSummaryModal({ product, onClose }) {
    const [step, setStep] = useState(0);   // 0=address 1=review 2=confirm
    const [qty, setQty] = useState(1);
    const [editingAddr, setEditingAddr] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [orderId, setOrderId] = useState("");

    const [addr, setAddr] = useState({
        name: "", phone: "", line1: "", city: "", state: "", pin: "",
    });
    const [addrErrors, setAddrErrors] = useState({});
    const firstInputRef = useRef(null);

    // focus first input when editing
    useEffect(() => {
        if (editingAddr && firstInputRef.current) {
            setTimeout(() => firstInputRef.current?.focus(), 80);
        }
    }, [editingAddr]);

    const hasAddress = addr.name && addr.line1 && addr.city && addr.pin;
    const pricing = calcPricing(product.unitPrice, qty);

    /* ── address validation ── */
    function validateAddr() {
        const errors = {};
        if (!addr.name.trim()) errors.name = "Full name is required";
        if (!addr.phone.trim()) errors.phone = "Phone number is required";
        if (!addr.line1.trim()) errors.line1 = "Address is required";
        if (!addr.city.trim()) errors.city = "City is required";
        if (!addr.pin.trim()) errors.pin = "PIN code is required";
        else if (!/^\d{6}$/.test(addr.pin)) errors.pin = "Enter a valid 6-digit PIN";
        setAddrErrors(errors);
        return Object.keys(errors).length === 0;
    }

    function handleAddrSave() {
        if (validateAddr()) { setEditingAddr(false); if (step === 0) setStep(1); }
    }

    function handleContinue() {
        if (step === 0) {
            if (!hasAddress) { setEditingAddr(true); return; }
            setStep(1);
        } else if (step === 1) {
            setStep(2);
        } else if (step === 2) {
            const id = "MV-" + Date.now().toString().slice(-6).toUpperCase();
            setOrderId(id);
            // Save order
            try {
                const orders = JSON.parse(localStorage.getItem("mv_orders") || "[]");
                orders.unshift({ id, product: product.name, qty, total: pricing.total, address: addr, date: new Date().toISOString() });
                localStorage.setItem("mv_orders", JSON.stringify(orders));
            } catch (e) { }
            setConfirmed(true);
        }
    }

    const canContinue = step === 0 ? hasAddress : true;

    /* ── styles ── */
    const S = {
        overlay: {
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
            animation: "omFadeIn 0.22s ease",
            fontFamily: "Inter, sans-serif",
        },
        modal: {
            background: "#FFFFFF", borderRadius: 20,
            boxShadow: "0 32px 80px rgba(15,23,42,0.22), 0 0 0 1px rgba(15,23,42,0.06)",
            width: "100%", maxWidth: 520,
            display: "flex", flexDirection: "column",
            maxHeight: "92vh",
            animation: "omSlideUp 0.28s cubic-bezier(0.22,1,0.36,1)",
            overflow: "hidden",
        },
        header: {
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: "1px solid #F1F5F9",
            background: "linear-gradient(135deg,#F0FDFA 0%,#F8FAFC 100%)",
            flexShrink: 0,
        },
        body: {
            overflowY: "auto", flex: 1,
            padding: "0",
        },
        footer: {
            padding: "16px 24px 20px",
            borderTop: "1px solid #F1F5F9",
            background: "white",
            flexShrink: 0,
            display: "flex", alignItems: "center", gap: 16,
        },
    };

    return (
        <>
            <style>{`
                @keyframes omFadeIn   { from { opacity: 0; } to { opacity: 1; } }
                @keyframes omSlideUp  { from { opacity: 0; transform: translateY(28px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes omStepFill { from { width: 0%; } to { width: 100%; } }
                .om-input {
                    width: 100%; height: 44px; border-radius: 10px;
                    border: 1.5px solid #E2E8F0; padding: 0 14px;
                    font-size: 14px; font-family: Inter, sans-serif; color: #0F172A;
                    background: #F8FAFC; outline: none;
                    transition: border-color 180ms, box-shadow 180ms;
                    box-sizing: border-box;
                }
                .om-input:focus { border-color: #00A3A0; box-shadow: 0 0 0 3px rgba(0,163,160,0.12); background: white; }
                .om-input.err  { border-color: #DC2626; }
                .om-qty-btn { width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 160ms, background 150ms; }
                .om-qty-btn:active { transform: scale(0.88); }
                .om-cta {
                    flex: 1; height: 52px; border: none; cursor: pointer;
                    border-radius: 14px; font-size: 15px; font-weight: 800;
                    font-family: Inter, sans-serif; letter-spacing: -0.01em;
                    transition: transform 160ms, box-shadow 160ms, background 150ms;
                }
                .om-cta:hover  { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(245,158,11,0.4); }
                .om-cta:active { transform: translateY(0) scale(0.98); }
                .om-cta:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
            `}</style>

            <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
                <div style={S.modal}>

                    {/* ═══ HEADER ═══ */}
                    <div style={S.header}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: "50%",
                                background: "linear-gradient(135deg,#00A3A0,#2563EB)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <Icon.Cart />
                            </div>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>Order Summary</div>
                                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>{product.name}</div>
                            </div>
                        </div>
                        <button onClick={onClose} style={{
                            width: 34, height: 34, borderRadius: "50%",
                            background: "#F1F5F9", border: "none", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#64748B", transition: "background 150ms, color 150ms",
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#E2E8F0"; e.currentTarget.style.color = "#0F172A"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#64748B"; }}>
                            <Icon.X />
                        </button>
                    </div>

                    {/* ═══ BODY ═══ */}
                    <div style={S.body}>
                        {confirmed ? <SuccessScreen orderId={orderId} total={pricing.total} onClose={onClose} /> : (
                            <div style={{ padding: "24px" }}>

                                {/* ── STEPPER ── */}
                                <Stepper step={step} />

                                <div style={{ height: 24 }} />

                                {/* ── STEP 0: ADDRESS ── */}
                                {step === 0 && (
                                    <div style={{ animation: "omFadeIn 0.22s ease" }}>
                                        <SectionLabel icon={<Icon.MapPin />} title="Delivery Address" hint="Where should we deliver?" />
                                        <div style={{ height: 14 }} />
                                        {editingAddr || !hasAddress ? (
                                            <AddressForm
                                                addr={addr} setAddr={setAddr}
                                                errors={addrErrors} setErrors={setAddrErrors}
                                                firstInputRef={firstInputRef}
                                                onSave={handleAddrSave}
                                                onCancel={hasAddress ? () => setEditingAddr(false) : null}
                                            />
                                        ) : (
                                            <AddressDisplay addr={addr} onEdit={() => setEditingAddr(true)} />
                                        )}
                                    </div>
                                )}

                                {/* ── STEP 1: REVIEW ── */}
                                {step === 1 && (
                                    <div style={{ animation: "omFadeIn 0.22s ease" }}>
                                        <SectionLabel icon={<Icon.Cart />} title="Review Your Order" hint="Confirm product and quantity" />
                                        <div style={{ height: 14 }} />
                                        <ProductRow
                                            product={product} qty={qty}
                                            onQtyChange={delta => setQty(q => Math.max(1, q + delta))}
                                        />
                                        <div style={{ height: 16 }} />
                                        <PriceBreakdown pricing={pricing} />
                                    </div>
                                )}

                                {/* ── STEP 2: CONFIRM ── */}
                                {step === 2 && (
                                    <div style={{ animation: "omFadeIn 0.22s ease" }}>
                                        <SectionLabel icon={<Icon.Check />} title="Confirm Order" hint="Final check before we process" />
                                        <div style={{ height: 14 }} />

                                        {/* Summary address */}
                                        <AddressDisplay addr={addr} onEdit={() => { setStep(0); setEditingAddr(true); }} compact />
                                        <div style={{ height: 12 }} />
                                        <ProductRow product={product} qty={qty} readOnly />
                                        <div style={{ height: 16 }} />
                                        <PriceBreakdown pricing={pricing} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ═══ FOOTER CTA ═══ */}
                    {!confirmed && (
                        <div style={S.footer}>
                            {step > 0 && (
                                <button onClick={() => setStep(s => s - 1)} style={{
                                    height: 52, padding: "0 20px", borderRadius: 14,
                                    border: "1.5px solid #E2E8F0", background: "white",
                                    color: "#475569", fontSize: 14, fontWeight: 700,
                                    cursor: "pointer", fontFamily: "Inter, sans-serif",
                                    transition: "background 150ms",
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                                    onMouseLeave={e => e.currentTarget.style.background = "white"}>
                                    Back
                                </button>
                            )}

                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total payable</div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: "#0F172A" }}>
                                    ₹{pricing.total.toLocaleString()}
                                </div>
                            </div>

                            <button
                                className="om-cta"
                                disabled={step === 0 && !hasAddress && !editingAddr}
                                onClick={handleContinue}
                                style={{
                                    background: "linear-gradient(135deg,#F59E0B,#F97316)",
                                    color: "white",
                                    maxWidth: 180,
                                }}>
                                {step < 2 ? "Continue →" : "✓ Confirm Order"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

/* ══ STEPPER ══ */
function Stepper({ step }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {STEPS.map((label, i) => {
                const done = i < step;
                const active = i === step;
                const isLast = i === STEPS.length - 1;
                return (
                    <React.Fragment key={i}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                background: done ? "#16A34A" : active ? "#00A3A0" : "#E2E8F0",
                                color: done || active ? "white" : "#94A3B8",
                                fontWeight: 800, fontSize: 13,
                                transition: "background 280ms, color 280ms",
                                boxShadow: active ? "0 0 0 4px rgba(0,163,160,0.18)" : "none",
                            }}>
                                {done ? <Icon.Check /> : i + 1}
                            </div>
                            <span style={{
                                fontSize: 11, fontWeight: active ? 700 : 500,
                                color: active ? "#00A3A0" : done ? "#16A34A" : "#94A3B8",
                                whiteSpace: "nowrap",
                                transition: "color 280ms",
                            }}>{label}</span>
                        </div>
                        {!isLast && (
                            <div style={{ flex: 1, height: 2, background: "#E2E8F0", margin: "0 6px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
                                <div style={{
                                    position: "absolute", top: 0, left: 0, bottom: 0,
                                    width: done ? "100%" : "0%",
                                    background: "#16A34A",
                                    transition: "width 400ms ease",
                                }} />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

/* ══ SECTION LABEL ══ */
function SectionLabel({ icon, title, hint }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "rgba(0,163,160,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#00A3A0",
            }}>{icon}</div>
            <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>{title}</div>
                <div style={{ fontSize: 12, color: "#64748B" }}>{hint}</div>
            </div>
        </div>
    );
}

/* ══ ADDRESS FORM ══ */
function AddressForm({ addr, setAddr, errors, setErrors, firstInputRef, onSave, onCancel }) {
    const field = (key, placeholder, type = "text", ref = undefined) => (
        <div>
            <input
                ref={ref}
                type={type}
                placeholder={placeholder}
                value={addr[key]}
                onChange={e => {
                    setAddr(a => ({ ...a, [key]: e.target.value }));
                    if (errors[key]) setErrors(er => ({ ...er, [key]: "" }));
                }}
                className={`om-input${errors[key] ? " err" : ""}`}
            />
            {errors[key] && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 4, marginLeft: 4 }}>{errors[key]}</div>}
        </div>
    );

    return (
        <div style={{
            background: "#F8FAFC", borderRadius: 16,
            border: "1.5px solid #E2E8F0", padding: "18px",
        }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                {field("name", "Full name *", "text", firstInputRef)}
                {field("phone", "Phone number *", "tel")}
            </div>
            {field("line1", "House / Street / Area *")}
            <div style={{ height: 10 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {field("city", "City *")}
                {field("state", "State")}
                {field("pin", "PIN code *", "number")}
            </div>
            <div style={{ height: 14 }} />
            <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onSave} style={{
                    flex: 1, height: 42, borderRadius: 10,
                    background: "#00A3A0", color: "white", border: "none",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                    transition: "background 150ms",
                }}
                    onMouseEnter={e => e.currentTarget.style.background = "#008F8C"}
                    onMouseLeave={e => e.currentTarget.style.background = "#00A3A0"}>
                    Save Address
                </button>
                {onCancel && (
                    <button onClick={onCancel} style={{
                        height: 42, padding: "0 18px", borderRadius: 10,
                        border: "1.5px solid #E2E8F0", background: "white",
                        color: "#475569", fontSize: 14, fontWeight: 600,
                        cursor: "pointer", fontFamily: "Inter, sans-serif",
                    }}>Cancel</button>
                )}
            </div>
        </div>
    );
}

/* ══ ADDRESS DISPLAY ══ */
function AddressDisplay({ addr, onEdit, compact }) {
    return (
        <div style={{
            background: "#F0FDFA", borderRadius: 14,
            border: "1.5px solid #CCFBF1", padding: compact ? "12px 16px" : "16px 18px",
            display: "flex", alignItems: "flex-start", gap: 12,
        }}>
            <div style={{ color: "#00A3A0", marginTop: 2, flexShrink: 0 }}><Icon.MapPin /></div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{addr.name}</div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginTop: 2 }}>
                    {addr.line1}, {addr.city}{addr.state ? `, ${addr.state}` : ""} — {addr.pin}
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>📱 {addr.phone}</div>
            </div>
            <button onClick={onEdit} style={{
                display: "flex", alignItems: "center", gap: 5,
                height: 30, padding: "0 12px", borderRadius: 50,
                border: "1.5px solid #2563EB", background: "transparent",
                color: "#2563EB", fontSize: 12, fontWeight: 700,
                cursor: "pointer", transition: "background 150ms",
                flexShrink: 0,
            }}
                onMouseEnter={e => e.currentTarget.style.background = "#EFF6FF"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Icon.Pencil /> Change
            </button>
        </div>
    );
}

/* ══ PRODUCT ROW ══ */
function ProductRow({ product, qty, onQtyChange, readOnly }) {
    return (
        <div style={{
            background: "#F8FAFC", borderRadius: 16,
            border: "1.5px solid #E2E8F0", padding: "16px",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {/* Thumbnail */}
                <div style={{
                    width: 64, height: 64, borderRadius: 12,
                    overflow: "hidden", border: "1.5px solid #E2E8F0",
                    background: "white", flexShrink: 0,
                }}>
                    <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{
                            fontSize: 10, fontWeight: 700, color: "#00A3A0",
                            background: "rgba(0,163,160,0.1)", padding: "2px 8px",
                            borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.06em",
                        }}>{product.category}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", lineHeight: 1.3 }}>{product.name}</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>🚚 Delivery estimate: 3–5 business days</div>
                </div>

                {/* Price */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>₹{(product.unitPrice * qty).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", textDecoration: "line-through" }}>₹{Math.round(product.unitPrice * qty * 1.18).toLocaleString()}</div>
                </div>
            </div>

            {/* Qty control */}
            {!readOnly && (
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginTop: 14, paddingTop: 12, borderTop: "1px solid #E2E8F0",
                }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Quantity</span>
                    <div style={{
                        display: "flex", alignItems: "center", gap: 0,
                        background: "white", borderRadius: 50, border: "1.5px solid #E2E8F0",
                        boxShadow: "0 1px 6px rgba(0,0,0,0.05)", overflow: "hidden",
                    }}>
                        <button className="om-qty-btn" onClick={() => onQtyChange(-1)} style={{
                            background: qty <= 1 ? "#F1F5F9" : "#F0FDFA",
                            color: qty <= 1 ? "#CBD5E1" : "#00A3A0",
                            cursor: qty <= 1 ? "not-allowed" : "pointer",
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                        <span style={{ minWidth: 36, textAlign: "center", fontSize: 15, fontWeight: 800, color: "#0F172A" }}>{qty}</span>
                        <button className="om-qty-btn" onClick={() => onQtyChange(1)} style={{ background: "#00A3A0", color: "white" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ══ PRICE BREAKDOWN ══ */
function PriceBreakdown({ pricing }) {
    const { mrp, discount, total } = pricing;
    const rows = [
        { label: "MRP (incl. taxes)", value: `₹${mrp.toLocaleString()}`, muted: true },
        { label: "Discount (8% off)", value: `–₹${discount.toLocaleString()}`, green: true },
        { label: "Platform fee", value: `₹${PLATFORM_FEE}` },
    ];

    return (
        <div style={{
            background: "#F8FAFC", borderRadius: 16,
            border: "1.5px solid #E2E8F0", overflow: "hidden",
        }}>
            <div style={{ padding: "16px 18px" }}>
                {rows.map((r, i) => (
                    <div key={i} style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: 10, marginBottom: 10,
                        borderBottom: i < rows.length - 1 ? "1px dashed #E2E8F0" : "none",
                    }}>
                        <span style={{ fontSize: 13, color: r.muted ? "#94A3B8" : "#475569", fontWeight: 500 }}>{r.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: r.green ? "#16A34A" : r.muted ? "#94A3B8" : "#0F172A" }}>{r.value}</span>
                    </div>
                ))}
            </div>

            {/* Total row */}
            <div style={{
                borderTop: "2px solid #E2E8F0", padding: "14px 18px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "white",
            }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Total Payable</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: "#0F172A" }}>₹{total.toLocaleString()}</span>
            </div>

            {/* Savings banner */}
            <div style={{
                background: "linear-gradient(135deg,#DCFCE7,#D1FAE5)",
                borderTop: "1px solid #BBF7D0",
                padding: "10px 18px",
                display: "flex", alignItems: "center", gap: 8,
            }}>
                <div style={{ color: "#16A34A" }}><Icon.Tag /></div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>
                    You'll save ₹{discount.toLocaleString()} on this order 🎉
                </span>
            </div>
        </div>
    );
}

/* ══ SUCCESS SCREEN ══ */
function SuccessScreen({ orderId, total, onClose }) {
    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "48px 32px 36px",
            textAlign: "center", gap: 16,
            animation: "omFadeIn 0.3s ease",
        }}>
            {/* Big check circle */}
            <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "linear-gradient(135deg,#DCFCE7,#BBF7D0)",
                border: "3px solid #16A34A",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 0 10px rgba(22,163,74,0.1)",
                animation: "omSlideUp 0.4s ease",
            }}>
                <Icon.BigCheck />
            </div>

            <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#0F172A" }}>Order Confirmed!</div>
                <div style={{ fontSize: 14, color: "#64748B", marginTop: 6 }}>
                    Your order has been placed successfully.
                </div>
            </div>

            {/* Order details chip */}
            <div style={{
                background: "#F8FAFC", borderRadius: 14, padding: "14px 24px",
                border: "1.5px solid #E2E8F0", width: "100%",
                display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
                <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Order ID</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#00A3A0", fontFamily: "monospace" }}>{orderId}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Paid</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#0F172A" }}>₹{total.toLocaleString()}</div>
                </div>
            </div>

            {/* Delivery note */}
            <div style={{
                background: "#F0FDFA", borderRadius: 10, padding: "10px 16px",
                border: "1px solid #CCFBF1", width: "100%",
                fontSize: 13, color: "#0F766E", fontWeight: 600,
            }}>
                🚚 Expected delivery in 3–5 business days
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 8 }}>
                <button onClick={onClose} style={{
                    flex: 1, height: 48, borderRadius: 12,
                    border: "1.5px solid #E2E8F0", background: "white",
                    color: "#475569", fontSize: 14, fontWeight: 700,
                    cursor: "pointer", fontFamily: "Inter, sans-serif",
                    transition: "background 150ms",
                }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                    onMouseLeave={e => e.currentTarget.style.background = "white"}>
                    Close
                </button>
                <button onClick={() => {
                    onClose();
                    window.location.href = "/";
                }} style={{
                    flex: 1, height: 48, borderRadius: 12,
                    border: "none", background: "linear-gradient(135deg,#00A3A0,#2563EB)",
                    color: "white", fontSize: 14, fontWeight: 800,
                    cursor: "pointer", fontFamily: "Inter, sans-serif",
                    boxShadow: "0 4px 14px rgba(0,163,160,0.28)",
                    transition: "transform 150ms, box-shadow 150ms",
                }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 22px rgba(0,163,160,0.38)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,163,160,0.28)"; }}>
                    🏠 Go to Home
                </button>
            </div>
        </div>
    );
}
