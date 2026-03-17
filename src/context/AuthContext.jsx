import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE, DOCTOR_API_BASE, googleWebAuth } from "../constants/api";
import { getFCMToken, onMessageListener } from "../firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [anonAuth, setAnonAuth] = useState(null); // { role: 'anonymous', userId }

  // Register FCM token with backend
  const registerFCMToken = async (userId) => {
    try {
      const token = await getFCMToken();
      const authToken = localStorage.getItem("token");

      if (token && authToken) {
        await fetch(`${DOCTOR_API_BASE}/../notifications/save-token`, {
          method: "POST",
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
        console.log("✅ FCM token registered successfully");
      }
    } catch (error) {
      console.error("❌ Failed to register FCM token:", error);
    }
  };

  const flushDoctorSessions = (authToken, reason) => {
    if (!authToken) return;

    fetch(`${API_BASE}/sessions/end-all-active`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      keepalive: true,
    }).catch((error) => {
      console.warn(`AuthContext - Failed to flush sessions on ${reason}:`, error?.message || error);
    });
  };

  // Setup FCM message listener
  useEffect(() => {
    if (user) {
      onMessageListener().then((payload) => {
        console.log("📱 Received foreground message:", payload);

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
          console.log("Patient responded to session request");
        }
      });
    }
  }, [user]);

  // Restore auth state on mount
  useEffect(() => {
    const restoreAuthState = () => {
      try {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("token");
        const storedRole = localStorage.getItem("role");

        console.log("🔍 AuthContext - Restoring auth state...");
        console.log("🔍 AuthContext - Stored user:", storedUser ? "Present" : "Not found");
        console.log("🔍 AuthContext - Stored token:", storedToken ? "Present" : "Not found");
        console.log("🔍 AuthContext - Stored role:", storedRole || "Not found");

        // Only detect anonymous token if no stored auth data exists
        if (!storedUser && !storedToken) {
          try {
            const params = new URLSearchParams(window.location.search);
            const urlToken = params.get('token');
            console.log('🔍 AuthContext - Checking for URL token:', !!urlToken);
            if (urlToken) {
              console.log('🔍 AuthContext - URL token found, attempting to decode...');
              const payload = JSON.parse(atob(urlToken.split('.')[1] || ''));
              console.log('🔍 AuthContext - Decoded token payload:', payload);
              if (payload?.role === 'anonymous' && payload?.userId) {
                setAnonAuth({ role: 'anonymous', userId: payload.userId });
                console.log('🔐 AuthContext - Anonymous token detected, userId:', payload.userId);
              } else {
                console.log('⚠️ AuthContext - Token found but not anonymous or missing userId');
              }
            } else {
              console.log('📭 AuthContext - No URL token found');
            }
          } catch (e) {
            console.warn('AuthContext - Failed to parse URL token:', e);
          }
        } else {
          console.log('🔍 AuthContext - Stored auth data exists, skipping anonymous token detection');
        }

        if (storedUser && storedToken && storedRole) {
          const userData = JSON.parse(storedUser);

          // Validate token by checking if it's expired
          try {
            const tokenPayload = JSON.parse(atob(storedToken.split('.')[1]));
            const isExpired = tokenPayload.exp * 1000 < Date.now();

            if (isExpired) {
              if (storedRole === "doctor") {
                flushDoctorSessions(storedToken, "token expiry");
              }
              console.log("⏰ AuthContext - Token expired, clearing auth data");
              localStorage.removeItem("user");
              localStorage.removeItem("token");
              localStorage.removeItem("role");
            } else {
              setUser({ ...userData, role: storedRole });
              console.log("✅ AuthContext - User restored from localStorage:", userData, "Role:", storedRole);
            }
          } catch (tokenError) {
            console.error("❌ AuthContext - Invalid token format, clearing auth data:", tokenError);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("role");
          }
        } else {
          console.log("📭 AuthContext - No stored auth data found");
        }
      } catch (error) {
        console.error("❌ AuthContext - Error restoring auth state:", error);
        // Clear corrupted data
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
      } finally {
        setIsLoading(false);
        console.log("🏁 AuthContext - Auth state restoration complete");
      }
    };

    restoreAuthState();
  }, []);

  // Doctor login
  const login = async (email, password) => {
    try {
      console.log("🔐 Attempting login for:", email);
      const res = await fetch(`${DOCTOR_API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log("📡 Login response:", data);

      if (!res.ok) throw new Error(data?.message || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.doctor));
      localStorage.setItem("role", "doctor");
      setUser(data.doctor);

      // Register FCM token after successful login
      await registerFCMToken(data.doctor.id);

      console.log("✅ Login successful, user set:", data.doctor);

      return { success: true, user: data.doctor };
    } catch (err) {
      console.error("❌ Login failed:", err.message);
      return { success: false, error: err.message || "Login failed" };
    }
  };

  // Doctor signup
  const signup = async (name, email, mobile, password) => {
    try {
      const res = await fetch(`${DOCTOR_API_BASE}/signup`, {
        method: "POST",
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

    setUser(null);
    setAnonAuth(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
  };

  const updateUser = (updatedUserData) => {
    console.log('🔄 AuthContext - Updating user data:', updatedUserData);
    // Preserve the role which is stored separately in localStorage or was already in the user state
    const currentRole = user?.role || localStorage.getItem("role");
    const userWithRole = { ...updatedUserData, role: currentRole };

    setUser(userWithRole);
    localStorage.setItem("user", JSON.stringify(updatedUserData));
    console.log('✅ AuthContext - User data updated successfully with role:', currentRole);
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
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateUser, isLoading, anonAuth, loginWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
