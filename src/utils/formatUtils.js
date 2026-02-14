/**
 * Shared Formatting Utilities for Planbeau
 * Reusable functions for formatting dates, currency, numbers, etc.
 */

// ============================================================
// DATE FORMATTING
// ============================================================

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
export function formatDate(date, options = {}) {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  try {
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(new Date(date));
  } catch {
    return '';
  }
}

/**
 * Format date with time
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date and time
 */
export function formatDateTime(date) {
  if (!date) return '';
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  } catch {
    return '';
  }
}

/**
 * Format date for display (e.g., "Jan 15, 2024")
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDateLong(date) {
  if (!date) return '';
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  } catch {
    return '';
  }
}

/**
 * Format date with weekday (e.g., "Monday, Jan 15, 2024")
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date with weekday
 */
export function formatDateWithWeekday(date) {
  if (!date) return '';
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  } catch {
    return '';
  }
}

/**
 * Format time only (e.g., "2:30 PM")
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time
 */
export function formatTime(date) {
  if (!date) return '';
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  } catch {
    return '';
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  // Handle null, undefined, empty string, or empty object
  if (!date || (typeof date === 'object' && !(date instanceof Date) && Object.keys(date).length === 0)) {
    return '';
  }
  
  const now = new Date();
  let then;
  
  // Handle various date formats including SQL Server datetime
  if (typeof date === 'string') {
    // Try parsing as ISO first, then as SQL Server format
    then = new Date(date);
    if (isNaN(then.getTime())) {
      // Try replacing space with T for ISO format
      then = new Date(date.replace(' ', 'T'));
    }
  } else {
    then = new Date(date);
  }
  
  // If still invalid, return empty
  if (isNaN(then.getTime())) {
    console.warn('Invalid date for formatRelativeTime:', date);
    return '';
  }
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);
  
  const isFuture = diffMs < 0;
  const abs = Math.abs;
  
  if (abs(diffSec) < 60) return 'just now';
  if (abs(diffMin) < 60) return isFuture ? `in ${abs(diffMin)} min` : `${abs(diffMin)} min ago`;
  if (abs(diffHour) < 24) return isFuture ? `in ${abs(diffHour)} hr` : `${abs(diffHour)} hr ago`;
  if (abs(diffDay) < 7) return isFuture ? `in ${abs(diffDay)} day${abs(diffDay) > 1 ? 's' : ''}` : `${abs(diffDay)} day${abs(diffDay) > 1 ? 's' : ''} ago`;
  if (abs(diffWeek) < 4) return isFuture ? `in ${abs(diffWeek)} week${abs(diffWeek) > 1 ? 's' : ''}` : `${abs(diffWeek)} week${abs(diffWeek) > 1 ? 's' : ''} ago`;
  if (abs(diffMonth) < 12) return isFuture ? `in ${abs(diffMonth)} month${abs(diffMonth) > 1 ? 's' : ''}` : `${abs(diffMonth)} month${abs(diffMonth) > 1 ? 's' : ''} ago`;
  return isFuture ? `in ${abs(diffYear)} year${abs(diffYear) > 1 ? 's' : ''}` : `${abs(diffYear)} year${abs(diffYear) > 1 ? 's' : ''} ago`;
}

/**
 * Format date for input fields (YYYY-MM-DD)
 * @param {Date|string} date - Date to format
 * @returns {string} ISO date string
 */
export function formatDateForInput(date) {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

/**
 * Format month and year (e.g., "January 2024")
 * @param {Date|string} date - Date to format
 * @returns {string} Month and year
 */
export function formatMonthYear(date) {
  if (!date) return '';
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long'
    }).format(new Date(date));
  } catch {
    return '';
  }
}

/**
 * Check if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} Whether date is today
 */
export function isToday(date) {
  if (!date) return false;
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
}

/**
 * Check if date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} Whether date is in the past
 */
export function isPast(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}

/**
 * Check if date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean} Whether date is in the future
 */
export function isFuture(date) {
  if (!date) return false;
  return new Date(date) > new Date();
}

// ============================================================
// CURRENCY FORMATTING
// ============================================================

// Currency configuration for localization
const CURRENCY_CONFIG = {
  CAD: { locale: 'en-CA', symbol: '$' },
  USD: { locale: 'en-US', symbol: '$' },
  EUR: { locale: 'de-DE', symbol: '€' },
  GBP: { locale: 'en-GB', symbol: '£' },
  AUD: { locale: 'en-AU', symbol: '$' },
  MXN: { locale: 'es-MX', symbol: '$' },
};

/**
 * Get the user's selected currency from localStorage
 * @returns {string} Currency code
 */
export function getSelectedCurrency() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('planbeau_currency') || 'CAD';
  }
  return 'CAD';
}

/**
 * Format currency with localization support
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: user's selected currency)
 * @param {Object} options - Additional options
 * @returns {string} Formatted currency
 */
export function formatCurrency(amount, currency = null, options = {}) {
  if (amount == null || isNaN(amount)) return '$0.00';
  
  // Use provided currency or get from localStorage
  const currencyCode = currency || getSelectedCurrency();
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.CAD;
  
  const { showCents = true, compact = false } = options;
  
  if (compact && Math.abs(amount) >= 1000) {
    const suffixes = ['', 'K', 'M', 'B'];
    const tier = Math.floor(Math.log10(Math.abs(amount)) / 3);
    const suffix = suffixes[tier] || '';
    const scale = Math.pow(10, tier * 3);
    const scaled = amount / scale;
    return `${config.symbol}${scaled.toFixed(1)}${suffix}`;
  }
  
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0
    }).format(amount);
  } catch {
    return `${config.symbol}${amount.toFixed(showCents ? 2 : 0)}`;
  }
}

/**
 * Format currency with explicit currency code display (e.g., "$150.00 CAD")
 * @param {number} amount - Amount to format
 * @param {boolean} showCode - Whether to show currency code
 * @returns {string} Formatted currency with code
 */
export function formatCurrencyWithCode(amount, showCode = true) {
  const currencyCode = getSelectedCurrency();
  const formatted = formatCurrency(amount, currencyCode);
  return showCode ? `${formatted} ${currencyCode}` : formatted;
}

/**
 * Parse currency string to number
 * @param {string} value - Currency string
 * @returns {number} Parsed number
 */
export function parseCurrency(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

// ============================================================
// NUMBER FORMATTING
// ============================================================

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted number
 */
export function formatNumber(num, decimals = 0) {
  if (num == null || isNaN(num)) return '0';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

/**
 * Format number in compact form (e.g., 1.2K, 3.4M)
 * @param {number} num - Number to format
 * @returns {string} Compact number
 */
export function formatCompactNumber(num) {
  if (num == null || isNaN(num)) return '0';
  
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(num);
}

/**
 * Format percentage
 * @param {number} value - Value (0-100 or 0-1)
 * @param {number} decimals - Decimal places
 * @param {boolean} isDecimal - Whether value is 0-1 (true) or 0-100 (false)
 * @returns {string} Formatted percentage
 */
export function formatPercent(value, decimals = 0, isDecimal = false) {
  if (value == null || isNaN(value)) return '0%';
  
  const pct = isDecimal ? value * 100 : value;
  return `${pct.toFixed(decimals)}%`;
}

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format duration in minutes to readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0 min';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

/**
 * Format phone number
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export function formatPhone(phone) {
  if (!phone) return '';
  
  const cleaned = String(phone).replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone;
}

// ============================================================
// TEXT FORMATTING
// ============================================================

/**
 * Format name (first letter uppercase)
 * @param {string} name - Name to format
 * @returns {string} Formatted name
 */
export function formatName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get initials from name
 * @param {string} name - Full name
 * @param {number} maxChars - Maximum characters
 * @returns {string} Initials
 */
export function getInitials(name, maxChars = 2) {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, maxChars);
}

/**
 * Pluralize word based on count
 * @param {number} count - Count
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional, defaults to singular + 's')
 * @returns {string} Pluralized string with count
 */
export function pluralize(count, singular, plural) {
  const word = count === 1 ? singular : (plural || `${singular}s`);
  return `${count} ${word}`;
}

/**
 * Format address
 * @param {Object} address - Address object
 * @returns {string} Formatted address
 */
export function formatAddress(address) {
  if (!address) return '';
  
  const parts = [
    address.street || address.Street || address.address,
    address.city || address.City,
    address.state || address.State || address.province || address.Province,
    address.postalCode || address.PostalCode || address.zip || address.Zip
  ].filter(Boolean);
  
  return parts.join(', ');
}

/**
 * Format rating (e.g., "4.5 (123 reviews)")
 * @param {number} rating - Rating value
 * @param {number} count - Review count
 * @returns {string} Formatted rating
 */
export function formatRating(rating, count) {
  if (!rating && rating !== 0) return 'No ratings';
  
  const ratingStr = Number(rating).toFixed(1);
  if (count != null) {
    return `${ratingStr} (${formatNumber(count)} ${count === 1 ? 'review' : 'reviews'})`;
  }
  return ratingStr;
}

// ============================================================
// STATUS FORMATTING
// ============================================================

/**
 * Format status for display
 * @param {string} status - Status string
 * @returns {string} Formatted status
 */
export function formatStatus(status) {
  if (!status) return '';
  
  return status
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Get status color class
 * @param {string} status - Status string
 * @returns {string} Color class name
 */
export function getStatusColor(status) {
  const statusLower = (status || '').toLowerCase();
  
  const colors = {
    // Success states
    active: 'success',
    approved: 'success',
    completed: 'success',
    confirmed: 'success',
    paid: 'success',
    visible: 'success',
    online: 'success',
    
    // Warning states
    pending: 'warning',
    processing: 'warning',
    in_progress: 'warning',
    awaiting: 'warning',
    
    // Neutral states
    inactive: 'neutral',
    hidden: 'neutral',
    offline: 'neutral',
    draft: 'neutral',
    
    // Danger states
    rejected: 'danger',
    cancelled: 'danger',
    failed: 'danger',
    suspended: 'danger',
    error: 'danger',
    
    // Info states
    refunded: 'info',
    disputed: 'info',
    new: 'info'
  };
  
  return colors[statusLower] || 'default';
}
