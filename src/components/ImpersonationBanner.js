import React, { useEffect } from 'react';

/**
 * ImpersonationBanner - Shows when admin is impersonating a user
 * Displays at the top of the page with option to end impersonation
 */
function ImpersonationBanner() {
  const isImpersonating = localStorage.getItem('isImpersonating') === 'true';
  
  // Add padding to body when impersonation banner is shown so header is visible
  useEffect(() => {
    if (isImpersonating) {
      document.body.style.paddingTop = '52px';
    }
    return () => {
      document.body.style.paddingTop = '';
    };
  }, [isImpersonating]);
  
  if (!isImpersonating) return null;

  const handleEndImpersonation = () => {
    // Restore original admin token
    const originalToken = localStorage.getItem('originalToken');
    if (originalToken) {
      localStorage.setItem('token', originalToken);
      localStorage.removeItem('originalToken');
    }
    
    // Restore original admin user session
    const originalUserSession = localStorage.getItem('originalUserSession');
    if (originalUserSession) {
      localStorage.setItem('userSession', originalUserSession);
      localStorage.removeItem('originalUserSession');
    }
    
    // Clear impersonation flag
    localStorage.removeItem('isImpersonating');
    
    // Redirect back to admin support page
    window.location.href = '/admin/support';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'linear-gradient(90deg, #f59e0b, #d97706)',
      color: 'white',
      padding: '0.75rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <i className="fas fa-user-secret" style={{ fontSize: '1.25rem' }}></i>
      <span style={{ fontWeight: 600 }}>
        You are currently impersonating a user. All actions are being logged.
      </span>
      <button
        onClick={handleEndImpersonation}
        style={{
          background: 'white',
          color: '#d97706',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '6px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <i className="fas fa-sign-out-alt"></i>
        End Impersonation
      </button>
    </div>
  );
}

export default ImpersonationBanner;
