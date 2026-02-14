import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';
import { apiGet } from '../../utils/api';
import { useNotifications } from '../../hooks/useNotifications';
import DashboardSidebar from './DashboardSidebar';
import VendorDashboardSection from './sections/VendorDashboardSection';
import VendorRequestsSection from './sections/VendorRequestsSection';
import VendorInvoicesSection from './sections/VendorInvoicesSection';
import VendorBusinessProfileSection from './sections/VendorBusinessProfileSection';
import VendorMessagesSection from './sections/VendorMessagesSection';
import VendorReviewsSection from './sections/VendorReviewsSection';
import VendorAnalyticsSection from './sections/VendorAnalyticsSection';
import VendorSettingsSection from './sections/VendorSettingsSection';

function VendorDashboard({ activeSection, onSectionChange, onLogout }) {
  const { currentUser } = useAuth();
  const { notificationCount } = useNotifications();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const menuItems = [
    { id: 'vendor-dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { id: 'vendor-requests', icon: 'fa-calendar-check', label: 'Bookings' },
    { id: 'vendor-invoices', icon: 'fa-file-invoice', label: 'Invoices' },
    { id: 'vendor-business-profile', icon: 'fa-building', label: 'Business Profile' },
    { id: 'vendor-messages', icon: 'fa-comments', label: 'Messages' },
    { id: 'vendor-reviews', icon: 'fa-star', label: 'Reviews' },
    { id: 'vendor-analytics', icon: 'fa-chart-line', label: 'Analytics' }
  ];

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // If no vendorProfileId, just show empty dashboard
      if (!currentUser?.vendorProfileId) {
        setDashboardData({});
        setLoading(false);
        return;
      }
      
      // Note: The vendor dashboard API expects UserID, not VendorProfileID
      const response = await fetch(`${API_BASE_URL}/vendor/${currentUser.id}/dashboard`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        // Silently handle - user may not have vendor profile set up yet
        setDashboardData({});
      }
    } catch (error) {
      // Silently handle - expected for non-vendor users
      setDashboardData({});
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Clear data when user changes
  useEffect(() => {
    setDashboardData(null);
    setLoading(true);
  }, [currentUser?.id, currentUser?.vendorProfileId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const renderSection = () => {
    switch (activeSection) {
      case 'vendor-dashboard':
        return (
          <VendorDashboardSection 
            data={dashboardData} 
            loading={loading}
            onSectionChange={onSectionChange}
          />
        );
      case 'vendor-requests':
        return <VendorRequestsSection />;
      case 'vendor-invoices':
        return <VendorInvoicesSection />;
      case 'vendor-business-profile':
        return <VendorBusinessProfileSection />;
      case 'vendor-messages':
        return <VendorMessagesSection onSectionChange={onSectionChange} />;
      case 'vendor-reviews':
        return <VendorReviewsSection />;
      case 'vendor-analytics':
        return <VendorAnalyticsSection />;
      case 'vendor-settings':
        return <VendorSettingsSection />;
      default:
        return <VendorDashboardSection data={dashboardData} loading={loading} />;
    }
  };

  return (
    <div className="dashboard-container" id="vendor-dashboard-container" style={{ display: 'flex', height: '100%' }}>
      <DashboardSidebar 
        menuItems={menuItems}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        onLogout={onLogout}
        sectionLabel="VENDOR"
      />
      <main className="dashboard-content" style={{ overflowY: 'auto', flex: 1 }}>
        <div className="dashboard-header">
          <h1 className="dashboard-title" id="vendor-dashboard-title">
            {activeSection === 'vendor-dashboard' ? 'Vendor Dashboard' : (menuItems.find(item => item.id === activeSection)?.label || 'Vendor Dashboard')}
          </h1>
          <div className="user-nav">
            <div className="nav-icon" id="vendor-notifications-btn" style={{ position: 'relative', cursor: 'pointer' }}>
              <i className="fas fa-bell"></i>
              <span className="badge" id="vendor-notifications-badge" style={{ display: notificationCount > 0 ? 'grid' : 'none' }}>
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

export default VendorDashboard;
