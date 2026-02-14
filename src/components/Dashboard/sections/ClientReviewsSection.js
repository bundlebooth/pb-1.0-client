import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../context/AlertContext';
import { apiGet, apiPost } from '../../../utils/api';
import { showBanner } from '../../../utils/banners';
import { useTranslation } from '../../../hooks/useTranslation';
import { useLocalization } from '../../../context/LocalizationContext';
import { decodeBookingId, isPublicId } from '../../../utils/hashIds';
import UniversalModal from '../../UniversalModal';
import CardRow from '../CardRow';
import ReviewCard from '../ReviewCard';

function ClientReviewsSection({ deepLinkBookingId, onDeepLinkHandled }) {
  const { currentUser } = useAuth();
  const { showError } = useAlert();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatCurrency } = useLocalization();
  const [reviews, setReviews] = useState([]);
  const [pastBookings, setPastBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const fileInputRef = useRef(null);
  
  // Review form state - start with 0 stars (empty)
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    title: '',
    comment: '',
    qualityRating: 0,
    communicationRating: 0,
    valueRating: 0,
    punctualityRating: 0,
    professionalismRating: 0,
    wouldRecommend: true
  });

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoading(true);
      
      // Load submitted reviews
      const reviewsResp = await apiGet(`/users/${currentUser.id}/reviews`);
      const reviewsData = reviewsResp.ok ? await reviewsResp.json() : [];
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      
      // Load all bookings to find past ones that can be reviewed
      const bookingsResp = await apiGet(`/users/${currentUser.id}/bookings/all`);
      const bookingsData = bookingsResp.ok ? await bookingsResp.json() : [];
      
      // Filter for past, paid bookings that haven't been reviewed
      const reviewedBookingIds = new Set((Array.isArray(reviewsData) ? reviewsData : []).map(r => r.BookingID));
      const now = new Date();
      const pastPaidBookings = (Array.isArray(bookingsData) ? bookingsData : []).filter(b => {
        const eventDate = new Date(b.EventDate);
        const isPast = eventDate < now;
        const isPaid = b.FullAmountPaid === true || b.FullAmountPaid === 1 || 
                       (b.Status || '').toLowerCase() === 'paid';
        const notReviewed = !reviewedBookingIds.has(b.BookingID);
        return isPast && isPaid && notReviewed;
      });
      
      setPastBookings(pastPaidBookings);
    } catch (error) {
      console.error('Error loading reviews data:', error);
      setReviews([]);
      setPastBookings([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle deep link - open review modal when deepLinkBookingId is provided
  useEffect(() => {
    if (deepLinkBookingId && pastBookings.length > 0 && !loading) {
      // Decode the booking ID if it's a public hash ID
      let targetId = deepLinkBookingId;
      if (isPublicId(deepLinkBookingId)) {
        const decoded = decodeBookingId(deepLinkBookingId);
        if (decoded) {
          targetId = decoded;
        }
      }
      
      // Find the booking by ID
      const booking = pastBookings.find(b => 
        String(b.BookingID) === String(targetId) || 
        String(b.RequestID) === String(targetId) ||
        String(b.bookingPublicId) === String(deepLinkBookingId)
      );
      
      if (booking) {
        // Open the review modal for this booking
        openReviewModal(booking);
      }
      
      // Clear the deep link after handling
      if (onDeepLinkHandled) {
        onDeepLinkHandled();
      }
    }
  }, [deepLinkBookingId, pastBookings, loading, onDeepLinkHandled]);

  const openReviewModal = (booking) => {
    setSelectedBooking(booking);
    setReviewForm({
      rating: 0,
      title: '',
      comment: '',
      qualityRating: 0,
      communicationRating: 0,
      valueRating: 0,
      punctualityRating: 0,
      professionalismRating: 0,
      wouldRecommend: true
    });
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!selectedBooking || !reviewForm.comment.trim()) return;
    
    setSubmitting(true);
    try {
      const resp = await apiPost('/vendors/reviews/submit', {
        userId: currentUser.id,
        vendorProfileId: selectedBooking.VendorProfileID,
        bookingId: selectedBooking.BookingID,
        rating: reviewForm.rating,
        title: reviewForm.title,
        comment: reviewForm.comment,
        qualityRating: reviewForm.qualityRating,
        communicationRating: reviewForm.communicationRating,
        valueRating: reviewForm.valueRating,
        punctualityRating: reviewForm.punctualityRating,
        professionalismRating: reviewForm.professionalismRating,
        wouldRecommend: reviewForm.wouldRecommend
      });
      
      const data = await resp.json();
      if (data.success) {
        setReviewSuccess(true);
        loadData(); // Reload to update lists
      } else {
        showError(data.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      showError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setReviewSuccess(false);
    setSelectedBooking(null);
  };

  const StarRating = ({ value, onChange, label }) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151', fontSize: '14px' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px',
              color: star <= value ? '#5e72e4' : '#d1d5db',
              padding: '2px',
              transition: 'transform 0.1s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );


  // Toggle card expansion
  const toggleCardExpand = (itemId, booking) => {
    if (expandedCardId === itemId) {
      setExpandedCardId(null);
      setSelectedBooking(null);
      setReviewPhotos([]);
    } else {
      setExpandedCardId(itemId);
      setSelectedBooking(booking);
      setReviewPhotos([]);
      setReviewForm({
        rating: 0,
        title: '',
        comment: '',
        qualityRating: 0,
        communicationRating: 0,
        valueRating: 0,
        punctualityRating: 0,
        professionalismRating: 0,
        wouldRecommend: true
      });
    }
  };

  // Handle photo upload
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const newPhotos = files.slice(0, 5 - reviewPhotos.length).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));
    
    setReviewPhotos(prev => [...prev, ...newPhotos].slice(0, 5));
    e.target.value = '';
  };

  // Remove photo
  const removePhoto = (index) => {
    setReviewPhotos(prev => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  // Upload photos to Cloudinary and get URLs
  const uploadPhotos = async () => {
    if (reviewPhotos.length === 0) return [];
    
    const uploadedUrls = [];
    for (const photo of reviewPhotos) {
      try {
        const formData = new FormData();
        formData.append('photo', photo.file);
        
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/vendors/reviews/upload-photo`, {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        if (data.success && data.url) {
          uploadedUrls.push(data.url);
        }
      } catch (err) {
        console.error('Error uploading photo:', err);
      }
    }
    return uploadedUrls;
  };

  // Submit inline review
  const submitInlineReview = async () => {
    if (!selectedBooking || !reviewForm.comment.trim() || reviewForm.rating === 0) return;
    
    setSubmitting(true);
    try {
      // First upload photos if any
      const photoUrls = await uploadPhotos();
      
      // Then submit review with photo URLs
      const endpoint = photoUrls.length > 0 ? '/vendors/reviews/submit-with-photos' : '/vendors/reviews/submit';
      const resp = await apiPost(endpoint, {
        userId: currentUser.id,
        vendorProfileId: selectedBooking.VendorProfileID,
        bookingId: selectedBooking.BookingID,
        rating: reviewForm.rating,
        title: reviewForm.title,
        comment: reviewForm.comment,
        qualityRating: reviewForm.qualityRating,
        communicationRating: reviewForm.communicationRating,
        valueRating: reviewForm.valueRating,
        punctualityRating: reviewForm.punctualityRating,
        professionalismRating: reviewForm.professionalismRating,
        wouldRecommend: reviewForm.wouldRecommend,
        photoUrls: photoUrls
      });
      
      const data = await resp.json();
      if (data.success) {
        setExpandedCardId(null);
        setSelectedBooking(null);
        setReviewPhotos([]);
        showBanner('Your review has been submitted successfully!', 'success');
        loadData();
      } else {
        showError(data.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      showError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  // Render a pending booking - Using shared CardRow component
  const renderPendingCard = (booking) => {
    const itemId = `pending-${booking.BookingID}`;
    const vendorName = booking.VendorName || 'Vendor';
    const serviceName = booking.ServiceName || 'Service';
    const eventDate = booking.EventDate ? new Date(booking.EventDate) : null;
    const location = booking.Location || booking.EventLocation || booking.Address || '';
    const isExpanded = expandedCardId === itemId;

    return (
      <div 
        key={itemId}
        id={itemId}
        style={{
          borderBottom: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}
      >
        {/* Header Row - Using shared CardRow component */}
        <CardRow
          date={eventDate}
          primaryName={vendorName}
          serviceName={serviceName}
          location={location}
          badgeLabel={isExpanded ? 'Writing Review' : 'Pending Review'}
          badgeColor="#5e72e4"
          isExpanded={isExpanded}
          onClick={() => toggleCardExpand(itemId, booking)}
          showChevron={true}
        />

        {/* Expanded Review Form */}
        <div style={{
          maxHeight: isExpanded ? '1400px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease-in-out'
        }}>
          <div style={{ padding: '0 20px 20px 20px' }}>
            {/* Overall Rating */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#1a1a1a', fontSize: '14px' }}>
                Overall Rating <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewForm(f => ({ ...f, rating: star }))}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '32px',
                      color: star <= reviewForm.rating ? '#5e72e4' : '#dadce0',
                      padding: '4px',
                      transition: 'transform 0.1s'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.15)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Ratings - Always visible (MOVED BEFORE Your Review) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: 500, color: '#1a1a1a', fontSize: '14px' }}>
                Detailed Ratings <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ 
                padding: '16px', 
                background: '#f8f9fa', 
                borderRadius: '8px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  {[
                    { key: 'qualityRating', label: 'Quality of Service' },
                    { key: 'communicationRating', label: 'Communication' },
                    { key: 'valueRating', label: 'Value for Money' },
                    { key: 'punctualityRating', label: 'Punctuality' },
                    { key: 'professionalismRating', label: 'Professionalism' }
                  ].map(({ key, label }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#5f6368' }}>{label}</span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewForm(f => ({ ...f, [key]: star }))}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '18px',
                              color: star <= reviewForm[key] ? '#5e72e4' : '#dadce0',
                              padding: '0 2px'
                            }}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Text (MOVED AFTER Detailed Ratings) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#1a1a1a', fontSize: '14px' }}>
                Your Review <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                placeholder="Share details of your experience..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #dadce0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Would You Recommend? */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#1a1a1a', fontSize: '14px' }}>
                Would you recommend this vendor? <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setReviewForm(f => ({ ...f, wouldRecommend: true }))}
                  style={{
                    padding: '10px 24px',
                    border: reviewForm.wouldRecommend ? '2px solid #10b981' : '1px solid #dadce0',
                    borderRadius: '8px',
                    background: reviewForm.wouldRecommend ? '#ecfdf5' : 'white',
                    color: reviewForm.wouldRecommend ? '#10b981' : '#5f6368',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}
                >
                  <i className="fas fa-thumbs-up"></i> Yes
                </button>
                <button
                  type="button"
                  onClick={() => setReviewForm(f => ({ ...f, wouldRecommend: false }))}
                  style={{
                    padding: '10px 24px',
                    border: !reviewForm.wouldRecommend ? '2px solid #ef4444' : '1px solid #dadce0',
                    borderRadius: '8px',
                    background: !reviewForm.wouldRecommend ? '#fef2f2' : 'white',
                    color: !reviewForm.wouldRecommend ? '#ef4444' : '#5f6368',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}
                >
                  <i className="fas fa-thumbs-down"></i> No
                </button>
              </div>
            </div>

            {/* Photo Upload - Optional */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#1a1a1a', fontSize: '14px' }}>
                Add Photos <span style={{ fontWeight: 400, color: '#80868b' }}>(optional, max 5)</span>
              </label>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                multiple
                style={{ display: 'none' }}
              />
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {/* Photo Previews */}
                {reviewPhotos.map((photo, index) => (
                  <div 
                    key={index}
                    style={{
                      position: 'relative',
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <img 
                      src={photo.preview} 
                      alt={`Upload ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                {/* Add Photo Button */}
                {reviewPhotos.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      border: '2px dashed #dadce0',
                      background: '#f8f9fa',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      color: '#80868b'
                    }}
                  >
                    <i className="fas fa-camera" style={{ fontSize: '20px' }}></i>
                    <span style={{ fontSize: '11px' }}>Add</span>
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => toggleCardExpand(itemId, booking)}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  color: '#5f6368',
                  border: '1px solid #dadce0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitInlineReview}
                disabled={submitting || !reviewForm.comment.trim() || reviewForm.rating === 0}
                style={{
                  padding: '10px 24px',
                  background: submitting || !reviewForm.comment.trim() || reviewForm.rating === 0 
                    ? '#dadce0' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: submitting || !reviewForm.comment.trim() || reviewForm.rating === 0 ? '#9aa0a6' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: submitting || !reviewForm.comment.trim() || reviewForm.rating === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {submitting && <i className="fas fa-spinner fa-spin"></i>}
                {submitting ? 'Submitting...' : 'Post Review'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render a submitted review - Using shared ReviewCard component
  const renderReviewCard = (review) => {
    const surveyRatings = [
      { label: 'Quality', value: review.QualityRating },
      { label: 'Communication', value: review.CommunicationRating },
      { label: 'Value', value: review.ValueRating },
      { label: 'Punctuality', value: review.PunctualityRating },
      { label: 'Professionalism', value: review.ProfessionalismRating }
    ];

    return (
      <div key={review.ReviewID || review.id} style={{ padding: '0 20px' }}>
        <ReviewCard
          reviewerName={review.VendorName || 'Vendor'}
          rating={review.Rating || 5}
          comment={review.Comment}
          surveyRatings={surveyRatings}
          wouldRecommend={review.WouldRecommend}
          isGoogle={false}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div id="reviews-section">
        <div className="dashboard-card">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="reviews-section">
      {/* Card with tabs inside like Bookings */}
      <div className="dashboard-card">
        {/* Tabs - using same CSS classes as Bookings */}
        <div className="booking-tabs">
          <button
            className={`booking-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Reviews ({pastBookings.length})
          </button>
          <button
            className={`booking-tab ${activeTab === 'submitted' ? 'active' : ''}`}
            onClick={() => setActiveTab('submitted')}
          >
            My Reviews ({reviews.length})
          </button>
        </div>

        {/* Content */}
        <div>
        {activeTab === 'pending' ? (
          pastBookings.length > 0 ? (
            <div>{pastBookings.map(renderPendingCard)}</div>
          ) : (
            <div style={{ padding: '60px 40px', textAlign: 'center', color: '#5f6368' }}>
              <i className="fas fa-star" style={{ fontSize: '48px', color: '#dadce0', marginBottom: '16px', display: 'block' }}></i>
              <p style={{ margin: 0, fontSize: '16px' }}>No pending reviews</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#80868b' }}>Complete a booking to leave a review</p>
            </div>
          )
        ) : (
          reviews.length > 0 ? (
            <div>{reviews.map(renderReviewCard)}</div>
          ) : (
            <div style={{ padding: '60px 40px', textAlign: 'center', color: '#5f6368' }}>
              <i className="fas fa-comment-alt" style={{ fontSize: '48px', color: '#dadce0', marginBottom: '16px', display: 'block' }}></i>
              <p style={{ margin: 0, fontSize: '16px' }}>No reviews yet</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#80868b' }}>Your submitted reviews will appear here</p>
            </div>
          )
        )}
        </div>
      </div>

      {/* Review Modal - Using UniversalModal */}
      <UniversalModal
        isOpen={showReviewModal && !!selectedBooking}
        onClose={closeReviewModal}
        title={reviewSuccess ? "Thank You!" : "Write a Review"}
        size="large"
        primaryAction={reviewSuccess ? {
          label: 'View My Bookings',
          onClick: () => {
            closeReviewModal();
            navigate('/dashboard?section=bookings');
          }
        } : {
          label: submitting ? 'Submitting...' : 'Submit Review',
          onClick: submitReview,
          disabled: submitting || !reviewForm.comment.trim(),
          loading: submitting
        }}
        secondaryAction={reviewSuccess ? {
          label: 'Go to Home',
          onClick: () => {
            closeReviewModal();
            navigate('/');
          }
        } : {
          label: 'Cancel',
          onClick: closeReviewModal
        }}
      >
        {reviewSuccess ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: '#10b981', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <i className="fas fa-check" style={{ fontSize: '40px', color: 'white' }}></i>
            </div>
            <h2 style={{ margin: '0 0 12px', fontSize: '24px', color: '#111827' }}>
              Review Submitted!
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '16px', color: '#6b7280', lineHeight: 1.6 }}>
              Thank you for sharing your experience. Your feedback helps other clients find great vendors!
            </p>
          </div>
        ) : selectedBooking && (
          <>
            {/* Booking Card - Mobile friendly */}
            <div className="review-modal-booking-card" style={{
              marginBottom: '20px',
              padding: '12px 16px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {/* Date Section */}
                <div style={{
                  textAlign: 'center',
                  minWidth: '50px',
                  padding: '8px 12px 8px 0',
                  borderRight: '1px solid #e2e8f0',
                  flexShrink: 0
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 500 }}>
                    {selectedBooking.EventDate ? new Date(selectedBooking.EventDate).toLocaleDateString('en-US', { month: 'short' }) : 'TBD'}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>
                    {selectedBooking.EventDate ? new Date(selectedBooking.EventDate).getDate() : '--'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {selectedBooking.EventDate ? new Date(selectedBooking.EventDate).toLocaleDateString('en-US', { weekday: 'short' }) : ''}
                  </div>
                </div>
                {/* Booking Info */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '15px', marginBottom: '4px' }}>
                    {selectedBooking.VendorName || 'Vendor'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '4px' }}>
                    {selectedBooking.ServiceName || 'Service'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
                    {selectedBooking.TotalAmount != null && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fas fa-dollar-sign" style={{ fontSize: '11px' }}></i>
                        {formatCurrency(selectedBooking.TotalAmount)}
                      </span>
                    )}
                    {(selectedBooking.Location || selectedBooking.EventLocation) && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fas fa-map-marker-alt" style={{ fontSize: '11px' }}></i>
                        {selectedBooking.Location || selectedBooking.EventLocation}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Rating */}
            <StarRating
              label="Overall Rating"
              value={reviewForm.rating}
              onChange={(v) => setReviewForm(f => ({ ...f, rating: v }))}
            />

            {/* Title */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                Review Title (optional)
              </label>
              <input
                type="text"
                value={reviewForm.title}
                onChange={(e) => setReviewForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Summarize your experience"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Comment */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                Your Review *
              </label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                placeholder="Share your experience with this vendor..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Survey Section */}
            <div style={{ 
              background: '#f9fafb', 
              padding: '16px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#374151' }}>
                Rate Your Experience (optional)
              </h3>
              
              <div className="review-survey-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <StarRating
                  label="Quality of Service"
                  value={reviewForm.qualityRating}
                  onChange={(v) => setReviewForm(f => ({ ...f, qualityRating: v }))}
                />
                <StarRating
                  label="Communication"
                  value={reviewForm.communicationRating}
                  onChange={(v) => setReviewForm(f => ({ ...f, communicationRating: v }))}
                />
                <StarRating
                  label="Value for Money"
                  value={reviewForm.valueRating}
                  onChange={(v) => setReviewForm(f => ({ ...f, valueRating: v }))}
                />
                <StarRating
                  label="Punctuality"
                  value={reviewForm.punctualityRating}
                  onChange={(v) => setReviewForm(f => ({ ...f, punctualityRating: v }))}
                />
                <StarRating
                  label="Professionalism"
                  value={reviewForm.professionalismRating}
                  onChange={(v) => setReviewForm(f => ({ ...f, professionalismRating: v }))}
                />
              </div>

              {/* Would Recommend */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                  Would you recommend this vendor?
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setReviewForm(f => ({ ...f, wouldRecommend: true }))}
                    style={{
                      padding: '10px 24px',
                      border: reviewForm.wouldRecommend ? '2px solid #10b981' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: reviewForm.wouldRecommend ? '#ecfdf5' : 'white',
                      color: reviewForm.wouldRecommend ? '#10b981' : '#6b7280',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className="fas fa-thumbs-up"></i> Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewForm(f => ({ ...f, wouldRecommend: false }))}
                    style={{
                      padding: '10px 24px',
                      border: !reviewForm.wouldRecommend ? '2px solid #ef4444' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: !reviewForm.wouldRecommend ? '#fef2f2' : 'white',
                      color: !reviewForm.wouldRecommend ? '#ef4444' : '#6b7280',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className="fas fa-thumbs-down"></i> No
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </UniversalModal>
    </div>
  );
}

export default ClientReviewsSection;
