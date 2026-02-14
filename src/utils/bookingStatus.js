/**
 * Shared Booking Status Configuration
 * SINGLE SOURCE OF TRUTH - Use this utility across ALL booking-related components
 * for consistent status labels, colors, and styling
 */

// ==================== COLORS ====================
export const COLORS = {
  // Status colors
  success: '#10b981',
  successBg: 'rgba(16, 185, 129, 0.08)',
  successBgSolid: 'rgba(16, 185, 129, 0.12)',
  
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.08)',
  
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.08)',
  
  info: '#5086E8',
  infoBg: 'rgba(80, 134, 232, 0.08)',
  
  neutral: '#6b7280',
  neutralBg: 'rgba(107, 114, 128, 0.08)',
  
  // UI colors
  primary: '#222222',
  primaryHover: '#000000',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  price: '#059669'
};

// ==================== STATUS CONFIGURATION ====================
// Single source of truth for all booking statuses
export const STATUS_CONFIG = {
  pending: {
    icon: 'fa-clock',
    color: COLORS.warning,
    bg: COLORS.warningBg,
    borderStyle: 'dashed',
    labelVendor: 'Awaiting Your Approval',
    labelClient: 'Pending Approval'
  },
  confirmed: {
    icon: 'fa-clock',
    color: COLORS.info,
    bg: COLORS.infoBg,
    borderStyle: 'dashed',
    labelVendor: 'Awaiting Payment',
    labelClient: 'Awaiting Payment'
  },
  accepted: {
    icon: 'fa-clock',
    color: COLORS.info,
    bg: COLORS.infoBg,
    borderStyle: 'dashed',
    labelVendor: 'Awaiting Payment',
    labelClient: 'Awaiting Payment'
  },
  approved: {
    icon: 'fa-clock',
    color: COLORS.info,
    bg: COLORS.infoBg,
    borderStyle: 'dashed',
    labelVendor: 'Awaiting Payment',
    labelClient: 'Awaiting Payment'
  },
  deposit_paid: {
    icon: 'fa-check-circle',
    color: COLORS.info,
    bg: COLORS.infoBg,
    borderStyle: 'dashed',
    labelVendor: 'Deposit Paid',
    labelClient: 'Deposit Paid'
  },
  paid: {
    icon: 'fa-check-circle',
    color: COLORS.success,
    bg: COLORS.successBgSolid,
    borderStyle: 'solid',
    labelVendor: 'Paid',
    labelClient: 'Paid'
  },
  completed: {
    icon: 'fa-check-double',
    color: COLORS.success,
    bg: COLORS.successBgSolid,
    borderStyle: 'solid',
    labelVendor: 'Completed',
    labelClient: 'Completed'
  },
  cancelled: {
    icon: 'fa-times-circle',
    color: COLORS.error,
    bg: COLORS.errorBg,
    borderStyle: 'solid',
    labelVendor: 'Cancelled',
    labelClient: 'Cancelled'
  },
  declined: {
    icon: 'fa-times-circle',
    color: COLORS.error,
    bg: COLORS.errorBg,
    borderStyle: 'dashed',
    labelVendor: 'Declined',
    labelClient: 'Declined'
  },
  expired: {
    icon: 'fa-clock',
    color: COLORS.neutral,
    bg: COLORS.neutralBg,
    borderStyle: 'dashed',
    labelVendor: 'Expired',
    labelClient: 'Expired'
  }
};

/**
 * Check if event date has passed
 */
export function isEventPast(booking) {
  if (!booking.EventDate) return false;
  const eventDate = new Date(booking.EventDate);
  const now = new Date();
  return eventDate < now;
}

/**
 * Get the status configuration for a booking
 * @param {object} booking - The booking object
 * @param {boolean} isVendorView - Whether this is vendor view (true) or client view (false)
 * @returns {object} Status configuration with icon, color, bg, borderStyle, and label
 */
export function getBookingStatusConfig(booking, isVendorView = false) {
  const status = (booking._status || booking.Status || 'pending').toString().toLowerCase();
  const isPaid = booking.FullAmountPaid === true || booking.FullAmountPaid === 1 || status === 'paid';
  const isDepositOnly = !isPaid && (booking.DepositPaid === true || booking.DepositPaid === 1);
  const isCompleted = status === 'completed' || booking.IsCompleted === true || booking.IsCompleted === 1;
  const eventPast = isEventPast(booking);
  
  // Determine effective status
  let effectiveStatus = status;
  
  // Completed - event has passed and was paid/confirmed
  if (isCompleted || (eventPast && (isPaid || status === 'confirmed' || status === 'accepted' || status === 'approved'))) {
    effectiveStatus = 'completed';
  } else if (status === 'cancelled' || status === 'cancelled_by_client' || status === 'cancelled_by_vendor' || status === 'cancelled_by_admin') {
    effectiveStatus = 'cancelled';
  } else if (isPaid) {
    effectiveStatus = 'paid';
  } else if (isDepositOnly && (status === 'confirmed' || status === 'accepted' || status === 'approved')) {
    effectiveStatus = 'deposit_paid';
  }
  
  const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending;
  
  return {
    icon: config.icon,
    color: config.color,
    bg: config.bg,
    borderStyle: config.borderStyle,
    label: isVendorView ? config.labelVendor : config.labelClient
  };
}

/**
 * Format time with timezone
 * @param {string} startTime - Start time string
 * @param {string} endTime - End time string (optional)
 * @param {string} timezone - Timezone abbreviation (optional)
 * @returns {string} Formatted time string
 */
export function formatTimeWithTimezone(startTime, endTime, timezone) {
  if (!startTime && !endTime) return 'Time TBD';
  
  let timeStr = startTime || '';
  if (endTime) {
    timeStr += ` - ${endTime}`;
  }
  if (timezone) {
    timeStr += ` (${timezone})`;
  }
  return timeStr;
}

/**
 * Format a time value (HH:MM:SS or Date) to readable format
 * @param {string|Date} timeVal - Time value
 * @returns {string} Formatted time (e.g., "7:00 PM")
 */
export function formatTimeValue(timeVal) {
  if (!timeVal) return '';
  
  // Handle time string format (HH:MM:SS.nnnnnnn or HH:MM:SS or HH:MM)
  if (typeof timeVal === 'string' && timeVal.includes(':')) {
    const parts = timeVal.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
  }
  
  // Handle Date object
  if (timeVal instanceof Date) {
    return timeVal.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  
  return '';
}
