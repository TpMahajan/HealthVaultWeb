import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Pages / Components
import WelcomePage from './components/WelcomePage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignUpPage';
import Dashboard from './components/Dashboard';
import QRScanner from './components/QRScanner';
import Patients from './components/Patients';
import PatientDetails from './components/PatientDetails';
import Profile from './components/Profile';
import Settings from './components/Settings';
import Vault from './components/Vault';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// ✅ Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// ✅ Main AppContent
const AppContent = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute><QRScanner /></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
        <Route path="/patient/:id" element={<ProtectedRoute><PatientDetails /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/vault" element={<ProtectedRoute><Vault /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
};

// ✅ Wrap everything with Providers
const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
