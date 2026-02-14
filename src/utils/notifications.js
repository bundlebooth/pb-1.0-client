import { API_BASE_URL } from '../config';

// Update favicon with red notification dot
let originalFavicon = null;
function updateFaviconWithNotification(hasNotifications) {
  const favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
  if (!favicon) return;
  
  // Store original favicon URL
  if (!originalFavicon) {
    originalFavicon = favicon.href;
  }
  
  if (!hasNotifications) {
    // Restore original favicon
    favicon.href = originalFavicon;
    return;
  }
  
  // Create canvas to draw favicon with red dot
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    // Draw original favicon
    ctx.drawImage(img, 0, 0, 32, 32);
    
    // Draw solid red notification dot in bottom-right corner
    ctx.beginPath();
    ctx.arc(26, 26, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    
    // Update favicon
    favicon.href = canvas.toDataURL('image/png');
  };
  img.onerror = () => {
    // If image fails to load, just skip the favicon update
    console.warn('Failed to load favicon for notification dot');
  };
  img.src = originalFavicon;
}

// Update page title with notification count
export function updatePageTitle(notificationCount) {
  const baseTitle = 'Planbeau - Event Booking Platform';
  if (notificationCount > 0) {
    document.title = `(${notificationCount}) ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
  
  // Update favicon with red dot indicator
  updateFaviconWithNotification(notificationCount > 0);
}

// Create notification via API
export async function createNotification(notificationData) {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(notificationData)
    });
    
    if (response.ok) {
      return true;
    }
    
    // Fallback: Create notification locally
    createLocalNotification(notificationData.userId, notificationData.type, notificationData.title, notificationData.message);
    return false;
  } catch (error) {
    createLocalNotification(notificationData.userId, notificationData.type, notificationData.title, notificationData.message);
    return false;
  }
}

// Fallback function to create notifications locally
export function createLocalNotification(userId, type, title, message) {
  const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
  
  const newNotification = {
    id: `notif_${Date.now()}`,
    userId: userId,
    type: type,
    title: title,
    message: message,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  
  notifications.push(newNotification);
  localStorage.setItem('notifications', JSON.stringify(notifications));
  
  return newNotification;
}

// Get unread notification count
export async function getUnreadNotificationCount(userId) {
  try {
    if (!userId) return 0;
    
    // Try API first
    const response = await fetch(`${API_BASE_URL}/notifications/user/${userId}/unread-count`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const apiCount = data.unreadCount || 0;
      
      // Also check local notifications and return the higher count
      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      const localCount = notifications.filter(n => 
        (n.userId === userId || n.userId === String(userId) || String(n.userId) === String(userId)) && 
        !n.isRead && !n.read
      ).length;
      
      return Math.max(apiCount, localCount);
    }
    
    // Fallback to local notifications
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    return notifications.filter(n => 
      (n.userId === userId || n.userId === String(userId) || String(n.userId) === String(userId)) && 
      !n.isRead && !n.read
    ).length;
  } catch (error) {
    // Fallback to local notifications
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    return notifications.filter(n => 
      (n.userId === userId || n.userId === String(userId) || String(n.userId) === String(userId)) && 
      !n.isRead && !n.read
    ).length;
  }
}

// Get all notifications for a user
export async function getUserNotifications(userId) {
  try {
    if (!userId) return [];
    
    // Try API first
    const response = await fetch(`${API_BASE_URL}/notifications/user/${userId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      let notifications = data.notifications || data || [];
      
      // Ensure notifications is an array
      if (!Array.isArray(notifications)) {
        notifications = [];
      }
      
      // Process and normalize notification data - matching original code structure
      notifications = notifications.map(notif => {
        // Handle different API response formats (prioritize original code field names)
        const notification = {
          id: notif.NotificationID || notif.id || notif.notification_id,
          userId: notif.UserID || notif.userId || notif.user_id,
          type: notif.Type || notif.type || notif.notification_type || 'notification',
          title: notif.Title || notif.title || notif.notification_title || 'New Notification',
          message: notif.Message || notif.message || notif.notification_message || notif.content || notif.Content || 'You have a new notification',
          isRead: notif.IsRead || notif.isRead || notif.is_read || notif.read || false,
          read: notif.Read || notif.read || notif.IsRead || notif.isRead || false,
          createdAt: notif.CreatedAt || notif.createdAt || notif.created_at || notif.timestamp || new Date().toISOString(),
          // Preserve additional fields for potential use
          relatedType: notif.RelatedType || notif.relatedType,
          relatedId: notif.RelatedID || notif.relatedId,
          actionUrl: notif.ActionURL || notif.actionUrl
        };
        
        return notification;
      });
      
      // Sort by creation date (newest first)
      notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return notifications;
    }
    
    // Fallback to local notifications
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    return notifications.filter(n => 
      n.userId === userId || n.userId === String(userId) || String(n.userId) === String(userId)
    ).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Fallback to local notifications
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    return notifications.filter(n => 
      n.userId === userId || n.userId === String(userId) || String(n.userId) === String(userId)
    ).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId, userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      return true;
    }
    
    // Fallback to local
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      notification.read = true;
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
    return false;
  } catch (error) {
    // Fallback to local
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      notification.read = true;
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
    return false;
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/user/${userId}/read-all`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      // Also update local storage
      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      notifications.forEach(n => {
        if (n.userId === userId || n.userId === String(userId)) {
          n.isRead = true;
          n.read = true;
        }
      });
      localStorage.setItem('notifications', JSON.stringify(notifications));
      return true;
    }
    
    // Fallback to local
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    notifications.forEach(n => {
      if (n.userId === userId || n.userId === String(userId)) {
        n.isRead = true;
        n.read = true;
      }
    });
    localStorage.setItem('notifications', JSON.stringify(notifications));
    return false;
  } catch (error) {
    // Fallback to local
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    notifications.forEach(n => {
      if (n.userId === userId || n.userId === String(userId)) {
        n.isRead = true;
        n.read = true;
      }
    });
    localStorage.setItem('notifications', JSON.stringify(notifications));
    return false;
  }
}

// Clear all notifications for a user
export async function clearAllNotifications(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/user/${userId}/clear-all`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      return true;
    }
    
    // Fallback to local
    localStorage.setItem('notifications', JSON.stringify([]));
    return false;
  } catch (error) {
    // Fallback to local
    localStorage.setItem('notifications', JSON.stringify([]));
    return false;
  }
}

// Create sample notifications for testing (can be called from console)
export function createSampleNotifications(userId) {
  const sampleNotifications = [
    {
      id: `notif_${Date.now()}_1`,
      userId: userId,
      type: 'message',
      title: 'New Message',
      message: 'You have a new message from samtest',
      isRead: false,
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 min ago
    },
    {
      id: `notif_${Date.now()}_2`,
      userId: userId,
      type: 'new_message',
      title: 'New Message',
      message: 'You have a new message from samtest',
      isRead: false,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 min ago
    },
    {
      id: `notif_${Date.now()}_3`,
      userId: userId,
      type: 'booking_approved',
      title: 'Request Approved!',
      message: 'Your booking request has been approved. You can now proceed to payment.',
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2h ago
    },
    {
      id: `notif_${Date.now()}_4`,
      userId: userId,
      type: 'booking_request',
      title: 'New Booking Request',
      message: 'You have a new booking request from Sarah Johnson for Wedding Photography',
      isRead: false,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4h ago
    },
    {
      id: `notif_${Date.now()}_5`,
      userId: userId,
      type: 'booking_declined',
      title: 'Booking Declined',
      message: 'Your booking request for Elite Catering has been declined',
      isRead: true,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1d ago
    },
    {
      id: `notif_${Date.now()}_6`,
      userId: userId,
      type: 'booking_reminder',
      title: 'Upcoming Booking Reminder',
      message: 'Reminder: You have a booking with Dream Venues tomorrow at 2:00 PM',
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2d ago
    },
    {
      id: `notif_${Date.now()}_7`,
      userId: userId,
      type: 'payment_received',
      title: 'Payment Received',
      message: 'Payment of $500 has been received for booking #12345',
      isRead: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3d ago
    },
    {
      id: `notif_${Date.now()}_8`,
      userId: userId,
      type: 'new_invoice',
      title: 'New Invoice',
      message: 'You have received a new invoice from Premium Photography for $1,200',
      isRead: false,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() // 4d ago
    },
    {
      id: `notif_${Date.now()}_9`,
      userId: userId,
      type: 'new_review',
      title: 'New Review',
      message: 'Sarah Johnson left you a 5-star review!',
      isRead: true,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5d ago
    },
    {
      id: `notif_${Date.now()}_10`,
      userId: userId,
      type: 'promotion',
      title: 'Special Offer',
      message: 'Get 20% off your next booking with code SAVE20',
      isRead: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7d ago
    }
  ];
  
  localStorage.setItem('notifications', JSON.stringify(sampleNotifications));
  return sampleNotifications;
}
