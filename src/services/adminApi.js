/**
 * Admin API Service
 * Centralized API calls for the Admin Dashboard
 * All endpoints use existing authentication middleware
 */

import { apiGet, apiPost, apiPut, apiDelete, handleApiResponse } from '../utils/api';

// ============================================================
// DASHBOARD & OVERVIEW
// ============================================================

export const getDashboardStats = async () => {
  const response = await apiGet('/admin/dashboard-stats');
  return handleApiResponse(response);
};

export const getRecentActivity = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/recent-activity${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const getPlatformHealth = async () => {
  const response = await apiGet('/admin/platform-health');
  return handleApiResponse(response);
};

export const getEnvironmentInfo = async () => {
  const response = await apiGet('/admin/environment-info');
  return handleApiResponse(response);
};

// ============================================================
// USER MANAGEMENT
// ============================================================

export const getUsers = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/users${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const getUserDetails = async (userId) => {
  const response = await apiGet(`/admin/users/${userId}`);
  return handleApiResponse(response);
};

export const updateUser = async (userId, data) => {
  const response = await apiPut(`/admin/users/${userId}`, data);
  return handleApiResponse(response);
};

export const toggleUserStatus = async (userId) => {
  const response = await apiPost(`/admin/users/${userId}/toggle-status`);
  return handleApiResponse(response);
};

export const resetUserPassword = async (userId) => {
  const response = await apiPost(`/admin/users/${userId}/reset-password`);
  return handleApiResponse(response);
};

export const freezeUser = async (userId) => {
  const response = await apiPost(`/admin/users/${userId}/freeze`);
  return handleApiResponse(response);
};

export const unfreezeUser = async (userId) => {
  const response = await apiPost(`/admin/users/${userId}/unfreeze`);
  return handleApiResponse(response);
};

export const unlockUser = async (userId) => {
  const response = await apiPost(`/admin/users/${userId}/unlock`);
  return handleApiResponse(response);
};

export const getUserActivity = async (userId) => {
  const response = await apiGet(`/admin/users/${userId}/activity`);
  return handleApiResponse(response);
};

export const getLockedAccounts = async () => {
  const response = await apiGet('/admin/security/locked-accounts');
  return handleApiResponse(response);
};

// ============================================================
// VENDOR MANAGEMENT
// ============================================================

export const getVendorApprovals = async (status = 'pending') => {
  const response = await apiGet(`/admin/vendor-approvals?status=${status}`);
  return handleApiResponse(response);
};

export const getVendorApprovalDetails = async (vendorId) => {
  const response = await apiGet(`/admin/vendor-approvals/${vendorId}`);
  return handleApiResponse(response);
};

export const approveVendor = async (vendorId, adminNotes = '') => {
  const response = await apiPost(`/admin/vendors/${vendorId}/approve`, { adminNotes });
  return handleApiResponse(response);
};

export const rejectVendor = async (vendorId, reason) => {
  const response = await apiPost(`/admin/vendors/${vendorId}/reject`, { reason });
  return handleApiResponse(response);
};

export const getVendors = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/vendors${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const suspendVendor = async (vendorId, reason) => {
  const response = await apiPost(`/admin/vendors/${vendorId}/suspend`, { reason });
  return handleApiResponse(response);
};

export const reactivateVendor = async (vendorId) => {
  const response = await apiPost(`/admin/vendors/${vendorId}/reactivate`);
  return handleApiResponse(response);
};

export const toggleVendorVisibility = async (vendorId) => {
  const response = await apiPost(`/admin/vendors/${vendorId}/toggle-visibility`);
  return handleApiResponse(response);
};

export const getVendorBadges = async (vendorId) => {
  const response = await apiGet(`/admin/vendors/${vendorId}/badges`);
  return handleApiResponse(response);
};

export const assignVendorBadge = async (vendorId, badgeData) => {
  const response = await apiPost(`/admin/vendors/${vendorId}/badges`, badgeData);
  return handleApiResponse(response);
};

export const removeVendorBadge = async (vendorId, badgeId) => {
  const response = await apiDelete(`/admin/vendors/${vendorId}/badges/${badgeId}`);
  return handleApiResponse(response);
};

export const getBadgeTypes = async () => {
  const response = await apiGet('/admin/badges');
  return handleApiResponse(response);
};

export const getVendorReports = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/vendor-reports${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const updateVendorReport = async (reportId, data) => {
  const response = await apiPut(`/admin/vendor-reports/${reportId}`, data);
  return handleApiResponse(response);
};

// ============================================================
// CATEGORY MANAGEMENT
// ============================================================

export const getCategories = async () => {
  const response = await apiGet('/admin/categories');
  return handleApiResponse(response);
};

export const createCategory = async (data) => {
  const response = await apiPost('/admin/categories', data);
  return handleApiResponse(response);
};

export const updateCategory = async (categoryId, data) => {
  const response = await apiPut(`/admin/categories/${categoryId}`, data);
  return handleApiResponse(response);
};

export const deleteCategory = async (categoryId) => {
  const response = await apiDelete(`/admin/categories/${categoryId}`);
  return handleApiResponse(response);
};

export const toggleCategoryVisibility = async (categoryId, visible) => {
  const response = await apiPost(`/admin/categories/${categoryId}/visibility`, { visible });
  return handleApiResponse(response);
};

// ============================================================
// BOOKINGS & PAYMENTS
// ============================================================

export const getBookings = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/bookings${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const getBookingDetails = async (bookingId) => {
  const response = await apiGet(`/admin/bookings/${bookingId}`);
  return handleApiResponse(response);
};

export const updateBooking = async (bookingId, data) => {
  const response = await apiPut(`/admin/bookings/${bookingId}`, data);
  return handleApiResponse(response);
};

export const cancelBooking = async (bookingId, reason) => {
  const response = await apiPost(`/admin/bookings/${bookingId}/cancel`, { reason });
  return handleApiResponse(response);
};

export const processRefund = async (bookingId, amount, reason) => {
  const response = await apiPost(`/admin/bookings/${bookingId}/refund`, { amount, reason });
  return handleApiResponse(response);
};

export const resolveDispute = async (bookingId, resolution, action) => {
  const response = await apiPost(`/admin/bookings/${bookingId}/resolve-dispute`, { resolution, action });
  return handleApiResponse(response);
};

export const exportBookings = async (status) => {
  const response = await apiGet(`/admin/bookings/export?status=${status || 'all'}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(errorData.error || 'Failed to export bookings');
  }
  return response;
};

export const getTransactions = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/payments/transactions${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const getPayouts = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/payments/payouts${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const getPaymentStats = async () => {
  const response = await apiGet('/admin/payments/stats');
  return handleApiResponse(response);
};

export const getVendorBalances = async () => {
  const response = await apiGet('/admin/payments/vendor-balances');
  return handleApiResponse(response);
};

export const processManualPayout = async (vendorId, amount) => {
  const response = await apiPost('/admin/payments/manual-payout', { vendorId, amount });
  return handleApiResponse(response);
};

export const getPaymentCalculator = async (amount) => {
  const response = await apiGet(`/admin/payment-calculator?amount=${amount}`);
  return handleApiResponse(response);
};

// ============================================================
// CONTENT MODERATION
// ============================================================

export const getReviews = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/reviews${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const getReviewStats = async () => {
  const response = await apiGet('/admin/reviews/stats');
  return handleApiResponse(response);
};

export const flagReview = async (reviewId, reason) => {
  const response = await apiPost(`/admin/reviews/${reviewId}/flag`, { reason });
  return handleApiResponse(response);
};

export const unflagReview = async (reviewId) => {
  const response = await apiPost(`/admin/reviews/${reviewId}/unflag`);
  return handleApiResponse(response);
};

export const addReviewNote = async (reviewId, note) => {
  const response = await apiPost(`/admin/reviews/${reviewId}/note`, { note });
  return handleApiResponse(response);
};

export const deleteReview = async (reviewId) => {
  const response = await apiDelete(`/admin/reviews/${reviewId}`);
  return handleApiResponse(response);
};

export const getChats = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/chats${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const getChatMessages = async (chatId) => {
  const response = await apiGet(`/admin/chats/${chatId}/messages`);
  return handleApiResponse(response);
};

export const sendSystemMessage = async (chatId, message) => {
  const response = await apiPost(`/admin/chats/${chatId}/system-message`, { message });
  return handleApiResponse(response);
};

export const flagChat = async (chatId, reason) => {
  const response = await apiPost(`/admin/chats/${chatId}/flag`, { reason });
  return handleApiResponse(response);
};

// ============================================================
// CONTENT MANAGEMENT (Banners, Announcements, FAQs, Blogs)
// ============================================================

export const getBanners = async () => {
  const response = await apiGet('/admin/content/banners');
  return handleApiResponse(response);
};

export const saveBanner = async (data) => {
  const response = await apiPost('/admin/content/banners', data);
  return handleApiResponse(response);
};

export const deleteBanner = async (bannerId) => {
  const response = await apiDelete(`/admin/content/banners/${bannerId}`);
  return handleApiResponse(response);
};

export const getAnnouncements = async () => {
  const response = await apiGet('/admin/content/announcements');
  return handleApiResponse(response);
};

export const saveAnnouncement = async (data) => {
  const response = await apiPost('/admin/content/announcements', data);
  return handleApiResponse(response);
};

export const deleteAnnouncement = async (announcementId) => {
  const response = await apiDelete(`/admin/content/announcements/${announcementId}`);
  return handleApiResponse(response);
};

export const getFAQs = async () => {
  const response = await apiGet('/admin/faqs');
  return handleApiResponse(response);
};

export const saveFAQ = async (data) => {
  const response = await apiPost('/admin/content/faqs', data);
  return handleApiResponse(response);
};

export const deleteFAQ = async (faqId) => {
  const response = await apiDelete(`/admin/content/faqs/${faqId}`);
  return handleApiResponse(response);
};

export const getBlogs = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/blogs${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const getBlogDetails = async (blogId) => {
  const response = await apiGet(`/admin/blogs/${blogId}`);
  return handleApiResponse(response);
};

export const createBlog = async (data) => {
  const response = await apiPost('/admin/blogs', data);
  return handleApiResponse(response);
};

export const updateBlog = async (blogId, data) => {
  const response = await apiPut(`/admin/blogs/${blogId}`, data);
  return handleApiResponse(response);
};

export const deleteBlog = async (blogId) => {
  const response = await apiDelete(`/admin/blogs/${blogId}`);
  return handleApiResponse(response);
};

export const publishBlog = async (blogId) => {
  const response = await apiPost(`/admin/blogs/${blogId}/publish`);
  return handleApiResponse(response);
};

export const unpublishBlog = async (blogId) => {
  const response = await apiPost(`/admin/blogs/${blogId}/unpublish`);
  return handleApiResponse(response);
};

// ============================================================
// SUPPORT CENTER
// ============================================================

export const getSupportTickets = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/support/tickets${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const getTicketDetails = async (ticketId) => {
  const response = await apiGet(`/admin/support/tickets/${ticketId}`);
  return handleApiResponse(response);
};

export const updateTicket = async (ticketId, data) => {
  const response = await apiPut(`/admin/support/tickets/${ticketId}`, data);
  return handleApiResponse(response);
};

export const getTicketMessages = async (ticketId) => {
  const response = await apiGet(`/admin/support/tickets/${ticketId}/messages`);
  return handleApiResponse(response);
};

export const addTicketMessage = async (ticketId, data) => {
  const response = await apiPost(`/admin/support/tickets/${ticketId}/messages`, data);
  return handleApiResponse(response);
};

export const getSupportConversations = async () => {
  const response = await apiGet('/admin/support/conversations');
  return handleApiResponse(response);
};

export const getSupportConversationMessages = async (conversationId) => {
  const response = await apiGet(`/admin/support/conversations/${conversationId}/messages`);
  return handleApiResponse(response);
};

export const sendSupportReply = async (conversationId, content) => {
  const response = await apiPost(`/admin/support/conversations/${conversationId}/reply`, { content });
  return handleApiResponse(response);
};

export const searchUsers = async (query) => {
  const response = await apiGet(`/admin/support/search?q=${encodeURIComponent(query)}`);
  return handleApiResponse(response);
};

// ============================================================
// SETTINGS & CONFIGURATION
// ============================================================

export const getSettings = async () => {
  const response = await apiGet('/admin/settings');
  return handleApiResponse(response);
};

export const updateSettings = async (data) => {
  const response = await apiPut('/admin/settings', data);
  return handleApiResponse(response);
};

export const toggleMaintenanceMode = async (enabled) => {
  const response = await apiPost('/admin/settings/maintenance', { enabled });
  return handleApiResponse(response);
};

export const getCommissionSettings = async () => {
  const response = await apiGet('/admin/commission-settings');
  return handleApiResponse(response);
};

export const updateCommissionSettings = async (data) => {
  const response = await apiPut('/admin/commission-settings', data);
  return handleApiResponse(response);
};

export const get2FASettings = async () => {
  const response = await apiGet('/admin/security/2fa-settings');
  return handleApiResponse(response);
};

export const update2FASettings = async (data) => {
  const response = await apiPost('/admin/security/2fa-settings', data);
  return handleApiResponse(response);
};

export const getAdmin2FAStatus = async () => {
  const response = await apiGet('/admin/security/admin-2fa-status');
  return handleApiResponse(response);
};

export const resetUser2FA = async (userId) => {
  const response = await apiPost(`/admin/security/reset-2fa/${userId}`);
  return handleApiResponse(response);
};

export const getEmailTemplates = async () => {
  const response = await apiGet('/admin/notifications/templates');
  return handleApiResponse(response);
};

export const getEmailTemplate = async (templateId) => {
  const response = await apiGet(`/admin/notifications/template/${templateId}`);
  return handleApiResponse(response);
};

export const updateEmailTemplate = async (templateId, data) => {
  const response = await apiPut(`/admin/notifications/template/${templateId}`, data);
  return handleApiResponse(response);
};

export const getEmailLogs = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/notifications/logs${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const sendTestEmail = async (data) => {
  const response = await apiPost('/admin/emails/send-test', data);
  return handleApiResponse(response);
};

export const getEmailQueueStats = async () => {
  const response = await apiGet('/admin/email-queue/stats');
  return handleApiResponse(response);
};

export const getEmailQueue = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/email-queue${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const cancelQueuedEmail = async (emailId, reason) => {
  const response = await apiPost(`/admin/email-queue/${emailId}/cancel`, { reason });
  return handleApiResponse(response);
};

export const getEmailQueuePreview = async (emailId) => {
  const response = await apiGet(`/admin/email-queue/${emailId}/preview`);
  return handleApiResponse(response);
};

// ============================================================
// ANALYTICS & REPORTS
// ============================================================

export const getAnalytics = async (range = '30d') => {
  const response = await apiGet(`/admin/analytics?range=${range}`);
  return handleApiResponse(response);
};

export const getRevenueAnalytics = async (range = '30d') => {
  const response = await apiGet(`/admin/analytics/revenue?range=${range}`);
  return handleApiResponse(response);
};

export const getUserAnalytics = async () => {
  const response = await apiGet('/admin/analytics/users');
  return handleApiResponse(response);
};

export const getSecurityLogs = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/security/logs${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const getFlaggedItems = async () => {
  const response = await apiGet('/admin/security/flagged-items');
  return handleApiResponse(response);
};

export const getSecurityAudit = async () => {
  const response = await apiGet('/admin/security/audit');
  return handleApiResponse(response);
};

export const getCookieConsentStats = async () => {
  const response = await apiGet('/admin/cookie-consent/stats');
  return handleApiResponse(response);
};

export const getEmailUnsubscribeStats = async () => {
  const response = await apiGet('/admin/email-unsubscribes/stats');
  return handleApiResponse(response);
};

// ============================================================
// IMPERSONATION
// ============================================================

export const impersonateUser = async (userId) => {
  const response = await apiPost(`/admin/impersonate/${userId}`);
  return handleApiResponse(response);
};

export const endImpersonation = async () => {
  const response = await apiPost('/admin/impersonate/end');
  return handleApiResponse(response);
};

export const getFAQStats = async () => {
  const response = await apiGet('/admin/faq-stats');
  return handleApiResponse(response);
};

export const getBlogStats = async () => {
  const response = await apiGet('/admin/blog-stats');
  return handleApiResponse(response);
};

// ============================================================
// CHAT MODERATION
// ============================================================

export const getModerationFlagged = async (params = {}) => {
  const queryString = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null))
  ).toString();
  const response = await apiGet(`/admin/moderation/flagged${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const getModerationStats = async () => {
  const response = await apiGet('/admin/moderation/stats');
  return handleApiResponse(response);
};

export const getModerationNotifications = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/moderation/notifications${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const reviewViolation = async (data) => {
  const response = await apiPost('/admin/moderation/review', data);
  return handleApiResponse(response);
};

export const lockUserAccount = async (data) => {
  const response = await apiPost('/admin/moderation/lock-user', data);
  return handleApiResponse(response);
};

export const unlockUserAccount = async (data) => {
  const response = await apiPost('/admin/moderation/unlock-user', data);
  return handleApiResponse(response);
};

export const getUserViolations = async (userId) => {
  const response = await apiGet(`/admin/moderation/user-violations/${userId}`);
  return handleApiResponse(response);
};

// ============================================================
// FORUM MODERATION
// ============================================================

export const getForumPosts = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/forum/posts${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const getForumPost = async (postId) => {
  const response = await apiGet(`/admin/forum/posts/${postId}`);
  return handleApiResponse(response);
};

export const hideForumPost = async (postId, reason) => {
  const response = await apiPost(`/admin/forum/posts/${postId}/hide`, { reason });
  return handleApiResponse(response);
};

export const unhideForumPost = async (postId) => {
  const response = await apiPost(`/admin/forum/posts/${postId}/unhide`);
  return handleApiResponse(response);
};

export const pinForumPost = async (postId, pinned) => {
  const response = await apiPost(`/admin/forum/posts/${postId}/pin`, { pinned });
  return handleApiResponse(response);
};

export const deleteForumPost = async (postId) => {
  const response = await apiDelete(`/admin/forum/posts/${postId}`);
  return handleApiResponse(response);
};

export const getForumComments = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiGet(`/admin/forum/comments${queryString ? `?${queryString}` : ''}`);
  return handleApiResponse(response);
};

export const hideForumComment = async (commentId) => {
  const response = await apiPost(`/admin/forum/comments/${commentId}/hide`);
  return handleApiResponse(response);
};

export const deleteForumComment = async (commentId) => {
  const response = await apiDelete(`/admin/forum/comments/${commentId}`);
  return handleApiResponse(response);
};

export const getForumStats = async () => {
  const response = await apiGet('/admin/forum/stats');
  return handleApiResponse(response);
};

// ============================================================
// EXPORT ALL AS DEFAULT OBJECT
// ============================================================

const adminApi = {
  // Dashboard
  getDashboardStats,
  getRecentActivity,
  getPlatformHealth,
  getEnvironmentInfo,
  
  // Users
  getUsers,
  getUserDetails,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  freezeUser,
  unfreezeUser,
  unlockUser,
  getUserActivity,
  getLockedAccounts,
  
  // Vendors
  getVendorApprovals,
  getVendorApprovalDetails,
  approveVendor,
  rejectVendor,
  getVendors,
  suspendVendor,
  reactivateVendor,
  toggleVendorVisibility,
  getVendorBadges,
  assignVendorBadge,
  removeVendorBadge,
  getBadgeTypes,
  getVendorReports,
  updateVendorReport,
  
  // Categories
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryVisibility,
  
  // Bookings & Payments
  getBookings,
  getBookingDetails,
  updateBooking,
  cancelBooking,
  processRefund,
  resolveDispute,
  exportBookings,
  getTransactions,
  getPayouts,
  getPaymentStats,
  getVendorBalances,
  processManualPayout,
  getPaymentCalculator,
  
  // Content Moderation
  getReviews,
  getReviewStats,
  flagReview,
  unflagReview,
  addReviewNote,
  deleteReview,
  getChats,
  getChatMessages,
  sendSystemMessage,
  flagChat,
  
  // Content Management
  getBanners,
  saveBanner,
  deleteBanner,
  getAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  getFAQs,
  saveFAQ,
  deleteFAQ,
  getBlogs,
  getBlogDetails,
  createBlog,
  updateBlog,
  deleteBlog,
  publishBlog,
  unpublishBlog,
  
  // Support
  getSupportTickets,
  getTicketDetails,
  updateTicket,
  getTicketMessages,
  addTicketMessage,
  getSupportConversations,
  getSupportConversationMessages,
  sendSupportReply,
  searchUsers,
  
  // Settings
  getSettings,
  updateSettings,
  toggleMaintenanceMode,
  getCommissionSettings,
  updateCommissionSettings,
  get2FASettings,
  update2FASettings,
  getAdmin2FAStatus,
  resetUser2FA,
  getEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  getEmailLogs,
  sendTestEmail,
  getEmailQueueStats,
  getEmailQueue,
  cancelQueuedEmail,
  getEmailQueuePreview,
  
  // Analytics
  getAnalytics,
  getRevenueAnalytics,
  getUserAnalytics,
  getSecurityLogs,
  getFlaggedItems,
  getSecurityAudit,
  getCookieConsentStats,
  getEmailUnsubscribeStats,
  getFAQStats,
  getBlogStats,
  
  // Impersonation
  impersonateUser,
  endImpersonation,
  
  // Moderation
  getModerationFlagged,
  getModerationStats,
  getModerationNotifications,
  reviewViolation,
  lockUserAccount,
  unlockUserAccount,
  getUserViolations,
  
  // Forum Moderation
  getForumPosts,
  getForumPost,
  hideForumPost,
  unhideForumPost,
  pinForumPost,
  deleteForumPost,
  getForumComments,
  hideForumComment,
  deleteForumComment,
  getForumStats
};

export default adminApi;
