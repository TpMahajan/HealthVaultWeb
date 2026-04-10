import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
import SOSListPage from './components/SOSListPage';
import AdminDashboard from './components/AdminDashboard';
import AdminInventoyPage from './components/AdminInventoyPage.jsx';
import AdminOrdersPage from './components/AdminOrdersPage';
import AdminShell from './components/AdminShell';
import AdminLostFoundPage from './components/AdminLostFoundPage';
import AdminSupportPage from './components/AdminSupportPage';
import AdminSecurityPanel from './components/AdminSecurityPanel';
import MedicalCard from './components/MedicalCard';
import SessionHistory from './components/SessionHistory';
import Messages from './components/Messages';
import FeaturesPage from './components/FeaturesPage';
import ProductPage from './components/ProductPage';
import CartPage from './components/CartPage';
import OrdersPage from './components/OrdersPage';
import SuperAdminLoginPage from './superadmin/SuperAdminLoginPage';
import SuperAdminProtectedRoute from './superadmin/SuperAdminProtectedRoute';
import SuperAdminLayout from './superadmin/SuperAdminLayout';
import SuperAdminDashboardPage from './superadmin/SuperAdminDashboardPage';
import SuperAdminAnalyticsPage from './superadmin/SuperAdminAnalyticsPage';
import SuperAdminUsersPage from './superadmin/SuperAdminUsersPage';
import SuperAdminAdminsPage from './superadmin/SuperAdminAdminsPage';
import SuperAdminAdvertisementsPage from './superadmin/SuperAdminAdvertisementsPage';
import SuperAdminProductsPage from './superadmin/SuperAdminProductsPage';
import SuperAdminUiConfigPage from './superadmin/SuperAdminUiConfigPage';
import SuperAdminAlertsPage from './superadmin/SuperAdminAlertsPage';
import SuperAdminNotificationsPage from './superadmin/SuperAdminNotificationsPage';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { ADMIN_PERMISSIONS, hasPermission } from './admin/rbac';
import { clearSecureAuthSession } from './utils/secureAuthStorage';

// ✅ Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
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
    return children;
  } else {
    return <Navigate to="/login" replace />;
  }
};

const AdminProtectedRoute = ({ children }) => {
  const { admin, isLoading } = useAdminAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-teal-500 animate-spin" />
      </div>
    );
  }
  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

const AdminPermissionRoute = ({ permission, children }) => {
  const { admin } = useAdminAuth();
  if (!admin || !hasPermission(admin, permission)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
};

// ✅ Patient Details Route Component (allows both authenticated and anonymous access)
const PatientDetailsRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
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

  // Zero-trust model: PHI view routes always require authenticated user context.
  if (user) {
    return children;
  } else {
    return <Navigate to="/login" replace />;
  }
};

const GlobalForcedLogoutHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const handler = (event) => {
      const detail = event?.detail || {};
      const message = String(detail?.message || '').trim();
      if (message) {
        try {
          window.sessionStorage.setItem('forced_logout_notice', message);
        } catch {
          // Ignore sessionStorage errors.
        }
      }

      clearSecureAuthSession();

      const pathname = String(location.pathname || '').toLowerCase();
      const target = pathname.startsWith('/superadmin')
        ? '/superadmin/login'
        : pathname.startsWith('/admin')
          ? '/admin/login'
          : '/login';
      navigate(target, { replace: true });
    };

    window.addEventListener('auth-force-logout', handler);
    return () => window.removeEventListener('auth-force-logout', handler);
  }, [location.pathname, navigate]);

  return null;
};

// ✅ Main AppContent
const AppContent = () => {
  return (
    <>
      <GlobalForcedLogoutHandler />
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
        <Route
          path="/admin"
          element={(
            <AdminProtectedRoute>
              <AdminShell />
            </AdminProtectedRoute>
          )}
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route
            path="sos"
            element={(
              <AdminPermissionRoute permission={ADMIN_PERMISSIONS.VIEW_SOS}>
                <SOSListPage />
              </AdminPermissionRoute>
            )}
          />
          <Route
            path="lost-found"
            element={(
              <AdminPermissionRoute permission={ADMIN_PERMISSIONS.VIEW_SOS}>
                <AdminLostFoundPage />
              </AdminPermissionRoute>
            )}
          />
          <Route
            path="inventoy"
            element={(
              <AdminPermissionRoute permission={ADMIN_PERMISSIONS.MANAGE_PRODUCTS}>
                <AdminInventoyPage />
              </AdminPermissionRoute>
            )}
          />
          <Route
            path="inventory"
            element={(
              <AdminPermissionRoute permission={ADMIN_PERMISSIONS.MANAGE_PRODUCTS}>
                <AdminInventoyPage />
              </AdminPermissionRoute>
            )}
          />
          <Route
            path="orders"
            element={(
              <AdminPermissionRoute permission={ADMIN_PERMISSIONS.MANAGE_ORDERS}>
                <AdminOrdersPage />
              </AdminPermissionRoute>
            )}
          />
          <Route
            path="support"
            element={(
              <AdminPermissionRoute permission={ADMIN_PERMISSIONS.VIEW_TICKETS}>
                <AdminSupportPage />
              </AdminPermissionRoute>
            )}
          />
          <Route
            path="security"
            element={(
              <AdminPermissionRoute permission={ADMIN_PERMISSIONS.VIEW_AUDIT_LOGS}>
                <AdminSecurityPanel />
              </AdminPermissionRoute>
            )}
          />
        </Route>
        <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />

        <Route
          path="/superadmin"
          element={(
            <SuperAdminProtectedRoute>
              <SuperAdminLayout />
            </SuperAdminProtectedRoute>
          )}
        >
          <Route index element={<SuperAdminDashboardPage />} />
          <Route path="analytics" element={<SuperAdminAnalyticsPage />} />
          <Route path="users" element={<SuperAdminUsersPage />} />
          <Route path="admins" element={<SuperAdminAdminsPage />} />
          <Route path="ads" element={<SuperAdminAdvertisementsPage />} />
          <Route path="products" element={<SuperAdminProductsPage />} />
          <Route path="ui-config" element={<SuperAdminUiConfigPage />} />
          <Route path="alerts" element={<SuperAdminAlertsPage />} />
          <Route path="notifications" element={<SuperAdminNotificationsPage />} />
        </Route>

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
          <Route path="/messages" element={<Messages />} />
        </Route>

        {/* Specialized Patient Details Route */}
        <Route path="/patient-details/:id" element={<PatientDetailsRoute><MainLayout><PatientDetails /></MainLayout></PatientDetailsRoute>} />
      </Routes>
    </>
  );
};

// ✅ Wrap everything with Providers
const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AdminAuthProvider>
            <Router>
              <AppContent />
            </Router>
          </AdminAuthProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
