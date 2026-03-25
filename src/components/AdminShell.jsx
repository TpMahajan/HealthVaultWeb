import React, { useMemo } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { AlertCircle, Box, LifeBuoy, LogOut, Package, Shield, Lock } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { ADMIN_PERMISSIONS, canAccessAny } from "../admin/rbac";

const ALL_MENU_ITEMS = [
  {
    key: "products",
    label: "Products",
    path: "/admin/inventory",
    icon: Box,
    permissions: [ADMIN_PERMISSIONS.MANAGE_PRODUCTS],
  },
  {
    key: "orders",
    label: "Orders",
    path: "/admin/orders",
    icon: Package,
    permissions: [ADMIN_PERMISSIONS.MANAGE_ORDERS],
  },
  {
    key: "sos",
    label: "SOS Requests",
    path: "/admin/sos",
    icon: AlertCircle,
    permissions: [ADMIN_PERMISSIONS.VIEW_SOS, ADMIN_PERMISSIONS.HANDLE_SOS],
  },
  {
    key: "lost-found",
    label: "Lost & Found",
    path: "/admin/lost-found",
    icon: Shield,
    permissions: [ADMIN_PERMISSIONS.VIEW_SOS, ADMIN_PERMISSIONS.HANDLE_SOS],
  },
  {
    key: "support",
    label: "Support Tickets",
    path: "/admin/support",
    icon: LifeBuoy,
    permissions: [ADMIN_PERMISSIONS.VIEW_TICKETS, ADMIN_PERMISSIONS.REPLY_TICKETS],
  },
  {
    key: "security",
    label: "Security Panel",
    path: "/admin/security",
    icon: Lock,
    permissions: [ADMIN_PERMISSIONS.VIEW_AUDIT_LOGS, ADMIN_PERMISSIONS.VIEW_SECURITY_ALERTS],
  },
];

const AdminShell = () => {
  const navigate = useNavigate();
  const { admin, logoutAdmin } = useAdminAuth();

  const menuItems = useMemo(
    () => ALL_MENU_ITEMS.filter((item) => canAccessAny(admin, item.permissions)),
    [admin]
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-72 border-r border-slate-200 bg-white px-4 py-6">
        <div className="px-2 mb-6">
          <h1 className="text-lg font-extrabold text-slate-900">Admin Console</h1>
          <p className="text-xs text-slate-500 mt-1">
            {admin?.name || "Admin"} • {admin?.role || "ADMIN"}
          </p>
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.key}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                    isActive
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => {
            logoutAdmin();
            navigate("/admin/login");
          }}
          className="mt-8 w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          <LogOut size={15} />
          Logout
        </button>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminShell;
