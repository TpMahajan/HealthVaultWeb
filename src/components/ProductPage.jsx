import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import OrderCheckoutModal from "./OrderCheckoutModal";
import { motion } from "framer-motion";
import { ShoppingCart, Stethoscope, ArrowRight, ShoppingBag } from "lucide-react";
import { API_BASE } from "../constants/api";

/* ─────────────────────────────────────────────────────────────
   PRODUCT DATA
───────────────────────────────────────────────────────────── */
const PRODUCT_IMAGES = [
    {
        src: "/nfc_band_main.png",
        alt: "Medical Vault NFC HealthBand – front view",
        _local: "C:\\Users\\Priyanka\\.gemini\\antigravity\\brain\\6c556ba5-50cd-42c7-9c8d-59f3766e34e7\\nfc_band_product_main_1772453505187.png",
    },
    {
        src: "/nfc_band_closeup.png",
        alt: "NFC chip close-up on the band clasp",
        _local: "C:\\Users\\Priyanka\\.gemini\\antigravity\\brain\\6c556ba5-50cd-42c7-9c8d-59f3766e34e7\\nfc_band_closeup_1772453533118.png",
    },
    {
        src: "/nfc_band_lifestyle.png",
        alt: "NFC HealthBand worn by patient in hospital",
        _local: "C:\\Users\\Priyanka\\.gemini\\antigravity\\brain\\6c556ba5-50cd-42c7-9c8d-59f3766e34e7\\nfc_band_lifestyle_1772453551549.png",
    },
    {
        src: "/nfc_band_packaging.png",
        alt: "NFC HealthBand with Medical Vault app on phone",
        _local: "C:\\Users\\Priyanka\\.gemini\\antigravity\\brain\\6c556ba5-50cd-42c7-9c8d-59f3766e34e7\\nfc_band_packaging_1772453578107.png",
    },
];

const FEATURES = [
    "Instant NFC tap-to-identify patient records",
    "Stores emergency health data, allergies & blood type",
    "Works offline — no Wi-Fi or power needed to scan",
    "Hypoallergenic, waterproof medical-grade silicone",
    "Syncs seamlessly with Medical Vault app",
    "Rechargeable — up to 30-day battery life",
];

const FAQS = [
    {
        q: "What is the Medical Vault NFC HealthBand?",
        a: "The Medical Vault NFC HealthBand is a smart medical wristband that stores your critical health data — blood type, allergies, emergency contacts, medications, and more — on a secure NFC chip. Anyone with a smartphone can tap the band to instantly access your medical profile in an emergency.",
    },
    {
        q: "Does the band need internet or a phone to work?",
        a: "No. The NFC chip works completely offline. First responders, doctors, and nurses can scan it with any NFC-enabled phone — no app, no login, no Wi-Fi required. Just tap and access your essential health info instantly.",
    },
    {
        q: "How do I set up and manage my health data on the band?",
        a: "Simply download the Medical Vault app, create your profile, and tap your band to sync. You can update your health data anytime from the app, and the band will reflect changes the next time you sync via NFC.",
    },
    {
        q: "Is my health data secure on the band?",
        a: "Yes. All data stored on the NFC chip is AES-256 encrypted. You control which information is publicly visible in an emergency and which requires app authentication to access. Your privacy is always protected.",
    },
    {
        q: "Is the band waterproof and safe for daily wear?",
        a: "Absolutely. The Medical Vault NFC HealthBand is IP-67 rated (waterproof up to 1 m for 30 minutes) and made from hypoallergenic medical-grade silicone — safe for sensitive skin, showering, and light swimming.",
    },
    {
        q: "What is the battery life and how do I charge it?",
        a: "The band features a rechargeable battery with up to 30 days of standby life on a single charge. It charges via the included magnetic USB cable in approximately 90 minutes. A low-battery indicator on the Medical Vault app alerts you when it's time to charge.",
    },
];

/* ─────────────────────────────────────────────────────────────
   MINI COMPONENTS
───────────────────────────────────────────────────────────── */

/** Smooth-scroll highlight when element enters viewport */
function useFadeUp(threshold = 0.01) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold, rootMargin: "0px 0px -40px 0px" }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return [ref, visible];
}

/* Cart icon SVG */
const CartIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
);

/* Hamburger icon */
const MenuIcon = ({ open }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round">
        {open
            ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
            : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
        }
    </svg>
);

/* Check icon */
const Check = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A3A0"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

/* Chevron */
const Chevron = ({ open }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round"
        style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 280ms ease" }}>
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function ProductPage() {
    const navigate = useNavigate();

    /* --- nav scroll state --- */
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    /* --- image carousel --- */
    const [activeImg, setActiveImg] = useState(0);
    const [sliding, setSliding] = useState(false);
    const changeImg = (idx) => {
        if (idx === activeImg || sliding) return;
        setSliding(true);
        setTimeout(() => { setActiveImg(idx); setSliding(false); }, 260);
    };

    const [activeKitImg, setActiveKitImg] = useState(0);
    const [kitSliding, setKitSliding] = useState(false);
    const [inventoryMap, setInventoryMap] = useState({});
    const [inventoryError, setInventoryError] = useState("");
    const changeKitImg = (idx) => {
        if (idx === activeKitImg || kitSliding) return;
        setKitSliding(true);
        setTimeout(() => { setActiveKitImg(idx); setKitSliding(false); }, 260);
    };

    /* --- cart item count & add logic --- */
    const [cartCount, setCartCount] = useState(0);
    useEffect(() => {
        try {
            const saved = localStorage.getItem("mv_cart");
            if (saved) {
                const parsed = JSON.parse(saved);
                setCartCount(parsed.reduce((acc, item) => acc + item.qty, 0));
            } else {
                setCartCount(7); // default 7 (1 + 6 items)
            }
        } catch (e) {
            setCartCount(0);
        }
    }, []);

    /* --- per-product cart qty (inline stepper) --- */
    const [nfcQty, setNfcQty] = useState(0);
    const [kitQty, setKitQty] = useState(0);

    const saveCartItem = (id, name, category, unitPrice, imageUrl, newQty) => {
        try {
            let cart = [];
            const saved = localStorage.getItem("mv_cart");
            if (saved) cart = JSON.parse(saved);
            const idx = cart.findIndex(i => i.id === id);
            if (newQty <= 0) {
                if (idx >= 0) cart.splice(idx, 1);
            } else if (idx >= 0) {
                cart[idx].qty = newQty;
            } else {
                cart.push({ id, name, category, unitPrice, qty: newQty, imageUrl });
            }
            localStorage.setItem("mv_cart", JSON.stringify(cart));
            setCartCount(cart.reduce((a, i) => a + i.qty, 0));
        } catch (e) { console.error(e); }
    };

    const fetchInventory = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/inventory`);
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to load inventory");
            }

            const nextMap = (data.data?.products || []).reduce((acc, product) => {
                acc[product.externalProductId] = product;
                return acc;
            }, {});

            setInventoryMap(nextMap);
            setInventoryError("");

            setNfcQty(prev => {
                const next = Math.min(prev, nextMap["band-1"]?.availableStock ?? prev);
                if (next !== prev) {
                    saveCartItem("band-1", "NFC HealthBand", "Wearable", 600, "/nfc_band_main.png", next);
                }
                return next;
            });

            setKitQty(prev => {
                const next = Math.min(prev, nextMap["kit-1"]?.availableStock ?? prev);
                if (next !== prev) {
                    saveCartItem("kit-1", "Smart Medical Kit", "Equipment", 1000, "/medical_kit_main.png", next);
                }
                return next;
            });
        } catch (e) {
            setInventoryError(e.message || "Failed to load inventory");
        }
    }, []);

    useEffect(() => {
        fetchInventory();
        window.addEventListener("inventory:refresh", fetchInventory);
        return () => window.removeEventListener("inventory:refresh", fetchInventory);
    }, [fetchInventory]);

    const changeNfcQty = (delta) => {
        const maxAvailable = inventoryMap["band-1"]?.availableStock ?? Number.POSITIVE_INFINITY;
        const next = Math.max(0, Math.min(maxAvailable, nfcQty + delta));
        setNfcQty(next);
        saveCartItem("band-1", "NFC HealthBand", "Wearable", 600, "/nfc_band_main.png", next);
    };

    const changeKitQty = (delta) => {
        const maxAvailable = inventoryMap["kit-1"]?.availableStock ?? Number.POSITIVE_INFINITY;
        const next = Math.max(0, Math.min(maxAvailable, kitQty + delta));
        setKitQty(next);
        saveCartItem("kit-1", "Smart Medical Kit", "Equipment", 1000, "/medical_kit_main.png", next);
    };

    /* --- FAQ open state --- */
    const [openFaq, setOpenFaq] = useState(null);

    /* --- order summary modal --- */
    const [orderModal, setOrderModal] = useState(null); // null or product object

    /* --- section visibility --- */
    const [heroRef, heroVisible] = useFadeUp(0.01);
    const [prodRef, prodVisible] = useFadeUp(0.01);
    const [faqRef, faqVisible] = useFadeUp(0.01);

    // smooth scroll to section
    const scrollTo = (id) => {
        setMenuOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };

    const nfcInventory = inventoryMap["band-1"] || null;
    const kitInventory = inventoryMap["kit-1"] || null;
    const nfcOutOfStock = nfcInventory?.status === "OUT_OF_STOCK";
    const kitOutOfStock = kitInventory?.status === "OUT_OF_STOCK";

    return (
        <>
            {/* ═══════ ORDER CHECKOUT MODAL ═══════ */}
            {orderModal && (
                <OrderCheckoutModal
                    product={orderModal}
                    onClose={() => setOrderModal(null)}
                />
            )}
            {inventoryError && <div style={{ display: "none" }}>{inventoryError}</div>}
            {/* ═══════ FLOATING VIEW CART PILL ═══════ */}
            {(nfcQty + kitQty) > 0 && (
                <div
                    onClick={() => navigate("/cart")}
                    style={{
                        position: "fixed", bottom: 28, left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 9999,
                        background: "linear-gradient(135deg, #1A6B4A, #16A34A)",
                        borderRadius: 999,
                        padding: "10px 20px 10px 10px",
                        display: "flex", alignItems: "center", gap: 14,
                        cursor: "pointer",
                        boxShadow: "0 8px 32px rgba(22,163,74,0.4), 0 2px 8px rgba(0,0,0,0.12)",
                        animation: "pillSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                        fontFamily: "Inter, sans-serif",
                        minWidth: 220,
                        transition: "box-shadow 180ms, transform 180ms",
                        userSelect: "none",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 12px 40px rgba(22,163,74,0.55)"; e.currentTarget.style.transform = "translateX(-50%) translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(22,163,74,0.4), 0 2px 8px rgba(0,0,0,0.12)"; e.currentTarget.style.transform = "translateX(-50%) translateY(0)"; }}
                >
                    {/* Product circle images */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                        {[
                            nfcQty > 0 && { src: "/nfc_band_main.png", label: "NFC" },
                            kitQty > 0 && { src: "/medical_kit_main.png", label: "Kit" },
                        ].filter(Boolean).map((item, i) => (
                            <div key={i} style={{
                                width: 40, height: 40, borderRadius: "50%",
                                overflow: "hidden", border: "2.5px solid rgba(255,255,255,0.5)",
                                background: "rgba(255,255,255,0.15)",
                                marginLeft: i === 0 ? 0 : -10,
                                flexShrink: 0,
                            }}>
                                <img src={item.src} alt={item.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                        ))}
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "white", lineHeight: 1.2 }}>View cart</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                            {nfcQty + kitQty} item{nfcQty + kitQty > 1 ? "s" : ""} added
                        </div>
                    </div>

                    {/* Arrow */}
                    <div style={{
                        width: 30, height: 30, borderRadius: "50%",
                        background: "rgba(255,255,255,0.18)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </div>

                    <style>{`
                        @keyframes pillSlideUp { from { opacity:0; transform: translateX(-50%) translateY(32px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
                    `}</style>
                </div>
            )}

            {/* ════════════════════════════════════
          GLOBAL STYLES
      ════════════════════════════════════ */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Inter', sans-serif; background: #F0F7FA; color: #0F172A; }

        /* ── Premium Page Background ── */
        .pp-root {
          min-height: 100vh;
          position: relative;
          background: linear-gradient(
            155deg,
            #EAF6F6 0%,
            #F0F7FA 30%,
            #EEF4FF 65%,
            #F0F9FF 100%
          );
          overflow-x: hidden;
        }

        /* ── Floating orbs ── */
        .pp-orb {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          filter: blur(90px);
          opacity: 0.38;
          animation: orbFloat 18s ease-in-out infinite alternate;
          will-change: transform;
        }
        .pp-orb-1 {
          width: 600px; height: 600px;
          top: -120px; left: -160px;
          background: radial-gradient(circle, rgba(14,165,164,0.55) 0%, rgba(34,211,238,0.15) 70%, transparent 100%);
          animation-duration: 20s;
        }
        .pp-orb-2 {
          width: 500px; height: 500px;
          top: 30%; right: -140px;
          background: radial-gradient(circle, rgba(11,104,204,0.40) 0%, rgba(96,165,250,0.12) 70%, transparent 100%);
          animation-duration: 25s;
          animation-delay: -8s;
        }
        .pp-orb-3 {
          width: 420px; height: 420px;
          bottom: 10%; left: 10%;
          background: radial-gradient(circle, rgba(6,182,212,0.35) 0%, rgba(34,211,238,0.08) 70%, transparent 100%);
          animation-duration: 22s;
          animation-delay: -4s;
        }
        @keyframes orbFloat {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(30px, -20px) scale(1.04); }
          66%  { transform: translate(-20px, 30px) scale(0.97); }
          100% { transform: translate(15px, 10px) scale(1.02); }
        }

        /* ── Content must sit above orbs ── */
        .pp-content { position: relative; z-index: 1; }

        /* fade-up anim */
        .fade-up { opacity: 0; transform: translateY(32px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .fade-up.visible { opacity: 1; transform: translateY(0); }
        .fade-up.d1 { transition-delay: 0.08s; }
        .fade-up.d2 { transition-delay: 0.18s; }
        .fade-up.d3 { transition-delay: 0.28s; }
        .fade-up.d4 { transition-delay: 0.38s; }

        /* img slide */
        .img-slide { transition: opacity 0.26s ease, transform 0.4s ease; transform-origin: center; }
        .img-slide.sliding { opacity: 0; transform: scale(0.98); }

        /* image hover zoom */
        .zoom-img { transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .zoom-container:hover .zoom-img { transform: scale(1.05); }

        /* stepper pop-in */
        @keyframes stepperPop { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        /* faq body */
        .faq-body { overflow: hidden; transition: max-height 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease; }

        /* focus ring */
        button:focus-visible { outline: 2px solid #00A3A0; outline-offset: 3px; }
        a:focus-visible { outline: 2px solid #00A3A0; outline-offset: 3px; }

        /* mobile menu */
        .mobile-menu {
          transform-origin: top;
          transition: transform 0.22s ease, opacity 0.22s ease;
        }
        .mobile-menu.closed { transform: scaleY(0); opacity: 0; pointer-events: none; }
        .mobile-menu.open { transform: scaleY(1); opacity: 1; }

        /* ── Premium Buttons ── */
        .btn-primary-amber {
          background: linear-gradient(135deg, #F59E0B 0%, #F0830A 100%);
          color: white;
          border: none;
          cursor: pointer;
          height: 50px;
          padding: 0 32px;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 700;
          box-shadow: 0 4px 18px rgba(245,158,11,0.32), 0 1px 3px rgba(0,0,0,0.10);
          transition: box-shadow 220ms ease, transform 220ms ease, background 220ms ease;
          font-family: 'Inter', sans-serif;
          letter-spacing: -0.01em;
        }
        .btn-primary-amber:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(245,158,11,0.42), 0 2px 8px rgba(0,0,0,0.10);
          background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
        }
        .btn-primary-amber:active { transform: translateY(0); }

        .btn-secondary-outline {
          background: rgba(255,255,255,0.80);
          color: #0F172A;
          border: 1.5px solid #CBD5E1;
          cursor: pointer;
          height: 50px;
          padding: 0 32px;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          transition: border-color 220ms ease, transform 220ms ease, box-shadow 220ms ease, background 220ms ease;
          font-family: 'Inter', sans-serif;
          letter-spacing: -0.01em;
          backdrop-filter: blur(4px);
        }
        .btn-secondary-outline:hover {
          transform: translateY(-2px);
          border-color: #94A3B8;
          background: rgba(255,255,255,0.96);
          box-shadow: 0 6px 18px rgba(15,23,42,0.09);
        }
        .btn-secondary-outline:active { transform: translateY(0); }

        .btn-buy-amber {
          background: linear-gradient(135deg, #F59E0B 0%, #F0830A 100%);
          color: white;
          border: none;
          cursor: pointer;
          height: 48px;
          padding: 0 26px;
          border-radius: 13px;
          font-size: 14px;
          font-weight: 700;
          box-shadow: 0 3px 14px rgba(245,158,11,0.30), 0 1px 3px rgba(0,0,0,0.08);
          transition: box-shadow 200ms ease, transform 200ms ease;
          font-family: 'Inter', sans-serif;
          letter-spacing: -0.01em;
        }
        .btn-buy-amber:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(245,158,11,0.42);
        }
        .btn-buy-amber:active { transform: translateY(0); }

        .btn-cart-outline {
          background: rgba(255,255,255,0.80);
          color: #0F172A;
          border: 1.5px solid #CBD5E1;
          cursor: pointer;
          height: 48px;
          padding: 0 22px;
          border-radius: 13px;
          font-size: 14px;
          font-weight: 600;
          transition: border-color 200ms ease, color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          gap: 8px;
          backdrop-filter: blur(4px);
        }
        .btn-cart-outline:hover {
          border-color: #00A3A0;
          color: #00A3A0;
          box-shadow: 0 4px 14px rgba(0,163,160,0.12);
          transform: translateY(-1px);
        }
        .btn-cart-outline:active { transform: translateY(0); }

        .btn-buy-blue {
          background: linear-gradient(135deg, #1D7FE0 0%, #0B68CC 100%);
          color: white;
          border: none;
          cursor: pointer;
          height: 48px;
          padding: 0 26px;
          border-radius: 13px;
          font-size: 14px;
          font-weight: 700;
          box-shadow: 0 3px 14px rgba(11,104,204,0.30), 0 1px 3px rgba(0,0,0,0.08);
          transition: box-shadow 200ms ease, transform 200ms ease;
          font-family: 'Inter', sans-serif;
          letter-spacing: -0.01em;
        }
        .btn-buy-blue:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(11,104,204,0.40);
        }
        .btn-buy-blue:active { transform: translateY(0); }

        .btn-cart-blue-outline {
          background: rgba(255,255,255,0.80);
          color: #0F172A;
          border: 1.5px solid #CBD5E1;
          cursor: pointer;
          height: 48px;
          padding: 0 22px;
          border-radius: 13px;
          font-size: 14px;
          font-weight: 600;
          transition: border-color 200ms ease, color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          gap: 8px;
          backdrop-filter: blur(4px);
        }
        .btn-cart-blue-outline:hover {
          border-color: #0B68CC;
          color: #0B68CC;
          box-shadow: 0 4px 14px rgba(11,104,204,0.12);
          transform: translateY(-1px);
        }
        .btn-cart-blue-outline:active { transform: translateY(0); }

        /* trust badge glassmorphism */
        .trust-badge-row {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          padding: 16px 20px;
          background: rgba(255,255,255,0.60);
          border-radius: 14px;
          border: 1px solid rgba(226,232,240,0.80);
          backdrop-filter: blur(8px);
          box-shadow: 0 2px 12px rgba(15,23,42,0.05);
        }

        /* faq glassmorphism card */
        .faq-section-bg {
          background: rgba(255,255,255,0.70);
          backdrop-filter: blur(16px);
          border-top: 1px solid rgba(226,232,240,0.70);
          border-bottom: 1px solid rgba(226,232,240,0.70);
        }

        /* footer cta buttons */
        .btn-buy-teal {
          height: 54px;
          min-width: 190px;
          padding: 0 32px;
          border-radius: 16px;
          background: linear-gradient(135deg, #0FC4C3 0%, #0D9493 60%, #0A7E7D 100%);
          color: white;
          font-size: 15.5px;
          font-weight: 800;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 10px 25px rgba(14,165,164,0.30), 0 2px 6px rgba(0,0,0,0.08);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          letter-spacing: -0.01em;
          font-family: 'Inter', sans-serif;
        }
        .btn-buy-teal:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 35px rgba(14,165,164,0.40), 0 6px 12px rgba(0,0,0,0.12);
        }
        .btn-buy-teal:active {
          transform: translateY(-1px);
        }

        .btn-outline-gray {
          height: 54px;
          min-width: 190px;
          padding: 0 32px;
          border-radius: 16px;
          background: rgba(255,255,255,0.70);
          color: #334155;
          font-size: 15.5px;
          font-weight: 700;
          border: 1.5px solid #E2E8F0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(12px);
          box-shadow: 0 2px 10px rgba(15,23,42,0.04);
          letter-spacing: -0.01em;
          font-family: 'Inter', sans-serif;
        }
        .btn-outline-gray:hover {
          border-color: #0FC4C3;
          background: #ffffff;
          box-shadow: 0 8px 20px rgba(14,165,164,0.12);
          transform: translateY(-3px);
          color: #0D9493;
        }
        .btn-outline-gray:hover svg {
          opacity: 1 !important;
          transform: translateX(4px);
        }
        .btn-outline-gray svg {
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .btn-outline-gray:active {
          transform: translateY(-1px);
        }
      `}</style>

            <div className="pp-root">
                {/* ── Animated background orbs ── */}
                <div className="pp-orb pp-orb-1" />
                <div className="pp-orb pp-orb-2" />
                <div className="pp-orb pp-orb-3" />
                <div className="pp-content">

                    {/* ════════════════════════════════════
            HEADER / NAV
        ════════════════════════════════════ */}
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
                        <nav style={{
                            width: "100%",
                            padding: "0 24px",
                            height: "100%",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}>
                            {/* Brand */}
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

                            {/* Center space filler (replaces top nav links) */}

                            {/* Right side */}
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                {/* My Orders Link */}
                                <button
                                    onClick={() => navigate("/orders")}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: "#64748B",
                                        padding: "0 4px",
                                        transition: "color 0.2s"
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = "#0EA5A4"}
                                    onMouseLeave={e => e.currentTarget.style.color = "#64748B"}
                                >
                                    My Orders
                                </button>

                                {/* Your Cart Button (Improved) */}
                                <motion.button
                                    onClick={() => navigate("/cart")}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        position: "relative",
                                        height: 42,
                                        padding: "0 20px",
                                        borderRadius: 13,
                                        background: "rgba(255, 255, 255, 0.4)",
                                        border: "1px solid #E2E8F0",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        cursor: "pointer",
                                        overflow: "hidden",
                                        transition: "all 0.3s ease",
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
                                        e.currentTarget.style.background = "rgba(239, 246, 255, 0.2)";
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = "#E2E8F0";
                                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.4)";
                                    }}
                                >
                                    {/* Animated pulse ring */}
                                    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <motion.div
                                            animate={{ scale: [1, 2], opacity: [0.4, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                                            style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: "rgba(59, 130, 246, 0.4)" }}
                                        />
                                        <ShoppingCart className="h-4 w-4 text-blue-500" strokeWidth={2.5} />
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 800, color: "#475569", transition: "color 0.3s" }}>
                                        Your Cart
                                    </span>
                                    {cartCount > 0 && (
                                        <span style={{
                                            background: "#3b82f6", color: "white",
                                            padding: "2px 6px", borderRadius: 6,
                                            fontSize: 10, fontWeight: 900,
                                            marginLeft: -4
                                        }}>
                                            {cartCount}
                                        </span>
                                    )}
                                </motion.button>

                                {/* Hamburger */}
                                <button className="show-on-mobile"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#45556C", display: "none" }}
                                    onClick={() => setMenuOpen(o => !o)}
                                    aria-label="Toggle navigation menu">
                                    <MenuIcon open={menuOpen} />
                                </button>
                            </div>
                        </nav>

                        {/* Mobile menu */}
                        <div className={`mobile-menu ${menuOpen ? "open" : "closed"}`}
                            style={{
                                background: "#fff", borderTop: "1px solid #E2E8F0",
                                display: "none",
                                flexDirection: "column", gap: 0,
                            }}>
                            {["Products", "Features", "FAQ"].map((link) => (
                                <button key={link}
                                    onClick={() => scrollTo(link.toLowerCase())}
                                    style={{
                                        padding: "14px 24px", textAlign: "left",
                                        background: "none", border: "none", cursor: "pointer",
                                        fontSize: 15, fontWeight: 600, color: "#0F172A",
                                        borderBottom: "1px solid #F1F5F9",
                                        fontFamily: "Inter, sans-serif",
                                    }}>
                                    {link}
                                </button>
                            ))}
                        </div>
                    </header>

                    {/* ════════════════════════════════════
            HERO
        ════════════════════════════════════ */}
                    <section id="features" ref={heroRef} style={{
                        maxWidth: 1000, margin: "0 auto", textAlign: "center",
                        padding: "32px 32px 64px",
                        minHeight: "calc(100vh - 68px)",
                        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                    }}>
                        {/* Pill */}
                        <div className={`fade-up ${heroVisible ? "visible" : ""}`}
                            style={{ display: "inline-flex", marginBottom: 22 }}>
                            <span style={{
                                background: "#DFF1F2", color: "#00A3A0",
                                padding: "6px 18px", borderRadius: 999,
                                fontSize: 13, fontWeight: 600,
                                letterSpacing: "-0.01em",
                                border: "1px solid rgba(0,163,160,0.2)",
                            }}>
                                Enterprise Medical Solutions
                            </span>
                        </div>

                        {/* Headline — two clean lines */}
                        <h1 className={`fade-up d1 ${heroVisible ? "visible" : ""}`}
                            style={{
                                fontSize: "clamp(30px, 5vw, 56px)",
                                fontWeight: 900,
                                lineHeight: 1.14,
                                letterSpacing: "-0.035em",
                                color: "#0F172A",
                                marginBottom: 22,
                                whiteSpace: "normal",
                            }}>
                            {/* Line 1 */}
                            <span style={{ display: "block" }}>
                                Start with{" "}
                                <span style={{ color: "#00A3A0" }}>Medical Vault</span>
                                {" "}and
                            </span>
                            {/* Line 2 */}
                            <span style={{ display: "block", color: "#0B68CC" }}>
                                Take Control of Your Health.
                            </span>
                        </h1>

                        {/* Subtext */}
                        <p className={`fade-up d2 ${heroVisible ? "visible" : ""}`}
                            style={{
                                fontSize: "clamp(14px, 1.8vw, 16.5px)",
                                color: "#45556C", lineHeight: 1.78, fontWeight: 500,
                                maxWidth: 640, margin: "0 auto 36px",
                            }}>
                            Your health journey deserves care, trust, and protection.{" "}
                            Medical Vault helps you stay prepared, protected, and confident every day.
                        </p>

                        {/* CTA buttons */}
                        <div className={`fade-up d3 ${heroVisible ? "visible" : ""}`}
                            style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                            {/* View Catalog */}
                            <button
                                onClick={() => scrollTo("products")}
                                className="btn-primary-amber">
                                View Products
                            </button>

                            {/* Learn More */}
                            <button
                                onClick={() => scrollTo("faq")}
                                className="btn-secondary-outline">
                                Learn More
                            </button>
                        </div>
                    </section>

                    {/* ════════════════════════════════════
            PRODUCT SECTION
        ════════════════════════════════════ */}
                    <section id="products" ref={prodRef} style={{
                        maxWidth: 1160, margin: "0 auto",
                        padding: "60px 24px 100px",
                    }}>
                        {/* Section label */}
                        <div className={`fade-up ${prodVisible ? "visible" : ""}`}
                            style={{ textAlign: "center", marginBottom: 56 }}>
                            <span style={{
                                display: "inline-flex", alignItems: "center", gap: 8,
                                background: "rgba(0,163,160,0.08)", border: "1px solid rgba(0,163,160,0.18)",
                                borderRadius: 999, padding: "6px 16px",
                                fontSize: 12, fontWeight: 800, letterSpacing: "0.12em",
                                textTransform: "uppercase", color: "#00A3A0",
                            }}>
                                Featured Product
                            </span>
                            <h2 style={{
                                fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900,
                                color: "#0F172A", letterSpacing: "-0.03em", lineHeight: 1.1,
                                marginTop: 16,
                            }}>
                                Medical Vault NFC HealthBand
                            </h2>
                        </div>

                        {/* Two-column layout */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                            gap: 52, alignItems: "start",
                        }}>
                            {/* ── LEFT: Gallery ── */}
                            <div className={`fade-up d1 ${prodVisible ? "visible" : ""}`}>
                                {/* Main image */}
                                <div className="zoom-container" style={{
                                    borderRadius: 20, overflow: "hidden",
                                    border: "1px solid #E2E8F0",
                                    boxShadow: "0 8px 40px rgba(15,23,42,0.10)",
                                    background: "#fff",
                                    aspectRatio: "4/3", position: "relative",
                                }}>
                                    <img
                                        src={PRODUCT_IMAGES[activeImg].src}
                                        alt={PRODUCT_IMAGES[activeImg].alt}
                                        className={`img-slide zoom-img ${sliding ? " sliding" : ""}`}
                                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                    />
                                    {/* Prev/Next arrows */}
                                    {[
                                        { dir: -1, pos: "left: 12px" },
                                        { dir: 1, pos: "right: 12px" },
                                    ].map(({ dir, pos }) => (
                                        <button key={dir}
                                            onClick={() => changeImg((activeImg + dir + PRODUCT_IMAGES.length) % PRODUCT_IMAGES.length)}
                                            aria-label={dir < 0 ? "Previous image" : "Next image"}
                                            style={{
                                                position: "absolute", top: "50%", transform: "translateY(-50%)",
                                                [dir < 0 ? "left" : "right"]: 12,
                                                width: 36, height: 36, borderRadius: "50%",
                                                background: "rgba(255,255,255,0.90)", border: "1px solid #E2E8F0",
                                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                                color: "#0F172A",
                                                boxShadow: "0 2px 8px rgba(15,23,42,0.12)",
                                                transition: "box-shadow 150ms",
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(15,23,42,0.20)"}
                                            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(15,23,42,0.12)"}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                {dir < 0
                                                    ? <polyline points="15 18 9 12 15 6" />
                                                    : <polyline points="9 18 15 12 9 6" />}
                                            </svg>
                                        </button>
                                    ))}
                                </div>

                                {/* Thumbnails */}
                                <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                                    {PRODUCT_IMAGES.map((img, i) => (
                                        <button key={i} onClick={() => changeImg(i)}
                                            aria-label={`View image ${i + 1}: ${img.alt}`}
                                            style={{
                                                width: 68, height: 54, borderRadius: 10, overflow: "hidden",
                                                border: i === activeImg ? "2px solid #00A3A0" : "2px solid #E2E8F0",
                                                cursor: "pointer", padding: 0, background: "none",
                                                transition: "border-color 180ms",
                                                flexShrink: 0,
                                            }}>
                                            <img src={img.src} alt={img.alt}
                                                className="zoom-img"
                                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── RIGHT: Info ── */}
                            <div className={`fade-up d2 ${prodVisible ? "visible" : ""}`}
                                style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                                {/* Badge + title */}
                                <div>
                                    <span style={{
                                        background: "#DFF1F2", color: "#00A3A0",
                                        padding: "5px 14px", borderRadius: 999,
                                        fontSize: 12, fontWeight: 700, letterSpacing: "0.05em",
                                    }}>
                                        CE Marked · ISO 13485 · IP-67 Waterproof
                                    </span>
                                    <h2 style={{
                                        fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900,
                                        color: "#0F172A", letterSpacing: "-0.03em",
                                        lineHeight: 1.12, marginTop: 14, marginBottom: 8,
                                    }}>
                                        NFC HealthBand <br />
                                        <span style={{ color: "#00A3A0" }}>Your Health, Always On You.</span>
                                    </h2>
                                    <p style={{ color: "#45556C", fontSize: 15, lineHeight: 1.7, fontWeight: 500, maxWidth: 440 }}>
                                        A smart medical wristband that stores your critical health data on a
                                        secure NFC chip — tap any phone to instantly share blood type,
                                        allergies, and emergency contacts. No app, no Wi-Fi, no delay.
                                    </p>
                                </div>

                                {/* Features list */}
                                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                                    {FEATURES.map((f, i) => (
                                        <li key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <span style={{
                                                width: 22, height: 22, borderRadius: "50%",
                                                background: "rgba(0,163,160,0.10)",
                                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                            }}>
                                                <Check />
                                            </span>
                                            <span style={{ fontSize: 14.5, fontWeight: 600, color: "#334155" }}>{f}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* Divider */}
                                <div style={{ height: 1, background: "#E2E8F0" }} />

                                {/* Price + CTA */}
                                <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                            Starting from
                                        </div>
                                        <div style={{ fontSize: 34, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.04em" }}>
                                            ₹600<span style={{ fontSize: 16, fontWeight: 600, color: "#94A3B8" }}>/unit</span>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                        {/* Buy Now - NFC Band */}
                                        <button
                                            onClick={() => {
                                                if (nfcOutOfStock) return;
                                                setOrderModal({
                                                    id: "band-1", name: "NFC HealthBand",
                                                    category: "Wearable", unitPrice: 600,
                                                    imageUrl: "/nfc_band_main.png",
                                                });
                                            }}
                                            disabled={nfcOutOfStock}
                                            className="btn-buy-amber"
                                            style={nfcOutOfStock ? { opacity: 0.55, cursor: "not-allowed", boxShadow: "none" } : undefined}>
                                            {nfcOutOfStock ? "Out of Stock" : "Buy Now"}
                                        </button>

                                        {/* Add to Cart / Inline Stepper - NFC Band */}
                                        {nfcOutOfStock ? (
                                            <button
                                                disabled
                                                className="btn-cart-outline"
                                                style={{ opacity: 0.55, cursor: "not-allowed" }}>
                                                Out of Stock
                                            </button>
                                        ) : nfcQty === 0 ? (
                                            <button onClick={() => changeNfcQty(1)} className="btn-cart-outline">
                                                <CartIcon />
                                                Add to Cart
                                            </button>
                                        ) : (
                                            <div style={{
                                                display: "flex", alignItems: "center",
                                                height: 48, borderRadius: 10,
                                                border: "1.5px solid #00A3A0",
                                                overflow: "hidden",
                                                animation: "stepperPop 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                                            }}>
                                                <button onClick={() => changeNfcQty(-1)} style={{
                                                    width: 46, height: "100%", background: "#F0FDFA",
                                                    border: "none", cursor: "pointer",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    color: "#00A3A0", transition: "background 140ms",
                                                }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "#CCFBF1"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "#F0FDFA"}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                                </button>
                                                <span style={{
                                                    minWidth: 40, textAlign: "center",
                                                    fontSize: 15, fontWeight: 800, color: "#0F172A",
                                                    borderLeft: "1px solid #CCFBF1", borderRight: "1px solid #CCFBF1",
                                                    lineHeight: "46px",
                                                }}>{nfcQty}</span>
                                                <button onClick={() => changeNfcQty(1)} style={{
                                                    width: 46, height: "100%", background: "#00A3A0",
                                                    border: "none", cursor: "pointer",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    color: "white", transition: "background 140ms",
                                                }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "#008F8C"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "#00A3A0"}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Trust badge row */}
                                <div className="trust-badge-row">
                                    {[
                                        { icon: "🔒", text: "HIPAA Compliant" },
                                        { icon: "🚚", text: "Global Shipping" },
                                        { icon: "🛡️", text: "3-Year Warranty" },
                                    ].map((b) => (
                                        <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                            <span style={{ fontSize: 16 }}>{b.icon}</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: "#45556C" }}>{b.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ════════════════════════════════════
            SECOND PRODUCT — MEDICAL KIT
        ════════════════════════════════════ */}
                    <section style={{
                        maxWidth: 1160, margin: "0 auto",
                        padding: "0 24px 100px",
                    }}>
                        {/* Divider */}
                        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #E2E8F0, transparent)", marginBottom: 80 }} />

                        {/* Section label */}
                        <div className={`fade-up ${prodVisible ? "visible" : ""}`}
                            style={{ textAlign: "center", marginBottom: 56 }}>
                            <span style={{
                                display: "inline-flex", alignItems: "center", gap: 8,
                                background: "rgba(11,104,204,0.08)", border: "1px solid rgba(11,104,204,0.18)",
                                borderRadius: 999, padding: "6px 16px",
                                fontSize: 12, fontWeight: 800, letterSpacing: "0.12em",
                                textTransform: "uppercase", color: "#0B68CC",
                            }}>
                                Also Available
                            </span>
                            <h2 style={{
                                fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900,
                                color: "#0F172A", letterSpacing: "-0.03em", lineHeight: 1.1,
                                marginTop: 16,
                            }}>
                                Medical Vault Smart Medical Kit
                            </h2>
                        </div>

                        {/* Two-column layout — MIRRORED: info left, image right */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                            gap: 52, alignItems: "start",
                        }}>

                            {/* ── LEFT: Info ── */}
                            <div className={`fade-up d1 ${prodVisible ? "visible" : ""}`}
                                style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                                {/* Badge + title */}
                                <div>
                                    <span style={{
                                        background: "rgba(11,104,204,0.10)", color: "#0B68CC",
                                        padding: "5px 14px", borderRadius: 999,
                                        fontSize: 12, fontWeight: 700, letterSpacing: "0.05em",
                                    }}>
                                        32-Item Kit · Smart Inventory Tracking
                                    </span>
                                    <h2 style={{
                                        fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900,
                                        color: "#0F172A", letterSpacing: "-0.03em",
                                        lineHeight: 1.12, marginTop: 14, marginBottom: 8,
                                    }}>
                                        Smart Medical Kit <br />
                                        <span style={{ color: "#0B68CC" }}>Always Ready. Always Complete.</span>
                                    </h2>
                                    <p style={{ color: "#45556C", fontSize: 15, lineHeight: 1.7, fontWeight: 500, maxWidth: 440 }}>
                                        A comprehensive 32-item smart medical kit that tracks
                                        expiry dates, low-stock alerts, and syncs with the
                                        Medical Vault app — so your kit is always ready when
                                        it matters most.
                                    </p>
                                </div>

                                {/* Features list */}
                                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                                    {[
                                        "32-item clinical-grade first-aid supplies",
                                        "Smart expiry tracking via Medical Vault app",
                                        "Low-stock alerts sent to your phone",
                                        "Organised compartments with quick-access layout",
                                        "Waterproof hard-shell carrying case",
                                        "Syncs supply usage with your health history",
                                    ].map((f, i) => (
                                        <li key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <span style={{
                                                width: 22, height: 22, borderRadius: "50%",
                                                background: "rgba(11,104,204,0.10)",
                                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                            }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0B68CC" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            </span>
                                            <span style={{ fontSize: 14.5, fontWeight: 600, color: "#334155" }}>{f}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* Divider */}
                                <div style={{ height: 1, background: "#E2E8F0" }} />

                                {/* Price + CTA */}
                                <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginTop: 8 }}>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                            Starting from
                                        </div>
                                        <div style={{ fontSize: 34, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.04em" }}>
                                            ₹1,000<span style={{ fontSize: 16, fontWeight: 600, color: "#94A3B8" }}>/kit</span>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                        {/* Buy Now - Medical Kit */}
                                        <button
                                            onClick={() => {
                                                if (kitOutOfStock) return;
                                                setOrderModal({
                                                    id: "kit-1", name: "Smart Medical Kit",
                                                    category: "Equipment", unitPrice: 1000,
                                                    imageUrl: "/medical_kit_main.png",
                                                });
                                            }}
                                            disabled={kitOutOfStock}
                                            className="btn-buy-blue"
                                            style={kitOutOfStock ? { opacity: 0.55, cursor: "not-allowed", boxShadow: "none" } : undefined}>
                                            {kitOutOfStock ? "Out of Stock" : "Buy Now"}
                                        </button>

                                        {/* Add to Cart / Inline Stepper - Kit */}
                                        {kitOutOfStock ? (
                                            <button
                                                disabled
                                                className="btn-cart-blue-outline"
                                                style={{ opacity: 0.55, cursor: "not-allowed" }}>
                                                Out of Stock
                                            </button>
                                        ) : kitQty === 0 ? (
                                            <button onClick={() => changeKitQty(1)} className="btn-cart-blue-outline">
                                                <CartIcon />
                                                Add to Cart
                                            </button>
                                        ) : (
                                            <div style={{
                                                display: "flex", alignItems: "center",
                                                height: 48, borderRadius: 10,
                                                border: "1.5px solid #0B68CC",
                                                overflow: "hidden",
                                                animation: "stepperPop 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                                            }}>
                                                <button onClick={() => changeKitQty(-1)} style={{
                                                    width: 46, height: "100%", background: "#EFF6FF",
                                                    border: "none", cursor: "pointer",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    color: "#0B68CC", transition: "background 140ms",
                                                }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "#DBEAFE"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "#EFF6FF"}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                                </button>
                                                <span style={{
                                                    minWidth: 40, textAlign: "center",
                                                    fontSize: 15, fontWeight: 800, color: "#0F172A",
                                                    borderLeft: "1px solid #BFDBFE", borderRight: "1px solid #BFDBFE",
                                                    lineHeight: "46px",
                                                }}>{kitQty}</span>
                                                <button onClick={() => changeKitQty(1)} style={{
                                                    width: 46, height: "100%", background: "#0B68CC",
                                                    border: "none", cursor: "pointer",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    color: "white", transition: "background 140ms",
                                                }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "#0A58A8"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "#0B68CC"}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Trust badges */}
                                <div className="trust-badge-row" style={{ marginTop: 12 }}>
                                    {[
                                        { icon: "✅", text: "CE & ISO Certified" },
                                        { icon: "🚚", text: "Free Worldwide Shipping" },
                                        { icon: "🔄", text: "Easy Restocking" },
                                    ].map((b) => (
                                        <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                            <span style={{ fontSize: 16 }}>{b.icon}</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: "#45556C" }}>{b.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── RIGHT: Image Gallery ── */}
                            <div className={`fade-up d2 ${prodVisible ? "visible" : ""}`}>
                                {/* Main image */}
                                <div className="zoom-container" style={{
                                    borderRadius: 20, overflow: "hidden",
                                    border: "1px solid #E2E8F0",
                                    boxShadow: "0 8px 40px rgba(11,104,204,0.10)",
                                    background: "#fff",
                                    aspectRatio: "4/3", position: "relative",
                                }}>
                                    <img
                                        src={[
                                            "/medical_kit_main.png",
                                            "/medical_kit_contents.png",
                                            "/medical_kit_app.png"
                                        ][activeKitImg]}
                                        alt="Medical Vault Smart Medical Kit"
                                        className={`img-slide zoom-img ${kitSliding ? " sliding" : ""}`}
                                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                    />
                                    {/* Prev/Next arrows */}
                                    {[
                                        { dir: -1, pos: "left: 12px" },
                                        { dir: 1, pos: "right: 12px" },
                                    ].map(({ dir, pos }) => (
                                        <button key={dir}
                                            onClick={() => changeKitImg((activeKitImg + dir + 3) % 3)}
                                            aria-label={dir < 0 ? "Previous image" : "Next image"}
                                            style={{
                                                position: "absolute", top: "50%", transform: "translateY(-50%)",
                                                [dir < 0 ? "left" : "right"]: 12,
                                                width: 36, height: 36, borderRadius: "50%",
                                                background: "rgba(255,255,255,0.90)", border: "1px solid #E2E8F0",
                                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                                color: "#0F172A",
                                                boxShadow: "0 2px 8px rgba(15,23,42,0.12)",
                                                transition: "box-shadow 150ms",
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(15,23,42,0.20)"}
                                            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(15,23,42,0.12)"}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                {dir < 0
                                                    ? <polyline points="15 18 9 12 15 6" />
                                                    : <polyline points="9 18 15 12 9 6" />}
                                            </svg>
                                        </button>
                                    ))}
                                </div>

                                {/* Thumbnails */}
                                <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                                    {[
                                        { src: "/medical_kit_main.png", alt: "Kit open view" },
                                        { src: "/medical_kit_contents.png", alt: "Kit contents laid out" },
                                        { src: "/medical_kit_app.png", alt: "Kit with Medical Vault app" },
                                    ].map((img, i) => (
                                        <button key={i} onClick={() => changeKitImg(i)}
                                            aria-label={`View image ${i + 1}`}
                                            style={{
                                                width: 80, height: 64, borderRadius: 10, overflow: "hidden",
                                                border: i === activeKitImg ? "2px solid #0B68CC" : "2px solid #E2E8F0",
                                                flexShrink: 0, padding: 0, background: "none", cursor: "pointer",
                                                transition: "border-color 180ms"
                                            }}>
                                            <img src={img.src} alt={img.alt}
                                                className="zoom-img"
                                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section >

                    {/* ════════════════════════════════════
            FAQ SECTION
        ════════════════════════════════════ */}
                    <section id="faq" ref={faqRef} className="faq-section-bg" style={{
                        padding: "80px 24px",
                    }}>
                        <div style={{ maxWidth: 720, margin: "0 auto" }}>
                            {/* Header */}
                            <div className={`fade-up ${faqVisible ? "visible" : ""}`}
                                style={{ textAlign: "center", marginBottom: 52 }}>
                                <span style={{
                                    display: "inline-block",
                                    background: "rgba(0,163,160,0.08)", color: "#00A3A0",
                                    borderRadius: 999, padding: "6px 16px",
                                    fontSize: 12, fontWeight: 800, letterSpacing: "0.12em",
                                    textTransform: "uppercase", marginBottom: 14,
                                }}>
                                    FAQ
                                </span>
                                <h2 style={{
                                    fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900,
                                    color: "#0F172A", letterSpacing: "-0.03em", lineHeight: 1.1,
                                }}>
                                    Frequently Asked Questions
                                </h2>
                                <p style={{ color: "#45556C", fontSize: 15.5, marginTop: 12, lineHeight: 1.7, fontWeight: 500 }}>
                                    Everything you need to know before deploying NFCPro in your facility.
                                </p>
                            </div>

                            {/* Accordion */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {FAQS.map((faq, i) => {
                                    const isOpen = openFaq === i;
                                    return (
                                        <div key={i} className={`fade-up ${faqVisible ? "visible" : ""}`}
                                            style={{ transitionDelay: `${0.06 * i}s` }}>
                                            <div style={{
                                                border: `1px solid ${isOpen ? "#00A3A0" : "#E2E8F0"}`,
                                                borderRadius: 14, overflow: "hidden",
                                                background: isOpen ? "rgba(0,163,160,0.02)" : "white",
                                                transition: "border-color 220ms ease, background 220ms ease",
                                                boxShadow: isOpen ? "0 4px 20px rgba(0,163,160,0.08)" : "none",
                                            }}>
                                                {/* Question */}
                                                <button
                                                    onClick={() => setOpenFaq(isOpen ? null : i)}
                                                    aria-expanded={isOpen}
                                                    style={{
                                                        width: "100%", textAlign: "left",
                                                        background: "none", border: "none", cursor: "pointer",
                                                        padding: "18px 22px",
                                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                                        gap: 16, fontFamily: "Inter, sans-serif",
                                                    }}>
                                                    <span style={{
                                                        fontSize: 15.5, fontWeight: 700, color: "#0F172A",
                                                        lineHeight: 1.4,
                                                    }}>
                                                        {faq.q}
                                                    </span>
                                                    <span style={{ color: isOpen ? "#00A3A0" : "#94A3B8", flexShrink: 0 }}>
                                                        <Chevron open={isOpen} />
                                                    </span>
                                                </button>

                                                {/* Answer */}
                                                <div className="faq-body" style={{
                                                    maxHeight: isOpen ? 300 : 0,
                                                    opacity: isOpen ? 1 : 0,
                                                }}>
                                                    <p style={{
                                                        padding: "0 22px 20px",
                                                        fontSize: 14.5, color: "#45556C",
                                                        lineHeight: 1.75, fontWeight: 500,
                                                    }}>
                                                        {faq.a}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section >

                    {/* ════════════════════════════════════
                    PREMIUM CTA / FOOTER
                ════════════════════════════════════ */}
                    <section style={{
                        position: "relative",
                        padding: "100px 24px",
                        overflow: "hidden",
                        background: "transparent"
                    }}>
                        {/* Background Accents */}
                        <div style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "800px",
                            height: "800px",
                            background: "radial-gradient(circle, rgba(14, 165, 164, 0.08) 0%, rgba(34, 211, 238, 0.03) 100%)",
                            borderRadius: "50%",
                            filter: "blur(80px)",
                            pointerEvents: "none"
                        }} />

                        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1, textAlign: "center" }}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                            >
                                <span style={{
                                    display: "inline-flex", alignItems: "center", gap: 8,
                                    background: "rgba(14, 165, 164, 0.08)",
                                    border: "1px solid rgba(14, 165, 164, 0.15)",
                                    borderRadius: 999, padding: "6px 16px",
                                    fontSize: 13, fontWeight: 700, color: "#0EA5A4",
                                    marginBottom: 24, textTransform: "uppercase", letterSpacing: "0.1em"
                                }}>
                                    Ready to take control?
                                </span>

                                <h2 style={{
                                    fontSize: "clamp(32px, 5vw, 52px)",
                                    fontWeight: 900,
                                    color: "#0F172A",
                                    lineHeight: 1.1,
                                    letterSpacing: "-0.04em",
                                    marginBottom: 24
                                }}>
                                    Get started shopping with <br />
                                    <span style={{ background: "linear-gradient(to right, #0EA5A4, #22D3EE)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                        Medical Vault
                                    </span>
                                </h2>

                                <p style={{
                                    fontSize: "clamp(16px, 2vw, 18px)",
                                    color: "#64748B",
                                    lineHeight: 1.6,
                                    maxWidth: 600,
                                    margin: "0 auto 40px",
                                    fontWeight: 500
                                }}>
                                    Join thousands of healthcare professionals and patients securing their future. Precision protection is just one tap away.
                                </p>

                                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
                                    <motion.button
                                        onClick={() => scrollTo("products")}
                                        whileHover={{ scale: 1.04, y: -3 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="btn-buy-teal"
                                    >
                                        Buy Now
                                        <ShoppingBag className="w-5 h-5" strokeWidth={2.5} />
                                    </motion.button>

                                    <motion.button
                                        onClick={() => navigate("/")}
                                        whileHover={{ scale: 1.04, y: -3 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="btn-outline-gray group"
                                    >
                                        Explore Platform
                                        <ArrowRight className="w-5 h-5 opacity-70" />
                                    </motion.button>
                                </div>
                            </motion.div>
                        </div>
                    </section>


                    {/* Responsive style overrides */}
                    <style>{`
                    @media (max-width: 640px) {
                        .hide-on-mobile { display: none !important; }
                        .show-on-mobile { display: flex !important; }
                        .mobile-menu { display: flex !important; }
                    }
                `}</style>

                </div>{/* end pp-content */}
            </div>{/* end pp-root */}
        </>
    );
}

