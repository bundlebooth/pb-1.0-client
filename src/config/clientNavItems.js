/**
 * Shared Client Navigation Items
 * Used across all Client pages for consistent sidebar navigation
 * All icons use 'far' (outline) style for Airbnb-like consistency
 */

export const clientNavItems = [
  { path: '/client/bookings', label: 'My Bookings', icon: 'far fa-calendar-check' },
  { path: '/client/messages', label: 'Messages', icon: 'far fa-comment-dots' },
  { path: '/client/favorites', label: 'Favorites', icon: 'far fa-heart' },
  { path: '/client/reviews', label: 'Reviews', icon: 'far fa-star' },
  { path: '/client/invoices', label: 'Invoices', icon: 'far fa-file-alt' },
  { path: '/client/settings', label: 'Settings', icon: 'fas fa-cog' },
];

export default clientNavItems;
