import React, { useState } from 'react';
import { Menu, Bell, User, X, Home, Users, QrCode, UserCircle, Settings, LogOut, Stethoscope, Sun, Moon, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const GlobalNavbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
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
    { name: 'Profile', href: '/profile', icon: UserCircle },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isCurrentPath = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-50 ${sidebarOpen ? 'block' : 'hidden'}`} style={{ display: sidebarOpen ? 'block' : 'none' }}>
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 shadow-xl">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">HealthVault</h2>
            </div>
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
              const isActive = isCurrentPath(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 mb-1 ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
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

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo and Mobile menu */}
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                className="p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors duration-200 md:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Logo */}
              <Link to="/dashboard" className="flex items-center space-x-2">
                <Heart className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100 hidden sm:block">
                  HealthVault
                </span>
              </Link>
            </div>

            {/* Center - Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isCurrentPath(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

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
                
                {/* Notifications dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            notification.unread ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <p className="text-sm text-gray-900 dark:text-gray-100">{notification.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notification.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  aria-label="Profile menu"
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors duration-200"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-8 w-8 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Stethoscope className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.specialty || 'Doctor'}</p>
                  </div>
                  <User className="h-4 w-4 text-gray-400 md:hidden" />
                </button>
                
                {/* Profile dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <UserCircle className="h-4 w-4 mr-3" />
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Settings
                      </Link>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Click outside to close dropdowns */}
      {(notificationsOpen || profileOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setNotificationsOpen(false);
            setProfileOpen(false);
          }}
        />
      )}
    </>
  );
};

export default GlobalNavbar;
