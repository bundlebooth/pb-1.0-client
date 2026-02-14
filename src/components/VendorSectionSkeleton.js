import React, { useState, useEffect, useRef } from 'react';
import '../styles/VendorSection.css';

/**
 * VendorSectionSkeleton Component
 * Loading skeleton for VendorSection while data is being fetched
 */
function VendorSectionSkeleton() {
  const containerRef = useRef(null);
  const [cardCount, setCardCount] = useState(4);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const calculateCardCount = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      if (mobile) {
        setCardCount(2); // Show 2 cards on mobile
        return;
      }
      
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const cardWidth = 220; // Match actual card width
      const gap = 16; // Match actual gap
      const count = Math.floor(containerWidth / (cardWidth + gap));
      setCardCount(Math.max(1, Math.min(count, 8))); // Between 1 and 8 cards
    };

    calculateCardCount();
    window.addEventListener('resize', calculateCardCount);
    return () => window.removeEventListener('resize', calculateCardCount);
  }, []);

  // Mobile skeleton card component
  const MobileSkeletonCard = () => (
    <div style={{
      flex: '0 0 calc((100vw - 2rem - 12px) / 2.15)',
      width: 'calc((100vw - 2rem - 12px) / 2.15)',
      minWidth: 'calc((100vw - 2rem - 12px) / 2.15)'
    }}>
      <div className="skeleton" style={{ 
        aspectRatio: '1 / 1',
        width: '100%',
        borderRadius: '12px',
        marginBottom: '8px'
      }}></div>
      <div className="skeleton" style={{ 
        height: '14px', 
        width: '90%', 
        borderRadius: '6px',
        marginBottom: '6px'
      }}></div>
      <div className="skeleton" style={{ 
        height: '12px', 
        width: '70%', 
        borderRadius: '6px',
        marginBottom: '6px'
      }}></div>
      <div className="skeleton" style={{ 
        height: '12px', 
        width: '50%', 
        borderRadius: '6px'
      }}></div>
    </div>
  );

  return (
    <div className="vendor-section" ref={containerRef}>
      <div className="vendor-section-header">
        <div className="vendor-section-title-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Title skeleton */}
            <div className="skeleton" style={{ 
              height: isMobile ? '20px' : '24px', 
              width: isMobile ? '140px' : '200px', 
              borderRadius: '6px' 
            }}></div>
          </div>
          {/* Description skeleton - below title on mobile */}
          {!isMobile && (
            <div className="skeleton" style={{ 
              height: '16px', 
              width: '250px', 
              borderRadius: '6px',
              marginTop: '4px'
            }}></div>
          )}
        </div>
        <div className="vendor-section-controls">
          {/* Show all button skeleton */}
          <div className="skeleton" style={{ 
            height: isMobile ? '20px' : '28px', 
            width: isMobile ? '80px' : '100px', 
            borderRadius: '6px' 
          }}></div>
          {/* Nav buttons skeleton - hide on mobile */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="skeleton" style={{ 
                height: '26px', 
                width: '26px', 
                borderRadius: '50%' 
              }}></div>
              <div className="skeleton" style={{ 
                height: '26px', 
                width: '26px', 
                borderRadius: '50%' 
              }}></div>
            </div>
          )}
        </div>
      </div>
    
      {isMobile ? (
        /* Mobile: Horizontal scrolling carousel skeleton */
        <div className="vendor-section-scroll-container" style={{ overflowX: 'hidden' }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            paddingLeft: '1rem',
            paddingRight: '1rem'
          }}>
            <MobileSkeletonCard />
            <MobileSkeletonCard />
            <MobileSkeletonCard />
          </div>
        </div>
      ) : (
        /* Desktop: Grid skeleton */
        <div className="vendor-section-scroll-container">
          <div className="vendor-section-grid">
            {Array.from({ length: cardCount }, (_, i) => i + 1).map((i) => (
              <div key={i} className="vendor-section-card-wrapper">
                <div style={{
                  backgroundColor: 'transparent',
                  overflow: 'hidden'
                }}>
                  <div className="skeleton" style={{ 
                    height: '180px', 
                    width: '100%',
                    borderRadius: '12px',
                    marginBottom: '12px'
                  }}></div>
                  <div style={{ padding: '0' }}>
                    <div className="skeleton" style={{ 
                      height: '16px', 
                      width: '85%', 
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}></div>
                    <div className="skeleton" style={{ 
                      height: '16px', 
                      width: '65%', 
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}></div>
                    <div className="skeleton" style={{ 
                      height: '16px', 
                      width: '45%', 
                      borderRadius: '8px'
                    }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorSectionSkeleton;
