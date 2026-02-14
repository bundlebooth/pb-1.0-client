import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../utils/api';
import { encodeBookingId } from '../utils/hashIds';
import { PageLayout } from '../components/PageWrapper';
import Header from '../components/Header';
import { useNotifications } from '../hooks/useNotifications';
import { showBanner } from '../utils/banners';

// Import all client sections
import ClientDashboardSection from '../components/Dashboard/sections/ClientDashboardSection';
import ClientBookingsSection from '../components/Dashboard/sections/ClientBookingsSection';
import ClientInvoicesSection from '../components/Dashboard/sections/ClientInvoicesSection';
import ClientFavoritesSection from '../components/Dashboard/sections/ClientFavoritesSection';
import ClientReviewsSection from '../components/Dashboard/sections/ClientReviewsSection';
import ClientSettingsSection from '../components/Dashboard/sections/ClientSettingsSection';
import ClientPaymentSection from '../components/Dashboard/sections/ClientPaymentSection';
import UnifiedMessagesSection from '../components/Dashboard/sections/UnifiedMessagesSection';

// Import all vendor sections
import VendorDashboardSection from '../components/Dashboard/sections/VendorDashboardSection';
import VendorRequestsSection from '../components/Dashboard/sections/VendorRequestsSection';
import VendorInvoicesSection from '../components/Dashboard/sections/VendorInvoicesSection';
import VendorBusinessProfileSection from '../components/Dashboard/sections/VendorBusinessProfileSection';
import VendorReviewsSection from '../components/Dashboard/sections/VendorReviewsSection';
import VendorAnalyticsSection from '../components/Dashboard/sections/VendorAnalyticsSection';
import VendorSettingsSection from '../components/Dashboard/sections/VendorSettingsSection';

import ProfileSidebar from '../components/ProfileSidebar';

import './DashboardPage.css';
import '../index.css';

function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, loading: authLoading } = useAuth();
  const { notificationCount } = useNotifications();
  
  // Get initial section from URL or state
  const getInitialSection = () => {
    const params = new URLSearchParams(location.search);
    // Support both ?section= and ?tab= for backwards compatibility with email links
    const sectionParam = params.get('section') || params.get('tab');
    if (sectionParam) return sectionParam;
    
    if (location.state?.section) return location.state.section;
    
    // Default based on user type
    return currentUser?.isVendor ? 'today' : 'today';
  };
  
  // Get deep link item ID from URL (for opening specific booking/payment/review)
  const getDeepLinkItemId = () => {
    const params = new URLSearchParams(location.search);
    return params.get('itemId') || null;
  };
  
  const [activeSection, setActiveSection] = useState(getInitialSection());
  const [activeTab, setActiveTab] = useState('today'); // 'today' or 'upcoming'
  const [clientData, setClientData] = useState(null);
  const [vendorData, setVendorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);
  const [bookingsRefreshKey, setBookingsRefreshKey] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [deepLinkItemId, setDeepLinkItemId] = useState(getDeepLinkItemId());
  const [notificationCounts, setNotificationCounts] = useState({
    pendingBookings: 0,
    unreadMessages: 0,
    pendingReviews: 0
  });
  const [vendorLogoUrl, setVendorLogoUrl] = useState(null);
  // Get view mode from localStorage
  const getViewMode = () => {
    const stored = localStorage.getItem('viewMode');
    if (stored === 'vendor' || stored === 'client') return stored;
    return currentUser?.isVendor ? 'vendor' : 'client';
  };
  
  const [viewMode, setViewMode] = useState(getViewMode());

  const isVendor = currentUser?.isVendor || currentUser?.userType === 'vendor';
  const hasVendorProfile = !!currentUser?.vendorProfileId;
  
  // Determine which view to show based on viewMode from localStorage
  const showVendorView = viewMode === 'vendor';

  // Map equivalent sections between client and vendor modes
  const mapSectionToMode = (currentSection, toVendorMode) => {
    const clientToVendor = {
      'dashboard': 'vendor-dashboard',
      'bookings': 'vendor-requests',
      'invoices': 'vendor-invoices',
      'reviews': 'vendor-reviews',
      'settings': 'vendor-settings',
      'messages': 'messages', // shared
    };
    
    const vendorToClient = {
      'vendor-dashboard': 'dashboard',
      'vendor-requests': 'bookings',
      'vendor-invoices': 'invoices',
      'vendor-reviews': 'reviews',
      'vendor-settings': 'settings',
      'vendor-business-profile': 'dashboard', // no client equivalent
      'vendor-analytics': 'dashboard', // no client equivalent
      'messages': 'messages', // shared
    };
    
    if (toVendorMode) {
      return clientToVendor[currentSection] || 'vendor-dashboard';
    } else {
      return vendorToClient[currentSection] || 'dashboard';
    }
  };

  // Listen for viewModeChanged events to update immediately
  useEffect(() => {
    const handleViewModeChange = (event) => {
      const newMode = event.detail?.mode;
      if (newMode) {
        console.log('DashboardPage: viewModeChanged event received, new mode:', newMode);
        const toVendorMode = newMode === 'vendor';
        const mappedSection = mapSectionToMode(activeSection, toVendorMode);
        setViewMode(newMode);
        setActiveSection(mappedSection);
      }
    };
    
    window.addEventListener('viewModeChanged', handleViewModeChange);
    return () => window.removeEventListener('viewModeChanged', handleViewModeChange);
  }, [activeSection]);

  // Listen for navigateToMessages events from booking sections
  useEffect(() => {
    const handleNavigateToMessages = (event) => {
      const { conversationId, otherPartyName } = event.detail || {};
      console.log('DashboardPage: navigateToMessages event received', { conversationId, otherPartyName });
      
      // Navigate to messages section
      setActiveSection('messages');
      
      // Store the conversation to open in sessionStorage so UnifiedMessagesSection can pick it up
      if (conversationId) {
        sessionStorage.setItem('openConversationId', conversationId);
        sessionStorage.setItem('openConversationName', otherPartyName || '');
      }
    };
    
    window.addEventListener('navigateToMessages', handleNavigateToMessages);
    return () => window.removeEventListener('navigateToMessages', handleNavigateToMessages);
  }, []);

  // Update activeSection when URL changes (for sidebar navigation)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    // Support both ?section= and ?tab= for backwards compatibility with email links
    const sectionParam = params.get('section') || params.get('tab');
    if (sectionParam) {
      console.log('DashboardPage: URL section changed to:', sectionParam);
      setActiveSection(sectionParam);
    }
    
    // Handle deep link item ID
    const itemId = params.get('itemId');
    if (itemId) {
      setDeepLinkItemId(itemId);
      // Clear the itemId from URL after capturing it
      params.delete('itemId');
      const newUrl = params.toString() ? `${location.pathname}?${params.toString()}` : location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    
    // Handle Stripe connect success/error redirect
    const stripeConnect = params.get('stripe_connect');
    if (stripeConnect === 'success') {
      showBanner('Successfully connected to Stripe! Your account is now ready to accept payments.', 'success');
      // Clean up URL params
      params.delete('stripe_connect');
      const newUrl = params.toString() ? `${location.pathname}?${params.toString()}` : location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (stripeConnect === 'error') {
      const message = params.get('message') || 'Failed to connect Stripe';
      showBanner(decodeURIComponent(message), 'error');
      params.delete('stripe_connect');
      params.delete('message');
      const newUrl = params.toString() ? `${location.pathname}?${params.toString()}` : location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location.search]);

  // Load notification counts
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const loadNotificationCounts = async () => {
      try {
        let pendingBookings = 0;
        let unreadMessages = 0;
        let pendingReviews = 0;
        
        // Get pending bookings count based on view mode
        if (showVendorView && currentUser?.vendorProfileId) {
          const bookingsResp = await apiGet(`/vendor/${currentUser.vendorProfileId}/bookings/all`);
          if (bookingsResp.ok) {
            const bookings = await bookingsResp.json();
            pendingBookings = (bookings || []).filter(b => 
              (b.Status || '').toLowerCase() === 'pending'
            ).length;
          }
        } else {
          const bookingsResp = await apiGet(`/users/${currentUser.id}/bookings/all`);
          if (bookingsResp.ok) {
            const bookings = await bookingsResp.json();
            pendingBookings = (bookings || []).filter(b => 
              (b.Status || '').toLowerCase() === 'pending'
            ).length;
            
            // Calculate pending reviews (past paid bookings not yet reviewed)
            const reviewsResp = await apiGet(`/users/${currentUser.id}/reviews`);
            const reviewsData = reviewsResp.ok ? await reviewsResp.json() : [];
            const reviewedBookingIds = new Set((Array.isArray(reviewsData) ? reviewsData : []).map(r => r.BookingID));
            const now = new Date();
            pendingReviews = (bookings || []).filter(b => {
              const eventDate = new Date(b.EventDate);
              const isPast = eventDate < now;
              const isPaid = b.FullAmountPaid === true || b.FullAmountPaid === 1 || 
                           (b.Status || '').toLowerCase() === 'paid';
              const notReviewed = !reviewedBookingIds.has(b.BookingID);
              return isPast && isPaid && notReviewed;
            }).length;
          }
        }
        
        // Get unread messages count from both client and vendor conversations
        // Client conversations
        try {
          const clientMsgResp = await apiGet(`/messages/conversations/user/${currentUser.id}`);
          if (clientMsgResp.ok) {
            const data = await clientMsgResp.json();
            const convs = data.conversations || data || [];
            const clientUnread = convs.reduce((sum, c) => {
              const count = c.unreadCount || c.UnreadCount || c.unread_count || c.Unread || 0;
              return sum + (typeof count === 'number' ? count : parseInt(count) || 0);
            }, 0);
            unreadMessages += clientUnread;
          }
        } catch (e) { console.error('Error fetching client messages:', e); }
        
        // Vendor conversations (if vendor)
        if (currentUser?.vendorProfileId) {
          try {
            const vendorMsgResp = await apiGet(`/messages/conversations/vendor/${currentUser.vendorProfileId}`);
            if (vendorMsgResp.ok) {
              const data = await vendorMsgResp.json();
              const convs = data.conversations || data || [];
              const vendorUnread = convs.reduce((sum, c) => {
                const count = c.unreadCount || c.UnreadCount || c.unread_count || c.Unread || 0;
                return sum + (typeof count === 'number' ? count : parseInt(count) || 0);
              }, 0);
              unreadMessages += vendorUnread;
            }
          } catch (e) { console.error('Error fetching vendor messages:', e); }
        }
        
        setNotificationCounts({ pendingBookings, unreadMessages, pendingReviews });
      } catch (error) {
        console.error('Error loading notification counts:', error);
      }
    };
    
    loadNotificationCounts();
    
    // Refresh counts every 30 seconds
    const interval = setInterval(loadNotificationCounts, 30000);
    
    // Listen for message sent/received events to refresh counts immediately
    const handleMessageEvent = () => {
      loadNotificationCounts();
    };
    window.addEventListener('messageSent', handleMessageEvent);
    window.addEventListener('messageReceived', handleMessageEvent);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('messageSent', handleMessageEvent);
      window.removeEventListener('messageReceived', handleMessageEvent);
    };
  }, [currentUser?.id, currentUser?.vendorProfileId, showVendorView]);

  // Redirect if not logged in (but wait for auth to finish loading)
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/');
    }
  }, [currentUser, authLoading, navigate]);

  // Fetch vendor logo for profile picture
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const fetchVendorLogo = async () => {
      try {
        const response = await apiGet(`/vendors/profile?userId=${currentUser.id}`);
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

  // Load client dashboard data
  const loadClientData = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoading(true);
      
      const response = await apiGet(`/users/${currentUser.id}/dashboard`);
      
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const dashData = await response.json();
      
      let favoritesCount = 0;
      try {
        const favResp = await apiGet(`/favorites/user/${currentUser.id}`);
        if (favResp.ok) {
          const favs = await favResp.json();
          favoritesCount = Array.isArray(favs) ? favs.length : (favs?.length || 0);
        }
      } catch (e) {
        console.error('Error loading favorites:', e);
      }
      
      let pendingRequests = 0;
      try {
        const reqResp = await apiGet(`/bookings/requests/${currentUser.id}`);
        if (reqResp.ok) {
          const reqData = await reqResp.json();
          const reqs = reqData.requests || [];
          pendingRequests = reqs.filter(r => (r.Status || r.status) === 'pending').length;
        }
      } catch (e) {
        console.error('Error loading pending requests:', e);
      }
      
      setClientData({
        ...dashData,
        favoritesCount,
        pendingRequests,
        upcomingBookings: dashData.upcomingBookings || [],
        recentMessages: dashData.recentMessages || [],
        unreadMessages: dashData.unreadMessages || 0
      });
      
    } catch (error) {
      console.error('Error loading client dashboard:', error);
      setClientData({});
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Load vendor dashboard data
  const loadVendorData = useCallback(async () => {
    if (!currentUser?.id || !currentUser?.vendorProfileId) return;
    
    try {
      // Note: The vendor dashboard API expects UserID, not VendorProfileID
      const response = await apiGet(`/vendor/${currentUser.id}/dashboard`);
      
      if (response.ok) {
        const data = await response.json();
        setVendorData(data);
      } else {
        // Silently handle - user may not have vendor profile set up yet
        setVendorData({});
      }
    } catch (error) {
      // Silently handle - expected for non-vendor users
      setVendorData({});
    }
  }, [currentUser]);

  // Load data on mount
  useEffect(() => {
    loadClientData();
    if (currentUser?.vendorProfileId) {
      loadVendorData();
    }
  }, [loadClientData, loadVendorData, currentUser]);

  // Update URL when section changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (activeSection !== 'today') {
      params.set('section', activeSection);
    } else {
      params.delete('section');
    }
    const newUrl = params.toString() ? `${location.pathname}?${params.toString()}` : location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [activeSection, location.pathname, location.search]);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  const handlePayNow = (booking) => {
    // Navigate to dedicated payment page with encoded booking ID
    const bookingId = booking.BookingID || booking.RequestID;
    const encodedId = encodeBookingId(bookingId);
    navigate(`/payment/${encodedId}`);
  };

  const handlePaymentSuccess = (paymentIntent) => {
    showBanner('Payment successful! Your booking is now confirmed.', 'success');
    setSelectedBookingForPayment(null);
    setBookingsRefreshKey(prev => prev + 1);
    setActiveSection('bookings');
  };

  const handleBackFromPayment = () => {
    setSelectedBookingForPayment(null);
    setActiveSection('bookings');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSwitchToExploring = () => {
    navigate('/');
  };

  // All navigation tabs - matching original dashboard menu items
  const clientTabs = [
    { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { id: 'bookings', icon: 'fa-calendar-check', label: 'Bookings' },
    { id: 'messages', icon: 'fa-comments', label: 'Messages' },
    { id: 'invoices', icon: 'fa-file-invoice', label: 'Invoices' },
    { id: 'favorites', icon: 'fa-heart', label: 'Favorites' },
    { id: 'reviews', icon: 'fa-star', label: 'Reviews' },
    { id: 'settings', icon: 'fa-cog', label: 'Settings' }
  ];

  const vendorTabs = [
    { id: 'vendor-dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { id: 'vendor-requests', icon: 'fa-calendar-check', label: 'Bookings' },
    { id: 'messages', icon: 'fa-comments', label: 'Messages' },
    { id: 'vendor-invoices', icon: 'fa-file-invoice', label: 'Invoices' },
    { id: 'vendor-business-profile', icon: 'fa-building', label: 'Business Profile' },
    { id: 'vendor-reviews', icon: 'fa-star', label: 'Reviews' },
    { id: 'vendor-analytics', icon: 'fa-chart-line', label: 'Analytics' }
  ];

  // Show tabs based on current view mode
  const topNavTabs = showVendorView ? vendorTabs : clientTabs;
  
  // Get current section label for mobile dropdown
  const getCurrentSectionLabel = () => {
    const allTabs = [...clientTabs, ...vendorTabs];
    const currentTab = allTabs.find(tab => tab.id === activeSection);
    return currentTab?.label || 'Dashboard';
  };

  const renderContent = () => {
    // Map section IDs to existing components - matching UnifiedDashboard
    switch (activeSection) {
      // Client sections
      case 'dashboard':
        return <ClientDashboardSection data={clientData} loading={loading && !clientData} onSectionChange={handleSectionChange} onPayNow={handlePayNow} />;
      case 'bookings':
        return <ClientBookingsSection key={bookingsRefreshKey} onPayNow={handlePayNow} deepLinkBookingId={deepLinkItemId} onDeepLinkHandled={() => setDeepLinkItemId(null)} />;
      case 'invoices':
        return <ClientInvoicesSection />;
      case 'favorites':
        return <ClientFavoritesSection />;
      case 'reviews':
        return <ClientReviewsSection deepLinkBookingId={deepLinkItemId} onDeepLinkHandled={() => setDeepLinkItemId(null)} />;
      case 'settings':
        return <ClientSettingsSection />;
      case 'payment':
        return (
          <ClientPaymentSection 
            booking={selectedBookingForPayment}
            onBack={handleBackFromPayment}
            onPaymentSuccess={handlePaymentSuccess}
          />
        );
      
      // Vendor sections
      case 'vendor-dashboard':
        return <VendorDashboardSection data={vendorData} loading={loading && !vendorData} onSectionChange={handleSectionChange} />;
      case 'vendor-requests':
        return <VendorRequestsSection deepLinkBookingId={deepLinkItemId} onDeepLinkHandled={() => setDeepLinkItemId(null)} />;
      case 'vendor-invoices':
        return <VendorInvoicesSection />;
      case 'vendor-business-profile':
        return <VendorBusinessProfileSection />;
      case 'vendor-reviews':
        return <VendorReviewsSection />;
      case 'vendor-analytics':
        return <VendorAnalyticsSection />;
      case 'vendor-settings':
        return <VendorSettingsSection />;
      
      // Unified Messages section - vendor view on dashboard
      case 'messages':
      case 'vendor-messages':
        return <UnifiedMessagesSection onSectionChange={handleSectionChange} forceViewMode="vendor" />;
      
      default:
        return showVendorView 
          ? <VendorDashboardSection data={vendorData} loading={loading && !vendorData} onSectionChange={handleSectionChange} />
          : <ClientDashboardSection data={clientData} loading={loading && !clientData} onSectionChange={handleSectionChange} onPayNow={handlePayNow} />;
    }
  };

  // Handle switching between client and vendor view
  const handleViewModeSwitch = (mode) => {
    setViewMode(mode);
    // Reset to appropriate dashboard when switching
    if (mode === 'vendor' || (mode === 'auto' && isVendor)) {
      setActiveSection('vendor-dashboard');
    } else {
      setActiveSection('dashboard');
    }
  };

  // Show loading while auth is checking
  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <PageLayout variant="dashboard" pageClassName="dashboard-page">
      {/* Standard Header - Same as rest of app */}
      <Header 
        onSearch={() => {}}
        onProfileClick={() => setMobileMenuOpen(true)}
        onWishlistClick={() => {}}
        onChatClick={() => {}}
        onNotificationsClick={() => {}}
      />
      
      {/* Dashboard Navigation Bar - Below Header */}
      <nav className="dashboard-nav-bar">
        <div className="dashboard-nav-content page-wrapper">
          {/* Desktop Navigation Tabs - visible on desktop */}
          <div className="dashboard-top-nav desktop-only">
            {topNavTabs.map(tab => {
              // Determine badge count for this tab
              let badgeCount = 0;
              if ((tab.id === 'bookings' || tab.id === 'vendor-requests') && notificationCounts.pendingBookings > 0) {
                badgeCount = notificationCounts.pendingBookings;
              } else if (tab.id === 'messages' && notificationCounts.unreadMessages > 0) {
                badgeCount = notificationCounts.unreadMessages;
              } else if (tab.id === 'reviews' && notificationCounts.pendingReviews > 0) {
                badgeCount = notificationCounts.pendingReviews;
              }
              
              return (
                <button
                  key={tab.id}
                  className={`dashboard-nav-tab ${activeSection === tab.id ? 'active' : ''}`}
                  onClick={() => handleSectionChange(tab.id)}
                >
                  <span>{tab.label}</span>
                  {badgeCount > 0 && (
                    <span className="nav-badge">{badgeCount}</span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Mobile Navigation Dropdown - visible on mobile only */}
          <div className="mobile-nav-dropdown mobile-only">
            <button 
              className="mobile-nav-trigger"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              <span>{getCurrentSectionLabel()}</span>
              <i className={`fas fa-chevron-${mobileNavOpen ? 'up' : 'down'}`}></i>
            </button>
            
            {mobileNavOpen && (
              <>
                <div className="mobile-nav-overlay" onClick={() => setMobileNavOpen(false)} />
                <div className="mobile-nav-menu">
                  {topNavTabs.map(tab => (
                    <button
                      key={tab.id}
                      className={`mobile-nav-item ${activeSection === tab.id ? 'active' : ''}`}
                      onClick={() => { handleSectionChange(tab.id); setMobileNavOpen(false); }}
                    >
                      <i className={`fas ${tab.icon}`}></i>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
      
      {/* Airbnb-Style Profile Sidebar */}
      <ProfileSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content */}
      <main className="dashboard-page-content">
        {renderContent()}
      </main>
    </PageLayout>
  );
}

export default DashboardPage;
