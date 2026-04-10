import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Star, Stethoscope } from "lucide-react";

import OrderCheckoutModal from "./OrderCheckoutModal";
import {
  addStoreCartItem,
  fetchStoreCart,
  fetchStoreProducts,
} from "../utils/storeApi";

const categories = [
  { label: "All", value: "" },
  { label: "Medicines", value: "Medicines" },
  { label: "Medical Devices", value: "Medical Devices" },
  { label: "Health Essentials", value: "Health Essentials" },
];

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price Low to High", value: "price_asc" },
  { label: "Price High to Low", value: "price_desc" },
  { label: "Top Rated", value: "rating_desc" },
];

const ProductPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [cart, setCart] = useState({ items: [], totals: { itemCount: 0, subtotal: 0 } });
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSort, setSelectedSort] = useState("newest");
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const cartMap = useMemo(() => {
    const map = {};
    (cart.items || []).forEach((item) => {
      map[String(item.productId || "")] = Number(item.quantity || 0);
    });
    return map;
  }, [cart]);

  const loadCart = async () => {
    try {
      const response = await fetchStoreCart();
      setCart({
        items: response?.cart?.items || [],
        totals: response?.cart?.totals || { itemCount: 0, subtotal: 0 },
      });
    } catch {
      setCart({ items: [], totals: { itemCount: 0, subtotal: 0 } });
    }
  };

  const loadProducts = async ({ reset = false } = {}) => {
    const nextPage = reset ? 1 : page + 1;
    if (reset) {
      setLoading(true);
      setError("");
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await fetchStoreProducts({
        search,
        category: selectedCategory,
        minRating,
        sort: selectedSort,
        page: nextPage,
        limit: 20,
      });

      const nextProducts = Array.isArray(response?.products)
        ? response.products
        : [];
      const nextPagination = response?.pagination || {};
      const resolvedTotalPages = Number(nextPagination.totalPages || 1);

      setProducts((prev) => (reset ? nextProducts : [...prev, ...nextProducts]));
      setPage(nextPage);
      setTotalPages(resolvedTotalPages);
    } catch (err) {
      setError(err?.message || "Failed to load products");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadProducts({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedSort, minRating]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts({ reset: true });
    }, 320);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    loadCart();
  }, []);

  const addToCart = async (productId, quantity = 1) => {
    try {
      await addStoreCartItem({ productId, quantity });
      await loadCart();
    } catch (err) {
      setError(err?.message || "Unable to add to cart");
    }
  };

  const formatInr = (value) => `INR ${Number(value || 0).toFixed(2)}`;

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", color: "#0F172A" }}>
      {checkoutOpen ? (
        <OrderCheckoutModal
          itemCount={Number(cart?.totals?.itemCount || 0)}
          subtotal={Number(cart?.totals?.subtotal || 0)}
          onClose={() => setCheckoutOpen(false)}
          onOrderPlaced={() => {
            loadCart();
            navigate("/orders");
          }}
        />
      ) : null}

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 12,
          borderBottom: "1px solid #E2E8F0",
          background: "rgba(255,255,255,.9)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 16px",
            height: 66,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              border: "none",
              background: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "linear-gradient(135deg,#0EA5A4,#2563EB)",
                display: "grid",
                placeItems: "center",
                color: "white",
              }}
            >
              <Stethoscope size={18} />
            </span>
            Medical Store
          </button>
          <button
            type="button"
            onClick={() => navigate("/cart")}
            style={{
              height: 38,
              borderRadius: 10,
              border: "1px solid #CBD5E1",
              background: "white",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "0 12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <ShoppingCart size={16} />
            Cart ({Number(cart?.totals?.itemCount || 0)})
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 16px 90px" }}>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search medicines, devices, essentials"
            style={{
              height: 42,
              borderRadius: 10,
              border: "1px solid #CBD5E1",
              padding: "0 12px",
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {categories.map((entry) => (
              <button
                key={entry.label}
                type="button"
                onClick={() => setSelectedCategory(entry.value)}
                style={{
                  height: 34,
                  borderRadius: 999,
                  border: selectedCategory === entry.value ? "none" : "1px solid #CBD5E1",
                  background:
                    selectedCategory === entry.value
                      ? "linear-gradient(135deg,#0EA5A4,#2563EB)"
                      : "white",
                  color: selectedCategory === entry.value ? "white" : "#334155",
                  padding: "0 12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={selectedSort}
              onChange={(event) => setSelectedSort(event.target.value)}
              style={selectStyle}
            >
              {sortOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={String(minRating)}
              onChange={(event) => setMinRating(Number(event.target.value))}
              style={selectStyle}
            >
              <option value="0">Any Rating</option>
              <option value="3">3.0+</option>
              <option value="4">4.0+</option>
            </select>
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginTop: 14,
              borderRadius: 12,
              border: "1px solid #FECACA",
              background: "#FEF2F2",
              color: "#B91C1C",
              padding: "10px 12px",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <div style={{ padding: "36px 0", textAlign: "center", color: "#64748B" }}>
            Loading products...
          </div>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {products.length === 0 ? (
              <div
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 14,
                  background: "white",
                  padding: 18,
                  textAlign: "center",
                  color: "#64748B",
                }}
              >
                No products found.
              </div>
            ) : (
              products.map((product) => {
                const productId = String(product?.id || product?._id || "");
                const qty = Number(cartMap[productId] || 0);
                const image = String(product?.imageUrl || "");
                const rating = Number(product?.rating || 0);
                return (
                  <article
                    key={productId || product?.name}
                    style={{
                      display: "grid",
                      gap: 12,
                      gridTemplateColumns: "96px 1fr",
                      border: "1px solid #E2E8F0",
                      borderRadius: 14,
                      background: "white",
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "#F1F5F9",
                      }}
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={String(product?.name || "Product")}
                          loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : null}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 16,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {product?.name || "Product"}
                      </h3>
                      <div
                        style={{
                          marginTop: 4,
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          color: "#475569",
                          fontSize: 13,
                        }}
                      >
                        <Star size={14} color="#F59E0B" fill="#F59E0B" />
                        {rating > 0 ? rating.toFixed(1) : "New"}
                        <span style={{ fontWeight: 700, color: "#0F172A" }}>
                          {formatInr(product?.sellingPrice || product?.price || 0)}
                        </span>
                      </div>
                      <p
                        style={{
                          marginTop: 6,
                          marginBottom: 0,
                          color: "#64748B",
                          fontSize: 13,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                        }}
                      >
                        {String(product?.shortDescription || "No description available")}
                      </p>
                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => addToCart(productId, 1)}
                          style={primaryBtn}
                        >
                          {qty > 0 ? `Add More (${qty})` : "Add to Cart"}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await addToCart(productId, 1);
                            setCheckoutOpen(true);
                          }}
                          style={secondaryBtn}
                        >
                          Buy Now
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}

        {!loading && page < totalPages ? (
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button
              type="button"
              onClick={() => loadProducts({ reset: false })}
              disabled={loadingMore}
              style={{
                border: "none",
                borderRadius: 10,
                background: "#0F172A",
                color: "white",
                padding: "10px 18px",
                fontWeight: 700,
                cursor: "pointer",
                opacity: loadingMore ? 0.7 : 1,
              }}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
};

const selectStyle = {
  height: 36,
  borderRadius: 10,
  border: "1px solid #CBD5E1",
  background: "white",
  padding: "0 9px",
};

const primaryBtn = {
  border: "none",
  borderRadius: 9,
  background: "linear-gradient(135deg,#0EA5A4,#2563EB)",
  color: "white",
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtn = {
  border: "1px solid #CBD5E1",
  borderRadius: 9,
  background: "white",
  color: "#1E293B",
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

export default ProductPage;
