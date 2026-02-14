import React from 'react';

/**
 * Skeleton loader component for consistent loading states across the app
 * Replaces the blue spiral loader with modern skeleton placeholders
 */
function SkeletonLoader({ variant = 'card', count = 1, height = null, width = null }) {
  const skeletonStyle = {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-loading 1.5s ease-in-out infinite',
    borderRadius: '8px'
  };

  // Inject keyframes if not already present
  React.useEffect(() => {
    if (!document.getElementById('skeleton-keyframes')) {
      const style = document.createElement('style');
      style.id = 'skeleton-keyframes';
      style.textContent = `
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Vendor card skeleton
  if (variant === 'vendor-card') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ ...skeletonStyle, height: '200px', width: '100%' }}></div>
            <div style={{ ...skeletonStyle, height: '24px', width: '70%' }}></div>
            <div style={{ ...skeletonStyle, height: '16px', width: '50%' }}></div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ ...skeletonStyle, height: '20px', width: '60px' }}></div>
              <div style={{ ...skeletonStyle, height: '20px', width: '80px' }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Service card skeleton
  if (variant === 'service-card') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            gap: '1rem'
          }}>
            <div style={{ ...skeletonStyle, height: '60px', width: '60px', flexShrink: 0 }}></div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ ...skeletonStyle, height: '24px', width: '60%' }}></div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ ...skeletonStyle, height: '16px', width: '80px' }}></div>
                <div style={{ ...skeletonStyle, height: '16px', width: '60px' }}></div>
              </div>
              <div style={{ ...skeletonStyle, height: '16px', width: '100%' }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Table row skeleton
  if (variant === 'table-row') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <tr key={i}>
            <td><div style={{ ...skeletonStyle, height: '20px', width: '100%' }}></div></td>
            <td><div style={{ ...skeletonStyle, height: '20px', width: '100%' }}></div></td>
            <td><div style={{ ...skeletonStyle, height: '20px', width: '100%' }}></div></td>
            <td><div style={{ ...skeletonStyle, height: '20px', width: '100%' }}></div></td>
          </tr>
        ))}
      </>
    );
  }

  // List item skeleton
  if (variant === 'list-item') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            display: 'flex',
            gap: '1rem',
            padding: '1rem',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}>
            <div style={{ ...skeletonStyle, height: '48px', width: '48px', borderRadius: '50%', flexShrink: 0 }}></div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
              <div style={{ ...skeletonStyle, height: '18px', width: '70%' }}></div>
              <div style={{ ...skeletonStyle, height: '14px', width: '50%' }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Text skeleton
  if (variant === 'text') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ ...skeletonStyle, height: height || '16px', width: width || '100%' }}></div>
        ))}
      </div>
    );
  }

  // Chart/Graph skeleton
  if (variant === 'chart') {
    return (
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ ...skeletonStyle, height: '24px', width: '40%' }}></div>
        <div style={{ ...skeletonStyle, height: height || '300px', width: '100%' }}></div>
      </div>
    );
  }

  // Mobile vendor profile skeleton - exact match to reference image
  if (variant === 'mobile-profile') {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        background: '#fff',
        position: 'relative'
      }}>
        {/* Back button - white circle with arrow */}
        <div style={{ 
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 10,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <i className="fas fa-arrow-left" style={{ color: '#222', fontSize: '14px' }}></i>
        </div>
        
        {/* Gray image area - approximately 47% of viewport height */}
        <div style={{ 
          height: '47vh', 
          width: '100%', 
          background: '#e8e8e8'
        }}></div>
        
        {/* White content area with skeleton bars */}
        <div style={{ 
          flex: 1,
          background: '#fff',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* First bar - widest, rounded ends */}
          <div style={{ 
            height: '20px', 
            width: '90%', 
            maxWidth: '340px',
            background: '#e8e8e8',
            borderRadius: '10px'
          }}></div>
          
          {/* Second bar - medium width */}
          <div style={{ 
            height: '16px', 
            width: '75%', 
            maxWidth: '280px',
            background: '#e8e8e8',
            borderRadius: '8px'
          }}></div>
          
          {/* Third bar - shortest */}
          <div style={{ 
            height: '14px', 
            width: '55%', 
            maxWidth: '200px',
            background: '#e8e8e8',
            borderRadius: '7px'
          }}></div>
        </div>
      </div>
    );
  }

  // Default card skeleton
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          ...skeletonStyle,
          height: height || '100px',
          width: width || '100%'
        }}></div>
      ))}
    </div>
  );
}

export default SkeletonLoader;
