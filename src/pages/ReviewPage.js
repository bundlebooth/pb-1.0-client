import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../utils/api';
import { showBanner } from '../utils/banners';
import { decodeBookingId, isPublicId } from '../utils/hashIds';
import UniversalModal from '../components/UniversalModal';
import './ReviewPage.css';

/**
 * ReviewPage - Standalone page for submitting reviews via email deeplink
 * URL: /review/:bookingId
 * 
 * This page allows clients to submit reviews for completed bookings
 * directly from email links sent the morning after their event.
 */

function ReviewPage() {
  const navigate = useNavigate();
  const { bookingId: encodedBookingId } = useParams();
  // Decode the booking ID from URL (supports both encoded and plain numeric IDs)
  const bookingId = encodedBookingId && isPublicId(encodedBookingId) 
    ? decodeBookingId(encodedBookingId) 
    : (encodedBookingId ? parseInt(encodedBookingId, 10) : null);
  const { currentUser, loading: authLoading } = useAuth();
  
  const [status, setStatus] = useState('loading'); // loading, ready, error, submitting, success
  const [booking, setBooking] = useState(null);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Review form state
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

  useEffect(() => {
    if (authLoading) return;

    // If not logged in, redirect to login with return URL
    if (!currentUser) {
      const returnUrl = `/review/${encodedBookingId}`;
      sessionStorage.setItem('postLoginRedirect', returnUrl);
      navigate('/', { state: { showLogin: true, returnUrl } });
      return;
    }

    validateAndLoadBooking();
  }, [authLoading, currentUser, bookingId, navigate]);

  const validateAndLoadBooking = async () => {
    try {
      setStatus('loading');
      
      // Validate the review request
      const res = await apiGet(`/reviews/validate/${bookingId}`);
      const response = await res.json();
      
      if (!res.ok || !response.valid) {
        setStatus('error');
        if (response.expired) {
          setErrorTitle('Review Link Expired');
          setErrorMessage('This review link has expired. Review requests are valid for 30 days after your event.');
        } else if (response.alreadyReviewed) {
          setErrorTitle('Already Reviewed');
          setErrorMessage('You have already submitted a review for this booking. Thank you for your feedback!');
        } else {
          setErrorTitle(response.errorTitle || 'Review Not Available');
          setErrorMessage(response.errorMessage || 'This review link is no longer valid.');
        }
        return;
      }
      
      setBooking(response.booking);
      setStatus('ready');
      
    } catch (error) {
      console.error('Review validation error:', error);
      setStatus('error');
      setErrorTitle('Something Went Wrong');
      setErrorMessage('We couldn\'t load the review page. Please try again or contact support.');
    }
  };

  const submitReview = async () => {
    if (!booking || !reviewForm.comment.trim()) {
      showBanner('Please write a review before submitting', 'error');
      return;
    }
    
    if (reviewForm.rating === 0) {
      showBanner('Please select an overall rating', 'error');
      return;
    }
    
    setSubmitting(true);
    setStatus('submitting');
    
    try {
      const resp = await apiPost('/vendors/reviews/submit', {
        userId: currentUser.id,
        vendorProfileId: booking.VendorProfileID,
        bookingId: booking.BookingID,
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
        setStatus('success');
      } else {
        setStatus('ready');
        showBanner(data.message || 'Failed to submit review', 'error');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      setStatus('ready');
      showBanner('Failed to submit review. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, label, size = 'normal' }) => (
    <div className={`review-star-rating ${size}`}>
      {label && <label className="star-label">{label}</label>}
      <div className="stars-container">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`star-btn ${star <= value ? 'filled' : ''}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );

  // Loading state
  if (status === 'loading' || authLoading) {
    return (
      <div className="review-page">
        <div className="review-page-card">
          <div className="spinner-container">
            <div className="spinner-large"></div>
          </div>
          <h2>Loading Review...</h2>
          <p>Please wait while we verify your access.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="review-page">
        <div className="review-page-card">
          <div className="icon-circle error">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h2>{errorTitle}</h2>
          <p>{errorMessage}</p>
          
          <div className="action-buttons">
            <button 
              className="btn-primary"
              onClick={() => navigate('/dashboard?section=reviews')}
            >
              <i className="fas fa-star"></i>
              Go to Reviews
            </button>
            <button 
              className="btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              <i className="fas fa-home"></i>
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="review-page">
        <div className="review-page-card success">
          <div className="icon-circle success">
            <i className="fas fa-check"></i>
          </div>
          <h2>Thank You!</h2>
          <p>Your review has been submitted successfully. Your feedback helps other clients find great vendors!</p>
          
          <div className="action-buttons">
            <button 
              className="btn-primary"
              onClick={() => navigate('/dashboard?section=reviews')}
            >
              <i className="fas fa-star"></i>
              View My Reviews
            </button>
            <button 
              className="btn-secondary"
              onClick={() => navigate('/explore')}
            >
              <i className="fas fa-search"></i>
              Explore Vendors
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Ready state - show review form
  return (
    <div className="review-page">
      <div className="review-page-container">
        {/* Header */}
        <div className="review-page-header">
          <h1>Share Your Experience</h1>
          <p>Help other clients by sharing your feedback about your recent event.</p>
        </div>

        {/* Booking Info Card */}
        {booking && (
          <div className="review-booking-card">
            <div className="booking-card-header">
              <div className="booking-date">
                <span className="month">
                  {booking.EventDate ? (() => {
                    const date = new Date(booking.EventDate);
                    return !isNaN(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : 'TBD';
                  })() : 'TBD'}
                </span>
                <span className="day">
                  {booking.EventDate ? (() => {
                    const date = new Date(booking.EventDate);
                    return !isNaN(date.getTime()) ? date.getDate() : '--';
                  })() : '--'}
                </span>
              </div>
              <div className="booking-info">
                <h3 className="vendor-name">{booking.VendorName || 'Vendor'}</h3>
                <p className="service-name">{booking.ServiceName || 'Service'}</p>
                {booking.EventLocation && (
                  <p className="location">
                    <i className="fas fa-map-marker-alt"></i>
                    {booking.EventLocation}
                  </p>
                )}
              </div>
              {(booking.VendorLogo || booking.VendorLogoUrl) && (
                <img 
                  src={booking.VendorLogo || booking.VendorLogoUrl} 
                  alt={booking.VendorName}
                  className="vendor-logo"
                />
              )}
            </div>
          </div>
        )}

        {/* Review Form */}
        <div className="review-form-card">
          {/* Overall Rating */}
          <div className="rating-section main-rating">
            <h3>Overall Rating</h3>
            <StarRating
              value={reviewForm.rating}
              onChange={(v) => setReviewForm(f => ({ ...f, rating: v }))}
              size="large"
            />
          </div>

          {/* Review Title */}
          <div className="form-group">
            <label>Review Title (optional)</label>
            <input
              type="text"
              value={reviewForm.title}
              onChange={(e) => setReviewForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Summarize your experience in a few words"
              className="form-input"
            />
          </div>

          {/* Review Comment */}
          <div className="form-group">
            <label>Your Review *</label>
            <textarea
              value={reviewForm.comment}
              onChange={(e) => setReviewForm(f => ({ ...f, comment: e.target.value }))}
              placeholder="Share details about your experience with this vendor..."
              rows={5}
              className="form-textarea"
            />
          </div>

          {/* Detailed Ratings */}
          <div className="detailed-ratings">
            <h3>Rate Your Experience</h3>
            <div className="ratings-grid">
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
            <div className="recommend-section">
              <label>Would you recommend this vendor?</label>
              <div className="recommend-buttons">
                <button
                  type="button"
                  onClick={() => setReviewForm(f => ({ ...f, wouldRecommend: true }))}
                  className={`recommend-btn ${reviewForm.wouldRecommend ? 'yes active' : ''}`}
                >
                  <i className="fas fa-thumbs-up"></i> Yes
                </button>
                <button
                  type="button"
                  onClick={() => setReviewForm(f => ({ ...f, wouldRecommend: false }))}
                  className={`recommend-btn ${!reviewForm.wouldRecommend ? 'no active' : ''}`}
                >
                  <i className="fas fa-thumbs-down"></i> No
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={submitReview}
              disabled={submitting || !reviewForm.comment.trim() || reviewForm.rating === 0}
              className="btn-primary"
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviewPage;
