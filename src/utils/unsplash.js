/**
 * Unsplash API Utility
 * Fetches images from Unsplash based on keywords, cities, and categories
 */

import { UNSPLASH_ACCESS_KEY } from '../config';

const UNSPLASH_API_URL = 'https://api.unsplash.com';

// Cache for storing fetched images to reduce API calls
const imageCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch a random image from Unsplash based on a search query
 * @param {string} query - Search query (e.g., "Toronto wedding", "photography")
 * @param {object} options - Additional options
 * @param {string} options.orientation - Image orientation: 'landscape', 'portrait', 'squarish'
 * @param {number} options.width - Desired width for the image URL
 * @param {number} options.height - Desired height for the image URL
 * @returns {Promise<object|null>} Image data or null if not found
 */
export const fetchUnsplashImage = async (query, options = {}) => {
  const { orientation = 'landscape', width = 800, height = 600 } = options;
  
  // Check cache first
  const cacheKey = `${query}-${orientation}`;
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `${UNSPLASH_API_URL}/photos/random?query=${encodeURIComponent(query)}&orientation=${orientation}&client_id=${UNSPLASH_ACCESS_KEY}`
    );

    if (!response.ok) {
      console.error('Unsplash API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    const imageData = {
      id: data.id,
      url: data.urls?.regular || data.urls?.small,
      urlSmall: data.urls?.small,
      urlThumb: data.urls?.thumb,
      urlFull: data.urls?.full,
      urlCustom: `${data.urls?.raw}&w=${width}&h=${height}&fit=crop&q=80`,
      alt: data.alt_description || query,
      photographer: data.user?.name,
      photographerUrl: data.user?.links?.html,
      downloadUrl: data.links?.download,
      color: data.color
    };

    // Cache the result
    imageCache.set(cacheKey, { data: imageData, timestamp: Date.now() });

    return imageData;
  } catch (error) {
    console.error('Error fetching Unsplash image:', error);
    return null;
  }
};

/**
 * Fetch multiple images from Unsplash based on a search query
 * @param {string} query - Search query
 * @param {number} count - Number of images to fetch (max 30)
 * @param {object} options - Additional options
 * @returns {Promise<array>} Array of image data
 */
export const fetchUnsplashImages = async (query, count = 5, options = {}) => {
  const { orientation = 'landscape', page = 1 } = options;
  
  // Check cache first
  const cacheKey = `search-${query}-${orientation}-${count}-${page}`;
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&page=${page}&orientation=${orientation}&client_id=${UNSPLASH_ACCESS_KEY}`
    );

    if (!response.ok) {
      console.error('Unsplash API error:', response.status);
      return [];
    }

    const data = await response.json();
    
    const images = (data.results || []).map(photo => ({
      id: photo.id,
      url: photo.urls?.regular || photo.urls?.small,
      urlSmall: photo.urls?.small,
      urlThumb: photo.urls?.thumb,
      urlFull: photo.urls?.full,
      alt: photo.alt_description || query,
      photographer: photo.user?.name,
      photographerUrl: photo.user?.links?.html,
      color: photo.color
    }));

    // Cache the result
    imageCache.set(cacheKey, { data: images, timestamp: Date.now() });

    return images;
  } catch (error) {
    console.error('Error fetching Unsplash images:', error);
    return [];
  }
};

/**
 * Get a hero image for a city
 * @param {string} cityName - City name (e.g., "Toronto", "Vancouver")
 * @returns {Promise<object|null>} Image data or null
 */
export const getCityHeroImage = async (cityName) => {
  return fetchUnsplashImage(`${cityName} city skyline`, { orientation: 'landscape', width: 1200, height: 600 });
};

/**
 * Get a hero image for a vendor category
 * @param {string} category - Category key (e.g., "photo", "catering", "music")
 * @returns {Promise<object|null>} Image data or null
 */
export const getCategoryHeroImage = async (category) => {
  const categoryQueries = {
    'photo': 'wedding photography camera',
    'video': 'wedding videography filming',
    'venue': 'wedding venue elegant',
    'music': 'wedding live music band',
    'dj': 'wedding dj party music',
    'catering': 'wedding catering food elegant',
    'entertainment': 'wedding entertainment party',
    'experiences': 'event experience celebration',
    'decorations': 'wedding decoration flowers',
    'beauty': 'bridal makeup beauty',
    'cake': 'wedding cake elegant',
    'transportation': 'wedding car limousine',
    'planners': 'wedding planner event',
    'fashion': 'wedding dress fashion',
    'stationery': 'wedding invitation stationery'
  };

  const query = categoryQueries[category?.toLowerCase()] || `${category} wedding event`;
  return fetchUnsplashImage(query, { orientation: 'landscape', width: 1200, height: 600 });
};

/**
 * Get a hero image for a discovery type
 * @param {string} discoveryType - Discovery type (e.g., "trending", "top-rated", "new")
 * @returns {Promise<object|null>} Image data or null
 */
export const getDiscoveryHeroImage = async (discoveryType) => {
  const discoveryQueries = {
    'trending': 'popular wedding celebration',
    'top-rated': 'luxury wedding elegant',
    'new': 'modern wedding fresh',
    'quick-responders': 'wedding planning professional',
    'near-you': 'local wedding venue'
  };

  const query = discoveryQueries[discoveryType?.toLowerCase()] || 'wedding event celebration';
  return fetchUnsplashImage(query, { orientation: 'landscape', width: 1200, height: 600 });
};

/**
 * Get background images for browse pages
 * @param {string} type - Type of page ('city', 'category', 'discovery', 'all')
 * @param {string} value - The specific value (city name, category key, etc.)
 * @returns {Promise<object|null>} Image data or null
 */
export const getBrowsePageImage = async (type, value) => {
  switch (type) {
    case 'city':
      return getCityHeroImage(value);
    case 'category':
      return getCategoryHeroImage(value);
    case 'discovery':
      return getDiscoveryHeroImage(value);
    default:
      return fetchUnsplashImage('wedding event celebration', { orientation: 'landscape', width: 1200, height: 600 });
  }
};

/**
 * Clear the image cache
 */
export const clearImageCache = () => {
  imageCache.clear();
};

export default {
  fetchUnsplashImage,
  fetchUnsplashImages,
  getCityHeroImage,
  getCategoryHeroImage,
  getDiscoveryHeroImage,
  getBrowsePageImage,
  clearImageCache
};
