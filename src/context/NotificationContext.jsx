import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../constants/api';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);


  // Handle different types of SSE messages
  const handleStreamMessage = useCallback((data) => {
    switch (data.type) {
      case 'connected':
        console.log('📡 Notification stream connected');
        break;

      case 'new_notification':
        console.log('🔔 New notification received:', data.notification);
        setNotifications(prev => [data.notification, ...prev]);
        // Show toast preview
        setToastNotification(data.notification);
        // Auto-hide toast after 5 seconds
        setTimeout(() => setToastNotification(null), 5000);
        break;

      case 'unread_count':
        console.log('📊 Unread count updated:', data.count);
        setUnreadCount(data.count);
        break;

      case 'heartbeat':
        // Keep connection alive
        break;

      default:
        console.log('📡 Unknown message type:', data.type);
    }
  }, []);

  // Load initial notifications
  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data.notifications);
          setUnreadCount(data.data.unreadCount);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load notifications:', error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
    }
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/notifications`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('❌ Failed to clear all notifications:', error);
    }
  }, []);

  // Initialize connection and load notifications
  useEffect(() => {
    loadNotifications();

    // For SSE, we need to pass the token as a query parameter
    const token = localStorage.getItem('token');
    if (!token) return;

    let es = null;
    try {
      es = new EventSource(`${API_BASE}/notifications/stream?token=${encodeURIComponent(token)}`);

      es.onopen = () => {
        console.log('📡 Connected to notification stream');
        setIsConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleStreamMessage(data);
        } catch (err) {
          console.error('❌ Error parsing SSE message:', err);
        }
      };

      es.onerror = (err) => {
        console.error('❌ SSE connection error:', err);
        setIsConnected(false);
        // EventSource will automatically attempt to reconnect
      };

      setEventSource(es);
    } catch (err) {
      console.error('❌ Failed to create SSE connection:', err);
    }

    return () => {
      if (es) {
        console.log('📡 Closing SSE connection');
        es.close();
      }
    };
  }, [loadNotifications, handleStreamMessage]);

  const value = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    refreshNotifications: loadNotifications,
    toastNotification,
    setToastNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
