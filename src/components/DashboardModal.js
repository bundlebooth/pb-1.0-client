import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import UnifiedDashboard from './Dashboard/UnifiedDashboard';
import Header from './Header';

function DashboardModal({ isOpen, onClose, initialSection = 'dashboard' }) {
  const { currentUser, logout } = useAuth();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isVendor = currentUser?.userType === 'vendor' || currentUser?.isVendor;

  // Get section title for header
  const getSectionTitle = () => {
    const sectionTitles = {
      'dashboard': 'Dashboard',
      'bookings': 'Bookings',
      'invoices': 'Invoices',
      'favorites': 'Favorites',
      'messages': 'Messages',
      'reviews': 'Reviews',
      'settings': 'Settings',
      'vendor-dashboard': 'Vendor Dashboard',
      'vendor-requests': 'Booking Requests',
      'vendor-invoices': 'Invoices',
      'vendor-business-profile': 'Business Profile',
      'vendor-messages': 'Messages',
      'vendor-reviews': 'Reviews',
      'vendor-analytics': 'Analytics'
    };
    return sectionTitles[activeSection] || 'Dashboard';
  };

  // Handle resize for mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset section when user changes
  useEffect(() => {
    if (currentUser) {
      const defaultSection = currentUser.isVendor || currentUser.userType === 'vendor' 
        ? 'vendor-dashboard' 
        : 'dashboard';
      setActiveSection(defaultSection);
    }
  }, [currentUser?.id, currentUser?.vendorProfileId]);

  useEffect(() => {
    if (isOpen) {
      setActiveSection(initialSection);
      document.body.classList.add('modal-open');
      
      // CRITICAL: Hide categories nav when modal is open to prevent overlap
      const categoriesNav = document.querySelector('.categories-nav');
      if (categoriesNav) {
        categoriesNav.style.display = 'none';
      }
    } else {
      document.body.classList.remove('modal-open');
      
      // Show categories nav when modal closes
      const categoriesNav = document.querySelector('.categories-nav');
      if (categoriesNav) {
        categoriesNav.style.display = 'flex';
      }
    }
    
    return () => {
      document.body.classList.remove('modal-open');
      const categoriesNav = document.querySelector('.categories-nav');
      if (categoriesNav) {
        categoriesNav.style.display = 'flex';
      }
    };
  }, [isOpen, initialSection]);

  const handleSectionChange = useCallback((section) => {
    setActiveSection(section);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    onClose();
  }, [logout, onClose]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen || !currentUser) return null;

  // Mobile full-screen page layout (not a modal - treated as a page like Forum)
  if (isMobile) {
    return (
      <div 
        id="dashboard-page" 
        className="dashboard-mobile-page"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          background: 'white',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Header 
          onSearch={() => {}} 
          onProfileClick={() => {}} 
          onWishlistClick={() => {}} 
          onChatClick={() => {}} 
          onNotificationsClick={() => {}} 
        />
        {/* Mobile Menu Bar - Below Header */}
        <div className="mobile-menu-bar" style={{
          display: 'none',
          alignItems: 'center',
          padding: '8px 16px',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151'
            }}
          >
            <i className="fas fa-bars" style={{ fontSize: '14px' }}></i>
            <span>{getSectionTitle()}</span>
          </button>
        </div>
        <div 
          style={{ 
            padding: 0, 
            overflow: 'auto', 
            flexGrow: 1,
            background: '#f9fafb'
          }}
        >
          <UnifiedDashboard 
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            onLogout={handleLogout}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div 
      id="dashboard-modal" 
      className="modal" 
      data-no-outside-close 
      style={{ display: 'flex' }}
      onClick={(e) => {
        if (e.target.id === 'dashboard-modal') {
          // Don't close on outside click due to data-no-outside-close
        }
      }}
    >
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '95%', 
          width: '1200px', 
          height: '90vh', 
          display: 'flex', 
          flexDirection: 'column'
        }}
      >
        <div className="modal-header">
          <h3 id="dashboard-modal-title">Dashboard</h3>
          <span className="close-modal" onClick={handleClose}>×</span>
        </div>
        <div 
          className="modal-body" 
          style={{ 
            padding: 0, 
            overflow: 'hidden', 
            flexGrow: 1 
          }}
        >
          <UnifiedDashboard 
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </div>
  );
}

export default DashboardModal;
