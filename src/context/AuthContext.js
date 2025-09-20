import React, { createContext, useContext, useState, useEffect } from "react";
import { DOCTOR_API_BASE } from "../constants/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore auth state on mount
  useEffect(() => {
    const restoreAuthState = () => {
      try {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("token");
        
        console.log("🔍 AuthContext - Restoring auth state...");
        console.log("🔍 AuthContext - Stored user:", storedUser ? "Present" : "Not found");
        console.log("🔍 AuthContext - Stored token:", storedToken ? "Present" : "Not found");
        
        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          
          // Validate token by checking if it's expired
          try {
            const tokenPayload = JSON.parse(atob(storedToken.split('.')[1]));
            const isExpired = tokenPayload.exp * 1000 < Date.now();
            
            if (isExpired) {
              console.log("⏰ AuthContext - Token expired, clearing auth data");
              localStorage.removeItem("user");
              localStorage.removeItem("token");
            } else {
              setUser(userData);
              console.log("✅ AuthContext - User restored from localStorage:", userData);
            }
          } catch (tokenError) {
            console.error("❌ AuthContext - Invalid token format, clearing auth data:", tokenError);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
          }
        } else {
          console.log("📭 AuthContext - No stored auth data found");
        }
      } catch (error) {
        console.error("❌ AuthContext - Error restoring auth state:", error);
        // Clear corrupted data
        localStorage.removeItem("user");
        localStorage.removeItem("token");
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
      setUser(data.doctor);
      
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
        localStorage.setItem("user", JSON.stringify(data.doctor));
        setUser(data.doctor);
      }

      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message || "Signup failed" };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const updateUser = (updatedUserData) => {
    console.log('🔄 AuthContext - Updating user data:', updatedUserData);
    setUser(updatedUserData);
    localStorage.setItem("user", JSON.stringify(updatedUserData));
    console.log('✅ AuthContext - User data updated successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
