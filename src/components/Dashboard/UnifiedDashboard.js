import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';
import { apiGet } from '../../utils/api';
import { useNotifications } from '../../hooks/useNotifications';
import { showBanner } from '../../utils/banners';
import DashboardSidebar from './DashboardSidebar';

// Import all client sections
import ClientDashboardSection from './sections/ClientDashboardSection';
import ClientBookingsSection from './sections/ClientBookingsSection';
import ClientInvoicesSection from './sections/ClientInvoicesSection';
import ClientFavoritesSection from './sections/ClientFavoritesSection';
import ClientReviewsSection from './sections/ClientReviewsSection';
import ClientSettingsSection from './sections/ClientSettingsSection';
import ClientPaymentSection from './sections/ClientPaymentSection';
import UnifiedMessagesSection from './sections/UnifiedMessagesSection';

// Import all vendor sections
import VendorDashboardSection from './sections/VendorDashboardSection';
import VendorRequestsSection from './sections/VendorRequestsSection';
import VendorInvoicesSection from './sections/VendorInvoicesSection';
import VendorBusinessProfileSection from './sections/VendorBusinessProfileSection';
import VendorReviewsSection from './sections/VendorReviewsSection';
import VendorAnalyticsSection from './sections/VendorAnalyticsSection';
import VendorSettingsSection from './sections/VendorSettingsSection';

function UnifiedDashboard({ activeSection, onSectionChange, onLogout, mobileMenuOpen, setMobileMenuOpen }) {
  const { currentUser } = useAuth();
  const { notificationCount } = useNotifications();
  const [clientData, setClientData] = useState(null);
  const [vendorData, setVendorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);
  const [bookingsRefreshKey, setBookingsRefreshKey] = useState(0);

  // Load client dashboard data
  const loadClientData = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoading(true);
      
      // Step 1: Fetch main dashboard data
      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/dashboard`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const dashData = await response.json();
      
      // Step 2: Fetch favorites count
      let favoritesCount = 0;
      try {
        const favResp = await fetch(`${API_BASE_URL}/favorites/user/${currentUser.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (favResp.ok) {
          const favs = await favResp.json();
          favoritesCount = Array.isArray(favs) ? favs.length : (favs?.length || 0);
        }
      } catch (e) {
        console.error('Error loading favorites:', e);
      }
      
      // Step 3: Fetch pending requests count
      let pendingRequests = 0;
      try {
        const reqResp = await fetch(`${API_BASE_URL}/bookings/requests/${currentUser.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (reqResp.ok) {
          const reqData = await reqResp.json();
          const reqs = reqData.requests || [];
          pendingRequests = reqs.filter(r => (r.Status || r.status) === 'pending').length;
        }
      } catch (e) {
        console.error('Error loading pending requests:', e);
      }
      
      // Combine all data
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
    if (!currentUser?.vendorProfileId) return;
    
    try {
      // Note: The vendor dashboard API expects UserID, not VendorProfileID
      const response = await fetch(`${API_BASE_URL}/vendor/${currentUser.id}/dashboard`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
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

  // Clear data when user changes
  useEffect(() => {
    // Reset all data when user changes
    setClientData(null);
    setVendorData(null);
    setLoading(true);
  }, [currentUser?.id, currentUser?.vendorProfileId]);

  // Load data on mount
  useEffect(() => {
    loadClientData();
    if (currentUser?.vendorProfileId) {
      loadVendorData();
    }
  }, [loadClientData, loadVendorData, currentUser]);

  // Combined menu items with CLIENT and VENDOR sections
  // Messages is now unified at the top level
  const menuItems = [
    { section: 'GENERAL', items: [
      { id: 'messages', icon: 'fa-comments', label: 'Messages' }
    ]},
    { section: 'CLIENT', items: [
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
      { id: 'bookings', icon: 'fa-calendar-check', label: 'Bookings' },
      { id: 'invoices', icon: 'fa-file-invoice', label: 'Invoices' },
      { id: 'favorites', icon: 'fa-heart', label: 'Favorites' },
      { id: 'reviews', icon: 'fa-star', label: 'My Reviews' },
      { id: 'settings', icon: 'fa-cog', label: 'Settings' }
    ]},
    { section: 'VENDOR', items: [
      { id: 'vendor-dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
      { id: 'vendor-requests', icon: 'fa-calendar-check', label: 'Bookings' },
      { id: 'vendor-invoices', icon: 'fa-file-invoice', label: 'Invoices' },
      { id: 'vendor-business-profile', icon: 'fa-building', label: 'Business Profile' },
      { id: 'vendor-reviews', icon: 'fa-star', label: 'Reviews' },
      { id: 'vendor-analytics', icon: 'fa-chart-line', label: 'Analytics' }
    ]}
  ];

  // Handle Pay Now from bookings - navigate to payment section
  const handlePayNow = (booking) => {
    setSelectedBookingForPayment(booking);
    onSectionChange('payment');
  };

  // Handle payment success
  const handlePaymentSuccess = (paymentIntent) => {
    showBanner('Payment successful! Your booking is now confirmed.', 'success');
    setSelectedBookingForPayment(null);
    setBookingsRefreshKey(prev => prev + 1); // Force bookings to refresh
    onSectionChange('bookings');
  };

  // Handle back from payment
  const handleBackFromPayment = () => {
    setSelectedBookingForPayment(null);
    onSectionChange('bookings');
  };

  const renderSection = () => {
    switch (activeSection) {
      // Unified Messages section (combines client and vendor messages)
      case 'messages':
        return <UnifiedMessagesSection onSectionChange={onSectionChange} />;
      
      // Client sections
      case 'dashboard':
        return <ClientDashboardSection data={clientData} loading={loading && !clientData} onSectionChange={onSectionChange} />;
      case 'bookings':
        return <ClientBookingsSection key={bookingsRefreshKey} onPayNow={handlePayNow} />;
      case 'invoices':
        return <ClientInvoicesSection />;
      case 'favorites':
        return <ClientFavoritesSection />;
      case 'reviews':
        return <ClientReviewsSection />;
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
        return <VendorDashboardSection data={vendorData} loading={loading && !vendorData} onSectionChange={onSectionChange} />;
      case 'vendor-requests':
        return <VendorRequestsSection />;
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
      
      default:
        return <ClientDashboardSection data={clientData} loading={loading && !clientData} onSectionChange={onSectionChange} />;
    }
  };

  const getSectionTitle = () => {
    const allItems = [...menuItems[0].items, ...menuItems[1].items];
    const item = allItems.find(i => i.id === activeSection);
    
    if (activeSection === 'vendor-dashboard') return 'Vendor Dashboard';
    if (activeSection === 'dashboard') return 'Dashboard';
    return item?.label || 'Dashboard';
  };

  return (
    <div className="dashboard-container" id="dashboard-container" style={{ display: 'flex', height: '100%' }}>
      <DashboardSidebar 
        menuItems={menuItems}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        onLogout={onLogout}
        unified={true}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      <main className="dashboard-content" style={{ overflowY: 'auto', flex: 1 }}>
        <div className="dashboard-header">
          <h1 className="dashboard-title" id="dashboard-title">
            {getSectionTitle()}
          </h1>
          <div className="user-nav">
            <div className="nav-icon" id="dashboard-notifications-btn" style={{ position: 'relative', cursor: 'pointer' }}>
              <i className="fas fa-bell"></i>
              <span className="badge" id="dashboard-notifications-badge" style={{ display: notificationCount > 0 ? 'grid' : 'none' }}>
                {notificationCount}
              </span>
            </div>
          </div>
        </div>
        {renderSection()}
      </main>
    </div>
  );
}

export default UnifiedDashboard;
