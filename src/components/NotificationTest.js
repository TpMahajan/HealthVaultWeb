import React, { useState } from 'react';
import { Bell, Send, CheckCircle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { DOCTOR_API_BASE } from '../constants/api';

const NotificationTest = () => {
  const { notifications, unreadCount, isConnected, markAsRead, markAllAsRead } = useNotifications();
  const [testTitle, setTestTitle] = useState('Test Notification');
  const [testBody, setTestBody] = useState('This is a test notification from the dashboard');
  const [isSending, setIsSending] = useState(false);

  const sendTestNotification = async () => {
    setIsSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${DOCTOR_API_BASE}/../notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: testTitle,
          body: testBody,
          type: 'general'
        })
      });

      if (response.ok) {
        console.log('✅ Test notification sent successfully');
      } else {
        console.error('❌ Failed to send test notification');
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
    } finally {
      setIsSending(false);
    }
  };

  const triggerReminders = async () => {
    setIsSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${DOCTOR_API_BASE}/../notifications/trigger-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        console.log('✅ Reminders triggered successfully');
      } else {
        console.error('❌ Failed to trigger reminders');
      }
    } catch (error) {
      console.error('❌ Error triggering reminders:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Real-time Notification Test
        </h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Form */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Send Test Notification
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              placeholder="Notification title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Body
            </label>
            <textarea
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              placeholder="Notification body"
            />
          </div>

          <button
            onClick={sendTestNotification}
            disabled={isSending}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-3"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test Notification
              </>
            )}
          </button>

          <button
            onClick={triggerReminders}
            disabled={isSending}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Triggering...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Trigger All Reminders
              </>
            )}
          </button>
        </div>

        {/* Notification Stats */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Notification Stats
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Unread Count
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {unreadCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Total Notifications
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {notifications.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Recent Notifications
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border ${
                  !notification.read 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {notification.body}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {notification.timeAgo || new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationTest;
