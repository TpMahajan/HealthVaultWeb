import React, { useEffect, useMemo, useState } from "react";

import {
  ALERT_AUDIENCES,
  ALERT_PLATFORM_OPTIONS,
  broadcastSuperAdminNotification,
  fetchSuperAdminNotifications,
} from "./api";
import { ErrorBanner, InlineLoader, Panel, formatDateTime } from "./ui";

const PRIORITIES = ["HIGH", "MEDIUM", "LOW"];

const defaultForm = {
  title: "System Notification",
  message: "",
  audience: "ALL",
  platform: "ALL",
  priority: "HIGH",
  deepLink: "",
};

const SuperAdminNotificationsPage = () => {
  const [form, setForm] = useState(defaultForm);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [historyWindow, setHistoryWindow] = useState("24H");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stats, setStats] = useState(null);

  const loadNotifications = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetchSuperAdminNotifications(200);
      setNotifications(
        Array.isArray(response?.notifications) ? response.notifications : []
      );
    } catch (err) {
      setError(err.message || "Failed to load notifications.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    const now = Date.now();
    const windowStart =
      historyWindow === "24H"
        ? now - 24 * 60 * 60 * 1000
        : historyWindow === "7D"
          ? now - 7 * 24 * 60 * 60 * 1000
          : null;

    if (!windowStart) return notifications;

    return notifications.filter((entry) => {
      const createdAt = new Date(entry?.createdAt || 0).getTime();
      if (!Number.isFinite(createdAt)) return false;
      return createdAt >= windowStart;
    });
  }, [historyWindow, notifications]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSending(true);
    setError("");
    setSuccess("");
    setStats(null);

    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        audience: form.audience,
        platform: form.platform,
        priority: form.priority,
        deepLink: form.deepLink.trim(),
      };

      if (!payload.message) {
        throw new Error("Message is required.");
      }

      const response = await broadcastSuperAdminNotification(payload);
      setSuccess(response?.message || "Notification sent successfully.");
      setStats(response?.stats || null);
      setForm((prev) => ({ ...prev, message: "" }));
      await loadNotifications();
    } catch (err) {
      setError(err.message || "Failed to send notification.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel
        title="Notifications"
        subtitle="Broadcast app and web notifications without changing dashboard alert ticker state."
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

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Platform
              </span>
              <select
                value={form.platform}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, platform: event.target.value }))
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500"
              >
                {ALERT_PLATFORM_OPTIONS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Deep Link (optional)
              </span>
              <input
                type="text"
                value={form.deepLink}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, deepLink: event.target.value }))
                }
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
                placeholder="healthvault://path or https://..."
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Notification Message
            </span>
            <textarea
              value={form.message}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, message: event.target.value }))
              }
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              placeholder="Type the notification users should receive..."
            />
          </label>

          <ErrorBanner message={error} />
          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}
          {stats ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
              Recipients: {stats.recipients || 0} | Notifications: {" "}
              {stats.notificationsCreated || 0} | Push success: {" "}
              {stats.pushSuccess || 0} | Push failed: {stats.pushFailed || 0}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSending}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? "Sending..." : "Send Notification"}
            </button>
          </div>
        </form>
      </Panel>

      <Panel
        title="Notification History"
        subtitle={
          historyWindow === "24H"
            ? "Showing broadcasts from the last 24 hours."
            : historyWindow === "7D"
              ? "Showing broadcasts from the last 7 days."
              : "Showing all available notification broadcasts."
        }
        action={
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
            {[
              { key: "24H", label: "24h" },
              { key: "7D", label: "7d" },
              { key: "ALL", label: "All" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setHistoryWindow(option.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  historyWindow === option.key
                    ? "bg-cyan-600 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      >
        {isLoading ? (
          <InlineLoader label="Loading notifications..." />
        ) : filteredNotifications.length === 0 ? (
          <p className="text-sm text-slate-600">No notifications found.</p>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification, index) => (
              <div
                key={notification.id || index}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900">
                    {notification.title || "System Notification"}
                  </h4>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {notification.audience || "ALL"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {notification.platform || "ALL"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {notification.priority || "HIGH"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{notification.message}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Sent at: {formatDateTime(notification.createdAt)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Recipients: {notification.stats?.recipients || 0} | Read: {" "}
                  {notification.stats?.readCount || 0} | Unread: {" "}
                  {notification.stats?.unreadCount || 0}
                </p>
                {notification.deepLink ? (
                  <p className="mt-1 truncate text-xs text-cyan-700">
                    Deep Link: {notification.deepLink}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  Sender: {notification.senderId || "superadmin"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

export default SuperAdminNotificationsPage;
