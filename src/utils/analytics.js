/**
 * Google Analytics 4 (GA4) utility functions
 * Uses gtag.js loaded in index.html
 */

const GA_MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID || 'G-70EZLB4JGE';

/**
 * Track a page view
 * @param {string} path - The page path (e.g., '/vendor/123')
 * @param {string} title - Optional page title
 */
export const trackPageView = (path, title) => {
  if (typeof window.gtag === 'function') {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: path,
      page_title: title || document.title
    });
  }
};

/**
 * Track a custom event
 * @param {string} eventName - The event name (e.g., 'sign_up', 'purchase')
 * @param {object} params - Event parameters
 */
export const trackEvent = (eventName, params = {}) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
};

/**
 * Track user login
 * @param {string} method - Login method (e.g., 'email', 'google')
 */
export const trackLogin = (method) => {
  trackEvent('login', { method });
};

/**
 * Track user signup
 * @param {string} method - Signup method (e.g., 'email', 'google')
 */
export const trackSignUp = (method) => {
  trackEvent('sign_up', { method });
};

/**
 * Track a booking request
 * @param {object} params - Booking details
 */
export const trackBookingRequest = (params) => {
  trackEvent('begin_checkout', {
    currency: 'CAD',
    value: params.amount,
    items: [{
      item_id: params.vendorId,
      item_name: params.vendorName,
      item_category: params.category
    }]
  });
};

/**
 * Track a completed payment
 * @param {object} params - Payment details
 */
export const trackPurchase = (params) => {
  trackEvent('purchase', {
    transaction_id: params.bookingId,
    currency: 'CAD',
    value: params.amount,
    items: [{
      item_id: params.vendorId,
      item_name: params.vendorName,
      item_category: params.category
    }]
  });
};

/**
 * Track vendor profile view
 * @param {object} params - Vendor details
 */
export const trackVendorView = (params) => {
  trackEvent('view_item', {
    currency: 'CAD',
    value: params.startingPrice || 0,
    items: [{
      item_id: params.vendorId,
      item_name: params.vendorName,
      item_category: params.category
    }]
  });
};

/**
 * Track search
 * @param {string} searchTerm - The search query
 */
export const trackSearch = (searchTerm) => {
  trackEvent('search', { search_term: searchTerm });
};

/**
 * Track adding vendor to favorites
 * @param {object} params - Vendor details
 */
export const trackAddToFavorites = (params) => {
  trackEvent('add_to_wishlist', {
    currency: 'CAD',
    value: params.startingPrice || 0,
    items: [{
      item_id: params.vendorId,
      item_name: params.vendorName,
      item_category: params.category
    }]
  });
};

export default {
  trackPageView,
  trackEvent,
  trackLogin,
  trackSignUp,
  trackBookingRequest,
  trackPurchase,
  trackVendorView,
  trackSearch,
  trackAddToFavorites
};
