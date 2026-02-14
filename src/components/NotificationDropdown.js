import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';
import { getUnifiedNotificationIcon } from './common/AppIcons';

function NotificationDropdown({ isOpen, onClose, anchorEl, onBadgeCountChange }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'unread'
  const dropdownRef = useRef(null);
  
  // Update badge count whenever notifications change - only when dropdown is open
  // This prevents overwriting Header's initial count with 0 on mount
  useEffect(() => {
    if (onBadgeCountChange && isOpen && !loading) {
      const unreadCount = notifications.filter(n => !n.isRead && !n.read).length;
      onBadgeCountChange(unreadCount);
    }
  }, [notifications, onBadgeCountChange, isOpen, loading]);

  useEffect(() => {
    if (isOpen && currentUser?.id) {
      loadNotifications();
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          anchorEl && !anchorEl.contains(event.target)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, anchorEl]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getUserNotifications(currentUser.id);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    await markNotificationAsRead(notificationId, currentUser.id);
    // Update local state immediately for better UX
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, isRead: true, read: true } : n
    ));
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(currentUser.id);
    // Update local state immediately for better UX
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
  };

  // Navigate to appropriate page based on notification type
  const handleNotificationClick = async (notification) => {
    const isUnread = !notification.isRead && !notification.read;
    
    // Mark as read first
    if (isUnread) {
      await handleMarkAsRead(notification.id);
    }
    
    // Close dropdown
    onClose();
    
    // Navigate based on notification type
    const type = notification.type || notification.Type;
    const relatedId = notification.relatedId || notification.RelatedID;
    
    switch (type) {
      case 'message':
      case 'new_message':
        navigate('/dashboard?section=messages');
        break;
      case 'booking_request':
      case 'new_booking_request':
        navigate('/dashboard?section=bookings');
        break;
      case 'booking_approved':
      case 'booking_confirmed':
        navigate('/dashboard?section=bookings');
        break;
      case 'booking_declined':
      case 'booking_rejected':
      case 'booking_cancelled':
        navigate('/dashboard?section=bookings');
        break;
      case 'booking_reminder':
      case 'booking_rescheduled':
      case 'booking_reminder_24h':
      case 'booking_reminder_1_week':
      case 'event_reminder':
      case 'booking_action_reminder':
        navigate('/dashboard?section=bookings');
        break;
      case 'payment':
      case 'payment_received':
      case 'payment_reminder':
      case 'payment_failed':
      case 'deposit_due':
      case 'final_payment_due':
      case 'refund_processed':
        navigate('/dashboard?section=payments');
        break;
      case 'payout_processed':
        navigate('/dashboard?section=earnings');
        break;
      case 'invoice':
      case 'new_invoice':
      case 'invoice_sent':
      case 'quote_received':
        navigate('/dashboard?section=invoices');
        break;
      case 'review':
      case 'new_review':
      case 'review_request':
        navigate('/dashboard?section=reviews');
        break;
      case 'vendor_approved':
      case 'vendor_rejected':
      case 'vendor_featured':
      case 'vendor_profile_incomplete':
        navigate('/dashboard');
        break;
      case 'support_ticket_opened':
      case 'support_ticket_reply':
      case 'support_ticket_closed':
        navigate('/dashboard?section=support');
        break;
      case 'account_unlocked':
        navigate('/dashboard');
        break;
      case 'promotion':
      case 'promotions':
        navigate('/');
        break;
      case 'newsletter':
        navigate('/');
        break;
      default:
        navigate('/dashboard');
        break;
    }
  };

  // Get notification badge with all types matching email notification types
  // Blue background (#5086E8) with distinctive icon colors per type
  const getNotificationBadge = (type) => {
    const badges = {
      // Booking notifications - calendar orange
      'booking_request': { text: 'booking', bgColor: '#5086E8', iconColor: '#ffffff', icon: 'fa-calendar-plus' },
      'new_booking_request': { text: 'booking', bgColor: '#5086E8', iconColor: '#ffffff', icon: 'fa-calendar-plus' },
      'booking_approved': { text: 'approved', bgColor: '#5086E8', iconColor: '#10b981', icon: 'fa-check-circle' },
      'booking_confirmed': { text: 'confirmed', bgColor: '#5086E8', iconColor: '#10b981', icon: 'fa-check-circle' },
      'booking_declined': { text: 'declined', bgColor: '#5086E8', iconColor: '#ef4444', icon: 'fa-times-circle' },
      'booking_rejected': { text: 'rejected', bgColor: '#5086E8', iconColor: '#ef4444', icon: 'fa-times-circle' },
      'booking_cancelled': { text: 'cancelled', bgColor: '#5086E8', iconColor: '#ef4444', icon: 'fa-ban' },
      'booking_reminder': { text: 'reminder', bgColor: '#5086E8', iconColor: '#fbbf24', icon: 'fa-clock' },
      'booking_update': { text: 'update', bgColor: '#5086E8', iconColor: '#a78bfa', icon: 'fa-sync' },
      'booking_rescheduled': { text: 'rescheduled', bgColor: '#5086E8', iconColor: '#fbbf24', icon: 'fa-calendar-alt' },
      'booking_reminder_24h': { text: 'reminder', bgColor: '#5086E8', iconColor: '#fbbf24', icon: 'fa-clock' },
      'booking_reminder_1_week': { text: 'reminder', bgColor: '#5086E8', iconColor: '#fbbf24', icon: 'fa-clock' },
      'event_reminder': { text: 'reminder', bgColor: '#5086E8', iconColor: '#fbbf24', icon: 'fa-calendar-check' },
      'booking_action_reminder': { text: 'action', bgColor: '#5086E8', iconColor: '#ef4444', icon: 'fa-exclamation-triangle' },
      
      // Message notifications - envelope/chat teal
      'message': { text: 'message', bgColor: '#5086E8', iconColor: '#ffffff', icon: 'fa-envelope' },
      'new_message': { text: 'message', bgColor: '#5086E8', iconColor: '#ffffff', icon: 'fa-envelope' },
      
      // Payment notifications - dollar green
      'payment': { text: 'payment', bgColor: '#5086E8', iconColor: '#34d399', icon: 'fa-credit-card' },
      'payment_received': { text: 'payment', bgColor: '#5086E8', iconColor: '#34d399', icon: 'fa-dollar-sign' },
      'payment_reminder': { text: 'reminder', bgColor: '#5086E8', iconColor: '#fbbf24', icon: 'fa-exclamation-circle' },
      'payment_failed': { text: 'failed', bgColor: '#5086E8', iconColor: '#ef4444', icon: 'fa-times-circle' },
      'deposit_due': { text: 'deposit', bgColor: '#5086E8', iconColor: '#ef4444', icon: 'fa-exclamation-circle' },
      'final_payment_due': { text: 'payment', bgColor: '#5086E8', iconColor: '#ef4444', icon: 'fa-exclamation-circle' },
      'refund_processed': { text: 'refund', bgColor: '#5086E8', iconColor: '#34d399', icon: 'fa-undo' },
      'payout_processed': { text: 'payout', bgColor: '#5086E8', iconColor: '#34d399', icon: 'fa-money-bill-wave' },
      
      // Invoice notifications - document purple
      'invoice': { text: 'invoice', bgColor: '#5086E8', iconColor: '#c4b5fd', icon: 'fa-file-invoice-dollar' },
      'new_invoice': { text: 'invoice', bgColor: '#5086E8', iconColor: '#c4b5fd', icon: 'fa-file-invoice-dollar' },
      'invoice_sent': { text: 'invoice', bgColor: '#5086E8', iconColor: '#c4b5fd', icon: 'fa-file-invoice-dollar' },
      
      // Quote notifications
      'quote_received': { text: 'quote', bgColor: '#5086E8', iconColor: '#a78bfa', icon: 'fa-file-alt' },
      
      // Review notifications - star gold
      'review': { text: 'review', bgColor: '#5086E8', iconColor: '#fbbf24', icon: 'fa-star' },
      'new_review': { text: 'review', bgColor: '#5086E8', iconColor: '#fbbf24', icon: 'fa-star' },
      'review_request': { text: 'review', bgColor: '#5086E8', iconColor: '#fbbf24', icon: 'fa-star-half-alt' },
      
      // Vendor notifications
      'vendor_approved': { text: 'approved', bgColor: '#5086E8', iconColor: '#10b981', icon: 'fa-check-circle' },
      'vendor_rejected': { text: 'rejected', bgColor: '#5086E8', iconColor: '#ef4444', icon: 'fa-times-circle' },
      'vendor_featured': { text: 'featured', bgColor: '#5086E8', iconColor: '#fbbf24', icon: 'fa-award' },
      'vendor_profile_incomplete': { text: 'profile', bgColor: '#5086E8', iconColor: '#fbbf24', icon: 'fa-user-edit' },
      
      // Support notifications
      'support_ticket_opened': { text: 'support', bgColor: '#5086E8', iconColor: '#67e8f9', icon: 'fa-ticket-alt' },
      'support_ticket_reply': { text: 'support', bgColor: '#5086E8', iconColor: '#67e8f9', icon: 'fa-reply' },
      'support_ticket_closed': { text: 'resolved', bgColor: '#5086E8', iconColor: '#10b981', icon: 'fa-check-circle' },
      
      // Account notifications
      'account_unlocked': { text: 'account', bgColor: '#5086E8', iconColor: '#10b981', icon: 'fa-unlock' },
      
      // Promotion notifications - tag orange
      'promotion': { text: 'promo', bgColor: '#5086E8', iconColor: '#fb923c', icon: 'fa-tag' },
      'promotions': { text: 'promo', bgColor: '#5086E8', iconColor: '#fb923c', icon: 'fa-tag' },
      
      // Newsletter - newspaper cyan
      'newsletter': { text: 'news', bgColor: '#5086E8', iconColor: '#67e8f9', icon: 'fa-newspaper' },
      
      // Announcement - megaphone yellow
      'announcement': { text: 'announcement', bgColor: '#5086E8', iconColor: '#fbbf24', icon: 'fa-bullhorn' },
      
      // General - bell white
      'notification': { text: 'notification', bgColor: '#5086E8', iconColor: '#ffffff', icon: 'fa-bell' }
    };
    return badges[type] || { text: 'notification', bgColor: '#5086E8', iconColor: '#ffffff', icon: 'fa-bell' };
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Recently';
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    try {
      return date.toLocaleDateString();
    } catch (e) {
      return 'Recently';
    }
  };

  if (!isOpen) return null;

  // Filter notifications based on active tab
  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.isRead && !n.read)
    : notifications;

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: anchorEl ? anchorEl.getBoundingClientRect().bottom + 8 : '60px',
        right: '20px',
        width: '400px',
        maxHeight: '550px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Notifications</h3>
        {notifications.filter(n => !n.isRead && !n.read).length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            style={{
              background: '#222',
              border: 'none',
              color: 'white',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '6px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#444'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#222'}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: 'white'
      }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'all' ? '2px solid #222' : '2px solid transparent',
            color: activeTab === 'all' ? '#222' : '#9ca3af',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-1px'
          }}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'unread' ? '2px solid #222' : '2px solid transparent',
            color: activeTab === 'unread' ? '#222' : '#9ca3af',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-1px'
          }}
        >
          Unread
        </button>
      </div>

      {/* Notifications List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        maxHeight: '400px',
        backgroundColor: '#ffffff'
      }}>
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto' }}></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <i className="fas fa-bell" style={{ fontSize: '32px', opacity: 0.3, marginBottom: '12px', display: 'block' }}></i>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
              {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const badge = getNotificationBadge(notification.type);
            const isUnread = !notification.isRead && !notification.read;
            
            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  backgroundColor: isUnread ? '#fafbfc' : 'white',
                  transition: 'background-color 0.15s',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isUnread ? '#fafbfc' : 'white';
                }}
              >
                {/* Icon - Unified SVG notification icon with fallback */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  <img 
                    src={getUnifiedNotificationIcon(notification.type)} 
                    alt={notification.type}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      // Fallback to Font Awesome icon if SVG fails to load
                      e.target.style.display = 'none';
                      e.target.parentElement.style.background = '#4285f4';
                      e.target.parentElement.style.display = 'flex';
                      e.target.parentElement.style.alignItems = 'center';
                      e.target.parentElement.style.justifyContent = 'center';
                      const fallbackIcon = document.createElement('i');
                      fallbackIcon.className = `fas ${badge.icon}`;
                      fallbackIcon.style.cssText = 'color: #ffffff; font-size: 18px;';
                      e.target.parentElement.appendChild(fallbackIcon);
                    }}
                  />
                </div>
                
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#111827',
                      lineHeight: '1.3'
                    }}>
                      {notification.title || 'New Notification'}
                    </div>
                    {isUnread && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#5086E8',
                        flexShrink: 0,
                        marginLeft: '8px',
                        marginTop: '4px'
                      }}></div>
                    )}
                  </div>
                  
                  <div style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    marginBottom: '6px',
                    lineHeight: '1.4',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {notification.message || 'You have a new notification'}
                  </div>
                  
                  <div style={{
                    fontSize: '12px',
                    color: '#9ca3af'
                  }}>
                    {formatTime(notification.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center',
          backgroundColor: 'white'
        }}>
          <button
            onClick={() => {
              onClose();
              navigate('/dashboard?section=notifications');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#222',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '4px 8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
