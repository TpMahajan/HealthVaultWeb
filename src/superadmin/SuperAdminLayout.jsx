import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  ShieldCheck,
  Megaphone,
  Package,
  Palette,
  AlertTriangle,
  Bell,
  LogOut,
  HeartPulse,
} from "lucide-react";

import { clearSuperAdminSession, getSuperAdminUser } from "./api";

const menuItems = [
  {
    to: "/superadmin",
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true,
  },
  { to: "/superadmin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/superadmin/users", label: "Users", icon: Users },
  { to: "/superadmin/admins", label: "Admins", icon: ShieldCheck },
  { to: "/superadmin/ads", label: "Advertisements", icon: Megaphone },
  { to: "/superadmin/products", label: "Products", icon: Package },
  { to: "/superadmin/ui-config", label: "UI Config", icon: Palette },
  { to: "/superadmin/alerts", label: "Alerts", icon: AlertTriangle },
  { to: "/superadmin/notifications", label: "Notifications", icon: Bell },
];

const linkClassName = ({ isActive }) =>
  [
    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
    isActive
      ? "bg-cyan-600 text-white shadow-sm"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");

const SuperAdminLayout = () => {
  const navigate = useNavigate();
  const superAdminUser = getSuperAdminUser();

  const handleLogout = () => {
    clearSuperAdminSession();
    navigate("/superadmin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1700px]">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white p-5 lg:block">
          <div className="rounded-2xl bg-gradient-to-br from-cyan-700 to-cyan-500 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/20">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-cyan-100">
                  Medical Vault
                </p>
                <h1 className="text-lg font-semibold">SuperAdmin Panel</h1>
              </div>
            </div>
          </div>

          <nav className="mt-6 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={linkClassName}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Signed in as</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-800">
              {superAdminUser?.email || "superadmin"}
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <header className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Medical Vault SuperAdmin
                </h2>
                <p className="text-sm text-slate-600">
                  Centralized control for users, ads, products, and UI config.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 lg:hidden"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
