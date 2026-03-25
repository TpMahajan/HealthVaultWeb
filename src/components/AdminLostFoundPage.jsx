import React, { useEffect, useState } from "react";
import { API_BASE } from "../constants/api";

const AdminLostFoundPage = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        const res = await fetch(`${API_BASE}/admin/lost-found/summary`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          setError(data?.message || "Failed to load lost and found data");
          return;
        }
        setSummary(data?.summary || data);
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-extrabold text-slate-900">Lost & Found</h2>
      <p className="text-sm text-slate-500 mt-1">SOS-linked matching and resolution queue</p>
      {loading ? <p className="mt-6 text-slate-600">Loading...</p> : null}
      {error ? <p className="mt-6 text-red-600">{error}</p> : null}
      {!loading && !error ? (
        <pre className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 overflow-auto">
          {JSON.stringify(summary || {}, null, 2)}
        </pre>
      ) : null}
    </div>
  );
};

export default AdminLostFoundPage;
