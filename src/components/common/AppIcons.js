/**
 * Centralized App Icons
 * 
 * All icons used across the app should be imported from this file
 * to ensure consistency in style (hollow/outline icons like Airbnb)
 * 
 * Usage:
 * import { Icons } from '../components/common/AppIcons';
 * <Icons.Bookings />
 * <Icons.Messages />
 * 
 * Or use the Icon component directly:
 * import { Icon } from '../components/common/AppIcons';
 * <Icon name="bookings" />
 */

import React from 'react';

// Default icon style - matches Airbnb's hollow/outline look
// eslint-disable-next-line no-unused-vars
const defaultStyle = {
  fontSize: '20px',
  color: '#717171',
  lineHeight: 1,
};

// Icon wrapper component for consistent sizing
const IconWrapper = ({ children, size = 20, color = '#717171', className = '', style = {}, ...props }) => (
  <span 
    className={`app-icon ${className}`}
    style={{ 
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      fontSize: size,
      color,
      lineHeight: 1,
      ...style 
    }}
    {...props}
  >
    {children}
  </span>
);

// Individual icon components using Font Awesome Regular (hollow) icons
// For icons without a regular variant, we use the solid with lighter styling

export const Icons = {
  // Navigation & Menu
  Bookings: (props) => <IconWrapper {...props}><i className="far fa-calendar-check"></i></IconWrapper>,
  Messages: (props) => <IconWrapper {...props}><i className="far fa-comment-dots"></i></IconWrapper>,
  Favorites: (props) => <IconWrapper {...props}><i className="far fa-heart"></i></IconWrapper>,
  Profile: (props) => <IconWrapper {...props}><i className="far fa-user-circle"></i></IconWrapper>,
  Settings: (props) => <IconWrapper {...props}><i className="fas fa-cog"></i></IconWrapper>,
  Help: (props) => <IconWrapper {...props}><i className="far fa-question-circle"></i></IconWrapper>,
  Logout: (props) => <IconWrapper {...props}><i className="fas fa-sign-out-alt"></i></IconWrapper>,
  
  // Dashboard
  Dashboard: (props) => <IconWrapper {...props}><i className="fas fa-th-large"></i></IconWrapper>,
  Analytics: (props) => <IconWrapper {...props}><i className="far fa-chart-bar"></i></IconWrapper>,
  Invoices: (props) => <IconWrapper {...props}><i className="far fa-file-alt"></i></IconWrapper>,
  Payments: (props) => <IconWrapper {...props}><i className="far fa-credit-card"></i></IconWrapper>,
  Reviews: (props) => <IconWrapper {...props}><i className="far fa-star"></i></IconWrapper>,
  
  // Vendor
  Store: (props) => <IconWrapper {...props}><i className="far fa-store"></i></IconWrapper>,
  Services: (props) => <IconWrapper {...props}><i className="fas fa-concierge-bell"></i></IconWrapper>,
  Calendar: (props) => <IconWrapper {...props}><i className="far fa-calendar-alt"></i></IconWrapper>,
  Availability: (props) => <IconWrapper {...props}><i className="far fa-clock"></i></IconWrapper>,
  Portfolio: (props) => <IconWrapper {...props}><i className="far fa-images"></i></IconWrapper>,
  Team: (props) => <IconWrapper {...props}><i className="fas fa-users"></i></IconWrapper>,
  
  // Actions
  Edit: (props) => <IconWrapper {...props}><i className="far fa-edit"></i></IconWrapper>,
  Delete: (props) => <IconWrapper {...props}><i className="far fa-trash-alt"></i></IconWrapper>,
  Add: (props) => <IconWrapper {...props}><i className="far fa-plus-circle"></i></IconWrapper>,
  Close: (props) => <IconWrapper {...props}><i className="far fa-times-circle"></i></IconWrapper>,
  Check: (props) => <IconWrapper {...props}><i className="far fa-check-circle"></i></IconWrapper>,
  Search: (props) => <IconWrapper {...props}><i className="fas fa-search"></i></IconWrapper>,
  Filter: (props) => <IconWrapper {...props}><i className="fas fa-filter"></i></IconWrapper>,
  Sort: (props) => <IconWrapper {...props}><i className="fas fa-sort"></i></IconWrapper>,
  
  // Status
  Pending: (props) => <IconWrapper {...props}><i className="far fa-hourglass-half"></i></IconWrapper>,
  Confirmed: (props) => <IconWrapper {...props}><i className="far fa-check-circle"></i></IconWrapper>,
  Cancelled: (props) => <IconWrapper {...props}><i className="far fa-times-circle"></i></IconWrapper>,
  Completed: (props) => <IconWrapper {...props}><i className="fas fa-check-double"></i></IconWrapper>,
  
  // Booking Details
  Date: (props) => <IconWrapper {...props}><i className="far fa-calendar"></i></IconWrapper>,
  Time: (props) => <IconWrapper {...props}><i className="far fa-clock"></i></IconWrapper>,
  Location: (props) => <IconWrapper {...props}><i className="fas fa-map-marker-alt"></i></IconWrapper>,
  Guests: (props) => <IconWrapper {...props}><i className="fas fa-users"></i></IconWrapper>,
  Event: (props) => <IconWrapper {...props}><i className="fas fa-glass-cheers"></i></IconWrapper>,
  
  // Communication
  Email: (props) => <IconWrapper {...props}><i className="far fa-envelope"></i></IconWrapper>,
  Phone: (props) => <IconWrapper {...props}><i className="fas fa-phone"></i></IconWrapper>,
  Chat: (props) => <IconWrapper {...props}><i className="far fa-comments"></i></IconWrapper>,
  Notification: (props) => <IconWrapper {...props}><i className="far fa-bell"></i></IconWrapper>,
  
  // Misc
  Info: (props) => <IconWrapper {...props}><i className="far fa-info-circle"></i></IconWrapper>,
  Warning: (props) => <IconWrapper {...props}><i className="far fa-exclamation-triangle"></i></IconWrapper>,
  Error: (props) => <IconWrapper {...props}><i className="far fa-exclamation-circle"></i></IconWrapper>,
  Success: (props) => <IconWrapper {...props}><i className="far fa-check-circle"></i></IconWrapper>,
  Lock: (props) => <IconWrapper {...props}><i className="fas fa-lock"></i></IconWrapper>,
  Unlock: (props) => <IconWrapper {...props}><i className="fas fa-unlock"></i></IconWrapper>,
  Eye: (props) => <IconWrapper {...props}><i className="far fa-eye"></i></IconWrapper>,
  EyeSlash: (props) => <IconWrapper {...props}><i className="far fa-eye-slash"></i></IconWrapper>,
  Copy: (props) => <IconWrapper {...props}><i className="far fa-copy"></i></IconWrapper>,
  Download: (props) => <IconWrapper {...props}><i className="fas fa-download"></i></IconWrapper>,
  Upload: (props) => <IconWrapper {...props}><i className="fas fa-upload"></i></IconWrapper>,
  Share: (props) => <IconWrapper {...props}><i className="fas fa-share-alt"></i></IconWrapper>,
  Link: (props) => <IconWrapper {...props}><i className="fas fa-link"></i></IconWrapper>,
  ExternalLink: (props) => <IconWrapper {...props}><i className="fas fa-external-link-alt"></i></IconWrapper>,
  
  // Arrows & Navigation
  ArrowLeft: (props) => <IconWrapper {...props}><i className="fas fa-arrow-left"></i></IconWrapper>,
  ArrowRight: (props) => <IconWrapper {...props}><i className="fas fa-arrow-right"></i></IconWrapper>,
  ArrowUp: (props) => <IconWrapper {...props}><i className="fas fa-arrow-up"></i></IconWrapper>,
  ArrowDown: (props) => <IconWrapper {...props}><i className="fas fa-arrow-down"></i></IconWrapper>,
  ChevronLeft: (props) => <IconWrapper {...props}><i className="fas fa-chevron-left"></i></IconWrapper>,
  ChevronRight: (props) => <IconWrapper {...props}><i className="fas fa-chevron-right"></i></IconWrapper>,
  ChevronUp: (props) => <IconWrapper {...props}><i className="fas fa-chevron-up"></i></IconWrapper>,
  ChevronDown: (props) => <IconWrapper {...props}><i className="fas fa-chevron-down"></i></IconWrapper>,
  
  // Vendor Profile Badges
  Trending: (props) => <IconWrapper {...props}><i className="fas fa-chart-line"></i></IconWrapper>,
  MostBooked: (props) => <IconWrapper {...props}><i className="fas fa-chart-line"></i></IconWrapper>,
  TopRated: (props) => <IconWrapper {...props}><i className="far fa-star"></i></IconWrapper>,
  InstantBook: (props) => <IconWrapper {...props}><i className="fas fa-bolt"></i></IconWrapper>,
  GuestFavorite: (props) => <IconWrapper {...props}><i className="fas fa-award"></i></IconWrapper>,
  Verified: (props) => <IconWrapper {...props}><i className="fas fa-check-circle"></i></IconWrapper>,
  New: (props) => <IconWrapper {...props}><i className="fas fa-star"></i></IconWrapper>,
  
  // Policies
  Cancellation: (props) => <IconWrapper {...props}><i className="far fa-calendar-times"></i></IconWrapper>,
  LeadTime: (props) => <IconWrapper {...props}><i className="far fa-hourglass-start"></i></IconWrapper>,
  Refund: (props) => <IconWrapper {...props}><i className="fas fa-undo"></i></IconWrapper>,
  
  // Sidebar specific
  MyBookings: (props) => <IconWrapper {...props}><i className="far fa-calendar-check"></i></IconWrapper>,
  MyFavorites: (props) => <IconWrapper {...props}><i className="far fa-heart"></i></IconWrapper>,
  Forums: (props) => <IconWrapper {...props}><i className="far fa-comments"></i></IconWrapper>,
  Blog: (props) => <IconWrapper {...props}><i className="far fa-newspaper"></i></IconWrapper>,
  SwitchMode: (props) => <IconWrapper {...props}><i className="fas fa-exchange-alt"></i></IconWrapper>,
  Key: (props) => <IconWrapper {...props}><i className="fas fa-key"></i></IconWrapper>,
  User: (props) => <IconWrapper {...props}><i className="far fa-user"></i></IconWrapper>,
  MapMarker: (props) => <IconWrapper {...props}><i className="fas fa-map-marker-alt"></i></IconWrapper>,
  Star: (props) => <IconWrapper {...props}><i className="fas fa-star"></i></IconWrapper>,
};

// Dynamic Icon component - use when icon name comes from data
export const Icon = ({ name, ...props }) => {
  const IconComponent = Icons[name];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in AppIcons`);
    return <IconWrapper {...props}><i className="far fa-question"></i></IconWrapper>;
  }
  return <IconComponent {...props} />;
};

// Icon class names for use in inline styles or when you need just the class
export const IconClasses = {
  bookings: 'far fa-calendar-check',
  messages: 'far fa-comment-dots',
  favorites: 'far fa-heart',
  profile: 'far fa-user-circle',
  settings: 'fas fa-cog',
  help: 'far fa-question-circle',
  logout: 'fas fa-sign-out-alt',
  dashboard: 'fas fa-th-large',
  analytics: 'far fa-chart-bar',
  invoices: 'far fa-file-alt',
  payments: 'far fa-credit-card',
  reviews: 'far fa-star',
  store: 'fas fa-store',
  services: 'fas fa-concierge-bell',
  calendar: 'far fa-calendar-alt',
  availability: 'far fa-clock',
  portfolio: 'far fa-images',
  team: 'fas fa-users',
  edit: 'far fa-edit',
  delete: 'far fa-trash-alt',
  add: 'far fa-plus-circle',
  close: 'far fa-times-circle',
  check: 'far fa-check-circle',
  search: 'fas fa-search',
  filter: 'fas fa-filter',
  sort: 'fas fa-sort',
  pending: 'far fa-hourglass-half',
  confirmed: 'far fa-check-circle',
  cancelled: 'far fa-times-circle',
  completed: 'fas fa-check-double',
  date: 'far fa-calendar',
  time: 'far fa-clock',
  location: 'fas fa-map-marker-alt',
  guests: 'fas fa-users',
  event: 'fas fa-glass-cheers',
  email: 'far fa-envelope',
  phone: 'fas fa-phone',
  chat: 'far fa-comments',
  notification: 'far fa-bell',
  info: 'far fa-info-circle',
  warning: 'far fa-exclamation-triangle',
  error: 'far fa-exclamation-circle',
  success: 'far fa-check-circle',
  lock: 'fas fa-lock',
  unlock: 'fas fa-unlock',
  eye: 'far fa-eye',
  eyeSlash: 'far fa-eye-slash',
  copy: 'far fa-copy',
  download: 'fas fa-download',
  upload: 'fas fa-upload',
  share: 'fas fa-share-alt',
  link: 'fas fa-link',
  externalLink: 'fas fa-external-link-alt',
  arrowLeft: 'fas fa-arrow-left',
  arrowRight: 'fas fa-arrow-right',
  arrowUp: 'fas fa-arrow-up',
  arrowDown: 'fas fa-arrow-down',
  chevronLeft: 'fas fa-chevron-left',
  chevronRight: 'fas fa-chevron-right',
  chevronUp: 'fas fa-chevron-up',
  chevronDown: 'fas fa-chevron-down',
  trending: 'fas fa-chart-line',
  mostBooked: 'fas fa-chart-line',
  topRated: 'far fa-star',
  instantBook: 'fas fa-bolt',
  guestFavorite: 'fas fa-award',
  verified: 'fas fa-check-circle',
  new: 'fas fa-star',
  cancellation: 'far fa-calendar-times',
  leadTime: 'far fa-hourglass-start',
  refund: 'fas fa-undo',
  // Sidebar specific
  myBookings: 'far fa-calendar-check',
  myFavorites: 'far fa-heart',
  forums: 'far fa-comments',
  blog: 'far fa-newspaper',
  switchMode: 'fas fa-exchange-alt',
  key: 'fas fa-key',
  user: 'far fa-user',
  mapMarker: 'fas fa-map-marker-alt',
  star: 'fas fa-star',
};

// ============================================================================
// NOTIFICATION ICON STYLES
// Centralized notification type styling for use across ProfileSidebar,
// NotificationDropdown, and any other notification-related components.
// This ensures consistent icons and colors for all notification types.
// ============================================================================

export const NotificationIconStyles = {
  // Booking notifications
  'booking_request': { icon: 'fa-calendar-plus', iconColor: '#ffffff', bgColor: '#5086E8' },
  'new_booking_request': { icon: 'fa-calendar-plus', iconColor: '#ffffff', bgColor: '#5086E8' },
  'booking': { icon: 'fa-calendar-plus', iconColor: '#5086E8', bgColor: 'rgba(80, 134, 232, 0.15)' },
  'booking_approved': { icon: 'fa-check-circle', iconColor: '#10b981', bgColor: '#5086E8' },
  'booking_confirmed': { icon: 'fa-check-circle', iconColor: '#10b981', bgColor: '#5086E8' },
  'booking_declined': { icon: 'fa-times-circle', iconColor: '#ef4444', bgColor: '#5086E8' },
  'booking_rejected': { icon: 'fa-times-circle', iconColor: '#ef4444', bgColor: '#5086E8' },
  'booking_cancelled': { icon: 'fa-ban', iconColor: '#ef4444', bgColor: '#5086E8' },
  'booking_reminder': { icon: 'fa-clock', iconColor: '#fbbf24', bgColor: '#5086E8' },
  'booking_update': { icon: 'fa-sync', iconColor: '#a78bfa', bgColor: '#5086E8' },
  
  // Message notifications
  'message': { icon: 'fa-envelope', iconColor: '#ffffff', bgColor: '#5086E8' },
  'new_message': { icon: 'fa-envelope', iconColor: '#ffffff', bgColor: '#5086E8' },
  
  // Payment notifications
  'payment': { icon: 'fa-credit-card', iconColor: '#34d399', bgColor: '#5086E8' },
  'payment_received': { icon: 'fa-dollar-sign', iconColor: '#34d399', bgColor: '#5086E8' },
  'payment_reminder': { icon: 'fa-exclamation-circle', iconColor: '#fbbf24', bgColor: '#5086E8' },
  
  // Invoice notifications
  'invoice': { icon: 'fa-file-invoice-dollar', iconColor: '#c4b5fd', bgColor: '#5086E8' },
  'new_invoice': { icon: 'fa-file-invoice-dollar', iconColor: '#c4b5fd', bgColor: '#5086E8' },
  
  // Review notifications
  'review': { icon: 'fa-star', iconColor: '#fbbf24', bgColor: '#5086E8' },
  'new_review': { icon: 'fa-star', iconColor: '#fbbf24', bgColor: '#5086E8' },
  
  // Promotion notifications
  'promotion': { icon: 'fa-tag', iconColor: '#fb923c', bgColor: '#5086E8' },
  'promotions': { icon: 'fa-tag', iconColor: '#fb923c', bgColor: '#5086E8' },
  
  // Newsletter
  'newsletter': { icon: 'fa-newspaper', iconColor: '#67e8f9', bgColor: '#5086E8' },
  
  // Announcement
  'announcement': { icon: 'fa-bullhorn', iconColor: '#fbbf24', bgColor: '#5086E8' },
  
  // General/default
  'notification': { icon: 'fa-bell', iconColor: '#ffffff', bgColor: '#5086E8' },
  'general': { icon: 'fa-bell', iconColor: '#f59e0b', bgColor: 'rgba(80, 134, 232, 0.15)' },
};

// Helper function to get notification style with fallback
export const getNotificationIconStyle = (type) => {
  return NotificationIconStyles[type] || NotificationIconStyles['notification'];
};

// ============================================================================
// SVG ICON PATHS
// Centralized SVG paths for use across the app, emails, and notifications.
// These match the icons in /public/images/planbeau-platform-assets/icons/ui/
// ============================================================================

export const SvgIconPaths = {
  'check-circle': '/images/planbeau-platform-assets/icons/ui/check-circle.svg',
  'check': '/images/planbeau-platform-assets/icons/ui/check.svg',
  'x-circle': '/images/planbeau-platform-assets/icons/ui/x-circle.svg',
  'calendar': '/images/planbeau-platform-assets/icons/ui/calendar.svg',
  'calendar-plus': '/images/planbeau-platform-assets/icons/ui/calendar-plus.svg',
  'bell': '/images/planbeau-platform-assets/icons/ui/bell.svg',
  'heart': '/images/planbeau-platform-assets/icons/ui/heart.svg',
  'star': '/images/planbeau-platform-assets/icons/ui/star.svg',
  'envelope': '/images/planbeau-platform-assets/icons/ui/envelope.svg',
  'clock': '/images/planbeau-platform-assets/icons/ui/clock.svg',
  'dollar-sign': '/images/planbeau-platform-assets/icons/ui/dollar-sign.svg',
  'credit-card': '/images/planbeau-platform-assets/icons/ui/credit-card.svg',
  'user': '/images/planbeau-platform-assets/icons/ui/user.svg',
  'lock': '/images/planbeau-platform-assets/icons/ui/lock.svg',
  'unlock': '/images/planbeau-platform-assets/icons/ui/unlock.svg',
  'gift': '/images/planbeau-platform-assets/icons/ui/gift.svg',
  'message-square': '/images/planbeau-platform-assets/icons/ui/message-square.svg',
  'file-text': '/images/planbeau-platform-assets/icons/ui/file-text.svg',
  'tag': '/images/planbeau-platform-assets/icons/ui/tag.svg',
  'megaphone': '/images/planbeau-platform-assets/icons/ui/megaphone.svg',
  'ban': '/images/planbeau-platform-assets/icons/ui/ban.svg',
  'refresh-cw': '/images/planbeau-platform-assets/icons/ui/refresh-cw.svg',
  'alert-circle': '/images/planbeau-platform-assets/icons/ui/alert-circle.svg',
  'info': '/images/planbeau-platform-assets/icons/ui/info.svg',
  'map-pin': '/images/planbeau-platform-assets/icons/ui/map-pin.svg',
  'search': '/images/planbeau-platform-assets/icons/ui/search.svg',
  'newspaper': '/images/planbeau-platform-assets/icons/ui/newspaper.svg',
};

// ============================================================================
// EMAIL ICON PATHS
// Paths to email-specific icons with colored backgrounds (64x64 circular)
// ============================================================================

// ============================================================================
// UNIFIED NOTIFICATION ICON PATHS
// These icons have colored circular backgrounds and can be used across:
// - Email templates
// - Notification dropdowns
// - Profile activity feeds
// - Modals with status icons
// All icons are 64x64 SVG with blue (#5086E8) background and colored inner icons
// ============================================================================

// Unified notification icons from /images/planbeau-platform-assets/icons/notification/
// These icons have light blue circular backgrounds with blue icons
export const UnifiedNotificationIcons = {
  // Booking notifications
  'booking_request': '/images/planbeau-platform-assets/icons/notification/notif-booking-request.svg',
  'new_booking_request': '/images/planbeau-platform-assets/icons/notification/notif-booking-request.svg',
  'new_request': '/images/planbeau-platform-assets/icons/notification/notif-booking-request.svg',
  'booking': '/images/planbeau-platform-assets/icons/notification/notif-calendar.svg',
  'booking_approved': '/images/planbeau-platform-assets/icons/notification/notif-booking-approved.svg',
  'booking_accepted': '/images/planbeau-platform-assets/icons/notification/notif-booking-approved.svg',
  'request_approved': '/images/planbeau-platform-assets/icons/notification/notif-booking-approved.svg',
  'booking_confirmed': '/images/planbeau-platform-assets/icons/notification/notif-booking-confirmed.svg',
  'booking_declined': '/images/planbeau-platform-assets/icons/notification/notif-booking-declined.svg',
  'booking_rejected': '/images/planbeau-platform-assets/icons/notification/notif-booking-declined.svg',
  'request_declined': '/images/planbeau-platform-assets/icons/notification/notif-booking-declined.svg',
  'booking_cancelled': '/images/planbeau-platform-assets/icons/notification/notif-booking-cancelled.svg',
  'booking_reminder': '/images/planbeau-platform-assets/icons/notification/notif-reminder.svg',
  'booking_update': '/images/planbeau-platform-assets/icons/notification/notif-booking-update.svg',
  
  // Message notifications
  'message': '/images/planbeau-platform-assets/icons/notification/notif-message.svg',
  'new_message': '/images/planbeau-platform-assets/icons/notification/notif-message.svg',
  
  // Payment notifications
  'payment': '/images/planbeau-platform-assets/icons/notification/notif-payment.svg',
  'payment_received': '/images/planbeau-platform-assets/icons/notification/notif-payment-received.svg',
  'payment_reminder': '/images/planbeau-platform-assets/icons/notification/notif-payment-reminder.svg',
  
  // Invoice notifications
  'invoice': '/images/planbeau-platform-assets/icons/notification/notif-invoice.svg',
  'new_invoice': '/images/planbeau-platform-assets/icons/notification/notif-invoice.svg',
  
  // Review notifications
  'review': '/images/planbeau-platform-assets/icons/notification/notif-review.svg',
  'new_review': '/images/planbeau-platform-assets/icons/notification/notif-review.svg',
  
  // Promotion notifications
  'promotion': '/images/planbeau-platform-assets/icons/notification/notif-promotion.svg',
  'promotions': '/images/planbeau-platform-assets/icons/notification/notif-promotion.svg',
  
  // Newsletter
  'newsletter': '/images/planbeau-platform-assets/icons/notification/notif-newsletter.svg',
  
  // Announcement
  'announcement': '/images/planbeau-platform-assets/icons/notification/notif-announcement.svg',
  
  // General/default
  'notification': '/images/planbeau-platform-assets/icons/notification/notif-general.svg',
  'general': '/images/planbeau-platform-assets/icons/notification/notif-general.svg',
  
  // Status icons (for modals, banners, etc.)
  'success': '/images/planbeau-platform-assets/icons/notification/notif-success.svg',
  'error': '/images/planbeau-platform-assets/icons/notification/notif-error.svg',
  'warning': '/images/planbeau-platform-assets/icons/notification/notif-warning.svg',
  'info': '/images/planbeau-platform-assets/icons/notification/notif-info.svg',
  
  // Additional icons
  'user': '/images/planbeau-platform-assets/icons/notification/notif-user.svg',
  'heart': '/images/planbeau-platform-assets/icons/notification/notif-heart.svg',
  'favorite': '/images/planbeau-platform-assets/icons/notification/notif-heart.svg',
  'lock': '/images/planbeau-platform-assets/icons/notification/notif-lock.svg',
  'gift': '/images/planbeau-platform-assets/icons/notification/notif-gift.svg',
  'calendar': '/images/planbeau-platform-assets/icons/notification/notif-calendar.svg',
  'support': '/images/planbeau-platform-assets/icons/notification/notif-support.svg',
  
  // Support message notifications
  'support_message': '/images/planbeau-platform-assets/icons/notification/notif-support.svg',
  'new_support_message': '/images/planbeau-platform-assets/icons/notification/notif-support.svg',
  'support_reply': '/images/planbeau-platform-assets/icons/notification/notif-support.svg',
  
  // Chat/conversation notifications
  'chat': '/images/planbeau-platform-assets/icons/notification/notif-message.svg',
  'conversation': '/images/planbeau-platform-assets/icons/notification/notif-message.svg',
};

// Helper function to get unified notification icon path
// Handles case-insensitive matching and common variations
export const getUnifiedNotificationIcon = (type) => {
  if (!type) return UnifiedNotificationIcons['notification'];
  
  // Normalize: lowercase and trim
  const normalizedType = type.toLowerCase().trim();
  
  // Direct match
  if (UnifiedNotificationIcons[normalizedType]) {
    return UnifiedNotificationIcons[normalizedType];
  }
  
  // Try with underscores replaced by nothing (e.g., 'newmessage' -> 'new_message')
  const withUnderscores = normalizedType.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  if (UnifiedNotificationIcons[withUnderscores]) {
    return UnifiedNotificationIcons[withUnderscores];
  }
  
  // Fallback to default
  return UnifiedNotificationIcons['notification'];
};

export const EmailIconPaths = {
  'check-green': '/images/email-icons/icon-check-green.svg',
  'calendar-blue': '/images/email-icons/icon-calendar-blue.svg',
  'bell-yellow': '/images/email-icons/icon-bell-yellow.svg',
  'alert-yellow': '/images/email-icons/icon-alert-yellow.svg',
  'clock-yellow': '/images/email-icons/icon-clock-yellow.svg',
  'dollar-green': '/images/email-icons/icon-dollar-green.svg',
  'gift-purple': '/images/email-icons/icon-gift-purple.svg',
  'heart-red': '/images/email-icons/icon-heart-red.svg',
  'lock-blue': '/images/email-icons/icon-lock-blue.svg',
  'lock-red': '/images/email-icons/icon-lock-red.svg',
  'message-blue': '/images/email-icons/icon-message-blue.svg',
  'receipt-green': '/images/email-icons/icon-receipt-green.svg',
  'star-yellow': '/images/email-icons/icon-star-yellow.svg',
  'support-blue': '/images/email-icons/icon-support-blue.svg',
  'unlock-green': '/images/email-icons/icon-unlock-green.svg',
  'user-blue': '/images/email-icons/icon-user-blue.svg',
  'x-red': '/images/email-icons/icon-x-red.svg',
};

export default Icons;
