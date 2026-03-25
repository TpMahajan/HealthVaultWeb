import React, { useEffect, useState } from "react";

import {
  ALERT_AUDIENCES,
  ALERT_PLATFORMS,
  broadcastAlert,
  fetchAlerts,
} from "./api";
import { ErrorBanner, InlineLoader, Panel, formatDateTime } from "./ui";

const PRIORITIES = ["HIGH", "MEDIUM", "LOW"];

const defaultForm = {
  title: "Critical Alert",
  message: "",
  audience: "ALL",
  platforms: ["APP", "WEB"],
  durationMinutes: 2,
  priority: "HIGH",
  highlight: true,
};

const SuperAdminAlertsPage = () => {
  const [form, setForm] = useState(defaultForm);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [historyMode, setHistoryMode] = useState("ACTIVE");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAlerts = async () => {
    setIsLoading(true);
    setError("");
    try {
      const includeExpired = historyMode === "HISTORY";
      const response = await fetchAlerts(includeExpired, includeExpired ? 120 : 80);
      setAlerts(Array.isArray(response?.alerts) ? response.alerts : []);
    } catch (err) {
      setError(err.message || "Failed to load alerts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [historyMode]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSending(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        audience: form.audience,
        platforms: Array.isArray(form.platforms)
          ? form.platforms.filter((entry) => ALERT_PLATFORMS.includes(entry))
          : [],
        durationMinutes: Number(form.durationMinutes || 2),
        priority: form.priority,
        highlight: Boolean(form.highlight),
      };

      if (!payload.message) {
        throw new Error("Message is required.");
      }
      if (!payload.platforms || payload.platforms.length === 0) {
        throw new Error("Select at least one platform.");
      }

      const response = await broadcastAlert(payload);
      setSuccess(response?.message || "Alert published successfully.");
      setForm((prev) => ({ ...prev, message: "" }));
      await loadAlerts();
    } catch (err) {
      setError(err.message || "Failed to send alert.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel
        title="Alerts"
        subtitle="Publish time-bound dashboard alerts for app/web users."
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Title
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Duration (minutes)
              </span>
              <input
                type="number"
                min={1}
                max={120}
                value={form.durationMinutes}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    durationMinutes: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Audience
              </span>
              <select
                value={form.audience}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, audience: event.target.value }))
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500"
              >
                {ALERT_AUDIENCES.map((audience) => (
                  <option key={audience} value={audience}>
                    {audience}
                  </option>
                ))}
              </select>
            </label>

            <div className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Platform Targets
              </span>
              <div className="rounded-lg border border-slate-300 p-3">
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => {
                        const current = Array.isArray(prev.platforms)
                          ? prev.platforms
                          : [];
                        const allSelected = ALERT_PLATFORMS.every((platform) =>
                          current.includes(platform)
                        );
                        return {
                          ...prev,
                          platforms: allSelected ? [] : [...ALERT_PLATFORMS],
                        };
                      })
                    }
                    className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Toggle All
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ALERT_PLATFORMS.map((platform) => {
                    const selected =
                      Array.isArray(form.platforms) &&
                      form.platforms.includes(platform);
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() =>
                          setForm((prev) => {
                            const current = Array.isArray(prev.platforms)
                              ? prev.platforms
                              : [];
                            const next = current.includes(platform)
                              ? current.filter((item) => item !== platform)
                              : [...current, platform];
                            return {
                              ...prev,
                              platforms: next,
                            };
                          })
                        }
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          selected
                            ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {platform}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Priority
              </span>
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, priority: event.target.value }))
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Alert Message
            </span>
            <textarea
              value={form.message}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, message: event.target.value }))
              }
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              placeholder="Type the alert users should see..."
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.highlight}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, highlight: event.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            Highlight in dashboard ticker
          </label>

          <ErrorBanner message={error} />
          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSending}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? "Publishing..." : "Publish Alert"}
            </button>
          </div>
        </form>
      </Panel>

      <Panel
        title={historyMode === "HISTORY" ? "Alert History" : "Active Alerts"}
        subtitle={
          historyMode === "HISTORY"
            ? "Showing active + expired alerts published from SuperAdmin."
            : "Showing currently active alerts across app and web."
        }
        action={
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
            <button
              type="button"
              onClick={() => setHistoryMode("ACTIVE")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                historyMode === "ACTIVE"
                  ? "bg-cyan-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setHistoryMode("HISTORY")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                historyMode === "HISTORY"
                  ? "bg-cyan-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              History
            </button>
          </div>
        }
      >
        {isLoading ? (
          <InlineLoader label="Loading alerts..." />
        ) : alerts.length === 0 ? (
          <p className="text-sm text-slate-600">No alerts found.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, index) => {
              const now = Date.now();
              const endTime = new Date(alert.endAt || 0).getTime();
              const isExpired =
                Number.isFinite(endTime) && endTime > 0 ? endTime < now : false;
              return (
                <div
                  key={alert.id || index}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">
                      {alert.title || "System Alert"}
                    </h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isExpired
                          ? "bg-slate-100 text-slate-600"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {isExpired ? "Expired" : "Active"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {alert.audience || "ALL"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {Array.isArray(alert.platforms) && alert.platforms.length > 0
                        ? alert.platforms.join(", ")
                        : alert.platform || "ALL"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {alert.priority || "HIGH"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{alert.message}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Start: {formatDateTime(alert.startAt)} | End:{" "}
                    {formatDateTime(alert.endAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};

export default SuperAdminAlertsPage;
