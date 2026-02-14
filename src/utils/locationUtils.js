/**
 * Centralized Location Formatting Utilities
 * 
 * This module provides consistent location formatting across the application.
 * All location displays should use "City, Province" format (e.g., "Toronto, ON")
 * without including the country.
 */

// Province name to abbreviation mapping
export const PROVINCE_ABBREVIATIONS = {
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

/**
 * Normalize a location string to "City, Province" format
 * Removes country if present (e.g., "Toronto, Ontario, Canada" -> "Toronto, ON")
 * 
 * @param {string} location - Raw location string
 * @returns {string} Normalized location in "City, Province" format
 */
export function normalizeLocation(location) {
  if (!location) return '';
  
  const parts = location.split(',').map(p => p.trim()).filter(Boolean);
  
  // If already in short format (e.g., "Toronto, ON"), return as-is
  if (parts.length === 2 && /^[A-Z]{2}$/.test(parts[1])) {
    return location.trim();
  }
  
  // If 3+ parts (City, Province, Country), take only first 2
  if (parts.length >= 3) {
    const city = parts[0];
    const province = parts[1];
    // Convert province to abbreviation if it's a full name
    const abbr = PROVINCE_ABBREVIATIONS[province.toLowerCase()] || province;
    return `${city}, ${abbr}`;
  }
  
  // If 2 parts, convert province to abbreviation
  if (parts.length === 2) {
    const city = parts[0];
    const province = parts[1];
    const abbr = PROVINCE_ABBREVIATIONS[province.toLowerCase()] || province;
    return `${city}, ${abbr}`;
  }
  
  return location;
}

/**
 * Extract city and province from Google Places address_components
 * Returns formatted "City, Province" string with province abbreviation
 * 
 * @param {Array} addressComponents - Google Places address_components array
 * @param {string} fallbackName - Fallback name if city not found (e.g., place.name)
 * @returns {string} Formatted location string
 */
export function formatFromGooglePlace(addressComponents, fallbackName = '') {
  if (!addressComponents || !Array.isArray(addressComponents)) {
    return fallbackName || '';
  }
  
  const city = addressComponents.find(c => c.types.includes('locality'))?.long_name || 
               addressComponents.find(c => c.types.includes('sublocality'))?.long_name ||
               addressComponents.find(c => c.types.includes('postal_town'))?.long_name ||
               fallbackName || '';
               
  const province = addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '';
  
  return [city, province].filter(Boolean).join(', ') || fallbackName;
}

/**
 * Extract full address components from Google Places for forms
 * Returns an object with all address parts
 * 
 * @param {Object} place - Google Places place object
 * @returns {Object} Address components object
 */
export function extractAddressComponents(place) {
  if (!place || !place.address_components) {
    return {
      streetNumber: '',
      route: '',
      fullAddress: '',
      city: '',
      province: '',
      provinceShort: '',
      country: 'Canada',
      postalCode: '',
      latitude: null,
      longitude: null,
      formattedLocation: ''
    };
  }
  
  const components = place.address_components;
  const pick = (type) => components.find(c => c.types.includes(type))?.long_name || '';
  const pickShort = (type) => components.find(c => c.types.includes(type))?.short_name || '';
  
  const streetNumber = pick('street_number');
  const route = pick('route');
  const city = pick('locality') || pick('sublocality') || pick('postal_town') || '';
  const province = pick('administrative_area_level_1');
  const provinceShort = pickShort('administrative_area_level_1');
  const country = pick('country') || 'Canada';
  const postalCode = pick('postal_code');
  
  const loc = place.geometry?.location;
  const latitude = loc ? (typeof loc.lat === 'function' ? loc.lat() : loc.lat) : null;
  const longitude = loc ? (typeof loc.lng === 'function' ? loc.lng() : loc.lng) : null;
  
  const fullAddress = streetNumber && route ? `${streetNumber} ${route}` : place.formatted_address || '';
  
  return {
    streetNumber,
    route,
    fullAddress,
    city,
    province,
    provinceShort,
    country,
    postalCode,
    latitude,
    longitude,
    // Formatted display string (City, Province abbreviation)
    formattedLocation: [city, provinceShort].filter(Boolean).join(', ')
  };
}

/**
 * Parse IP geolocation response and return formatted location
 * Prefers region_code (ON) over region (Ontario)
 * 
 * @param {Object} data - IP geolocation API response
 * @param {string} service - Service name ('ipwho' or 'backend')
 * @returns {Object|null} Parsed location data or null if invalid
 */
export function parseIPGeolocationResponse(data, service = 'ipwho') {
  if (!data) return null;
  
  // ipwho.is format
  if (service === 'ipwho' || data.success !== undefined) {
    if (!data.success || !data.city) return null;
    return {
      city: data.city,
      region: data.region_code || data.region, // Prefer abbreviation
      lat: data.latitude,
      lng: data.longitude,
      formattedLocation: `${data.city}, ${data.region_code || data.region}`
    };
  }
  
  // Backend proxy format
  if (data.city) {
    return {
      city: data.city,
      region: data.region_code || data.region, // Prefer abbreviation
      lat: data.lat,
      lng: data.lng,
      formattedLocation: `${data.city}, ${data.region_code || data.region}`
    };
  }
  
  return null;
}

/**
 * Create IP geolocation service configurations
 * Returns array of service configs for fallback attempts
 * 
 * @param {string} apiBaseUrl - Base URL for backend API
 * @returns {Array} Array of service configurations
 */
export function getIPGeolocationServices(apiBaseUrl) {
  return [
    {
      name: 'ipwho.is',
      url: 'https://ipwho.is/',
      parse: (data) => parseIPGeolocationResponse(data, 'ipwho')
    },
    {
      name: 'backend-proxy',
      url: `${apiBaseUrl}/geo/ip-location`,
      parse: (data) => parseIPGeolocationResponse(data, 'backend')
    }
  ];
}

/**
 * Format service area for display
 * Handles both string and object formats
 * 
 * @param {string|Object} area - Service area (string or object with city/province)
 * @returns {string} Formatted service area string
 */
export function formatServiceArea(area) {
  if (!area) return '';
  
  if (typeof area === 'string') {
    return normalizeLocation(area);
  }
  
  // Object format
  const city = area.city || area.CityName || area.name || '';
  const province = area.provinceShort || area.province || area.StateProvince || area.state || '';
  
  if (city && province) {
    const abbr = PROVINCE_ABBREVIATIONS[province.toLowerCase()] || province;
    return `${city}, ${abbr}`;
  }
  
  return area.formattedAddress || city || '';
}

/**
 * Format location for URL parameter
 * Ensures consistent format in URLs
 * 
 * @param {string} location - Location string
 * @returns {string} URL-safe formatted location
 */
export function formatLocationForUrl(location) {
  return normalizeLocation(location);
}

/**
 * Check if location string is already in normalized format
 * 
 * @param {string} location - Location string to check
 * @returns {boolean} True if already normalized
 */
export function isNormalizedLocation(location) {
  if (!location) return false;
  // Pattern: "City, XX" where XX is 2 uppercase letters
  return /^[^,]+,\s*[A-Z]{2}$/.test(location.trim());
}

/**
 * Get display-friendly location from profile data
 * 
 * @param {Object} profile - Profile object with City, State/Province fields
 * @returns {string} Formatted location string
 */
export function getProfileLocation(profile) {
  if (!profile) return '';
  
  const city = profile.City || profile.city || '';
  const state = profile.State || profile.state || profile.Province || profile.province || '';
  
  if (!city && !state) return '';
  
  const abbr = PROVINCE_ABBREVIATIONS[state.toLowerCase()] || state;
  return [city, abbr].filter(Boolean).join(', ');
}

/**
 * Get display-friendly location from service area data
 * 
 * @param {Object} area - Service area object
 * @returns {string} Formatted location string
 */
export function getServiceAreaLocation(area) {
  if (!area) return '';
  
  const city = area.CityName || area.city || area.name || '';
  const province = area.StateProvince || area.province || area.state || '';
  
  if (!city) return '';
  
  const abbr = PROVINCE_ABBREVIATIONS[province.toLowerCase()] || province;
  return [city, abbr].filter(Boolean).join(', ');
}
