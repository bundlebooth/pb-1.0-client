import React, { memo } from 'react';
import VendorCard from './VendorCard';

const VendorGrid = memo(function VendorGrid({ vendors, loading, loadingMore, favorites, onToggleFavorite, onViewVendor, onHighlightVendor }) {
  if (loading && (!vendors || vendors.length === 0)) {
    return (
      <div 
        className="vendor-grid" 
        id="vendor-grid"
      >
        {Array(12).fill(0).map((_, index) => (
          <div 
            key={index} 
            className="vendor-card-skeleton"
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: 'transparent',
              cursor: 'default'
            }}
          >
            {/* Large image block - 1:1 square aspect ratio to match VendorCard */}
            <div style={{ 
              width: '100%', 
              aspectRatio: '1 / 1',
              background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-shimmer 1.5s infinite',
              borderRadius: '12px',
              marginBottom: '10px'
            }}></div>
            
            {/* Title line */}
            <div style={{
              height: '16px',
              width: '80%',
              background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-shimmer 1.5s infinite',
              borderRadius: '4px',
              marginBottom: '8px'
            }}></div>
            
            {/* Subtitle line */}
            <div style={{
              height: '14px',
              width: '60%',
              background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-shimmer 1.5s infinite',
              borderRadius: '4px',
              marginBottom: '6px'
            }}></div>
            
            {/* Small info line */}
            <div style={{
              height: '12px',
              width: '40%',
              background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-shimmer 1.5s infinite',
              borderRadius: '4px'
            }}></div>
          </div>
        ))}
      </div>
    );
  }

  if (!vendors || vendors.length === 0) {
    return (
      <div className="vendor-grid" id="vendor-grid">
        <div style={{ 
          gridColumn: '1 / -1', 
          textAlign: 'center', 
          padding: '3rem', 
          color: '#6b7280' 
        }}>
          <i className="fas fa-search" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}></i>
          <h3 style={{ marginBottom: '0.5rem' }}>No vendors found</h3>
          <p>Try adjusting your filters or search criteria</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="vendor-grid" 
      id="vendor-grid"
    >
      {vendors.map((vendor) => {
        const vendorId = vendor.VendorProfileID || vendor.id;
        const isFavorite = favorites.includes(vendorId);
        
        return (
          <VendorCard
            key={vendorId}
            vendor={vendor}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            onView={onViewVendor}
            onHighlight={onHighlightVendor}
          />
        );
      })}
      
      {/* Show skeleton cards when loading more */}
      {loadingMore && Array(3).fill(0).map((_, index) => (
        <div 
          key={`loading-${index}`} 
          className="vendor-card-skeleton"
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'transparent',
            cursor: 'default'
          }}
        >
          {/* Image Container */}
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            aspectRatio: '1 / 1', 
            overflow: 'hidden', 
            borderRadius: '12px',
            background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-shimmer 1.5s infinite'
          }}></div>
          
          {/* Card Content */}
          <div style={{ padding: '10px 0 4px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Title line */}
            <div style={{
              height: '20px',
              width: '70%',
              background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-shimmer 1.5s infinite',
              borderRadius: '4px'
            }}></div>
            
            {/* Price/Rating line */}
            <div style={{
              height: '18px',
              width: '100%',
              background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-shimmer 1.5s infinite',
              borderRadius: '4px'
            }}></div>
            
            {/* Location line */}
            <div style={{
              height: '18px',
              width: '50%',
              background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-shimmer 1.5s infinite',
              borderRadius: '4px'
            }}></div>
          </div>
        </div>
      ))}
    </div>
  );
});

export default VendorGrid;
