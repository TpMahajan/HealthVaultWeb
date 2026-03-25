import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../constants/api";

const PAGE_SIZE = 10;

const Pager = ({ page, totalPages, onPage }) => (
  <div className="mt-3 flex items-center justify-between">
    <p className="text-xs text-slate-500">
      Page {page} of {totalPages}
    </p>
    <div className="flex gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
      >
        Prev
      </button>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  </div>
);

const AdminSecurityPanel = () => {
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [alertPage, setAlertPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [alertTotalPages, setAlertTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({
    activeSessions: 0,
    alerts: 0,
    unresolvedAlerts: 0,
    failedLogins24h: 0,
    severity: {},
  });
  const [filters, setFilters] = useState({
    action: "",
    role: "",
    userId: "",
    source: "",
    from: "",
    to: "",
  });

  const token = useMemo(() => localStorage.getItem("adminToken") || "", []);

  const loadLogs = async (page = logPage) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    Object.entries(filters).forEach(([k, v]) => {
      if (String(v || "").trim()) params.set(k, String(v).trim());
    });
    const res = await fetch(`${API_BASE}/admin/audit-logs?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || "Failed to load audit logs");
    }
    setLogs(Array.isArray(data.items) ? data.items : []);
    setLogTotalPages(Math.max(1, data?.pagination?.totalPages || 1));
  };

  const loadAlerts = async (page = alertPage) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    const res = await fetch(`${API_BASE}/admin/alerts?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || "Failed to load security alerts");
    }
    setAlerts(Array.isArray(data.items) ? data.items : []);
    setAlertTotalPages(Math.max(1, data?.pagination?.totalPages || 1));
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const summaryRes = await fetch(`${API_BASE}/admin/security-summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const summaryData = await summaryRes.json().catch(() => ({}));
      if (summaryRes.ok && summaryData?.success && summaryData?.summary) {
        setSummary(summaryData.summary);
      }
      await Promise.all([loadLogs(logPage), loadAlerts(alertPage)]);
    } catch (err) {
      setError(err.message || "Failed to load security data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLogs(logPage).catch((err) => setError(err.message || "Failed to load logs"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logPage]);

  useEffect(() => {
    loadAlerts(alertPage).catch((err) => setError(err.message || "Failed to load alerts"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertPage]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Security Panel</h2>
        <p className="text-sm text-slate-500 mt-1">Audit logs and security alerts</p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Active sessions</p>
          <p className="text-xl font-extrabold text-slate-900">{summary.activeSessions || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Total alerts</p>
          <p className="text-xl font-extrabold text-slate-900">{summary.alerts || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Unresolved alerts</p>
          <p className="text-xl font-extrabold text-amber-600">{summary.unresolvedAlerts || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Failed logins (24h)</p>
          <p className="text-xl font-extrabold text-rose-600">{summary.failedLogins24h || 0}</p>
        </div>
      </section>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-2">
          <input className="h-9 rounded-md border border-slate-200 px-3 text-sm" placeholder="Action" value={filters.action} onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))} />
          <input className="h-9 rounded-md border border-slate-200 px-3 text-sm" placeholder="Role" value={filters.role} onChange={(e) => setFilters((p) => ({ ...p, role: e.target.value }))} />
          <input className="h-9 rounded-md border border-slate-200 px-3 text-sm" placeholder="User ID" value={filters.userId} onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value }))} />
          <select className="h-9 rounded-md border border-slate-200 px-3 text-sm" value={filters.source} onChange={(e) => setFilters((p) => ({ ...p, source: e.target.value }))}>
            <option value="">All Sources</option>
            <option value="web">Web Logs</option>
            <option value="app">App Logs</option>
          </select>
          <input type="date" className="h-9 rounded-md border border-slate-200 px-3 text-sm" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} />
          <input type="date" className="h-9 rounded-md border border-slate-200 px-3 text-sm" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} />
          <button type="button" onClick={() => { setLogPage(1); loadLogs(1).catch((err) => setError(err.message)); }} className="h-9 rounded-md bg-teal-600 px-3 text-sm font-semibold text-white">Apply</button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Audit Logs</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-600">
                <th className="p-2">Time</th><th className="p-2">Source</th><th className="p-2">Actor</th><th className="p-2">Role</th><th className="p-2">Action</th><th className="p-2">Resource</th><th className="p-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row._id} className="border-t border-slate-100">
                  <td className="p-2">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="p-2">{row.source || "-"}</td>
                  <td className="p-2">{row.actorId || "-"}</td>
                  <td className="p-2">{row.actorRole || "-"}</td>
                  <td className="p-2">{row.action || "-"}</td>
                  <td className="p-2">{row.resourceType || "-"}</td>
                  <td className="p-2">{row.ipAddress || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={logPage} totalPages={logTotalPages} onPage={setLogPage} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Security Alerts</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-600">
                <th className="p-2">Time</th><th className="p-2">Type</th><th className="p-2">Severity</th><th className="p-2">Actor</th><th className="p-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((row) => (
                <tr key={row._id} className="border-t border-slate-100">
                  <td className="p-2">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="p-2">{row.type}</td>
                  <td className="p-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      row.severity === "HIGH"
                        ? "bg-rose-100 text-rose-700"
                        : row.severity === "MEDIUM"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-700"
                    }`}>
                      {row.severity}
                    </span>
                  </td>
                  <td className="p-2">{row.actorEmail || row.ipAddress || "-"}</td>
                  <td className="p-2">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex gap-2 text-[10px] font-semibold text-slate-600">
          <span className="rounded bg-slate-100 px-2 py-1">LOW: {summary?.severity?.LOW || 0}</span>
          <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">MEDIUM: {summary?.severity?.MEDIUM || 0}</span>
          <span className="rounded bg-rose-100 px-2 py-1 text-rose-700">HIGH: {summary?.severity?.HIGH || 0}</span>
        </div>
        <Pager page={alertPage} totalPages={alertTotalPages} onPage={setAlertPage} />
      </section>

      {loading ? <p className="text-xs text-slate-500">Refreshing security data...</p> : null}
    </div>
  );
};

export default AdminSecurityPanel;

