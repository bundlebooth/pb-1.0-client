import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiGet, apiPost } from '../../../utils/api';
import { formatCurrency } from '../../../utils/helpers';
import { getProvinceFromLocation, getTaxInfoForProvince } from '../../../utils/taxCalculations';
import './ClientPaymentSection.css';

function CheckoutForm({ onSuccess, onCancel, clientProvince, total }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError('');

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required'
      });

      if (submitError) {
        setError(submitError.message || 'Payment failed. Please try again.');
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

  const taxInfo = getTaxInfoForProvince(clientProvince);

  return (
    <form onSubmit={handleSubmit}>
      <div className="client-payment-stripe-wrapper">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error && (
        <div className="client-payment-error">
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      <div className="client-payment-tax-info">
        <i className="fas fa-info-circle"></i>
        <span>Tax calculated based on event location: <strong>{taxInfo.label}</strong></span>
      </div>

      <div className="client-payment-actions">
        <button 
          type="button" 
          onClick={onCancel}
          disabled={isProcessing}
          className="btn btn-cancel"
        >
          <i className="fas fa-arrow-left"></i>
          <span>Cancel</span>
        </button>
        <button 
          type="submit" 
          disabled={!stripe || isProcessing}
          className="btn btn-submit"
        >
          {isProcessing ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <i className="fas fa-lock"></i>
              <span>Pay {formatCurrency(total)}</span>
            </>
          )}
        </button>
      </div>

      <div className="client-payment-secure">
        <div className="badge">
          <i className="fas fa-lock"></i>
          <span>Secured by</span>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#635BFF', marginLeft: '4px' }}>Stripe</span>
        </div>
        <div className="cards">
          <i className="fab fa-cc-visa"></i>
          <i className="fab fa-cc-mastercard"></i>
          <i className="fab fa-cc-amex"></i>
        </div>
      </div>
    </form>
  );
}

// Main Payment Section Component
function ClientPaymentSection({ booking, onBack, onPaymentSuccess }) {
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [breakdown, setBreakdown] = useState(null);
  const [clientProvince, setClientProvince] = useState('Ontario');

  useEffect(() => {
    if (!booking) return;

    const initializePayment = async () => {
      setLoading(true);
      setError('');
      setClientSecret('');

      try {
        // Get province from EVENT LOCATION (tax is based on where event takes place)
        const eventLocation = booking.EventLocation || booking.Location || '';
        const province = getProvinceFromLocation(eventLocation);
        console.log('[Payment] Event location:', eventLocation, '-> Province:', province);

        setClientProvince(province);

        // Create payment intent with province for tax calculation
        const response = await apiPost('/payments/payment-intent', {
          bookingId: booking.BookingID || null,
          requestId: booking.RequestID || null,
          vendorProfileId: booking.VendorProfileID,
          amount: booking.TotalAmount,
          currency: 'cad',
          description: `Payment for ${booking.ServiceName || 'Booking'} with ${booking.VendorName || 'Vendor'}`,
          clientProvince: province
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to initialize payment');
        }

        if (!data.clientSecret) {
          throw new Error('No client secret received from server');
        }

        if (data.breakdown) {
          setBreakdown(data.breakdown);
        }

        const configRes = await apiGet('/payments/config');
        const configData = await configRes.json();

        if (!configData.publishableKey) {
          throw new Error('Stripe is not configured. Please contact support.');
        }

        const stripe = await loadStripe(configData.publishableKey);
        setStripePromise(stripe);
        setClientSecret(data.clientSecret);

      } catch (err) {
        console.error('Payment initialization error:', err);
        setError(err.message || 'Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [booking]);

  const handleSuccess = (paymentIntent) => {
    onPaymentSuccess?.(paymentIntent);
  };

  const formatTime = (t) => {
    if (!t) return '';
    const parts = t.toString().split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  if (!booking) {
    return (
      <div className="client-payment-section">
        <div className="client-payment-header">
          <button className="client-payment-back-btn" onClick={onBack}>
            <i className="fas fa-arrow-left"></i>
            <span>Back to Bookings</span>
          </button>
        </div>
        <div className="client-payment-card">
          <div className="client-payment-no-booking">
            <i className="fas fa-exclamation-triangle"></i>
            <h3>No Booking Selected</h3>
            <p>Please select a booking to proceed with payment.</p>
          </div>
        </div>
      </div>
    );
  }

  const taxInfo = getTaxInfoForProvince(clientProvince);
  const subtotal = breakdown?.subtotal || booking?.TotalAmount || 0;
  const taxAmount = breakdown?.tax || (subtotal * taxInfo.rate / 100);
  const platformFee = breakdown?.platformFee || 0;
  const processingFee = breakdown?.processingFee || 0;
  const total = breakdown?.total || (subtotal + taxAmount + platformFee + processingFee);

  return (
    <div className="client-payment-section">
      <div className="client-payment-header">
        <button className="client-payment-back-btn" onClick={onBack}>
          <i className="fas fa-arrow-left"></i>
          <span>Back to Bookings</span>
        </button>
      </div>

      <div className="client-payment-card">
        <div className="client-payment-card-header">
          <div className="icon-box">
            <i className="fas fa-credit-card"></i>
          </div>
          <h2>Payment</h2>
        </div>
        <p className="client-payment-subtitle">Complete your payment for this booking.</p>
        <hr className="client-payment-divider" />

        <div className="client-payment-grid">
          {/* Left - Booking Summary */}
          <div className="client-payment-summary">
            <div className="client-payment-vendor">
              <div className="avatar">
                {booking?.VendorLogo ? (
                  <img src={booking.VendorLogo} alt={booking?.VendorName} />
                ) : (
                  <i className="fas fa-store"></i>
                )}
              </div>
              <div className="info">
                <h3>{booking?.VendorName || 'Vendor'}</h3>
                <span>{booking?.ServiceCategory || booking?.ServiceName || 'Service'}</span>
              </div>
            </div>

            <div className="client-payment-event">
              <div className="detail-row">
                <span>
                  {booking?.EventDate ? new Date(booking.EventDate).toLocaleDateString('en-CA', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 'Date TBD'}
                </span>
                <span>
                  {(() => {
                    const start = formatTime(booking?.StartTime || booking?.EventTime);
                    const end = formatTime(booking?.EndTime || booking?.EventEndTime);
                    return start && end ? `${start} → ${end}` : '';
                  })()}
                </span>
              </div>
              
              {booking?.AttendeeCount && (
                <div className="detail-item">
                  <i className="fas fa-users"></i>
                  <span>{booking.AttendeeCount} guests</span>
                </div>
              )}
              
              {(booking?.EventLocation || booking?.Location) && (
                <div className="detail-item">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{booking.EventLocation || booking.Location}</span>
                </div>
              )}
            </div>

            <div className="client-payment-prices">
              <div className="price-row service">
                <span>{booking?.ServiceName || 'Service'}</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              <div className="price-row subtotal">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              {platformFee > 0 && (
                <div className="price-row fee">
                  <span>Platform Service Fee</span>
                  <span>{formatCurrency(platformFee)}</span>
                </div>
              )}
              
              <div className="price-row fee">
                <span>Tax ({taxInfo.label})</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              
              {processingFee > 0 && (
                <div className="price-row fee">
                  <span>Payment Processing Fee</span>
                  <span>{formatCurrency(processingFee)}</span>
                </div>
              )}
              
              <div className="price-row total">
                <span>Total</span>
                <span className="amount">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Right - Payment Form */}
          <div className="client-payment-form-panel">
            <h3>
              <i className="fas fa-lock"></i>
              Payment Details
            </h3>

            {loading ? (
              <div className="client-payment-loading">
                <div className="spinner"></div>
                <p>Initializing secure payment...</p>
              </div>
            ) : error ? (
              <div className="client-payment-error-state">
                <i className="fas fa-exclamation-triangle"></i>
                <h4>Payment Error</h4>
                <p>{error}</p>
                <button className="btn btn-outline" onClick={onBack}>
                  <i className="fas fa-arrow-left"></i> Back to Bookings
                </button>
              </div>
            ) : clientSecret && stripePromise ? (
              <Elements 
                stripe={stripePromise} 
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'flat',
                    variables: {
                      colorPrimary: '#4F86E8',
                      colorBackground: '#ffffff',
                      colorText: '#2d3748',
                      colorTextSecondary: '#718096',
                      colorDanger: '#dc2626',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                      fontSizeBase: '15px',
                      borderRadius: '8px',
                      spacingUnit: '4px',
                      colorIconTab: '#718096',
                      colorIconTabSelected: '#4F86E8'
                    },
                    rules: {
                      '.Input': {
                        border: '1px solid #e2e8f0',
                        boxShadow: 'none',
                        padding: '12px 14px',
                        backgroundColor: '#ffffff'
                      },
                      '.Input:focus': {
                        border: '1px solid #4F86E8',
                        boxShadow: '0 0 0 3px rgba(79, 134, 232, 0.1)',
                        outline: 'none'
                      },
                      '.Input--invalid': {
                        border: '1px solid #dc2626',
                        boxShadow: 'none'
                      },
                      '.Label': {
                        fontWeight: '500',
                        marginBottom: '6px',
                        fontSize: '14px',
                        color: '#2d3748'
                      },
                      '.Tab': {
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        boxShadow: 'none'
                      },
                      '.Tab:hover': {
                        backgroundColor: '#f7fafc',
                        border: '1px solid #cbd5e0'
                      },
                      '.Tab--selected': {
                        border: '1px solid #4F86E8',
                        backgroundColor: '#f0f7ff',
                        boxShadow: 'none',
                        color: '#2d3748'
                      },
                      '.TabLabel': {
                        color: '#2d3748'
                      },
                      '.TabLabel--selected': {
                        color: '#2d3748'
                      },
                      '.TabIcon': {
                        fill: '#718096'
                      },
                      '.TabIcon--selected': {
                        fill: '#4F86E8'
                      },
                      '.Error': {
                        fontSize: '13px',
                        color: '#dc2626'
                      }
                    }
                  }
                }}
              >
                <CheckoutForm 
                  onSuccess={handleSuccess}
                  onCancel={onBack}
                  clientProvince={clientProvince}
                  total={total}
                />
              </Elements>
            ) : (
              <div className="client-payment-error-state" style={{ background: '#fef3c7' }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#d97706' }}></i>
                <h4>Unable to Load Payment</h4>
                <p>Please try again later.</p>
                <button className="btn btn-outline" onClick={onBack}>
                  <i className="fas fa-arrow-left"></i> Back to Bookings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientPaymentSection;
