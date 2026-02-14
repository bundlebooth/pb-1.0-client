import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../utils/api';
// NotificationDropdown removed - notifications now in sidebar
import EnhancedSearchBar from './EnhancedSearchBar';
// WhatsNewSidebar removed - now integrated into ProfileSidebar
import ProfileSidebar from './ProfileSidebar';
import { getUnreadNotificationCount, updatePageTitle } from '../utils/notifications';
import { buildBecomeVendorUrl } from '../utils/urlHelpers';
import { useTranslation } from '../hooks/useTranslation';
import './EnhancedSearchBar.css';

const Header = memo(function Header({ onSearch, onProfileClick, onWishlistClick, onChatClick, onNotificationsClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesBadge, setFavoritesBadge] = useState(0);
  const [messagesBadge, setMessagesBadge] = useState(0);
  const [notificationsBadge, setNotificationsBadge] = useState(0);
  // notificationDropdownOpen removed - notifications now in sidebar
  const [isScrolled, setIsScrolled] = useState(false); // No longer used - kept for compatibility
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null); // 'live', 'submitted', 'incomplete'
  // whatsNewOpen removed - now integrated into ProfileSidebar
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasVendorProfile, setHasVendorProfile] = useState(false);
  const [vendorCheckLoading, setVendorCheckLoading] = useState(true);
  const [vendorLogoUrl, setVendorLogoUrl] = useState(null);
  const [userProfilePic, setUserProfilePic] = useState(null);
  const notificationBtnRef = useRef(null);
  
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

  // Clear any dashboard hash on mount to prevent auto-opening
  useEffect(() => {
    if (window.location.hash === '#dashboard') {
      window.history.replaceState(null, null, window.location.pathname);
    }

    // Listen for custom dashboard open event - now navigates to dashboard page
    const handleOpenDashboard = (event) => {
      if (currentUser) {
        const section = event?.detail?.section;
        if (section) {
          navigate(`/dashboard?section=${section}`);
        } else {
          navigate('/dashboard');
        }
      }
    };

    // Listen for openUserSidebar event from MobileBottomNav
    const handleOpenUserSidebar = () => {
      if (currentUser) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('openDashboard', handleOpenDashboard);
    window.addEventListener('openUserSidebar', handleOpenUserSidebar);
    return () => {
      window.removeEventListener('openDashboard', handleOpenDashboard);
      window.removeEventListener('openUserSidebar', handleOpenUserSidebar);
    };
  }, [currentUser, navigate]);

  // Scroll detection removed - no animation on scroll

  // Check vendor profile completion status
  useEffect(() => {
    if (!currentUser?.isVendor || !currentUser?.id) {
      setProfileIncomplete(false);
      setProfileStatus(null);
      return;
    }

    const checkProfileStatus = async () => {
      try {
        const response = await apiGet(`/vendor/${currentUser.id}/setup-status`);
        
        if (response.ok) {
          const data = await response.json();
          const isComplete = data.allRequiredComplete ?? data?.setupStatus?.allRequiredComplete ?? false;
          const isCompletedFlag = data.isCompletedFlag ?? data?.setupStatus?.isCompletedFlag ?? false;
          const acceptingBookings = data.acceptingBookings ?? data?.setupStatus?.acceptingBookings ?? false;
          
          setProfileIncomplete(!isComplete);
          
          // Determine profile status:
          // - Live: Profile is completed AND accepting bookings (visible to public)
          // - Complete: All required steps done but not yet accepting bookings
          // - Incomplete: Still has required steps to complete
          if (acceptingBookings || isCompletedFlag) {
            setProfileStatus('live');
          } else if (isComplete) {
            setProfileStatus('complete');
          } else {
            setProfileStatus('incomplete');
          }
        }
      } catch (error) {
        console.error('Failed to check profile status:', error);
      }
    };

    checkProfileStatus();
  }, [currentUser]);

  // Check if user has vendor profile - with caching to avoid repeated API calls
  useEffect(() => {
    if (!currentUser?.id) {
      setHasVendorProfile(false);
      setVendorCheckLoading(false);
      return;
    }
    
    const CACHE_KEY = `vendorProfileCache_${currentUser.id}`;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    
    const checkVendorProfile = async () => {
      // Check cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { hasVendor, logoUrl, timestamp } = JSON.parse(cached);
          const isValid = Date.now() - timestamp < CACHE_TTL;
          if (isValid) {
            setHasVendorProfile(hasVendor);
            if (logoUrl) setVendorLogoUrl(logoUrl);
            setVendorCheckLoading(false);
            return;
          }
        }
      } catch (e) {
        // Cache read failed, continue with API call
      }
      
      setVendorCheckLoading(true);
      try {
        const response = await apiGet(`/vendors/profile?userId=${currentUser.id}`);
        if (response.ok) {
          const data = await response.json();
          const hasVendor = !!data.vendorProfileId;
          setHasVendorProfile(hasVendor);
          
          // Get vendor logo URL
          const logoUrl = data.logoUrl || data.LogoURL || data.data?.profile?.LogoURL || data.data?.profile?.logoUrl;
          if (logoUrl) {
            setVendorLogoUrl(logoUrl);
          }
          
          // Cache the result
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              hasVendor,
              logoUrl: logoUrl || null,
              timestamp: Date.now()
            }));
          } catch (e) {
            // Cache write failed, ignore
          }
        }
      } catch (error) {
        console.error('Failed to check vendor profile:', error);
      } finally {
        setVendorCheckLoading(false);
      }
    };
    
    checkVendorProfile();
    
    // Listen for vendor profile changes (e.g., after becoming a vendor)
    const handleVendorProfileChange = () => {
      localStorage.removeItem(CACHE_KEY);
      checkVendorProfile();
    };
    window.addEventListener('vendorProfileChanged', handleVendorProfileChange);
    return () => window.removeEventListener('vendorProfileChanged', handleVendorProfileChange);
  }, [currentUser]);

  // Fetch user profile picture
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const fetchUserProfile = async () => {
      try {
        const response = await apiGet(`/users/${currentUser.id}/user-profile`);
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

  // Load notification badges
  useEffect(() => {
    if (!currentUser?.id) return;

    const loadBadges = async () => {
      try {
        // Load favorites count
        const favResponse = await apiGet(`/favorites/user/${currentUser.id}`);
        if (favResponse.ok) {
          const favData = await favResponse.json();
          setFavoritesBadge(Array.isArray(favData.favorites) ? favData.favorites.length : 0);
        }

        // Load unread messages count
        const msgResponse = await apiGet(`/messages/unread-count/${currentUser.id}`);
        if (msgResponse.ok) {
          const msgData = await msgResponse.json();
          setMessagesBadge(msgData.unreadCount || 0);
        }

        // Load notifications count - try API first, then count from fetched notifications
        let notifCount = await getUnreadNotificationCount(currentUser.id);
        
        // If API returns 0, also try fetching all notifications and counting unread
        if (notifCount === 0) {
          try {
            const notifResponse = await apiGet(`/notifications/user/${currentUser.id}`);
            if (notifResponse.ok) {
              const notifData = await notifResponse.json();
              const notifications = notifData.notifications || [];
              notifCount = notifications.filter(n => !n.IsRead && !n.isRead && !n.read).length;
            }
          } catch (e) {
            console.error('Failed to count notifications:', e);
          }
        }
        
        setNotificationsBadge(notifCount);
        updatePageTitle(notifCount);
      } catch (error) {
        console.error('Failed to load badges:', error);
      }
    };

    loadBadges();
    
    // Refresh badges every 30 seconds
    const interval = setInterval(loadBadges, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Load announcement count
  useEffect(() => {
    const loadAnnouncementCount = async () => {
      try {
        const response = await apiGet('/public/announcements/all');
        if (response.ok) {
          const data = await response.json();
          const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
          const activeCount = (data.announcements || []).filter(a => !dismissed.includes(a.AnnouncementID)).length;
          setAnnouncementCount(activeCount);
        }
      } catch (error) {
        console.error('Failed to load announcement count:', error);
      }
    };

    loadAnnouncementCount();
    // Refresh every 5 minutes
    const interval = setInterval(loadAnnouncementCount, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleNotificationClick = () => {
    // Notifications now handled in sidebar - navigate to dashboard notifications
    if (currentUser) {
      navigate('/dashboard?section=notifications');
    }
    if (onNotificationsClick) {
      onNotificationsClick();
    }
  };

  const handleNotificationDropdownClose = async () => {
    // Notifications now in sidebar - this function kept for compatibility
    // Refresh notification count after closing
    if (currentUser?.id) {
      const notifCount = await getUnreadNotificationCount(currentUser.id);
      setNotificationsBadge(notifCount);
      updatePageTitle(notifCount);
    }
  };

  return (
    <>
    <header className="header">
      <div className="header-inner page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="logo" style={{ cursor: 'pointer', marginRight: '8px' }} onClick={() => window.location.href = '/'}>
          <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" className="header-logo-img" />
        </div>
        
      </div>

      {location.pathname === '/explore' && (
        <div className="search-container" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <EnhancedSearchBar 
            onSearch={onSearch} 
            isScrolled={isScrolled}
          />
        </div>
      )}

      <div className="user-nav">
        {/* Show "Become a Vendor" for non-vendors, "Switch to hosting" for vendors */}
        {currentUser && vendorCheckLoading && (
          <div style={{ marginRight: '0.5rem', display: 'flex', alignItems: 'center' }}>
            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
          </div>
        )}
        {currentUser && !vendorCheckLoading && !hasVendorProfile && (
          <button 
            className="become-vendor-btn"
            onClick={() => {
              const url = buildBecomeVendorUrl({ source: 'header', ref: 'homepage' });
              navigate(url);
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              marginRight: '0.5rem'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f7f7f7'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            {t('footer.becomeVendor')}
          </button>
        )}
        {/* Show Switch to hosting ONLY on explore page (/ or /explore) */}
        {currentUser && !vendorCheckLoading && hasVendorProfile && (location.pathname === '/' || location.pathname === '/explore') && (
          <button 
            className="switch-to-hosting-btn"
            onClick={() => {
              localStorage.setItem('viewMode', 'vendor');
              window.dispatchEvent(new CustomEvent('viewModeChanged', { detail: { mode: 'vendor' } }));
              navigate('/dashboard?section=vendor-dashboard');
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              marginRight: '0.5rem'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f7f7f7'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Switch to hosting
          </button>
        )}
        {/* Show Switch to exploring on dashboard pages */}
        {currentUser && hasVendorProfile && location.pathname.startsWith('/dashboard') && (
          <button 
            className="switch-to-exploring-btn"
            onClick={() => {
              localStorage.setItem('viewMode', 'client');
              window.dispatchEvent(new CustomEvent('viewModeChanged', { detail: { mode: 'client' } }));
              navigate('/');
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              marginRight: '0.5rem'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f7f7f7'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Switch to exploring
          </button>
        )}
        {/* What's New Button removed - now in ProfileSidebar */}
        {/* Heart and Chat icons removed as per user request */}
        {/* Notification bell removed as per user request */}
        {/* User menu button - hamburger + avatar like dashboard - hidden on mobile via CSS */}
        <div
          className="user-menu-button"
          onClick={() => currentUser ? setSidebarOpen(true) : (onProfileClick && onProfileClick())}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '5px 5px 5px 12px',
            border: '1px solid #ddd',
            borderRadius: '24px',
            cursor: 'pointer',
            backgroundColor: 'white',
            transition: 'box-shadow 0.2s',
            position: 'relative',
            height: '42px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
        >
          <i className="fas fa-bars" style={{ fontSize: '14px', color: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px', width: '16px' }}></i>
          {/* Show profile pic based on current page context:
              - On vendor dashboard pages (/dashboard with vendor sections): show vendor logo
              - On all other pages (explore, client, forums, etc.): show client profile pic
              Never show vendor logo on client pages regardless of viewMode */}
          {(() => {
            const isOnVendorDashboard = location.pathname === '/dashboard' && 
              (new URLSearchParams(location.search).get('section')?.startsWith('vendor') || 
               ['business-profile', 'analytics', 'vendor-requests', 'vendor-invoices', 'vendor-reviews', 'vendor-settings'].includes(new URLSearchParams(location.search).get('section')));
            const shouldShowVendorLogo = isOnVendorDashboard && vendorLogoUrl;
            const profilePicToShow = shouldShowVendorLogo ? vendorLogoUrl : (userProfilePic || currentUser?.profilePicture || currentUser?.profileImageURL);
            
            return profilePicToShow ? (
              <img
                src={profilePicToShow}
                alt="Profile"
                style={{
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  objectFit: 'cover',
                  position: 'relative',
                  border: '1px solid #e0e0e0'
                }}
              />
            ) : (
              <div
                style={{
                  backgroundColor: currentUser ? 'var(--primary)' : '#717171',
                  color: 'white',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  position: 'relative'
                }}
              >
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <i className="fas fa-user" style={{ fontSize: '14px' }}></i>}
              </div>
            );
          })()}
          {/* Exclamation mark indicator for incomplete profile - only show if NOT live */}
          {profileIncomplete && profileStatus !== 'live' && (
            <div
              style={{
                position: 'absolute',
                top: '0px',
                right: '0px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
                color: 'white',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
            >
              !
            </div>
          )}
        </div>
      </div>
      </div>

      
      {/* Notification Dropdown removed - notifications now in sidebar */}
    </header>
    
    {/* Airbnb-Style Profile Sidebar */}
    <ProfileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    
    {/* What's New Sidebar removed - now integrated into ProfileSidebar */}
    </>
  );
});

export default Header;
