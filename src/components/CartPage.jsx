import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import OrderCheckoutModal from "./OrderCheckoutModal";
import {
  fetchStoreCart,
  removeStoreCartItem,
  updateStoreCartItem,
} from "../utils/storeApi";

const CartPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [cart, setCart] = useState({ items: [], totals: { itemCount: 0, subtotal: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const loadCart = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchStoreCart();
      setCart({
        items: response?.cart?.items || [],
        totals: response?.cart?.totals || { itemCount: 0, subtotal: 0 },
      });
    } catch (err) {
      setError(err?.message || "Failed to load cart");
      setCart({ items: [], totals: { itemCount: 0, subtotal: 0 } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    const shouldOpenCheckout = new URLSearchParams(location.search).get("checkout") === "1";
    if (shouldOpenCheckout && Number(cart?.totals?.itemCount || 0) > 0) {
      setCheckoutOpen(true);
      navigate("/cart", { replace: true });
    }
  }, [location.search, cart?.totals?.itemCount, navigate]);

  const updateQuantity = async (item, nextQty) => {
    const itemId = String(item?.itemId || "");
    if (!itemId) return;

    setUpdatingItemId(itemId);
    setError("");
    try {
      if (nextQty <= 0) {
        await removeStoreCartItem({ itemId });
      } else {
        await updateStoreCartItem({ itemId, quantity: nextQty });
      }
      await loadCart();
    } catch (err) {
      setError(err?.message || "Unable to update cart");
    } finally {
      setUpdatingItemId("");
    }
  };

  const totals = useMemo(
    () => ({
      itemCount: Number(cart?.totals?.itemCount || 0),
      subtotal: Number(cart?.totals?.subtotal || 0),
    }),
    [cart]
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", color: "#0F172A", paddingBottom: 90 }}>
      {checkoutOpen ? (
        <OrderCheckoutModal
          itemCount={totals.itemCount}
          subtotal={totals.subtotal}
          onClose={() => setCheckoutOpen(false)}
          onOrderPlaced={() => {
            setCheckoutOpen(false);
            loadCart();
            navigate("/orders");
          }}
        />
      ) : null}

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: "1px solid #E2E8F0",
          background: "rgba(255,255,255,.92)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            maxWidth: 940,
            margin: "0 auto",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              border: "none",
              background: "none",
              color: "#0F172A",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Your Cart</h1>
          <button
            type="button"
            onClick={() => navigate("/products")}
            style={{
              border: "none",
              background: "none",
              color: "#0EA5A4",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Shop
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 940, margin: "0 auto", padding: "16px" }}>
        {error ? (
          <div
            style={{
              borderRadius: 10,
              border: "1px solid #FECACA",
              background: "#FEF2F2",
              color: "#B91C1C",
              fontSize: 13,
              padding: "9px 10px",
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <div style={{ padding: "28px 0", textAlign: "center", color: "#64748B" }}>
            Loading cart...
          </div>
        ) : (
          <>
            {cart.items?.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {cart.items.map((item) => {
                  const itemId = String(item?.itemId || "");
                  const qty = Number(item?.quantity || 0);
                  const isUpdating = updatingItemId === itemId;
                  return (
                    <article
                      key={itemId}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "72px 1fr auto",
                        gap: 10,
                        borderRadius: 14,
                        border: "1px solid #E2E8F0",
                        background: "white",
                        padding: 10,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 10,
                          overflow: "hidden",
                          background: "#F1F5F9",
                        }}
                      >
                        {item?.imageUrl ? (
                          <img
                            src={String(item.imageUrl)}
                            alt={String(item?.name || "Product")}
                            loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : null}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                          }}
                        >
                          {String(item?.name || "Product")}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>
                          INR {Number(item?.unitPrice || 0).toFixed(2)}
                        </div>
                        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updateQuantity(item, qty - 1)}
                            style={qtyBtnStyle}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 700 }}>{qty}</span>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updateQuantity(item, qty + 1)}
                            style={qtyBtnStyle}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div style={{ textAlign: "right", minWidth: 80 }}>
                        <div style={{ fontWeight: 800 }}>
                          INR {Number(item?.lineTotal || qty * Number(item?.unitPrice || 0)).toFixed(2)}
                        </div>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => updateQuantity(item, 0)}
                          style={{
                            marginTop: 8,
                            border: "none",
                            background: "none",
                            color: "#DC2626",
                            fontSize: 12,
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid #E2E8F0",
                  background: "white",
                  borderRadius: 14,
                  padding: 20,
                  textAlign: "center",
                }}
              >
                <div style={{ fontWeight: 800 }}>Your cart is empty</div>
                <button
                  type="button"
                  onClick={() => navigate("/products")}
                  style={{
                    marginTop: 10,
                    border: "none",
                    borderRadius: 10,
                    background: "linear-gradient(135deg,#0EA5A4,#2563EB)",
                    color: "white",
                    padding: "10px 14px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Browse Products
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {!loading && totals.itemCount > 0 ? (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            borderTop: "1px solid #E2E8F0",
            background: "white",
            padding: "10px 14px 14px",
          }}
        >
          <div
            style={{
              maxWidth: 940,
              margin: "0 auto",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                {totals.itemCount} item{totals.itemCount > 1 ? "s" : ""}
              </div>
              <div style={{ fontWeight: 800 }}>INR {totals.subtotal.toFixed(2)}</div>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              style={{
                border: "none",
                borderRadius: 10,
                background: "linear-gradient(135deg,#F59E0B,#F97316)",
                color: "white",
                padding: "10px 18px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Checkout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const qtyBtnStyle = {
  width: 26,
  height: 26,
  borderRadius: 8,
  border: "1px solid #CBD5E1",
  background: "white",
  cursor: "pointer",
  fontWeight: 700,
};

export default CartPage;
