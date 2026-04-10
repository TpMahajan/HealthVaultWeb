import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchStoreOrders } from "../utils/storeApi";

const OrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchStoreOrders({ page: 1, limit: 30 });
      setOrders(Array.isArray(response?.orders) ? response.orders : []);
    } catch (err) {
      setError(err?.message || "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", color: "#0F172A" }}>
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
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 16px",
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>My Orders</h1>
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
          <div style={{ textAlign: "center", padding: "28px 0", color: "#64748B" }}>
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: 14,
              background: "white",
              padding: 20,
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: 800 }}>No orders yet</div>
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
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {orders.map((order) => {
              const id = String(order?._id || order?.id || "Order");
              const status = String(order?.status || "PLACED");
              const createdAt = order?.createdAt
                ? new Date(order.createdAt).toLocaleString()
                : "Unknown date";
              const subtotal = Number(order?.totals?.subtotal || 0).toFixed(2);
              const itemCount = Number(order?.totals?.itemCount || 0);

              return (
                <article
                  key={id}
                  style={{
                    borderRadius: 14,
                    border: "1px solid #E2E8F0",
                    background: "white",
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{id}</div>
                      <div style={{ marginTop: 4, color: "#64748B", fontSize: 13 }}>
                        {createdAt}
                      </div>
                      <div style={{ marginTop: 6, color: "#334155", fontSize: 13 }}>
                        {itemCount} item{itemCount === 1 ? "" : "s"} • INR {subtotal}
                      </div>
                    </div>
                    <span
                      style={{
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontWeight: 700,
                        fontSize: 12,
                        color: "#166534",
                        background: "#DCFCE7",
                      }}
                    >
                      {status}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default OrdersPage;
