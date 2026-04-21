import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import OrderCheckoutModal from "./OrderCheckoutModal";

const asText = (value) => (value == null ? "" : String(value).trim());
const toMoney = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Number(Math.max(0, parsed).toFixed(2));
};

const normalizeCheckoutItems = (items) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const quantity = Math.max(
        1,
        Number(item?.quantity ?? item?.qty ?? 1) || 1
      );
      const unitPrice = toMoney(item?.unitPrice ?? item?.price ?? 0);
      return {
        itemId: asText(item?.itemId || item?.id || item?._id || item?.productId),
        productId: asText(item?.productId || item?.id || item?._id),
        name: asText(item?.name) || "Product",
        imageUrl: asText(item?.imageUrl),
        quantity,
        unitPrice,
        lineTotal: toMoney(item?.lineTotal ?? unitPrice * quantity),
        availableStock: Number(item?.availableStock),
      };
    })
    .filter((item) => Boolean(item.productId));
};

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const routeState = location.state || {};
  const items = useMemo(
    () => normalizeCheckoutItems(routeState?.items),
    [routeState?.items]
  );
  const itemCount =
    Number(routeState?.itemCount || 0) ||
    items.reduce((sum, item) => sum + Math.max(1, Number(item?.quantity || 1)), 0);
  const subtotal =
    Number(routeState?.subtotal || 0) ||
    items.reduce((sum, item) => sum + toMoney(item?.lineTotal), 0);
  const returnPath = asText(routeState?.returnPath) || "/products";

  if (!items.length) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f8fafc",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "min(100%, 420px)",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            padding: 20,
            boxShadow: "0 14px 36px rgba(15,23,42,.08)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>
            No items selected for checkout
          </h2>
          <p style={{ marginTop: 8, color: "#475569", fontSize: 14 }}>
            Please add products to cart or use Buy Now from the product page.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => navigate("/products")}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#1e293b",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Browse Products
            </button>
            <button
              type="button"
              onClick={() => navigate("/cart")}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 10,
                border: "none",
                background: "#10b981",
                color: "#ffffff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Open Cart
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <OrderCheckoutModal
        onClose={() => navigate(returnPath)}
        onOrderPlaced={() => {
          window.dispatchEvent(new Event("inventory:refresh"));
        }}
        items={items}
        itemCount={itemCount}
        subtotal={subtotal}
        forceItemsCheckout
      />
    </div>
  );
};

export default CheckoutPage;
