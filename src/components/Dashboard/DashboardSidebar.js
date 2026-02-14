import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

function DashboardSidebar({ menuItems, activeSection, onSectionChange, onLogout, sectionLabel, unified, onMenuToggle, mobileMenuOpen: externalMenuOpen, setMobileMenuOpen: externalSetMenuOpen }) {
  const { currentUser } = useAuth();
  
  // Determine account type display
  const getAccountTypeDisplay = () => {
    if (!currentUser) return 'Client';
    if (currentUser.isVendor) {
      // Could be enhanced to show specific vendor type from profile
      return 'Vendor';
    }
    return 'Client';
  };
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  
  // Use external state if provided, otherwise use internal
  const mobileMenuOpen = externalMenuOpen !== undefined ? externalMenuOpen : internalMenuOpen;
  const setMobileMenuOpen = externalSetMenuOpen || setInternalMenuOpen;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setMobileMenuOpen]);

  // Prevent background scrolling and hide bottom nav when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      // Hide mobile bottom nav
      const bottomNav = document.querySelector('.mobile-bottom-nav');
      if (bottomNav) {
        bottomNav.style.display = 'none';
      }
    } else {
      document.body.style.overflow = '';
      // Show mobile bottom nav again
      const bottomNav = document.querySelector('.mobile-bottom-nav');
      if (bottomNav && window.innerWidth <= 768) {
        bottomNav.style.display = 'flex';
      }
    }
    return () => {
      document.body.style.overflow = '';
      const bottomNav = document.querySelector('.mobile-bottom-nav');
      if (bottomNav && window.innerWidth <= 768) {
        bottomNav.style.display = 'flex';
      }
    };
  }, [mobileMenuOpen]);

  const handleMenuItemClick = (itemId) => {
    onSectionChange(itemId);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  // Mobile hamburger menu view
  if (isMobile) {
    return (
      <>

        {/* Slide-out menu overlay */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1100
            }}
          />
        )}

        {/* Slide-out menu panel */}
        <aside
          className="dashboard-sidebar-mobile"
          style={{
            position: 'fixed',
            top: 0,
            left: mobileMenuOpen ? 0 : '-280px',
            width: '280px',
            height: '100vh',
            background: 'white',
            zIndex: 1101,
            transition: 'left 0.3s ease',
            boxShadow: mobileMenuOpen ? '4px 0 20px rgba(0,0,0,0.15)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}
        >
          {/* Header with user info */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600
              }}>
                {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                  {currentUser?.name || 'User'}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: currentUser?.isVendor ? '#5e72e4' : '#10b981',
                  background: currentUser?.isVendor ? 'rgba(94, 114, 228, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  display: 'inline-block'
                }}>
                  {getAccountTypeDisplay()}
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="modal-close-btn"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '20px',
                color: '#6b7280'
              }}
            >
              ×
            </button>
          </div>

          {/* Menu items */}
          <ul className="dashboard-menu" style={{ padding: '1rem', margin: 0, listStyle: 'none', flex: 1 }}>
            {unified ? (
              menuItems.map((section, idx) => (
                <React.Fragment key={idx}>
                  <li className="menu-heading" style={{
                    margin: '1rem 0 0.5rem',
                    padding: '0 0.5rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {section.section}
                  </li>
                  {section.items.map(item => (
                    <li key={item.id} style={{ marginBottom: '0.25rem' }}>
                      <a 
                        href="#" 
                        className={activeSection === item.id ? 'active' : ''} 
                        onClick={(e) => {
                          e.preventDefault();
                          handleMenuItemClick(item.id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          color: activeSection === item.id ? 'white' : '#4b5563',
                          background: activeSection === item.id ? '#5e72e4' : 'transparent',
                          textDecoration: 'none',
                          fontSize: '0.95rem',
                          fontWeight: activeSection === item.id ? '500' : '400'
                        }}
                      >
                        <i className={`fas ${item.icon}`} style={{ width: '20px', textAlign: 'center' }}></i>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </React.Fragment>
              ))
            ) : (
              <>
                {sectionLabel && (
                  <li className="menu-heading" style={{
                    margin: '1rem 0 0.5rem',
                    padding: '0 0.5rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    textTransform: 'uppercase'
                  }}>
                    {sectionLabel}
                  </li>
                )}
                {menuItems.map(item => (
                  <li key={item.id} style={{ marginBottom: '0.25rem' }}>
                    <a 
                      href="#" 
                      className={activeSection === item.id ? 'active' : ''} 
                      onClick={(e) => {
                        e.preventDefault();
                        handleMenuItemClick(item.id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        color: activeSection === item.id ? 'white' : '#4b5563',
                        background: activeSection === item.id ? '#5e72e4' : 'transparent',
                        textDecoration: 'none',
                        fontSize: '0.95rem'
                      }}
                    >
                      <i className={`fas ${item.icon}`} style={{ width: '20px', textAlign: 'center' }}></i>
                      {item.label}
                    </a>
                  </li>
                ))}
              </>
            )}
            <li style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  onLogout();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: '#ef4444',
                  textDecoration: 'none',
                  fontSize: '0.95rem'
                }}
              >
                <i className="fas fa-sign-out-alt" style={{ width: '20px', textAlign: 'center' }}></i>
                Log Out
              </a>
            </li>
          </ul>
        </aside>
      </>
    );
  }

  // Desktop sidebar view (original)
  return (
    <aside className="dashboard-sidebar">
      <div 
        className="user-profile-section" 
        style={{ 
          padding: '1.25rem 1rem', 
          borderBottom: '1px solid var(--border)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px'
        }}
      >
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '18px',
          fontWeight: 600,
          flexShrink: 0
        }}>
          {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
          <span style={{ 
            fontSize: '15px', 
            fontWeight: 600, 
            color: '#111827',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {currentUser?.name || 'User'}
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: 500,
            color: currentUser?.isVendor ? '#5e72e4' : '#10b981',
            background: currentUser?.isVendor ? 'rgba(94, 114, 228, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            padding: '2px 10px',
            borderRadius: '10px',
            display: 'inline-block',
            width: 'fit-content'
          }}>
            {getAccountTypeDisplay()}
          </span>
        </div>
      </div>
      <ul className="dashboard-menu">
        {unified ? (
          // Unified menu with CLIENT and VENDOR sections
          menuItems.map((section, idx) => (
            <React.Fragment key={idx}>
              <li className="menu-heading">
                {section.section}
              </li>
              {section.items.map(item => (
                <li key={item.id}>
                  <a 
                    href="#" 
                    className={activeSection === item.id ? 'active' : ''} 
                    data-section={item.id}
                    onClick={(e) => {
                      e.preventDefault();
                      onSectionChange(item.id);
                    }}
                  >
                    <i className={`fas ${item.icon}`}></i>
                    {item.label}
                  </a>
                </li>
              ))}
            </React.Fragment>
          ))
        ) : (
          // Single section menu (legacy)
          <>
            {sectionLabel && (
              <li className="menu-heading">
                {sectionLabel}
              </li>
            )}
            {menuItems.map(item => (
              <li key={item.id}>
                <a 
                  href="#" 
                  className={activeSection === item.id ? 'active' : ''} 
                  data-section={item.id}
                  onClick={(e) => {
                    e.preventDefault();
                    onSectionChange(item.id);
                  }}
                >
                  <i className={`fas ${item.icon}`}></i>
                  {item.label}
                </a>
              </li>
            ))}
          </>
        )}
        <li>
          <a 
            href="#" 
            id="logout-dashboard"
            onClick={(e) => {
              e.preventDefault();
              onLogout();
            }}
          >
            <i className="fas fa-sign-out-alt"></i>
            Log Out
          </a>
        </li>
      </ul>
    </aside>
  );
}

export default DashboardSidebar;
