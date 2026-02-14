import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
// Removed skeleton import - using simple loading state
import VendorCard from './VendorCard';

function TrendingVendors({ onViewVendor }) {
  const [trendingVendors, setTrendingVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const carouselRef = React.useRef(null);

  // Track mobile state
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadTrendingVendors();
  }, []);

  const loadTrendingVendors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vendors/trending`);
      if (response.ok) {
        const data = await response.json();
        setTrendingVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Failed to load trending vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      // Mobile: (100vw - 44px) / 2.35 + 10px gap, Desktop: 260px + 16px gap
      const cardWidth = isMobile ? (window.innerWidth - 44) / 2.35 + 10 : 276;
      if (carouselRef.current) {
        carouselRef.current.scrollTo({ left: newIndex * cardWidth, behavior: 'smooth' });
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < trendingVendors.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      // Mobile: (100vw - 44px) / 2.35 + 10px gap, Desktop: 260px + 16px gap
      const cardWidth = isMobile ? (window.innerWidth - 44) / 2.35 + 10 : 276;
      if (carouselRef.current) {
        carouselRef.current.scrollTo({ left: newIndex * cardWidth, behavior: 'smooth' });
      }
    }
  };

  if (!loading && trendingVendors.length === 0) {
    return null;
  }

  return (
    <div id="trending-vendors-section-main" style={{ marginBottom: '3rem', paddingTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h2 
          style={{ 
            color: '#222222', 
            margin: '0', 
            fontSize: '1.375rem', 
            fontWeight: 600,
            letterSpacing: '-0.01em'
          }}
        >
          Trending Vendors
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label="Previous vendors"
            style={{
              width: '32px',
              height: '32px',
              border: '1px solid #DDDDDD',
              borderRadius: '50%',
              background: '#FFFFFF',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: currentIndex === 0 ? 0.3 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              padding: 0
            }}
            onMouseEnter={(e) => {
              if (currentIndex !== 0) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <i className="fas fa-chevron-left" style={{ fontSize: '0.75rem', color: '#222222' }}></i>
          </button>
          <button 
            onClick={handleNext}
            disabled={currentIndex >= trendingVendors.length - 1}
            aria-label="Next vendors"
            style={{
              width: '32px',
              height: '32px',
              border: '1px solid #DDDDDD',
              borderRadius: '50%',
              background: '#FFFFFF',
              cursor: currentIndex >= trendingVendors.length - 1 ? 'not-allowed' : 'pointer',
              opacity: currentIndex >= trendingVendors.length - 1 ? 0.3 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              padding: 0
            }}
            onMouseEnter={(e) => {
              if (currentIndex < trendingVendors.length - 1) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', color: '#222222' }}></i>
          </button>
        </div>
      </div>
      <div style={{ 
        position: 'relative', 
        margin: isMobile ? '0 calc(-1 * (100vw - 100%) / 2)' : '0 -24px',
        width: isMobile ? '100vw' : 'auto'
      }}>
        <div 
          ref={carouselRef}
          style={{ 
            display: 'flex',
            gap: isMobile ? '10px' : '16px',
            overflowX: 'scroll',
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            padding: isMobile ? '0 12px' : '0 24px',
            scrollSnapType: isMobile ? 'x mandatory' : 'none',
            scrollPaddingLeft: isMobile ? '12px' : '0'
          }}
        >
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} style={{ 
                flex: isMobile ? '0 0 calc((100vw - 44px) / 2.35)' : '0 0 auto',
                width: isMobile ? 'calc((100vw - 44px) / 2.35)' : '260px',
                minWidth: isMobile ? 'calc((100vw - 44px) / 2.35)' : '260px',
                background: '#f8f9fa', 
                borderRadius: '12px', 
                padding: '1rem', 
                height: '280px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6c757d',
                scrollSnapAlign: isMobile ? 'start' : 'none'
              }}>
                <i className="fas fa-spinner fa-spin"></i>
                <span style={{ marginLeft: '0.5rem' }}>Loading...</span>
              </div>
            ))
          ) : (
            trendingVendors.map((vendor, index) => {
              // Add analytics badge showing view count - always show views for trending
              const viewCount = vendor.viewCount7Days || vendor.profileViews || vendor.ViewCount7Days || 0;
              let badgeText;
              if (viewCount > 0) {
                badgeText = `${viewCount} view${viewCount !== 1 ? 's' : ''}`;
              } else if (index < 3) {
                badgeText = `#${index + 1} Trending`;
              } else {
                badgeText = 'Trending now';
              }
              const vendorWithBadge = {
                ...vendor,
                analyticsBadge: badgeText
              };
              return (
                <div 
                  key={vendor.VendorProfileID || vendor.id} 
                  style={{ 
                    flex: isMobile ? '0 0 calc((100vw - 44px) / 2.35)' : '0 0 auto', 
                    width: isMobile ? 'calc((100vw - 44px) / 2.35)' : '260px',
                    minWidth: isMobile ? 'calc((100vw - 44px) / 2.35)' : '260px',
                    scrollSnapAlign: isMobile ? 'start' : 'none'
                  }}
                >
                  <VendorCard
                    vendor={vendorWithBadge}
                    isFavorite={false}
                    onToggleFavorite={() => {}}
                    onView={onViewVendor}
                    onHighlight={() => {}}
                    showAnalyticsBadge={true}
                    analyticsBadgeType="trending"
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default TrendingVendors;
