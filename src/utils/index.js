/**
 * Utils Index
 * Centralized exports for all utility functions
 * Import from this file for cleaner imports: import { formatDate, apiGet } from '../utils';
 */

// Date and formatting utilities
export {
  formatDate,
  formatDateTime,
  formatDateLong,
  formatDateFormal,
  formatMonthYear,
  formatDateWithWeekday,
  formatTimeAgo,
  formatMoney,
  formatCurrency,
  formatLocationShort,
  formatResponseTime,
  formatResponseTimeShort,
  normalizeString,
  debounce,
  updatePageTitle,
  updateFaviconWithNotification,
  generateSessionId,
  getCategoryIcon,
  getCategoryIconHtml,
  showBanner,
  showSuccess,
  showError,
  showInfo,
  detectBannerVariant
} from './helpers';

// API utilities
export {
  getAuthHeaders,
  getAuthHeaderOnly,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiPostFormData,
  apiPutFormData,
  handleApiResponse,
  fetchApi,
  postApi
} from './api';

// Tax calculation utilities
export {
  PROVINCE_TAX_RATES,
  PROVINCE_ABBREVIATIONS,
  CITY_TO_PROVINCE,
  getProvinceFromLocation,
  getTaxInfoForProvince,
  calculateBookingFees,
  formatCurrency as formatCurrencyCAD
} from './taxCalculations';

// URL helpers
export {
  buildInvoiceUrl,
  extractVendorIdFromSlug,
  parseQueryParams,
  trackPageView
} from './urlHelpers';

// Booking status utilities
export * from './bookingStatus';

// Availability utilities
export * from './availabilityUtils';

// Hash ID utilities
export * from './hashIds';

// Notification utilities
export * from './notifications';

// Skeleton loaders
export * from './skeletons';

// Stripe utilities
export * from './stripe';

// UI Constants
export * from './uiConstants';

// Data manipulation utilities
export * from './dataUtils';

// Format utilities
export * from './formatUtils';
