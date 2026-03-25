import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../constants/api';

const NotificationContext = createContext();

const normalizeNotification = (notification) => {
  if (!notification || typeof notification !== "object") return null;
  const id = String(
    notification.id ||
      notification._id ||
      notification.notificationId ||
      ""
  ).trim();
  if (!id) return null;
  return {
    ...notification,
    id,
    read: notification.read === true,
  };
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);
  const [highlightedNotificationIds, setHighlightedNotificationIds] = useState(
    []
  );


  // Handle different types of SSE messages
  const handleStreamMessage = useCallback((data) => {
    switch (data.type) {
      case 'connected':
        console.log('📡 Notification stream connected');
        break;

      case 'new_notification':
        console.log('🔔 New notification received:', data.notification);
        {
          const normalized = normalizeNotification(data.notification);
          if (!normalized) break;
          setNotifications((prev) => [
            normalized,
            ...prev.filter((entry) => entry.id !== normalized.id),
          ]);
          setHighlightedNotificationIds((prev) => [
            normalized.id,
            ...prev.filter((id) => id !== normalized.id),
          ]);
          setTimeout(() => {
            setHighlightedNotificationIds((prev) =>
              prev.filter((id) => id !== normalized.id)
            );
          }, 10000);
          // Show toast preview
          setToastNotification(normalized);
          // Auto-hide toast after 5 seconds
          setTimeout(() => setToastNotification(null), 5000);
        }
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

    try {
      const response = await fetch(`${API_BASE}/notifications`, {
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const normalized = Array.isArray(data?.data?.notifications)
            ? data.data.notifications
                .map((entry) => normalizeNotification(entry))
                .filter(Boolean)
            : [];
          setNotifications(normalized);
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

    try {
      const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

    try {
      const response = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PUT',
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

    try {
      const response = await fetch(`${API_BASE}/notifications`, {
        method: 'DELETE',
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;

    let es = null;
    try {
      es = new EventSource(`${API_BASE}/notifications/stream`, {
        withCredentials: true,
      });

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
      highlightedNotificationIds,
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
