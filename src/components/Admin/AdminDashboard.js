/**
 * Admin Dashboard - Main Container Component
 * Renders the admin layout with sidebar and active section
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import './AdminDashboard.css';

// Section Components
import DashboardSection from './sections/DashboardSection';
import UsersSection from './sections/UsersSection';
import VendorsSection from './sections/VendorsSection';
import BookingsSection from './sections/BookingsSection';
import PaymentsSection from './sections/PaymentsSection';
import ReviewsSection from './sections/ReviewsSection';
import ContentSection from './sections/ContentSection';
import SupportSection from './sections/SupportSection';
import ChatSection from './sections/ChatSection';
import SecuritySection from './sections/SecuritySection';
import SettingsSection from './sections/SettingsSection';
import AutomationSection from './sections/AutomationSection';
import ToolsSection from './sections/ToolsSection';
import AnalyticsSection from './sections/AnalyticsSection';
import GuestFavoritesSection from './sections/GuestFavoritesSection';
import VendorBadgesSection from './sections/VendorBadgesSection';
import ForumSection from './sections/ForumSection';

const sectionTitles = {
  dashboard: { title: 'Dashboard', subtitle: 'At-a-glance metrics and quick access' },
  analytics: { title: 'Analytics & Reports', subtitle: 'Performance charts, trends, and data exports' },
  users: { title: 'User Management', subtitle: 'Manage platform users and accounts' },
  vendors: { title: 'Vendor Management', subtitle: 'Approvals, profiles, and categories' },
  bookings: { title: 'Bookings Management', subtitle: 'Booking lifecycle and operations' },
  payments: { title: 'Payments & Payouts', subtitle: 'Transactions, vendor payouts, and revenue' },
  reviews: { title: 'Reviews & Moderation', subtitle: 'Review management and content moderation' },
  content: { title: 'Content Management', subtitle: 'Blog posts, FAQs, and banners' },
  forum: { title: 'Forum Moderation', subtitle: 'Manage forum posts and comments' },
  support: { title: 'Support Tickets', subtitle: 'Ticket management and responses' },
  chat: { title: 'Live Chat', subtitle: 'Real-time communication oversight' },
  security: { title: 'Security & Audit', subtitle: 'Login activity, locked accounts, and 2FA' },
  settings: { title: 'Platform Settings', subtitle: 'Commission, fees, and maintenance' },
  automation: { title: 'Automation & Email', subtitle: 'Automated workflows and email management' },
  tools: { title: 'Search & Impersonation', subtitle: 'Quick search and user impersonation tools' },
  'guest-favorites': { title: 'Guest Favorites', subtitle: 'Manage Guest Favorite status for vendors' },
  'vendor-badges': { title: 'Vendor Badges', subtitle: 'Manage vendor badges like Top Rated, New Vendor, etc.' }
};

const validSections = ['dashboard', 'analytics', 'users', 'vendors', 'bookings', 'payments', 'reviews', 'content', 'forum', 'support', 'chat', 'security', 'settings', 'automation', 'tools', 'guest-favorites', 'vendor-badges'];

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { section: urlSection } = useParams(); // Get section from URL path /admin/:section
  const { currentUser, logout } = useAuth();
  
  // Priority: URL path > query param > default
  const getSectionFromUrl = () => {
    if (urlSection && validSections.includes(urlSection)) return urlSection;
    const querySection = searchParams.get('section');
    if (querySection && validSections.includes(querySection)) return querySection;
    return 'dashboard';
  };
  
  const [activeSection, setActiveSection] = useState(getSectionFromUrl());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Update section when URL changes
  useEffect(() => {
    const newSection = getSectionFromUrl();
    if (newSection !== activeSection) {
      setActiveSection(newSection);
    }
  }, [urlSection, searchParams]);

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setMobileMenuOpen(false);
    // Navigate to the new section URL
    navigate(`/admin/${sectionId}`);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardSection />;
      case 'analytics':
        return <AnalyticsSection />;
      case 'users':
        return <UsersSection />;
      case 'vendors':
        return <VendorsSection />;
      case 'bookings':
        return <BookingsSection />;
      case 'payments':
        return <PaymentsSection />;
      case 'reviews':
        return <ReviewsSection />;
      case 'content':
        return <ContentSection />;
      case 'forum':
        return <ForumSection />;
      case 'support':
        return <SupportSection />;
      case 'chat':
        return <ChatSection />;
      case 'security':
        return <SecuritySection />;
      case 'settings':
        return <SettingsSection />;
      case 'automation':
        return <AutomationSection />;
      case 'tools':
        return <ToolsSection />;
      case 'guest-favorites':
        return <GuestFavoritesSection />;
      case 'vendor-badges':
        return <VendorBadgesSection />;
      default:
        return <DashboardSection />;
    }
  };

  const currentSectionInfo = sectionTitles[activeSection] || sectionTitles.dashboard;

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onLogout={handleLogout}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-left">
            <button 
              className="admin-menu-toggle"
              onClick={() => setMobileMenuOpen(true)}
            >
              <i className="fas fa-bars"></i>
            </button>
            <div>
              <h1 className="admin-header-title">{currentSectionInfo.title}</h1>
              <p className="admin-header-subtitle">{currentSectionInfo.subtitle}</p>
            </div>
          </div>
          <div className="admin-header-right">
            <span style={{ 
              fontSize: '0.85rem', 
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className="fas fa-user-shield" style={{ color: '#dc2626' }}></i>
              {currentUser?.email}
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="admin-content">
          {renderSection()}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
