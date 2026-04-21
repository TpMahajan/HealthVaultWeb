import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";

import OrderCheckoutModal from "./OrderCheckoutModal";
import {
  fetchStoreCart,
  removeStoreCartItem,
  updateStoreCartItem,
} from "../utils/storeApi";

const emptyCart = { items: [], totals: { itemCount: 0, subtotal: 0 } };
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const CartPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [cart, setCart] = useState(emptyCart);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const syncCartState = (nextCart) => {
    setCart({
      items: nextCart?.items || [],
      totals: nextCart?.totals || { itemCount: 0, subtotal: 0 },
    });
  };

  const loadCart = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchStoreCart();
      syncCartState(response?.cart || emptyCart);
    } catch (err) {
      setError(err?.message || "Failed to load cart");
      setCart(emptyCart);
    } finally {
      setLoading(false);
    }
  };

  const applyCartResponse = async (response) => {
    const nextCart = response?.cart;
    if (Array.isArray(nextCart?.items)) {
      syncCartState(nextCart);
      return;
    }
    await loadCart();
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

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const updateQuantity = async (item, nextQty) => {
    const itemId = String(item?.itemId || "");
    if (!itemId) return;

    setUpdatingItemId(itemId);
    setError("");

    try {
      if (nextQty <= 0) {
        const response = await removeStoreCartItem({ itemId });
        await applyCartResponse(response);
      } else {
        const response = await updateStoreCartItem({ itemId, quantity: nextQty });
        await applyCartResponse(response);
      }
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
    <div style={{ minHeight: "100vh", background: "#F1F5F9", color: "#0F172A", paddingBottom: 108 }}>
      <style>{`
        .cart-shell {
          max-width: 980px;
          margin: 0 auto;
          padding: 18px 16px;
        }

        .cart-item-card {
          display: grid;
          grid-template-columns: 84px 1fr auto;
          gap: 14px;
          border-radius: 14px;
          border: 1px solid #dbe4ee;
          background: #ffffff;
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.06);
          padding: 12px;
          align-items: center;
        }

        .cart-float-wrap {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 10px 14px 14px;
          pointer-events: none;
        }

        .cart-float-card {
          max-width: 980px;
          margin: 0 auto;
          display: flex;
          justify-content: flex-end;
          pointer-events: auto;
        }

        .cart-summary-panel {
          width: min(100%, 360px);
          border: 1px solid #dbe4ee;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.15);
          padding: 12px;
        }

        @media (max-width: 720px) {
          .cart-shell {
            padding: 14px 12px;
          }

          .cart-item-card {
            grid-template-columns: 72px 1fr;
          }

          .cart-item-side {
            grid-column: 1 / -1;
            border-top: 1px dashed #dbe4ee;
            padding-top: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .cart-float-card {
            justify-content: stretch;
          }

          .cart-summary-panel {
            width: 100%;
          }
        }
      `}</style>

      {checkoutOpen ? (
        <OrderCheckoutModal
          itemCount={totals.itemCount}
          subtotal={totals.subtotal}
          items={cart.items || []}
          onClose={() => setCheckoutOpen(false)}
          onOrderPlaced={() => {
            loadCart();
            setNotice("Order Placed Successfully ✅");
          }}
          returnPath="/cart?checkout=1"
        />
      ) : null}

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: "1px solid #E2E8F0",
          background: "rgba(255,255,255,.94)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            maxWidth: 980,
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
            {"<"} Back
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Your Cart</h1>
          <button
            type="button"
            onClick={() => navigate("/products")}
            style={{
              border: "none",
              background: "none",
              color: "#2563EB",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Shop
          </button>
        </div>
      </header>

      <main className="cart-shell">
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
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        {notice ? (
          <div
            style={{
              borderRadius: 10,
              border: "1px solid #BBF7D0",
              background: "#F0FDF4",
              color: "#166534",
              fontSize: 13,
              padding: "9px 10px",
              marginBottom: 12,
              fontWeight: 600,
            }}
          >
            {notice}
          </div>
        ) : null}

        {loading ? (
          <div style={{ padding: "30px 0", textAlign: "center", color: "#64748B" }}>
            Loading cart...
          </div>
        ) : (
          <>
            {cart.items?.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {cart.items.map((item) => {
                  const itemId = String(item?.itemId || "");
                  const qty = Math.max(1, Number(item?.quantity || 1));
                  const isUpdating = updatingItemId === itemId;

                  return (
                    <article key={itemId} className="cart-item-card">
                      <div
                        style={{
                          width: "100%",
                          height: 84,
                          borderRadius: 10,
                          overflow: "hidden",
                          border: "1px solid #E2E8F0",
                          background: "#F8FAFC",
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
                        <div style={{ fontWeight: 800, color: "#0F172A" }}>
                          {String(item?.name || "Product")}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>
                          {formatCurrency(Number(item?.unitPrice || 0))}
                        </div>
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updateQuantity(item, qty - 1)}
                            style={qtyBtnStyle}
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ fontWeight: 800, minWidth: 18, textAlign: "center" }}>
                            {qty}
                          </span>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updateQuantity(item, qty + 1)}
                            style={qtyBtnStyle}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="cart-item-side" style={{ textAlign: "right", minWidth: 96 }}>
                        <div style={{ fontWeight: 900, color: "#0F172A" }}>
                          {formatCurrency(
                            Number(item?.lineTotal || qty * Number(item?.unitPrice || 0))
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => updateQuantity(item, 0)}
                          style={{
                            marginTop: 8,
                            border: "1px solid #FECACA",
                            background: "#FEF2F2",
                            color: "#B91C1C",
                            fontSize: 12,
                            cursor: "pointer",
                            fontWeight: 700,
                            borderRadius: 9,
                            padding: "6px 10px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Trash2 size={13} />
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
                  padding: 24,
                  textAlign: "center",
                }}
              >
                <div style={{ fontWeight: 800, color: "#0F172A" }}>Your cart is empty</div>
                <button
                  type="button"
                  onClick={() => navigate("/products")}
                  style={{
                    marginTop: 12,
                    border: "none",
                    borderRadius: 10,
                    background: "linear-gradient(135deg,#2563EB,#1D4ED8)",
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
        <div className="cart-float-wrap">
          <div className="cart-float-card">
            <div className="cart-summary-panel">
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
                {totals.itemCount} item{totals.itemCount > 1 ? "s" : ""}
              </div>
              <div style={{ marginTop: 2, fontWeight: 900, fontSize: 20, color: "#0F172A" }}>
                {formatCurrency(totals.subtotal)}
              </div>
              <button
                type="button"
                onClick={() => setCheckoutOpen(true)}
                style={{
                  marginTop: 10,
                  width: "100%",
                  border: "none",
                  borderRadius: 10,
                  background: "linear-gradient(135deg,#2563EB,#1D4ED8)",
                  color: "white",
                  padding: "11px 16px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const qtyBtnStyle = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid #CBD5E1",
  background: "white",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

export default CartPage;
