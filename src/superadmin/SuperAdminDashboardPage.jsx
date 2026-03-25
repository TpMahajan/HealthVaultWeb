import React, { useEffect, useMemo, useState } from "react";
import { Activity, Megaphone, Package, ShieldCheck, UserRound } from "lucide-react";

import { fetchActivities, fetchDashboardStats } from "./api";
import { ErrorBanner, InlineLoader, Panel, formatDateTime } from "./ui";

const statDefinitions = [
  {
    key: "totalUsers",
    label: "Total Users",
    icon: UserRound,
    color: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
  {
    key: "doctors",
    label: "Doctors",
    icon: ShieldCheck,
    color: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    key: "patients",
    label: "Patients",
    icon: UserRound,
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    key: "activeAds",
    label: "Active Ads",
    icon: Megaphone,
    color: "bg-amber-50 text-amber-700 border-amber-100",
  },
  {
    key: "products",
    label: "Products",
    icon: Package,
    color: "bg-violet-50 text-violet-700 border-violet-100",
  },
];

const SuperAdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [statsResponse, activityResponse] = await Promise.all([
        fetchDashboardStats(),
        fetchActivities(25),
      ]);
      setStats(statsResponse?.stats || {});
      setActivities(activityResponse?.activities || statsResponse?.recentActivity || []);
    } catch (err) {
      setError(err.message || "Failed to load dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const cards = useMemo(
    () =>
      statDefinitions.map((item) => ({
        ...item,
        value: Number(stats?.[item.key] || 0),
      })),
    [stats]
  );

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {isLoading ? "--" : card.value.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${card.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Panel
        title="Recent Activity"
        subtitle="Latest SuperAdmin actions across users, ads, products and config changes."
        action={
          <button
            type="button"
            onClick={loadDashboard}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Refresh
          </button>
        }
      >
        {isLoading ? (
          <InlineLoader label="Loading activity feed..." />
        ) : activities.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No activity found yet.
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((entry) => (
              <div
                key={entry._id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600">
                      <Activity className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {entry.action || "Activity"}
                      </p>
                      <p className="text-xs text-slate-600">
                        {entry.targetType || "SYSTEM"} {entry.targetId ? `· ${entry.targetId}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(entry.createdAt)}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Actor: {entry.actorEmail || "system"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

export default SuperAdminDashboardPage;
