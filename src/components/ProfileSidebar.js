import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUnifiedNotificationIcon } from './common/AppIcons';
import { API_BASE_URL } from '../config';
import { useTranslation } from '../hooks/useTranslation';
import { buildBecomeVendorUrl } from '../utils/urlHelpers';
import { encodeUserId } from '../utils/hashIds';
import { formatTimeAgo } from '../utils/helpers';
import './ProfileSidebar.css';

/**
 * Airbnb-Style Profile Sidebar
 * 
 * For Clients: Elegant profile menu with quick actions, "Become a Vendor" promo
 * For Vendors: Same elegant menu PLUS "Switch to hosting" button at bottom
 * 
 * This is NOT a dashboard - it's a lightweight profile menu like Airbnb's
 */
function ProfileSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { t } = useTranslation();
  
  const [hasVendorProfile, setHasVendorProfile] = useState(false);
  const [vendorCheckLoading, setVendorCheckLoading] = useState(true);
  const [notificationCounts, setNotificationCounts] = useState({
    pendingBookings: 0,
    unreadMessages: 0,
    pendingReviews: 0
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [vendorLogoUrl, setVendorLogoUrl] = useState(null);
  const [userProfilePic, setUserProfilePic] = useState(null);
  
  // What's New / Announcements state
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  
  // Quick actions carousel state
  const [activeQuickAction, setActiveQuickAction] = useState(0);
  const carouselRef = React.useRef(null);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [isOpen]);

  // Check vendor profile status and get logo
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const checkVendorProfile = async () => {
      setVendorCheckLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/vendors/profile?userId=${currentUser.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          setHasVendorProfile(!!data.vendorProfileId);
          
          // Get vendor logo URL
          const logoUrl = data.logoUrl || data.LogoURL || data.data?.profile?.LogoURL || data.data?.profile?.logoUrl;
          if (logoUrl) {
            setVendorLogoUrl(logoUrl);
          }
        }
      } catch (error) {
        console.error('Failed to check vendor profile:', error);
      } finally {
        setVendorCheckLoading(false);
      }
    };
    
    checkVendorProfile();
  }, [currentUser?.id]);

  // Fetch user profile picture from UserProfiles table
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const fetchUserProfile = async () => {
      try {
        // Use user-profile endpoint which returns data from UserProfiles table
        const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/user-profile`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          // Extract profile picture from the nested response structure
          const pic = data.profile?.ProfileImageURL || data.user?.ProfileImageURL || 
                      data.ProfilePicture || data.profilePicture || data.ProfileImageURL;
          if (pic) {
            setUserProfilePic(pic);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [currentUser?.id]);

  // Load notification counts
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const loadNotificationCounts = async () => {
      try {
        let unreadMessages = 0;
        let pendingReviews = 0;
        
        // Get unread messages count
        try {
          const clientMsgResp = await fetch(`${API_BASE_URL}/messages/conversations/user/${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (clientMsgResp.ok) {
            const data = await clientMsgResp.json();
            const convs = data.conversations || data || [];
            unreadMessages = convs.reduce((sum, c) => {
              const count = c.unreadCount || c.UnreadCount || c.unread_count || c.Unread || 0;
              return sum + (typeof count === 'number' ? count : parseInt(count) || 0);
            }, 0);
          }
        } catch (e) { console.error('Error fetching messages:', e); }
        
        // Get pending reviews count
        try {
          const bookingsResp = await fetch(`${API_BASE_URL}/users/${currentUser.id}/bookings/all`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (bookingsResp.ok) {
            const bookings = await bookingsResp.json();
            const reviewsResp = await fetch(`${API_BASE_URL}/users/${currentUser.id}/reviews`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const reviewsData = reviewsResp.ok ? await reviewsResp.json() : [];
            const reviewedBookingIds = new Set((Array.isArray(reviewsData) ? reviewsData : []).map(r => r.BookingID));
            const now = new Date();
            pendingReviews = (bookings || []).filter(b => {
              const eventDate = new Date(b.EventDate);
              const isPast = eventDate < now;
              const isPaid = b.FullAmountPaid === true || b.FullAmountPaid === 1 || 
                           (b.Status || '').toLowerCase() === 'paid';
              const notReviewed = !reviewedBookingIds.has(b.BookingID);
              return isPast && isPaid && notReviewed;
            }).length;
          }
        } catch (e) { console.error('Error fetching reviews:', e); }
        
        setNotificationCounts({ pendingBookings: 0, unreadMessages, pendingReviews });
      } catch (error) {
        console.error('Error loading notification counts:', error);
      }
    };
    
    loadNotificationCounts();
  }, [currentUser?.id]);

  // Fetch notifications when sidebar opens (for badge count)
  useEffect(() => {
    if (isOpen && currentUser?.id) {
      // Fetch notifications silently for badge count
      const fetchNotificationsForBadge = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/notifications/user/${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (response.ok) {
            const data = await response.json();
            const notifs = Array.isArray(data) ? data : data.notifications || [];
            setNotifications(notifs);
          }
        } catch (error) {
          console.error('Error fetching notifications for badge:', error);
        }
      };
      fetchNotificationsForBadge();
    }
  }, [isOpen, currentUser?.id]);

  // Fetch notifications when opening notifications view
  const fetchNotifications = async () => {
    if (!currentUser?.id) return;
    setNotificationsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/user/${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const notifs = Array.isArray(data) ? data : data.notifications || [];
        setNotifications(notifs);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(true);
    fetchNotifications();
  };

  const handleBackFromNotifications = () => {
    setShowNotifications(false);
  };

  // Mark notification as read (keep in list, just mark as read)
  const markNotificationAsRead = async (notificationId) => {
    if (!currentUser?.id || !notificationId) return;
    try {
      await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      // Mark as read locally instead of removing
      setNotifications(prev => prev.map(n => {
        const nId = n.id || n.ID || n.NotificationID;
        if (nId === notificationId) {
          return { ...n, IsRead: true, isRead: true };
        }
        return n;
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle notification click - mark as read and navigate to relevant page
  const handleNotificationItemClick = async (notification, notificationId) => {
    // Mark as read first
    await markNotificationAsRead(notificationId);
    
    // Get notification type and related ID for navigation
    const notificationType = (notification.type || notification.Type || '').toLowerCase();
    const relatedId = notification.RelatedID || notification.relatedId || notification.related_id;
    
    // Navigate based on notification type
    let targetPath = null;
    
    switch (notificationType) {
      case 'booking':
      case 'booking_request':
      case 'booking_confirmed':
      case 'booking_cancelled':
      case 'booking_pending':
      case 'booking_completed':
        targetPath = '/bookings';
        break;
      case 'message':
      case 'new_message':
      case 'chat':
        targetPath = '/messages';
        break;
      case 'review':
      case 'new_review':
      case 'review_received':
        targetPath = '/reviews';
        break;
      case 'payment':
      case 'payout':
      case 'payment_received':
      case 'payment_sent':
        targetPath = '/payments';
        break;
      case 'vendor':
      case 'vendor_update':
      case 'vendor_approved':
      case 'vendor_rejected':
        targetPath = '/vendor/dashboard';
        break;
      case 'profile':
      case 'profile_update':
      case 'account':
        targetPath = '/settings';
        break;
      case 'favorite':
      case 'favourited':
      case 'liked':
        targetPath = '/favorites';
        break;
      case 'inquiry':
      case 'new_inquiry':
        targetPath = '/inquiries';
        break;
      case 'system':
      case 'announcement':
      case 'general':
      case 'info':
      case 'welcome':
        // System notifications - just mark as read, no navigation
        break;
      default:
        // For unknown types, navigate to notifications or just mark as read
        break;
    }
    
    if (targetPath) {
      navigate(targetPath);
      onClose();
    }
  };

  // Clear all NEW notifications (mark as read, don't delete)
  const clearAllNotifications = async () => {
    if (!currentUser?.id) return;
    try {
      await fetch(`${API_BASE_URL}/notifications/user/${currentUser.id}/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      // Mark all as read locally instead of removing them
      setNotifications(prev => prev.map(n => ({ ...n, IsRead: true, isRead: true })));
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/public/announcements/all`);
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  const handleAnnouncementsClick = () => {
    setShowAnnouncements(true);
    fetchAnnouncements();
  };

  const handleBackFromAnnouncements = () => {
    setShowAnnouncements(false);
  };

  // Get announcement type styles
  const getAnnouncementStyle = (type) => {
    const styles = {
      'warning': { icon: 'fa-exclamation-triangle', iconColor: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
      'success': { icon: 'fa-check-circle', iconColor: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)' },
      'promo': { icon: 'fa-gift', iconColor: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)' },
      'news': { icon: 'fa-newspaper', iconColor: '#5086E8', bgColor: 'rgba(80, 134, 232, 0.15)' },
      'info': { icon: 'fa-info-circle', iconColor: '#5086E8', bgColor: 'rgba(80, 134, 232, 0.15)' },
    };
    return styles[type] || styles['info'];
  };

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userSession');
    localStorage.removeItem('viewMode');
    
    if (logout) {
      logout();
    }
    
    window.location.replace('/');
  };

  // Client profile sidebar should ONLY show user profile picture, never vendor logo
  // Vendor logo is only for vendor dashboard/vendor mode contexts
  const profilePic = userProfilePic || currentUser?.profilePicture || currentUser?.profileImageURL || currentUser?.ProfilePicture;

  if (!isOpen || !currentUser) return null;

  // Helper to get proper notification message
  const getNotificationMessage = (notification) => {
    const type = notification.type || notification.Type || '';
    const title = notification.title || notification.Title || '';
    const message = notification.message || notification.Message || '';
    const data = notification.data || notification.Data || {};
    
    // If message looks like actual content (not just a word), use it
    if (message && message.length > 10 && message.includes(' ')) {
      return message;
    }
    
    // If title looks like actual content, use it
    if (title && title.length > 10 && title.includes(' ')) {
      return title;
    }
    
    // Generate contextual message based on type
    const senderName = data.senderName || data.SenderName || data.from || 'Someone';
    const vendorName = data.vendorName || data.VendorName || '';
    const packageName = data.packageName || data.PackageName || data.serviceName || '';
    
    switch (type.toLowerCase()) {
      case 'message':
      case 'new_message':
        return `You have a new message from ${senderName}`;
      case 'booking':
      case 'booking_request':
        return packageName ? `New booking request for ${packageName}` : 'You have a new booking request';
      case 'booking_approved':
      case 'booking_confirmed':
        return vendorName ? `${vendorName} accepted your booking request${packageName ? ` for ${packageName}` : ''}` : 'Your booking has been approved';
      case 'booking_declined':
        return 'Your booking request was declined';
      case 'booking_cancelled':
        return 'A booking has been cancelled';
      case 'booking_reminder':
        return 'Reminder: You have an upcoming booking';
      case 'payment':
      case 'payment_received':
        return 'Payment received successfully';
      case 'review':
        return 'You have a new review';
      case 'promotion':
        return 'New promotion available';
      case 'announcement':
        return title || 'New announcement';
      default:
        // Fallback: use whatever we have
        return message || title || 'New notification';
    }
  };

  // Get notification icon style - uses centralized NotificationIconStyles from AppIcons
  // Import: import { getNotificationIconStyle } from './common/AppIcons';
  const getNotificationStyle = (type) => {
    // Using centralized styles from AppIcons.js for consistency across app
    const centralizedStyles = {
      'message': { icon: 'fa-envelope', iconColor: '#5086E8' },
      'new_message': { icon: 'fa-envelope', iconColor: '#5086E8' },
      'booking': { icon: 'fa-calendar-plus', iconColor: '#5086E8' },
      'booking_request': { icon: 'fa-calendar-plus', iconColor: '#5086E8' },
      'new_booking_request': { icon: 'fa-calendar-plus', iconColor: '#5086E8' },
      'booking_approved': { icon: 'fa-check-circle', iconColor: '#10b981' },
      'booking_confirmed': { icon: 'fa-check-circle', iconColor: '#10b981' },
      'booking_declined': { icon: 'fa-times-circle', iconColor: '#ef4444' },
      'booking_rejected': { icon: 'fa-times-circle', iconColor: '#ef4444' },
      'booking_cancelled': { icon: 'fa-ban', iconColor: '#ef4444' },
      'booking_reminder': { icon: 'fa-clock', iconColor: '#fbbf24' },
      'booking_update': { icon: 'fa-sync', iconColor: '#a78bfa' },
      'payment': { icon: 'fa-credit-card', iconColor: '#34d399' },
      'payment_received': { icon: 'fa-dollar-sign', iconColor: '#34d399' },
      'payment_reminder': { icon: 'fa-exclamation-circle', iconColor: '#fbbf24' },
      'invoice': { icon: 'fa-file-invoice-dollar', iconColor: '#c4b5fd' },
      'new_invoice': { icon: 'fa-file-invoice-dollar', iconColor: '#c4b5fd' },
      'review': { icon: 'fa-star', iconColor: '#fbbf24' },
      'new_review': { icon: 'fa-star', iconColor: '#fbbf24' },
      'promotion': { icon: 'fa-tag', iconColor: '#fb923c' },
      'promotions': { icon: 'fa-tag', iconColor: '#fb923c' },
      'newsletter': { icon: 'fa-newspaper', iconColor: '#67e8f9' },
      'announcement': { icon: 'fa-bullhorn', iconColor: '#fbbf24' },
      'general': { icon: 'fa-bell', iconColor: '#f59e0b' },
    };
    return centralizedStyles[type] || { icon: 'fa-bell', iconColor: '#f59e0b' };
  };

  // Notifications View
  if (showNotifications) {
    return (
      <>
        <div className="profile-sidebar-overlay" onClick={onClose} />
        <div className="profile-sidebar">
          {/* Notifications Header */}
          <div className="profile-sidebar-header">
            <button className="profile-sidebar-icon-btn" onClick={handleBackFromNotifications}>
              <i className="fas fa-arrow-left"></i>
            </button>
            <div style={{ flex: 1 }}></div>
            <button className="profile-sidebar-icon-btn profile-sidebar-close" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="profile-sidebar-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 className="profile-sidebar-page-title" style={{ margin: 0 }}>Notifications</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                {notifications.filter(n => !n.IsRead && !n.isRead).length > 0 && (
                  <button 
                    onClick={clearAllNotifications}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#5086E8',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(80, 134, 232, 0.1)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    Mark as read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button 
                    onClick={clearAllNotifications}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#717171',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(113, 113, 113, 0.1)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
            
            {notificationsLoading ? (
              <div className="notifications-loading">
                <div className="spinner"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notifications-empty">
                <div className="notifications-empty-icon">
                  <i className="fas fa-bell"></i>
                </div>
                <h3>No notifications yet</h3>
                <p>You've got a blank slate (for now). We'll let you know when updates arrive.</p>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map((notification, index) => {
                  const notificationText = getNotificationMessage(notification);
                  const notificationType = (notification.type || notification.Type || 'general').toLowerCase();
                  const notifStyle = getNotificationStyle(notificationType);
                  const notificationId = notification.id || notification.ID || notification.NotificationID;
                  
                  // Format timestamp - database returns CreatedAt
                  // Handle case where date comes as empty object {} from SQL Server
                  let rawDate = notification.CreatedAt || notification.createdAt || notification.created_at;
                  
                  // Check if rawDate is an empty object (SQL Server date serialization issue)
                  if (rawDate && typeof rawDate === 'object' && !(rawDate instanceof Date)) {
                    // Try to extract date from object or use null
                    if (Object.keys(rawDate).length === 0) {
                      rawDate = null;
                    }
                  }
                  
                  const formattedTime = rawDate ? formatTimeAgo(rawDate) : '';
                  
                  return (
                    <div 
                      key={notificationId || index} 
                      className="notification-item"
                      onClick={() => handleNotificationItemClick(notification, notificationId)}
                      style={{ 
                        cursor: 'pointer',
                        background: (!notification.IsRead && !notification.isRead) ? 'rgba(80, 134, 232, 0.08)' : 'transparent',
                        borderLeft: (!notification.IsRead && !notification.isRead) ? '3px solid #5086E8' : '3px solid transparent'
                      }}
                    >
                      <div className="notification-icon" style={{ 
                        padding: 0, 
                        overflow: 'hidden',
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        flexShrink: 0
                      }}>
                        <img 
                          src={getUnifiedNotificationIcon(notificationType)} 
                          alt={notificationType}
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                          onError={(e) => {
                            // Fallback to Font Awesome icon if SVG fails to load
                            e.target.style.display = 'none';
                            e.target.parentElement.style.background = '#4285f4';
                            e.target.parentElement.style.display = 'flex';
                            e.target.parentElement.style.alignItems = 'center';
                            e.target.parentElement.style.justifyContent = 'center';
                            const fallbackIcon = document.createElement('i');
                            fallbackIcon.className = `fas ${notifStyle.icon}`;
                            fallbackIcon.style.cssText = 'color: #ffffff; font-size: 18px;';
                            e.target.parentElement.appendChild(fallbackIcon);
                          }}
                        />
                      </div>
                      <div className="notification-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <p className="notification-text" style={{ margin: 0 }}>{notificationText}</p>
                          {(!notification.IsRead && !notification.isRead) && (
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#5086E8',
                              flexShrink: 0
                            }}></span>
                          )}
                        </div>
                        {formattedTime && <span className="notification-time">{formattedTime}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Announcements / What's New View
  if (showAnnouncements) {
    return (
      <>
        <div className="profile-sidebar-overlay" onClick={onClose} />
        <div className="profile-sidebar">
          {/* Announcements Header */}
          <div className="profile-sidebar-header">
            <button className="profile-sidebar-icon-btn" onClick={handleBackFromAnnouncements}>
              <i className="fas fa-arrow-left"></i>
            </button>
            <div style={{ flex: 1 }}></div>
            <button className="profile-sidebar-icon-btn profile-sidebar-close" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="profile-sidebar-content">
            <h2 className="profile-sidebar-page-title">What's New</h2>
            <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
              Latest updates & announcements
            </p>
            
            {announcementsLoading ? (
              <div className="notifications-loading">
                <div className="spinner"></div>
              </div>
            ) : announcements.length === 0 ? (
              <div className="notifications-empty">
                <div className="notifications-empty-icon">
                  <i className="fas fa-bullhorn"></i>
                </div>
                <h3>No announcements yet</h3>
                <p>Check back later for updates and news!</p>
              </div>
            ) : (
              <div className="notifications-list">
                {announcements.map((announcement) => {
                  const announcementStyle = getAnnouncementStyle(announcement.Type);
                  const formattedTime = announcement.CreatedAt ? formatTimeAgo(announcement.CreatedAt) : '';
                  
                  return (
                    <div 
                      key={announcement.AnnouncementID} 
                      className="notification-item"
                      style={{ cursor: announcement.LinkURL ? 'pointer' : 'default' }}
                      onClick={() => announcement.LinkURL && window.open(announcement.LinkURL, '_blank')}
                    >
                      <div className="notification-icon" style={{ background: announcementStyle.bgColor }}>
                        <i className={`fas ${announcementStyle.icon}`} style={{ color: announcementStyle.iconColor }}></i>
                      </div>
                      <div className="notification-content">
                        <p className="notification-text" style={{ fontWeight: 600 }}>{announcement.Title}</p>
                        {announcement.Content && (
                          <p style={{ 
                            fontSize: '0.875rem', 
                            color: '#555', 
                            margin: '4px 0',
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {announcement.Content}
                          </p>
                        )}
                        {formattedTime && <span className="notification-time">{formattedTime}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Profile View - Clean Airbnb style
  return (
    <>
      <div className="profile-sidebar-overlay" onClick={onClose} />
      <div className="profile-sidebar">
        {/* Header with notification bell, announcements, and close button */}
        <div className="profile-sidebar-header">
          <h1 className="profile-sidebar-title">Profile</h1>
          <div className="profile-sidebar-header-actions">
            <button 
              className="profile-sidebar-icon-btn" 
              onClick={handleAnnouncementsClick}
              aria-label="What's New"
              title="What's New"
            >
              <i className="fas fa-bullhorn"></i>
              {announcements.length > 0 && (
                <span className="notification-dot" style={{ background: '#f97316' }}></span>
              )}
            </button>
            <button 
              className="profile-sidebar-icon-btn" 
              onClick={handleNotificationClick}
              aria-label="Notifications"
              title="Notifications"
              style={{ position: 'relative' }}
            >
              <i className="far fa-bell"></i>
              {notifications.filter(n => !n.IsRead && !n.isRead).length > 0 ? (
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: '#5086E8',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 600,
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px'
                }}>
                  {notifications.filter(n => !n.IsRead && !n.isRead).length > 9 ? '9+' : notifications.filter(n => !n.IsRead && !n.isRead).length}
                </span>
              ) : (notificationCounts.unreadMessages > 0 || notificationCounts.pendingBookings > 0) && (
                <span className="notification-dot"></span>
              )}
            </button>
            <button 
              className="profile-sidebar-icon-btn profile-sidebar-close" 
              onClick={onClose}
              aria-label="Close"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        {/* Scrollable content wrapper */}
        <div className="profile-sidebar-scroll-content">
        
        {/* Profile Card - Clickable to view full profile */}
        <div 
          className="profile-sidebar-card"
          onClick={() => handleNavigate(`/profile/${encodeUserId(currentUser?.id)}`)}
        >
          <div className="profile-sidebar-avatar-container">
            {profilePic ? (
              <img 
                src={profilePic} 
                alt="Profile"
                className="profile-sidebar-avatar"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div 
              className="profile-sidebar-avatar-placeholder"
              style={{ display: profilePic ? 'none' : 'flex' }}
            >
              {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
          <div className="profile-sidebar-user-name">{currentUser?.name}</div>
          <div className="profile-sidebar-view-profile">View your profile</div>
        </div>
        
        {/* Quick Action Cards - Two visible, scroll for Messages */}
        <div style={{ padding: '0 24px', marginBottom: '8px' }}>
          <div 
            ref={carouselRef}
            onScroll={() => {
              if (carouselRef.current) {
                const scrollLeft = carouselRef.current.scrollLeft;
                const containerWidth = carouselRef.current.offsetWidth;
                const newIndex = Math.round(scrollLeft / containerWidth);
                if (newIndex !== activeQuickAction && newIndex >= 0 && newIndex < 2) {
                  setActiveQuickAction(newIndex);
                }
              }
            }}
            style={{
              display: 'flex',
              gap: '16px',
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {/* Page 1: My Bookings + My Messages */}
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              flex: '0 0 100%', 
              minWidth: '100%',
              scrollSnapAlign: 'start'
            }}>
              <div 
                className="profile-sidebar-action-card"
                onClick={() => handleNavigate('/client/bookings')}
                style={{ flex: 1 }}
              >
                <div className="action-card-icon-wrapper">
                  <img src="/images/planbeau-platform-assets/sidebar/dfdbccc2-9ef2-409b-9b34-f3d71058dbe4.avif" alt="My Bookings" className="action-card-img" />
                </div>
                <span className="action-card-label">My Bookings</span>
                {notificationCounts.pendingBookings > 0 && (
                  <span className="action-card-badge">NEW</span>
                )}
              </div>
              <div 
                className="profile-sidebar-action-card"
                onClick={() => handleNavigate('/client/messages')}
                style={{ flex: 1 }}
              >
                <div className="action-card-icon-wrapper">
                  <img src="/images/planbeau-platform-assets/sidebar/a0613f17-0174-4742-b003-e9992e5400fe.avif" alt="My Messages" className="action-card-img" />
                </div>
                <span className="action-card-label">My Messages</span>
                {notificationCounts.unreadMessages > 0 && (
                  <span className="action-card-badge">{notificationCounts.unreadMessages}</span>
                )}
              </div>
            </div>
            
            {/* Page 2: My Favorites */}
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              flex: '0 0 100%', 
              minWidth: '100%',
              scrollSnapAlign: 'start'
            }}>
              <div 
                className="profile-sidebar-action-card"
                onClick={() => handleNavigate('/client/favorites')}
                style={{ flex: 1 }}
              >
                <div className="action-card-icon-wrapper">
                  <img src="/images/planbeau-platform-assets/sidebar/297263db-3cc6-45b5-97b6-5c4537a15be4.avif" alt="My Favorites" className="action-card-img" />
                </div>
                <span className="action-card-label">My Favorites</span>
              </div>
              <div style={{ flex: 1 }}></div>
            </div>
          </div>
        </div>
        
        {/* Dot Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '16px',
          padding: '0 24px'
        }}>
          {[0, 1].map((idx) => (
            <span
              key={idx}
              onClick={() => {
                setActiveQuickAction(idx);
                if (carouselRef.current) {
                  const containerWidth = carouselRef.current.offsetWidth;
                  carouselRef.current.scrollTo({ left: containerWidth * idx, behavior: 'smooth' });
                }
              }}
              style={{
                width: activeQuickAction === idx ? '20px' : '8px',
                minWidth: activeQuickAction === idx ? '20px' : '8px',
                maxWidth: activeQuickAction === idx ? '20px' : '8px',
                height: '8px',
                minHeight: '8px',
                maxHeight: '8px',
                borderRadius: '4px',
                background: activeQuickAction === idx ? '#5086E8' : '#d1d5db',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
                display: 'inline-block'
              }}
            />
          ))}
        </div>
        
        {/* Vendor Promo Card - Shows "Become a vendor" for non-vendors, "Switch to hosting" for vendors */}
        {vendorCheckLoading ? (
          <div className="profile-sidebar-promo-card" style={{ justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }}></div>
          </div>
        ) : hasVendorProfile ? (
          <div 
            className="profile-sidebar-promo-card"
            onClick={() => {
              localStorage.setItem('viewMode', 'vendor');
              window.dispatchEvent(new CustomEvent('viewModeChanged', { detail: { mode: 'vendor' } }));
              handleNavigate('/dashboard?section=vendor-dashboard');
            }}
          >
            <div className="promo-card-image">
              <img src="/images/planbeau-platform-assets/sidebar/5efa06bd-abeb-4110-96e1-cb4d034c4da8.avif" alt="" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
              <div className="promo-card-icon-fallback" style={{ display: 'none' }}>
                <i className="fas fa-sync-alt"></i>
              </div>
            </div>
            <div className="promo-card-content">
              <div className="promo-card-title">Switch to hosting</div>
              <div className="promo-card-subtitle">Manage your vendor dashboard and bookings.</div>
            </div>
            <i className="fas fa-chevron-right promo-card-arrow"></i>
          </div>
        ) : (
          <div 
            className="profile-sidebar-promo-card"
            onClick={() => {
              const url = buildBecomeVendorUrl({ source: 'sidebar', ref: 'profile' });
              handleNavigate(url);
            }}
          >
            <div className="promo-card-image">
              <img src="/images/planbeau-platform-assets/sidebar/5efa06bd-abeb-4110-96e1-cb4d034c4da8.avif" alt="" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
              <div className="promo-card-icon-fallback" style={{ display: 'none' }}>
                <i className="fas fa-store"></i>
              </div>
            </div>
            <div className="promo-card-content">
              <div className="promo-card-title">Become a vendor</div>
              <div className="promo-card-subtitle">It's easy to start hosting and earn extra income.</div>
            </div>
            <i className="fas fa-chevron-right promo-card-arrow"></i>
          </div>
        )}
        
        {/* Menu Items */}
        <div className="profile-sidebar-menu">
          {/* Forums */}
          <button className="profile-sidebar-menu-item" onClick={() => handleNavigate('/forum')}>
            <i className="far fa-comments"></i>
            <span>Forums</span>
            <i className="fas fa-chevron-right menu-item-arrow"></i>
          </button>
          
          {/* Blog */}
          <button className="profile-sidebar-menu-item" onClick={() => handleNavigate('/blog')}>
            <i className="far fa-newspaper"></i>
            <span>Blog</span>
            <i className="fas fa-chevron-right menu-item-arrow"></i>
          </button>
          
          {/* Account Settings */}
          <button className="profile-sidebar-menu-item" onClick={() => handleNavigate('/client/settings')}>
            <i className="fas fa-cog"></i>
            <span>Settings</span>
            <i className="fas fa-chevron-right menu-item-arrow"></i>
          </button>
          
          {/* Help Centre */}
          <button className="profile-sidebar-menu-item" onClick={() => handleNavigate('/help-centre')}>
            <i className="far fa-question-circle"></i>
            <span>Help Centre</span>
            <i className="fas fa-chevron-right menu-item-arrow"></i>
          </button>
          
          <div className="profile-sidebar-menu-divider"></div>
          
          {/* Log out */}
          <button className="profile-sidebar-menu-item" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Log out</span>
            <i className="fas fa-chevron-right menu-item-arrow"></i>
          </button>
        </div>
        
        </div>{/* End of profile-sidebar-scroll-content */}
      </div>
    </>
  );
}

export default ProfileSidebar;
