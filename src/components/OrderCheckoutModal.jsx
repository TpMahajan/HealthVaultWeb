import React, { useState } from "react";

import { createStoreOrder } from "../utils/storeApi";

const initialForm = {
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  notes: "",
};

const OrderCheckoutModal = ({
  onClose,
  onOrderPlaced,
  itemCount = 0,
  subtotal = 0,
}) => {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    try {
      const response = await createStoreOrder({ delivery: form });
      onOrderPlaced?.(response?.order || null);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Unable to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = Number(subtotal || 0).toFixed(2);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15,23,42,.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "white",
          borderRadius: 18,
          border: "1px solid #E2E8F0",
          boxShadow: "0 26px 70px rgba(15,23,42,.24)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 18px",
            borderBottom: "1px solid #E2E8F0",
            background: "linear-gradient(135deg,#F0FDFA,#EFF6FF)",
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: "#0F172A" }}>Checkout</div>
            <div style={{ color: "#64748B", fontSize: 13 }}>
              {itemCount} item{itemCount === 1 ? "" : "s"} • INR {formatAmount}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "#E2E8F0",
              borderRadius: "50%",
              width: 30,
              height: 30,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 18 }}>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <input
              required
              placeholder="Full Name"
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              style={inputStyle}
            />
            <input
              required
              placeholder="Phone"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              style={inputStyle}
            />
            <input
              required
              placeholder="Address Line 1"
              value={form.addressLine1}
              onChange={(event) => updateField("addressLine1", event.target.value)}
              style={{ ...inputStyle, gridColumn: "1 / -1" }}
            />
            <input
              placeholder="Address Line 2"
              value={form.addressLine2}
              onChange={(event) => updateField("addressLine2", event.target.value)}
              style={{ ...inputStyle, gridColumn: "1 / -1" }}
            />
            <input
              required
              placeholder="City"
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              style={inputStyle}
            />
            <input
              required
              placeholder="State"
              value={form.state}
              onChange={(event) => updateField("state", event.target.value)}
              style={inputStyle}
            />
            <input
              required
              placeholder="Pincode"
              value={form.pincode}
              onChange={(event) => updateField("pincode", event.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Delivery Notes"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              style={inputStyle}
            />
          </div>

          {error ? (
            <div
              style={{
                marginTop: 10,
                borderRadius: 10,
                border: "1px solid #FECACA",
                background: "#FEF2F2",
                color: "#B91C1C",
                fontSize: 13,
                padding: "9px 10px",
              }}
            >
              {error}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 10,
                border: "1px solid #CBD5E1",
                background: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg,#0EA5A4,#2563EB)",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
                opacity: isSubmitting ? 0.72 : 1,
              }}
            >
              {isSubmitting ? "Placing..." : "Place Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputStyle = {
  height: 40,
  borderRadius: 10,
  border: "1px solid #CBD5E1",
  padding: "0 11px",
  fontSize: 14,
};

export default OrderCheckoutModal;
