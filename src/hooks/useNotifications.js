import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

/**
 * Custom hook to manage notifications
 * Fetches and updates notification count for the current user
 */
export function useNotifications() {
  const { currentUser } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load notification count
  const loadNotificationCount = async () => {
    if (!currentUser?.id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/user/${currentUser.id}/unread-count`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotificationCount(data.unreadCount || 0);
      }
    } catch (error) {
      // Fallback: use unread messages as notification count
      try {
        const msgResponse = await fetch(`${API_BASE_URL}/messages/unread-count/${currentUser.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (msgResponse.ok) {
          const msgData = await msgResponse.json();
          setNotificationCount(msgData.unreadCount || 0);
        }
      } catch (e) {
        console.error('Failed to load notification count:', e);
      }
    }
  };

  // Load all notifications
  const loadNotifications = async () => {
    if (!currentUser?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/user/${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    if (!currentUser?.id) return;

    try {
      await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Refresh count and notifications
      await loadNotificationCount();
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!currentUser?.id) return;

    try {
      await fetch(`${API_BASE_URL}/notifications/user/${currentUser.id}/read-all`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Refresh count and notifications
      await loadNotificationCount();
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Load notification count on mount and set up polling
  useEffect(() => {
    loadNotificationCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotificationCount, 30000);
    
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  return {
    notificationCount,
    notifications,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    refreshCount: loadNotificationCount
  };
}
