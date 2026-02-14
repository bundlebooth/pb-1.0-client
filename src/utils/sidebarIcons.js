/**
 * Centralized App Icons
 * 
 * All icons used across the application for consistency.
 * Import this file to ensure consistent icon usage.
 * 
 * Usage:
 *   import { ICONS, getIcon } from '../utils/sidebarIcons';
 *   <i className={ICONS.bookings}></i>
 *   <i className={getIcon('bookings')}></i>
 */

// Font Awesome icon class names - Using outline (far) style like Airbnb
export const ICONS = {
  // Navigation & Bottom Nav - Outline style
  explore: 'far fa-compass',
  bookings: 'far fa-calendar-check',
  messages: 'far fa-envelope',
  favorites: 'far fa-heart',
  profile: 'far fa-user-circle',
  map: 'far fa-map',
  forum: 'far fa-comments',
  
  // Sidebar Menu Items - Outline style
  viewProfile: 'far fa-user-circle',
  settings: 'far fa-cog',
  helpCentre: 'far fa-question-circle',
  logout: 'far fa-sign-out-alt',
  
  // Actions & UI
  notifications: 'far fa-bell',
  notificationsFilled: 'fas fa-bell',
  close: 'far fa-times-circle',
  back: 'far fa-arrow-alt-circle-left',
  chevronRight: 'fas fa-chevron-right',
  chevronLeft: 'fas fa-chevron-left',
  chevronDown: 'fas fa-chevron-down',
  chevronUp: 'fas fa-chevron-up',
  search: 'far fa-search',
  filter: 'far fa-filter',
  sort: 'far fa-sort',
  edit: 'far fa-edit',
  delete: 'far fa-trash-alt',
  add: 'far fa-plus-square',
  check: 'far fa-check-circle',
  
  // Vendor/Hosting - Outline style
  switchToHosting: 'far fa-key',
  switchToExplore: 'far fa-compass',
  becomeVendor: 'far fa-store',
  vendor: 'far fa-store',
  
  // Quick Action Cards - Outline style
  myBookings: 'far fa-calendar-check',
  myFavorites: 'far fa-heart',
  
  // Account/Settings Pages - Outline style
  personalInfo: 'far fa-user',
  personalDetails: 'far fa-user',
  loginSecurity: 'far fa-lock',
  security: 'far fa-shield-alt',
  privacy: 'far fa-shield-alt',
  notificationsSettings: 'far fa-bell',
  taxes: 'far fa-file-alt',
  payments: 'far fa-credit-card',
  languageCurrency: 'far fa-globe',
  location: 'far fa-map-marker-alt',
  communication: 'far fa-envelope',
  
  // Client Pages - Outline style
  reviews: 'far fa-star',
  invoices: 'far fa-file-alt',
  calendar: 'far fa-calendar-alt',
  
  // Vendor Profile / Become Vendor - Outline style
  gallery: 'far fa-images',
  services: 'far fa-concierge-bell',
  pricing: 'far fa-money-bill-alt',
  availability: 'far fa-clock',
  description: 'far fa-file-alt',
  contact: 'far fa-address-book',
  website: 'far fa-globe',
  social: 'far fa-share-square',
  
  // Status Icons - Keep some solid for emphasis
  success: 'far fa-check-circle',
  error: 'far fa-times-circle',
  warning: 'far fa-exclamation-circle',
  info: 'far fa-info-circle',
  pending: 'far fa-clock',
  confirmed: 'far fa-check-circle',
  cancelled: 'far fa-times-circle',
  
  // Misc - Outline style
  star: 'far fa-star',
  starEmpty: 'far fa-star',
  starHalf: 'fas fa-star-half-alt',
  heart: 'far fa-heart',
  heartEmpty: 'far fa-heart',
  share: 'far fa-share-square',
  copy: 'far fa-copy',
  download: 'far fa-arrow-alt-circle-down',
  upload: 'far fa-arrow-alt-circle-up',
  camera: 'far fa-camera',
  image: 'far fa-image',
  video: 'far fa-play-circle',
  file: 'far fa-file',
  link: 'far fa-link',
  externalLink: 'far fa-external-link-alt',
};

// Helper function to get icon class
export const getIcon = (iconName) => {
  return ICONS[iconName] || 'fas fa-circle';
};

// Alias for backward compatibility
export const SIDEBAR_ICONS = ICONS;

export default ICONS;
