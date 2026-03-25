import React, { useEffect, useMemo, useState } from "react";

import {
  PERMISSIONS,
  createUser,
  deleteUser,
  fetchUsers,
  updateUser,
  updateUserStatus,
} from "./api";
import {
  ErrorBanner,
  InlineLoader,
  Panel,
  StatusBadge,
  Table,
  formatDateTime,
} from "./ui";

const roleTabs = ["PATIENT", "DOCTOR", "ADMIN"];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "PATIENT",
  age: "",
  gender: "",
  specialization: "",
  license: "",
  permissions: ["MANAGE_USERS"],
};

const normalizeRole = (value) => String(value || "").toUpperCase();

const UserFormModal = ({
  mode,
  form,
  setForm,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const role = normalizeRole(form.role);
  const isEdit = mode === "edit";
  const title = isEdit ? "Edit User" : "Create User";
  const submitLabel = isEdit ? "Update User" : "Create User";

  const togglePermission = (permission) => {
    const next = new Set(form.permissions || []);
    if (next.has(permission)) {
      next.delete(permission);
    } else {
      next.add(permission);
    }
    setForm((prev) => ({
      ...prev,
      permissions: Array.from(next),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <label className="block md:col-span-1">
            <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
              required
            />
          </label>

          <label className="block md:col-span-1">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
              required
            />
          </label>

          <label className="block md:col-span-1">
            <span className="mb-1 block text-sm font-medium text-slate-700">Phone</span>
            <input
              type="text"
              value={form.phone}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, phone: event.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
              required={role !== "ADMIN"}
            />
          </label>

          <label className="block md:col-span-1">
            <span className="mb-1 block text-sm font-medium text-slate-700">Role</span>
            <select
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, role: event.target.value }))
              }
              disabled={isEdit}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500 disabled:bg-slate-100"
              required
            >
              {roleTabs.map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {roleOption}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Password {isEdit ? "(Optional)" : ""}
            </span>
            <input
              type="text"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
              placeholder="Min 12 characters"
              required={!isEdit}
              minLength={isEdit ? undefined : 12}
            />
          </label>

          {role === "PATIENT" ? (
            <>
              <label className="block md:col-span-1">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Age
                </span>
                <input
                  type="number"
                  min="0"
                  value={form.age}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, age: event.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
                />
              </label>
              <label className="block md:col-span-1">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Gender
                </span>
                <input
                  type="text"
                  value={form.gender}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, gender: event.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
                  placeholder="Male / Female / Other"
                />
              </label>
            </>
          ) : null}

          {role === "DOCTOR" ? (
            <>
              <label className="block md:col-span-1">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Specialization
                </span>
                <input
                  type="text"
                  value={form.specialization}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      specialization: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
                />
              </label>
              <label className="block md:col-span-1">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  License
                </span>
                <input
                  type="text"
                  value={form.license}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, license: event.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500"
                />
              </label>
            </>
          ) : null}

          {role === "ADMIN" ? (
            <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700">Permissions</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PERMISSIONS.map((permission) => {
                  const isEnabled = (form.permissions || []).includes(permission);
                  return (
                    <button
                      type="button"
                      key={permission}
                      onClick={() => togglePermission(permission)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        isEnabled
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
          ) : null}

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SuperAdminUsersPage = () => {
  const [activeRole, setActiveRole] = useState("PATIENT");
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadUsers = async (role = activeRole) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetchUsers({ role });
      setUsers(response?.users || []);
    } catch (err) {
      setError(err.message || "Failed to fetch users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(activeRole);
  }, [activeRole]);

  const openCreateModal = () => {
    setEditingUser(null);
    setModalMode("create");
    setForm({ ...emptyForm, role: activeRole });
  };

  const openEditModal = (user) => {
    const role = normalizeRole(user.role || user.type);
    setEditingUser(user);
    setModalMode("edit");
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      role,
      age: user.age ?? "",
      gender: user.gender ?? "",
      specialization: user.specialization || "",
      license: user.license || "",
      permissions: Array.isArray(user.permissions)
        ? user.permissions
        : ["MANAGE_USERS"],
    });
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const role = normalizeRole(form.role);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role,
      ...(form.password.trim() ? { password: form.password.trim() } : {}),
    };

    if (role === "PATIENT") {
      payload.age = form.age === "" ? null : Number(form.age);
      payload.gender = form.gender.trim();
    }

    if (role === "DOCTOR") {
      payload.specialization = form.specialization.trim();
      payload.license = form.license.trim();
    }

    if (role === "ADMIN") {
      payload.permissions = form.permissions;
    }

    setIsSubmitting(true);
    setError("");
    try {
      if (modalMode === "edit" && editingUser) {
        await updateUser(role, editingUser.id, payload);
      } else {
        await createUser(payload);
      }
      closeModal();
      await loadUsers(activeRole);
    } catch (err) {
      setError(err.message || "Failed to save user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = async (user) => {
    const role = normalizeRole(user.role || user.type);
    const nextStatus = normalizeRole(user.status) === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    setError("");
    try {
      await updateUserStatus(role, user.id, nextStatus);
      await loadUsers(activeRole);
    } catch (err) {
      setError(err.message || "Failed to update user status.");
    }
  };

  const handleDelete = async (user) => {
    const role = normalizeRole(user.role || user.type);
    const confirmed = window.confirm(
      `Delete ${user.name || "this user"} (${role})? This action cannot be undone.`
    );
    if (!confirmed) return;
    setError("");
    try {
      await deleteUser(role, user.id);
      await loadUsers(activeRole);
    } catch (err) {
      setError(err.message || "Failed to delete user.");
    }
  };

  const filteredUsers = useMemo(
    () => users.filter((user) => normalizeRole(user.role || user.type) === activeRole),
    [users, activeRole]
  );

  return (
    <div className="space-y-6">
      <Panel
        title="User Management"
        subtitle="Create, update, block, and remove patients, doctors, and admins."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => loadUsers(activeRole)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
            >
              Create User
            </button>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {roleTabs.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setActiveRole(role)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                activeRole === role
                  ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                  : "border-slate-300 bg-white text-slate-600"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <ErrorBanner message={error} className="mb-4" />

        {isLoading ? (
          <InlineLoader label="Loading users..." />
        ) : (
          <Table
            columns={[
              {
                key: "name",
                title: "User",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-900">{row.name || "-"}</p>
                    <p className="text-xs text-slate-500">{row.email || "-"}</p>
                  </div>
                ),
              },
              {
                key: "phone",
                title: "Phone",
                render: (row) => row.phone || "-",
              },
              {
                key: "extra",
                title: activeRole === "PATIENT" ? "Age / Gender" : activeRole === "DOCTOR" ? "Specialization" : "Permissions",
                render: (row) => {
                  if (activeRole === "PATIENT") {
                    return `${row.age ?? "-"} / ${row.gender || "-"}`;
                  }
                  if (activeRole === "DOCTOR") {
                    return (
                      <div>
                        <p>{row.specialization || "-"}</p>
                        <p className="text-xs text-slate-500">
                          License: {row.license || "-"}
                        </p>
                      </div>
                    );
                  }
                  return (row.permissions || []).join(", ") || "-";
                },
              },
              {
                key: "status",
                title: "Status",
                render: (row) => <StatusBadge value={row.status} />,
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
                      onClick={() => openEditModal(row)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusToggle(row)}
                      className="rounded border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                    >
                      {normalizeRole(row.status) === "ACTIVE" ? "Block" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="rounded border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
            rows={filteredUsers}
            emptyMessage={`No ${activeRole.toLowerCase()} records found.`}
          />
        )}
      </Panel>

      {modalMode ? (
        <UserFormModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          onClose={closeModal}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      ) : null}
    </div>
  );
};

export default SuperAdminUsersPage;
