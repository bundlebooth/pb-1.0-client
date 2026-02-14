import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import VendorCard from './VendorCard';
import UniversalModal from './UniversalModal';
import { useVendorOnlineStatus } from '../hooks/useOnlineStatus';
import '../styles/VendorSection.css';

/**
 * VendorSection Component
 * Displays a horizontal scrollable section of vendor cards
 * Similar to Airbnb's grouped listings
 */
function VendorSection({ 
  title, 
  description, 
  vendors, 
  favorites = [], 
  onToggleFavorite, 
  onViewVendor, 
  onHighlightVendor,
  icon = null,
  showViewCount = false,
  showResponseTime = false,
  showAnalyticsBadge = false,
  analyticsBadgeType = null,
  sectionType = null,
  cityFilter = null,
  categoryFilter = null
}) {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileScrollState, setMobileScrollState] = useState({ canScrollLeft: false, canScrollRight: true });

  // Track mobile state
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track scroll position for mobile nav buttons
  useEffect(() => {
    if (!isMobile || !scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const handleScroll = () => {
      const canScrollLeft = container.scrollLeft > 10;
      const canScrollRight = container.scrollLeft < (container.scrollWidth - container.clientWidth - 10);
      setMobileScrollState({ canScrollLeft, canScrollRight });
    };
    
    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Memoize vendors length to avoid unnecessary re-renders
  const vendorsLength = vendors?.length || 0;

  const calculateVisibleCount = useCallback(() => {
    if (!scrollContainerRef.current) return 8;
    const containerWidth = scrollContainerRef.current.offsetWidth;
    
    // On mobile (768px or less), show all vendors (mobile uses horizontal scroll)
    if (window.innerWidth <= 768) {
      return vendors?.length || 8;
    }
    
    // Desktop: Calculate how many 220px cards fit without being cut off
    const cardWidth = 220;
    const gap = 16;
    // Calculate how many complete cards fit
    const count = Math.floor((containerWidth + gap) / (cardWidth + gap));
    return Math.max(1, Math.min(count, 8)); // Cap at 8 cards max like Airbnb
  }, [vendors?.length]);

  // Update visible count on mount and resize
  useEffect(() => {
    // Small delay to ensure container is rendered
    const timer = setTimeout(() => {
      const count = calculateVisibleCount();
      setVisibleCount(count);
    }, 50);
    
    const handleResize = () => {
      const newCount = calculateVisibleCount();
      setVisibleCount(newCount);
      // Reset currentIndex if it would cause empty space
      setCurrentIndex(prev => {
        const maxIdx = Math.max(0, (vendors?.length || 0) - newCount);
        return Math.min(prev, maxIdx);
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateVisibleCount, vendors?.length]); // Re-run when vendors change
  
  // Compute scroll button states directly (no useEffect needed)
  // maxIndex ensures we stop when the last card is fully visible (no empty space)
  const maxIndex = Math.max(0, vendorsLength - visibleCount);
  
  // Clamp currentIndex to maxIndex to prevent empty space when vendors/visibleCount changes
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [currentIndex, maxIndex]);
  
  // Use clamped value for display
  const displayIndex = Math.min(currentIndex, maxIndex);
  
  const computedCanScrollLeft = displayIndex > 0;
  const computedCanScrollRight = displayIndex < maxIndex;

  const scroll = (direction) => {
    // On mobile, scroll by one card width (matches CSS: 44vw + 8px gap)
    if (isMobile && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      // Card width: 44vw + 8px gap
      const cardWidth = (window.innerWidth * 0.44) + 8;
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      return;
    }
    
    // Desktop: scroll by ONE card at a time with smooth animation
    const maxIdx = Math.max(0, vendors.length - visibleCount);
    
    if (direction === 'left') {
      setCurrentIndex(prev => Math.max(0, prev - 1));
    } else {
      setCurrentIndex(prev => Math.min(maxIdx, prev + 1));
    }
  };

  // Get icon and color based on section title if not provided
  const getIconConfig = () => {
    if (icon) return { icon, color: '#FF385C' };
    
    const titleLower = title.toLowerCase();
    if (titleLower.includes('trending')) return { icon: 'fa-arrow-trend-up', color: '#FF385C' };
    if (titleLower.includes('top rated') || titleLower.includes('rated')) return { icon: 'fa-star', color: '#FFB400' };
    if (titleLower.includes('responsive')) return { icon: 'fa-bolt', color: '#00A699' };
    if (titleLower.includes('reviewed') || titleLower.includes('review')) return { icon: 'fa-comment-dots', color: '#5E72E4' };
    if (titleLower.includes('near') || titleLower.includes('nearby')) return { icon: 'fa-location-dot', color: '#8B5CF6' };
    if (titleLower.includes('premium')) return { icon: 'fa-crown', color: '#F59E0B' };
    if (titleLower.includes('booked') || titleLower.includes('popular')) return { icon: 'fa-heart', color: '#EC4899' };
    if (titleLower.includes('new') || titleLower.includes('added')) return { icon: 'fa-sparkles', color: '#10B981' };
    if (titleLower.includes('recommended')) return { icon: 'fa-thumbs-up', color: '#3B82F6' };
    return { icon: 'fa-store', color: '#6366F1' };
  };

  const iconConfig = getIconConfig();

  // Memoize vendor IDs to prevent infinite loop in useVendorOnlineStatus
  const vendorIds = useMemo(() => {
    return vendors?.map(v => v.vendorProfileId || v.VendorProfileID || v.id).filter(Boolean) || [];
  }, [vendors]);
  
  const { statuses: onlineStatuses } = useVendorOnlineStatus(vendorIds, { 
    enabled: vendorIds.length > 0, 
    refreshInterval: 300000 // 5 minutes for landing page
  });

  if (!vendors || vendors.length === 0) {
    return null;
  }

  return (
    <>
      <div className="vendor-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
        <div className="vendor-section-header" style={{ width: '100%', maxWidth: '100%' }}>
          <div className="vendor-section-title-wrapper">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 className="vendor-section-title" style={{ margin: 0 }}>
                <span className="vendor-section-icon" style={{ backgroundColor: `${iconConfig.color}15`, color: iconConfig.color }}>
                  <i className={`fas ${iconConfig.icon}`}></i>
                </span>
                {title}
              </h2>
              {description && (
                <p className="vendor-section-description" style={{ margin: 0 }}>{description}</p>
              )}
            </div>
          </div>
          <div className="vendor-section-controls">
            <button 
              className="vendor-section-show-all"
              onClick={() => {
                // Determine the discovery type from title or sectionType
                const titleLower = title.toLowerCase();
                let discoveryType = sectionType;
                
                // Check if this is a city-based section (starts with 'city-')
                const isCitySection = sectionType && sectionType.startsWith('city-');
                
                if (!discoveryType || isCitySection) {
                  if (titleLower.includes('trending')) discoveryType = 'trending';
                  else if (titleLower.includes('top rated') || titleLower.includes('rated')) discoveryType = 'top-rated';
                  else if (titleLower.includes('responsive') || titleLower.includes('quick')) discoveryType = 'most-responsive';
                  else if (titleLower.includes('reviewed') || titleLower.includes('review')) discoveryType = 'recently-reviewed';
                  else if (titleLower.includes('near') || titleLower.includes('nearby')) discoveryType = 'nearby';
                  else if (titleLower.includes('premium')) discoveryType = 'premium';
                  else if (titleLower.includes('booked') || titleLower.includes('popular')) discoveryType = 'popular';
                  else if (titleLower.includes('new') || titleLower.includes('added')) discoveryType = 'new';
                  else if (titleLower.includes('recommended')) discoveryType = 'recommended';
                  else if (titleLower.includes('budget') || titleLower.includes('affordable')) discoveryType = 'budget-friendly';
                  else if (isCitySection) discoveryType = null; // Clear for city sections
                }
                
                // Build URL with discovery type as primary, city/category as query params
                let browseUrl = '/browse/';
                const queryParams = new URLSearchParams();
                
                if (discoveryType && !isCitySection) {
                  // Discovery-focused URL: /browse/trending?city=Toronto&category=photo
                  browseUrl += discoveryType;
                  if (cityFilter) {
                    queryParams.set('city', cityFilter);
                  }
                  if (categoryFilter && categoryFilter !== 'all') {
                    queryParams.set('category', categoryFilter);
                  }
                } else if (cityFilter) {
                  // City-focused URL: /browse/Toronto
                  browseUrl += encodeURIComponent(cityFilter);
                  if (categoryFilter && categoryFilter !== 'all') {
                    browseUrl += '/' + categoryFilter;
                  }
                } else if (categoryFilter && categoryFilter !== 'all') {
                  // Category-only URL: /browse/photo
                  browseUrl += categoryFilter;
                } else {
                  // Fallback: show modal for unknown types
                  setShowModal(true);
                  return;
                }
                
                // Append query params if any
                if (queryParams.toString()) {
                  browseUrl += '?' + queryParams.toString();
                }
                
                navigate(browseUrl);
              }}
            >
              Show all
            </button>
{/* Nav buttons for carousel navigation */}
            <div className="vendor-section-nav">
              <button 
                className="vendor-section-nav-btn vendor-section-nav-btn-left"
                onClick={() => scroll('left')}
                disabled={isMobile ? !mobileScrollState.canScrollLeft : currentIndex === 0}
                aria-label="Scroll left"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <button 
                className="vendor-section-nav-btn vendor-section-nav-btn-right"
                onClick={() => scroll('right')}
                disabled={isMobile ? !mobileScrollState.canScrollRight : currentIndex >= maxIndex}
                aria-label="Scroll right"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      
        {/* Carousel with fixed-width cards - LEFT-ALIGNED like Airbnb */}
        <div 
          className="vendor-section-scroll-container"
          ref={scrollContainerRef}
          style={isMobile ? {} : { 
            overflow: 'hidden',
            width: '100%'
          }}
        >
          <div 
            className="vendor-section-carousel"
            style={isMobile ? {} : {
              display: 'flex',
              gap: '16px',
              justifyContent: 'flex-start',
              transform: `translateX(-${displayIndex * (220 + 16)}px)`,
              transition: 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
              width: 'max-content'
            }}
          >
            {/* Desktop: Show all cards with transform animation. Mobile: Show all for horizontal scroll */}
            {vendors.map((vendor) => {
              const vendorId = vendor.vendorProfileId || vendor.VendorProfileID || vendor.id;
              return (
                <div 
                  key={vendorId}
                  style={isMobile ? {} : { 
                    flex: '0 0 220px',
                    width: '220px'
                  }}
                >
                  <VendorCard
                    vendor={vendor}
                    isFavorite={favorites.includes(vendorId)}
                    onToggleFavorite={onToggleFavorite}
                    onView={onViewVendor}
                    onHighlight={onHighlightVendor}
                    showViewCount={showViewCount}
                    showResponseTime={showResponseTime}
                    showAnalyticsBadge={showAnalyticsBadge}
                    analyticsBadgeType={analyticsBadgeType}
                    onlineStatus={onlineStatuses[vendorId]}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal for showing all vendors */}
      <UniversalModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={title}
        size="large"
        showFooter={false}
        icon={<span className="vendor-section-icon" style={{ backgroundColor: `${iconConfig.color}15`, color: iconConfig.color }}><i className={`fas ${iconConfig.icon}`}></i></span>}
      >
        <div className="vendor-section-modal-grid">
          {vendors && vendors.length > 0 ? (
            vendors.map((vendor) => {
              const vendorId = vendor.vendorProfileId || vendor.VendorProfileID || vendor.id;
              if (!vendorId) {
                console.warn('Vendor missing ID:', vendor);
                return null;
              }
              return (
                <VendorCard
                  key={vendorId}
                  vendor={vendor}
                  isFavorite={favorites.includes(vendorId)}
                  onToggleFavorite={onToggleFavorite}
                  onView={(id) => {
                    setShowModal(false);
                    onViewVendor(id);
                  }}
                  onHighlight={onHighlightVendor}
                  showAnalyticsBadge={showAnalyticsBadge}
                  analyticsBadgeType={analyticsBadgeType}
                  onlineStatus={onlineStatuses[vendorId]}
                />
              );
            })
          ) : (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '3rem',
              color: '#6b7280'
            }}>
              <i className="fas fa-search" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}></i>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No vendors found</div>
              <div style={{ fontSize: '0.9rem' }}>Try adjusting your filters or check back later</div>
            </div>
          )}
        </div>
      </UniversalModal>
    </>
  );
}

export default VendorSection;
