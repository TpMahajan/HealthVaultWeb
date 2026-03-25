import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Star, Stethoscope } from "lucide-react";

import { API_BASE } from "../constants/api";
import OrderCheckoutModal from "./OrderCheckoutModal";

function toPrice(product) {
  const mrp = Number(product?.mrp ?? 0);
  const selling = Number(product?.sellingPrice ?? product?.price ?? 0);
  const validMrp = Number.isFinite(mrp) ? mrp : 0;
  const validSelling = Number.isFinite(selling) ? selling : 0;
  const discount =
    validMrp > 0 && validSelling > 0 && validMrp > validSelling
      ? Math.round(((validMrp - validSelling) / validMrp) * 100)
      : 0;
  return { mrp: validMrp, selling: validSelling, discount };
}

function getDescription(product) {
  const value = (
    product?.shortDescription ||
    product?.description ||
    ""
  ).trim();
  return value || "No description available";
}

function getImage(product) {
  const media = product?.media || {};
  return (
    media?.thumbnail ||
    (Array.isArray(media?.images) ? media.images[0] : "") ||
    product?.imageUrl ||
    ""
  );
}

function getInStock(product) {
  const stock = Number(product?.inventory?.stock ?? 0);
  const availability = String(product?.inventory?.availability || "").toUpperCase();
  if (availability === "OUT_OF_STOCK") return false;
  if (stock <= 0 && availability !== "PREORDER") return false;
  return true;
}

function LoadingSkeleton() {
  return (
    <div className="mv-skeleton-list">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="mv-skeleton-card" key={index} />
      ))}
    </div>
  );
}

function PriceWidget({ product }) {
  const { mrp, selling, discount } = toPrice(product);

  if (selling <= 0) {
    return <div className="mv-contact-price">Contact for price</div>;
  }

  return (
    <div className="mv-price-wrap">
      <span className="mv-selling">₹{selling.toLocaleString()}</span>
      {mrp > selling && <span className="mv-mrp">₹{mrp.toLocaleString()}</span>}
      {discount > 0 && <span className="mv-discount">{discount}% OFF</span>}
    </div>
  );
}

function ActionButtons({ onBuyNow, onAddToCart, disabled }) {
  return (
    <div className="mv-actions">
      <button
        className="mv-btn mv-btn-buy"
        onClick={onBuyNow}
        disabled={disabled}
      >
        Buy Now
      </button>
      <button
        className="mv-btn mv-btn-cart"
        onClick={onAddToCart}
        disabled={disabled}
      >
        Add to Cart
      </button>
    </div>
  );
}

function ProductImage({ product, wishlisted, onToggleWishlist }) {
  const imageUrl = getImage(product);
  const { discount } = toPrice(product);

  return (
    <div className="mv-image-wrap">
      {discount > 0 && <span className="mv-badge">{discount}% OFF</span>}
      <button className="mv-wishlist" onClick={onToggleWishlist} aria-label="Wishlist">
        <Heart size={16} fill={wishlisted ? "#ef4444" : "none"} color={wishlisted ? "#ef4444" : "#334155"} />
      </button>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={product?.name || "Product image"}
          loading="lazy"
          decoding="async"
          className="mv-product-image"
        />
      ) : (
        <div className="mv-image-fallback">No image</div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  qty,
  wishlisted,
  onToggleWishlist,
  onBuyNow,
  onAddToCart,
}) {
  const inStock = getInStock(product);
  const rating = Number(product?.rating ?? product?.avgRating ?? 4.3);

  return (
    <article className="mv-card">
      <ProductImage
        product={product}
        wishlisted={wishlisted}
        onToggleWishlist={onToggleWishlist}
      />

      <div className="mv-content">
        <h3 className="mv-title">{product?.name || "Untitled Product"}</h3>
        <div className="mv-rating">
          <Star size={14} fill="#f59e0b" color="#f59e0b" />
          <span>{Number.isFinite(rating) ? rating.toFixed(1) : "4.3"}</span>
        </div>
        <p className="mv-desc">{getDescription(product)}</p>

        <PriceWidget product={product} />

        <div className={`mv-stock ${inStock ? "in" : "out"}`}>
          {inStock ? "In Stock" : "Out of Stock"}
        </div>

        <ActionButtons
          disabled={!inStock}
          onBuyNow={onBuyNow}
          onAddToCart={onAddToCart}
        />

        {qty > 0 && <div className="mv-cart-added">Added to cart: {qty}</div>}
      </div>
    </article>
  );
}

export default function ProductPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartMap, setCartMap] = useState({});
  const [cartCount, setCartCount] = useState(0);
  const [wishList, setWishList] = useState({});
  const [orderModal, setOrderModal] = useState(null);

  const readCart = () => {
    try {
      return JSON.parse(localStorage.getItem("mv_cart") || "[]");
    } catch {
      return [];
    }
  };

  const syncCartState = () => {
    const cart = readCart();
    const map = {};
    cart.forEach((item) => {
      map[item.id] = Number(item.qty || 0);
    });
    setCartMap(map);
    setCartCount(cart.reduce((sum, item) => sum + Number(item.qty || 0), 0));
  };

  useEffect(() => {
    syncCartState();
    const onStorage = () => syncCartState();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    let ignore = false;
    const loadProducts = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/public/products`, {
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || "Failed to load products");
        }
        if (!ignore) {
          setProducts(Array.isArray(data?.products) ? data.products : []);
        }
      } catch (err) {
        if (!ignore) setError(err?.message || "Failed to load products");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    loadProducts();
    return () => {
      ignore = true;
    };
  }, []);

  const upsertCart = (product, qty) => {
    const cart = readCart();
    const productId = String(product?._id || product?.id || "");
    if (!productId) return;

    const { selling } = toPrice(product);
    const idx = cart.findIndex((item) => item.id === productId);
    if (qty <= 0) {
      if (idx >= 0) cart.splice(idx, 1);
    } else if (idx >= 0) {
      cart[idx].qty = qty;
      cart[idx].unitPrice = selling;
    } else {
      cart.push({
        id: productId,
        name: product?.name || "Product",
        category: product?.category || "General",
        unitPrice: selling,
        qty,
        imageUrl: getImage(product),
      });
    }
    localStorage.setItem("mv_cart", JSON.stringify(cart));
    syncCartState();
  };

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const aUpdated = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
      const bUpdated = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
      return bUpdated - aUpdated;
    });
  }, [products]);

  return (
    <>
      {orderModal && (
        <OrderCheckoutModal
          product={orderModal}
          onClose={() => setOrderModal(null)}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        .mv-root {
          min-height: 100vh;
          background: #f5f7fb;
          font-family: Inter, sans-serif;
          color: #0f172a;
        }
        .mv-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid #e2e8f0;
        }
        .mv-nav {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 18px;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .mv-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }
        .mv-brand-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: linear-gradient(135deg, #0ea5a4, #22d3ee);
          display: grid;
          place-items: center;
          box-shadow: 0 6px 18px rgba(14,165,164,.26);
        }
        .mv-brand-text { font-size: 18px; font-weight: 900; letter-spacing: -0.02em; }
        .mv-nav-actions { display: flex; align-items: center; gap: 8px; }
        .mv-nav-btn {
          height: 38px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-weight: 700;
          cursor: pointer;
        }
        .mv-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 22px 16px 96px;
        }
        .mv-page-title { font-size: clamp(26px, 3.2vw, 36px); font-weight: 900; letter-spacing: -0.03em; }
        .mv-page-subtitle { margin-top: 4px; color: #64748b; font-size: 14px; }
        .mv-list { margin-top: 16px; display: grid; gap: 12px; }
        .mv-card {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 14px;
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 12px;
          box-shadow: 0 6px 24px rgba(15,23,42,.06);
          transition: transform .18s ease, box-shadow .18s ease;
          animation: mvFadeIn .28s ease both;
        }
        .mv-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(15,23,42,.11);
        }
        .mv-image-wrap {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #edf2f7;
          overflow: hidden;
          display: grid;
          place-items: center;
        }
        .mv-product-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 10px;
        }
        .mv-image-fallback { color: #94a3b8; font-weight: 700; font-size: 13px; }
        .mv-badge {
          position: absolute; left: 8px; top: 8px;
          background: #16a34a; color: #fff;
          padding: 4px 8px; border-radius: 999px;
          font-size: 11px; font-weight: 800;
          z-index: 2;
        }
        .mv-wishlist {
          position: absolute; right: 8px; top: 8px;
          width: 30px; height: 30px;
          border-radius: 999px; border: 1px solid #e2e8f0;
          background: rgba(255,255,255,.95);
          display: grid; place-items: center;
          cursor: pointer; z-index: 2;
        }
        .mv-content { display: flex; flex-direction: column; gap: 8px; }
        .mv-title { font-size: 20px; font-weight: 900; letter-spacing: -0.02em; line-height: 1.2; }
        .mv-rating { display: inline-flex; align-items: center; gap: 5px; color: #334155; font-size: 13px; font-weight: 700; }
        .mv-desc {
          color: #475569;
          font-size: 14px;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 42px;
        }
        .mv-price-wrap { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
        .mv-selling { font-size: 30px; font-weight: 900; letter-spacing: -0.03em; color: #0f172a; }
        .mv-mrp { color: #94a3b8; font-weight: 700; text-decoration: line-through; }
        .mv-discount {
          color: #166534; background: #dcfce7;
          border-radius: 999px; padding: 3px 8px;
          font-size: 11px; font-weight: 800;
        }
        .mv-contact-price { font-size: 16px; font-weight: 800; color: #0f172a; }
        .mv-stock { font-size: 12px; font-weight: 800; }
        .mv-stock.in { color: #15803d; }
        .mv-stock.out { color: #dc2626; }
        .mv-actions { display: flex; gap: 8px; margin-top: auto; }
        .mv-btn {
          height: 40px; padding: 0 14px; border-radius: 10px;
          font-weight: 800; font-size: 13px; cursor: pointer;
          transition: transform .14s ease, box-shadow .14s ease, opacity .14s ease;
        }
        .mv-btn:active { transform: scale(.98); }
        .mv-btn:disabled { cursor: not-allowed; opacity: .5; }
        .mv-btn-buy {
          border: none; color: #fff;
          background: linear-gradient(135deg, #2563eb, #0ea5a4);
          box-shadow: 0 7px 18px rgba(37,99,235,.25);
        }
        .mv-btn-cart {
          border: 1.5px solid #2563eb; color: #1d4ed8; background: #fff;
        }
        .mv-cart-added { font-size: 12px; color: #475569; }
        .mv-skeleton-list { display: grid; gap: 12px; margin-top: 14px; }
        .mv-skeleton-card {
          height: 170px; border-radius: 16px;
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 45%, #e2e8f0 65%);
          background-size: 220% 100%;
          animation: mvShimmer 1.1s linear infinite;
        }
        .mv-state {
          margin-top: 18px; border-radius: 14px;
          padding: 18px; border: 1px solid #e2e8f0; background: #fff;
          color: #475569; text-align: center; font-weight: 600;
        }
        .mv-floating-cart {
          position: fixed;
          left: 50%;
          bottom: 22px;
          transform: translateX(-50%);
          z-index: 70;
          background: linear-gradient(135deg,#1a6b4a,#16a34a);
          color: #fff;
          border-radius: 999px;
          height: 44px;
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 10px 30px rgba(22,163,74,.34);
          cursor: pointer;
          font-weight: 800;
        }
        @media (max-width: 860px) {
          .mv-card { grid-template-columns: 1fr; }
          .mv-image-wrap { aspect-ratio: 4 / 3; }
          .mv-selling { font-size: 26px; }
        }
        @media (max-width: 560px) {
          .mv-nav-btn span { display: none; }
          .mv-main { padding-left: 12px; padding-right: 12px; }
        }
        @keyframes mvShimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        @keyframes mvFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mv-root">
        <header className="mv-header">
          <nav className="mv-nav">
            <div className="mv-brand" onClick={() => navigate("/")}>
              <div className="mv-brand-icon">
                <Stethoscope color="#fff" size={20} />
              </div>
              <div className="mv-brand-text">
                Medical <span style={{ color: "#0ea5a4" }}>Vault</span>
              </div>
            </div>
            <div className="mv-nav-actions">
              <button className="mv-nav-btn" onClick={() => navigate("/orders")}>
                <span>My Orders</span>
              </button>
              <button className="mv-nav-btn" onClick={() => navigate("/cart")}>
                <ShoppingCart size={16} />
                <span style={{ marginLeft: 6 }}>Cart {cartCount > 0 ? `(${cartCount})` : ""}</span>
              </button>
            </div>
          </nav>
        </header>

        <main className="mv-main">
          <h1 className="mv-page-title">Medical Products</h1>
          <p className="mv-page-subtitle">Explore trusted healthcare essentials</p>

          {loading && <LoadingSkeleton />}

          {!loading && error && <div className="mv-state">{error}</div>}

          {!loading && !error && sortedProducts.length === 0 && (
            <div className="mv-state">No products available right now.</div>
          )}

          {!loading && !error && sortedProducts.length > 0 && (
            <section className="mv-list">
              {sortedProducts.map((product) => {
                const id = String(product?._id || product?.id || "");
                const qty = Number(cartMap[id] || 0);
                const wishlisted = !!wishList[id];
                const inStock = getInStock(product);

                return (
                  <ProductCard
                    key={id || product?.name}
                    product={product}
                    qty={qty}
                    wishlisted={wishlisted}
                    onToggleWishlist={() =>
                      setWishList((prev) => ({ ...prev, [id]: !prev[id] }))
                    }
                    onBuyNow={() => {
                      if (!inStock) return;
                      const { selling } = toPrice(product);
                      setOrderModal({
                        id,
                        name: product?.name || "Product",
                        category: product?.category || "General",
                        unitPrice: selling,
                        imageUrl: getImage(product),
                      });
                    }}
                    onAddToCart={() => {
                      if (!inStock) return;
                      upsertCart(product, qty + 1);
                    }}
                  />
                );
              })}
            </section>
          )}
        </main>
      </div>

      {cartCount > 0 && (
        <button className="mv-floating-cart" onClick={() => navigate("/cart")}>
          <ShoppingCart size={16} />
          View Cart ({cartCount})
        </button>
      )}
    </>
  );
}

