/**
 * Reviews Section - Admin Dashboard
 * User-generated content moderation for reviews
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate, formatRelativeTime } from '../../../utils/formatUtils';
import { useDebounce } from '../../../hooks/useApi';
import adminApi from '../../../services/adminApi';
import UniversalModal, { ConfirmationModal, FormModal } from '../../UniversalModal';
import { FormTextareaField, DetailRow, DetailSection } from '../../common/FormComponents';
import { useAlert } from '../../../context/AlertContext';

function ReviewsSection() {
  const { showError } = useAlert();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [selectedReview, setSelectedReview] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [adminNote, setAdminNote] = useState('');

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

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

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

  return (
    <div className="admin-section">
      {/* Filter Bar */}
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
          <option value="1-star">1 Star</option>
          <option value="2-star">2 Stars</option>
          <option value="3-star">3 Stars</option>
          <option value="4-star">4 Stars</option>
          <option value="5-star">5 Stars</option>
        </select>
      </div>

      {/* Reviews Card */}
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
                      title="View Details"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    {!review.IsFlagged ? (
                      <button
                        className="admin-btn admin-btn-warning admin-btn-sm"
                        onClick={() => {
                          setSelectedReview(review);
                          setShowFlagModal(true);
                        }}
                        title="Flag Review"
                      >
                        <i className="fas fa-flag"></i>
                      </button>
                    ) : (
                      <button
                        className="admin-btn admin-btn-success admin-btn-sm"
                        onClick={() => handleUnflagReview(review)}
                        title="Unflag Review"
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
                      title="Delete Review"
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
              {selectedReview.IsFlagged && (
                <DetailRow label="Status" value={<span className="admin-badge admin-badge-danger">Flagged</span>} />
              )}
            </DetailSection>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Review Text:</strong>
              <p style={{ marginTop: '0.5rem', color: '#374151' }}>
                {selectedReview.ReviewText || selectedReview.comment || selectedReview.text}
              </p>
            </div>
            {selectedReview.AdminNotes && (
              <div style={{ 
                marginBottom: '1rem', 
                padding: '0.75rem', 
                background: '#fef3c7', 
                borderRadius: '8px' 
              }}>
                <strong>Existing Admin Note:</strong>
                <p style={{ margin: '0.5rem 0 0 0' }}>{selectedReview.AdminNotes}</p>
              </div>
            )}
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
    </div>
  );
}

export default ReviewsSection;
