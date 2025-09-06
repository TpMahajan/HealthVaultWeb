import React, { useState } from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TopNavbar = ({ onMenuClick }) => {
  const { user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifications = [
    { id: 1, message: 'New patient QR scanned', time: '2 minutes ago', unread: true },
    { id: 2, message: 'Medical report ready for review', time: '15 minutes ago', unread: true },
    { id: 3, message: 'Appointment reminder: John Doe at 2:00 PM', time: '1 hour ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu button */}
          <div>
            <button
              onClick={onMenuClick}
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
                  Hello, {greetingName}!
                </p>
              );
            })()}
          </div>

          {/* Right side - Notifications + Profile */}
          <div className="flex items-center space-x-4">
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
                <img
                  className="h-8 w-8 rounded-full object-cover"
                  src={user?.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face'}
                  alt={user?.name}
                />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.specialty}</p>
                </div>
                <User className="h-4 w-4 text-gray-400 md:hidden" />
              </button>
              {/* Profile dropdown here... */}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
