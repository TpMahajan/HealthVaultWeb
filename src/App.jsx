import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import './App.css';

// Pages / Components
import WelcomePage from './components/WelcomePage';
import LoginPage from './components/LoginPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import SignupPage from './components/SignUpPage';
import Dashboard from './components/Dashboard';
import QRScanner from './components/QRScanner';
import Patients from './components/Patients';
import AllPatients from './components/AllPatients';
import PatientDetails from './components/PatientDetails';
import Profile from './components/Profile';
import Settings from './components/Settings';
import Vault from './components/Vault';
import MainLayout from './components/MainLayout';
import AdminLoginPage from './components/AdminLoginPage';
import AdminSignupPage from './components/AdminSignupPage';
import SOSListPage from './components/SOSListPage';
import AdminDashboard from './components/AdminDashboard';
import AdminInventoyPage from './components/AdminInventoyPage';
import AdminOrdersPage from './components/AdminOrdersPage';
import MedicalCard from './components/MedicalCard';
import SessionHistory from './components/SessionHistory';
import FeaturesPage from './components/FeaturesPage';
import ProductPage from './components/ProductPage';
import CartPage from './components/CartPage';
import OrdersPage from './components/OrdersPage';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';

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

// ✅ Patient Details Route Component (allows both authenticated and anonymous access)
const PatientDetailsRoute = ({ children }) => {
  const { user, isLoading, anonAuth } = useAuth();
  const location = useLocation();
  const hasToken = new URLSearchParams(location.search).get('token');

  console.log("🔒 PatientDetailsRoute: Checking access, user:", user, "anonAuth:", anonAuth, "hasToken:", !!hasToken, "isLoading:", isLoading);

  // Show loading spinner while checking authentication
  if (isLoading) {
    console.log("⏳ PatientDetailsRoute: Loading authentication state...");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Loading...</h3>
          <p className="text-gray-600 dark:text-gray-300">Checking access permissions</p>
        </div>
      </div>
    );
  }

  // Allow access if user is logged in OR if there's an anonymous token
  if (user || anonAuth || hasToken) {
    console.log("✅ PatientDetailsRoute: Access granted");
    return children;
  } else {
    console.log("❌ PatientDetailsRoute: No access, redirecting to login");
    return <Navigate to="/login" replace />;
  }
};

// ✅ Main AppContent
const AppContent = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<WelcomePage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/products" element={<ProductPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/medical-card/:userId" element={<MedicalCard />} />
      {/* Admin (temporary using doctor auth) */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/signup" element={<AdminSignupPage />} />
      <Route path="/admin/sos" element={<SOSListPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/inventoy" element={<AdminInventoyPage />} />
      <Route path="/admin/inventory" element={<AdminInventoyPage />} />
      <Route path="/admin/orders" element={<AdminOrdersPage />} />

      {/* Protected Routes sharing the same Layout for state persistence */}
      <Route element={<ProtectedRoute><MainLayout><Outlet /></MainLayout></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/scan" element={<QRScanner />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/all-patients" element={<AllPatients />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/history" element={<SessionHistory />} />
      </Route>

      {/* Specialized Patient Details Route */}
      <Route path="/patient-details/:id" element={<PatientDetailsRoute><MainLayout><PatientDetails /></MainLayout></PatientDetailsRoute>} />
    </Routes>
  );
};

// ✅ Wrap everything with Providers
const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <AppContent />
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
