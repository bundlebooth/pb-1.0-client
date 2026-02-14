import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import IndexPage from './pages/IndexPage';
import LandingPage from './pages/LandingPage';
import VendorProfilePage from './pages/VendorProfilePage';
import ProfilePage from './pages/ProfilePage';
import BookingPage from './pages/BookingPage';
import BecomeVendorPage from './pages/BecomeVendorPage';
import BecomeVendorLanding from './pages/BecomeVendorLanding';
import InvoicePage from './pages/InvoicePage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import HelpCentrePage from './pages/HelpCentrePage';
import HelpCentreArticlePage from './pages/HelpCentreArticlePage';
import ForumPage from './pages/ForumPage';
import ForumPostPage from './pages/ForumPostPage';
import BrowsePage from './pages/BrowsePage';
import DashboardPage from './pages/DashboardPage';
import ClientBookingsPage from './pages/ClientBookingsPage';
import ClientMessagesPage from './pages/ClientMessagesPage';
import ClientFavoritesPage from './pages/ClientFavoritesPage';
import ClientReviewsPage from './pages/ClientReviewsPage';
import ClientInvoicesPage from './pages/ClientInvoicesPage';
import ClientSettingsPage from './pages/ClientSettingsPage';
import ClientSettingsProfilePage from './pages/ClientSettingsProfilePage';
import ClientSettingsPersonalPage from './pages/ClientSettingsPersonalPage';
import ClientSettingsCommunicationPage from './pages/ClientSettingsCommunicationPage';
import ClientSettingsLanguagePage from './pages/ClientSettingsLanguagePage';
import ClientSettingsPrivacyPage from './pages/ClientSettingsPrivacyPage';
import ClientSettingsSecurityPage from './pages/ClientSettingsSecurityPage';
import ClientSettingsDeletePage from './pages/ClientSettingsDeletePage';
import ClientSettingsCookiesPage from './pages/ClientSettingsCookiesPage';
import BlogPage from './components/BlogPage';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminProtectedRoute from './components/Admin/AdminProtectedRoute';
import UnsubscribePage from './pages/UnsubscribePage';
import EmailPreferencesPage from './pages/EmailPreferencesPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import FacebookCallback from './pages/FacebookCallback';
import PaymentPage from './pages/PaymentPage';
import DeepLinkPage from './pages/DeepLinkPage';
import ReviewPage from './pages/ReviewPage';
import CookieConsent from './components/CookieConsent';
import ImpersonationBanner from './components/ImpersonationBanner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { LocalizationProvider } from './context/LocalizationContext';
import { useHeartbeat } from './hooks/useOnlineStatus';
import { useSocket } from './hooks/useSocket';
import SessionTimeoutProvider from './components/SessionTimeoutProvider';
import './styles/MapControls.css';

// Global initMap callback for Google Maps
window.initMap = function() {
};

// Disable right-click context menu on images (like Airbnb, Uber)
document.addEventListener('contextmenu', function(e) {
  if (e.target.tagName === 'IMG') {
    e.preventDefault();
    return false;
  }
});

// Home route wrapper - always shows landing page for all users
// The /explore route is for vendor discovery with search results
function HomeRoute() {
  const { loading } = useAuth();
  
  // Send heartbeat to track online status
  useHeartbeat();
  
  // Initialize socket connection for real-time messaging
  useSocket();
  
  // Session timeout is handled globally by SessionTimeoutProvider
  
  // Show loading while checking auth status
  if (loading) {
    return (
      <div id="app-loading-overlay">
        <div className="loading-logo">
          <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" style={{ height: '160px', width: 'auto' }} />
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  // Always show landing page - /explore is for vendor discovery
  return <LandingPage />;
}

// Protected deep link component - redirects to login if not authenticated, then to the target
function ProtectedDeepLink({ section }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (loading) return;
    
    if (!currentUser) {
      // Store the intended destination for after login
      const returnUrl = location.pathname + location.search;
      sessionStorage.setItem('postLoginRedirect', returnUrl);
      // Redirect to landing page (which has login)
      navigate('/', { state: { showLogin: true, returnUrl } });
    } else {
      // User is logged in, redirect to dashboard with the appropriate section and item
      const pathParts = location.pathname.split('/');
      const itemId = pathParts[pathParts.length - 1];
      
      // Determine the correct section based on user type and stored view mode
      let targetSection = section;
      const viewMode = localStorage.getItem('viewMode');
      const isVendorView = viewMode === 'vendor' || (currentUser?.isVendor && viewMode !== 'client');
      
      // Map client sections to vendor sections if user is in vendor view
      if (isVendorView && section === 'bookings') {
        targetSection = 'vendor-requests';
      } else if (isVendorView && section === 'reviews') {
        targetSection = 'vendor-reviews';
      }
      
      // Build the dashboard URL with section and item ID
      let dashboardUrl = `/dashboard?section=${targetSection}`;
      if (itemId && itemId !== section) {
        dashboardUrl += `&itemId=${itemId}`;
      }
      
      navigate(dashboardUrl, { replace: true });
    }
  }, [currentUser, loading, location, navigate, section]);
  
  // Show loading while checking auth or redirecting
  return (
    <div id="app-loading-overlay">
      <div className="loading-logo">
        <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" style={{ height: '160px', width: 'auto' }} />
      </div>
      <div className="loading-spinner"></div>
    </div>
  );
}

function App() {
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => {
      setAppLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (appLoading) {
    return (
      <div id="app-loading-overlay">
        <div className="loading-logo">
          <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" style={{ height: '160px', width: 'auto' }} />
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <LocalizationProvider>
      <AuthProvider>
        <AlertProvider>
          <SessionTimeoutProvider>
            <Router>
            <ImpersonationBanner />
            <ScrollToTop />
            <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/explore" element={<IndexPage />} />
          {/* Support both old format (/vendor/138) and new format (/vendor/business-name-138) */}
          <Route path="/vendor/:vendorSlug" element={<VendorProfilePage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/booking/:vendorSlug" element={<BookingPage />} />
          <Route path="/become-a-vendor" element={<BecomeVendorLanding />} />
          <Route path="/become-a-vendor/setup" element={<BecomeVendorPage />} />
          <Route path="/invoice/:invoiceId" element={<InvoicePage />} />
          <Route path="/invoice/booking/:bookingId" element={<InvoicePage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/help-centre" element={<HelpCentrePage />} />
          <Route path="/help-centre/category/:categorySlug" element={<HelpCentrePage />} />
          <Route path="/help-centre/category/:categorySlug/article/:articleId" element={<HelpCentrePage />} />
          <Route path="/help-centre/article/:articleSlug" element={<HelpCentreArticlePage />} />
          {/* Deep link routes for bookings/payments/reviews */}
          <Route path="/dashboard/booking/:bookingId" element={<ProtectedDeepLink section="bookings" />} />
          <Route path="/dashboard/review/:bookingId" element={<ProtectedDeepLink section="reviews" />} />
          {/* Centralized deep link validation for all email buttons */}
          <Route path="/link/:linkType/:resourceId" element={<DeepLinkPage />} />
          {/* Direct payment page - standalone route for email links */}
          <Route path="/payment/:bookingId" element={<PaymentPage />} />
          {/* Direct review page - standalone route for email links */}
          <Route path="/review/:bookingId" element={<ReviewPage />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/forum/:slug" element={<ForumPage />} />
          <Route path="/forum/post/:slug" element={<ForumPostPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* Admin Dashboard - Protected route for admin users only */}
          <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
          <Route path="/admin/:section" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
          {/* Dedicated Client Pages with vertical sidebar navigation */}
          <Route path="/client/bookings" element={<ClientBookingsPage />} />
          <Route path="/client/messages" element={<ClientMessagesPage />} />
          <Route path="/client/favorites" element={<ClientFavoritesPage />} />
          <Route path="/client/reviews" element={<ClientReviewsPage />} />
          <Route path="/client/invoices" element={<ClientInvoicesPage />} />
          <Route path="/client/settings" element={<ClientSettingsPage />} />
          <Route path="/client/settings/profile" element={<ClientSettingsProfilePage />} />
          <Route path="/client/settings/personal" element={<ClientSettingsPersonalPage />} />
                    <Route path="/client/settings/communication" element={<ClientSettingsCommunicationPage />} />
          <Route path="/client/settings/language" element={<ClientSettingsLanguagePage />} />
          <Route path="/client/settings/privacy" element={<ClientSettingsPrivacyPage />} />
          <Route path="/client/settings/security" element={<ClientSettingsSecurityPage />} />
          <Route path="/client/settings/delete" element={<ClientSettingsDeletePage />} />
          <Route path="/client/settings/cookies" element={<ClientSettingsCookiesPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPage />} />
          {/* Browse page routes for category/city/discovery filtering */}
          <Route path="/browse/:filter" element={<BrowsePage />} />
          <Route path="/browse/:filter/:subfilter" element={<BrowsePage />} />
          <Route path="/unsubscribe/:token" element={<UnsubscribePage />} />
          <Route path="/email-preferences/:token" element={<EmailPreferencesPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/auth/facebook/callback" element={<FacebookCallback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <CookieConsent />
            </Router>
          </SessionTimeoutProvider>
        </AlertProvider>
      </AuthProvider>
    </LocalizationProvider>
  );
}

export default App;
