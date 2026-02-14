import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { showBanner } from '../utils/helpers';
import './BecomeVendorPage.css';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

const BecomeVendorPage = () => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(currentUser ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    // Categories
    primaryCategory: '',
    additionalCategories: [],
    
    // Business Details
    businessName: '',
    displayName: '',
    businessDescription: '',
    yearsInBusiness: '',
    
    // Contact
    businessPhone: '',
    website: '',
    email: currentUser?.email || '',
    
    // Location
    address: '',
    city: '',
    state: '',
    country: 'Canada',
    postalCode: '',
    latitude: null,
    longitude: null,
    serviceAreas: [],
    
    // Services (category-based selection)
    selectedServices: [],
    
    // Business Hours
    businessHours: {
      monday: { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
      tuesday: { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
      wednesday: { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
      thursday: { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
      friday: { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
      saturday: { isAvailable: false, openTime: '10:00', closeTime: '16:00' },
      sunday: { isAvailable: false, openTime: '10:00', closeTime: '16:00' }
    },
    
    // Vendor Questionnaire
    selectedFeatures: [],
    
    // Gallery
    uploadedPhotos: [],
    photoURLs: [],
    
    // Social Media
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    tiktok: '',
    
    // Popular Filters
    selectedFilters: [],
    
    // Policies & FAQs
    cancellationPolicy: '',
    depositPercentage: '',
    paymentTerms: '',
    faqs: []
  });

  // Available categories - matching database
  const availableCategories = [
    { id: 'Venue', name: 'Venue', icon: '🏛️', description: 'Event spaces and locations' },
    { id: 'Catering', name: 'Catering', icon: '🍽️', description: 'Food and beverage services' },
    { id: 'Photography', name: 'Photography', icon: '📸', description: 'Photography and videography' },
    { id: 'Music', name: 'Music/DJ', icon: '🎵', description: 'Music and entertainment' },
    { id: 'Decorations', name: 'Decorations', icon: '🎨', description: 'Event decorations and styling' },
    { id: 'Entertainment', name: 'Entertainment', icon: '🎭', description: 'Performers and entertainers' },
    { id: 'Planning', name: 'Event Planning', icon: '📋', description: 'Event planning and coordination' },
    { id: 'Rentals', name: 'Rentals', icon: '🎪', description: 'Equipment and furniture rentals' }
  ];

  const canadianProvinces = [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
    'Quebec', 'Saskatchewan', 'Yukon'
  ];

  const canadianCities = [
    'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 
    'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener',
    'London', 'Victoria', 'Halifax', 'Oshawa', 'Windsor'
  ];

  const filterOptions = [
    { id: 'filter-premium', label: 'Premium', icon: 'fa-crown', color: '#fbbf24' },
    { id: 'filter-eco-friendly', label: 'Eco-Friendly', icon: 'fa-leaf', color: '#10b981' },
    { id: 'filter-award-winning', label: 'Award Winning', icon: 'fa-trophy', color: '#f59e0b' },
    { id: 'filter-last-minute', label: 'Last Minute Availability', icon: 'fa-bolt', color: '#3b82f6' },
    { id: 'filter-certified', label: 'Certified', icon: 'fa-award', color: '#8b5cf6' },
    { id: 'filter-insured', label: 'Insured', icon: 'fa-shield-alt', color: '#10b981' },
    { id: 'filter-local', label: 'Local', icon: 'fa-map-marker-alt', color: '#ef4444' },
    { id: 'filter-accessible', label: 'Accessible', icon: 'fa-wheelchair', color: '#06b6d4' }
  ];

  const steps = [
    {
      id: 'account',
      title: 'Welcome to PlanHive',
      subtitle: currentUser ? `Welcome, ${currentUser.name}!` : 'Please log in to continue',
      component: AccountStep,
      required: true
    },
    {
      id: 'categories',
      title: 'What services do you offer?',
      subtitle: 'Select your primary category and any additional categories',
      component: CategoriesStep,
      required: true
    },
    {
      id: 'business-details',
      title: 'Tell us about your business',
      subtitle: 'Help clients understand what makes you unique',
      component: BusinessDetailsStep,
      required: true
    },
    {
      id: 'contact',
      title: 'How can clients reach you?',
      subtitle: 'Provide your contact information',
      component: ContactStep,
      required: true
    },
    {
      id: 'location',
      title: 'Where are you located?',
      subtitle: 'Set your business address and service areas',
      component: LocationStep,
      required: true
    },
    {
      id: 'services',
      title: 'What services do you provide?',
      subtitle: 'Select services from your categories and set pricing',
      component: ServicesStep,
      required: false,
      skippable: true
    },
    {
      id: 'business-hours',
      title: 'When are you available?',
      subtitle: 'Set your business hours',
      component: BusinessHoursStep,
      required: false,
      skippable: true
    },
    {
      id: 'questionnaire',
      title: 'Vendor Setup Questionnaire',
      subtitle: 'Select features that describe your services',
      component: QuestionnaireStep,
      required: false,
      skippable: true
    },
    {
      id: 'gallery',
      title: 'Gallery & Media',
      subtitle: 'Add photos to showcase your work',
      component: GalleryStep,
      required: false,
      skippable: true
    },
    {
      id: 'social-media',
      title: 'Social Media',
      subtitle: 'Connect your social profiles',
      component: SocialMediaStep,
      required: false,
      skippable: true
    },
    {
      id: 'filters',
      title: 'Popular Filters',
      subtitle: 'Enable special badges for your profile',
      component: FiltersStep,
      required: false,
      skippable: true
    },
    {
      id: 'policies',
      title: 'Policies & FAQs',
      subtitle: 'Set your policies and answer common questions',
      component: PoliciesStep,
      required: false,
      skippable: true
    },
    {
      id: 'review',
      title: 'Review & Complete',
      subtitle: 'Review your information and complete setup',
      component: ReviewStep,
      required: true
    }
  ];

  useEffect(() => {
    // Load Google Maps script
    if (!window.google && GOOGLE_MAPS_API_KEY) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.onload = () => setGoogleMapsLoaded(true);
      document.head.appendChild(script);
    } else if (window.google) {
      setGoogleMapsLoaded(true);
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  useEffect(() => {
    if (currentUser && formData.email === '') {
      setFormData(prev => ({ ...prev, email: currentUser.email }));
    }
  }, [currentUser]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    // Validation
    if (currentStep === 0 && !currentUser) {
      showBanner('Please log in to continue', 'error');
      return;
    }
    if (currentStep === 1 && !formData.primaryCategory) {
      showBanner('Please select a primary category', 'error');
      return;
    }
    if (currentStep === 2) {
      if (!formData.businessName.trim() || !formData.displayName.trim()) {
        showBanner('Please enter business name and display name', 'error');
        return;
      }
    }
    if (currentStep === 3 && !formData.businessPhone.trim()) {
      showBanner('Please enter your business phone number', 'error');
      return;
    }
    if (currentStep === 4) {
      if (!formData.city || !formData.state) {
        showBanner('Please enter your city and province', 'error');
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (!currentUser) {
        showBanner('Please log in to complete setup', 'error');
        return;
      }

      const allCategories = [formData.primaryCategory, ...formData.additionalCategories].filter(Boolean);

      const vendorData = {
        userId: currentUser.id,
        businessName: formData.businessName,
        displayName: formData.displayName,
        businessDescription: formData.businessDescription,
        businessPhone: formData.businessPhone,
        website: formData.website || null,
        yearsInBusiness: parseInt(formData.yearsInBusiness) || 1,
        address: formData.address || null,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postalCode: formData.postalCode || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        primaryCategory: formData.primaryCategory,
        categories: allCategories,
        serviceAreas: formData.serviceAreas.length > 0 ? formData.serviceAreas : [formData.city],
        selectedServices: formData.selectedServices,
        businessHours: formData.businessHours,
        selectedFeatures: formData.selectedFeatures,
        photoURLs: formData.photoURLs,
        socialMedia: {
          facebook: formData.facebook,
          instagram: formData.instagram,
          twitter: formData.twitter,
          linkedin: formData.linkedin,
          youtube: formData.youtube,
          tiktok: formData.tiktok
        },
        filters: formData.selectedFilters,
        cancellationPolicy: formData.cancellationPolicy,
        depositPercentage: formData.depositPercentage ? parseInt(formData.depositPercentage) : null,
        paymentTerms: formData.paymentTerms,
        faqs: formData.faqs
      };

      const response = await fetch(`${API_BASE_URL}/vendors/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(vendorData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create vendor profile');
      }

      const result = await response.json();
      
      setCurrentUser(prev => ({
        ...prev,
        isVendor: true,
        vendorProfileId: result.vendorProfileId
      }));

      showBanner('Vendor profile created successfully! 🎉', 'success');
      
      setTimeout(() => {
        navigate('/?dashboard=vendor-business-profile');
      }, 1500);

    } catch (error) {
      console.error('Error creating vendor profile:', error);
      showBanner(error.message || 'Failed to create vendor profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="become-vendor-page">
      <header className="become-vendor-header">
        <div className="header-content">
          <div className="logo" onClick={() => navigate('/')}>
            <img src="/logo.png" alt="PlanHive" />
          </div>
          <div className="header-actions">
            <button className="btn-text" onClick={() => navigate('/')}>
              Exit
            </button>
          </div>
        </div>
      </header>

      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      </div>

      <main className="become-vendor-main">
        <div className="step-container">
          <div className="step-header">
            <h1 className="step-title">{steps[currentStep].title}</h1>
            <p className="step-subtitle">{steps[currentStep].subtitle}</p>
          </div>

          <div className="step-content">
            <CurrentStepComponent
              formData={formData}
              onInputChange={handleInputChange}
              setFormData={setFormData}
              categories={availableCategories}
              provinces={canadianProvinces}
              cities={canadianCities}
              filterOptions={filterOptions}
              googleMapsLoaded={googleMapsLoaded}
              currentUser={currentUser}
            />
          </div>
        </div>
      </main>

      <footer className="become-vendor-footer">
        <div className="footer-content">
          <button
            className="btn-back"
            onClick={handleBack}
            disabled={currentStep === 0}
            style={{ visibility: currentStep === 0 ? 'hidden' : 'visible' }}
          >
            Back
          </button>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {steps[currentStep]?.skippable && (
              <button
                className="btn-skip"
                onClick={handleNext}
                disabled={loading}
              >
                Skip for now
              </button>
            )}
            
            <button
              className="btn-next"
              onClick={currentStep === steps.length - 1 ? handleSubmit : handleNext}
              disabled={loading || (currentStep === 0 && !currentUser)}
            >
              {loading ? (
                <span className="spinner-small"></span>
              ) : currentStep === steps.length - 1 ? (
                'Complete Setup'
              ) : (
                'Next'
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

// STEP COMPONENTS BELOW
// Due to file size, I'll add these as inline components

function AccountStep({ currentUser }) {
  if (currentUser) {
    return (
      <div className="account-step">
        <div className="welcome-message">
          <div className="welcome-icon">✓</div>
          <h2>You're all set, {currentUser.name}!</h2>
          <p>Let's set up your vendor profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-step">
      <div className="login-prompt">
        <div className="prompt-icon">🔐</div>
        <h2>Please Log In</h2>
        <p>You need to be logged in to create a vendor profile.</p>
        <p className="help-text">
          Click the "Exit" button above to return to the home page and log in or create an account.
        </p>
      </div>
    </div>
  );
}

function CategoriesStep({ formData, onInputChange, categories }) {
  const handlePrimaryChange = (categoryId) => {
    onInputChange('primaryCategory', categoryId);
    const newAdditional = formData.additionalCategories.filter(c => c !== categoryId);
    onInputChange('additionalCategories', newAdditional);
  };

  const handleAdditionalToggle = (categoryId) => {
    if (categoryId === formData.primaryCategory) return;
    
    const newAdditional = formData.additionalCategories.includes(categoryId)
      ? formData.additionalCategories.filter(c => c !== categoryId)
      : [...formData.additionalCategories, categoryId];
    
    onInputChange('additionalCategories', newAdditional);
  };

  return (
    <div className="categories-step">
      <div className="step-info-banner">
        <p>💡 Select one primary category that best describes your business, then add any additional categories that apply.</p>
      </div>

      <h3 style={{ marginBottom: '1rem', color: '#222' }}>Primary Category *</h3>
      <div className="categories-grid">
        {categories.map(category => (
          <div
            key={category.id}
            className={`category-card ${formData.primaryCategory === category.id ? 'selected primary' : ''}`}
            onClick={() => handlePrimaryChange(category.id)}
          >
            <div className="category-icon">{category.icon}</div>
            <h4 className="category-name">{category.name}</h4>
            <p className="category-description">{category.description}</p>
            {formData.primaryCategory === category.id && (
              <div className="primary-badge">Primary</div>
            )}
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#222' }}>Additional Categories (Optional)</h3>
      <div className="additional-categories">
        {categories
          .filter(c => c.id !== formData.primaryCategory)
          .map(category => (
            <label key={category.id} className="checkbox-card">
              <input
                type="checkbox"
                checked={formData.additionalCategories.includes(category.id)}
                onChange={() => handleAdditionalToggle(category.id)}
              />
              <span className="checkbox-icon">{category.icon}</span>
              <span className="checkbox-label">{category.name}</span>
            </label>
          ))}
      </div>
    </div>
  );
}

// Continue with remaining step components in next message due to length...

export default BecomeVendorPage;
