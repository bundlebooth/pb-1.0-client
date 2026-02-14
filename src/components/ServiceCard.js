import React from 'react';
import { useLocalization } from '../context/LocalizationContext';

/**
 * Unified ServiceCard component used across Vendor Profile, Business Profile, and Booking pages
 * Ensures consistent display of service information
 */
function ServiceCard({ service, variant = 'display', isSelected = false, onSelect = null }) {
  const { formatCurrency } = useLocalization();
  const serviceName = service.ServiceName || service.name || service.Name || 'Unnamed Service';
  const serviceDescription = service.Description || service.description || service.vendorDescription || '';
  const categoryName = service.CategoryName || service.category || service.Category || '';
  const durationMinutes = service.DurationMinutes || service.VendorDurationMinutes || service.DefaultDurationMinutes || service.vendorDuration || service.defaultDuration || 0;
  const capacity = service.MaxAttendees || service.maximumAttendees || service.Capacity || 0;
  const requiresDeposit = service.RequiresDeposit || false;
  const depositPercentage = service.DepositPercentage || 0;
  
  // Pricing logic
  const pricingModel = service.pricingModel || service.PricingModel || 'time_based';
  const baseRate = service.BaseRate || service.baseRate || null;
  const overtimeRate = service.OvertimeRatePerHour || service.overtimeRatePerHour || null;
  const fixedPrice = service.FixedPrice || service.fixedPrice || service.Price || service.VendorPrice || null;
  const pricePerPerson = service.PricePerPerson || service.pricePerPerson || null;
  
  // Format duration
  const formatDuration = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };
  
  // Format pricing display - professional and clean
  const getPricingDisplay = () => {
    if (pricingModel === 'time_based' && baseRate) {
      const base = formatCurrency(parseFloat(baseRate), null, { showCents: false });
      const overtime = overtimeRate ? formatCurrency(parseFloat(overtimeRate), null, { showCents: false }) : null;
      return { 
        main: base,
        sub: 'Base price',
        overtime: overtime,
        overtimeSub: overtime ? '/hr overtime' : null
      };
    } else if (pricingModel === 'fixed_price' && fixedPrice) {
      return { 
        main: formatCurrency(parseFloat(fixedPrice), null, { showCents: false }),
        sub: 'Fixed price',
        overtime: null,
        overtimeSub: null
      };
    } else if (pricingModel === 'per_attendee' && pricePerPerson) {
      return { 
        main: formatCurrency(parseFloat(pricePerPerson), null, { showCents: false }),
        sub: 'Per person',
        overtime: null,
        overtimeSub: null
      };
    } else if (fixedPrice) {
      return { 
        main: formatCurrency(parseFloat(fixedPrice), null, { showCents: false }),
        sub: 'Per service',
        overtime: null,
        overtimeSub: null
      };
    }
    return { 
      main: 'Contact for pricing',
      sub: '',
      overtime: null,
      overtimeSub: null
    };
  };
  
  const pricing = getPricingDisplay();
  
  // Get category icon
  const getCategoryIcon = () => {
    const catLower = categoryName.toLowerCase();
    const nameLower = serviceName.toLowerCase();
    
    if (catLower.includes('photo') || nameLower.includes('photo')) return 'fa-camera';
    if (catLower.includes('video') || nameLower.includes('video')) return 'fa-video';
    if (catLower.includes('music') || catLower.includes('dj') || nameLower.includes('music') || nameLower.includes('dj')) return 'fa-music';
    if (catLower.includes('cater') || nameLower.includes('food') || nameLower.includes('cater')) return 'fa-utensils';
    if (catLower.includes('venue') || nameLower.includes('venue') || nameLower.includes('space')) return 'fa-building';
    if (catLower.includes('decor') || catLower.includes('floral') || nameLower.includes('decor') || nameLower.includes('flower')) return 'fa-leaf';
    if (catLower.includes('entertainment') || nameLower.includes('perform')) return 'fa-masks-theater';
    if (catLower.includes('transport') || nameLower.includes('transport')) return 'fa-car';
    if (catLower.includes('beauty') || catLower.includes('wellness') || nameLower.includes('makeup') || nameLower.includes('spa')) return 'fa-spa';
    return 'fa-concierge-bell';
  };
  
  const durationText = formatDuration(durationMinutes);
  
  // Selectable variant (for booking page)
  if (variant === 'selectable') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
        <div
          className={`service-card ${isSelected ? 'selected' : ''}`}
          onClick={onSelect}
          style={{
            padding: '1.25rem',
            background: isSelected ? '#f0f7ff' : '#fff',
            border: `2px solid ${isSelected ? '#5e72e4' : '#e5e7eb'}`,
            borderRadius: '12px',
            cursor: 'pointer',
            position: 'relative',
            flex: 1
          }}
        >
          {/* Pricing positioned at top right */}
          <div style={{ 
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            textAlign: 'right', 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '0.25rem'
          }}>
            <div style={{ 
              fontSize: '1.25rem', 
              fontWeight: 700, 
              color: '#111827',
              lineHeight: '1'
            }}>
              {pricing.main}
            </div>
            {pricing.sub && (
              <div style={{ 
                fontSize: '0.625rem', 
                color: '#9ca3af',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                lineHeight: '1'
              }}>
                {pricing.sub}
              </div>
            )}
            {pricing.overtime && (
              <div style={{ 
                fontSize: '0.875rem', 
                fontWeight: 600, 
                color: '#111827',
                lineHeight: '1',
                marginTop: '0.25rem'
              }}>
                {pricing.overtime} <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#9ca3af',
                  fontWeight: 400
                }}>{pricing.overtimeSub}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              flexShrink: 0,
              width: '60px',
              height: '60px',
              borderRadius: '10px',
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className={`fas ${getCategoryIcon()}`} style={{ color: '#5e72e4', fontSize: '1.5rem' }}></i>
            </div>
            
            <div style={{ flex: 1, minWidth: 0, paddingRight: '120px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: '0 0 0.5rem 0' }}>
                {serviceName}
              </h3>
              
              {/* Metadata row - all on same line */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                fontSize: '0.875rem', 
                color: '#6b7280',
                marginBottom: serviceDescription ? '0.75rem' : 0,
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                {categoryName && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <i className="fas fa-tag"></i>
                    {categoryName}
                  </span>
                )}
                {durationText && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <i className="fas fa-clock"></i>
                    {durationText}
                  </span>
                )}
                {capacity > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <i className="fas fa-users"></i>
                    Up to {capacity}
                  </span>
                )}
                {requiresDeposit && depositPercentage > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#5e72e4' }}>
                    <i className="fas fa-receipt"></i>
                    {depositPercentage}% deposit
                  </span>
                )}
              </div>
              
              {serviceDescription && (
                <p style={{ fontSize: '0.9375rem', color: '#4b5563', lineHeight: '1.6', margin: 0 }}>
                  {serviceDescription}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Selection indicator - outside the card */}
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: `2px solid ${isSelected ? '#5e72e4' : '#d1d5db'}`,
          background: isSelected ? '#5e72e4' : 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: 'pointer'
        }}
        onClick={onSelect}>
          {isSelected && <i className="fas fa-check" style={{ color: 'white', fontSize: '0.75rem' }}></i>}
        </div>
      </div>
    );
  }
  
  // Display variant (for vendor profile and business profile)
  return (
    <div className="service-card" style={{
      padding: '1.25rem',
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      cursor: 'default',
      position: 'relative'
    }}>
      {/* Pricing positioned at top right */}
      <div className="service-card-pricing" style={{ 
        position: 'absolute',
        top: '1.25rem',
        right: '1.25rem',
        textAlign: 'right', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.25rem'
      }}>
        <div style={{ 
          fontSize: '1.25rem', 
          fontWeight: 700, 
          color: '#111827',
          lineHeight: '1'
        }}>
          {pricing.main}
        </div>
        {pricing.sub && (
          <div style={{ 
            fontSize: '0.625rem', 
            color: '#9ca3af',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            lineHeight: '1'
          }}>
            {pricing.sub}
          </div>
        )}
        {pricing.overtime && (
          <div style={{ 
            fontSize: '0.875rem', 
            fontWeight: 600, 
            color: '#111827',
            lineHeight: '1',
            marginTop: '0.25rem'
          }}>
            {pricing.overtime} <span style={{ 
              fontSize: '0.75rem', 
              color: '#9ca3af',
              fontWeight: 400
            }}>{pricing.overtimeSub}</span>
          </div>
        )}
      </div>

      <div className="service-card-row" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div className="service-card-icon" style={{
          flexShrink: 0,
          width: '60px',
          height: '60px',
          borderRadius: '10px',
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <i className={`fas ${getCategoryIcon()}`} style={{ color: '#5e72e4', fontSize: '1.5rem' }}></i>
        </div>
        
        <div className="service-card-content" style={{ flex: 1, minWidth: 0, paddingRight: '120px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: '0 0 0.5rem 0' }}>
            {serviceName}
          </h3>
          
          {/* Metadata row - all on same line */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            fontSize: '0.875rem', 
            color: '#6b7280',
            marginBottom: serviceDescription ? '0.75rem' : 0,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {categoryName && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <i className="fas fa-tag"></i>
                {categoryName}
              </span>
            )}
            {durationText && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <i className="fas fa-clock"></i>
                {durationText}
              </span>
            )}
            {capacity > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <i className="fas fa-users"></i>
                Up to {capacity}
              </span>
            )}
            {requiresDeposit && depositPercentage > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#5e72e4' }}>
                <i className="fas fa-receipt"></i>
                {depositPercentage}% deposit
              </span>
            )}
          </div>
          
          {serviceDescription && (
            <p style={{ fontSize: '0.9375rem', color: '#4b5563', lineHeight: '1.6', margin: 0 }}>
              {serviceDescription}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ServiceCard;
