import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../constants/api";
import {
  ShieldPlus, Activity, Package, LayoutDashboard, RefreshCw,
  Table as TableIcon, ScrollText, AlertTriangle, Clock, PackageCheck,
  Banknote, CalendarClock, TrendingUp, ShoppingBag, Plus,
  Settings2, History, ClipboardList, Target, Box, ShoppingCart, Share2, BarChart3, Boxes
} from "lucide-react";

/* ── Config ── */
const ADMIN_INVENTORY_BASE = `${API_BASE}/admin/inventory`;
const PRODUCTS = [
  { key: "NFC_BAND", label: "NFC Band", color: "#3B82F6", bg: "#EFF6FF", icon: <Share2 size={24} color="#3B82F6" strokeWidth={2} /> },
  { key: "MEDICAL_KIT", label: "Medical Kit", color: "#3B82F6", bg: "#EFF6FF", icon: <Activity size={24} color="#3B82F6" strokeWidth={2} /> },
];
const MOVE_TYPE_COLOR = {
  IN: { bg: "#DCFCE7", text: "#15803D", label: "IN" },
  OUT: { bg: "#FEE2E2", text: "#DC2626", label: "OUT" },
  RETURN: { bg: "#DBEAFE", text: "#1D4ED8", label: "RETURN" },
  DAMAGED: { bg: "#FEF3C7", text: "#92400E", label: "DAMAGED" },
  ADJUSTMENT: { bg: "#F3E8FF", text: "#7C3AED", label: "ADJUST" },
};
const STATUS_COLOR = {
  "In Stock": { bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0" },
  "Low": { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  "Out": { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" },
};

function adminHeaders() {
  const token = localStorage.getItem("adminToken");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function fmtCurrency(n) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtShort(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════*/
export default function AdminInventoyPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard"); // dashboard | table | ledger
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [ledger, setLedger] = useState(null);

  /* Filters */
  const [filterProduct, setFilterProduct] = useState("ALL");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [ledgerMoveType, setLedgerMoveType] = useState("ALL");
  const [ledgerPage, setLedgerPage] = useState(1);

  /* Modals */
  const [restockModal, setRestockModal] = useState(null); // productKey
  const [adjustModal, setAdjustModal] = useState(null); // productKey
  const [reorderModal, setReorderModal] = useState(null); // { productKey, current }
  const [historyProduct, setHistoryProduct] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (filterProduct !== "ALL") params.set("productKey", filterProduct);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      const res = await fetch(`${ADMIN_INVENTORY_BASE}/dashboard?${params}`, { headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load dashboard");
      setDashboard(data.data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filterProduct, filterFrom, filterTo]);

  const fetchProducts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (filterProduct !== "ALL") params.set("productKey", filterProduct);
      const res = await fetch(`${ADMIN_INVENTORY_BASE}/products?${params}`, { headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load products");
      setProducts(data.data?.rows || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filterProduct]);

  const fetchLedger = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: ledgerPage, limit: 20 });
      if (historyProduct || filterProduct !== "ALL") params.set("productKey", historyProduct || filterProduct);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      if (ledgerMoveType !== "ALL") params.set("movementType", ledgerMoveType);
      const res = await fetch(`${ADMIN_INVENTORY_BASE}/ledger?${params}`, { headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load ledger");
      setLedger(data.data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filterProduct, filterFrom, filterTo, ledgerMoveType, ledgerPage, historyProduct]);

  useEffect(() => {
    if (tab === "dashboard") fetchDashboard();
    else if (tab === "table") fetchProducts();
    else if (tab === "ledger") fetchLedger();
  }, [tab, fetchDashboard, fetchProducts, fetchLedger]);

  const refreshCurrentTab = useCallback(async () => {
    if (tab === "dashboard") await fetchDashboard();
    else if (tab === "table") await fetchProducts();
    else if (tab === "ledger") await fetchLedger();
  }, [tab, fetchDashboard, fetchProducts, fetchLedger]);

  const refresh = () => {
    refreshCurrentTab();
  };

  const refreshInventoryViews = useCallback(async () => {
    window.dispatchEvent(new Event("inventory:refresh"));
    await refreshCurrentTab();
  }, [refreshCurrentTab]);

  return (
    <div style={{ minHeight: "100vh", background: "#F5F9FF", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap');
        @keyframes aiFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes aiSpin { to{transform:rotate(360deg)} }
        
        .ai-glass-card {
            background: rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            border-radius: 14px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .ai-kpi-card {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .ai-kpi-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.06) !important;
        }

        .ai-tab-container {
            display: inline-flex;
            gap: 12px;
            background: rgba(255, 255, 255, 0.4);
            padding: 6px;
            border-radius: 12px;
        }

        .ai-tab { height:40px; padding:0 20px; border-radius:12px; border:1.5px solid transparent; font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; }
        .ai-tab.active { background: linear-gradient(135deg,#2563EB,#1D4ED8); border-color:transparent; color:white; box-shadow: 0 6px 16px rgba(37,99,235,0.3); }
        .ai-tab:not(.active) { background:transparent; color:#334155; }
        .ai-tab:not(.active):hover { color:#1E293B; background:rgba(37,99,235,0.1); }

        .ai-btn { font-family:inherit; font-weight:600; cursor:pointer; transition:transform .2s ease, box-shadow .2s ease, opacity .15s; border:none; display:inline-flex; align-items:center; justify-content:center; }
        .ai-btn:hover { transform:translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .ai-btn:active { transform:scale(.97); }
        .ai-btn:disabled { opacity:.45; cursor:not-allowed; transform:none!important; }

        .ai-filter-inp {
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            padding: 10px 14px;
            font-size: 13px;
            font-family: inherit;
            color: #1E293B;
            background: rgba(255, 255, 255, 0.9);
            outline: none;
            transition: all 0.2s ease;
            box-sizing: border-box;
        }
        .ai-filter-inp:focus {
            border-color: #2563EB;
            box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
        }
        .ai-inp { width:100%;height:42px;border-radius:10px;border:1.5px solid #E2E8F0;padding:0 12px;font-size:13px;font-family:inherit;color:#1E293B;background:#F8FAFC;outline:none;transition:border-color .18s,box-shadow .18s;box-sizing:border-box; }
        .ai-inp:focus { border-color:#06B6D4;box-shadow:0 0 0 3px rgba(6,182,212,.12);background:#fff; }
        .ai-inp.err { border-color:#DC2626; }
        .ai-sel { height:36px;border-radius:9px;border:1.5px solid #E2E8F0;padding:0 10px;font-family:inherit;font-size:13px;font-weight:600;color:#1E293B;background:#F8FAFC;outline:none;cursor:pointer; }
        .ai-sel:focus { border-color:#06B6D4; }
        .ai-row:hover { background:#F5F9FF !important; }
        @keyframes aiModal { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:none} }
        /* Recharts-like simple chart bars */
        .ai-bar { border-radius:4px 4px 0 0;transition:opacity .2s; }
        .ai-bar:hover { opacity:.8; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ background: "#F5F9FF", padding: "20px 32px 0px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", letterSpacing: "-0.01em" }}>Medical Vault — Inventory</div>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500, marginTop: 4 }}>NFC Band & Medical Kit stock management</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="ai-btn" onClick={() => navigate("/admin/orders")}
            style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", color: "#475569", fontSize: 13, display: "flex", gap: 6, alignItems: "center", fontWeight: 600 }}>
            <ShoppingCart size={14} strokeWidth={2.5} /> Orders
          </button>
          <button className="ai-btn" onClick={() => navigate("/admin/dashboard")}
            style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", color: "#475569", fontSize: 13, display: "flex", gap: 6, alignItems: "center", fontWeight: 600 }}>
            <LayoutDashboard size={14} strokeWidth={2.5} /> Dashboard
          </button>
        </div>
      </header>

      {/* ── Tab Bar & Filters Bar Mixed inside Glassmorphism Layout ── */}
      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Top Controls: Tabs & Refresh */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="ai-tab-container">
            {[
              { id: "dashboard", label: <span style={{ display: "flex", alignItems: "center", gap: 6 }}><LayoutDashboard size={14} /> Dashboard</span> },
              { id: "table", label: <span style={{ display: "flex", alignItems: "center", gap: 6 }}><TableIcon size={14} /> Inventory Table</span> },
              { id: "ledger", label: <span style={{ display: "flex", alignItems: "center", gap: 6 }}><ScrollText size={14} /> Stock Ledger</span> },
            ].map(t => (
              <button key={t.id} className={`ai-tab${tab === t.id ? " active" : ""}`} style={{ display: "flex", alignItems: "center" }}
                onClick={() => { setTab(t.id); setHistoryProduct(null); setLedgerPage(1); }}>
                {t.label}
              </button>
            ))}
          </div>

          <button className="ai-btn" onClick={refresh}
            style={{
              background: "linear-gradient(135deg,#06b6d4,#0891b2)",
              color: "white",
              borderRadius: 10,
              padding: "10px 18px",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 6px 16px rgba(6,182,212,0.3)"
            }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {/* Filters Box */}
        <div className="ai-glass-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "rgba(255,255,255,0.5)", backdropFilter: "blur(10px)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginRight: 4 }}>Filters</div>
          <select className="ai-filter-inp" style={{ width: "auto" }} value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
            <option value="ALL">All Products</option>
            {PRODUCTS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <input type="date" className="ai-filter-inp" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ width: 150 }} title="From date" />
          <span style={{ color: "#94A3B8", fontSize: "14px" }}>→</span>
          <input type="date" className="ai-filter-inp" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={{ width: 150 }} title="To date" />
          {tab === "ledger" && (
            <select className="ai-filter-inp" style={{ width: "auto" }} value={ledgerMoveType} onChange={e => { setLedgerMoveType(e.target.value); setLedgerPage(1); }}>
              <option value="ALL">All Types</option>
              {["IN", "OUT", "RETURN", "DAMAGED", "ADJUSTMENT"].map(m => <option key={m}>{m}</option>)}
            </select>
          )}
          <button className="ai-btn" onClick={() => { setFilterProduct("ALL"); setFilterFrom(""); setFilterTo(""); setLedgerMoveType("ALL"); }}
            style={{ height: 40, padding: "0 16px", borderRadius: 10, background: "rgba(255,255,255,0.8)", color: "#1E293B", fontSize: 13, fontWeight: 600, border: "1px solid rgba(226,232,240,0.8)" }}>
            ✕ Clear
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, margin: "16px 24px 0", padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#DC2626", display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#DC2626" }}>✕</button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#64748B", fontSize: 14 }}>
          <div style={{ width: 36, height: 36, border: "3.5px solid #E2E8F0", borderTopColor: "#00A3A0", borderRadius: "50%", animation: "aiSpin 0.8s linear infinite", margin: "0 auto 14px" }} />
          Loading inventory data…
        </div>
      )}

      {/* ── Main Content ── */}
      {!loading && (
        <main style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px 80px", animation: "aiFade .3s ease" }}>
          {tab === "dashboard" && dashboard && <DashboardTab data={dashboard} onRestock={setRestockModal} onAdjust={setAdjustModal} onViewHistory={pk => { setHistoryProduct(pk); setTab("ledger"); }} />}
          {tab === "table" && <TableTab rows={products} onRestock={setRestockModal} onAdjust={setAdjustModal} onReorder={setReorderModal} onHistory={pk => { setHistoryProduct(pk); setTab("ledger"); }} />}
          {tab === "ledger" && ledger && <LedgerTab data={ledger} page={ledgerPage} setPage={setLedgerPage} historyProduct={historyProduct} onClearHistory={() => setHistoryProduct(null)} />}
        </main>
      )}

      {/* ── Modals ── */}
      {restockModal && <RestockModal productKey={restockModal} onClose={() => setRestockModal(null)} onSuccess={refreshInventoryViews} />}
      {adjustModal && <AdjustModal productKey={adjustModal} onClose={() => setAdjustModal(null)} onSuccess={refreshInventoryViews} />}
      {reorderModal && <ReorderModal {...reorderModal} onClose={() => setReorderModal(null)} onSuccess={refreshInventoryViews} />}
    </div>
  );
}

/* ══ DASHBOARD TAB ══ */
function DashboardTab({ data, onRestock, onAdjust, onViewHistory }) {
  const { cards, insights, inventoryRows } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* Low stock alerts */}
      {cards.lowStockAlerts?.length > 0 && (
        <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 14, padding: "14px 18px" }}>
          <div style={{ fontWeight: 800, color: "#92400E", marginBottom: 8, fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}><AlertTriangle size={16} /> Low / Out-of-Stock Alerts</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {cards.lowStockAlerts.map(a => (
              <div key={a.productKey} style={{ background: "white", borderRadius: 10, border: "1.5px solid #FDE68A", padding: "8px 14px", fontSize: 13 }}>
                <span style={{ fontWeight: 800, color: "#0F172A" }}>{a.product}</span>
                <span style={{ margin: "0 8px", color: "#94A3B8" }}>|</span>
                <span style={{ fontWeight: 700, color: a.status === "Out" ? "#DC2626" : "#92400E" }}>{a.availableStock} left</span>
                <span style={{ marginLeft: 8 }}>
                  <StatusBadge status={a.status} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14 }}>
        <KpiCard icon={<Clock size={20} color="#F59E0B" />} label="Pending Orders" value={cards.pendingOrders} color="#F59E0B" />
        <KpiCard icon={<TrendingUp size={20} color="#22C55E" />} label="Units Sold Today" value={cards.unitsSold?.today} color="#22C55E" />
        <KpiCard icon={<Banknote size={20} color="#3B82F6" />} label="Revenue Today" value={`₹${Number(cards.revenue?.today || 0).toLocaleString("en-IN")}`} color="#3B82F6" />
        <KpiCard icon={<Box size={20} color="#F97316" />} label="Stock Days Left" value={insights?.daysOfStockLeft ?? "∞"} color="#F97316" />
        <KpiCard icon={<BarChart3 size={20} color="#8B5CF6" />} label="Avg Daily Sales" value={(insights?.averageDailySales7 || 0).toFixed(0)} color="#8B5CF6" />
        <KpiCard icon={<Boxes size={20} color="#3B82F6" />} label="Products Tracked" value={insights?.productsTracked} color="#3B82F6" />
      </div>

      {/* Per-product stock cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 24 }}>
        {inventoryRows.map(row => {
          const meta = PRODUCTS.find(p => p.key === row.productKey) || PRODUCTS[0];
          return (
            <div key={row.productKey} className="ai-kpi-card" style={{ background: "white", borderRadius: 24, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,.03)", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{meta.icon}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1E293B" }}>{row.product}</div>
                    <code style={{ fontSize: 11, color: "#64748B" }}>{row.sku}</code>
                  </div>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
                {[
                  { label: "TOTAL STOCK", val: row.currentStock },
                  { label: "RESERVED", val: row.reservedStock },
                  { label: "AVAILABLE", val: row.availableStock },
                ].map((s, i) => (
                  <div key={i} style={{ background: "#F8FAFC", borderRadius: 12, padding: "16px", border: "1px solid #F1F5F9", textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", marginTop: 8 }}>{s.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 24, display: "flex", flexDirection: "column", gap: 4 }}>
                <span title="Reorder Level">Reorder Level: <b style={{ color: "#1E293B" }}>{row.reorderLevel}</b></span>
                <span title="Last Restocked">Last Restocked: <b style={{ color: "#1E293B" }}>{fmtShort(row.lastRestocked)}</b></span>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <button className="ai-btn" onClick={() => onRestock(row.productKey)}
                  style={{ flex: 1, height: 42, borderRadius: 99, background: "#22C55E", color: "white", fontSize: 13, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
                  <Plus size={16} strokeWidth={3} /> Restock
                </button>
                <button className="ai-btn" onClick={() => onAdjust(row.productKey)}
                  style={{ flex: 1, height: 42, borderRadius: 99, background: "#6366F1", color: "white", fontSize: 13, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
                  <Settings2 size={16} strokeWidth={2.5} /> Adjust
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sales Trend Chart */}
      {insights?.salesTrend?.length > 0 && <TrendChart trend={insights.salesTrend} />}
    </div>
  );
}

/* ══ TABLE TAB ══ */
function TableTab({ rows, onRestock, onAdjust, onReorder, onHistory }) {
  if (!rows.length) return <EmptyState icon={<ClipboardList size={48} color="#94A3B8" strokeWidth={1} />} title="No inventory data" sub="Stock will appear once products are tracked." />;
  return (
    <div style={{ background: "white", borderRadius: 18, border: "1.5px solid #E2E8F0", overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,.04)" }}>
      {/* Table header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 100px 100px 100px 110px 130px 150px", gap: 0, padding: "12px 20px", background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
        {["Product/SKU", "Unit Price", "Total Stock", "Reserved", "Available", "Reorder Lvl", "Status/Last Restock", "Actions"].map((h, i) => (
          <div key={i} style={{ fontSize: 10, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</div>
        ))}
      </div>
      {rows.map((row, idx) => {
        const meta = PRODUCTS.find(p => p.key === row.productKey) || PRODUCTS[0];
        return (
          <div key={row.productKey} className="ai-row" style={{ display: "grid", gridTemplateColumns: "1fr 110px 100px 100px 100px 110px 130px 150px", gap: 0, padding: "16px 20px", borderBottom: idx < rows.length - 1 ? "1px solid #F1F5F9" : "none", alignItems: "center" }}>
            {/* Product */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{meta.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{row.product}</div>
                <code style={{ fontSize: 11, color: "#94A3B8" }}>{row.sku}</code>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{fmtCurrency(row.unitPrice)}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#0F172A" }}>{row.currentStock}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#64748B" }}>{row.reservedStock}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: row.availableStock <= row.reorderLevel ? "#DC2626" : "#16A34A" }}>{row.availableStock}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{row.reorderLevel}</span>
            </div>
            <div>
              <StatusBadge status={row.status} />
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{fmtShort(row.lastRestocked)}</div>
            </div>
            {/* Actions */}
            <div style={{ display: "flex", gap: 5 }}>
              <button className="ai-btn" onClick={() => onRestock(row.productKey)}
                title="Add stock"
                style={{ height: 32, padding: "0 10px", borderRadius: 8, background: "#DCFCE7", color: "#15803D", fontSize: 12, border: "1px solid #BBF7D0" }}><Plus size={14} strokeWidth={3} /></button>
              <button className="ai-btn" onClick={() => onAdjust(row.productKey)}
                title="Adjust stock"
                style={{ height: 32, padding: "0 10px", borderRadius: 8, background: "#DBEAFE", color: "#1D4ED8", fontSize: 12, border: "1px solid #BFDBFE" }}><Settings2 size={14} strokeWidth={2.5} /></button>
              <button className="ai-btn" onClick={() => onReorder({ productKey: row.productKey, current: row.reorderLevel })}
                title="Reorder level"
                style={{ height: 32, padding: "0 10px", borderRadius: 8, background: "#F3E8FF", color: "#7C3AED", fontSize: 12, border: "1px solid #E9D5FF" }}><Target size={14} strokeWidth={2.5} /></button>
              <button className="ai-btn" onClick={() => onHistory(row.productKey)}
                title="Ledger history"
                style={{ height: 32, padding: "0 10px", borderRadius: 8, background: "#F8FAFC", color: "#64748B", fontSize: 12, border: "1.5px solid #E2E8F0" }}><History size={14} strokeWidth={2.5} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══ LEDGER TAB ══ */
function LedgerTab({ data, page, setPage, historyProduct, onClearHistory }) {
  const { items, pagination } = data;
  const meta = historyProduct ? PRODUCTS.find(p => p.key === historyProduct) : null;
  return (
    <div>
      {historyProduct && meta && (
        <div style={{ background: meta.bg, border: `1.5px solid ${meta.color}30`, borderRadius: 12, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ fontSize: 18 }}>{meta.icon}</span>
          <span style={{ fontWeight: 700, color: "#0F172A" }}>Showing ledger for: {meta.label}</span>
          <button onClick={onClearHistory} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#64748B", fontSize: 13, fontWeight: 600 }}>✕ Show All</button>
        </div>
      )}

      {!items?.length ? (
        <EmptyState icon={<ScrollText size={48} color="#94A3B8" strokeWidth={1} />} title="No ledger entries" sub="Stock movements will appear here once activity is recorded." />
      ) : (
        <div className="ai-glass-card" style={{ overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "110px 120px 90px 80px 100px 1fr 130px 140px", gap: 0, padding: "16px 20px", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            {["Type", "Product", "Qty", "Δ Qty", "Amount", "Reason", "Reference", "Date"].map((h, i) => (
              <div key={i} style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</div>
            ))}
          </div>
          {items.map((entry, idx) => {
            const mtc = MOVE_TYPE_COLOR[entry.movementType] || MOVE_TYPE_COLOR.ADJUSTMENT;
            const sign = entry.signedQuantity >= 0 ? `+${entry.signedQuantity}` : String(entry.signedQuantity);
            return (
              <div key={entry._id || idx} className="ai-row" style={{ display: "grid", gridTemplateColumns: "110px 120px 90px 80px 100px 1fr 130px 140px", gap: 0, padding: "14px 20px", borderBottom: idx < items.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: "rgba(255,255,255,0.4)" }}>
                <div>
                  <span style={{ display: "inline-block", background: mtc.bg, color: mtc.text, fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 99, letterSpacing: ".05em" }}>
                    {mtc.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{entry.product || entry.productKey}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1E293B" }}>{entry.quantity}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: (entry.signedQuantity || 0) >= 0 ? "#16A34A" : "#DC2626" }}>{sign}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{entry.amount ? fmtCurrency(entry.amount) : "—"}</div>
                <div style={{ fontSize: 13, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }} title={entry.reason}>{entry.reason || "—"}</div>
                <div style={{ fontSize: 12, color: "#64748B" }}>
                  {entry.referenceId ? <code style={{ background: "rgba(255,255,255,0.6)", padding: "2px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>{entry.referenceId}</code> : "—"}
                </div>
                <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{fmtDate(entry.happenedAt || entry.createdAt)}</div>
              </div>
            );
          })}
          {/* Pagination */}
          <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.5)", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
              {pagination.totalItems} entries · Page {pagination.page} of {pagination.totalPages}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ai-btn" disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}
                style={{ height: 32, padding: "0 14px", borderRadius: 8, background: pagination.hasPrevPage ? "white" : "#F8FAFC", color: pagination.hasPrevPage ? "#0F172A" : "#CBD5E1", border: "1.5px solid #E2E8F0", fontSize: 12 }}>
                ← Prev
              </button>
              <button className="ai-btn" disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}
                style={{ height: 32, padding: "0 14px", borderRadius: 8, background: pagination.hasNextPage ? "linear-gradient(135deg,#00A3A0,#2563EB)" : "#F8FAFC", color: pagination.hasNextPage ? "white" : "#CBD5E1", border: "none", fontSize: 12 }}>
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ TREND CHART ══ */
function TrendChart({ trend }) {
  const maxUnits = Math.max(...trend.map(t => t.unitsSold), 1);
  const yMax = Math.max(80, Math.ceil(maxUnits / 20) * 20);
  const ticks = [yMax, yMax * 0.75, yMax * 0.5, yMax * 0.25, 0].map(Math.round);

  return (
    <div className="ai-kpi-card" style={{ background: "white", borderRadius: 20, padding: "28px 32px", boxShadow: "0 4px 20px rgba(0,0,0,.04)", marginTop: 8 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>
        Weekly Sales Trend
      </div>
      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 36 }}>
        Units Sold per Week
      </div>

      <div style={{ position: "relative", height: 260 }}>
        {/* Background Grid */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", paddingBottom: 28 }}>
          {ticks.map((val, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 11, color: "#94A3B8", width: 24, textAlign: "right", fontWeight: 500 }}>{val}</div>
              <div style={{ flex: 1, borderTop: "1px dashed #F1F5F9" }}></div>
            </div>
          ))}
        </div>

        {/* Bars */}
        <div style={{ position: "absolute", top: 0, bottom: 28, left: 40, right: 0, display: "flex", alignItems: "flex-end", justifyContent: "space-around" }}>
          {trend.map((t, i) => {
            const barH = Math.max(2, (t.unitsSold / yMax) * 100);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                <div title={`Week of ${t.label}: ${t.unitsSold} units, ₹${Number(t.revenue || 0).toLocaleString("en-IN")}`}
                  className="ai-bar"
                  style={{ width: "32px", height: `${barH}%`, background: "#2563EB", borderRadius: "4px 4px 0 0", cursor: "pointer", transition: "height 0.3s ease" }} />
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div style={{ position: "absolute", bottom: 0, left: 40, right: 0, display: "flex", justifyContent: "space-around" }}>
          {trend.map((t, i) => (
            <div key={i} style={{ fontSize: 11, color: "#64748B", fontWeight: 600, width: "40px", textAlign: "center", whiteSpace: "nowrap" }}>
              {t.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══ SHARED COMPONENTS ══ */
function KpiCard({ icon, label, value, color }) {
  return (
    <div className="ai-kpi-card" style={{ background: "white", borderRadius: 16, padding: "20px 18px", boxShadow: "0 4px 16px rgba(0,0,0,0.03)", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1E293B", lineHeight: 1.2 }}>{value ?? "—"}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#64748B", lineHeight: 1.3, marginTop: 4, maxWidth: 80 }}>
          {label.split(" ").map((w, i) => <React.Fragment key={i}>{w}<br /></React.Fragment>)}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const sc = STATUS_COLOR[status] || STATUS_COLOR["In Stock"];
  return (
    <span style={{ display: "inline-block", background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 99, textTransform: "uppercase", letterSpacing: ".05em" }}>
      {status}
    </span>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "72px 24px", background: "white", borderRadius: 20, border: "1.5px solid #E2E8F0" }}>
      <div style={{ fontSize: 56, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>{sub}</div>
    </div>
  );
}

/* ══ MODAL: RESTOCK ══ */
function RestockModal({ productKey, onClose, onSuccess }) {
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const meta = PRODUCTS.find(p => p.key === productKey);

  async function submit() {
    if (!qty || Number(qty) < 1) { setErr("Quantity must be ≥ 1"); return; }
    if (!reason.trim()) { setErr("Reason is required"); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API_BASE}/restock-product`, {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify({ productKey, restockAmount: Number(qty), reason: reason.trim(), referenceId: ref.trim() || null }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed");
      await onSuccess();
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <InventoryModal icon={<Plus size={18} strokeWidth={3} />} title={`Add Stock - ${meta?.label}`} onClose={onClose}>
      <ModalField label="Quantity to Add *">
        <input className={`ai-inp${err && !qty ? " err" : ""}`} type="number" min="1" placeholder="e.g. 50" value={qty} onChange={e => setQty(e.target.value)} />
      </ModalField>
      <ModalField label="Reason *">
        <input className={`ai-inp${err && !reason ? " err" : ""}`} placeholder="e.g. New stock from supplier" value={reason} onChange={e => setReason(e.target.value)} />
      </ModalField>
      <ModalField label="Reference / Invoice ID (optional)">
        <input className="ai-inp" placeholder="e.g. INV-2024-001" value={ref} onChange={e => setRef(e.target.value)} />
      </ModalField>
      {err && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginTop: -8 }}>⚠️ {err}</div>}
      <button className="ai-btn" disabled={loading} onClick={submit}
        style={{ width: "100%", height: 46, borderRadius: 12, background: "linear-gradient(135deg,#16A34A,#15803D)", color: "white", fontSize: 14, marginTop: 4 }}>
        {loading ? "Adding..." : "Add Stock"}
      </button>
    </InventoryModal>
  );
}

/* ══ MODAL: ADJUST ══ */
function AdjustModal({ productKey, onClose, onSuccess }) {
  const [qty, setQty] = useState("");
  const [sign, setSign] = useState("1");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const meta = PRODUCTS.find(p => p.key === productKey);

  async function submit() {
    if (!qty || Number(qty) < 1) { setErr("Quantity must be ≥ 1"); return; }
    if (!reason.trim()) { setErr("Reason is required"); return; }
    setLoading(true); setErr("");
    const signedQty = Number(sign) >= 0 ? Number(qty) : -Number(qty);
    try {
      const res = await fetch(`${API_BASE}/adjust-stock`, {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify({ productKey, quantity: signedQty, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed");
      await onSuccess();
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <InventoryModal icon={<Settings2 size={18} strokeWidth={2.5} />} title={`Adjust Stock - ${meta?.label}`} onClose={onClose}>
      <ModalField label="Direction">
        <select className="ai-sel" style={{ width: "100%", height: 42 }} value={sign} onChange={e => setSign(e.target.value)}>
          <option value="1">Increase stock</option>
          <option value="-1">Decrease stock</option>
        </select>
      </ModalField>
      <ModalField label="Quantity *">
        <input className="ai-inp" type="number" min="1" placeholder="e.g. 5" value={qty} onChange={e => setQty(e.target.value)} />
      </ModalField>
      <ModalField label="Reason *">
        <input className="ai-inp" placeholder="e.g. Damaged on transit" value={reason} onChange={e => setReason(e.target.value)} />
      </ModalField>
      {err && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginTop: -8 }}>⚠️ {err}</div>}
      <button className="ai-btn" disabled={loading} onClick={submit}
        style={{ width: "100%", height: 46, borderRadius: 12, background: "linear-gradient(135deg,#2563EB,#1D4ED8)", color: "white", fontSize: 14, marginTop: 4 }}>
        {loading ? "Saving..." : "Adjust Stock"}
      </button>
    </InventoryModal>
  );
}

/* ══ MODAL: REORDER LEVEL ══ */
function ReorderModal({ productKey, current, onClose, onSuccess }) {
  const [level, setLevel] = useState(String(current || ""));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const meta = PRODUCTS.find(p => p.key === productKey);

  async function submit() {
    const n = Number(level);
    if (!Number.isFinite(n) || n < 0) { setErr("Level must be 0 or greater"); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${ADMIN_INVENTORY_BASE}/products/${productKey}/reorder-level`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ reorderLevel: n }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed");
      await onSuccess();
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <InventoryModal icon={<Target size={18} strokeWidth={2.5} />} title={`Reorder Level — ${meta?.label}`} onClose={onClose}>
      <ModalField label="Reorder Alert Level">
        <input className="ai-inp" type="number" min="0" placeholder="e.g. 20" value={level} onChange={e => setLevel(e.target.value)} />
      </ModalField>
      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>
        When available stock falls at or below this level, you'll see a⚠️ warning.
      </div>
      {err && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600 }}>⚠️ {err}</div>}
      <button className="ai-btn" disabled={loading} onClick={submit}
        style={{ width: "100%", height: 46, borderRadius: 12, background: "linear-gradient(135deg,#7C3AED,#6D28D9)", color: "white", fontSize: 14, marginTop: 4 }}>
        {loading ? "Saving…" : "✓ Set Level"}
      </button>
    </InventoryModal>
  );
}

/* ══ BASE MODAL WRAPPER ══ */
function InventoryModal({ icon, title, onClose, children }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,.6)", backdropFilter: "blur(7px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "Inter,sans-serif" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "white", borderRadius: 22, boxShadow: "0 32px 80px rgba(15,23,42,.22)", width: "100%", maxWidth: 440, animation: "aiModal .24s cubic-bezier(.22,1,.36,1)", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #F1F5F9", background: "linear-gradient(135deg,#F0FDFA,#F8FAFC)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>{icon} {title}</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalField({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
