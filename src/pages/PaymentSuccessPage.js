import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { apiGet, apiPost } from '../utils/api';
import { PageLayout } from '../components/PageWrapper';
import Header from '../components/Header';
import { buildInvoiceUrl } from '../utils/urlHelpers';
import { formatCurrency, formatDateLong } from '../utils/helpers';
import { decodeBookingId, isPublicId } from '../utils/hashIds';
import './PaymentSuccessPage.css';

function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [bookingDetails, setBookingDetails] = useState(null);
  const [error, setError] = useState(null);

  const sessionId = searchParams.get('session_id');
  const rawBookingId = searchParams.get('booking_id');
  const bookingId = rawBookingId && isPublicId(rawBookingId) 
    ? decodeBookingId(rawBookingId) 
    : (rawBookingId ? parseInt(rawBookingId, 10) : null);
  const paymentIntentId = searchParams.get('payment_intent');

  useEffect(() => {
    const verifyPayment = async () => {
      // Check if we have a payment_intent from PaymentPage (in-app payment)
      if (paymentIntentId) {
        try {
          const verifyResp = await fetch(`${API_BASE_URL}/payments/verify-intent?paymentIntentId=${encodeURIComponent(paymentIntentId)}${bookingId ? `&booking_id=${bookingId}` : ''}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const verifyData = await verifyResp.json();
          
          if (verifyResp.ok && verifyData.success) {
            setBookingDetails(verifyData.booking || null);
            setStatus('success');
            return;
          }
        } catch (e) {
          console.warn('Could not verify payment intent:', e);
        }
        
        // Even if verification fails, if we have booking_id, try to check booking status
        if (bookingId) {
          try {
            const statusResp = await fetch(`${API_BASE_URL}/payments/booking/${bookingId}/status`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (statusResp.ok) {
              const statusData = await statusResp.json();
              if (statusData.isPaid || statusData.status === 'confirmed' || statusData.status === 'paid') {
                setBookingDetails(statusData.booking);
                setStatus('success');
                return;
              }
            }
          } catch (e) {
            console.warn('Could not fetch booking status:', e);
          }
        }
        
        // Payment intent was provided but verification failed - still show success if payment went through
        setStatus('success');
        return;
      }
      
      // Check if session_id is the placeholder (page accessed directly, not via Stripe)
      const isPlaceholder = !sessionId || sessionId === '{CHECKOUT_SESSION_ID}' || sessionId.includes('CHECKOUT_SESSION_ID');
      
      if (isPlaceholder) {
        // If we have a booking_id, try to fetch booking status directly using the payments endpoint (no access control)
        if (bookingId) {
          try {
            const statusResp = await fetch(`${API_BASE_URL}/payments/booking/${bookingId}/status`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (statusResp.ok) {
              const statusData = await statusResp.json();
              
              // Check if booking is already paid
              if (statusData.isPaid || statusData.status === 'confirmed' || statusData.status === 'paid') {
                setBookingDetails(statusData.booking);
                setStatus('success');
                return;
              }
            }
          } catch (e) {
            console.warn('Could not fetch booking status:', e);
          }
        }
        
        setStatus('error');
        setError('This page must be accessed after completing payment through Stripe. Please check your booking status in the dashboard.');
        return;
      }

      try {
        // Verify the session with the backend
        const response = await fetch(
          `${API_BASE_URL}/payments/verify-session?session_id=${encodeURIComponent(sessionId)}${bookingId ? `&booking_id=${bookingId}` : ''}`,
          {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }
        );

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          
          // Use booking details from verify-session response
          if (data.booking) {
            setBookingDetails(data.booking);
          }
        } else {
          setStatus('error');
          setError(data.message || 'Payment verification failed');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setStatus('error');
        setError('Unable to verify payment. Please check your booking status in the dashboard.');
      }
    };

    verifyPayment();
  }, [sessionId, bookingId, paymentIntentId, currentUser]);

  const formatDate = formatDateLong;

  if (status === 'verifying') {
    return (
      <div className="payment-success-page">
        <div className="payment-card verifying">
          <div className="spinner-large"></div>
          <h2>Verifying Payment...</h2>
          <p>Please wait while we confirm your payment.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="payment-success-page">
        <div className="payment-card error">
          <div className="icon-circle error">
            <i className="fas fa-times"></i>
          </div>
          <h2>Payment Verification Issue</h2>
          <p>{error}</p>
          <div className="action-buttons">
            <Link to="/dashboard?section=bookings" className="btn-primary">
              View My Bookings
            </Link>
            <button onClick={() => navigate(-1)} className="btn-secondary">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout variant="fullWidth" pageClassName="payment-success-page-layout">
      <Header 
        onSearch={() => {}}
        onProfileClick={() => {}}
        onWishlistClick={() => {}}
        onChatClick={() => {}}
        onNotificationsClick={() => {}}
      />
      <div className="payment-success-page">
      {/* Confetti Animation */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 10001 }}>
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${Math.random() * 10 + 5}px`,
              height: `${Math.random() * 10 + 5}px`,
              background: ['#fbbf24', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
              borderRadius: Math.random() > 0.5 ? '50%' : '0',
              left: `${Math.random() * 100}%`,
              top: '-20px',
              animation: `confetti-fall ${Math.random() * 3 + 2}s linear forwards`,
              animationDelay: `${Math.random() * 2}s`,
              transform: `rotate(${Math.random() * 360}deg)`
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      <div className="payment-card success">
        <div className="icon-circle success">
          <i className="fas fa-check"></i>
        </div>
        <h2>Payment Successful! 🎉</h2>
        <p className="success-message">
          Thank you for your payment. Your booking has been confirmed.
        </p>

        {bookingDetails && (
          <div className="booking-summary">
            <h3>Booking Details</h3>
            <div className="summary-grid">
              {bookingDetails.VendorName && (
                <div className="summary-item">
                  <span className="label">Vendor</span>
                  <span className="value">{bookingDetails.VendorName}</span>
                </div>
              )}
              {bookingDetails.ServiceName && (
                <div className="summary-item">
                  <span className="label">Service</span>
                  <span className="value">{bookingDetails.ServiceName}</span>
                </div>
              )}
              {bookingDetails.EventDate && (
                <div className="summary-item">
                  <span className="label">Event Date</span>
                  <span className="value">{formatDate(bookingDetails.EventDate)}</span>
                </div>
              )}
              {bookingDetails.EventLocation && (
                <div className="summary-item">
                  <span className="label">Location</span>
                  <span className="value">{bookingDetails.EventLocation}</span>
                </div>
              )}
              {bookingDetails.TotalAmount && (
                <div className="summary-item total">
                  <span className="label">Amount Paid</span>
                  <span className="value">{formatCurrency(bookingDetails.TotalAmount)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="confirmation-note">
          <i className="fas fa-envelope"></i>
          <p>A confirmation email with your invoice has been sent to your email address.</p>
        </div>

        <div className="action-buttons">
          <Link to="/client/bookings" className="btn-primary">
            View My Bookings
          </Link>
          <Link to="/vendors" className="btn-secondary">
            Explore Vendors
          </Link>
          {(bookingDetails?.BookingID || bookingDetails?.bookingPublicId || bookingId) && (
            <Link 
              to={buildInvoiceUrl(bookingDetails?.BookingID || bookingId, true)} 
              className="btn-outline"
            >
              View Invoice
            </Link>
          )}
        </div>

        <div className="support-note">
          <p>
            Questions about your booking? 
            <button onClick={() => {
              // Open messaging widget
              const event = new CustomEvent('openMessagingWidget', { detail: { view: 'support' } });
              window.dispatchEvent(event);
            }} className="link-btn">
              Contact Support
            </button>
          </p>
        </div>
      </div>
      </div>
    </PageLayout>
  );
}

export default PaymentSuccessPage;
