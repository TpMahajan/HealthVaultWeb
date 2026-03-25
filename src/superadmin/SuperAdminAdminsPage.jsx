import React, { useEffect, useState } from "react";

import {
  PERMISSIONS,
  createAdmin,
  fetchSecurityAuditLogs,
  fetchAdmins,
  updateAdminPermissions,
  updateAdminStatus,
} from "./api";
import {
  ErrorBanner,
  InlineLoader,
  Panel,
  StatusBadge,
  Table,
  formatDateTime,
} from "./ui";

const createInitialAdminForm = () => ({
  name: "",
  email: "",
  password: "",
  role: "PRODUCT_ADMIN",
  permissions: ["MANAGE_PRODUCTS", "MANAGE_ORDERS"],
});

const ROLE_OPTIONS = [
  "SUPER_ADMIN",
  "PRODUCT_ADMIN",
  "SOS_ADMIN",
  "SUPPORT_ADMIN",
  "USER_ADMIN",
];

const ROLE_DEFAULT_PERMISSIONS = {
  SUPER_ADMIN: [...PERMISSIONS],
  PRODUCT_ADMIN: ["MANAGE_PRODUCTS", "MANAGE_ORDERS"],
  SOS_ADMIN: ["VIEW_SOS", "HANDLE_SOS"],
  SUPPORT_ADMIN: ["VIEW_TICKETS", "REPLY_TICKETS"],
  USER_ADMIN: ["VIEW_AUDIT_LOGS", "VIEW_SECURITY_ALERTS"],
};

const SuperAdminAdminsPage = () => {
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminForm, setAdminForm] = useState(createInitialAdminForm());
  const [permissionDrafts, setPermissionDrafts] = useState({});
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [logSource, setLogSource] = useState("web");
  const [logs, setLogs] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);

  const loadAdmins = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetchAdmins();
      const list = response?.admins || [];
      setAdmins(list);
      const initialDrafts = {};
      list.forEach((admin) => {
        initialDrafts[admin.id] = Array.isArray(admin.permissions)
          ? admin.permissions
          : [];
      });
      setPermissionDrafts(initialDrafts);
    } catch (err) {
      setError(err.message || "Failed to fetch admins.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadLogs = async (targetPage = logPage, targetSource = logSource) => {
    try {
      const response = await fetchSecurityAuditLogs({
        page: targetPage,
        limit: 10,
        source: targetSource,
      });
      setLogs(Array.isArray(response?.items) ? response.items : []);
      setLogTotalPages(Math.max(1, response?.pagination?.totalPages || 1));
    } catch (err) {
      setError(err.message || "Failed to load superadmin logs.");
    }
  };

  useEffect(() => {
    loadLogs(logPage, logSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logPage, logSource]);

  useEffect(() => {
    setPage(1);
  }, [admins.length]);

  const totalPages = Math.max(1, Math.ceil(admins.length / perPage));
  const pagedAdmins = admins.slice((page - 1) * perPage, page * perPage);

  const toggleCreatePermission = (permission) => {
    setAdminForm((prev) => {
      const next = new Set(prev.permissions || []);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return { ...prev, permissions: Array.from(next) };
    });
  };

  const toggleRowPermission = (adminId, permission) => {
    setPermissionDrafts((prev) => {
      const current = new Set(prev[adminId] || []);
      if (current.has(permission)) {
        current.delete(permission);
      } else {
        current.add(permission);
      }
      return { ...prev, [adminId]: Array.from(current) };
    });
  };

  const handleCreateAdmin = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await createAdmin({
        name: adminForm.name.trim(),
        email: adminForm.email.trim(),
        password: adminForm.password.trim(),
        role: adminForm.role,
        permissions: adminForm.permissions,
      });
      setAdminForm(createInitialAdminForm());
      await loadAdmins();
    } catch (err) {
      setError(err.message || "Failed to create admin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const savePermissions = async (adminId) => {
    setError("");
    try {
      await updateAdminPermissions(adminId, permissionDrafts[adminId] || []);
      await loadAdmins();
    } catch (err) {
      setError(err.message || "Failed to update admin permissions.");
    }
  };

  const toggleStatus = async (admin) => {
    const nextStatus = String(admin.status || "").toUpperCase() === "ACTIVE"
      ? "BLOCKED"
      : "ACTIVE";
    setError("");
    try {
      await updateAdminStatus(admin.id, nextStatus);
      await loadAdmins();
    } catch (err) {
      setError(err.message || "Failed to update admin status.");
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="Create Admin" subtitle="Only SuperAdmin can create new admins and assign permissions.">
        <form
          onSubmit={handleCreateAdmin}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
            <input
              type="text"
              value={adminForm.name}
              onChange={(event) =>
                setAdminForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={adminForm.email}
              onChange={(event) =>
                setAdminForm((prev) => ({ ...prev, email: event.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
              required
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </span>
            <input
              type="text"
              value={adminForm.password}
              onChange={(event) =>
                setAdminForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
              required
              minLength={6}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Role</span>
            <select
              value={adminForm.role}
              onChange={(event) => {
                const role = event.target.value;
                setAdminForm((prev) => ({
                  ...prev,
                  role,
                  permissions: ROLE_DEFAULT_PERMISSIONS[role] || [],
                }));
              }}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-700">Permissions</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PERMISSIONS.map((permission) => {
                const enabled = adminForm.permissions.includes(permission);
                return (
                  <button
                    key={permission}
                    type="button"
                    onClick={() => toggleCreatePermission(permission)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      enabled
                        ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                        : "border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    {permission}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create Admin"}
            </button>
          </div>
        </form>
      </Panel>

      <Panel
        title="Admin Management"
        subtitle="Review and control all admin accounts."
        action={
          <button
            type="button"
            onClick={loadAdmins}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Refresh
          </button>
        }
      >
        <ErrorBanner message={error} className="mb-4" />
        {isLoading ? (
          <InlineLoader label="Loading admins..." />
        ) : (
          <Table
            columns={[
              {
                key: "name",
                title: "Admin",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-900">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.email}</p>
                  </div>
                ),
              },
              {
                key: "role",
                title: "Role",
                render: (row) => (
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {row.role || "PRODUCT_ADMIN"}
                  </span>
                ),
              },
              {
                key: "permissions",
                title: "Permissions",
                render: (row) => (
                  <div className="flex flex-wrap gap-1">
                    {PERMISSIONS.map((permission) => {
                      const enabled = (permissionDrafts[row.id] || []).includes(permission);
                      return (
                        <button
                          key={`${row.id}-${permission}`}
                          type="button"
                          onClick={() => toggleRowPermission(row.id, permission)}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            enabled
                              ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                              : "border-slate-300 bg-white text-slate-600"
                          }`}
                        >
                          {permission}
                        </button>
                      );
                    })}
                  </div>
                ),
              },
              {
                key: "status",
                title: "Status",
                render: (row) => <StatusBadge value={row.status} />,
              },
              {
                key: "assignedBy",
                title: "Assigned By",
                render: (row) => row.assignedBy || "-",
              },
              {
                key: "createdAt",
                title: "Created",
                render: (row) => (
                  <span className="text-xs text-slate-600">
                    {formatDateTime(row.createdAt)}
                  </span>
                ),
              },
              {
                key: "actions",
                title: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => savePermissions(row.id)}
                      className="rounded border border-cyan-300 px-2 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-50"
                    >
                      Save Permissions
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStatus(row)}
                      className="rounded border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                    >
                      {String(row.status || "").toUpperCase() === "ACTIVE"
                        ? "Block"
                        : "Activate"}
                    </button>
                  </div>
                ),
              },
            ]}
            rows={pagedAdmins}
            emptyMessage="No admin users found."
          />
        )}
        {!isLoading && admins.length > 0 ? (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </Panel>

      <Panel title="Security Logs (Web / App)" subtitle="Dedicated source-separated logs for SuperAdmin oversight.">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setLogSource("web");
              setLogPage(1);
            }}
            className={`rounded border px-2 py-1 text-xs font-semibold ${logSource === "web" ? "border-cyan-300 bg-cyan-50 text-cyan-700" : "border-slate-300 text-slate-600"}`}
          >
            Web Logs
          </button>
          <button
            type="button"
            onClick={() => {
              setLogSource("app");
              setLogPage(1);
            }}
            className={`rounded border px-2 py-1 text-xs font-semibold ${logSource === "app" ? "border-cyan-300 bg-cyan-50 text-cyan-700" : "border-slate-300 text-slate-600"}`}
          >
            App Logs
          </button>
        </div>
        <Table
          columns={[
            { key: "createdAt", title: "Time", render: (row) => formatDateTime(row.createdAt) },
            { key: "actorId", title: "Actor" },
            { key: "actorRole", title: "Role" },
            { key: "action", title: "Action" },
            { key: "resourceType", title: "Resource" },
            { key: "ipAddress", title: "IP" },
          ]}
          rows={logs}
          emptyMessage="No security logs found."
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">Page {logPage} of {logTotalPages}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={logPage <= 1}
              onClick={() => setLogPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={logPage >= logTotalPages}
              onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))}
              className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
};

export default SuperAdminAdminsPage;
