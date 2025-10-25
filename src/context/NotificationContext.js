import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DOCTOR_API_BASE } from '../constants/api';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState(null);

  // Connect to SSE stream
  const connectToStream = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // For SSE, we need to pass the token as a query parameter since EventSource doesn't support custom headers
      const eventSource = new EventSource(`${DOCTOR_API_BASE}/../notifications/stream?token=${encodeURIComponent(token)}`);

      eventSource.onopen = () => {
        console.log('📡 Connected to notification stream');
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleStreamMessage(data);
        } catch (error) {
          console.error('❌ Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        setIsConnected(false);
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (eventSource.readyState === EventSource.CLOSED) {
            console.log('🔄 Attempting to reconnect to notification stream...');
            connectToStream();
          }
        }, 5000);
      };

      setEventSource(eventSource);
    } catch (error) {
      console.error('❌ Failed to create SSE connection:', error);
    }
  }, []);

  // Handle different types of SSE messages
  const handleStreamMessage = useCallback((data) => {
    switch (data.type) {
      case 'connected':
        console.log('📡 Notification stream connected');
        break;
      
      case 'new_notification':
        console.log('🔔 New notification received:', data.notification);
        setNotifications(prev => [data.notification, ...prev]);
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
      const response = await fetch(`${DOCTOR_API_BASE}/../notifications`, {
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
      const response = await fetch(`${DOCTOR_API_BASE}/../notifications/${notificationId}/read`, {
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
      const response = await fetch(`${DOCTOR_API_BASE}/../notifications/read-all`, {
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

  // Initialize connection and load notifications
  useEffect(() => {
    loadNotifications();
    connectToStream();

    return () => {
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
    };
  }, [loadNotifications, connectToStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const value = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    refreshNotifications: loadNotifications
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
