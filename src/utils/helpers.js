// Utility helper functions

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

// Update favicon with red notification dot
let originalFavicon = null;
export function updateFaviconWithNotification(hasNotifications) {
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
  img.src = originalFavicon;
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Format date with proper validation
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    // Handle various date formats
    let date;
    if (typeof dateString === 'string') {
      // Try parsing ISO format first
      date = new Date(dateString);
      // If invalid, try other formats
      if (isNaN(date.getTime())) {
        // Try parsing "YYYY-MM-DD" format explicitly
        const parts = dateString.split(/[-/T]/);
        if (parts.length >= 3) {
          date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
      }
    } else if (dateString instanceof Date) {
      date = dateString;
    } else {
      return 'N/A';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' });
  } catch {
    return 'N/A';
  }
}

// Format relative time (e.g., "2 hours ago", "3 days ago")
export function formatTimeAgo(dateString) {
  if (!dateString) return 'Recently';
  try {
    // Handle various date formats
    let date;
    if (typeof dateString === 'string') {
      date = new Date(dateString);
      // If invalid, try other formats
      if (isNaN(date.getTime())) {
        const parts = dateString.split(/[-/T]/);
        if (parts.length >= 3) {
          date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
      }
    } else if (dateString instanceof Date) {
      date = dateString;
    } else {
      return 'Recently';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Recently';
    
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

// Format money (simple format)
export function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

// Format currency using Intl.NumberFormat (Canadian dollars)
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount || 0);
}

// Format date with time (for timestamps like "Jan 14, 2026, 7:20 PM")
export function formatDateTime(dateInput) {
  if (!dateInput) return 'N/A';
  try {
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput.replace(' ', 'T'));
    } else if (typeof dateInput === 'object' && dateInput !== null) {
      date = new Date(dateInput);
    } else {
      date = new Date(dateInput);
    }
    
    if (!date || isNaN(date.getTime())) return 'N/A';
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return 'N/A';
  }
}

// Format date for display (long format: "Monday, January 14, 2026")
export function formatDateLong(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return '';
  }
}

// Format date for invoices/formal documents (e.g., "January 14, 2026")
export function formatDateFormal(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return '';
  }
}

// Format date for member since (e.g., "January 2026")
export function formatMonthYear(dateString) {
  if (!dateString) return 'Recently';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

// Format date with weekday short (e.g., "Sat, Jan 14, 2026")
export function formatDateWithWeekday(dateString) {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateString;
    const dateObj = new Date(year, month - 1, day);
    if (isNaN(dateObj.getTime())) return dateString;
    return dateObj.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return dateString;
  }
}

// Normalize string for search/comparison
export function normalizeString(value) {
  return (value || '').toString().toLowerCase().trim();
}

// Canadian province abbreviations
const PROVINCE_ABBREVIATIONS = {
  'alberta': 'AB',
  'british columbia': 'BC',
  'manitoba': 'MB',
  'new brunswick': 'NB',
  'newfoundland and labrador': 'NL',
  'newfoundland': 'NL',
  'northwest territories': 'NT',
  'nova scotia': 'NS',
  'nunavut': 'NU',
  'ontario': 'ON',
  'prince edward island': 'PE',
  'quebec': 'QC',
  'saskatchewan': 'SK',
  'yukon': 'YT'
};

// Format location to "City, AB" format for display
export function formatLocationShort(location) {
  if (!location) return '';
  
  // If already in short format (e.g., "Toronto, ON"), return as-is
  if (/^[^,]+,\s*[A-Z]{2}$/.test(location.trim())) {
    return location.trim();
  }
  
  // Split by comma first, then by space if no comma
  let parts = location.split(',').map(p => p.trim()).filter(Boolean);
  
  // If only one part (no comma), try splitting by space to find province
  if (parts.length === 1) {
    const words = location.trim().split(/\s+/);
    if (words.length >= 2) {
      // Check if last word is a province name
      const lastWord = words[words.length - 1].toLowerCase();
      if (PROVINCE_ABBREVIATIONS[lastWord]) {
        const city = words.slice(0, -1).join(' ');
        return `${city}, ${PROVINCE_ABBREVIATIONS[lastWord]}`;
      }
      // Check if last two words form a province name (e.g., "British Columbia")
      if (words.length >= 3) {
        const lastTwoWords = words.slice(-2).join(' ').toLowerCase();
        if (PROVINCE_ABBREVIATIONS[lastTwoWords]) {
          const city = words.slice(0, -2).join(' ');
          return `${city}, ${PROVINCE_ABBREVIATIONS[lastTwoWords]}`;
        }
      }
    }
  }
  
  if (parts.length === 0) return location;
  
  // Get city (first part)
  const city = parts[0];
  
  // Try to find province in remaining parts
  let provinceAbbr = '';
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].toLowerCase().replace('canada', '').trim();
    if (PROVINCE_ABBREVIATIONS[part]) {
      provinceAbbr = PROVINCE_ABBREVIATIONS[part];
      break;
    }
    // Check if it's already an abbreviation
    if (/^[A-Z]{2}$/.test(parts[i].trim())) {
      provinceAbbr = parts[i].trim();
      break;
    }
  }
  
  if (provinceAbbr) {
    return `${city}, ${provinceAbbr}`;
  }
  
  // If no province found, just return city
  return city;
}

// Format response time to "Responds within X hours" format
export function formatResponseTime(minutes) {
  if (!minutes || minutes <= 0) return 'Responds within a few hours';
  
  if (minutes < 60) {
    return `Responds within ${minutes} min${minutes !== 1 ? 's' : ''}`;
  } else if (minutes < 120) {
    return 'Responds within 1 hour';
  } else if (minutes < 1440) { // Less than 24 hours
    const hours = Math.round(minutes / 60);
    return `Responds within ${hours} hours`;
  } else {
    const days = Math.round(minutes / 1440);
    return `Responds within ${days} day${days !== 1 ? 's' : ''}`;
  }
}

// Format response time for vendor cards (shorter format)
export function formatResponseTimeShort(minutes) {
  if (!minutes || minutes <= 0) return 'Quick responder';
  
  if (minutes < 60) {
    return `~${minutes} mins`;
  } else if (minutes < 1440) {
    const hours = Math.round(minutes / 60);
    return `~${hours} hr${hours !== 1 ? 's' : ''}`;
  } else {
    const days = Math.round(minutes / 1440);
    return `~${days} day${days !== 1 ? 's' : ''}`;
  }
}

// Generate session ID
export function generateSessionId() {
  const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  sessionStorage.setItem('sessionId', sessionId);
  return sessionId;
}

// Show banner notification - import from banners.js
export { showBanner, showSuccess, showError, showInfo, detectBannerVariant } from './banners';

// Map category to icon
export function getCategoryIcon(category) {
  const icons = {
    venue: 'fa-building',
    photo: 'fa-camera',
    music: 'fa-music',
    catering: 'fa-utensils',
    entertainment: 'fa-theater-masks',
    experiences: 'fa-star',
    decor: 'fa-ribbon',
    beauty: 'fa-spa',
    cake: 'fa-birthday-cake',
    transport: 'fa-shuttle-van',
    planner: 'fa-clipboard-list',
    fashion: 'fa-tshirt',
    stationery: 'fa-envelope'
  };
  return icons[category] || 'fa-layer-group';
}

// Get category icon HTML
export function getCategoryIconHtml(category) {
  const icon = getCategoryIcon(category);
  return `<i class="fas ${icon}" style="font-size: 12px;"></i>`;
}

