import React from 'react';
import './PackageServiceCard.css';
import { ActionButtonGroup, EditButton, DeleteButton } from './common/UIComponents';
import { useLocalization } from '../context/LocalizationContext';

/**
 * Universal Package/Service Card Component
 * Used consistently across VendorProfilePage, BookingPage, ServicesPackagesPanel, and BecomeVendorPage
 */

// Helper function to get category icon
const getCategoryIcon = (category, name) => {
  const catLower = (category || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();
  
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

// Service Card Component
export const ServiceCard = ({ 
  service, 
  isSelected = false, 
  onClick, 
  onEdit,
  onDelete,
  showActions = false,
  selectable = false 
}) => {
  const { formatCurrency } = useLocalization();
  const name = service.ServiceName || service.serviceName || service.name || service.Name || '';
  const description = service.ServiceDescription || service.Description || service.description || service.vendorDescription || service.VendorDescription || service.PredefinedDescription || '';
  const imageURL = service.ImageURL || service.imageURL || service.Image || '';
  const category = service.CategoryName || service.category || service.Category || '';
  const duration = service.DurationMinutes || service.durationMinutes || service.VendorDurationMinutes || service.baseDuration || service.vendorDuration || service.baseDurationMinutes || service.Duration || null;
  const cancellationPolicy = service.CancellationPolicy || service.cancellationPolicy || null;
  
  // Sale price support - check multiple field names
  const salePrice = service.SalePrice || service.salePrice || null;
  
  // Get the regular price for comparison (originalPrice or the computed price)
  const getPricingModel = () => service.pricingModel || service.PricingModel || 'time_based';
  const pricingModel = getPricingModel();
  
  // Determine the regular price based on pricing model
  const getRegularPrice = () => {
    if (pricingModel === 'fixed_price' || pricingModel === 'fixed') {
      return parseFloat(service.FixedPrice || service.fixedPrice || service.Price || 0);
    } else if (pricingModel === 'per_attendee' || pricingModel === 'per_person') {
      return parseFloat(service.PricePerPerson || service.pricePerPerson || service.Price || 0);
    } else {
      return parseFloat(service.BaseRate || service.baseRate || service.Price || 0);
    }
  };
  
  const regularPrice = service.OriginalPrice || service.originalPrice || getRegularPrice();
  const isOnSale = salePrice && parseFloat(salePrice) > 0 && regularPrice && parseFloat(regularPrice) > parseFloat(salePrice) && pricingModel !== 'time_based';
  
  // Get pricing info - check all possible field names from different API endpoints
  const getPricing = () => {
    // Check for different pricing formats from various API responses
    // VendorPrice comes from selected-services endpoint
    if (service.VendorPrice !== undefined && service.VendorPrice !== null && parseFloat(service.VendorPrice) > 0) {
      return { price: parseFloat(service.VendorPrice), type: service.PriceType || service.pricingModel || 'service' };
    }
    if (service.Price !== undefined && service.Price !== null && parseFloat(service.Price) > 0) {
      return { price: parseFloat(service.Price), type: service.PriceType || 'service' };
    }
    if (service.BasePrice !== undefined && service.BasePrice !== null && parseFloat(service.BasePrice) > 0) {
      return { price: parseFloat(service.BasePrice), type: service.PriceType || 'service' };
    }
    // baseRate comes from unified pricing model
    if (service.baseRate !== undefined && service.baseRate !== null && parseFloat(service.baseRate) > 0) {
      return { price: parseFloat(service.baseRate), type: service.pricingModel || 'hourly' };
    }
    if (service.BaseRate !== undefined && service.BaseRate !== null && parseFloat(service.BaseRate) > 0) {
      return { price: parseFloat(service.BaseRate), type: service.pricingModel || 'hourly' };
    }
    // fixedPrice for fixed pricing model
    if (service.fixedPrice !== undefined && service.fixedPrice !== null && parseFloat(service.fixedPrice) > 0) {
      return { price: parseFloat(service.fixedPrice), type: 'fixed' };
    }
    if (service.FixedPrice !== undefined && service.FixedPrice !== null && parseFloat(service.FixedPrice) > 0) {
      return { price: parseFloat(service.FixedPrice), type: 'fixed' };
    }
    // pricePerPerson for per-attendee pricing
    if (service.pricePerPerson !== undefined && service.pricePerPerson !== null && parseFloat(service.pricePerPerson) > 0) {
      return { price: parseFloat(service.pricePerPerson), type: 'per_person' };
    }
    if (service.PricePerPerson !== undefined && service.PricePerPerson !== null && parseFloat(service.PricePerPerson) > 0) {
      return { price: parseFloat(service.PricePerPerson), type: 'per_person' };
    }
    return { price: 0, type: 'service' };
  };

  const pricing = getPricing();
  const priceDisplay = pricing.price > 0 ? formatCurrency(pricing.price, null, { showCents: false }) : 'Price TBD';
  
  // Get min/max attendees for per_attendee pricing
  const minAttendees = service.MinimumAttendees || service.minimumAttendees || null;
  const maxAttendees = service.MaximumAttendees || service.maximumAttendees || null;
  
  const getPriceSuffix = () => {
    const pricingModel = service.pricingModel || service.PricingModel || pricing.type;
    switch (pricingModel) {
      case 'per_person':
      case 'per_attendee':
        return '/ person';
      case 'per_hour':
      case 'hourly':
      case 'time_based':
        return '/ hour';
      case 'fixed':
      case 'fixed_price':
        return 'fixed price';
      default:
        return '';
    }
  };

  // Format duration
  const formatDuration = (mins) => {
    if (!mins) return null;
    const minutes = parseInt(mins);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMins = minutes % 60;
      if (remainingMins > 0) {
        return `${hours}h ${remainingMins}m`;
      }
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${minutes} min`;
  };

  // Get pricing type label
  const getPricingTypeLabel = () => {
    const model = service.pricingModel || service.PricingModel || pricing.type;
    switch (model) {
      case 'fixed_price':
      case 'fixed':
        return { label: 'Fixed', icon: 'fa-tag' };
      case 'per_hour':
      case 'hourly':
      case 'time_based':
        return { label: 'Hourly', icon: 'fa-clock' };
      case 'per_person':
      case 'per_attendee':
        return { label: `${minAttendees || ''}${minAttendees && maxAttendees ? '-' : ''}${maxAttendees || ''}`, icon: 'fa-users' };
      default:
        return { label: 'Service', icon: 'fa-concierge-bell' };
    }
  };

  const pricingTypeInfo = getPricingTypeLabel();

  // Fresha.com style - simple text-based card with no images
  return (
    <div 
      className={`psc-card-fresha ${isSelected ? 'psc-card-fresha-selected' : ''}`}
      style={{ position: 'relative' }}
    >
      <div className="psc-card-fresha-content">
        {/* Left side - Service info */}
        <div className="psc-card-fresha-info">
          <h3 className="psc-card-fresha-title">{name}</h3>
          
          {/* Price line with suffix */}
          <p className="psc-card-fresha-price">
            {isOnSale ? (
              <>
                {formatCurrency(parseFloat(salePrice), null, { showCents: false })}
                <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginLeft: '8px', fontWeight: 400 }}>
                  {formatCurrency(parseFloat(regularPrice), null, { showCents: false })}
                </span>
              </>
            ) : (
              <>{priceDisplay}</>
            )}
            <span className="psc-card-fresha-price-suffix">{getPriceSuffix()}</span>
          </p>
          
          {/* Tags row - pricing type, duration */}
          <div className="psc-card-fresha-tags">
            <span className="psc-card-fresha-tag">
              <i className={`fas ${pricingTypeInfo.icon}`}></i>
              {pricingTypeInfo.label}
            </span>
            {duration && (
              <span className="psc-card-fresha-tag">
                <i className="far fa-clock"></i>
                {formatDuration(duration)}
              </span>
            )}
          </div>
        </div>
        
        {/* Right side - Book button or selection/actions */}
        <div className="psc-card-fresha-actions">
          {selectable ? (
            <div 
              className={`psc-selection-indicator ${isSelected ? 'selected' : ''}`}
              onClick={onClick}
              style={{ cursor: 'pointer' }}
            >
              {isSelected && <i className="fas fa-check"></i>}
            </div>
          ) : showActions ? (
            <ActionButtonGroup>
              {onEdit && <EditButton onClick={(e) => { e.stopPropagation(); onEdit(service); }} />}
              {onDelete && <DeleteButton onClick={(e) => { e.stopPropagation(); onDelete(service); }} title="Remove" />}
            </ActionButtonGroup>
          ) : (
            <button 
              className="psc-book-btn"
              onClick={onClick}
            >
              Book
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Package Card Component
export const PackageCard = ({ 
  pkg, 
  isSelected = false, 
  onClick, 
  onEdit,
  onDelete,
  showActions = false,
  selectable = false 
}) => {
  const { formatCurrency } = useLocalization();
  const name = pkg.PackageName || pkg.name || '';
  const description = pkg.Description || pkg.description || '';
  const imageURL = pkg.ImageURL || pkg.imageURL || '';
  const priceType = pkg.PriceType || pkg.priceType || 'fixed_price';
  const includedServices = pkg.IncludedServices || pkg.includedServices || [];
  const duration = pkg.DurationMinutes || pkg.Duration || pkg.duration || null;
  const cancellationPolicy = pkg.CancellationPolicy || pkg.cancellationPolicy || null;
  
  // Get min/max attendees for per_attendee pricing
  const minAttendees = pkg.MinAttendees || pkg.minAttendees || null;
  const maxAttendees = pkg.MaxAttendees || pkg.maxAttendees || null;
  
  // Get pricing based on price type
  const getPrice = () => {
    if (priceType === 'time_based') {
      return parseFloat(pkg.BaseRate || pkg.baseRate || pkg.Price || pkg.price || 0);
    } else if (priceType === 'per_attendee') {
      return parseFloat(pkg.PricePerPerson || pkg.pricePerPerson || pkg.Price || pkg.price || 0);
    } else {
      return parseFloat(pkg.FixedPrice || pkg.fixedPrice || pkg.Price || pkg.price || 0);
    }
  };
  
  const price = getPrice();
  const salePrice = (pkg.SalePrice || pkg.salePrice) ? parseFloat(pkg.SalePrice || pkg.salePrice) : null;
  const isOnSale = salePrice && salePrice > 0 && salePrice < price && priceType !== 'time_based';
  
  // Get price suffix based on pricing model (removed guest count text - icon shows it)
  const getPriceSuffix = () => {
    if (priceType === 'time_based') {
      return '/ hour';
    } else if (priceType === 'per_attendee' || priceType === 'per_person') {
      return '/ person';
    }
    return '/ package';
  };

  // Format duration
  const formatDuration = (mins) => {
    if (!mins) return null;
    const minutes = parseInt(mins);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMins = minutes % 60;
      if (remainingMins > 0) {
        return `${hours}h ${remainingMins}m`;
      }
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${minutes} min`;
  };

  // Get pricing type label for packages
  const getPricingTypeLabel = () => {
    switch (priceType) {
      case 'fixed_price':
      case 'fixed':
        return { label: 'Fixed', icon: 'fa-tag' };
      case 'time_based':
      case 'hourly':
        return { label: 'Hourly', icon: 'fa-clock' };
      case 'per_attendee':
      case 'per_person':
        if (minAttendees && maxAttendees) {
          return { label: `${minAttendees}-${maxAttendees}`, icon: 'fa-users' };
        } else if (minAttendees) {
          return { label: `Min ${minAttendees}`, icon: 'fa-users' };
        } else if (maxAttendees) {
          return { label: `Max ${maxAttendees}`, icon: 'fa-users' };
        }
        return { label: 'Per Person', icon: 'fa-users' };
      default:
        return { label: 'Fixed', icon: 'fa-tag' };
    }
  };

  const pricingTypeInfo = getPricingTypeLabel();

  // Fresha.com style - same as ServiceCard
  return (
    <div 
      className={`psc-card-fresha ${isSelected ? 'psc-card-fresha-selected' : ''}`}
      style={{ position: 'relative' }}
    >
      <div className="psc-card-fresha-content">
        {/* Left side - Package info */}
        <div className="psc-card-fresha-info">
          <h3 className="psc-card-fresha-title">{name}</h3>
          
          {/* Price line with suffix */}
          <p className="psc-card-fresha-price">
            {isOnSale ? (
              <>
                {formatCurrency(salePrice, null, { showCents: false })}
                <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginLeft: '8px', fontWeight: 400 }}>
                  {formatCurrency(price, null, { showCents: false })}
                </span>
              </>
            ) : (
              <>{formatCurrency(price, null, { showCents: false })}</>
            )}
            <span className="psc-card-fresha-price-suffix">{getPriceSuffix()}</span>
          </p>
          
          {/* Tags row - pricing type, duration, services count */}
          <div className="psc-card-fresha-tags">
            <span className="psc-card-fresha-tag">
              <i className={`fas ${pricingTypeInfo.icon}`}></i>
              {pricingTypeInfo.label}
            </span>
            {duration && (
              <span className="psc-card-fresha-tag">
                <i className="far fa-clock"></i>
                {formatDuration(duration)}
              </span>
            )}
            {includedServices.length > 0 && (
              <span className="psc-card-fresha-tag">
                <i className="fas fa-layer-group"></i>
                {includedServices.length} service{includedServices.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        
        {/* Right side - Book button or selection/actions */}
        <div className="psc-card-fresha-actions">
          {selectable ? (
            <div 
              className={`psc-selection-indicator ${isSelected ? 'selected' : ''}`}
              onClick={onClick}
              style={{ cursor: 'pointer' }}
            >
              {isSelected && <i className="fas fa-check"></i>}
            </div>
          ) : showActions ? (
            <ActionButtonGroup>
              {onEdit && <EditButton onClick={(e) => { e.stopPropagation(); onEdit(pkg); }} />}
              {onDelete && <DeleteButton onClick={(e) => { e.stopPropagation(); onDelete(pkg); }} title="Remove" />}
            </ActionButtonGroup>
          ) : (
            <button 
              className="psc-book-btn"
              onClick={onClick}
            >
              Book
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Packages/Services Toggle Tabs Component - Fresha.com style
// Featured (Services) tab is shown first (leftmost), then Packages
export const PackageServiceTabs = ({ 
  activeTab, 
  onTabChange, 
  packagesCount = 0, 
  servicesCount = 0 
}) => {
  return (
    <div className="psc-tabs-fresha">
      <button
        type="button"
        className={`psc-tab-fresha ${activeTab === 'services' ? 'active' : ''}`}
        onClick={() => onTabChange('services')}
      >
        Featured
      </button>
      <button
        type="button"
        className={`psc-tab-fresha ${activeTab === 'packages' ? 'active' : ''}`}
        onClick={() => onTabChange('packages')}
      >
        Packages
      </button>
    </div>
  );
};

// Empty State Component
export const PackageServiceEmpty = ({ type = 'packages', message }) => {
  const defaultMessage = type === 'packages' 
    ? 'No packages available.' 
    : 'No services available.';
  
  return (
    <div className="psc-empty">
      <i className={`fas ${type === 'packages' ? 'fa-box' : 'fa-concierge-bell'}`}></i>
      <p>{message || defaultMessage}</p>
    </div>
  );
};

// List Container Component
export const PackageServiceList = ({ children }) => {
  return (
    <div className="psc-list">
      {children}
    </div>
  );
};

export default { ServiceCard, PackageCard, PackageServiceTabs, PackageServiceEmpty, PackageServiceList };
