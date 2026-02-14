import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import BusinessInformationPanel from '../panels/BusinessInformationPanel';
import LocationServiceAreasPanel from '../panels/LocationServiceAreasPanel';
import ServicesPackagesPanel from '../panels/ServicesPackagesPanel';
import SocialMediaPanel from '../panels/SocialMediaPanel';
import GalleryMediaPanel from '../panels/GalleryMediaPanel';
import AvailabilityHoursPanel from '../panels/AvailabilityHoursPanel';
import StripeSetupPanel from '../panels/StripeSetupPanel';
import GoogleReviewsPanel from '../panels/GoogleReviewsPanel';
import CategoryServicesPanel from '../panels/CategoryServicesPanel';
import FAQsPanel from '../panels/FAQsPanel';
import BookingSettingsPanel from '../panels/BookingSettingsPanel';
import CommunicationPreferencesPanel from '../panels/CommunicationPreferencesPanel';

// Map panel IDs to URL-friendly keys
const PANEL_URL_MAP = {
  'vendor-profile-panel': 'business-info',
  'vendor-location-panel': 'location',
  'vendor-category-panel': 'category-services',
  'vendor-qa-panel': 'faqs',
  'vendor-services-panel': 'services',
  'vendor-photos-panel': 'gallery',
  'vendor-social-panel': 'social',
  'vendor-availability-panel': 'availability',
  'vendor-booking-settings-panel': 'booking-settings',
  'vendor-google-reviews-panel': 'google-reviews',
  'vendor-stripe-panel': 'stripe',
  'vendor-notifications-panel': 'notifications'
};

// Reverse map for URL to panel ID
const URL_PANEL_MAP = Object.fromEntries(
  Object.entries(PANEL_URL_MAP).map(([k, v]) => [v, k])
);

function VendorBusinessProfileSection() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activePanel, setActivePanel] = useState(null);
  
  // NO FALLBACK - must have vendorProfileId
  const vendorProfileId = currentUser?.vendorProfileId;

  // Read panel from URL on mount and when searchParams change
  useEffect(() => {
    const panelKey = searchParams.get('panel');
    if (panelKey && URL_PANEL_MAP[panelKey]) {
      setActivePanel(URL_PANEL_MAP[panelKey]);
    }
  }, [searchParams]);

  // Update URL when panel changes
  const handlePanelChange = (panelId) => {
    setActivePanel(panelId);
    if (panelId && PANEL_URL_MAP[panelId]) {
      setSearchParams({ section: 'vendor-business-profile', panel: PANEL_URL_MAP[panelId] });
    } else {
      // Going back to menu - remove panel param
      setSearchParams({ section: 'vendor-business-profile' });
    }
  };
  
  // Don't render if no vendorProfileId - MUST be after all hooks
  if (!vendorProfileId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Vendor Profile Not Found</h2>
        <p>Please complete your vendor registration first.</p>
      </div>
    );
  }

  const profileCards = [
    { id: 'vendor-profile-panel', icon: 'fa-building', title: 'Business Information', description: 'Edit your business name, contact info, and about section' },
    { id: 'vendor-location-panel', icon: 'fa-map-marker-alt', title: 'Location & Service Areas', description: 'Set your address and define where you provide services' },
    { id: 'vendor-services-panel', icon: 'fa-briefcase', title: 'Services & Packages', description: 'Create and manage your service packages and pricing' },
    { id: 'vendor-category-panel', icon: 'fa-tags', title: 'Category & Services', description: 'Select your category, features, and answer category-specific questions' },
    { id: 'vendor-booking-settings-panel', icon: 'fa-calendar-check', title: 'Booking Settings', description: 'Configure instant booking, lead time, and cancellation policy' },
    { id: 'vendor-availability-panel', icon: 'fa-clock', title: 'Availability & Hours', description: 'Set your business hours and timezone' },
    { id: 'vendor-photos-panel', icon: 'fa-images', title: 'Gallery & Media', description: 'Upload photos and organize your portfolio albums' },
    { id: 'vendor-stripe-panel', icon: 'fa-stripe', title: 'Stripe Setup', description: 'Connect Stripe to accept online payments and deposits', iconClass: 'fab', useStripeLogo: true },
    { id: 'vendor-qa-panel', icon: 'fa-question-circle', title: 'FAQs', description: 'Add common questions and answers for your clients' },
    { id: 'vendor-google-reviews-panel', icon: 'fa-google', title: 'Google Reviews', description: 'Import and display reviews from your Google Business Profile', iconClass: 'fab', useGoogleLogo: true },
    { id: 'vendor-social-panel', icon: 'fa-share-alt', title: 'Social Media', description: 'Connect your social accounts and add booking links' },
    { id: 'vendor-notifications-panel', icon: 'fa-bell', title: 'Vendor Notifications', description: 'Manage booking alerts, inquiry notifications, and review alerts' }
  ];

  const renderPanel = () => {
    // Use vendorProfileId as key to force component remount when vendor changes
    switch (activePanel) {
      case 'vendor-profile-panel':
        return <BusinessInformationPanel key={vendorProfileId} onBack={() => handlePanelChange(null)} vendorProfileId={vendorProfileId} />;
      case 'vendor-location-panel':
        return <LocationServiceAreasPanel key={vendorProfileId} onBack={() => handlePanelChange(null)} vendorProfileId={vendorProfileId} />;
      case 'vendor-category-panel':
        return <CategoryServicesPanel key={vendorProfileId} onBack={() => handlePanelChange(null)} vendorProfileId={vendorProfileId} />;
      case 'vendor-services-panel':
        return <ServicesPackagesPanel key={vendorProfileId} onBack={() => handlePanelChange(null)} vendorProfileId={vendorProfileId} />;
      case 'vendor-social-panel':
        return <SocialMediaPanel key={vendorProfileId} onBack={() => handlePanelChange(null)} vendorProfileId={vendorProfileId} />;
      case 'vendor-photos-panel':
        return <GalleryMediaPanel key={vendorProfileId} onBack={() => handlePanelChange(null)} vendorProfileId={vendorProfileId} />;
      case 'vendor-qa-panel':
        return <FAQsPanel key={vendorProfileId} onBack={() => handlePanelChange(null)} vendorProfileId={vendorProfileId} />;
      case 'vendor-availability-panel':
        return <AvailabilityHoursPanel key={vendorProfileId} onBack={() => handlePanelChange(null)} vendorProfileId={vendorProfileId} />;
      case 'vendor-booking-settings-panel':
        return <BookingSettingsPanel key={vendorProfileId} onBack={() => handlePanelChange(null)} vendorProfileId={vendorProfileId} />;
      case 'vendor-google-reviews-panel':
        return <GoogleReviewsPanel key={vendorProfileId} onBack={() => handlePanelChange(null)} vendorProfileId={vendorProfileId} />;
      case 'vendor-stripe-panel':
        return <StripeSetupPanel key={vendorProfileId} onBack={() => handlePanelChange(null)} vendorProfileId={vendorProfileId} />;
      case 'vendor-notifications-panel':
        return <CommunicationPreferencesPanel key={vendorProfileId} onBack={() => handlePanelChange(null)} isVendorMode={true} />;
      default:
        return null;
    }
  };

  return (
    <div id="vendor-business-profile-section">
      {!activePanel ? (
        <div className="settings-category">
          <div id="business-profile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="settings-category-title" style={{ marginBottom: 0 }}>Business Profile Management</h2>
            <button 
              className="btn btn-outline" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.6rem 1rem' }}
              onClick={() => window.open(`/vendor/${vendorProfileId}`, '_blank')}
            >
              <i className="fas fa-external-link-alt"></i>
              View your profile
            </button>
          </div>
          <div className="settings-grid">
            {profileCards.map(card => (
              <div 
                key={card.id}
                className="settings-card" 
                data-panel={card.id}
                onClick={() => handlePanelChange(card.id)}
                style={{ cursor: 'pointer', padding: '1rem' }}
              >
                <div style={{ width: '40px', height: '40px', backgroundColor: '#f0f7ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5086E8', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                  {card.useGoogleLogo ? (
                    <img 
                      src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" 
                      alt="Google" 
                      style={{ width: '24px', height: '24px' }}
                    />
                  ) : card.useStripeLogo ? (
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" 
                      alt="Stripe" 
                      style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                    />
                  ) : (
                    <i className={`${card.iconClass || 'fas'} ${card.icon}`}></i>
                  )}
                </div>
                <h3 className="settings-card-title">{card.title}</h3>
                <p className="settings-card-description">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        renderPanel()
      )}
    </div>
  );
}

export default VendorBusinessProfileSection;
