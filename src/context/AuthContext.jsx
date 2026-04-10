import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE, DOCTOR_API_BASE, googleWebAuth } from "../constants/api";
import { getFCMToken, onMessageListener } from "../firebase";
import { clearSecureAuthSession } from "../utils/secureAuthStorage";
import { setSelectedTimeZone } from "../utils/timezone";

const AuthContext = createContext();
const isDev = import.meta.env.DEV;
const debugLog = (...args) => {
  if (isDev) console.log(...args);
};

const isTokenUsable = (token) => {
  try {
    const raw = String(token || "").trim();
    if (!raw) return false;
    const parts = raw.split(".");
    if (parts.length < 2) return false;
    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (payloadBase64.length % 4)) % 4);
    const payload = JSON.parse(atob(`${payloadBase64}${padding}`));
    if (!payload?.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

const decodeTokenPayload = (token) => {
  try {
    const raw = String(token || "").trim();
    if (!raw) return null;
    const parts = raw.split(".");
    if (parts.length < 2) return null;
    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (payloadBase64.length % 4)) % 4);
    return JSON.parse(atob(`${payloadBase64}${padding}`));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Register FCM token with backend
  const registerFCMToken = async (userId) => {
    try {
      const token = await getFCMToken();
      const authToken = localStorage.getItem("token");

      if (token && authToken) {
        await fetch(`${DOCTOR_API_BASE}/../notifications/save-token`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            fcmToken: token,
            userId: userId,
            role: "doctor",
          }),
        });
        debugLog("FCM token registered");
      }
    } catch (error) {
      console.error("❌ Failed to register FCM token:", error);
    }
  };

  const flushDoctorSessions = (authToken, reason) => {
    if (!isTokenUsable(authToken)) {
      if (isDev) console.log(`AuthContext - Skipping session flush (${reason}): token missing/expired`);
      return;
    }

    fetch(`${API_BASE}/sessions/end-all-active`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      keepalive: true,
    }).catch((error) => {
      if (isDev) console.warn(`AuthContext - Failed to flush sessions on ${reason}:`, error?.message || error);
    });
  };

  // Setup FCM message listener
  useEffect(() => {
    if (user) {
      onMessageListener().then((payload) => {
        debugLog("Received foreground message");

        // Show browser notification
        if (Notification.permission === 'granted') {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/app_icon.png?v=2',
            tag: 'health-vault-notification',
          });
        }

        // Handle different notification types
        if (payload.data?.type === 'SESSION_RESPONSE') {
          // Handle session response notification
        debugLog("Session response notification received");
        }
      });
    }
  }, [user]);

  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
    };
    window.addEventListener("auth-force-logout", handleForcedLogout);
    return () =>
      window.removeEventListener("auth-force-logout", handleForcedLogout);
  }, []);

  // Restore auth state on mount
  useEffect(() => {
    const restoreAuthState = () => {
      try {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("token");
        const storedRole = localStorage.getItem("role");

        debugLog("Restoring auth state");

        if (storedUser && storedRole) {
          const userData = JSON.parse(storedUser);
          setUser({ ...userData, role: storedRole });
          setSelectedTimeZone(userData?.preferences?.timezone);
          debugLog("User restored from cache");

          const tokenPayload = decodeTokenPayload(storedToken);
          if (!tokenPayload && storedToken) {
            debugLog("Token payload decode failed during restore; preserving stored session.");
          } else if (tokenPayload?.exp && tokenPayload.exp * 1000 <= Date.now()) {
            debugLog("Cached token appears expired; preserving session until API validation.");
          }
        }
      } catch (error) {
        if (isDev) {
          console.error("Error restoring auth state; keeping stored session unchanged", error);
        }
      } finally {
        setIsLoading(false);
        debugLog("Auth restoration complete");
      }
    };

    restoreAuthState();
  }, []);

  // Doctor login
  const login = async (email, password) => {
    try {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const rawPassword = String(password ?? "");
      if (!normalizedEmail || !rawPassword) {
        throw new Error("Email and password are required.");
      }

      const loginRequest = async (passwordToTry) => {
        const res = await fetch(`${DOCTOR_API_BASE}/login`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password: passwordToTry }),
        });

        let data = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }

        return { ok: res.ok, status: res.status, data };
      };

      let loginResult = await loginRequest(rawPassword);
      if (
        !loginResult.ok &&
        loginResult.status === 401 &&
        rawPassword !== rawPassword.trim()
      ) {
        loginResult = await loginRequest(rawPassword.trim());
      }

      if (!loginResult.ok) {
        throw new Error(loginResult.data?.message || "Login failed");
      }

      const data = loginResult.data;

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.doctor));
      localStorage.setItem("role", "doctor");
      setUser({ ...data.doctor, role: "doctor" });
      setSelectedTimeZone(data?.doctor?.preferences?.timezone);

      // Register FCM token after successful login
      await registerFCMToken(data.doctor.id);

      debugLog("Login successful");

      return { success: true, user: data.doctor };
    } catch (err) {
      if (isDev) console.error("Login failed:", err.message);
      return { success: false, error: err.message || "Login failed" };
    }
  };

  // Doctor signup
  const signup = async (name, email, mobile, password) => {
    try {
      const res = await fetch(`${DOCTOR_API_BASE}/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, mobile, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Signup failed");

      // Optional: auto-login after signup
      if (data.token && data.doctor) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", "doctor");
        localStorage.setItem("user", JSON.stringify(data.doctor));
        setUser({ ...data.doctor, role: "doctor" });
        setSelectedTimeZone(data?.doctor?.preferences?.timezone);
      }

      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message || "Signup failed" };
    }
  };

  const logout = () => {
    const authToken = localStorage.getItem("token");
    const currentRole = user?.role || localStorage.getItem("role");
    if (currentRole === "doctor" && authToken) {
      flushDoctorSessions(authToken, "logout");
    }

    fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        "Content-Type": "application/json",
      },
    }).catch(() => {});

    setUser(null);
    clearSecureAuthSession();
  };

  const updateUser = (updatedUserData) => {
    // Preserve the role which is stored separately in localStorage or was already in the user state
    const currentRole = user?.role || localStorage.getItem("role");
    const userWithRole = { ...updatedUserData, role: currentRole };

    setUser(userWithRole);
    localStorage.setItem("user", JSON.stringify(updatedUserData));
    setSelectedTimeZone(updatedUserData?.preferences?.timezone);
    debugLog("User data updated");
  };

  // Google web login/signup for patients
  const loginWithGoogle = async (idToken) => {
    const result = await googleWebAuth(idToken);
    if (!result.success) return { success: false, error: result.error };
    const { token, user } = result.data;
    localStorage.setItem("token", token);
    localStorage.setItem("role", "patient");
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
    setSelectedTimeZone(user?.preferences?.timezone);
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateUser, isLoading, loginWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
