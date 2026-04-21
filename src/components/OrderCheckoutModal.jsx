import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createStoreOrder } from "../utils/storeApi";
import {
  computeCheckoutBreakdown,
  persistOrderForAdminPanel,
} from "../utils/storeOrderSync";

const STORE_CHECKOUT_DRAFT_KEY = "mv_store_checkout_draft_v3";
const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const initialForm = {
  fullName: "",
  phone: "",
  alternatePhone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  notes: "",
};

const PAYMENT_OPTIONS = [
  {
    id: "upi",
    label: "UPI",
    sub: "Google Pay, PhonePe, Paytm",
    icon: "UPI",
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    sub: "Visa, Mastercard, RuPay",
    icon: "Card",
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    sub: "Pay when your order arrives",
    icon: "COD",
  },
];

const asText = (value) => (value == null ? "" : String(value).trim());
const toMoney = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Number(Math.max(0, parsed).toFixed(2));
};
const formatMoney = (value) => INR_FORMATTER.format(toMoney(value));

const readCheckoutDraft = () => {
  try {
    const raw = window.sessionStorage.getItem(STORE_CHECKOUT_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const readStoredUserPrefill = () => {
  try {
    const raw = window.localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    const addr = user?.address || user?.deliveryAddress || {};
    return {
      fullName: asText(user?.name || user?.fullName),
      phone: asText(user?.mobile || user?.phone),
      alternatePhone: asText(user?.alternatePhone || user?.altPhone),
      addressLine1: asText(
        user?.addressLine1 || addr?.addressLine1 || addr?.line1 || addr?.street
      ),
      addressLine2: asText(user?.addressLine2 || addr?.addressLine2 || addr?.line2),
      city: asText(user?.city || addr?.city),
      state: asText(user?.state || addr?.state),
      pincode: asText(user?.pincode || user?.zip || addr?.pincode || addr?.zip),
    };
  } catch {
    return null;
  }
};

const getInitialForm = () => ({
  ...initialForm,
  ...(readStoredUserPrefill() || {}),
  ...(readCheckoutDraft() || {}),
});

const validateAddress = (form) => {
  const errors = {};
  const requiredRules = [
    ["fullName", "Full Name is required"],
    ["phone", "Mobile Number is required"],
    ["addressLine1", "Address is required"],
    ["city", "City is required"],
    ["state", "State is required"],
    ["pincode", "Pincode is required"],
  ];

  requiredRules.forEach(([field, message]) => {
    if (!asText(form[field])) {
      errors[field] = message;
    }
  });

  if (asText(form.phone) && !/^\d{10}$/.test(asText(form.phone))) {
    errors.phone = "Mobile Number must be 10 digits";
  }

  if (
    asText(form.alternatePhone) &&
    !/^\d{10}$/.test(asText(form.alternatePhone))
  ) {
    errors.alternatePhone = "Alternate Mobile must be 10 digits";
  }

  if (asText(form.pincode) && !/^\d{6}$/.test(asText(form.pincode))) {
    errors.pincode = "Pincode must be 6 digits";
  }

  return errors;
};

const normalizeItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => {
      const qty = Math.max(1, Number(item?.quantity || item?.qty || 1));
      const unit = toMoney(item?.unitPrice || 0);
      const stockHint = Number(
        item?.availableStock ??
          item?.stock ??
          item?.productStatus?.stock ??
          item?.inventory?.stock ??
          Number.NaN
      );
      return {
        id: asText(item?.itemId || item?.productId || item?._id || index),
        productId: asText(item?.productId || item?.id || item?._id),
        name: asText(item?.name) || "Product",
        imageUrl: asText(item?.imageUrl),
        qty,
        unit,
        lineTotal: toMoney(item?.lineTotal || unit * qty),
        availableStock: Number.isFinite(stockHint) ? Math.max(0, stockHint) : null,
      };
    })
    .filter((item) => Boolean(item.id));
};

const OrderCheckoutModal = ({
  onClose,
  onOrderPlaced,
  items = [],
  itemCount = 0,
  subtotal = 0,
  forceItemsCheckout = false,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=address,2=review,3=payment,4=success
  const [form, setForm] = useState(getInitialForm);
  const [errors, setErrors] = useState({});
  const [payMethod, setPayMethod] = useState("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [errorToast, setErrorToast] = useState("");
  const [successOrder, setSuccessOrder] = useState(null);

  const summaryItems = useMemo(() => normalizeItems(items), [items]);

  const resolvedSubtotal = useMemo(() => {
    const fromProp = toMoney(subtotal);
    if (fromProp > 0) return fromProp;
    return toMoney(summaryItems.reduce((sum, item) => sum + item.lineTotal, 0));
  }, [subtotal, summaryItems]);

  const totals = useMemo(
    () => computeCheckoutBreakdown(resolvedSubtotal),
    [resolvedSubtotal]
  );

  const resolvedItemCount = useMemo(() => {
    if (Number(itemCount) > 0) return Number(itemCount);
    return summaryItems.reduce((sum, item) => sum + item.qty, 0);
  }, [itemCount, summaryItems]);

  useEffect(() => {
    if (!errorToast) return undefined;
    const timer = window.setTimeout(() => setErrorToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [errorToast]);

  useEffect(() => {
    saveDraft();
  }, [form]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const saveDraft = () => {
    try {
      window.sessionStorage.setItem(STORE_CHECKOUT_DRAFT_KEY, JSON.stringify(form));
    } catch {
      // Ignore sessionStorage failures.
    }
  };

  const clearDraft = () => {
    try {
      window.sessionStorage.removeItem(STORE_CHECKOUT_DRAFT_KEY);
    } catch {
      // Ignore sessionStorage failures.
    }
  };

  const validateStockBeforeOrder = () => {
    const unavailable = summaryItems.find(
      (item) =>
        Number.isFinite(item.availableStock) && item.availableStock < item.qty
    );
    if (!unavailable) return "";
    return `${unavailable.name} is out of stock for selected quantity.`;
  };

  const openError = (message) => {
    setApiError(message);
    setErrorToast(message);
  };

  const goToReview = () => {
    const addressErrors = validateAddress(form);
    setErrors(addressErrors);
    if (Object.keys(addressErrors).length > 0) {
      openError("Please complete all required address fields.");
      return;
    }
    setApiError("");
    setStep(2);
  };

  const goToPayment = () => {
    if (!summaryItems.length) {
      openError("No items found in checkout.");
      return;
    }
    setApiError("");
    setStep(3);
  };

  const placeOrder = async () => {
    if (isSubmitting) return;

    const addressErrors = validateAddress(form);
    setErrors(addressErrors);
    if (Object.keys(addressErrors).length > 0) {
      setStep(1);
      openError("Please fix address details before placing order.");
      return;
    }

    if (!asText(payMethod)) {
      openError("Please select a payment method.");
      return;
    }

    const stockIssue = validateStockBeforeOrder();
    if (stockIssue) {
      openError(stockIssue);
      return;
    }

    setIsSubmitting(true);
    setApiError("");
    try {
      const explicitItemsPayload = forceItemsCheckout
        ? summaryItems
            .map((item) => ({
              productId: asText(item?.productId || item?.id),
              quantity: Math.max(1, Number(item?.qty || item?.quantity || 1)),
            }))
            .filter((item) => Boolean(item.productId))
        : [];

      const response = await createStoreOrder({
        delivery: form,
        paymentMethod: payMethod,
        ...(explicitItemsPayload.length > 0
          ? { items: explicitItemsPayload }
          : {}),
      });
      const order = response?.order || null;
      const breakdown = computeCheckoutBreakdown(
        order?.totals?.subtotal || totals.subtotal
      );
      const paymentLabel =
        PAYMENT_OPTIONS.find((option) => option.id === payMethod)?.label ||
        "Cash on Delivery";

      persistOrderForAdminPanel({ order, totalsOverride: breakdown });
      clearDraft();
      onOrderPlaced?.(order);
      window.dispatchEvent(new Event("inventory:refresh"));

      setSuccessOrder({
        orderId: asText(order?._id || order?.id) || "N/A",
        amount: breakdown.total,
        payment: paymentLabel,
      });
      setStep(4);
    } catch (error) {
      openError(error?.message || "Unable to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes co-fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes co-slidein { from { opacity: 0; transform: scale(.96) translateY(16px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes co-stepin { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes co-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes co-check { from { stroke-dashoffset: 48; } to { stroke-dashoffset: 0; } }
        @keyframes co-spin { to { transform: rotate(360deg); } }

        .co-overlay {
          position: fixed;
          inset: 0;
          z-index: 1100;
          background: rgba(0, 0, 0, .45);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: co-fadein .2s ease;
        }
        .co-modal {
          width: 100%;
          max-width: 860px;
          background: rgba(255, 255, 255, .9);
          border: 1px solid rgba(255, 255, 255, .45);
          border-radius: 24px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, .22);
          overflow: hidden;
          animation: co-slidein .28s cubic-bezier(.34,1.2,.64,1);
          display: flex;
          flex-direction: column;
          max-height: 92vh;
          font-family: "Inter", system-ui, sans-serif;
        }
        .co-header {
          padding: 20px 28px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #f0fdf4, #ecfeff);
          flex-shrink: 0;
        }
        .co-title { font-size: 17px; font-weight: 800; color: #0f172a; }
        .co-subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
        .co-close {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, .06);
          display: grid;
          place-items: center;
          cursor: pointer;
          color: #475569;
          font-size: 18px;
        }
        .co-steps { display: flex; align-items: center; padding: 16px 28px 0; }
        .co-step { display: flex; align-items: center; gap: 8px; flex: 1; }
        .co-step-circle {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .co-step-circle.done { background: #10b981; color: #ffffff; }
        .co-step-circle.active { background: #0f172a; color: #ffffff; }
        .co-step-circle.idle { background: #f1f5f9; color: #94a3b8; }
        .co-step-label { font-size: 12px; font-weight: 700; }
        .co-step-label.done, .co-step-label.active { color: #0f172a; }
        .co-step-label.idle { color: #94a3b8; }
        .co-step-line {
          flex: 1;
          height: 2px;
          border-radius: 1px;
          margin: 0 8px;
          background: #e2e8f0;
        }
        .co-step-line.done { background: #10b981; }
        .co-body { flex: 1; overflow-y: auto; padding: 20px 28px 24px; }
        .co-step-content { animation: co-stepin .2s ease; }
        .co-sec-title {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .co-sec-title-icon {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          background: #ecfdf5;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 800;
          color: #065f46;
        }
        .co-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 560px) { .co-grid { grid-template-columns: 1fr; } }
        .co-field { display: flex; flex-direction: column; gap: 5px; }
        .co-field.full { grid-column: 1 / -1; }
        .co-label { font-size: 11.5px; font-weight: 700; color: #475569; }
        .co-input {
          height: 42px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          padding: 0 12px;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          background: rgba(255, 255, 255, .8);
          color: #0f172a;
        }
        .co-input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.12); }
        .co-input.err { border-color: #fca5a5; }
        .co-err { font-size: 11px; color: #dc2626; font-weight: 600; }
        .co-addr-card {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px 16px;
        }
        .co-addr-name { font-size: 14px; font-weight: 700; color: #0f172a; }
        .co-addr-line { font-size: 13px; color: #475569; margin-top: 2px; line-height: 1.5; }
        .co-item {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
          background: #ffffff;
          margin-bottom: 8px;
        }
        .co-item-img {
          width: 52px;
          height: 52px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          flex-shrink: 0;
          display: grid;
          place-items: center;
        }
        .co-item-img img { width: 100%; height: 100%; object-fit: cover; }
        .co-item-fallback { font-size: 18px; font-weight: 800; color: #94a3b8; }
        .co-item-name { font-size: 14px; font-weight: 700; color: #0f172a; }
        .co-item-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
        .co-item-price { margin-left: auto; font-size: 14px; font-weight: 800; color: #0f172a; }
        .co-summary-grid { display: grid; grid-template-columns: 1fr 340px; gap: 20px; }
        @media (max-width: 680px) { .co-summary-grid { grid-template-columns: 1fr; } }
        .co-price-panel {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-self: start;
        }
        .co-price-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #475569; }
        .co-price-row.total {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          padding-top: 10px;
          margin-top: 4px;
          border-top: 1.5px dashed #cbd5e1;
        }
        .co-free-tag {
          font-size: 12px;
          font-weight: 800;
          color: #059669;
          background: #dcfce7;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .co-pay-opts { display: flex; flex-direction: column; gap: 10px; }
        .co-pay-opt {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 14px;
          border: 2px solid #e2e8f0;
          background: #ffffff;
          cursor: pointer;
          text-align: left;
          width: 100%;
          font-family: inherit;
        }
        .co-pay-opt.selected {
          border-color: #10b981;
          background: #f0fdf4;
          box-shadow: 0 0 0 3px rgba(16,185,129,.1);
        }
        .co-pay-opt-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #ecfdf5;
          color: #065f46;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .co-pay-opt-label { font-size: 14px; font-weight: 700; color: #0f172a; }
        .co-pay-opt-sub { font-size: 12px; color: #64748b; margin-top: 1px; }
        .co-pay-opt-radio {
          margin-left: auto;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid #cbd5e1;
          flex-shrink: 0;
          display: grid;
          place-items: center;
        }
        .co-pay-opt.selected .co-pay-opt-radio { border-color: #10b981; background: #10b981; }
        .co-pay-opt.selected .co-pay-opt-radio::after {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ffffff;
        }
        .co-actions { display: flex; gap: 10px; margin-top: 20px; flex-shrink: 0; }
        .co-btn-primary {
          flex: 1;
          height: 48px;
          border-radius: 999px;
          border: none;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          font-size: 15px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(16,185,129,.3);
        }
        .co-btn-primary:disabled { opacity: .6; cursor: not-allowed; box-shadow: none; }
        .co-btn-secondary {
          flex: 1;
          height: 48px;
          border-radius: 999px;
          border: 2px solid #e2e8f0;
          background: #ffffff;
          color: #374151;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }
        .co-api-err {
          margin-top: 12px;
          border-radius: 10px;
          border: 1px solid #fca5a5;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 12px;
        }
        .co-toast-err {
          position: fixed;
          top: 22px;
          right: 22px;
          z-index: 1300;
          max-width: 340px;
          border-radius: 12px;
          border: 1px solid #fca5a5;
          background: rgba(254,242,242,.95);
          color: #b91c1c;
          font-size: 13px;
          font-weight: 700;
          padding: 10px 12px;
          box-shadow: 0 10px 32px rgba(185,28,28,.16);
        }
        .co-spinner {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,.42);
          border-top-color: #ffffff;
          animation: co-spin .7s linear infinite;
        }
        .co-success-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-top: 8px;
        }
        .co-success-circle {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          display: grid;
          place-items: center;
          box-shadow: 0 8px 28px rgba(16,185,129,.35);
          animation: co-pulse .7s ease-in-out 1;
          margin-bottom: 18px;
        }
        .co-success-circle svg { width: 44px; height: 44px; }
        .co-success-circle svg path { stroke-dasharray: 48; animation: co-check .5s .2s ease forwards; }
        .co-success-title { font-size: 22px; font-weight: 900; color: #0f172a; }
        .co-success-sub { font-size: 14px; color: #64748b; margin-top: 8px; max-width: 340px; }
        .co-success-meta {
          margin-top: 20px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          background: #ffffff;
          padding: 18px;
          width: 100%;
          max-width: 340px;
          display: grid;
          gap: 10px;
          text-align: left;
        }
        .co-success-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
        .co-success-row .lbl { color: #64748b; }
        .co-success-row .val { font-weight: 700; color: #0f172a; }
        .co-success-row .val.green { color: #059669; font-size: 16px; font-weight: 900; }
      `}</style>

      {errorToast ? <div className="co-toast-err">{errorToast}</div> : null}

      <div
        className="co-overlay"
        onClick={(event) => {
          if (event.target === event.currentTarget && !isSubmitting) onClose?.();
        }}
      >
        <div className="co-modal">
          <div className="co-header">
            <div>
              <div className="co-title">
                {step === 4 ? "Order Confirmed" : "Secure Checkout"}
              </div>
              <div className="co-subtitle">
                {step !== 4
                  ? `${resolvedItemCount} item${resolvedItemCount !== 1 ? "s" : ""} - Total ${formatMoney(totals.total)}`
                  : "Your order has been confirmed successfully"}
              </div>
            </div>
            <button
              className="co-close"
              onClick={() => !isSubmitting && onClose?.()}
              disabled={isSubmitting}
            >
              ×
            </button>
          </div>

          {step < 4 ? (
            <div className="co-steps">
              <div className="co-step">
                <div className={`co-step-circle ${step > 1 ? "done" : "active"}`}>
                  {step > 1 ? "✓" : "1"}
                </div>
                <span className={`co-step-label ${step > 1 ? "done" : "active"}`}>
                  Address
                </span>
              </div>
              <div className={`co-step-line ${step > 1 ? "done" : ""}`} />

              <div className="co-step">
                <div className={`co-step-circle ${step > 2 ? "done" : step === 2 ? "active" : "idle"}`}>
                  {step > 2 ? "✓" : "2"}
                </div>
                <span
                  className={`co-step-label ${step > 2 ? "done" : step === 2 ? "active" : "idle"}`}
                >
                  Review
                </span>
              </div>
              <div className={`co-step-line ${step > 2 ? "done" : ""}`} />

              <div className="co-step">
                <div className={`co-step-circle ${step === 3 ? "active" : "idle"}`}>3</div>
                <span className={`co-step-label ${step === 3 ? "active" : "idle"}`}>
                  Payment
                </span>
              </div>
            </div>
          ) : null}

          <div className="co-body">
            {step === 1 ? (
              <div className="co-step-content">
                <div className="co-sec-title">
                  <div className="co-sec-title-icon">ADDR</div>
                  Delivery Address
                </div>

                <div className="co-grid">
                  <CField
                    label="Full Name"
                    required
                    val={form.fullName}
                    onChange={(value) => setField("fullName", value)}
                    err={errors.fullName}
                  />
                  <CField
                    label="Mobile Number"
                    required
                    val={form.phone}
                    onChange={(value) => setField("phone", value)}
                    err={errors.phone}
                  />
                  <CField
                    label="Alternate Mobile (Optional)"
                    val={form.alternatePhone}
                    onChange={(value) => setField("alternatePhone", value)}
                    err={errors.alternatePhone}
                  />
                  <div />
                  <CField
                    label="Address Line 1"
                    required
                    val={form.addressLine1}
                    onChange={(value) => setField("addressLine1", value)}
                    err={errors.addressLine1}
                    full
                  />
                  <CField
                    label="Address Line 2 (Optional)"
                    val={form.addressLine2}
                    onChange={(value) => setField("addressLine2", value)}
                    full
                  />
                  <CField
                    label="City"
                    required
                    val={form.city}
                    onChange={(value) => setField("city", value)}
                    err={errors.city}
                  />
                  <CField
                    label="State"
                    required
                    val={form.state}
                    onChange={(value) => setField("state", value)}
                    err={errors.state}
                  />
                  <CField
                    label="Pincode"
                    required
                    val={form.pincode}
                    onChange={(value) => setField("pincode", value)}
                    err={errors.pincode}
                  />
                  <CField
                    label="Delivery Notes (Optional)"
                    val={form.notes}
                    onChange={(value) => setField("notes", value)}
                    full
                  />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="co-step-content">
                <div className="co-summary-grid">
                  <div>
                    <div className="co-sec-title">
                      <div className="co-sec-title-icon">ITEM</div>
                      Product Review
                    </div>

                    {summaryItems.length === 0 ? (
                      <div style={{ color: "#94a3b8", fontSize: 14 }}>
                        No items in cart.
                      </div>
                    ) : (
                      summaryItems.map((item) => (
                        <div key={item.id} className="co-item">
                          <div className="co-item-img">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} loading="lazy" />
                            ) : (
                              <span className="co-item-fallback">
                                {item.name[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="co-item-name">{item.name}</div>
                            <div className="co-item-sub">
                              Qty: {item.qty} x {formatMoney(item.unit)}
                            </div>
                          </div>
                          <div className="co-item-price">{formatMoney(item.lineTotal)}</div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="co-price-panel">
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
                      Price Breakdown
                    </div>
                    <div className="co-price-row">
                      <span>Subtotal</span>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>
                        {formatMoney(totals.subtotal)}
                      </span>
                    </div>
                    <div className="co-price-row">
                      <span>GST (18%)</span>
                      <span style={{ fontWeight: 600, color: "#dc2626" }}>
                        +{formatMoney(totals.gst)}
                      </span>
                    </div>
                    <div className="co-price-row">
                      <span>Delivery</span>
                      {totals.deliveryCharges === 0 ? (
                        <span className="co-free-tag">FREE</span>
                      ) : (
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>
                          +{formatMoney(totals.deliveryCharges)}
                        </span>
                      )}
                    </div>
                    <div className="co-price-row total">
                      <span>Total Payable</span>
                      <span style={{ color: "#059669" }}>{formatMoney(totals.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="co-step-content">
                <div className="co-sec-title">
                  <div className="co-sec-title-icon">PAY</div>
                  Payment Method
                </div>
                <div className="co-pay-opts">
                  {PAYMENT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`co-pay-opt${payMethod === option.id ? " selected" : ""}`}
                      onClick={() => setPayMethod(option.id)}
                    >
                      <span className="co-pay-opt-icon">{option.icon}</span>
                      <div>
                        <div className="co-pay-opt-label">{option.label}</div>
                        <div className="co-pay-opt-sub">{option.sub}</div>
                      </div>
                      <div className="co-pay-opt-radio" />
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 16 }}>
                  <div className="co-sec-title">
                    <div className="co-sec-title-icon">ADDR</div>
                    Shipping Address
                  </div>
                  <div className="co-addr-card">
                    <div className="co-addr-name">
                      {form.fullName}
                      {form.phone ? ` - ${form.phone}` : ""}
                      {form.alternatePhone ? ` / ${form.alternatePhone}` : ""}
                    </div>
                    <div className="co-addr-line">
                      {[form.addressLine1, form.addressLine2, form.city, form.state, form.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="co-step-content co-success-wrap">
                <div className="co-success-circle">
                  <svg viewBox="0 0 48 48" fill="none">
                    <path
                      d="M12 24l8 8 16-16"
                      stroke="white"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="co-success-title">Order Confirmed</div>
                <div className="co-success-sub">Your order has been confirmed successfully.</div>

                <div className="co-success-meta">
                  <div className="co-success-row">
                    <span className="lbl">Order ID</span>
                    <span className="val" style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {successOrder?.orderId || "N/A"}
                    </span>
                  </div>
                  <div className="co-success-row">
                    <span className="lbl">Amount</span>
                    <span className="val green">{formatMoney(successOrder?.amount || totals.total)}</span>
                  </div>
                  <div className="co-success-row">
                    <span className="lbl">Payment</span>
                    <span className="val">{successOrder?.payment || "Cash on Delivery"}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {apiError ? <div className="co-api-err">{apiError}</div> : null}
          </div>

          {step < 4 ? (
            <div className="co-actions" style={{ padding: "0 28px 24px", flexShrink: 0 }}>
              {step === 1 ? (
                <>
                  <button className="co-btn-secondary" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                  </button>
                  <button className="co-btn-primary" onClick={goToReview} disabled={isSubmitting}>
                    Continue
                  </button>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <button
                    className="co-btn-secondary"
                    onClick={() => {
                      setApiError("");
                      setStep(1);
                    }}
                    disabled={isSubmitting}
                  >
                    Back
                  </button>
                  <button className="co-btn-primary" onClick={goToPayment} disabled={isSubmitting}>
                    Continue
                  </button>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <button
                    className="co-btn-secondary"
                    onClick={() => {
                      setApiError("");
                      setStep(2);
                    }}
                    disabled={isSubmitting}
                  >
                    Back
                  </button>
                  <button
                    className="co-btn-primary"
                    onClick={placeOrder}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="co-spinner" />
                        Placing Order...
                      </>
                    ) : (
                      `Place Order - ${formatMoney(totals.total)}`
                    )}
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <div className="co-actions" style={{ padding: "0 28px 24px", flexShrink: 0 }}>
              <button className="co-btn-secondary" onClick={onClose}>
                Continue Shopping
              </button>
              <button
                className="co-btn-primary"
                onClick={() => {
                  onClose?.();
                  navigate("/orders");
                }}
              >
                Track Order
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const CField = ({ label, val, onChange, err, required, full }) => (
  <label className={`co-field${full ? " full" : ""}`}>
    <span className="co-label">
      {label}
      {required ? " *" : ""}
    </span>
    <input
      className={`co-input${err ? " err" : ""}`}
      value={val}
      onChange={(event) => onChange(event.target.value)}
    />
    {err ? <span className="co-err">{err}</span> : null}
  </label>
);

export default OrderCheckoutModal;
