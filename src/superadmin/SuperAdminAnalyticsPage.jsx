import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  CalendarCheck2,
  ChartNoAxesCombined,
  FileStack,
  Megaphone,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShoppingCart,
  Users,
} from "lucide-react";

import { fetchSuperAdminAnalytics } from "./api";
import { ErrorBanner, InlineLoader, Panel, formatDateTime } from "./ui";

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

const currencyNumber = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatValue = (value, format = "number") => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return "0";
  if (format === "currency") return currencyNumber.format(parsed);
  if (Math.abs(parsed) >= 1000) return compactNumber.format(parsed);
  return parsed.toLocaleString();
};

const trendLabel = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  return raw.slice(5);
};

const toneStyles = {
  cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  violet: "border-violet-100 bg-violet-50 text-violet-700",
  rose: "border-rose-100 bg-rose-50 text-rose-700",
};

const KpiCard = ({ title, value, helper, icon: Icon, tone = "cyan", format = "number" }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{formatValue(value, format)}</p>
        {helper ? <p className="mt-1 text-xs text-slate-600">{helper}</p> : null}
      </div>
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${toneStyles[tone] || toneStyles.cyan}`}
      >
        <Icon className="h-4 w-4" />
      </span>
    </div>
  </article>
);

const MiniTrendChart = ({ title, subtitle, data, valueKey = "value" }) => {
  const preparedData = Array.isArray(data) ? data : [];
  const maxValue = preparedData.reduce(
    (max, row) => Math.max(max, Number(row?.[valueKey] || 0)),
    0
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>
      {preparedData.length === 0 ? (
        <p className="mt-4 text-xs text-slate-500">No trend data available.</p>
      ) : (
        <div className="mt-4 grid grid-cols-7 gap-2">
          {preparedData.map((entry, index) => {
            const value = Number(entry?.[valueKey] || 0);
            const ratio = maxValue > 0 ? value / maxValue : 0;
            return (
              <div key={`${title}-${index}`} className="flex flex-col items-center gap-1">
                <div className="flex h-20 w-full items-end justify-center rounded-md bg-white px-1 py-1">
                  <div
                    className="w-full rounded-sm bg-cyan-500"
                    style={{ minHeight: value > 0 ? "6px" : "2px", height: `${Math.max(4, ratio * 100)}%` }}
                    title={`${value}`}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-500">{trendLabel(entry?.date)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const HorizontalBreakdown = ({ title, subtitle, rows, keyLabel = "label", valueLabel = "value" }) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const maxValue = safeRows.reduce(
    (max, row) => Math.max(max, Number(row?.[valueLabel] || 0)),
    0
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>
      {safeRows.length === 0 ? (
        <p className="mt-4 text-xs text-slate-500">No records available.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {safeRows.map((row, index) => {
            const count = Number(row?.[valueLabel] || 0);
            const width = maxValue > 0 ? (count / maxValue) * 100 : 0;
            return (
              <div key={`${title}-${index}`}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-700">
                  <span className="font-medium">{String(row?.[keyLabel] || "Unknown")}</span>
                  <span>{count.toLocaleString()}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(4, width)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SuperAdminAnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
      setError("");
    }

    try {
      const response = await fetchSuperAdminAnalytics();
      setAnalytics(response || null);
    } catch (err) {
      if (!silent) {
        setError(err.message || "Failed to load analytics.");
      }
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const intervalSeconds = Math.max(
      8,
      Number(analytics?.refreshIntervalSeconds || 15)
    );
    const timer = window.setInterval(() => {
      loadAnalytics({ silent: true });
    }, intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, analytics?.refreshIntervalSeconds, loadAnalytics]);

  const kpiCards = useMemo(() => {
    const kpis = analytics?.kpis || {};
    return [
      {
        title: "Total Users",
        value: kpis.users?.total,
        helper: `${kpis.users?.newLast24h || 0} new in 24h`,
        icon: Users,
        tone: "cyan",
      },
      {
        title: "Active Users",
        value: kpis.users?.active,
        helper: `${kpis.users?.blocked || 0} blocked`,
        icon: ShieldAlert,
        tone: "blue",
      },
      {
        title: "Appointments Upcoming",
        value: kpis.clinical?.appointmentsUpcoming,
        helper: `${kpis.clinical?.appointmentsCompletedLast7d || 0} completed this week`,
        icon: CalendarCheck2,
        tone: "emerald",
      },
      {
        title: "Live Sessions",
        value: kpis.clinical?.sessionsActive,
        helper: `${kpis.clinical?.sessionsAcceptedLast7d || 0} accepted in 7d`,
        icon: Activity,
        tone: "amber",
      },
      {
        title: "Documents",
        value: kpis.clinical?.documentsTotal,
        helper: `${kpis.clinical?.documentsUploadedLast7d || 0} uploaded in 7d`,
        icon: FileStack,
        tone: "violet",
      },
      {
        title: "Active Alerts",
        value: kpis.communications?.activeAlerts,
        helper: `${kpis.communications?.alertsPublishedLast24h || 0} published in 24h`,
        icon: Radio,
        tone: "rose",
      },
      {
        title: "Notifications (24h)",
        value: kpis.communications?.notificationsSentLast24h,
        helper: `${kpis.communications?.notificationReadRateLast7d || 0}% read rate in 7d`,
        icon: Bell,
        tone: "cyan",
      },
      {
        title: "Ad Clicks (7d)",
        value: kpis.commerce?.adClicksLast7d,
        helper: `${kpis.commerce?.adsActive || 0} active ads`,
        icon: Megaphone,
        tone: "amber",
      },
      {
        title: "Gross Sales",
        value: kpis.commerce?.grossSales,
        helper: `${kpis.commerce?.ordersCompleted || 0} completed orders`,
        icon: ShoppingCart,
        tone: "emerald",
        format: "currency",
      },
      {
        title: "Open SOS",
        value: kpis.safety?.sosOpen,
        helper: `${kpis.safety?.sosRaisedLast24h || 0} raised in 24h`,
        icon: ShieldAlert,
        tone: "rose",
      },
    ];
  }, [analytics]);

  const trendSeries = analytics?.trends || {};
  const breakdowns = analytics?.breakdowns || {};
  const top = analytics?.top || {};

  const generatedAtLabel = formatDateTime(analytics?.generatedAt);

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      <Panel
        title="System Analytics"
        subtitle="Live operational analytics across users, clinical workflows, communication, commerce and safety signals."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh((prev) => !prev)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                autoRefresh
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              Auto Refresh {autoRefresh ? "On" : "Off"}
            </button>
            <button
              type="button"
              onClick={() => loadAnalytics({ silent: false })}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <span>Last generated: {generatedAtLabel}</span>
          <span>
            Refresh interval: {Math.max(8, Number(analytics?.refreshIntervalSeconds || 15))}s
          </span>
        </div>
      </Panel>

      {isLoading ? (
        <InlineLoader label="Loading system analytics..." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {kpiCards.map((card) => (
              <KpiCard key={card.title} {...card} />
            ))}
          </section>

          <Panel
            title="Trend Radar"
            subtitle="Seven-day trend snapshots for growth, communication and safety."
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MiniTrendChart
                title="New Registrations"
                subtitle="Patients + doctors + admins"
                data={trendSeries.registrationsLast7Days?.map((item) => ({
                  date: item.date,
                  value: item.total,
                }))}
              />
              <MiniTrendChart
                title="Notifications Sent"
                subtitle="SuperAdmin broadcasts"
                data={trendSeries.notificationsLast7Days?.map((item) => ({
                  date: item.date,
                  value: item.sent,
                }))}
              />
              <MiniTrendChart
                title="Ad Clicks"
                subtitle="Cross-platform clicks"
                data={trendSeries.adClicksLast7Days?.map((item) => ({
                  date: item.date,
                  value: item.clicks,
                }))}
              />
              <MiniTrendChart
                title="SOS Volume"
                subtitle="Open + resolved"
                data={trendSeries.sosLast7Days?.map((item) => ({
                  date: item.date,
                  value: item.total,
                }))}
              />
            </div>
          </Panel>

          <Panel
            title="Real-Time Notification Pulse"
            subtitle="Last 24-hour outbound and read trend for SuperAdmin notifications."
          >
            {Array.isArray(trendSeries.notificationsLast24Hours) && trendSeries.notificationsLast24Hours.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                {trendSeries.notificationsLast24Hours.map((entry, index) => {
                  const sent = Number(entry?.sent || 0);
                  const read = Number(entry?.read || 0);
                  return (
                    <div key={`hour-${index}`} className="rounded-lg border border-slate-200 bg-white p-2">
                      <p className="text-[10px] font-semibold uppercase text-slate-500">
                        {String(entry?.hour || "").slice(11, 16)}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{sent.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-600">Read: {read.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No hourly notification data found.</p>
            )}
          </Panel>

          <Panel
            title="Operational Breakdowns"
            subtitle="Current distribution of statuses and channels."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <HorizontalBreakdown
                title="Appointment Status"
                subtitle="All-time status split"
                rows={(breakdowns.appointmentStatus || []).map((row) => ({
                  label: row.status,
                  value: row.count,
                }))}
              />
              <HorizontalBreakdown
                title="Session Status"
                subtitle="Pending to ended"
                rows={(breakdowns.sessionStatus || []).map((row) => ({
                  label: row.status,
                  value: row.count,
                }))}
              />
              <HorizontalBreakdown
                title="Notification Recipient Role"
                subtitle="Last 7 days"
                rows={(breakdowns.notificationsByRole || []).map((row) => ({
                  label: `${row.role} (${row.readRate || 0}% read)`,
                  value: row.total,
                }))}
              />
              <HorizontalBreakdown
                title="Ad Click Platform"
                subtitle="Last 7 days"
                rows={(breakdowns.adClicksByPlatform || []).map((row) => ({
                  label: row.platform,
                  value: row.count,
                }))}
              />
              <HorizontalBreakdown
                title="Ad Click Surface"
                subtitle="Last 7 days"
                rows={(breakdowns.adClicksBySurface || []).map((row) => ({
                  label: row.surface,
                  value: row.count,
                }))}
              />
              <HorizontalBreakdown
                title="Alert Audience Mix"
                subtitle="Configured alert history"
                rows={(breakdowns.alertsByAudience || []).map((row) => ({
                  label: row.audience,
                  value: row.count,
                }))}
              />
            </div>
          </Panel>

          <Panel
            title="Top Movers"
            subtitle="Highest performing ad campaigns and most frequent admin actions in the last 30 days."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-900">Top Advertisements (7d Clicks)</h4>
                {Array.isArray(top.advertisements) && top.advertisements.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {top.advertisements.map((entry, index) => (
                      <div key={`ad-${entry.advertisementId || index}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {entry.placement} | Clicks: {Number(entry.clicks || 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">No advertisement clicks captured yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-900">Action Mix (30d)</h4>
                {Array.isArray(top.activityActions) && top.activityActions.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {top.activityActions.map((entry, index) => (
                      <div key={`action-${entry.action || index}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <span className="text-xs font-semibold text-slate-700">{entry.action}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          <ChartNoAxesCombined className="h-3 w-3" />
                          {Number(entry.count || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">No admin activity logs available.</p>
                )}
              </div>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
};

export default SuperAdminAnalyticsPage;
