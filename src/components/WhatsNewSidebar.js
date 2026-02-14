import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { formatTimeAgo } from '../utils/helpers';

function WhatsNewSidebar({ isOpen, onClose }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      // Use /all endpoint to show all announcements including upcoming ones
      const url = `${API_BASE_URL}/public/announcements/all`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadAnnouncements();
    }
  }, [isOpen, loadAnnouncements]);

  const getTypeStyles = (type) => {
    switch (type) {
      case 'warning': return { bg: '#fff3cd', border: '#ffc107', icon: '⚠️' };
      case 'success': return { bg: '#d4edda', border: '#28a745', icon: '✅' };
      case 'promo': return { bg: '#e7f1ff', border: '#5e72e4', icon: '🎉' };
      case 'news': return { bg: '#f0f4ff', border: '#667eea', icon: '📰' };
      default: return { bg: '#cce5ff', border: '#004085', icon: 'ℹ️' };
    }
  };

  const formatDate = formatTimeAgo;

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease'
        }}
      />
      
      {/* Sidebar */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '400px',
        maxWidth: '100vw',
        height: '100vh',
        background: 'white',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.3s ease'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#5e72e4',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>📢</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>What's New</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>
                Latest updates & announcements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #f0f0f0',
                borderTop: '3px solid #5e72e4',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p style={{ color: '#666', fontSize: '14px' }}>Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📭</span>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#5e72e4' }}>No Announcements</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                Check back later for updates and news!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {announcements.map(announcement => {
                const styles = getTypeStyles(announcement.Type);
                const isUpcoming = announcement.StartDate && new Date(announcement.StartDate) > new Date();
                return (
                  <div
                    key={announcement.AnnouncementID}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      border: '1px solid #e0e0e0',
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                      opacity: isUpcoming ? 0.8 : 1
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Type indicator bar */}
                    <div style={{
                      height: '4px',
                      background: styles.border
                    }} />
                    
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>{styles.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                color: styles.border,
                                letterSpacing: '0.5px'
                              }}>
                                {announcement.Type || 'Info'}
                              </span>
                              {isUpcoming && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  background: '#fff3cd',
                                  color: '#856404',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  Starts {new Date(announcement.StartDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '12px', color: '#999' }}>
                              {formatDate(announcement.CreatedAt)}
                            </span>
                          </div>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#222' }}>
                            {announcement.Title}
                          </h4>
                          <p style={{ margin: 0, fontSize: '14px', color: '#555', lineHeight: '1.5' }}>
                            {announcement.Content}
                          </p>
                          {announcement.LinkURL && (
                            <a
                              href={announcement.LinkURL}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '12px',
                                color: '#5e72e4',
                                fontSize: '14px',
                                fontWeight: 600,
                                textDecoration: 'none'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {announcement.LinkText || 'Learn More'}
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12H19M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e0e0e0',
          background: '#f9f9f9',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export default WhatsNewSidebar;
