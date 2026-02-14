/**
 * BookingSummaryCard - Shared component for displaying booking/vendor summary
 * Used in BookingPage, PaymentPage, and anywhere vendor info needs to be displayed
 * 
 * Usage:
 * import BookingSummaryCard from '../components/common/BookingSummaryCard';
 * <BookingSummaryCard 
 *   vendor={{ name, logo, hostName, rating, reviewCount, city }}
 *   event={{ name, type, date, startTime, endTime, guests, location }}
 *   pricing={{ items, subtotal, platformFee, tax, taxLabel, processingFee, total }}
 *   policies={{ instantBooking, cancellationPolicy, leadTimeHours }}
 * />
 */

import React from 'react';
import { formatCurrency } from '../../utils/helpers';

// Helper to format time
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  try {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  } catch {
    return timeStr;
  }
};

// Calculate duration between two times
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return null;
  try {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end - start;
    const totalHours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
    return totalHours > 0 ? totalHours : null;
  } catch {
    return null;
  }
};

const BookingSummaryCard = ({ 
  vendor = {}, 
  event = {}, 
  pricing = {}, 
  policies = {},
  showPricing = true,
  showPolicies = true,
  className = ''
}) => {
  const duration = calculateDuration(event.startTime, event.endTime);

  return (
    <div className={`booking-summary-card ${className}`}>
      {/* Vendor Info Section */}
      <div className="vendor-info" id="vendor-info">
        {vendor.logo ? (
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            overflow: 'hidden', 
            border: '2px solid #DDDDDD',
            background: '#f7f7f7',
            flexShrink: 0
          }}>
            <img src={vendor.logo} alt={vendor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#f7f7f7',
            border: '2px solid #DDDDDD',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <i className="far fa-store" style={{ fontSize: '24px', color: '#717171' }}></i>
          </div>
        )}
        <div className="vendor-details">
          <h3 className="vendor-name" style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 4px', color: '#222' }}>
            {vendor.name || 'Vendor'}
          </h3>
          {vendor.hostName && (
            <p style={{ fontSize: '0.875rem', color: '#717171', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="far fa-user" style={{ fontSize: '0.75rem' }}></i>
              Hosted by {vendor.hostName}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {vendor.rating > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: '#222' }}>
                <i className="fas fa-star" style={{ color: '#5086E8', fontSize: '0.8rem' }}></i>
                {parseFloat(vendor.rating).toFixed(1)}
                {vendor.reviewCount > 0 && (
                  <span style={{ color: '#717171' }}>({vendor.reviewCount} review{vendor.reviewCount !== 1 ? 's' : ''})</span>
                )}
              </span>
            )}
            {vendor.city && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: '#717171' }}>
                <i className="far fa-map-marker-alt" style={{ fontSize: '0.75rem' }}></i>
                {vendor.city}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="summary-divider"></div>

      {/* Event Details Section */}
      <div style={{ padding: '16px 0' }}>
        {/* Event Name */}
        {event.name && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Event
            </div>
            <div style={{ fontSize: '1rem', color: '#222', fontWeight: 500 }}>
              {event.name}
            </div>
          </div>
        )}

        {/* Event Type */}
        {event.type && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Type
            </div>
            <div style={{ fontSize: '0.95rem', color: '#222' }}>
              {event.type.charAt(0).toUpperCase() + event.type.slice(1).replace('-', ' ')}
            </div>
          </div>
        )}

        {/* Date & Time */}
        {event.date && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Date & Time
            </div>
            <div style={{ fontSize: '0.95rem', color: '#222', fontWeight: 500 }}>
              {new Date(event.date).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            {event.startTime && event.endTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.9rem', color: '#222' }}>{formatTime(event.startTime)}</span>
                <span style={{ color: '#9ca3af' }}>→</span>
                <span style={{ fontSize: '0.9rem', color: '#222' }}>{formatTime(event.endTime)}</span>
                {duration && (
                  <span style={{ fontSize: '0.85rem', color: '#6b7280', marginLeft: '8px' }}>
                    ({duration % 1 === 0 ? duration : duration.toFixed(1)} hrs)
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Guest Count */}
        {event.guests && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Guests
            </div>
            <div style={{ fontSize: '0.95rem', color: '#222' }}>
              {event.guests} guests
            </div>
          </div>
        )}

        {/* Event Location */}
        {event.location && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Location
            </div>
            <div style={{ fontSize: '0.9rem', color: '#222' }}>
              {event.location}
            </div>
          </div>
        )}
      </div>

      {/* Price Breakdown Section */}
      {showPricing && pricing.total !== undefined && (
        <>
          <div className="summary-divider"></div>
          <div style={{ padding: '16px 0' }}>
            {/* Service/Package items */}
            {pricing.items && pricing.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.95rem', color: '#222' }}>
                  {item.name}
                  {item.calculation && (
                    <span style={{ fontSize: '0.85rem', color: '#6b7280', marginLeft: '4px' }}>
                      ({item.calculation})
                    </span>
                  )}
                </span>
                <span style={{ fontSize: '0.95rem', color: '#222' }}>{formatCurrency(item.price)}</span>
              </div>
            ))}

            {/* Subtotal */}
            {pricing.subtotal !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: '#717171' }}>Subtotal</span>
                <span style={{ fontSize: '0.9rem', color: '#717171' }}>{formatCurrency(pricing.subtotal)}</span>
              </div>
            )}

            {/* Platform Fee */}
            {pricing.platformFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: '#717171' }}>Platform Service Fee</span>
                <span style={{ fontSize: '0.9rem', color: '#717171' }}>{formatCurrency(pricing.platformFee)}</span>
              </div>
            )}

            {/* Tax */}
            {pricing.tax !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: '#717171' }}>Tax ({pricing.taxLabel || 'HST'})</span>
                <span style={{ fontSize: '0.9rem', color: '#717171' }}>{formatCurrency(pricing.tax)}</span>
              </div>
            )}

            {/* Processing Fee */}
            {pricing.processingFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: '#717171' }}>Payment Processing Fee</span>
                <span style={{ fontSize: '0.9rem', color: '#717171' }}>{formatCurrency(pricing.processingFee)}</span>
              </div>
            )}

            {/* Total */}
            <div style={{ borderTop: '2px solid #222', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#222' }}>Total</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#222' }}>{formatCurrency(pricing.total)}</span>
            </div>
          </div>
        </>
      )}

      {/* Policies Section */}
      {showPolicies && (policies.instantBooking || policies.cancellationPolicy || policies.leadTimeHours > 0) && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ebebeb' }}>
          {/* Instant Booking */}
          {policies.instantBooking && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
              <i className="fas fa-bolt" style={{ fontSize: '16px', color: '#222', width: '20px', marginTop: '2px' }}></i>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#222' }}>Instant Booking</div>
                <div style={{ fontSize: '0.8rem', color: '#717171' }}>Book and pay now without waiting for vendor approval</div>
              </div>
            </div>
          )}

          {/* Cancellation Policy */}
          {policies.cancellationPolicy && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
              <i className="fas fa-calendar-check" style={{ fontSize: '16px', color: '#222', width: '20px', marginTop: '2px' }}></i>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#222' }}>
                  {typeof policies.cancellationPolicy === 'string' ? policies.cancellationPolicy : policies.cancellationPolicy.Name || 'Free cancellation'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#717171' }}>
                  {policies.cancellationPolicy.CancellationDays 
                    ? `Free cancellation up to ${policies.cancellationPolicy.CancellationDays} days before`
                    : 'Flexible cancellation policy'}
                </div>
              </div>
            </div>
          )}

          {/* Lead Time */}
          {policies.leadTimeHours > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <i className="fas fa-clock" style={{ fontSize: '16px', color: '#222', width: '20px', marginTop: '2px' }}></i>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#222' }}>Advance notice required</div>
                <div style={{ fontSize: '0.8rem', color: '#717171' }}>
                  {policies.leadTimeHours >= 168 
                    ? `Book at least ${Math.floor(policies.leadTimeHours / 168)} week${Math.floor(policies.leadTimeHours / 168) > 1 ? 's' : ''} in advance`
                    : policies.leadTimeHours >= 24 
                      ? `Book at least ${Math.floor(policies.leadTimeHours / 24)} day${Math.floor(policies.leadTimeHours / 24) > 1 ? 's' : ''} in advance`
                      : `Book at least ${policies.leadTimeHours} hours in advance`}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingSummaryCard;
