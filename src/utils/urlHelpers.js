import { 
  encodeVendorId, 
  encodeBookingId, 
  encodeInvoiceId,
  encodeServiceId,
  getVendorPublicId,
  extractVendorIdFromSlug as hashExtractVendorId
} from './hashIds';

export const createSlug = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Build vendor profile URL using obfuscated public ID
 * Format: /vendor/XzA91Qb3kL4m (public ID only, no business name for cleaner URLs)
 * Clean URLs without unnecessary tracking parameters
 */
export const buildVendorProfileUrl = (vendor, options = {}) => {
  // Get the public ID (either from vendor object or encode the internal ID)
  const publicId = getVendorPublicId(vendor);
  if (!publicId) {
    console.warn('Could not generate public ID for vendor:', vendor);
    return '/vendor/unknown';
  }
  
  // Use only the public ID for cleaner, more secure URLs
  const baseUrl = '/vendor/' + publicId;
  
  // Only include essential parameters that affect page content
  const params = new URLSearchParams();
  if (options.photoId) params.append('photo_id', options.photoId);
  // Include availability/date params from search
  if (options.eventDate) params.append('eventDate', options.eventDate);
  if (options.startTime) params.append('startTime', options.startTime);
  if (options.endTime) params.append('endTime', options.endTime);
  const queryString = params.toString();
  return queryString ? baseUrl + '?' + queryString : baseUrl;
};

/**
 * Build booking URL using obfuscated public ID
 * Format: /booking/XzA91Qb3kL4m (public ID only, no business name for cleaner URLs)
 * Clean URLs with only essential booking parameters
 */
export const buildBookingUrl = (vendor, options = {}) => {
  // Get the public ID (either from vendor object or encode the internal ID)
  const publicId = getVendorPublicId(vendor);
  if (!publicId) {
    console.warn('Could not generate public ID for vendor:', vendor);
    return '/booking/unknown';
  }
  
  // Use only the public ID for cleaner, more secure URLs
  const baseUrl = '/booking/' + publicId;
  
  // Only include essential parameters that affect booking flow
  const params = new URLSearchParams();
  if (options.checkIn) params.append('check_in', options.checkIn);
  if (options.guests) params.append('guests', options.guests);
  // Encode service ID if provided
  if (options.serviceId) {
    const servicePublicId = encodeServiceId(options.serviceId);
    if (servicePublicId) {
      params.append('service_id', servicePublicId);
    }
  }
  // Pre-filled booking data from ProfileVendorWidget
  if (options.date) params.append('date', options.date);
  if (options.startTime) params.append('startTime', options.startTime);
  if (options.endTime) params.append('endTime', options.endTime);
  if (options.packageId) params.append('packageId', options.packageId);
  const queryString = params.toString();
  return queryString ? baseUrl + '?' + queryString : baseUrl;
};

/**
 * Build invoice URL using obfuscated public ID
 * Format: /invoice/XzA91Qb3 or /invoice/booking/XzA91Qb3
 */
export const buildInvoiceUrl = (invoiceOrBookingId, isBookingId = false) => {
  if (isBookingId) {
    const publicId = encodeBookingId(invoiceOrBookingId);
    return publicId ? `/invoice/booking/${publicId}` : '/invoice/unknown';
  }
  const publicId = encodeInvoiceId(invoiceOrBookingId);
  return publicId ? `/invoice/${publicId}` : '/invoice/unknown';
};

export const buildBecomeVendorUrl = (options = {}) => {
  const baseUrl = '/become-a-vendor';
  // Only include essential parameters
  const params = new URLSearchParams();
  if (options.ref) params.append('ref', options.ref);
  if (options.step) params.append('step', options.step);
  const queryString = params.toString();
  return queryString ? baseUrl + '?' + queryString : baseUrl;
};

/**
 * Extract vendor ID from slug - supports both old numeric format and new public ID format
 * Old format: "business-name-28" -> 28
 * New format: "business-name-XzA91Qb3" -> decoded internal ID
 */
export const extractVendorIdFromSlug = (slugWithId) => {
  if (!slugWithId) return null;
  
  // Use the hashIds utility which handles both formats
  const decodedId = hashExtractVendorId(slugWithId);
  if (decodedId !== null) {
    return decodedId;
  }
  
  // Fallback: try old numeric format
  const match = slugWithId.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

export const parseQueryParams = (search) => {
  const params = new URLSearchParams(search);
  const result = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
};

export const updateUrlParams = (params) => {
  const url = new URL(window.location);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  window.history.replaceState({}, '', url);
};

export const trackPageView = (pageName, params = {}) => {
};

export const trackEvent = (eventName, params = {}) => {
};
