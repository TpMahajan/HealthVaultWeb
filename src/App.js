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
import MainLayout from './components/MainLayout';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// ✅ Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  console.log("🔒 ProtectedRoute: Checking authentication, user:", user, "isLoading:", isLoading);
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    console.log("⏳ ProtectedRoute: Loading authentication state...");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Loading...</h3>
          <p className="text-gray-600 dark:text-gray-300">Checking authentication status</p>
        </div>
      </div>
    );
  }
  
  if (user) {
    console.log("✅ ProtectedRoute: User authenticated, allowing access");
    return children;
  } else {
    console.log("❌ ProtectedRoute: No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }
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
        {/* Dashboard keeps its existing navbar */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        
        {/* Other routes use MainLayout with GlobalNavbar */}
        <Route path="/scan" element={<ProtectedRoute><MainLayout><QRScanner /></MainLayout></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute><MainLayout><Patients /></MainLayout></ProtectedRoute>} />
        <Route path="/patient-details/:id" element={<ProtectedRoute><MainLayout><PatientDetails /></MainLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><MainLayout><Profile /></MainLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
        <Route path="/vault" element={<ProtectedRoute><MainLayout><Vault /></MainLayout></ProtectedRoute>} />
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
