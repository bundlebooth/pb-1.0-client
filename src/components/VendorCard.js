import React, { memo } from 'react';
import { getCategoryIconHtml, formatLocationShort } from '../utils/helpers';
import { buildVendorProfileUrl } from '../utils/urlHelpers';
import { useLocalization } from '../context/LocalizationContext';
import './common/LoadingSpinner.css';

const VendorCard = memo(function VendorCard({ vendor, isFavorite, onToggleFavorite, onView, onHighlight, showViewCount, showResponseTime, showAnalyticsBadge, analyticsBadgeType, onlineStatus, showBio = false }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const { formatCurrency, formatDistance } = useLocalization();
  const vendorId = vendor.VendorProfileID || vendor.id;
  
  // Build array of all available images for carousel
  const getAllImages = () => {
    const images = [];
    
    // Add featured image first
    if (vendor.featuredImage?.url) images.push(vendor.featuredImage.url);
    else if (vendor.featuredImage?.optimizedUrl) images.push(vendor.featuredImage.optimizedUrl);
    else if (vendor.FeaturedImageURL) images.push(vendor.FeaturedImageURL);
    else if (vendor.featuredImageURL) images.push(vendor.featuredImageURL);
    
    // Add images from images array
    if (vendor.images && Array.isArray(vendor.images)) {
      vendor.images.forEach(img => {
        const url = img.url || img.optimizedUrl || img.thumbnailUrl || img.ImageURL;
        if (url && !images.includes(url)) images.push(url);
      });
    }
    
    // Add other image fields if not already included
    const otherImages = [
      vendor.PortfolioImage,
      vendor.portfolioImage,
      vendor.image,
      vendor.ImageURL,
      vendor.imageURL,
      vendor.imageUrl,
      vendor.ProfileImageURL,
      vendor.profileImage
    ].filter(Boolean);
    
    otherImages.forEach(url => {
      if (!images.includes(url)) images.push(url);
    });
    
    // Return at least empty array if no images - we'll show loading spinner
    return images;
  };
  
  const allImages = getAllImages();
  const hasMultipleImages = allImages.length > 1;
  
  // Image URL resolution - use current index from carousel
  const imageUrl = allImages[currentImageIndex] || null;
  const [imageLoading, setImageLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);
  
  // Logo URL resolution
  const logoUrl = vendor.LogoURL || 
                  vendor.logoURL ||
                  vendor.logoUrl ||
                  vendor.logo ||
                  vendor.Logo ||
                  null;
  
  // Guest Favorite status - only show badge if explicitly granted by admin
  // Only check IsGuestFavorite field (admin-controlled), do NOT fall back to IsPremium
  const isGuestFavorite = vendor.IsGuestFavorite === true || vendor.isGuestFavorite === true;
  
  // Price resolution
  const rawPrice = vendor.startingPrice ?? vendor.MinPriceNumeric ?? vendor.MinPrice ?? 
                   vendor.price ?? vendor.Price ?? vendor.minPrice ?? vendor.starting_price ?? 
                   vendor.HourlyRate ?? vendor.BasePrice;
  let hourlyRate = 0;
  if (rawPrice !== undefined && rawPrice !== null && rawPrice !== '') {
    if (typeof rawPrice === 'number') {
      hourlyRate = Math.round(rawPrice);
    } else if (typeof rawPrice === 'string') {
      const parsed = parseFloat(rawPrice.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed)) hourlyRate = Math.round(parsed);
    }
  }

  // Rating and reviews - prioritize in-app reviews, fallback to Google reviews
  const inAppRating = (() => {
    const r = parseFloat(vendor.averageRating ?? vendor.rating ?? vendor.AverageRating ?? 0);
    return isNaN(r) || r === 0 ? 0 : r;
  })();
  const inAppReviewCount = vendor.totalReviews ?? vendor.reviewCount ?? vendor.TotalReviews ?? 0;
  
  // Google reviews fallback
  const googleRating = (() => {
    const r = parseFloat(vendor.GoogleRating ?? vendor.googleRating ?? 0);
    return isNaN(r) || r === 0 ? 0 : r;
  })();
  const googleReviewCount = vendor.GoogleReviewCount ?? vendor.googleReviewCount ?? 0;
  
  // Use Google reviews if no in-app reviews
  const rating = inAppReviewCount > 0 ? inAppRating : googleRating;
  const reviewCount = inAppReviewCount > 0 ? inAppReviewCount : googleReviewCount;
  const isGoogleReview = inAppReviewCount === 0 && googleReviewCount > 0;
  
  // Location - format to "City, AB" short format
  const locCity = vendor.City || vendor.city || '';
  const locState = vendor.State || vendor.state || '';
  const rawLocation = (vendor.location && vendor.location.trim()) || 
                       [locCity, locState].filter(Boolean).join(', ');
  const locationText = formatLocationShort(rawLocation);
  
  // Response time - only show if explicitly passed showResponseTime prop
  const responseTime = vendor.ResponseTime || vendor.responseTime || null;
  
  // Analytics data for discovery sections
  const viewCount = vendor.viewCount || 0;
  const avgResponseMinutes = vendor.avgResponseMinutes || 0;
  
  // Category - DB now returns snake_case directly, no mapping needed
  const primaryCategory = vendor.PrimaryCategory || vendor.primaryCategory || 
                         vendor.Category || vendor.category || '';
  const categoryKey = primaryCategory.toLowerCase();
  const categoryIconHtml = getCategoryIconHtml(categoryKey);
  
  // Bio/Description - truncate to ~100 chars for card display
  const rawBio = vendor.Bio || vendor.bio || vendor.Description || vendor.description || 
                 vendor.AboutUs || vendor.aboutUs || vendor.Summary || vendor.summary || '';
  const bioText = rawBio.length > 100 ? rawBio.substring(0, 100).trim() + '...' : rawBio;

  const handleCardClick = () => {
    // Call onView callback if provided (for tracking recently viewed, etc.)
    if (onView) {
      onView(vendorId);
    }
    
    // Get search date params from sessionStorage if available
    let searchDateParams = {};
    try {
      const stored = sessionStorage.getItem('searchDateParams');
      if (stored) {
        const parsed = JSON.parse(stored);
        searchDateParams = {
          eventDate: parsed.date || parsed.eventDate,
          startTime: parsed.startTime,
          endTime: parsed.endTime
        };
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    // Build professional URL with slug and date parameters
    const url = buildVendorProfileUrl(vendor, {
      source: 'search',
      category: primaryCategory,
      previousSection: '1000',
      ...searchDateParams
    });
    
    // Always open vendor profile in new tab
    window.open(url, '_blank');
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(vendorId);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onHighlight) {
      onHighlight(vendorId, true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onHighlight) {
      onHighlight(vendorId, false);
    }
  };

  return (
    <div
      className="vendor-card"
      data-vendor-id={vendorId}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        background: 'transparent',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        border: 'none',
        outline: 'none',
        boxShadow: 'none'
      }}
    >
      {/* Image Container - Square aspect ratio like Airbnb */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '100%', overflow: 'hidden', borderRadius: '12px', background: '#f3f4f6' }}>
        {/* Loading Spinner - shown while image is loading or if no image */}
        {(imageLoading || !imageUrl) && !imageError && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f3f4f6',
            zIndex: 2
          }}>
            <div className="spinner" style={{ width: '32px', height: '32px' }} />
          </div>
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={vendor.BusinessName || vendor.name}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              opacity: imageLoading ? 0 : 1,
              transition: 'opacity 0.3s ease'
            }}
            className="vendor-card-image"
          />
        )}
        {/* Error state - show placeholder icon */}
        {imageError && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f3f4f6'
          }}>
            <i className="fas fa-image" style={{ fontSize: '32px', color: '#d1d5db' }}></i>
          </div>
        )}
        
        {/* Image Navigation Arrows - Only show on hover and if multiple images */}
        {hasMultipleImages && isHovered && (
          <>
            {/* Left Arrow */}
            {currentImageIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(prev => prev - 1);
                }}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.95)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(-50%)'; }}
              >
                <svg viewBox="0 0 16 16" style={{ width: '10px', height: '10px', fill: '#222' }}>
                  <path d="M10.5 13.5L5 8l5.5-5.5" stroke="#222" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            
            {/* Right Arrow */}
            {currentImageIndex < allImages.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(prev => prev + 1);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.95)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(-50%)'; }}
              >
                <svg viewBox="0 0 16 16" style={{ width: '10px', height: '10px', fill: '#222' }}>
                  <path d="M5.5 2.5L11 8l-5.5 5.5" stroke="#222" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </>
        )}
        
        {/* Image Dots Indicator */}
        {hasMultipleImages && (
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '4px',
            zIndex: 5
          }}>
            {allImages.slice(0, 5).map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: idx === currentImageIndex ? 'white' : 'rgba(255,255,255,0.5)',
                  transition: 'background 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}
              />
            ))}
            {allImages.length > 5 && (
              <div style={{ color: 'white', fontSize: '8px', marginLeft: '2px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>+{allImages.length - 5}</div>
            )}
          </div>
        )}
        
        {/* Hover Darkening Overlay */}
        <div 
          className="vendor-card-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: isHovered ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0)',
            transition: 'background-color 0.3s ease',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />
        
        {/* Top Row Container - Guest Favourite Badge and Heart on same row */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
          pointerEvents: 'none',
          height: '28px'
        }}>
          {/* Guest Favourite Badge - Frosted glass effect, only shows if admin granted status */}
          {isGuestFavorite ? (
            <div className="vendor-card-guest-favorite" style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              color: '#222222',
              padding: '4px 10px',
              borderRadius: '14px',
              fontSize: '11px',
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              border: '1px solid rgba(255,255,255,0.5)',
              whiteSpace: 'nowrap',
              pointerEvents: 'auto',
              lineHeight: '1.2'
            }}>
              Guest favourite
            </div>
          ) : (
            <div style={{ flex: 1 }}></div>
          )}
          
          {/* Heart Icon - Top Right */}
          <button
            onClick={handleFavoriteClick}
            className={isFavorite ? 'active' : ''}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              pointerEvents: 'auto',
              flexShrink: 0
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" style={{ 
              display: 'block', 
              fill: isFavorite ? '#FF385C' : 'rgba(0,0,0,0.5)', 
              height: '24px', 
              width: '24px', 
              stroke: 'white', 
              strokeWidth: 2, 
              overflow: 'visible',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}>
              <path d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05a6.98 6.98 0 0 0-9.9 0A6.98 6.98 0 0 0 2 11c0 7 7 12.27 14 17z"></path>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Card Content - Airbnb Style */}
      <div className="vendor-card-content" style={{ padding: '10px 0 4px 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* Line 1: Vendor Name with Online Status - Black, semibold */}
        <div className="vendor-card-name-row" style={{ 
          fontSize: '15px', 
          color: '#222222', 
          lineHeight: '19px',
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span className="vendor-card-business-name">
            {vendor.BusinessName || vendor.name}
          </span>
          {/* Online Status Indicator - Only show when online */}
          {onlineStatus?.isOnline && (
            <span 
              title="Online now"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0
              }}
            >
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.2)'
              }} />
              <span style={{ 
                fontSize: '11px', 
                color: '#22c55e', 
                fontWeight: 500 
              }}>
                Online
              </span>
            </span>
          )}
        </div>
        
        {/* Line 2: City, Province - Gray, same size as price line */}
        <div className="vendor-card-location" style={{ 
          fontSize: '13px', 
          color: '#717171',
          lineHeight: '17px',
          fontWeight: 400
        }}>
          {locationText || 'Location not specified'}
        </div>
        
        {/* Line 3: Starting from price · ★ Rating (count) - Single line */}
        <div className="vendor-card-price-row" style={{ 
          fontSize: '13px',
          lineHeight: '17px',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          whiteSpace: 'nowrap',
          overflow: 'hidden'
        }}>
          {hourlyRate > 0 ? (
            <>
              <span style={{ fontWeight: 400, color: '#717171' }}>Starting from</span>
              <span style={{ fontWeight: 600, color: '#222222' }}>{formatCurrency(hourlyRate, null, { showCents: false })}</span>
            </>
          ) : (
            <span style={{ fontWeight: 400, color: '#717171' }}>Contact for pricing</span>
          )}
          {/* Only show reviews if there are actual reviews */}
          {reviewCount > 0 && (
            <>
              <span style={{ color: '#717171', margin: '0 2px' }}>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                {/* Show Google icon if using Google reviews */}
                {isGoogleReview ? (
                  <svg viewBox="0 0 24 24" style={{ height: '12px', width: '12px', marginRight: '2px' }}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" style={{ 
                    display: 'inline-block', 
                    height: '10px', 
                    width: '10px', 
                    fill: '#5e72e4',
                    verticalAlign: 'middle'
                  }}>
                    <path fillRule="evenodd" d="M15.1 1.58l-4.13 8.88-9.86 1.27a1 1 0 0 0-.54 1.74l7.3 6.57-1.97 9.85a1 1 0 0 0 1.48 1.06l8.62-5 8.63 5a1 1 0 0 0 1.48-1.06l-1.97-9.85 7.3-6.57a1 1 0 0 0-.55-1.73l-9.86-1.28-4.12-8.88a1 1 0 0 0-1.82 0z"></path>
                  </svg>
                )}
                <span style={{ fontWeight: 400, color: '#222222' }}>
                  {rating > 0 ? rating.toFixed(1) : '5.0'}
                </span>
                <span style={{ fontWeight: 400, color: '#717171' }}>
                  ({reviewCount})
                </span>
              </span>
            </>
          )}
        </div>
        
        {/* Line 4: Discovery Analytics Badge - Only in discovery sections */}
        {showAnalyticsBadge && (vendor.analyticsBadge || vendor.analyticsBadgeDistanceMiles != null) && (
          <div 
            className="vendor-card-analytics-badge"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              fontSize: '13px',
              color: analyticsBadgeType === 'response' ? '#00A699' : 
                     analyticsBadgeType === 'rating' ? '#FFB400' :
                     analyticsBadgeType === 'bookings' ? '#EC4899' :
                     analyticsBadgeType === 'distance' ? '#8B5CF6' :
                     analyticsBadgeType === 'trending' ? '#FF6B35' : '#FF385C',
              marginTop: '2px',
              fontWeight: 500
            }}>
            <i className={`fas ${
              analyticsBadgeType === 'response' ? 'fa-bolt' :
              analyticsBadgeType === 'rating' ? 'fa-star' :
              analyticsBadgeType === 'bookings' ? 'fa-calendar-check' :
              analyticsBadgeType === 'distance' ? 'fa-location-dot' :
              analyticsBadgeType === 'trending' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-up'
            }`} style={{ fontSize: '11px' }}></i>
            <span>
              {/* Format distance using user's preferred unit if distance badge */}
              {analyticsBadgeType === 'distance' && vendor.analyticsBadgeDistanceMiles != null
                ? `${formatDistance(vendor.analyticsBadgeDistanceMiles)} away`
                : vendor.analyticsBadge}
            </span>
          </div>
        )}
        
        {/* Line 5: Bio/Description snippet - Only on browse pages, with divider */}
        {showBio && bioText && (
          <>
            <div style={{ 
              width: '100%', 
              height: '1px', 
              backgroundColor: '#e5e7eb', 
              marginTop: '8px',
              marginBottom: '8px'
            }} />
            <p 
              className="vendor-card-bio"
              style={{ 
                fontSize: '13px',
                color: '#717171',
                lineHeight: '18px',
                margin: 0,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                textOverflow: 'ellipsis'
              }}>
              {bioText}
            </p>
          </>
        )}
      </div>
    </div>
  );
});

export default VendorCard;
