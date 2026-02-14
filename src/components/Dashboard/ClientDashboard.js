import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';
import { apiGet } from '../../utils/api';
import { useNotifications } from '../../hooks/useNotifications';
import { showBanner } from '../../utils/banners';
import DashboardSidebar from './DashboardSidebar';
import ClientDashboardSection from './sections/ClientDashboardSection';
import ClientBookingsSection from './sections/ClientBookingsSection';
import ClientInvoicesSection from './sections/ClientInvoicesSection';
import ClientFavoritesSection from './sections/ClientFavoritesSection';
import ClientMessagesSection from './sections/ClientMessagesSection';
import ClientReviewsSection from './sections/ClientReviewsSection';
import ClientSettingsSection from './sections/ClientSettingsSection';
import ClientPaymentSection from './sections/ClientPaymentSection';

function ClientDashboard({ activeSection, onSectionChange, onLogout }) {
  const { currentUser } = useAuth();
  const { notificationCount } = useNotifications();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);

  const menuItems = [
    { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { id: 'bookings', icon: 'fa-calendar-check', label: 'Bookings' },
    { id: 'invoices', icon: 'fa-file-invoice', label: 'Invoices' },
    { id: 'favorites', icon: 'fa-heart', label: 'Favorites' },
    { id: 'messages', icon: 'fa-comments', label: 'Messages' },
    { id: 'reviews', icon: 'fa-star', label: 'My Reviews' },
    { id: 'settings', icon: 'fa-cog', label: 'Settings' }
  ];

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // If no user ID, just show empty dashboard
      if (!currentUser?.id) {
        setDashboardData({});
        setLoading(false);
        return;
      }
      
      // Step 1: Fetch main dashboard data
      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/dashboard`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
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
      setDashboardData({
        ...dashData,
        favoritesCount,
        pendingRequests,
        upcomingBookings: dashData.upcomingBookings || [],
        recentMessages: dashData.recentMessages || [],
        unreadMessages: dashData.unreadMessages || 0
      });
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setDashboardData({});
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Pay Now from bookings - navigate to payment section
  const handlePayNow = (booking) => {
    setSelectedBookingForPayment(booking);
    onSectionChange('payment');
  };

  // Handle payment success
  const handlePaymentSuccess = (paymentIntent) => {
    showBanner('Payment successful! Your booking is now confirmed.', 'success');
    setSelectedBookingForPayment(null);
    onSectionChange('bookings');
  };

  // Handle back from payment
  const handleBackFromPayment = () => {
    setSelectedBookingForPayment(null);
    onSectionChange('bookings');
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <ClientDashboardSection 
            data={dashboardData} 
            loading={loading}
            onSectionChange={onSectionChange}
          />
        );
      case 'bookings':
        return <ClientBookingsSection onPayNow={handlePayNow} />;
      case 'invoices':
        return <ClientInvoicesSection />;
      case 'favorites':
        return <ClientFavoritesSection />;
      case 'messages':
        return <ClientMessagesSection onSectionChange={onSectionChange} />;
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
      default:
        return <ClientDashboardSection data={dashboardData} loading={loading} />;
    }
  };

  return (
    <div className="dashboard-container" id="dashboard-container" style={{ display: 'flex', height: '100%' }}>
      <DashboardSidebar 
        menuItems={menuItems}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        onLogout={onLogout}
        sectionLabel="CLIENT"
      />
      <main className="dashboard-content" style={{ overflowY: 'auto', flex: 1 }}>
        <div className="dashboard-header">
          <h1 className="dashboard-title" id="dashboard-title">
            {menuItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
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

export default ClientDashboard;
