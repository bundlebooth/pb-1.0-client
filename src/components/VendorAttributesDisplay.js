import React from 'react';

/**
 * VendorAttributesDisplay - Displays vendor attributes on the profile page
 * Shows: Instant Booking badge, Lead Time, Event Types, Cultures, Service Location, Experience
 */
function VendorAttributesDisplay({ vendor }) {
  if (!vendor) return null;

  const {
    InstantBookingEnabled,
    MinBookingLeadTimeHours,
    ServiceLocationScope,
    YearsOfExperienceRange,
    eventTypes = [],
    cultures = [],
    categories = []
  } = vendor;

  // Format lead time for display
  const formatLeadTime = (hours) => {
    if (!hours || hours === 0) return 'No minimum';
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    return days === 1 ? '1 day' : `${days} days`;
  };

  // Format experience range for display
  const formatExperience = (range) => {
    const labels = {
      '0-1': 'Less than 1 year',
      '1-3': '1-3 years',
      '3-5': '3-5 years',
      '5-10': '5-10 years',
      '10+': '10+ years'
    };
    return labels[range] || range;
  };

  const hasAttributes = InstantBookingEnabled || eventTypes.length > 0 || cultures.length > 0 || 
                        ServiceLocationScope || YearsOfExperienceRange;

  if (!hasAttributes) return null;

  return (
    <div className="vendor-attributes-display" style={{ marginBottom: '2rem' }}>
      {/* Instant Booking Badge */}
      {InstantBookingEnabled && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'linear-gradient(135deg, #5086E8 0%, #4070D0 100%)',
          color: 'white',
          borderRadius: '24px',
          fontSize: '0.875rem',
          fontWeight: 600,
          marginBottom: '1rem'
        }}>
          <i className="fas fa-bolt"></i>
          Instant Booking Available
        </div>
      )}

      {/* Quick Info Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginTop: InstantBookingEnabled ? '1rem' : 0
      }}>
        {/* Booking Lead Time */}
        {MinBookingLeadTimeHours > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-clock" style={{ color: '#6b7280', fontSize: '1rem' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Booking Lead Time
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
                {formatLeadTime(MinBookingLeadTimeHours)} minimum
              </div>
            </div>
          </div>
        )}

        {/* Service Location */}
        {ServiceLocationScope && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-map-marker-alt" style={{ color: '#6b7280', fontSize: '1rem' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Service Area
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
                {ServiceLocationScope}
              </div>
            </div>
          </div>
        )}

        {/* Years of Experience */}
        {YearsOfExperienceRange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-award" style={{ color: '#6b7280', fontSize: '1rem' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Experience
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
                {formatExperience(YearsOfExperienceRange)}
              </div>
            </div>
          </div>
        )}
      </div>

{/* Event Types */}
      {eventTypes.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Event Types
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {eventTypes.map((et, idx) => (
              <span
                key={idx}
                style={{
                  padding: '0.375rem 0.75rem',
                  background: '#eff6ff',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  color: '#5086E8',
                  border: '1px solid #bfdbfe'
                }}
              >
                {et.EventTypeName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cultures Served */}
      {cultures.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Cultures Served
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {cultures.map((culture, idx) => (
              <span
                key={idx}
                style={{
                  padding: '0.375rem 0.75rem',
                  background: '#fef3c7',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  color: '#92400e',
                  border: '1px solid #fcd34d'
                }}
              >
                {culture.CultureName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorAttributesDisplay;
