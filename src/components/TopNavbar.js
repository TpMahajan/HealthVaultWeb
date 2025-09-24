import React, { useState } from 'react';
import { Menu, Bell, User, X, Home, Users, QrCode, UserCircle, Settings, LogOut, Stethoscope, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';

const TopNavbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifications = [
    { id: 1, message: 'New patient QR scanned', time: '2 minutes ago', unread: true },
    { id: 2, message: 'Medical report ready for review', time: '15 minutes ago', unread: true },
    { id: 3, message: 'Appointment reminder: John Doe at 2:00 PM', time: '1 hour ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Patients', href: '/patients', icon: Users },
    { name: 'QR Scanner', href: '/scan', icon: QrCode },
    { name: 'Profile', href: '/profile', icon: UserCircle },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Sidebar */}
      <div className={`fixed inset-0 z-50 ${sidebarOpen ? 'block' : 'hidden'}`} style={{ display: sidebarOpen ? 'block' : 'none' }}>
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 shadow-xl">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">HealthVault</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-4 px-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200 mb-1"
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200 mt-4"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </nav>
        </div>
      </div>

      <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Mobile menu button */}
            <div>
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors duration-200"
            >
              <Menu className="h-6 w-6" />
            </button>
            </div>

          {/* Greeting */}
          <div className="flex-1 mx-2 sm:mx-4">
            {(() => {
              const rawName = user?.name || 'there';
              const hasDoctorTitle = /^Dr\.?\s+/i.test(rawName);
              const cleanedName = rawName.replace(/^Dr\.?\s+/i, '');
              const greetingName = hasDoctorTitle ? `Dr. ${cleanedName}` : rawName;
              return (
                <p className="truncate text-sm sm:text-base font-medium text-gray-700 dark:text-gray-200">
                  Hello, Dr. {greetingName}!
                </p>
              );
            })()}
          </div>

          {/* Right side - Theme Toggle + Notifications + Profile */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors duration-200"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notifications"
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors duration-200 relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {unreadCount}
                  </span>
                )}
              </button>
              {/* Notifications dropdown here... */}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                aria-label="Profile menu"
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors duration-200"
              >
                {(() => {
                  console.log('🔍 TopNavbar - User data:', user);
                  console.log('🔍 TopNavbar - User avatar:', user?.avatar);
                  return user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-8 w-8 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                      onError={(e) => {
                        console.error('❌ TopNavbar: Failed to load avatar image:', user.avatar);
                        console.error('❌ TopNavbar: Image error:', e);
                      }}
                      onLoad={() => {
                        console.log('✅ TopNavbar: Avatar image loaded successfully:', user.avatar);
                      }}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Stethoscope className="h-4 w-4 text-white" />
                    </div>
                  );
                })()}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.specialty || 'Doctor'}</p>
                </div>
                <User className="h-4 w-4 text-gray-400 md:hidden" />
              </button>
              {/* Profile dropdown here... */}
            </div>
          </div>
        </div>
      </div>
    </header>
    </>
  );
};

export default TopNavbar;
