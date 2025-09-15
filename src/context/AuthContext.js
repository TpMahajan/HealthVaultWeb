import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Load user from localStorage on app start
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  // 🔑 Login function (doctor only)
  const login = async (email, password) => {
    try {
      const res = await fetch(`http://localhost:5000/api/doctors/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      // Save to state + localStorage
      setUser(data.doctor);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(data.doctor));
      localStorage.setItem('token', data.token);

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // 🔑 Signup function (doctor only)
  const signup = async (name, email, mobile, password) => {
    try {
      const res = await fetch(`http://localhost:5000/api/doctors/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, mobile, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // 🔑 Logout function
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
