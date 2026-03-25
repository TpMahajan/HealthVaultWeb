import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../constants/api";

const ADMIN_AUTH_KEY = "mv_admin_auth";

const AdminAuthContext = createContext({
  admin: null,
  token: "",
  isLoading: true,
  refreshAdmin: async () => ({}),
  logoutAdmin: () => {},
});

const readStoredAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_AUTH_KEY) || "null");
  } catch {
    return null;
  }
};

const writeStoredAdmin = (value) => {
  if (!value) {
    localStorage.removeItem(ADMIN_AUTH_KEY);
    return;
  }
  localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(value));
};

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => readStoredAdmin()?.admin || null);
  const [token, setToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [isLoading, setIsLoading] = useState(true);

  const logoutAdmin = useCallback(() => {
    localStorage.removeItem("adminToken");
    writeStoredAdmin(null);
    setAdmin(null);
    setToken("");
  }, []);

  const refreshAdmin = useCallback(async () => {
    const activeToken = localStorage.getItem("adminToken") || "";
    if (!activeToken) {
      setAdmin(null);
      setToken("");
      setIsLoading(false);
      return { ok: false };
    }

    try {
      const res = await fetch(`${API_BASE}/admin/me`, {
        headers: { Authorization: `Bearer ${activeToken}` },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data?.admin) {
        logoutAdmin();
        setIsLoading(false);
        return { ok: false, message: data?.message || "Session invalid" };
      }

      setToken(activeToken);
      setAdmin(data.admin);
      writeStoredAdmin({ admin: data.admin });
      setIsLoading(false);
      return { ok: true, admin: data.admin };
    } catch {
      setIsLoading(false);
      return { ok: false, message: "Network error" };
    }
  }, [logoutAdmin]);

  useEffect(() => {
    refreshAdmin();
  }, [refreshAdmin]);

  const value = useMemo(
    () => ({ admin, token, isLoading, refreshAdmin, logoutAdmin }),
    [admin, token, isLoading, refreshAdmin, logoutAdmin]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => useContext(AdminAuthContext);

export const setAdminSession = ({ token, admin }) => {
  if (token) localStorage.setItem("adminToken", token);
  writeStoredAdmin({ admin: admin || null });
};
