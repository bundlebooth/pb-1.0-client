import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';

function AnnouncementDisplay() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    const saved = localStorage.getItem('dismissedAnnouncements');
    return saved ? JSON.parse(saved) : [];
  });
  const [showPopup, setShowPopup] = useState(null);

  // Load announcements
  const loadAnnouncements = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/public/announcements`);
      if (response.ok) {
        const data = await response.json();
        const activeAnnouncements = (data.announcements || []).filter(
          a => !dismissedIds.includes(a.AnnouncementID)
        );
        setAnnouncements(activeAnnouncements);
        
        // Show popup if there's a popup type announcement
        const popupAnnouncement = activeAnnouncements.find(a => a.DisplayType === 'popup');
        if (popupAnnouncement && !dismissedIds.includes(popupAnnouncement.AnnouncementID)) {
          setShowPopup(popupAnnouncement);
        }
      }
    } catch (error) {
      console.error('Failed to load announcements:', error);
    }
  }, [dismissedIds]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // Prevent background scrolling when popup is open
  useEffect(() => {
    if (showPopup) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showPopup]);

  // Dismiss announcement
  const dismissAnnouncement = async (id, isDismissible) => {
    if (!isDismissible) return;
    
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
    setAnnouncements(prev => prev.filter(a => a.AnnouncementID !== id));
    
    if (showPopup?.AnnouncementID === id) {
      setShowPopup(null);
    }
    
    // Log dismiss to backend
    try {
      await fetch(`${API_BASE_URL}/public/announcements/${id}/dismiss`, { method: 'POST' });
    } catch (e) { /* ignore */ }
  };

  // Get type styles
  const getTypeStyles = (type) => {
    switch (type) {
      case 'warning':
        return { bg: '#fff3cd', border: '#ffc107', text: '#856404', icon: '⚠️' };
      case 'success':
        return { bg: '#d4edda', border: '#28a745', text: '#155724', icon: '✅' };
      case 'promo':
        return { bg: '#e7f1ff', border: '#5e72e4', text: '#1a365d', icon: '🎉' };
      case 'news':
        return { bg: '#f0f4ff', border: '#667eea', text: '#3c366b', icon: '📰' };
      default: // info
        return { bg: '#cce5ff', border: '#004085', text: '#004085', icon: 'ℹ️' };
    }
  };

  // Banner announcements
  const bannerAnnouncements = announcements.filter(a => a.DisplayType === 'banner');
  
  // Toast announcements
  const toastAnnouncements = announcements.filter(a => a.DisplayType === 'toast');

  return (
    <>
      {/* Banner Announcements - Top of page, left-aligned, non-dismissible */}
      {bannerAnnouncements.map(announcement => {
        return (
          <div
            key={announcement.AnnouncementID}
            style={{
              background: '#5e72e4',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '12px',
              position: 'relative',
              color: 'white',
              width: '100%'
            }}
          >
            <span style={{ fontSize: '16px' }}>📢</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <strong style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>{announcement.Title}</strong>
              {announcement.Content && (
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>
                  — {announcement.Content}
                </span>
              )}
              {announcement.LinkURL && (
                <a
                  href={announcement.LinkURL}
                  style={{
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '13px',
                    textDecoration: 'underline',
                    marginLeft: '8px'
                  }}
                >
                  {announcement.LinkText || 'Learn More'}
                </a>
              )}
            </div>
            {/* Banners are NOT dismissible - removed close button */}
          </div>
        );
      })}

      {/* Popup Modal */}
      {showPopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={() => showPopup.IsDismissible && dismissAnnouncement(showPopup.AnnouncementID, true)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              animation: 'popupSlideIn 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popup Header - Blue Theme */}
            <div style={{
              background: '#5e72e4',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'white'
            }}>
              <span style={{ fontSize: '32px' }}>{getTypeStyles(showPopup.Type).icon}</span>
              <h2 style={{ margin: 0, fontSize: '22px', color: 'white' }}>
                {showPopup.Title}
              </h2>
            </div>
            
            {/* Popup Content */}
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#333', margin: 0 }}>
                {showPopup.Content}
              </p>
              
              {showPopup.LinkURL && (
                <a
                  href={showPopup.LinkURL}
                  style={{
                    display: 'inline-block',
                    marginTop: '16px',
                    background: '#5e72e4',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '15px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#4c5fd7'}
                  onMouseLeave={(e) => e.target.style.background = '#5e72e4'}
                >
                  {showPopup.LinkText || 'Learn More'}
                </a>
              )}
            </div>
            
            {/* Popup Footer */}
            {showPopup.IsDismissible && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', textAlign: 'right' }}>
                <button
                  onClick={() => dismissAnnouncement(showPopup.AnnouncementID, true)}
                  style={{
                    background: '#5e72e4',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#4c5fd7'}
                  onMouseLeave={(e) => e.target.style.background = '#5e72e4'}
                >
                  Got it
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notifications - Bottom right */}
      <div style={{
        position: 'fixed',
        bottom: '100px',
        right: '24px',
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '380px'
      }}>
        {toastAnnouncements.map(announcement => {
          return (
            <div
              key={announcement.AnnouncementID}
              style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(94, 114, 228, 0.25)',
                overflow: 'hidden',
                animation: 'toastSlideIn 0.3s ease',
                borderLeft: '4px solid #5e72e4'
              }}
            >
              <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px' }}>📢</span>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600, color: '#222' }}>
                    {announcement.Title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
                    {announcement.Content}
                  </p>
                  {announcement.LinkURL && (
                    <a
                      href={announcement.LinkURL}
                      style={{
                        display: 'inline-block',
                        marginTop: '8px',
                        color: '#5e72e4',
                        fontSize: '13px',
                        fontWeight: 600,
                        textDecoration: 'none'
                      }}
                    >
                      {announcement.LinkText || 'Learn More'} →
                    </a>
                  )}
                </div>
                {announcement.IsDismissible && (
                  <button
                    onClick={() => dismissAnnouncement(announcement.AnnouncementID, true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#999',
                      fontSize: '18px',
                      cursor: 'pointer',
                      padding: '0',
                      lineHeight: 1
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes popupSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

export default AnnouncementDisplay;
