/**
 * Moderation Section - Admin Dashboard
 * Reviews, chat oversight, and content management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate, formatRelativeTime } from '../../../utils/formatUtils';
import { useDebounce } from '../../../hooks/useApi';
import adminApi from '../../../services/adminApi';
import UniversalModal, { ConfirmationModal, FormModal } from '../../UniversalModal';
import { FormField, FormTextareaField, DetailRow, DetailSection, ToggleSwitch } from '../../common/FormComponents';
import { useAlert } from '../../../context/AlertContext';

function ModerationSection() {
  const { showError } = useAlert();
  const [activeTab, setActiveTab] = useState('reviews');
  const [reviews, setReviews] = useState([]);
  const [chats, setChats] = useState([]);
  const [banners, setBanners] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [selectedFaq, setSelectedFaq] = useState(null);
  const [systemMessage, setSystemMessage] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filter && { filter })
      };
      const data = await adminApi.getReviews(params);
      // Ensure reviews is always an array
      const reviewsArray = Array.isArray(data?.reviews) ? data.reviews : Array.isArray(data) ? data : [];
      setReviews(reviewsArray);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filter]);

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getChats({ page, limit });
      // Ensure chats is always an array
      const chatsArray = Array.isArray(data?.chats) ? data.chats : Array.isArray(data?.conversations) ? data.conversations : Array.isArray(data) ? data : [];
      setChats(chatsArray);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError('Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getBanners();
      // Ensure banners is always an array
      const bannersArray = Array.isArray(data?.banners) ? data.banners : Array.isArray(data) ? data : [];
      setBanners(bannersArray);
    } catch (err) {
      console.error('Error fetching banners:', err);
      setError('Failed to load banners');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFaqs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getFAQs();
      // Ensure faqs is always an array
      const faqsArray = Array.isArray(data?.faqs) ? data.faqs : Array.isArray(data) ? data : [];
      setFaqs(faqsArray);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      setError('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'reviews') fetchReviews();
    else if (activeTab === 'chats') fetchChats();
    else if (activeTab === 'banners') fetchBanners();
    else if (activeTab === 'faqs') fetchFaqs();
  }, [activeTab, fetchReviews, fetchChats, fetchBanners, fetchFaqs]);

  useEffect(() => {
    if (activeTab === 'reviews') fetchReviews();
  }, [page, debouncedSearch, filter]);

  const handleFlagReview = async () => {
    if (!selectedReview || !flagReason) return;
    setActionLoading(true);
    try {
      await adminApi.flagReview(selectedReview.ReviewID || selectedReview.id, flagReason);
      setShowFlagModal(false);
      setFlagReason('');
      fetchReviews();
    } catch (err) {
      console.error('Error flagging review:', err);
      showError('Failed to flag review: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnflagReview = async (review) => {
    setActionLoading(true);
    try {
      await adminApi.unflagReview(review.ReviewID || review.id);
      fetchReviews();
    } catch (err) {
      console.error('Error unflagging review:', err);
      showError('Failed to unflag review: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedReview || !adminNote) return;
    setActionLoading(true);
    try {
      await adminApi.addReviewNote(selectedReview.ReviewID || selectedReview.id, adminNote);
      setAdminNote('');
      setShowReviewModal(false);
      fetchReviews();
    } catch (err) {
      console.error('Error adding note:', err);
      showError('Failed to add note: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!selectedReview) return;
    setActionLoading(true);
    try {
      await adminApi.deleteReview(selectedReview.ReviewID || selectedReview.id);
      setShowDeleteModal(false);
      fetchReviews();
    } catch (err) {
      console.error('Error deleting review:', err);
      showError('Failed to delete review: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewChat = async (chat) => {
    setSelectedChat(chat);
    setShowChatModal(true);
    try {
      const data = await adminApi.getChatMessages(chat.ConversationID || chat.id);
      setChatMessages(data.messages || data || []);
    } catch (err) {
      console.error('Error fetching chat messages:', err);
      setChatMessages([]);
    }
  };

  const handleSendSystemMessage = async () => {
    if (!selectedChat || !systemMessage) return;
    setActionLoading(true);
    try {
      await adminApi.sendSystemMessage(selectedChat.ConversationID || selectedChat.id, systemMessage);
      setSystemMessage('');
      const data = await adminApi.getChatMessages(selectedChat.ConversationID || selectedChat.id);
      setChatMessages(data.messages || data || []);
    } catch (err) {
      console.error('Error sending system message:', err);
      showError('Failed to send message: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveBanner = async () => {
    if (!selectedBanner) return;
    setActionLoading(true);
    try {
      await adminApi.saveBanner(selectedBanner);
      setShowBannerModal(false);
      setSelectedBanner(null);
      fetchBanners();
    } catch (err) {
      console.error('Error saving banner:', err);
      showError('Failed to save banner: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveFaq = async () => {
    if (!selectedFaq) return;
    setActionLoading(true);
    try {
      await adminApi.saveFAQ(selectedFaq);
      setShowFaqModal(false);
      setSelectedFaq(null);
      fetchFaqs();
    } catch (err) {
      console.error('Error saving FAQ:', err);
      showError('Failed to save FAQ: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <i 
        key={i} 
        className={`fas fa-star`} 
        style={{ 
          color: i < rating ? '#f59e0b' : '#e5e7eb',
          fontSize: '0.8rem'
        }}
      ></i>
    ));
  };

  const totalPages = Math.ceil(total / limit);

  const renderReviews = () => (
    <>
      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search reviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="admin-filter-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All Reviews</option>
          <option value="flagged">Flagged</option>
          <option value="pending">Pending Approval</option>
        </select>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Reviews ({total})</h3>
        </div>
        
        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner"></div>
            <p>Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="admin-empty-state">
            <i className="fas fa-star"></i>
            <h3>No Reviews Found</h3>
            <p>No reviews match your criteria</p>
          </div>
        ) : (
          <div className="admin-card-body">
            {reviews.map((review) => (
              <div 
                key={review.ReviewID || review.id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #f3f4f6',
                  background: review.IsFlagged ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>{review.ReviewerName || review.reviewerName}</span>
                      <span style={{ color: '#6b7280' }}>→</span>
                      <span>{review.VendorName || review.vendorName}</span>
                      {review.IsFlagged && (
                        <span className="admin-badge admin-badge-danger">
                          <i className="fas fa-flag"></i> Flagged
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {renderStars(review.Rating || review.rating)}
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {formatRelativeTime(review.CreatedAt || review.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="admin-btn admin-btn-secondary admin-btn-sm"
                      onClick={() => {
                        setSelectedReview(review);
                        setShowReviewModal(true);
                      }}
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    {!review.IsFlagged ? (
                      <button
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        onClick={() => {
                          setSelectedReview(review);
                          setShowFlagModal(true);
                        }}
                      >
                        <i className="fas fa-flag"></i>
                      </button>
                    ) : (
                      <button
                        className="admin-btn admin-btn-success admin-btn-sm"
                        onClick={() => handleUnflagReview(review)}
                      >
                        <i className="fas fa-check"></i>
                      </button>
                    )}
                    <button
                      className="admin-btn admin-btn-danger admin-btn-sm"
                      onClick={() => {
                        setSelectedReview(review);
                        setShowDeleteModal(true);
                      }}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <p style={{ margin: 0, color: '#374151', fontSize: '0.9rem' }}>
                  {review.ReviewText || review.comment || review.text}
                </p>
                {review.AdminNotes && (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.5rem', 
                    background: '#fef3c7', 
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                  }}>
                    <strong>Admin Note:</strong> {review.AdminNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="admin-pagination">
            <div className="admin-pagination-info">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
            </div>
            <div className="admin-pagination-buttons">
              <button className="admin-pagination-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                <i className="fas fa-chevron-left"></i>
              </button>
              <button className="admin-pagination-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const renderChats = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Chat Oversight</h3>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={fetchChats}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading chats...</p>
        </div>
      ) : chats.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fas fa-comments"></i>
          <h3>No Active Chats</h3>
          <p>No conversations to monitor</p>
        </div>
      ) : (
        <div className="admin-card-body">
          {chats.map((chat) => (
            <div 
              key={chat.ConversationID || chat.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer'
              }}
              onClick={() => handleViewChat(chat)}
            >
              <div>
                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                  {chat.ClientName || chat.clientName} ↔ {chat.VendorName || chat.vendorName}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  {chat.LastMessage || chat.lastMessage || 'No messages'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  {formatRelativeTime(chat.LastMessageAt || chat.lastMessageAt)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {chat.IsFlagged && (
                  <span className="admin-badge admin-badge-danger">
                    <i className="fas fa-flag"></i> Flagged
                  </span>
                )}
                <i className="fas fa-chevron-right" style={{ color: '#9ca3af' }}></i>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderBanners = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Banners & Announcements</h3>
        <button 
          className="admin-btn admin-btn-primary admin-btn-sm"
          onClick={() => {
            setSelectedBanner({ title: '', message: '', type: 'info', isActive: true });
            setShowBannerModal(true);
          }}
        >
          <i className="fas fa-plus"></i> Add Banner
        </button>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading banners...</p>
        </div>
      ) : banners.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fas fa-bullhorn"></i>
          <h3>No Banners</h3>
          <p>Create your first announcement banner</p>
        </div>
      ) : (
        <div className="admin-card-body">
          {banners.map((banner) => (
            <div 
              key={banner.BannerID || banner.id}
              style={{
                padding: '1rem',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{banner.Title || banner.title}</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{banner.Message || banner.message}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {banner.IsActive !== false ? (
                  <span className="admin-badge admin-badge-success">Active</span>
                ) : (
                  <span className="admin-badge admin-badge-neutral">Inactive</span>
                )}
                <button
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={() => {
                    setSelectedBanner(banner);
                    setShowBannerModal(true);
                  }}
                >
                  <i className="fas fa-pen"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFaqs = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">FAQs</h3>
        <button 
          className="admin-btn admin-btn-primary admin-btn-sm"
          onClick={() => {
            setSelectedFaq({ question: '', answer: '', category: '', order: 0, isActive: true });
            setShowFaqModal(true);
          }}
        >
          <i className="fas fa-plus"></i> Add FAQ
        </button>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading FAQs...</p>
        </div>
      ) : faqs.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fas fa-question-circle"></i>
          <h3>No FAQs</h3>
          <p>Create your first FAQ</p>
        </div>
      ) : (
        <div className="admin-card-body">
          {faqs.map((faq) => (
            <div 
              key={faq.FAQID || faq.id}
              style={{
                padding: '1rem',
                borderBottom: '1px solid #f3f4f6'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>
                    Q: {faq.Question || faq.question}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                    A: {faq.Answer || faq.answer}
                  </div>
                </div>
                <button
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={() => {
                    setSelectedFaq(faq);
                    setShowFaqModal(true);
                  }}
                >
                  <i className="fas fa-pen"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-section">
      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>
          Reviews
        </button>
        <button className={`admin-tab ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => setActiveTab('chats')}>
          Chat Oversight
        </button>
        <button className={`admin-tab ${activeTab === 'banners' ? 'active' : ''}`} onClick={() => setActiveTab('banners')}>
          Banners
        </button>
        <button className={`admin-tab ${activeTab === 'faqs' ? 'active' : ''}`} onClick={() => setActiveTab('faqs')}>
          FAQs
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'reviews' && renderReviews()}
      {activeTab === 'chats' && renderChats()}
      {activeTab === 'banners' && renderBanners()}
      {activeTab === 'faqs' && renderFaqs()}

      {/* Review Detail Modal */}
      <UniversalModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Review Details"
        size="medium"
        showFooter={true}
        primaryAction={{ label: 'Close', onClick: () => setShowReviewModal(false) }}
        secondaryAction={false}
      >
        {selectedReview && (
          <div>
            <DetailSection title="Review">
              <DetailRow label="Reviewer" value={selectedReview.ReviewerName || selectedReview.reviewerName} />
              <DetailRow label="Vendor" value={selectedReview.VendorName || selectedReview.vendorName} />
              <DetailRow label="Rating" value={<div>{renderStars(selectedReview.Rating || selectedReview.rating)}</div>} />
              <DetailRow label="Date" value={formatDate(selectedReview.CreatedAt || selectedReview.createdAt)} />
            </DetailSection>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Review Text:</strong>
              <p style={{ marginTop: '0.5rem', color: '#374151' }}>
                {selectedReview.ReviewText || selectedReview.comment || selectedReview.text}
              </p>
            </div>
            <FormTextareaField
              label="Add Admin Note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Add a note about this review..."
              rows={3}
            />
            <button 
              className="admin-btn admin-btn-primary"
              onClick={handleAddNote}
              disabled={!adminNote || actionLoading}
            >
              {actionLoading ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        )}
      </UniversalModal>

      {/* Chat Modal */}
      <UniversalModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        title="Conversation"
        size="large"
        showFooter={false}
      >
        {selectedChat && (
          <div>
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f3f4f6', borderRadius: '8px' }}>
              <strong>{selectedChat.ClientName}</strong> ↔ <strong>{selectedChat.VendorName}</strong>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
              {chatMessages.length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center' }}>No messages</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div 
                    key={idx}
                    style={{
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      background: msg.IsSystem ? '#fef3c7' : '#f9fafb',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      {msg.SenderName || msg.senderName} • {formatRelativeTime(msg.SentAt || msg.sentAt)}
                    </div>
                    <div>{msg.Content || msg.content || msg.message}</div>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={systemMessage}
                onChange={(e) => setSystemMessage(e.target.value)}
                placeholder="Send system message..."
                style={{
                  flex: 1,
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <button 
                className="admin-btn admin-btn-primary"
                onClick={handleSendSystemMessage}
                disabled={!systemMessage || actionLoading}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </UniversalModal>

      {/* Flag Modal */}
      <FormModal
        isOpen={showFlagModal}
        onClose={() => setShowFlagModal(false)}
        title="Flag Review"
        onSave={handleFlagReview}
        saving={actionLoading}
        saveLabel="Flag Review"
        disabled={!flagReason}
      >
        <FormTextareaField
          label="Reason for Flagging"
          required
          value={flagReason}
          onChange={(e) => setFlagReason(e.target.value)}
          placeholder="Explain why this review is being flagged..."
          rows={3}
        />
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        confirmLabel={actionLoading ? 'Deleting...' : 'Delete'}
        onConfirm={handleDeleteReview}
        variant="danger"
      />

      {/* Banner Modal */}
      <FormModal
        isOpen={showBannerModal}
        onClose={() => setShowBannerModal(false)}
        title={selectedBanner?.BannerID ? 'Edit Banner' : 'Add Banner'}
        onSave={handleSaveBanner}
        saving={actionLoading}
        saveLabel="Save Banner"
      >
        {selectedBanner && (
          <div>
            <FormField
              label="Title"
              required
              value={selectedBanner.Title || selectedBanner.title || ''}
              onChange={(e) => setSelectedBanner({ ...selectedBanner, Title: e.target.value, title: e.target.value })}
            />
            <FormTextareaField
              label="Message"
              required
              value={selectedBanner.Message || selectedBanner.message || ''}
              onChange={(e) => setSelectedBanner({ ...selectedBanner, Message: e.target.value, message: e.target.value })}
              rows={3}
            />
            <div style={{ marginTop: '1rem' }}>
              <ToggleSwitch
                checked={selectedBanner.IsActive !== false}
                onChange={(e) => setSelectedBanner({ ...selectedBanner, IsActive: e.target.checked })}
                label="Active"
              />
            </div>
          </div>
        )}
      </FormModal>

      {/* FAQ Modal */}
      <FormModal
        isOpen={showFaqModal}
        onClose={() => setShowFaqModal(false)}
        title={selectedFaq?.FAQID ? 'Edit FAQ' : 'Add FAQ'}
        onSave={handleSaveFaq}
        saving={actionLoading}
        saveLabel="Save FAQ"
      >
        {selectedFaq && (
          <div>
            <FormField
              label="Question"
              required
              value={selectedFaq.Question || selectedFaq.question || ''}
              onChange={(e) => setSelectedFaq({ ...selectedFaq, Question: e.target.value, question: e.target.value })}
            />
            <FormTextareaField
              label="Answer"
              required
              value={selectedFaq.Answer || selectedFaq.answer || ''}
              onChange={(e) => setSelectedFaq({ ...selectedFaq, Answer: e.target.value, answer: e.target.value })}
              rows={4}
            />
            <FormField
              label="Category"
              value={selectedFaq.Category || selectedFaq.category || ''}
              onChange={(e) => setSelectedFaq({ ...selectedFaq, Category: e.target.value, category: e.target.value })}
              placeholder="e.g., Booking, Payments, Account"
            />
          </div>
        )}
      </FormModal>
    </div>
  );
}

export default ModerationSection;
