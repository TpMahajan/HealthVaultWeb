import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  ChevronDown,
  Clock,
  FileText,
  Info,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Star,
  Stethoscope,
  Tag,
  Trash2,
  Truck,
  X,
  Zap,
} from "lucide-react";

import {
  addStoreCartItem,
  fetchStoreCart,
  fetchStoreProducts,
  removeStoreCartItem,
  updateStoreCartItem,
} from "../utils/storeApi";

/* ─────────────────────────────────────────────────────────────────
   Static data
───────────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Medicines", value: "Medicines" },
  { label: "Medical Devices", value: "Medical Devices" },
  { label: "Health Essentials", value: "Health Essentials" },
];

const SORT_OPTIONS = [
  { label: "Newest first", value: "newest" },
  { label: "Price: Low → High", value: "price_asc" },
  { label: "Price: High → Low", value: "price_desc" },
  { label: "Top Rated", value: "rating_desc" },
];

const FEATURES = [
  { icon: BadgeCheck, title: "100% Authentic", sub: "Verified products only" },
  { icon: Truck,      title: "Free Delivery",  sub: "On orders over ₹499" },
  { icon: Zap,        title: "Express Dispatch", sub: "Same-day on weekdays" },
];

const EMPTY_CART = { items: [], totals: { itemCount: 0, subtotal: 0 } };

/* ─────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */
const formatInr = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const starsArray = (rating) =>
  [1, 2, 3, 4, 5].map((s) => ({
    filled: s <= Math.round(rating),
    key: s,
  }));

/* ═════════════════════════════════════════════════════════════════
   Component
═════════════════════════════════════════════════════════════════ */
const ProductPage = () => {
  const navigate = useNavigate();
  const gridRef = useRef(null);

  /* state */
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [error,        setError]        = useState("");
  const [notice,       setNotice]       = useState("");
  const [cart,         setCart]         = useState(EMPTY_CART);
  const [search,       setSearch]       = useState("");
  const [selCat,       setSelCat]       = useState("");
  const [selSort,      setSelSort]      = useState("newest");
  const [minRating,    setMinRating]    = useState(0);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [busyId,       setBusyId]       = useState("");
  const [scrolled,     setScrolled]     = useState(false);
  const [cartPopupVisible, setCartPopupVisible] = useState(false);
  const [cartPopupTick, setCartPopupTick] = useState(0);
  const cartPopupTimerRef = useRef(null);

  /* ── Product detail modal state ── */
  const [modalProduct, setModalProduct] = useState(null);
  const [activeImage,  setActiveImage]  = useState("");
  const [modalQty,     setModalQty]     = useState(1);

  const openModal = (product) => {
    setModalProduct(product);
    setActiveImage(String(product?.imageUrl || ""));
    const pid = String(product?.id || product?._id || "");
    const inCart = Math.max(0, Number(cartMap[pid]?.quantity || 0));
    setModalQty(inCart > 0 ? inCart : 1);
  };

  const closeModal = () => {
    setModalProduct(null);
    setActiveImage("");
    setModalQty(1);
  };

  /* sticky-header shadow on scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* cart lookup */
  const cartMap = useMemo(() => {
    const m = {};
    (cart.items || []).forEach((item) => {
      const pid = String(item.productId || "").trim();
      if (pid) m[pid] = item;
    });
    return m;
  }, [cart]);
  const cartPreviewItems = useMemo(
    () => (Array.isArray(cart?.items) ? cart.items.filter(Boolean).slice(0, 3) : []),
    [cart?.items]
  );

  /* ── cart helpers ── */
  const syncCart   = (c) => setCart({ items: c?.items || [], totals: c?.totals || { itemCount: 0, subtotal: 0 } });
  const loadCart   = async () => { try { syncCart((await fetchStoreCart())?.cart || EMPTY_CART); } catch { setCart(EMPTY_CART); } };
  const applyResp  = async (res) => {
    if (Array.isArray(res?.cart?.items)) { syncCart(res.cart); return; }
    try { syncCart((await fetchStoreCart())?.cart || EMPTY_CART); } catch { setCart(EMPTY_CART); }
  };

  /* ── product fetch ── */
  const loadProducts = async ({ reset = false } = {}) => {
    const np = reset ? 1 : page + 1;
    reset ? (setLoading(true), setError("")) : setLoadingMore(true);
    try {
      const res  = await fetchStoreProducts({ search, category: selCat, minRating, sort: selSort, page: np, limit: 20 });
      const list = Array.isArray(res?.products) ? res.products : [];
      setProducts((p) => reset ? list : [...p, ...list]);
      setPage(np);
      setTotalPages(Number(res?.pagination?.totalPages || 1));
    } catch (e) { setError(e?.message || "Failed to load products"); }
    finally  { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => { loadProducts({ reset: true }); }, [selCat, selSort, minRating]); // eslint-disable-line
  useEffect(() => { const t = setTimeout(() => loadProducts({ reset: true }), 300); return () => clearTimeout(t); }, [search]); // eslint-disable-line
  useEffect(() => { loadCart(); }, []); // eslint-disable-line
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 3000); return () => clearTimeout(t); }, [notice]);
  useEffect(() => {
    if (!cartPopupVisible) return undefined;
    if (cartPopupTimerRef.current) {
      window.clearTimeout(cartPopupTimerRef.current);
    }
    cartPopupTimerRef.current = window.setTimeout(() => {
      setCartPopupVisible(false);
      cartPopupTimerRef.current = null;
    }, 5600);

    return () => {
      if (cartPopupTimerRef.current) {
        window.clearTimeout(cartPopupTimerRef.current);
        cartPopupTimerRef.current = null;
      }
    };
  }, [cartPopupVisible, cartPopupTick]);
  useEffect(() => {
    const syncFromInventory = () => {
      loadProducts({ reset: true });
      loadCart();
    };

    window.addEventListener("inventory:refresh", syncFromInventory);
    return () => window.removeEventListener("inventory:refresh", syncFromInventory);
  }, [search, selCat, selSort, minRating]); // eslint-disable-line

  /* ── cart actions ── */
  const addToCart = async (
    product,
    qty = 1,
    { showSuccess = true, showCartPopup = true } = {}
  ) => {
    const pid = String(product?.id || product?._id || "").trim();
    if (!pid) { setError("Unable to add this item."); return false; }
    setBusyId(pid); setError("");
    try {
      const res = await addStoreCartItem({ productId: pid, quantity: qty, product });
      await applyResp(res);
      if (showSuccess) setNotice(String(res?.message || "Added to cart ✓"));
      if (showCartPopup) {
        setCartPopupVisible(true);
        setCartPopupTick((value) => value + 1);
      }
      return true;
    } catch (e) { setError(e?.message || "Unable to add to cart"); return false; }
    finally { setBusyId(""); }
  };

  const adjustQty = async (product, delta) => {
    const pid     = String(product?.id || product?._id || "").trim();
    const cartItem = cartMap[pid];
    if (!cartItem) {
      if (delta > 0) {
        await addToCart(product, 1, { showSuccess: false, showCartPopup: false });
      }
      return;
    }
    const itemId = String(cartItem?.itemId || "");
    if (!itemId) return;
    setBusyId(pid); setError("");
    try {
      const nq  = Math.max(1, Number(cartItem.quantity || 1)) + delta;
      const res = nq <= 0
        ? await removeStoreCartItem({ itemId })
        : await updateStoreCartItem({ itemId, quantity: nq });
      await applyResp(res);
    } catch (e) { setError(e?.message || "Unable to update quantity"); }
    finally { setBusyId(""); }
  };

  const removeFromCart = async (product) => {
    const pid    = String(product?.id || product?._id || "").trim();
    const itemId = String(cartMap[pid]?.itemId || "");
    if (!itemId) return;
    setBusyId(pid); setError("");
    try { await applyResp(await removeStoreCartItem({ itemId })); }
    catch (e) { setError(e?.message || "Unable to remove item"); }
    finally { setBusyId(""); }
  };

  const handleBuyNow = async (product, selectedQty = 1) => {
    const pid = String(product?.id || product?._id || "").trim();
    if (!pid) {
      setError("Unable to start checkout for this product.");
      return;
    }

    const quantity = Math.max(1, Number(selectedQty || 1));
    const unitPrice = Number(product?.sellingPrice || product?.price || 0);
    const availableStock = Math.max(
      0,
      Number(
        product?.availableStock ??
          product?.stock ??
          product?.inventory?.stock ??
          Number.NaN
      )
    );
    if (Number.isFinite(availableStock) && availableStock > 0 && quantity > availableStock) {
      setError("Requested quantity is not available in stock.");
      return;
    }

    const checkoutItem = {
      itemId: pid,
      productId: pid,
      name: String(product?.name || "Product"),
      imageUrl: String(product?.imageUrl || ""),
      quantity,
      unitPrice,
      lineTotal: Number((Math.max(0, unitPrice) * quantity).toFixed(2)),
      availableStock,
    };

    setCartPopupVisible(false);
    navigate("/checkout", {
      state: {
        source: "buy_now",
        forceItemsCheckout: true,
        returnPath: "/products",
        items: [checkoutItem],
        itemCount: quantity,
        subtotal: checkoutItem.lineTotal,
      },
    });
  };

  const cartCount = Number(cart?.totals?.itemCount || 0);

  /* ─────────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────────────*/
  return (
    <div style={{ minHeight: "100vh", background: "#f8fffe", fontFamily: "'Inter', system-ui, sans-serif", color: "#1a2e1a" }}>

      {/* ── Global styles ─────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        /* ════════════════════════════════════════
           PRODUCT DETAIL MODAL
        ════════════════════════════════════════ */

        /* overlay */
        .pdm-overlay {
          position: fixed; inset: 0; z-index: 500;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: pdm-bg-in 0.22s ease;
        }
        @keyframes pdm-bg-in { from { opacity: 0; } to { opacity: 1; } }

        /* modal box */
        .pdm-modal {
          background: white;
          border-radius: 24px;
          width: 100%; max-width: 1100px;
          max-height: 90vh;
          display: flex; flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          border: 1px solid #f3f4f6;
          animation: pdm-scale-in 0.26s cubic-bezier(.34,1.2,.64,1);
          position: relative;
        }
        @keyframes pdm-scale-in {
          from { opacity: 0; transform: scale(0.96) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* close button */
        .pdm-close {
          position: absolute; top: 20px; right: 20px; z-index: 10;
          width: 36px; height: 36px; border-radius: 50%;
          border: none; background: rgba(0,0,0,0.05);
          display: grid; place-items: center;
          cursor: pointer; color: #4b5563;
          transition: background 0.2s, color 0.2s, transform 0.2s;
        }
        .pdm-close:hover { background: #e5e7eb; color: #111827; transform: scale(1.05); }

        /* scrollable content */
        .pdm-body {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 32px;
          overflow-y: auto;
          flex: 1;
        }
        @media (max-width: 820px) {
          .pdm-body { grid-template-columns: 1fr; }
        }

        /* ── LEFT COLUMN ── */
        .pdm-left {
          padding: 32px 0 32px 32px;
          display: flex; flex-direction: column; gap: 16px;
          position: sticky; top: 0; align-self: start;
        }
        @media (max-width: 820px) {
          .pdm-left { position: static; border-bottom: 1px solid #f3f4f6; }
        }

        .pdm-main-img {
          width: 100%; aspect-ratio: 1/1;
          border-radius: 20px;
          background: #f3f4f6;
          overflow: hidden;
          position: relative;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .pdm-main-img img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 0.4s ease;
        }
        .pdm-main-img:hover img { transform: scale(1.05); }

        .pdm-main-img-empty {
          width: 100%; height: 100%;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 10px; color: #d1d5db;
        }

        /* discount badge on main image */
        .pdm-img-discount {
          position: absolute; top: 16px; left: 16px;
          padding: 6px 14px; border-radius: 999px;
          background: #ef4444; color: white;
          font-size: 13px; font-weight: 800;
          box-shadow: 0 4px 12px rgba(239,68,68,0.3);
        }

        /* thumbnails */
        .pdm-thumbs {
          display: flex; gap: 12px; flex-wrap: wrap;
        }
        .pdm-thumb {
          width: 76px; height: 76px; border-radius: 14px;
          overflow: hidden; cursor: pointer;
          border: 2.5px solid transparent;
          transition: all 0.2s;
          background: #f3f4f6; flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .pdm-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .pdm-thumb.active {
          border-color: #10b981;
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(16,185,129,0.15);
        }

        /* ── RIGHT COLUMN ── */
        .pdm-right {
          padding: 32px 32px 32px 0;
          display: flex; flex-direction: column; gap: 20px;
        }
        @media (max-width: 820px) {
          .pdm-right { padding: 24px; }
        }

        /* breadcrumb */
        .pdm-breadcrumb {
          font-size: 12px; font-weight: 700; color: #10b981;
          text-transform: uppercase; letter-spacing: 1px;
        }
        .pdm-breadcrumb span { color: #9ca3af; margin: 0 6px; }

        /* title */
        .pdm-title {
          font-size: 32px; font-weight: 800; color: #111827;
          line-height: 1.15; letter-spacing: -0.6px;
          margin: -6px 0;
        }

        /* brand */
        .pdm-brand {
          font-size: 14px; color: #6b7280;
        }
        .pdm-brand strong { color: #111827; font-weight: 700; }

        /* price row */
        .pdm-price-row {
          display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
        }
        .pdm-price-now {
          font-size: 34px; font-weight: 900; color: #10b981; letter-spacing: -1px;
        }
        .pdm-price-old {
          font-size: 18px; font-weight: 500; color: #9ca3af; text-decoration: line-through;
        }
        .pdm-savings {
          padding: 6px 12px; border-radius: 999px;
          background: #dcfce7; color: #15803d;
          font-size: 13px; font-weight: 700;
        }

        /* divider */
        .pdm-divider {
          height: 1px; background: #e5e7eb; border-radius: 1px;
        }

        /* section label */
        .pdm-label {
          font-size: 11.5px; font-weight: 700; color: #9ca3af;
          text-transform: uppercase; letter-spacing: 0.8px;
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 6px;
        }

        /* descriptions */
        .pdm-short-desc {
          font-size: 15px; color: #4b5563; line-height: 1.7;
          max-width: 95%;
        }
        .pdm-full-desc {
          font-size: 14.5px; color: #4b5563; line-height: 1.8;
          max-width: 98%;
        }
        .pdm-full-desc p { margin-bottom: 8px; }
        .pdm-full-desc ul { padding-left: 20px; margin-bottom: 8px; list-style-type: disc; }
        .pdm-full-desc li { margin-bottom: 4px; }
        .pdm-full-desc strong { color: #111827; }

        /* tags */
        .pdm-tags {
          display: flex; gap: 10px; flex-wrap: wrap;
        }
        .pdm-tag {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 999px;
          background: #ecfdf5; color: #059669;
          font-size: 13px; font-weight: 600;
          cursor: default; border: 1px solid #d1fae5;
        }

        /* meta grid */
        .pdm-meta-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
        }
        .pdm-meta-item {
          display: flex; flex-direction: column; gap: 4px;
        }
        .pdm-meta-key {
          font-size: 11px; font-weight: 700; color: #9ca3af;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .pdm-meta-val {
          font-size: 15px; font-weight: 600; color: #111827;
        }
        
        .pdm-status-badge {
          display: inline-flex; padding: 4px 10px; border-radius: 6px;
          font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
          width: fit-content;
        }
        .pdm-status-badge.in-stock { background: #dcfce7; color: #15803d; }
        .pdm-status-badge.out-stock { background: #fee2e2; color: #dc2626; }

        /* custom fields */
        .pdm-custom-container {
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          margin-top: 4px;
        }
        .pdm-custom-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
        }
        .pdm-custom-row:last-child { border-bottom: none; }
        .pdm-custom-key { color: #6b7280; font-weight: 500; }
        .pdm-custom-val { color: #111827; font-weight: 700; text-align: right; }

        /* qty stepper */
        .pdm-qty-row {
          display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
        }
        .pdm-qty {
          display: inline-flex; align-items: center;
          background: #f8fafc; border-radius: 999px;
          border: 1.5px solid #e2e8f0; overflow: hidden;
        }
        .pdm-qty-btn {
          width: 44px; height: 44px;
          border: none; background: transparent;
          display: grid; place-items: center;
          cursor: pointer; color: #475569;
          transition: background 0.2s, color 0.2s;
          font-size: 18px;
        }
        .pdm-qty-btn:hover:not(:disabled) { background: #e2e8f0; color: #0f172a; }
        .pdm-qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pdm-qty-num {
          min-width: 40px; text-align: center;
          font-size: 16px; font-weight: 700; color: #0f172a;
        }

        /* modal action buttons */
        .pdm-actions {
          display: flex; gap: 12px;
        }
        .pdm-btn-add {
          flex: 1; height: 50px; border-radius: 999px;
          border: 2px solid #e5e7eb; background: white;
          color: #374151; font-size: 15px; font-weight: 700; font-family: inherit;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s ease;
        }
        .pdm-btn-add:hover:not(:disabled) { border-color: #cbd5e1; background: #f8fafc; }
        .pdm-btn-add:disabled { opacity: 0.45; cursor: not-allowed; }
        
        .pdm-btn-buy {
          flex: 1; height: 50px; border-radius: 999px; border: none;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white; font-size: 15px; font-weight: 700; font-family: inherit;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 14px rgba(16,185,129,0.3);
          transition: all 0.2s ease;
        }
        .pdm-btn-buy:hover:not(:disabled) { 
          transform: translateY(-2px); 
          box-shadow: 0 8px 24px rgba(16,185,129,0.4); 
        }
        .pdm-btn-buy:active:not(:disabled) { transform: translateY(0) scale(0.98); }
        .pdm-btn-buy:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; background: #9ca3af; }

        /* Rx badge */
        .pdm-rx-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 12px; border-radius: 999px;
          background: #fef3c7; border: 1px solid #fde68a;
          color: #92400e; font-size: 12px; font-weight: 700;
        }

        /* ────────────────────────────────── */
        /* ── Scroll behaviour ── */

        /* ── Navbar ── */
        .pp-nav {
          position: sticky; top: 0; z-index: 100;
          transition: box-shadow 0.25s, background 0.25s;
        }
        .pp-nav.scrolled {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 1px 24px rgba(16,185,129,0.08), 0 1px 0 rgba(0,0,0,0.06);
        }
        .pp-nav-inner {
          max-width: 1240px; margin: 0 auto;
          height: 68px; padding: 0 24px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .pp-logo-btn {
          background: none; border: none;
          display: flex; align-items: center; gap: 11px;
          cursor: pointer; color: #0a1f0a;
          font-size: 17px; font-weight: 800; letter-spacing: -0.3px;
        }
        .pp-logo-icon {
          width: 42px; height: 42px; border-radius: 13px;
          background: linear-gradient(135deg, #10b981, #059669);
          display: grid; place-items: center; color: white;
          box-shadow: 0 6px 18px rgba(16,185,129,0.38);
          flex-shrink: 0;
        }
        .pp-logo-sub { font-size: 11px; font-weight: 500; color: #6b7280; line-height: 1; margin-top: 1px; }
        .pp-cart-btn {
          position: relative;
          display: inline-flex; align-items: center; gap: 8px;
          height: 44px; padding: 0 20px;
          border-radius: 12px;
          border: 1.5px solid #d1fae5;
          background: white;
          font-size: 14px; font-weight: 700; color: #0a1f0a;
          cursor: pointer; font-family: inherit;
          transition: all 0.22s cubic-bezier(.22,1,.36,1);
          box-shadow: 0 2px 8px rgba(16,185,129,0.1);
        }
        .pp-cart-btn:hover { background: #f0fdf4; border-color: #10b981; color: #059669; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16,185,129,0.18); }
        .pp-cart-badge {
          position: absolute; top: -7px; right: -7px;
          width: 22px; height: 22px; border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white; font-size: 11px; font-weight: 800;
          display: grid; place-items: center;
          box-shadow: 0 3px 8px rgba(16,185,129,0.45);
          border: 2px solid white;
          animation: badge-pop 0.3s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes badge-pop { 0% { transform: scale(0); } 100% { transform: scale(1); } }

        /* ── Hero ── */
        .pp-hero {
          min-height: 88vh;
          background: linear-gradient(160deg, #e8fef4 0%, #f0fdf9 35%, #f8fffc 60%, #ffffff 100%);
          display: flex; flex-direction: column;
          align-items: flex-start; justify-content: center;
          padding: 80px 0 60px;
          position: relative; overflow: hidden;
        }
        .pp-hero::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 70% 60% at 80% 40%, rgba(16,185,129,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .pp-hero-inner {
          max-width: 1240px; width: 100%; margin: 0 auto; padding: 0 24px 0 80px;
          position: relative; z-index: 1;
        }
        .pp-hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 999px;
          background: #d1fae5; color: #065f46;
          font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
          border: 1px solid #a7f3d0;
          margin-bottom: 28px;
        }
        .pp-hero-title {
          font-size: clamp(38px, 5.5vw, 68px);
          font-weight: 900; line-height: 1.08; letter-spacing: -2px;
          color: #0d1f0d; max-width: 700px;
          margin-bottom: 16px;
        }
        .pp-hero-title span { color: #10b981; }
        .pp-hero-sub {
          font-size: clamp(15px, 1.6vw, 18px); line-height: 1.65;
          color: #4b5563; max-width: 540px; font-weight: 400;
          margin-bottom: 8px;
        }
        .pp-hero-support {
          font-size: 13px; line-height: 1.5;
          color: #6b7280; max-width: 560px;
          margin-bottom: 24px;
        }
        .pp-hero-cta {
          display: inline-flex; align-items: center; gap: 10px;
          height: 52px; padding: 0 28px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white; font-size: 15px; font-weight: 700; font-family: inherit;
          cursor: pointer; box-shadow: 0 8px 24px rgba(16,185,129,0.38);
          transition: all 0.22s cubic-bezier(.22,1,.36,1);
          margin-bottom: 56px;
        }
        .pp-hero-cta:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(16,185,129,0.44); }

        /* Feature cards */
        .pp-features {
          display: flex; gap: 16px; flex-wrap: wrap;
        }
        .pp-feature-card {
          display: flex; align-items: center; gap: 14px;
          padding: 16px 22px; border-radius: 18px;
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(167,243,208,0.6);
          box-shadow: 0 4px 24px rgba(16,185,129,0.08), 0 1px 4px rgba(0,0,0,0.04);
          min-width: 180px;
          transition: all 0.22s cubic-bezier(.22,1,.36,1);
        }
        .pp-feature-card:hover { transform: translateY(-3px); box-shadow: 0 12px 36px rgba(16,185,129,0.14); }
        .pp-feature-icon {
          width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          display: grid; place-items: center; color: #059669;
        }
        .pp-feature-title { font-size: 14px; font-weight: 700; color: #0d1f0d; }
        .pp-feature-sub   { font-size: 12px; color: #6b7280; margin-top: 2px; }

        /* Floating orb decoration */
        .pp-hero-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          opacity: 0.35;
        }
        .pp-hero-orb-1 {
          width: 500px; height: 500px;
          right: -100px; top: -80px;
          background: radial-gradient(circle, #a7f3d0 0%, transparent 70%);
        }
        .pp-hero-orb-2 {
          width: 300px; height: 300px;
          right: 200px; bottom: 0;
          background: radial-gradient(circle, #6ee7b7 0%, transparent 70%);
          opacity: 0.2;
        }

        /* Scroll cue */
        .pp-scroll-cue {
          position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          color: #9ca3af; font-size: 12px; font-weight: 500;
          animation: float-cue 2s ease-in-out infinite;
        }
        @keyframes float-cue { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(6px); } }

        /* ── Catalog section ── */
        .pp-catalog {
          max-width: 1240px; margin: 0 auto;
          padding: 40px 24px 100px;
        }

        /* ── Filter bar — flat, no box ── */
        .pp-filterbar {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 32px;
        }

        /* Search — full-width pill */
        .pp-search-wrap { position: relative; }
        .pp-search-ico {
          position: absolute; left: 18px; top: 50%; transform: translateY(-50%);
          color: #9ca3af; pointer-events: none;
        }
        .pp-search {
          width: 100%; height: 48px;
          border-radius: 999px;
          border: none;
          padding: 0 20px 0 50px;
          font-size: 14.5px; font-family: inherit; color: #111827;
          background: #f1f5f9;
          outline: none;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          transition: background 0.2s, box-shadow 0.2s;
        }
        .pp-search:focus {
          background: white;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.18), 0 2px 8px rgba(0,0,0,0.07);
        }
        .pp-search::placeholder { color: #9ca3af; }

        /* Filter row — single line */
        .pp-filter-row {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }

        /* Category pills */
        .pp-chip {
          height: 34px; padding: 0 15px; border-radius: 999px;
          font-size: 13px; font-weight: 600; font-family: inherit;
          cursor: pointer;
          transition: all 0.18s ease;
          border: none;
          background: #f1f5f9; color: #4b5563;
        }
        .pp-chip:hover {
          background: #e2e8f0; color: #0d1f0d;
          transform: scale(1.03);
        }
        .pp-chip.active {
          background: #10b981;
          color: white;
          box-shadow: 0 3px 12px rgba(16,185,129,0.28);
        }
        .pp-chip.active:hover { background: #059669; transform: scale(1.03); }

        /* Pill-style selects (no visible borders) */
        .pp-div { width: 1px; height: 20px; background: #e2e8f0; flex-shrink: 0; margin: 0 2px; }
        .pp-select {
          height: 34px; padding: 0 14px;
          border-radius: 999px;
          border: none;
          background: #f1f5f9;
          font-size: 13px; font-weight: 600; font-family: inherit; color: #374151;
          outline: none; cursor: pointer;
          transition: background 0.18s, box-shadow 0.18s;
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          padding-right: 28px;
        }
        .pp-select:hover { background-color: #e2e8f0; }
        .pp-select:focus { box-shadow: 0 0 0 3px rgba(16,185,129,0.18); background: white; }

        /* ── Section heading ── */
        .pp-section-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px;
        }
        .pp-section-head h2 {
          font-size: 21px; font-weight: 800; color: #0d1f0d; letter-spacing: -0.4px;
        }
        .pp-results-count {
          font-size: 12px; font-weight: 600; color: #6b7280;
          background: #f1f5f9; padding: 4px 12px; border-radius: 999px;
        }

        /* ── Product Grid ── */
        .pp-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }
        @media (max-width: 1140px) { .pp-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 820px)  { .pp-grid { grid-template-columns: repeat(2, 1fr); gap: 18px; } }
        @media (max-width: 520px)  { .pp-grid { grid-template-columns: 1fr; gap: 14px; } }

        /* ── Product Card ── */
        .pp-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #efefef;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          display: flex; flex-direction: column;
          overflow: hidden;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .pp-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.1);
        }

        /* ── Card Image ── */
        .pp-card-img {
          position: relative;
          width: 100%; height: 210px;
          background: #f3f4f6;
          overflow: hidden; flex-shrink: 0;
        }
        .pp-card-img img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 0.4s ease;
        }
        .pp-card:hover .pp-card-img img { transform: scale(1.05); }

        /* placeholder when no image */
        .pp-card-img-empty {
          width: 100%; height: 100%;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; background: #f9fafb;
        }
        .pp-card-img-empty img {
          width: 100%; height: 100%; object-fit: cover; opacity: 0.18;
        }
        .pp-card-img-empty-inner {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          color: #d1d5db;
        }
        .pp-card-img-empty-inner span { font-size: 12px; font-weight: 600; color: #9ca3af; }

        /* category badge — top left */
        .pp-tag-cat {
          position: absolute; top: 10px; left: 10px;
          padding: 3px 10px; border-radius: 999px;
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(8px);
          font-size: 10px; font-weight: 700; color: #374151;
          text-transform: uppercase; letter-spacing: 0.6px;
          border: 1px solid rgba(0,0,0,0.06);
        }

        /* discount badge — top right (red) */
        .pp-tag-discount {
          position: absolute; top: 10px; right: 10px;
          padding: 4px 9px; border-radius: 999px;
          background: #ef4444;
          font-size: 11px; font-weight: 800; color: white;
          box-shadow: 0 2px 6px rgba(239,68,68,0.35);
        }

        /* in-cart indicator */
        .pp-tag-incart {
          position: absolute; bottom: 10px; right: 10px;
          padding: 3px 10px; border-radius: 999px;
          background: #dcfce7; border: 1px solid #bbf7d0;
          font-size: 10px; font-weight: 700; color: #15803d;
        }

        /* ── Card Body ── */
        .pp-card-body {
          padding: 14px 16px 12px;
          display: flex; flex-direction: column; gap: 4px; flex: 1;
        }
        .pp-card-cat-label {
          font-size: 10px; font-weight: 700; color: #9ca3af;
          text-transform: uppercase; letter-spacing: 0.7px;
        }
        .pp-card-name {
          font-size: 15px; font-weight: 700; color: #111827;
          line-height: 1.3; letter-spacing: -0.1px;
          margin-top: 2px;
        }
        .pp-card-desc {
          font-size: 12.5px; color: #9ca3af; line-height: 1.5;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden; margin-top: 2px;
        }

        /* ── Price ── */
        .pp-card-price-row {
          display: flex; align-items: baseline; gap: 8px;
          margin-top: 8px;
        }
        .pp-price-now {
          font-size: 20px; font-weight: 800; color: #dc2626; letter-spacing: -0.4px;
        }
        .pp-price-old {
          font-size: 13px; font-weight: 500; color: #9ca3af;
          text-decoration: line-through;
        }

        /* ── Card Footer ── */
        .pp-card-foot {
          padding: 0 16px 16px;
          display: flex; flex-direction: column; gap: 10px;
        }

        /* qty stepper — pill */
        .pp-qty {
          display: inline-flex; align-items: center;
          background: #f3f4f6; border-radius: 999px;
          border: 1px solid #e5e7eb;
          overflow: hidden; width: fit-content;
        }
        .pp-qty-btn {
          width: 34px; height: 34px; flex-shrink: 0;
          border: none; background: transparent;
          display: grid; place-items: center;
          cursor: pointer; color: #374151;
          font-size: 16px;
          transition: background 0.15s, color 0.15s;
        }
        .pp-qty-btn:hover:not(:disabled) { background: #e5e7eb; color: #111827; }
        .pp-qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pp-qty-val {
          min-width: 28px; text-align: center;
          font-size: 14px; font-weight: 700; color: #111827;
        }

        /* two-button row */
        .pp-btn-row {
          display: flex; gap: 8px;
        }

        /* Add button — outline */
        .pp-btn-outline {
          flex: 1; height: 40px; border-radius: 10px;
          border: 1.5px solid #e5e7eb; background: white;
          color: #374151; font-size: 13px; font-weight: 600; font-family: inherit;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
          transition: all 0.18s ease;
        }
        .pp-btn-outline:hover:not(:disabled) { background: #f3f4f6; border-color: #d1d5db; }
        .pp-btn-outline:active:not(:disabled) { transform: scale(0.98); }
        .pp-btn-outline:disabled { opacity: 0.45; cursor: not-allowed; }

        /* Buy Now button — green solid */
        .pp-btn-solid {
          flex: 1; height: 40px; border-radius: 10px; border: none;
          background: #10b981;
          color: white; font-size: 13px; font-weight: 700; font-family: inherit;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
          box-shadow: 0 3px 10px rgba(16,185,129,0.28);
          transition: all 0.18s ease;
        }
        .pp-btn-solid:hover:not(:disabled) { background: #059669; box-shadow: 0 6px 18px rgba(16,185,129,0.36); }
        .pp-btn-solid:active:not(:disabled) { transform: scale(0.98); }
        .pp-btn-solid:disabled { opacity: 0.45; cursor: not-allowed; }

        /* Remove button */
        .pp-btn-remove {
          flex: 1; height: 36px; border-radius: 10px; border: none;
          background: #fef2f2; color: #dc2626;
          font-size: 12px; font-weight: 600; font-family: inherit;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;
          transition: background 0.18s;
        }
        .pp-btn-remove:hover:not(:disabled) { background: #fee2e2; }
        .pp-btn-remove:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ── Toasts ── */
        .pp-toast-wrap {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; gap: 8px;
          z-index: 200; pointer-events: none;
          align-items: center;
        }
        .pp-toast {
          padding: 12px 22px; border-radius: 14px;
          font-size: 14px; font-weight: 600;
          box-shadow: 0 8px 32px rgba(0,0,0,0.14);
          white-space: nowrap; pointer-events: auto;
          animation: toast-in 0.35s cubic-bezier(.34,1.56,.64,1);
        }
        .pp-toast.success { background: #0d1f0d; color: #6ee7b7; }
        .pp-toast.error   { background: #7f1d1d; color: #fca5a5; }
        @keyframes toast-in { 0% { opacity:0; transform:translateY(12px) scale(0.95); } 100% { opacity:1; transform:translateY(0) scale(1); } }

        /* Floating cart popup */
        .pp-cart-float-wrap {
          position: fixed;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          width: min(100%, 560px);
          padding: 0 12px;
          z-index: 250;
          pointer-events: none;
        }
        .pp-cart-float {
          width: 100%;
          border: none;
          cursor: pointer;
          pointer-events: auto;
          border-radius: 999px;
          background: linear-gradient(135deg, #16a34a, #15803d);
          color: #ffffff;
          box-shadow: 0 18px 42px rgba(22, 163, 74, 0.36);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          animation: pp-cart-float-up .28s cubic-bezier(.34,1.25,.64,1);
        }
        .pp-cart-float:hover { filter: brightness(1.02); }
        .pp-cart-float-thumbs {
          display: flex;
          align-items: center;
          min-width: 98px;
        }
        .pp-cart-float-thumb {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          overflow: hidden;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,.18);
          border: 2px solid rgba(255,255,255,.95);
          margin-left: -10px;
          flex-shrink: 0;
        }
        .pp-cart-float-thumb:first-child { margin-left: 0; }
        .pp-cart-float-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .pp-cart-float-body { flex: 1; text-align: left; min-width: 0; }
        .pp-cart-float-title {
          font-size: 20px;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -.2px;
        }
        .pp-cart-float-sub {
          margin-top: 3px;
          font-size: 13px;
          font-weight: 700;
          opacity: .95;
        }
        .pp-cart-float-arrow {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: rgba(255,255,255,.12);
          display: grid;
          place-items: center;
          font-size: 22px;
          font-weight: 900;
          flex-shrink: 0;
        }
        @keyframes pp-cart-float-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Skeletons ── */
        .pp-skl-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px;
        }
        @media (max-width: 1140px) { .pp-skl-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 820px)  { .pp-skl-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 520px)  { .pp-skl-grid { grid-template-columns: 1fr; } }
        .pp-skl-card { border-radius: 22px; overflow: hidden; background: white; border: 1px solid #f0fdf4; }
        .pp-skl-img  { aspect-ratio:1/1; }
        .pp-skl-body { padding: 16px 18px 18px; display: flex; flex-direction:column; gap:10px; }
        .pp-skl-line { border-radius: 8px; }
        .pp-shimmer  {
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 300% 100%;
          animation: shimmer 1.6s ease-in-out infinite;
        }
        @keyframes shimmer { 0% { background-position:300% 0; } 100% { background-position:-300% 0; } }

        /* ── Empty state ── */
        .pp-empty {
          text-align: center; padding: 80px 24px; color: #9ca3af;
          display: flex; flex-direction: column; align-items: center; gap: 14px;
        }
        .pp-empty-icon {
          width: 72px; height: 72px; border-radius: 20px;
          background: #f0fdf4; display: grid; place-items: center; color: #6ee7b7;
          margin: 0 auto;
        }
        .pp-empty h3 { font-size: 18px; font-weight: 700; color: #374151; }
        .pp-empty p  { font-size: 14px; }

        /* ── Load more ── */
        .pp-loadmore-wrap { text-align: center; margin-top: 40px; }
        .pp-loadmore-btn {
          display: inline-flex; align-items: center; gap: 10px;
          height: 50px; padding: 0 36px; border-radius: 14px; border: none;
          background: #0d1f0d; color: white;
          font-size: 14px; font-weight: 700; font-family: inherit;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(.22,1,.36,1);
        }
        .pp-loadmore-btn:hover:not(:disabled) { background: #1a3a1a; transform: translateY(-2px); }
        .pp-loadmore-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .pp-hero { min-height: 94vh; padding: 70px 0 50px; }
          .pp-hero-inner { padding: 0 24px; }
          .pp-features { flex-direction: column; }
          .pp-feature-card { min-width: unset; }
          .pp-catalog { padding: 28px 16px 80px; }
          .pp-nav-inner { padding: 0 16px; }
          .pp-filter-row { gap: 6px; }
          .pp-chip, .pp-select { font-size: 12px; height: 32px; padding: 0 12px; }
          .pp-cart-float-wrap { bottom: 14px; }
          .pp-cart-float-title { font-size: 18px; }
          .pp-cart-float-sub { font-size: 12px; }
          .pp-cart-float-arrow { width: 42px; height: 42px; font-size: 20px; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          PRODUCT DETAIL MODAL
      ══════════════════════════════════════════════════════════ */}
      {modalProduct && (() => {
        const mp      = modalProduct;
        const pid     = String(mp?.id || mp?._id || "");
        const isBusy  = busyId === pid;
        const sprice  = Number(mp?.sellingPrice || mp?.price || 0);
        const oprice  = Number(mp?.mrp || mp?.originalPrice || 0);
        const hasDisc = oprice > sprice && oprice > 0;
        const discPct = hasDisc ? Math.round(((oprice - sprice) / oprice) * 100) : 0;
        const savings = hasDisc ? oprice - sprice : 0;

        const availableStock = Math.max(
          0,
          Number(mp?.availableStock ?? mp?.stock ?? mp?.inventory?.stock ?? 0) || 0
        );
        const inStock = availableStock > 0;
        const disabledAction = isBusy || !inStock;

        /* gallery */
        const additionalRaw = mp?.additionalImages || mp?.additionalImageUrls || [];
        const additionals   = Array.isArray(additionalRaw) ? additionalRaw : [];
        const mainImg       = String(mp?.imageUrl || "");
        const gallery       = [mainImg, ...additionals.map(String)].filter(Boolean);
        const uniqueGallery = [...new Set(gallery)];

        /* custom fields */
        let customFields = {};
        if (mp?.customFields) {
          if (typeof mp.customFields === "string") {
            try { customFields = JSON.parse(mp.customFields); } catch { customFields = {}; }
          } else if (typeof mp.customFields === "object") { customFields = mp.customFields; }
        }
        const customEntries = Object.entries(customFields);

        /* tags */
        const tags = Array.isArray(mp?.tags)
          ? mp.tags
          : (typeof mp?.tags === "string" && mp.tags.trim()
              ? mp.tags.split(",").map((t) => t.trim()).filter(Boolean)
              : []);

        /* expiry */
        const expiryStr = mp?.expiryDate
          ? new Date(mp.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
          : null;

        return (
          <div
            className="pdm-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
            role="dialog" aria-modal="true"
          >
            <div className="pdm-modal">
              <button type="button" className="pdm-close" onClick={closeModal}><X size={18} /></button>

              <div className="pdm-body">

                {/* ── LEFT ── */}
                <div className="pdm-left">
                  <div className="pdm-main-img">
                    {activeImage
                      ? <img src={activeImage} alt={String(mp?.name || "Product")} />
                      : <div className="pdm-main-img-empty"><Stethoscope size={56} strokeWidth={1.1} /><span>No image</span></div>
                    }
                    {hasDisc && <span className="pdm-img-discount">-{discPct}%</span>}
                  </div>

                  {uniqueGallery.length > 1 && (
                    <div className="pdm-thumbs">
                      {uniqueGallery.map((src, idx) => (
                        <div
                          key={idx}
                          className={`pdm-thumb${activeImage === src ? " active" : ""}`}
                          onClick={() => setActiveImage(src)}
                        >
                          <img src={src} alt={`View ${idx + 1}`} loading="lazy" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── RIGHT ── */}
                <div className="pdm-right">

                  {(mp?.category || mp?.subCategory) && (
                    <div className="pdm-breadcrumb">
                      {mp?.category} {mp?.subCategory && <> • {mp.subCategory}</>}
                    </div>
                  )}

                  <h2 className="pdm-title">{mp?.name || "Product"}</h2>
                  {mp?.brand && <p className="pdm-brand">by <strong>{mp.brand}</strong></p>}

                  <div className="pdm-divider" />

                  <div className="pdm-price-row">
                    <span className="pdm-price-now">{formatInr(sprice)}</span>
                    {hasDisc && (
                      <>
                        <span className="pdm-price-old">{formatInr(oprice)}</span>
                        <span className="pdm-savings">Save {formatInr(savings)}</span>
                      </>
                    )}
                    {mp?.prescriptionRequired && (
                      <span className="pdm-rx-badge"><FileText size={11} /> Rx Required</span>
                    )}
                  </div>

                  <div className="pdm-divider" />

                  {mp?.shortDescription && (
                    <div>
                      <div className="pdm-label"><Info size={12} />About</div>
                      <p className="pdm-short-desc">{mp.shortDescription}</p>
                    </div>
                  )}

                  {mp?.fullDescription && (
                    <div>
                      <div className="pdm-label"><FileText size={12} />Description</div>
                      <div className="pdm-full-desc" dangerouslySetInnerHTML={{ __html: mp.fullDescription }} />
                    </div>
                  )}

                  {tags.length > 0 && (
                    <div>
                      <div className="pdm-label"><Tag size={12} />Tags</div>
                      <div className="pdm-tags">
                        {tags.map((t, i) => <span key={i} className="pdm-tag"># {t}</span>)}
                      </div>
                    </div>
                  )}

                  <div className="pdm-divider" />

                  <div className="pdm-meta-grid">
                    {mp?.sku && (
                      <div className="pdm-meta-item">
                        <span className="pdm-meta-key">SKU</span>
                        <span className="pdm-meta-val">{mp.sku}</span>
                      </div>
                    )}
                    {expiryStr && (
                      <div className="pdm-meta-item">
                        <span className="pdm-meta-key">Expiry</span>
                        <span className="pdm-meta-val">{expiryStr}</span>
                      </div>
                    )}
                    <div className="pdm-meta-item">
                      <span className="pdm-meta-key">Stock</span>
                      <span className={`pdm-status-badge ${inStock ? "in-stock" : "out-stock"}`}>
                        {inStock ? `${availableStock} units` : "Out of stock"}
                      </span>
                    </div>
                    <div className="pdm-meta-item">
                      <span className="pdm-meta-key">Availability</span>
                      <span className={`pdm-status-badge ${inStock ? "in-stock" : "out-stock"}`}>
                        {inStock ? "In Stock" : "Unavailable"}
                      </span>
                    </div>
                  </div>

                  {customEntries.length > 0 && (
                    <div className="pdm-custom-container">
                      <div className="pdm-label"><Info size={12} />Additional Info</div>
                      <div>
                        {customEntries.map(([key, val]) => (
                          <div key={key} className="pdm-custom-row">
                            <span className="pdm-custom-key">{key}</span>
                            <span className="pdm-custom-val">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pdm-divider" />

                  <div className="pdm-qty-row">
                    <div className="pdm-qty">
                      <button type="button" className="pdm-qty-btn"
                        onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                        disabled={modalQty <= 1 || disabledAction}
                      ><Minus size={16} /></button>
                      <span className="pdm-qty-num">{modalQty}</span>
                      <button type="button" className="pdm-qty-btn"
                        onClick={() => setModalQty((q) => q + 1)}
                        disabled={disabledAction}
                      ><Plus size={16} /></button>
                    </div>

                    <button type="button" className="pdm-btn-add" disabled={disabledAction}
                      onClick={async () => {
                        const ok = await addToCart(mp, modalQty, { showSuccess: true });
                        if (ok) closeModal();
                      }}
                    >
                      <ShoppingCart size={16} />
                      {isBusy ? "Adding…" : "Add to Cart"}
                    </button>
                    <button type="button" className="pdm-btn-buy" disabled={disabledAction}
                      onClick={async () => { closeModal(); await handleBuyNow(mp, modalQty); }}
                    >
                      <Zap size={16} /> Buy Now
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {/* ── Toasts ──────────────────────────────────────────────── */}
      <div className="pp-toast-wrap">
        {notice && <div className="pp-toast success">{notice}</div>}
        {error  && <div className="pp-toast error">{error}</div>}
      </div>

      {cartPopupVisible && cartCount > 0 ? (
        <div className="pp-cart-float-wrap">
          <button
            type="button"
            className="pp-cart-float"
            key={cartPopupTick}
            onClick={() => {
              setCartPopupVisible(false);
              navigate("/cart");
            }}
          >
            <div className="pp-cart-float-thumbs">
              {cartPreviewItems.map((item, index) => (
                <div key={`${String(item?.itemId || item?.productId || index)}`} className="pp-cart-float-thumb">
                  {item?.imageUrl ? (
                    <img src={String(item.imageUrl)} alt={String(item?.name || "Product")} />
                  ) : (
                    <Stethoscope size={16} strokeWidth={1.8} />
                  )}
                </div>
              ))}
            </div>
            <div className="pp-cart-float-body">
              <div className="pp-cart-float-title">View Cart</div>
              <div className="pp-cart-float-sub">
                {cartCount} item{cartCount !== 1 ? "s" : ""} - Tap to open
              </div>
            </div>
            <div className="pp-cart-float-arrow">{"->"}</div>
          </button>
        </div>
      ) : null}

      {/* ════════════════════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════════════════════ */}
      <nav className={`pp-nav${scrolled ? " scrolled" : ""}`}>
        <div className="pp-nav-inner">
          <button type="button" className="pp-logo-btn" onClick={() => navigate("/")}>
            <span className="pp-logo-icon"><Stethoscope size={20} /></span>
            <div>
              <div>Medical Vault</div>
              <div className="pp-logo-sub">Secure healthcare platform</div>
            </div>
          </button>

          <button type="button" className="pp-cart-btn" onClick={() => navigate("/cart")}>
            <ShoppingCart size={17} />
            Cart
            {cartCount > 0 && <span className="pp-cart-badge">{cartCount}</span>}
          </button>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════ */}
      <section className="pp-hero">
        {/* decorative orbs */}
        <div className="pp-hero-orb pp-hero-orb-1" />
        <div className="pp-hero-orb pp-hero-orb-2" />

        <div className="pp-hero-inner">
          {/* badge */}
          <div className="pp-hero-badge">
            <BadgeCheck size={13} />
            Secure Medical Platform
          </div>

          {/* headline */}
          <h1 className="pp-hero-title">
            Your health records,{" "}
            <span>secured with care</span>
          </h1>

          {/* subtext */}
          <p className="pp-hero-sub">
            Store, manage, and access your medical records securely - built for
            patients, doctors, and admins in one platform.
          </p>
          <p className="pp-hero-support">
            Fast. Secure. Reliable healthcare data management.
          </p>

          {/* CTA */}
          <button
            type="button"
            className="pp-hero-cta"
            onClick={() => gridRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            Shop Now <ChevronDown size={18} />
          </button>

          {/* Feature cards */}
          <div className="pp-features">
            {FEATURES.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="pp-feature-card">
                <div className="pp-feature-icon"><Icon size={20} /></div>
                <div>
                  <div className="pp-feature-title">{title}</div>
                  <div className="pp-feature-sub">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* ════════════════════════════════════════════════════════
          CATALOG
      ════════════════════════════════════════════════════════ */}
      <main className="pp-catalog" ref={gridRef}>

        {/* ── Filter bar — flat, one-line ── */}
        <div className="pp-filterbar">

          {/* Full-width pill search */}
          <div className="pp-search-wrap">
            <Search size={17} className="pp-search-ico" />
            <input
              className="pp-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicines, devices, supplements…"
            />
          </div>

          {/* Category pills + pill-selects in ONE row */}
          <div className="pp-filter-row">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`pp-chip${selCat === c.value ? " active" : ""}`}
                onClick={() => setSelCat(c.value)}
              >
                {c.label}
              </button>
            ))}

            <div className="pp-div" />

            <select
              className="pp-select"
              value={selSort}
              onChange={(e) => setSelSort(e.target.value)}
              title="Sort by"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              className="pp-select"
              value={String(minRating)}
              onChange={(e) => setMinRating(Number(e.target.value))}
              title="Minimum rating"
            >
              <option value="0">Any Rating</option>
              <option value="3">★ 3.0+</option>
              <option value="4">★ 4.0+</option>
            </select>
          </div>
        </div>

        {/* ── Section heading ── */}
        {!loading && (
          <div className="pp-section-head">
            <h2>{selCat || "All Products"}</h2>
            <span className="pp-results-count">
              {products.length} item{products.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {loading ? (
          <div className="pp-skl-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="pp-skl-card">
                <div className="pp-skl-img pp-shimmer" />
                <div className="pp-skl-body">
                  <div className="pp-skl-line pp-shimmer" style={{ height: 16, width: "70%" }} />
                  <div className="pp-skl-line pp-shimmer" style={{ height: 12, width: "90%" }} />
                  <div className="pp-skl-line pp-shimmer" style={{ height: 12, width: "55%" }} />
                  <div className="pp-skl-line pp-shimmer" style={{ height: 24, width: "45%", marginTop: 4 }} />
                  <div className="pp-skl-line pp-shimmer" style={{ height: 38, width: "100%", borderRadius: 11, marginTop: 8 }} />
                  <div className="pp-skl-line pp-shimmer" style={{ height: 38, width: "100%", borderRadius: 11 }} />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (

          /* ── Empty state ── */
          <div className="pp-empty">
            <div className="pp-empty-icon"><Package size={34} strokeWidth={1.4} /></div>
            <h3>No products found</h3>
            <p>Try adjusting your search or filters</p>
          </div>

        ) : (

          /* ── Product Grid ── */
          <div className="pp-grid">
            {products.map((product) => {
              const productId    = String(product?.id || product?._id || "");
              const cartItem     = cartMap[productId];
              const qty          = Math.max(0, Number(cartItem?.quantity || 0));
              const image        = String(product?.imageUrl || "");
              const sellingPrice = Number(product?.sellingPrice || product?.price || 0);
              const mrp          = Number(product?.mrp || product?.originalPrice || 0);
              const isBusy       = busyId === productId;
              const availableStock = Math.max(
                0,
                Number(
                  product?.availableStock ??
                  product?.stock ??
                  product?.inventory?.stock ??
                  0
                ) || 0
              );
              const inStock      = availableStock > 0;
              const category     = String(product?.category || "");
              const hasDiscount  = mrp > sellingPrice && mrp > 0;
              const discountPct  = hasDiscount ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;

              return (
                <article
                  key={productId || product?.name}
                  className="pp-card"
                  style={{ cursor: "pointer" }}
                  onClick={() => openModal(product)}
                >

                  {/* ─ Image area ─ */}
                  <div className="pp-card-img">
                    {image ? (
                      <img src={image} alt={String(product?.name || "Product")} loading="lazy" />
                    ) : (
                      <div className="pp-card-img-empty">
                        <div className="pp-card-img-empty-inner">
                          <Stethoscope size={40} strokeWidth={1.2} />
                          <span>No image</span>
                        </div>
                      </div>
                    )}

                    {/* category tag — top left */}
                    {category && <span className="pp-tag-cat">{category}</span>}

                    {/* discount badge — top right, only if discount exists */}
                    {hasDiscount && (
                      <span className="pp-tag-discount">-{discountPct}%</span>
                    )}

                    {/* in-cart indicator */}
                    {qty > 0 && <span className="pp-tag-incart">In Cart ✓</span>}
                  </div>

                  {/* ─ Info body ─ */}
                  <div className="pp-card-body">
                    {category && (
                      <span className="pp-card-cat-label">{category}</span>
                    )}

                    <h3 className="pp-card-name">
                      {product?.name || "Product"}
                    </h3>

                    <p className="pp-card-desc">
                      {String(product?.shortDescription || "Quality healthcare product.")}
                    </p>

                    <div className="pp-card-price-row">
                      <span className="pp-price-now">{formatInr(sellingPrice)}</span>
                      {hasDiscount && (
                        <span className="pp-price-old">{formatInr(mrp)}</span>
                      )}
                    </div>
                  </div>

                  {/* ─ Footer: qty stepper + buttons ─ */}
                  <div className="pp-card-foot">

                    {/* qty stepper — always visible when in cart */}
                    <div className="pp-qty">
                      <button
                        type="button" className="pp-qty-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          adjustQty(product, -1);
                        }}
                        disabled={isBusy}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="pp-qty-val">{qty > 0 ? qty : 1}</span>
                      <button
                        type="button" className="pp-qty-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          adjustQty(product, 1);
                        }}
                        disabled={isBusy || qty === 0}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* two buttons side by side */}
                    <div className="pp-btn-row">
                      {qty > 0 ? (
                        <button
                          type="button" className="pp-btn-remove"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeFromCart(product);
                          }}
                          disabled={isBusy}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      ) : (
                        <button
                          type="button" className="pp-btn-outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            addToCart(product, 1);
                          }}
                          disabled={isBusy || !inStock}
                          style={{ opacity: isBusy ? 0.6 : 1 }}
                        >
                          <ShoppingCart size={14} />
                          {isBusy ? "Adding…" : inStock ? "Add" : "Out of Stock"}
                        </button>
                      )}

                      <button
                        type="button" className="pp-btn-solid"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleBuyNow(product, qty > 0 ? qty : 1);
                        }}
                        disabled={isBusy || !inStock}
                      >
                        <Zap size={14} /> {inStock ? "Buy Now" : "Out of Stock"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ── Load more ── */}
        {!loading && page < totalPages && (
          <div className="pp-loadmore-wrap">
            <button
              type="button"
              className="pp-loadmore-btn"
              onClick={() => loadProducts({ reset: false })}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Load more products"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export { ProductPage };
export default ProductPage;

