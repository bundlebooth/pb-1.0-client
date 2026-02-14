import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Lock, CreditCard, CheckCircle } from 'lucide-react';
import './PaymentCheckoutModal.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1a1a1a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '::placeholder': {
        color: '#9ca3af',
      },
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
};

const PaymentForm = ({ 
  onSubmit, 
  onCancel, 
  processing, 
  error,
  bookingDetails,
  priceBreakdown 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [nameOnCard, setNameOnCard] = useState('');
  const [country, setCountry] = useState('Canada');
  const [postalCode, setPostalCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    
    onSubmit(stripe, elements, { nameOnCard, country, postalCode });
  };

  return (
    <div className="payment-checkout-modal-overlay" onClick={onCancel}>
      <div className="payment-checkout-modal" onClick={e => e.stopPropagation()}>
        <button className="payment-checkout-close" onClick={onCancel}>
          <X size={20} />
        </button>

        <div className="payment-checkout-content">
          {/* Left side - Payment form */}
          <div className="payment-checkout-form-section">
            <div className="payment-checkout-header">
              <div className="payment-step">
                <span className="step-number">1</span>
                <span className="step-label">Your project details</span>
                <CheckCircle size={18} className="step-complete" />
              </div>
              <div className="payment-step active">
                <span className="step-number">2</span>
                <span className="step-label">Pay for booking</span>
              </div>
            </div>

            <div className="payment-options">
              <label className="payment-option selected">
                <input type="radio" name="paymentType" defaultChecked />
                <div className="option-content">
                  <strong>Pay in full</strong>
                  <span>Pay the total {priceBreakdown?.grandTotal ? `$${priceBreakdown.grandTotal.toFixed(2)} CAD` : ''} now and you're all set.</span>
                </div>
                <div className="option-check">●</div>
              </label>
            </div>

            <div className="payment-method-section">
              <label className="payment-method-label">Pay with</label>
              <div className="payment-method-select">
                <CreditCard size={18} />
                <span>Credit or debit card</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="payment-form">
              <div className="form-row">
                <label>Card number</label>
                <div className="card-input-wrapper">
                  <CardNumberElement options={CARD_ELEMENT_OPTIONS} />
                </div>
              </div>

              <div className="form-row-group">
                <div className="form-row half">
                  <label>Expiration date</label>
                  <div className="card-input-wrapper">
                    <CardExpiryElement options={CARD_ELEMENT_OPTIONS} />
                  </div>
                </div>
                <div className="form-row half">
                  <label>Security code</label>
                  <div className="card-input-wrapper">
                    <CardCvcElement options={CARD_ELEMENT_OPTIONS} />
                  </div>
                </div>
              </div>

              <div className="form-row-group">
                <div className="form-row half">
                  <label>Country</label>
                  <select 
                    value={country} 
                    onChange={e => setCountry(e.target.value)}
                    className="form-select"
                  >
                    <option value="Canada">Canada</option>
                    <option value="United States">United States</option>
                  </select>
                </div>
                <div className="form-row half">
                  <label>Postal code</label>
                  <input 
                    type="text" 
                    value={postalCode}
                    onChange={e => setPostalCode(e.target.value)}
                    placeholder="M5V 1T4"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <label>Name on card</label>
                <input 
                  type="text" 
                  value={nameOnCard}
                  onChange={e => setNameOnCard(e.target.value)}
                  placeholder="Full name as shown on card"
                  className="form-input"
                />
              </div>

              <p className="payment-terms">
                By providing your card information, you allow Planbeau Canada Inc. to charge your card 
                for future payments in accordance with their terms. By proceeding, you agree to our{' '}
                <a href="/terms-of-service" style={{ color: '#5086E8' }}>Terms of Service</a> and{' '}
                <a href="/privacy-policy" style={{ color: '#5086E8' }}>Privacy Policy</a>.
              </p>

              {error && (
                <div className="payment-error">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                className="payment-submit-btn"
                disabled={!stripe || processing}
              >
                <Lock size={16} />
                {processing ? 'Processing...' : `Pay $${priceBreakdown?.grandTotal?.toFixed(2) || '0.00'} CAD`}
              </button>

              <div className="secure-payment-note">
                <Lock size={14} />
                <span>Secure payment powered by Stripe</span>
              </div>
            </form>
          </div>

          {/* Right side - Booking summary */}
          <div className="payment-checkout-summary">
            {bookingDetails?.vendorImage && (
              <img 
                src={bookingDetails.vendorImage} 
                alt={bookingDetails.vendorName}
                className="summary-vendor-image"
              />
            )}
            <div className="summary-vendor-info">
              <h3>{bookingDetails?.vendorName || 'Vendor'}</h3>
              {bookingDetails?.vendorRating && (
                <div className="vendor-rating">
                  ★ {bookingDetails.vendorRating}
                </div>
              )}
              <p className="vendor-location">{bookingDetails?.vendorLocation}</p>
            </div>

            <div className="summary-event-details">
              <div className="event-datetime">
                <strong>{bookingDetails?.eventDate}</strong>
                <span>{bookingDetails?.eventTime}</span>
              </div>
              {bookingDetails?.totalHours && (
                <div className="event-hours">
                  Total hours: {bookingDetails.totalHours}
                </div>
              )}
            </div>

            <div className="summary-price-breakdown">
              {priceBreakdown?.packageName && (
                <div className="price-line">
                  <span>{priceBreakdown.packageName}</span>
                  <span>${priceBreakdown.packagePrice?.toFixed(2)} CAD</span>
                </div>
              )}
              
              {priceBreakdown?.services?.map((service, idx) => (
                <div key={idx} className="price-line">
                  <span>{service.name}</span>
                  <span>${service.price?.toFixed(2)} CAD</span>
                </div>
              ))}

              <div className="price-line subtotal">
                <span>Subtotal</span>
                <span>${priceBreakdown?.subtotal?.toFixed(2) || '0.00'} CAD</span>
              </div>

              <div className="price-line fee">
                <span>Platform Service Fee</span>
                <span>${priceBreakdown?.platformFee?.toFixed(2) || '0.00'} CAD</span>
              </div>

              <div className="price-line fee">
                <span>Tax ({priceBreakdown?.taxLabel || 'HST 13%'})</span>
                <span>${priceBreakdown?.taxAmount?.toFixed(2) || '0.00'} CAD</span>
              </div>

              <div className="price-line fee">
                <span>Processing fee</span>
                <span>${priceBreakdown?.processingFee?.toFixed(2) || '0.00'} CAD</span>
              </div>

              <div className="price-line total">
                <span>Total</span>
                <span>${priceBreakdown?.grandTotal?.toFixed(2) || '0.00'} CAD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentCheckoutModal = ({ 
  isOpen, 
  onClose, 
  onPaymentSuccess,
  bookingDetails,
  priceBreakdown,
  onSubmitPayment
}) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (stripe, elements, billingDetails) => {
    setProcessing(true);
    setError('');

    try {
      await onSubmitPayment(stripe, elements, billingDetails);
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm 
        onSubmit={handleSubmit}
        onCancel={onClose}
        processing={processing}
        error={error}
        bookingDetails={bookingDetails}
        priceBreakdown={priceBreakdown}
      />
    </Elements>
  );
};

export default PaymentCheckoutModal;
