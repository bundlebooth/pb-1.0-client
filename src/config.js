// ============================================================
// CENTRALIZED ENVIRONMENT CONFIGURATION
// ============================================================
// 
// All environment variables should be defined in .env file and
// accessed through this config.js file. This ensures:
//   1. Single source of truth for all configuration
//   2. Easy switching between development and production
//   3. Proper handling of environment variables for Render/Netlify
//
// For production deployment (Render/Netlify):
//   - Set REACT_APP_API_URL in environment variables
//   - Set REACT_APP_GOOGLE_MAPS_API_KEY in environment variables
//   - Set REACT_APP_GOOGLE_CLIENT_ID in environment variables
//   - Set REACT_APP_STRIPE_PUBLIC_KEY in environment variables
//
// For local development:
//   - Create .env file with the variables above
//   - Or use localStorage override (see below)
//
// ============================================================

// ============================================================
// API CONFIGURATION
// ============================================================

// Production and local API URLs
const PRODUCTION_API_URL = process.env.REACT_APP_API_URL || 'https://bdb-3-0-venuevue-api.onrender.com/api';
const LOCAL_API_URL = 'http://localhost:5000/api';

// Determine if we should use production API
const getApiMode = () => {
  // Check localStorage override first (for development testing)
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('USE_PRODUCTION_API');
    if (override !== null) {
      return override === 'true';
    }
  }
  // In production build (NODE_ENV=production), always use production API
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  // Default to local for development
  return false;
};

const USE_PRODUCTION_API = getApiMode();

// Main API URL export - use this throughout the app
export const API_BASE_URL = USE_PRODUCTION_API ? PRODUCTION_API_URL : LOCAL_API_URL;

// Derive Socket base URL from API origin
let SOCKET_BASE_URL = '';
try {
  const apiUrl = new URL(API_BASE_URL);
  SOCKET_BASE_URL = apiUrl.origin;
} catch (_) {
  SOCKET_BASE_URL = 'https://bdb-3-0-venuevue-api.onrender.com';
}
export { SOCKET_BASE_URL };

// ============================================================
// GOOGLE CONFIGURATION
// ============================================================

// Google Maps API Key - from .env or fallback
export const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyCPhhp2rAt1VTrIzjgagJXZPZ_nc7K_BVo';

// Google OAuth Client ID - from .env
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

// Set global for Google Maps callback
if (typeof window !== 'undefined') {
  window.GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_API_KEY;
}

// ============================================================
// STRIPE CONFIGURATION
// ============================================================

// Stripe Public Key - from .env
export const STRIPE_PUBLIC_KEY = process.env.REACT_APP_STRIPE_PUBLIC_KEY || '';

// ============================================================
// GIPHY CONFIGURATION
// ============================================================

// Giphy API Key - from .env or fallback (public SDK key)
export const GIPHY_API_KEY = process.env.REACT_APP_GIPHY_API_KEY || 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';

// ============================================================
// APP CONFIGURATION
// ============================================================

// App name and branding
export const APP_NAME = 'Planbeau';
export const APP_TAGLINE = 'Find and book the perfect vendors for your events';
export const SUPPORT_EMAIL = 'support@planbeau.com';

// App URLs
export const APP_URL = process.env.REACT_APP_URL || 'https://www.planbeau.com';

// ============================================================
// UNSPLASH API CONFIGURATION
// ============================================================
export const UNSPLASH_ACCESS_KEY = process.env.REACT_APP_UNSPLASH_ACCESS_KEY || 'fDJokb1XWuN-cquNUgCRsn_Gk1UjRV-JltG9sfPozB8';

// ============================================================
// HASHID CONFIGURATION
// ============================================================

// HashID salt for encoding/decoding IDs - MUST match backend salt
// In production, set REACT_APP_HASHID_SALT in environment variables
// Fallback salt is used for development - ensure it matches backend
const DEFAULT_HASHID_SALT = 'd4f1b8c0e7a24f56a9c3e1b77f08d92c4eb1a6f53d7e9c0fa2b14ce8f937ab10';
export const HASHID_SALT = process.env.REACT_APP_HASHID_SALT || DEFAULT_HASHID_SALT;
export const HASHID_MIN_LENGTH = 14;

// ============================================================
// ENVIRONMENT INFO EXPORT
// ============================================================

export const ENV_CONFIG = {
  isProduction: USE_PRODUCTION_API,
  apiUrl: API_BASE_URL,
  socketUrl: SOCKET_BASE_URL,
  mode: USE_PRODUCTION_API ? 'Production' : 'Development (localhost)',
  nodeEnv: process.env.NODE_ENV,
  appName: APP_NAME,
  appUrl: APP_URL
};

// ============================================================
// DEVELOPMENT HELPERS (browser console)
// ============================================================

if (typeof window !== 'undefined') {
  // Switch to production API
  window.switchToProduction = () => {
    localStorage.setItem('USE_PRODUCTION_API', 'true');
    window.location.reload();
  };
  
  // Switch to localhost API
  window.switchToLocalhost = () => {
    localStorage.setItem('USE_PRODUCTION_API', 'false');
    window.location.reload();
  };
  
  // Reset to default API mode
  window.resetApiMode = () => {
    localStorage.removeItem('USE_PRODUCTION_API');
    window.location.reload();
  };
  
  // Get current API configuration
  window.getCurrentApiMode = () => ENV_CONFIG;
  
  // Log current config (useful for debugging)
  window.logConfig = () => {
    console.log('=== Planbeau Configuration ===');
    console.log('API URL:', API_BASE_URL);
    console.log('Socket URL:', SOCKET_BASE_URL);
    console.log('Environment:', ENV_CONFIG.mode);
    console.log('Node ENV:', process.env.NODE_ENV);
    console.log('Google Maps Key:', GOOGLE_MAPS_API_KEY ? '✓ Set' : '✗ Not set');
    console.log('Google Client ID:', GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Not set');
    console.log('Stripe Key:', STRIPE_PUBLIC_KEY ? '✓ Set' : '✗ Not set');
    console.log('GIPHY Key:', GIPHY_API_KEY ? '✓ Set' : '✗ Not set');
    return ENV_CONFIG;
  };
}
