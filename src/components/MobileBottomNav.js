import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { useTranslation } from '../hooks/useTranslation';
import { ICONS } from '../utils/sidebarIcons';

function MobileBottomNav({ onOpenDashboard, onOpenProfile, onOpenMessages, onOpenMap, onCloseDashboard }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(null);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [vendorLogoUrl, setVendorLogoUrl] = useState(null);
  const [userProfilePic, setUserProfilePic] = useState(null);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef(null);
  
  // Get view mode from localStorage
  const getViewMode = () => {
    const stored = localStorage.getItem('viewMode');
    if (stored === 'vendor' || stored === 'client') return stored;
    return currentUser?.isVendor ? 'vendor' : 'client';
  };
  const [isVendorMode, setIsVendorMode] = useState(getViewMode() === 'vendor');
  
  // Listen for viewModeChanged events
  useEffect(() => {
    const handleViewModeChange = () => {
      setIsVendorMode(getViewMode() === 'vendor');
    };
    window.addEventListener('viewModeChanged', handleViewModeChange);
    return () => window.removeEventListener('viewModeChanged', handleViewModeChange);
  }, []);
  
  // Fetch vendor logo
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const fetchVendorLogo = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/vendors/profile?userId=${currentUser.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          const logoUrl = data.logoUrl || data.LogoURL || data.data?.profile?.LogoURL || data.data?.profile?.logoUrl;
          if (logoUrl) {
            setVendorLogoUrl(logoUrl);
          }
        }
      } catch (error) {
        console.error('Failed to fetch vendor logo:', error);
      }
    };
    
    fetchVendorLogo();
  }, [currentUser?.id]);

  // Fetch user profile picture
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/user-profile`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          const pic = data.profile?.ProfileImageURL || data.user?.ProfileImageURL || 
                      data.ProfilePicture || data.profilePicture;
          if (pic) {
            setUserProfilePic(pic);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [currentUser?.id]);

  // Pages where bottom nav should be visible
  const allowedPaths = ['/', '/explore', '/forum', '/client'];
  const isAllowedPage = allowedPaths.some(path => 
    location.pathname === path || location.pathname.startsWith('/forum') || location.pathname.startsWith('/client')
  );

  // Listen for map open/close events from IndexPage
  useEffect(() => {
    const handleMapOpened = () => {
      setMobileMapOpen(true);
      setActiveTab('map');
    };
    const handleMapClosed = () => {
      setMobileMapOpen(false);
      setActiveTab(null);
    };
    
    window.addEventListener('mobileMapOpened', handleMapOpened);
    window.addEventListener('closeMobileMap', handleMapClosed);
    
    return () => {
      window.removeEventListener('mobileMapOpened', handleMapOpened);
      window.removeEventListener('closeMobileMap', handleMapClosed);
    };
  }, []);

  // Handle scroll to hide/show bottom nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
      
      // Clear existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      
      // Show nav after scroll stops (300ms delay)
      scrollTimeout.current = setTimeout(() => {
        setIsVisible(true);
      }, 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  const isActive = (paths) => {
    if (Array.isArray(paths)) {
      return paths.some(path => location.pathname === path || location.pathname.startsWith(path + '/'));
    }
    return location.pathname === paths || location.pathname.startsWith(paths + '/');
  };

  const handleExploreClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveTab(null);
    setMobileMapOpen(false);
    // Close dashboard if open
    if (onCloseDashboard) onCloseDashboard();
    // Close messaging widget if open
    window.dispatchEvent(new CustomEvent('closeMessagingWidget'));
    // Close mobile map if open
    window.dispatchEvent(new CustomEvent('closeMobileMap'));
    navigate('/');
    // Scroll to top
    window.scrollTo(0, 0);
  };

  const handleForumClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveTab(null);
    setMobileMapOpen(false);
    // Close dashboard if open
    if (onCloseDashboard) onCloseDashboard();
    // Close messaging widget if open
    window.dispatchEvent(new CustomEvent('closeMessagingWidget'));
    // Close mobile map if open
    window.dispatchEvent(new CustomEvent('closeMobileMap'));
    navigate('/forum');
    // Scroll to top
    window.scrollTo(0, 0);
  };

  const handleMessagesClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMobileMapOpen(false);
    // Close dashboard if open
    if (onCloseDashboard) onCloseDashboard();
    // Close mobile map if open
    window.dispatchEvent(new CustomEvent('closeMobileMap'));
    if (currentUser) {
      setActiveTab('messages');
      // Navigate to dedicated messages page
      navigate('/client/messages');
    } else {
      setActiveTab(null);
      if (onOpenProfile) {
        onOpenProfile();
      }
    }
  };

  const handleMapClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Close dashboard if open
    if (onCloseDashboard) onCloseDashboard();
    // Close messaging widget if open
    window.dispatchEvent(new CustomEvent('closeMessagingWidget'));
    
    // If not on home page, navigate to home with map=true param
    if (location.pathname !== '/' && location.pathname !== '/explore') {
      navigate('/?openMap=true');
    } else if (onOpenMap) {
      // Already on home page, just open the map
      onOpenMap();
    }
    setActiveTab('map');
    setMobileMapOpen(true);
  };

  const handleAccountClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMobileMapOpen(false);
    // Close messaging widget if open
    window.dispatchEvent(new CustomEvent('closeMessagingWidget'));
    // Close mobile map if open
    window.dispatchEvent(new CustomEvent('closeMobileMap'));
    if (currentUser) {
      setActiveTab('account');
      // Open the sidebar menu (same as hamburger menu in header)
      window.dispatchEvent(new CustomEvent('openUserSidebar'));
    } else {
      // Close dashboard if somehow open
      if (onCloseDashboard) onCloseDashboard();
      setActiveTab(null);
      if (onOpenProfile) {
        onOpenProfile();
      }
    }
  };

  // Don't render if not on allowed page
  if (!isAllowedPage) {
    return null;
  }

  // Handle bookings click - navigate to dedicated bookings page
  const handleBookingsClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMobileMapOpen(false);
    window.dispatchEvent(new CustomEvent('closeMessagingWidget'));
    window.dispatchEvent(new CustomEvent('closeMobileMap'));
    if (currentUser) {
      setActiveTab('bookings');
      navigate('/client/bookings');
    } else {
      if (onOpenProfile) onOpenProfile();
    }
  };

  // Handle favorites click - navigate to dedicated favorites page
  const handleFavoritesClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMobileMapOpen(false);
    window.dispatchEvent(new CustomEvent('closeMessagingWidget'));
    window.dispatchEvent(new CustomEvent('closeMobileMap'));
    if (currentUser) {
      setActiveTab('favorites');
      navigate('/client/favorites');
    } else {
      if (onOpenProfile) onOpenProfile();
    }
  };

  return (
    <nav className={`mobile-bottom-nav ${isVisible ? 'visible' : 'hidden'}`} onClick={(e) => e.stopPropagation()}>
      {/* Explore */}
      <button 
        type="button"
        className={`mobile-nav-item ${isActive(['/', '/explore']) && !activeTab && !mobileMapOpen ? 'active' : ''}`}
        onClick={handleExploreClick}
      >
        <i className={ICONS.explore}></i>
        <span className="nav-label">{t('nav.explore')}</span>
      </button>
      
      {/* My Bookings */}
      <button 
        type="button"
        className={`mobile-nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
        onClick={handleBookingsClick}
      >
        <i className={ICONS.bookings}></i>
        <span className="nav-label">Bookings</span>
      </button>
      
      {/* Messages */}
      <button 
        type="button"
        className={`mobile-nav-item ${activeTab === 'messages' && !mobileMapOpen ? 'active' : ''}`}
        onClick={handleMessagesClick}
      >
        <i className={ICONS.messages}></i>
        <span className="nav-label">{t('sidebar.messages')}</span>
      </button>
      
      {/* Favorites */}
      <button 
        type="button"
        className={`mobile-nav-item ${activeTab === 'favorites' ? 'active' : ''}`}
        onClick={handleFavoritesClick}
      >
        <i className={ICONS.favorites}></i>
        <span className="nav-label">Favorites</span>
      </button>
      
      {/* Profile - Opens Sidebar */}
      <button 
        type="button"
        className={`mobile-nav-item ${activeTab === 'account' && !mobileMapOpen ? 'active' : ''}`}
        onClick={handleAccountClick}
      >
        {currentUser ? (
          (() => {
            // Only show vendor logo on vendor dashboard pages, never on client/explore/forum pages
            const isOnVendorDashboard = location.pathname === '/dashboard' && 
              (new URLSearchParams(location.search).get('section')?.startsWith('vendor') || 
               ['business-profile', 'analytics', 'vendor-requests', 'vendor-invoices', 'vendor-reviews', 'vendor-settings'].includes(new URLSearchParams(location.search).get('section')));
            const shouldShowVendorLogo = isOnVendorDashboard && vendorLogoUrl;
            const profilePicToShow = shouldShowVendorLogo ? vendorLogoUrl : (userProfilePic || currentUser?.profilePicture || currentUser?.profileImageURL);
            
            return profilePicToShow ? (
              <img
                src={profilePicToShow}
                alt="Profile"
                className="nav-user-avatar-img"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid #e0e0e0'
                }}
              />
            ) : (
              <div className="nav-user-avatar">
                {currentUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            );
          })()
        ) : (
          <i className="fas fa-user"></i>
        )}
        <span className="nav-label">{currentUser ? 'Profile' : t('nav.logIn')}</span>
      </button>
    </nav>
  );
}

export default MobileBottomNav;
