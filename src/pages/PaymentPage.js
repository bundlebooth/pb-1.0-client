import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { decodeBookingId, encodeBookingId, encodeUserId, isPublicId } from '../utils/hashIds';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import { getProvinceFromLocation, getTaxInfoForProvince } from '../utils/taxCalculations';
import { PageLayout } from '../components/PageWrapper';
import Header from '../components/Header';
import SkeletonLoader from '../components/SkeletonLoader';
import '../styles/BookingPage.css';

// Card Element styling - same as BookingPage
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

function CheckoutForm({ onSuccess, onCancel, clientProvince, total, isProcessing, setIsProcessing, clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [country, setCountry] = useState('Canada');
  const [postalCode, setPostalCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError('');

    try {
      const cardElement = elements.getElement(CardElement);
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: nameOnCard || 'Customer',
              address: {
                country: country === 'Canada' ? 'CA' : 'US',
                postal_code: postalCode
              }
            }
          }
        }
      );

      if (confirmError) {
        setError(confirmError.message || 'Payment failed. Please try again.');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        try {
          await apiGet(`/payments/verify-intent?paymentIntentId=${paymentIntent.id}`);
        } catch (verifyErr) {
          console.error('Payment verification error:', verifyErr);
        }
        onSuccess(paymentIntent);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
          Card number
        </label>
        <div style={{ padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: '#fff' }}>
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
            Country
          </label>
          <select 
            value={country} 
            onChange={e => setCountry(e.target.value)}
            style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', backgroundColor: '#fff' }}
          >
            <option value="Canada">Canada</option>
            <option value="United States">United States</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
            Postal code
          </label>
          <input 
            type="text" 
            value={postalCode}
            onChange={e => setPostalCode(e.target.value)}
            placeholder="M5V 1T4"
            style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
          Name on card
        </label>
        <input 
          type="text" 
          value={nameOnCard}
          onChange={e => setNameOnCard(e.target.value)}
          placeholder="Full name as shown on card"
          style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
        />
      </div>

      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '16px', lineHeight: 1.5 }}>
        By providing your card information, you allow Planbeau Canada Inc. to charge your card for this booking in accordance with our terms.
      </p>

      {error && (
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '8px', 
          color: '#dc2626',
          marginBottom: '16px',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        style={{
          width: '100%',
          padding: '14px 24px',
          background: isProcessing ? '#9ca3af' : '#5086E8',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin" style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
            </svg>
            Processing...
          </>
        ) : (
          <>
            <i className="fas fa-lock"></i>
            Pay {formatCurrency(total)} CAD
          </>
        )}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
        <i className="fas fa-shield-alt" style={{ fontSize: '0.75rem', color: '#9ca3af' }}></i>
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Secure payment powered by Stripe</span>
      </div>
    </form>
  );
}

function PaymentPage() {
  const { bookingId: encodedBookingId } = useParams();
  
  // Decode the booking ID from URL (supports both encoded and plain numeric IDs)
  const bookingId = isPublicId(encodedBookingId) 
    ? decodeBookingId(encodedBookingId) 
    : parseInt(encodedBookingId, 10);
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  
  const [booking, setBooking] = useState(null);
  const [vendorData, setVendorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [breakdown, setBreakdown] = useState(null);
  const [clientProvince, setClientProvince] = useState('Ontario');
  const [isProcessing, setIsProcessing] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !currentUser) {
      sessionStorage.setItem('postLoginRedirect', `/payment/${encodedBookingId}`);
      navigate('/', { state: { showLogin: true } });
    }
  }, [currentUser, authLoading, navigate, encodedBookingId]);

  // Load booking data
  useEffect(() => {
    if (!currentUser?.id || !bookingId) return;

    const loadBookingAndInitPayment = async () => {
      setLoading(true);
      setError('');

      try {
        // Fetch all bookings and find the one we need
        const resp = await apiGet(`/users/${currentUser.id}/bookings/all`);
        if (!resp.ok) throw new Error('Failed to fetch bookings');
        
        const bookings = await resp.json();
        const foundBooking = bookings.find(b => 
          String(b.BookingID) === String(bookingId) || 
          String(b.RequestID) === String(bookingId) ||
          String(b.bookingPublicId) === String(bookingId)
        );

        if (!foundBooking) {
          throw new Error('Booking not found');
        }

        setBooking(foundBooking);

        // Fetch vendor data for host name, rating, reviews, city
        if (foundBooking.VendorProfileID) {
          try {
            const vendorResp = await apiGet(`/vendors/${foundBooking.VendorProfileID}`);
            if (vendorResp.ok) {
              const vendorResult = await vendorResp.json();
              if (vendorResult.success && vendorResult.data) {
                setVendorData(vendorResult.data);
              }
            }
          } catch (vendorErr) {
            console.error('Error fetching vendor data:', vendorErr);
          }
        }

        // Get province from event location
        const eventLocation = foundBooking.EventLocation || foundBooking.Location || '';
        const province = getProvinceFromLocation(eventLocation);
        setClientProvince(province);

        // Create payment intent - use GrandTotal from stored values, NOT TotalAmount
        // The frontend calculated and stored these values, so use them directly
        const amountToCharge = foundBooking.GrandTotal || foundBooking.TotalAmount || 0;
        
        const paymentResp = await apiPost('/payments/payment-intent', {
          bookingId: foundBooking.BookingID || null,
          requestId: foundBooking.RequestID || null,
          vendorProfileId: foundBooking.VendorProfileID,
          amount: amountToCharge,
          currency: 'cad',
          description: `Payment for ${foundBooking.ServiceName || 'Booking'} with ${foundBooking.VendorName || 'Vendor'}`,
          clientProvince: province,
          // Pass stored breakdown values to avoid recalculation
          subtotal: foundBooking.Subtotal,
          platformFee: foundBooking.PlatformFee,
          taxAmount: foundBooking.TaxAmount,
          taxPercent: foundBooking.TaxPercent,
          taxLabel: foundBooking.TaxLabel,
          processingFee: foundBooking.ProcessingFee,
          grandTotal: foundBooking.GrandTotal
        });

        const paymentData = await paymentResp.json();
        if (!paymentResp.ok) throw new Error(paymentData.message || 'Failed to initialize payment');
        if (!paymentData.clientSecret) throw new Error('No client secret received');

        if (paymentData.breakdown) {
          setBreakdown(paymentData.breakdown);
        }

        // Load Stripe
        const configRes = await apiGet('/payments/config');
        const configData = await configRes.json();
        if (!configData.publishableKey) throw new Error('Stripe is not configured');

        const stripe = await loadStripe(configData.publishableKey);
        setStripePromise(stripe);
        setClientSecret(paymentData.clientSecret);

      } catch (err) {
        console.error('Payment page error:', err);
        setError(err.message || 'Failed to load payment');
      } finally {
        setLoading(false);
      }
    };

    loadBookingAndInitPayment();
  }, [currentUser, bookingId]);

  const handleSuccess = (paymentIntent) => {
    const encodedBookingId = encodeBookingId(bookingId);
    navigate(`/payment-success?payment_intent=${paymentIntent.id}&booking_id=${encodedBookingId}`);
  };

  const handleCancel = () => {
    navigate('/client/bookings');
  };

  if (authLoading) {
    return (
      <div className="payment-page-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!currentUser) return null;

  // Use stored values from booking record - NO recalculation
  // Priority: breakdown from payment-intent response > stored booking values > fallback
  const taxInfo = getTaxInfoForProvince(clientProvince);
  const subtotal = breakdown?.subtotal || booking?.Subtotal || booking?.TotalAmount || 0;
  const taxAmount = breakdown?.tax || booking?.TaxAmount || 0;
  const platformFee = breakdown?.platformFee || booking?.PlatformFee || 0;
  const processingFee = breakdown?.processingFee || booking?.ProcessingFee || 0;
  const total = breakdown?.total || booking?.GrandTotal || (subtotal + taxAmount + platformFee + processingFee);

  const formatTime = (t) => {
    if (!t) return '';
    const parts = t.toString().split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  // Calculate duration for display
  const calculateDuration = () => {
    const startTime = booking?.StartTime || booking?.EventTime;
    const endTime = booking?.EndTime || booking?.EventEndTime;
    if (!startTime || !endTime) return null;
    try {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      const diffMs = end - start;
      const hours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
      return hours > 0 ? hours : null;
    } catch { return null; }
  };

  const totalHours = calculateDuration();

  return (
    <PageLayout variant="fullWidth" pageClassName="booking-page-layout">
      <Header />
      
      {/* Use EXACT same structure as BookingPage */}
      <div className="booking-container">
        {/* Left Side - Form Section */}
        <div className="booking-form-section">
          <button className="back-button" onClick={handleCancel}>
            <i className="fas fa-arrow-left"></i>
            Back to Bookings
          </button>

          {loading ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 1rem' }}></div>
              <p style={{ color: '#717171' }}>Loading payment details...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: '#dc2626', marginBottom: '1rem' }}></i>
              <h3 style={{ margin: '0 0 0.5rem', color: '#222' }}>Unable to Load Payment</h3>
              <p style={{ color: '#717171', marginBottom: '1.5rem' }}>{error}</p>
              <button className="btn btn-primary" onClick={handleCancel}>Back to Bookings</button>
            </div>
          ) : booking ? (
            <>
              {/* Accordion Step - Pay (matches BookingPage Step 3 exactly) */}
              <div className="accordion-step active">
                <div className="accordion-step-header">
                  <span className="accordion-step-number">1.</span>
                  <span className="accordion-step-title">Review & pay</span>
                </div>
                <div className="accordion-step-content">
                  {/* Pay in full card - EXACT match to BookingPage */}
                  <div style={{ 
                    padding: '20px', 
                    border: '1px solid #ddd', 
                    borderRadius: '12px', 
                    backgroundColor: '#fff',
                    marginBottom: '16px'
                  }}>
                    <div style={{ fontWeight: '600', color: '#222', marginBottom: '8px' }}>Pay in full</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '16px' }}>
                      Pay {formatCurrency(total)} now and your booking is confirmed instantly.
                    </div>
                    
                    {clientSecret && stripePromise ? (
                      <Elements stripe={stripePromise}>
                        <CheckoutForm 
                          onSuccess={handleSuccess}
                          onCancel={handleCancel}
                          clientProvince={clientProvince}
                          total={total}
                          isProcessing={isProcessing}
                          setIsProcessing={setIsProcessing}
                          clientSecret={clientSecret}
                        />
                      </Elements>
                    ) : (
                      <div style={{ padding: '2rem', textAlign: 'center' }}>
                        <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 1rem' }}></div>
                        <p style={{ color: '#717171', margin: 0 }}>Initializing secure payment...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Right Side - Booking Summary (EXACT match to BookingPage) */}
        <div className="booking-summary-section">
          {loading ? (
            /* Skeleton loader for summary panel */
            <div className="booking-summary-card">
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <SkeletonLoader variant="text" height="64px" width="64px" count={1} />
                <div style={{ flex: 1 }}>
                  <SkeletonLoader variant="text" height="20px" width="70%" count={1} />
                  <div style={{ marginTop: '8px' }}><SkeletonLoader variant="text" height="14px" width="50%" count={1} /></div>
                  <div style={{ marginTop: '8px' }}><SkeletonLoader variant="text" height="14px" width="40%" count={1} /></div>
                </div>
              </div>
              <div className="summary-divider"></div>
              <div style={{ padding: '16px 0' }}>
                <SkeletonLoader variant="text" height="12px" width="30%" count={1} />
                <div style={{ marginTop: '8px' }}><SkeletonLoader variant="text" height="18px" width="60%" count={1} /></div>
                <div style={{ marginTop: '16px' }}><SkeletonLoader variant="text" height="12px" width="25%" count={1} /></div>
                <div style={{ marginTop: '8px' }}><SkeletonLoader variant="text" height="18px" width="40%" count={1} /></div>
                <div style={{ marginTop: '16px' }}><SkeletonLoader variant="text" height="12px" width="35%" count={1} /></div>
                <div style={{ marginTop: '8px' }}><SkeletonLoader variant="text" height="18px" width="55%" count={1} /></div>
              </div>
              <div className="summary-divider"></div>
              <div style={{ padding: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <SkeletonLoader variant="text" height="16px" width="40%" count={1} />
                  <SkeletonLoader variant="text" height="16px" width="20%" count={1} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <SkeletonLoader variant="text" height="14px" width="30%" count={1} />
                  <SkeletonLoader variant="text" height="14px" width="15%" count={1} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <SkeletonLoader variant="text" height="14px" width="35%" count={1} />
                  <SkeletonLoader variant="text" height="14px" width="15%" count={1} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <SkeletonLoader variant="text" height="14px" width="25%" count={1} />
                  <SkeletonLoader variant="text" height="14px" width="15%" count={1} />
                </div>
                <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <SkeletonLoader variant="text" height="20px" width="20%" count={1} />
                  <SkeletonLoader variant="text" height="20px" width="25%" count={1} />
                </div>
              </div>
            </div>
          ) : booking ? (
            <div className="booking-summary-card">
              {/* Vendor Info - Use vendorData for host name, rating, reviews, city */}
              <div className="vendor-info" id="vendor-info">
                {(vendorData?.profile?.LogoURL || booking.VendorLogo) ? (
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #DDDDDD', background: '#f7f7f7', flexShrink: 0 }}>
                    <img src={vendorData?.profile?.LogoURL || booking.VendorLogo} alt={booking.VendorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f7f7f7', border: '2px solid #DDDDDD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="far fa-store" style={{ fontSize: '24px', color: '#717171' }}></i>
                  </div>
                )}
                <div className="vendor-details">
                  <h3 className="vendor-name" style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 4px', color: '#222' }}>{vendorData?.profile?.BusinessName || booking.VendorName || 'Vendor'}</h3>
                  {/* Host name with profile picture from vendorData - clickable to open profile */}
                  {(() => {
                    const hostName = vendorData?.profile?.HostName || vendorData?.HostName || 
                      vendorData?.profile?.OwnerName || vendorData?.profile?.FirstName ||
                      (vendorData?.profile?.ContactFirstName && vendorData?.profile?.ContactLastName 
                        ? `${vendorData.profile.ContactFirstName} ${vendorData.profile.ContactLastName}` 
                        : vendorData?.profile?.ContactFirstName);
                    const hostProfilePic = vendorData?.profile?.HostProfileImage || vendorData?.profile?.ProfileImageURL;
                    const hostUserId = vendorData?.profile?.HostUserID || vendorData?.profile?.UserID;
                    return hostName ? (
                      <p 
                        style={{ fontSize: '0.875rem', color: '#717171', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px', cursor: hostUserId ? 'pointer' : 'default' }}
                        onClick={() => hostUserId && navigate(`/profile/${encodeUserId(hostUserId)}`)}
                      >
                        {hostProfilePic ? (
                          <img src={hostProfilePic} alt={hostName} style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <i className="fas fa-user" style={{ fontSize: '0.75rem' }}></i>
                        )}
                        Hosted by {hostName}
                      </p>
                    ) : null;
                  })()}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Rating from vendorData */}
                    {(() => {
                      const rating = vendorData?.profile?.AverageRating || vendorData?.profile?.Rating || 0;
                      const reviewCount = vendorData?.profile?.ReviewCount || vendorData?.profile?.TotalReviews || 0;
                      return rating > 0 ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: '#222' }}>
                          <i className="fas fa-star" style={{ color: '#5086E8', fontSize: '0.8rem' }}></i>
                          {parseFloat(rating).toFixed(1)}
                          {reviewCount > 0 && (
                            <span style={{ color: '#717171' }}>({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
                          )}
                        </span>
                      ) : null;
                    })()}
                    {/* City from vendorData */}
                    {(vendorData?.profile?.City || booking.VendorCity) && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: '#717171' }}>
                        <i className="fas fa-map-marker-alt" style={{ fontSize: '0.75rem' }}></i>
                        {vendorData?.profile?.City || booking.VendorCity}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="summary-divider"></div>

              {/* Event Details */}
              <div style={{ padding: '16px 0' }}>
                {booking.EventName && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Event</div>
                    <div style={{ fontSize: '1rem', color: '#222', fontWeight: 500 }}>{booking.EventName}</div>
                  </div>
                )}
                {booking.EventType && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Type</div>
                    <div style={{ fontSize: '0.95rem', color: '#222' }}>{booking.EventType.charAt(0).toUpperCase() + booking.EventType.slice(1).replace('-', ' ')}</div>
                  </div>
                )}
                {booking.EventDate && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Date & Time</div>
                    <div style={{ fontSize: '0.95rem', color: '#222', fontWeight: 500 }}>
                      {new Date(booking.EventDate).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    {(booking.StartTime || booking.EventTime) && (booking.EndTime || booking.EventEndTime) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.9rem', color: '#222' }}>{formatTime(booking.StartTime || booking.EventTime)}</span>
                        <span style={{ color: '#9ca3af' }}>→</span>
                        <span style={{ fontSize: '0.9rem', color: '#222' }}>{formatTime(booking.EndTime || booking.EventEndTime)}</span>
                        {totalHours && (
                          <span style={{ fontSize: '0.85rem', color: '#6b7280', marginLeft: '8px' }}>
                            ({totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)} hrs)
                          </span>
                        )}
                      </div>
                    )}
                    {/* Show time even if only start time is available */}
                    {(booking.StartTime || booking.EventTime) && !(booking.EndTime || booking.EventEndTime) && (
                      <div style={{ fontSize: '0.9rem', color: '#222', marginTop: '4px' }}>
                        {formatTime(booking.StartTime || booking.EventTime)}
                      </div>
                    )}
                  </div>
                )}
                {booking.AttendeeCount && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Guests</div>
                    <div style={{ fontSize: '0.95rem', color: '#222' }}>{booking.AttendeeCount} guests</div>
                  </div>
                )}
                {(booking.EventLocation || booking.Location) && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Location</div>
                    <div style={{ fontSize: '0.9rem', color: '#222' }}>{booking.EventLocation || booking.Location}</div>
                  </div>
                )}
              </div>

              <div className="summary-divider"></div>

              {/* Price Breakdown */}
              <div style={{ padding: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.95rem', color: '#222' }}>{booking.ServiceName || booking.PackageName || 'Service'}</span>
                  <span style={{ fontSize: '0.95rem', color: '#222' }}>{formatCurrency(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#717171' }}>Subtotal</span>
                  <span style={{ fontSize: '0.9rem', color: '#717171' }}>{formatCurrency(subtotal)}</span>
                </div>
                {platformFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#717171' }}>Platform Service Fee</span>
                    <span style={{ fontSize: '0.9rem', color: '#717171' }}>{formatCurrency(platformFee)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#717171' }}>Tax ({taxInfo.label})</span>
                  <span style={{ fontSize: '0.9rem', color: '#717171' }}>{formatCurrency(taxAmount)}</span>
                </div>
                {processingFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#717171' }}>Payment Processing Fee</span>
                    <span style={{ fontSize: '0.9rem', color: '#717171' }}>{formatCurrency(processingFee)}</span>
                  </div>
                )}
                <div style={{ borderTop: '2px solid #222', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#222' }}>Total</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#222' }}>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Policies Section */}
              {(booking.InstantBookingEnabled || booking.CancellationPolicy || booking.MinBookingLeadTimeHours > 0) && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ebebeb' }}>
                  {booking.InstantBookingEnabled && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                      <i className="fas fa-bolt" style={{ fontSize: '16px', color: '#222', width: '20px', marginTop: '2px' }}></i>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#222' }}>Instant Booking</div>
                        <div style={{ fontSize: '0.8rem', color: '#717171' }}>Book and pay now without waiting for vendor approval</div>
                      </div>
                    </div>
                  )}
                  {booking.CancellationPolicy && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                      <i className="fas fa-calendar-check" style={{ fontSize: '16px', color: '#222', width: '20px', marginTop: '2px' }}></i>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#222' }}>{booking.CancellationPolicy}</div>
                        <div style={{ fontSize: '0.8rem', color: '#717171' }}>Flexible cancellation policy</div>
                      </div>
                    </div>
                  )}
                  {booking.MinBookingLeadTimeHours > 0 && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <i className="fas fa-clock" style={{ fontSize: '16px', color: '#222', width: '20px', marginTop: '2px' }}></i>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#222' }}>Advance notice required</div>
                        <div style={{ fontSize: '0.8rem', color: '#717171' }}>
                          {booking.MinBookingLeadTimeHours >= 168 
                            ? `Book at least ${Math.floor(booking.MinBookingLeadTimeHours / 168)} week${Math.floor(booking.MinBookingLeadTimeHours / 168) > 1 ? 's' : ''} in advance`
                            : booking.MinBookingLeadTimeHours >= 24 
                              ? `Book at least ${Math.floor(booking.MinBookingLeadTimeHours / 24)} day${Math.floor(booking.MinBookingLeadTimeHours / 24) > 1 ? 's' : ''} in advance`
                              : `Book at least ${booking.MinBookingLeadTimeHours} hours in advance`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </PageLayout>
  );
}

export default PaymentPage;
