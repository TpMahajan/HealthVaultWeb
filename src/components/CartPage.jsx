import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OrderCheckoutModal from "./OrderCheckoutModal";
import { motion } from "framer-motion";
import { ArrowLeft, Stethoscope, ShoppingBag, Trash2 } from "lucide-react";

/* ─── Icons ─── */
const TrashIcon = () => <Trash2 className="w-[15px] h-[15px]" />;

const DEFAULT_CART = [
    { id: "band-1", name: "NFC HealthBand", category: "Wearable", unitPrice: 600, qty: 1, imageUrl: "/nfc_band_main.png" },
    { id: "kit-1", name: "Smart Medical Kit", category: "Equipment", unitPrice: 1000, qty: 1, imageUrl: "/medical_kit_main.png" },
];

export default function CartPage() {
    const navigate = useNavigate();
    const [cart, setCart] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [checkoutProduct, setCheckoutProduct] = useState(null); // for Buy Now modal
    const [clearConfirm, setClearConfirm] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    /* ── Load/Save ── */
    useEffect(() => {
        try {
            const saved = localStorage.getItem("mv_cart");
            setCart(saved ? JSON.parse(saved) : DEFAULT_CART);
            if (!saved) localStorage.setItem("mv_cart", JSON.stringify(DEFAULT_CART));
        } catch (e) { setCart(DEFAULT_CART); }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) localStorage.setItem("mv_cart", JSON.stringify(cart));
    }, [cart, isLoaded]);

    /* ── Helpers ── */
    const updateQty = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id !== id) return item;
            const newQty = item.qty + delta;
            return newQty <= 0 ? null : { ...item, qty: newQty };
        }).filter(Boolean));
    };
    const removeItem = (id) => setCart(prev => prev.filter(i => i.id !== id));
    const clearAll = () => { setCart([]); setClearConfirm(false); };

    const cartCount = cart.reduce((a, i) => a + i.qty, 0);
    const cartTotal = cart.reduce((a, i) => a + i.unitPrice * i.qty, 0);

    /* ── Build a combined cart order for "Buy Now All" ── */
    const buyNowAll = () => {
        if (cart.length === 0) return;
        // Pass all cart items so the modal can show all selected products & correct total
        setCheckoutProduct({
            // Sentinel to indicate this is a full-cart checkout
            isCartCheckout: true,
            cartItems: cart,                        // all items with qty
            cartTotal: cartTotal,                   // subtotal
            // Provide modal-compatible fallback fields (used by single-item flow)
            id: "cart-checkout",
            name: cart.length === 1
                ? cart[0].name
                : `${cart.length} Items`,
            category: "Cart",
            unitPrice: cartTotal,                   // full subtotal treated as unit price × 1
            imageUrl: cart[0].imageUrl,
        });
    };

    if (!isLoaded) return null;

    return (
        <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Inter', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
                .cp-qty-btn { width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:white;border:1.5px solid #E2E8F0;color:#475569;border-radius:8px;cursor:pointer;transition:all 150ms;flex-shrink:0; }
                .cp-qty-btn:hover { border-color:#00A3A0;color:#00A3A0;background:#F0FDFA; }
                .cp-item-card { background:white;border-radius:16px;border:1.5px solid #E2E8F0;padding:18px 20px;display:flex;align-items:center;gap:16px;transition:box-shadow 200ms,border-color 200ms; }
                .cp-item-card:hover { box-shadow:0 4px 18px rgba(15,23,42,.07);border-color:#CBD5E1; }
                .cp-remove-btn { width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;color:#CBD5E1;border-radius:8px;transition:color 150ms,background 150ms;flex-shrink:0; }
                .cp-remove-btn:hover { color:#DC2626;background:#FEF2F2; }
                @keyframes cpFade { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
            `}</style>

            {/* ═══ HEADER ═══ */}
            <header style={{
                position: "sticky", top: 0, zIndex: 100,
                height: 72,
                background: scrolled ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.60)",
                backdropFilter: scrolled ? "blur(24px)" : "blur(10px)",
                borderBottom: scrolled ? "1px solid #E2E8F0" : "1px solid transparent",
                boxShadow: scrolled ? "0 8px 30px rgba(15,23,42,0.06)" : "none",
                transition: "all 0.5s ease-out",
                display: "flex", alignItems: "center"
            }}>
                <nav style={{ width: "100%", padding: "0 24px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

                    {/* Brand/Logo (Left) */}
                    <div
                        style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                        onClick={() => navigate("/")}
                    >
                        <div style={{
                            width: 42, height: 42, borderRadius: 14,
                            background: "linear-gradient(to bottom right, #0EA5A4, #22D3EE)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 6px 18px rgba(14,165,164,0.30)",
                            transition: "all 0.3s ease"
                        }}>
                            <Stethoscope className="text-white w-[22px] h-[22px]" strokeWidth={2.5} />
                        </div>
                        <span style={{
                            textDecoration: "none", color: "#0F172A", fontSize: 19,
                            fontWeight: 900, letterSpacing: "-0.03em",
                            userSelect: "none"
                        }}>
                            Medical <span style={{ color: "#0EA5A4" }}>Vault</span>
                        </span>
                    </div>

                    {/* RIGHT: Cart Info (Minimal) */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ textAlign: "right", marginRight: 8 }} className="hidden sm:block">
                            <div style={{ fontSize: 12, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reviewing Cart</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#0EA5A4" }}>{cartCount} Items Added</div>
                        </div>

                        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(14,165,164,0.08)", border: "1px solid rgba(14,165,164,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0EA5A4" }}>
                            <ShoppingBag className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                    </div>
                </nav>
            </header>

            {/* ═══ MAIN ═══ */}
            <main style={{ maxWidth: 960, margin: "0 auto", padding: "44px 24px 100px" }}>

                {/* Go Back Link */}
                <motion.button
                    onClick={() => navigate(-1)}
                    whileHover={{ x: -4 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                        display: "flex", alignItems: "center", gap: 8,
                        background: "none", border: "none", cursor: "pointer",
                        color: "#64748B", fontSize: 14, fontWeight: 700,
                        marginBottom: 20, padding: 0
                    }}
                >
                    <ArrowLeft className="w-5 h-5 text-[#0EA5A4]" strokeWidth={2.5} />
                    Continue Shopping
                </motion.button>

                {/* Page title */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: "clamp(24px,4vw,32px)", fontWeight: 900, color: "#0F172A", letterSpacing: "-0.03em" }}>
                            🛒 Your Cart
                        </h1>
                        <p style={{ fontSize: 14, color: "#64748B", marginTop: 4, fontWeight: 500 }}>
                            {cartCount > 0 ? `${cartCount} item${cartCount > 1 ? "s" : ""} · ₹${cartTotal.toLocaleString()} total` : "Your cart is empty"}
                        </p>
                    </div>

                    {cart.length > 0 && (
                        <div style={{ display: "flex", gap: 10 }}>
                            {/* Clear All */}
                            {!clearConfirm ? (
                                <button onClick={() => setClearConfirm(true)} style={{
                                    height: 40, padding: "0 16px", borderRadius: 10,
                                    border: "1.5px solid #FCA5A5", background: "#FFF5F5",
                                    color: "#DC2626", fontSize: 13, fontWeight: 700,
                                    cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                                    transition: "background 150ms, box-shadow 150ms",
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#FEE2E2"}
                                    onMouseLeave={e => e.currentTarget.style.background = "#FFF5F5"}>
                                    <TrashIcon /> Clear All
                                </button>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FEF2F2", padding: "6px 14px", borderRadius: 10, border: "1.5px solid #FCA5A5" }}>
                                    <span style={{ fontSize: 13, color: "#DC2626", fontWeight: 600 }}>Are you sure?</span>
                                    <button onClick={clearAll} style={{ height: 28, padding: "0 12px", borderRadius: 7, border: "none", background: "#DC2626", color: "white", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Yes</button>
                                    <button onClick={() => setClearConfirm(false)} style={{ height: 28, padding: "0 12px", borderRadius: 7, border: "1.5px solid #E2E8F0", background: "white", color: "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>No</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Empty state */}
                {cart.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "72px 24px", background: "white", borderRadius: 20, border: "1.5px solid #E2E8F0", animation: "cpFade .3s ease" }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Your cart is empty</h2>
                        <p style={{ color: "#64748B", marginTop: 8, marginBottom: 28, fontSize: 15 }}>Add products from the shop to get started.</p>
                        <button onClick={() => navigate("/products")} style={{ height: 48, padding: "0 28px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#00A3A0,#2563EB)", color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(0,163,160,.28)" }}>
                            Browse Products →
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Cart Items */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                            {cart.map((item, idx) => (
                                <div key={item.id} className="cp-item-card" style={{ animation: `cpFade .28s ease ${idx * 0.05}s both` }}>
                                    {/* Image */}
                                    <div style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", border: "1.5px solid #E2E8F0", flexShrink: 0, background: "#F8FAFC" }}>
                                        <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            onError={e => { e.target.style.display = "none"; }} />
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</h3>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: "#00A3A0", background: "rgba(0,163,160,.1)", padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: ".05em" }}>{item.category}</span>
                                            <span style={{ fontSize: 13, color: "#94A3B8" }}>₹{item.unitPrice.toLocaleString()}/unit</span>
                                        </div>
                                    </div>

                                    {/* Qty controls */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                        <button className="cp-qty-btn" onClick={() => updateQty(item.id, -1)} aria-label="Decrease">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                        </button>
                                        <span style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", minWidth: 28, textAlign: "center" }}>{item.qty}</span>
                                        <button className="cp-qty-btn" onClick={() => updateQty(item.id, 1)} aria-label="Increase">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                        </button>
                                    </div>

                                    {/* Line total */}
                                    <div style={{ minWidth: 80, textAlign: "right", fontSize: 16, fontWeight: 800, color: "#0F172A", flexShrink: 0 }}>
                                        ₹{(item.unitPrice * item.qty).toLocaleString()}
                                    </div>

                                    {/* Buy Now (per item) */}
                                    <button onClick={() => setCheckoutProduct({ ...item })} style={{
                                        height: 38, padding: "0 16px", borderRadius: 10,
                                        border: "none", background: "linear-gradient(135deg,#F59E0B,#F97316)",
                                        color: "white", fontSize: 13, fontWeight: 800,
                                        cursor: "pointer", fontFamily: "inherit",
                                        boxShadow: "0 2px 10px rgba(245,158,11,.3)",
                                        transition: "transform 150ms,box-shadow 150ms",
                                        flexShrink: 0, whiteSpace: "nowrap",
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(245,158,11,.4)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(245,158,11,.3)"; }}>
                                        Buy Now
                                    </button>

                                    {/* Remove */}
                                    <button className="cp-remove-btn" onClick={() => removeItem(item.id)} aria-label="Remove item">
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* ─── Order Summary Card ─── */}
                        <div style={{ background: "white", borderRadius: 18, border: "1.5px solid #E2E8F0", padding: "24px 28px", boxShadow: "0 4px 24px rgba(15,23,42,.06)" }}>
                            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginBottom: 16, letterSpacing: "-0.01em" }}>Order Summary</h2>

                            {/* Line items */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                                {cart.map(item => (
                                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                                        <span style={{ color: "#475569" }}>{item.name} <span style={{ color: "#94A3B8" }}>× {item.qty}</span></span>
                                        <span style={{ fontWeight: 700, color: "#0F172A" }}>₹{(item.unitPrice * item.qty).toLocaleString()}</span>
                                    </div>
                                ))}
                                <div style={{ height: 1, background: "#E2E8F0", margin: "4px 0" }} />
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                                    <span style={{ color: "#64748B" }}>Platform fee</span>
                                    <span style={{ fontWeight: 700, color: "#0F172A" }}>₹49</span>
                                </div>
                            </div>

                            {/* Total row */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "2px solid #E2E8F0", marginBottom: 20 }}>
                                <span style={{ fontSize: 17, fontWeight: 800, color: "#0F172A" }}>Total Payable</span>
                                <span style={{ fontSize: 28, fontWeight: 900, color: "#00A3A0", letterSpacing: "-0.04em" }}>₹{(cartTotal + 49).toLocaleString()}</span>
                            </div>

                            {/* Buy Now ALL button */}
                            <button onClick={buyNowAll} style={{
                                width: "100%", height: 54, borderRadius: 14,
                                border: "none", background: "linear-gradient(135deg,#F59E0B,#F97316)",
                                color: "white", fontSize: 16, fontWeight: 900,
                                cursor: "pointer", fontFamily: "inherit",
                                boxShadow: "0 4px 18px rgba(245,158,11,.35)",
                                transition: "transform 160ms,box-shadow 160ms",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                                letterSpacing: "-0.01em",
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(245,158,11,.45)"; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 18px rgba(245,158,11,.35)"; }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                                Buy Now · Checkout
                            </button>

                            <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", marginTop: 12, fontWeight: 500 }}>
                                🔒 Secure checkout · UPI / Card / COD supported
                            </p>
                        </div>
                    </>
                )}
            </main>

            {/* ═══ ORDER CHECKOUT MODAL ═══ */}
            {checkoutProduct && (
                <OrderCheckoutModal
                    product={checkoutProduct}
                    onClose={() => setCheckoutProduct(null)}
                />
            )}
        </div>
    );
}
