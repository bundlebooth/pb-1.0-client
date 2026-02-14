import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { showBanner } from '../utils/helpers';
import './BecomeVendorPage.css';

const BecomeVendorPage = () => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [vendorProfileId, setVendorProfileId] = useState(null);
  
  // Form data state
  const [formData, setFormData] = useState({
    // Step 1: Account (handled separately - must be logged in)
    
    // Step 2: Business Type & Categories
    primaryCategory: '',
    additionalCategories: [],
    
    // Step 3: Business Details
    businessName: '',
    displayName: '',
    businessDescription: '',
    yearsInBusiness: '',
    
    // Step 4: Contact Information
    businessPhone: '',
    website: '',
    email: currentUser?.email || '',
    
    // Step 5: Location (with Google Maps)
    address: '',
    city: '',
    state: '',
    country: 'Canada',
    postalCode: '',
    latitude: null,
    longitude: null,
    serviceAreas: [],
    
    // Step 6: Services & Pricing
    services: [],
    
    // Step 7: Business Hours
    businessHours: {
      monday: { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
      tuesday: { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
      wednesday: { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
      thursday: { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
      friday: { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
      saturday: { isAvailable: false, openTime: '10:00', closeTime: '16:00' },
      sunday: { isAvailable: false, openTime: '10:00', closeTime: '16:00' }
    },
    
    // Step 8: Vendor Questionnaire (features)
    selectedFeatures: [],
    
    // Step 9: Gallery & Media
    uploadedPhotos: [],
    photoURLs: [],
    
    // Step 10: Social Media
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    tiktok: '',
    
    // Step 11: Popular Filters
    selectedFilters: [],
    
    // Step 12: Policies & FAQs
    cancellationPolicy: '',
    depositPercentage: '',
    paymentTerms: '',
    faqs: []
  });

  // Available categories
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

  // Canadian provinces
  const canadianProvinces = [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
    'Quebec', 'Saskatchewan', 'Yukon'
  ];

  // Canadian cities
  const canadianCities = [
    'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 
    'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener',
    'London', 'Victoria', 'Halifax', 'Oshawa', 'Windsor'
  ];

  // Popular filters options
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
      title: 'Create Your Account',
      subtitle: 'Sign up or log in to get started',
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
      subtitle: 'Set your business address using Google Maps',
      component: LocationStep,
      required: true
    },
    {
      id: 'services',
      title: 'What services do you provide?',
      subtitle: 'Add your services and pricing',
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
    // Check if user is logged in
    if (!currentUser) {
      setCurrentStep(0); // Start at account step
    } else if (currentStep === 0) {
      setCurrentStep(1); // Skip account step if already logged in
    }
  }, [currentUser]);

  useEffect(() => {
    // Scroll to top on step change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    // Validation for required steps
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
    if (currentStep === 3) {
      if (!formData.businessPhone.trim()) {
        showBanner('Please enter your business phone number', 'error');
        return;
      }
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

      // Create vendor profile with all data
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
        categories: [formData.primaryCategory, ...formData.additionalCategories],
        serviceAreas: formData.serviceAreas.length > 0 ? formData.serviceAreas : [formData.city],
        services: formData.services,
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
      
      // Update user context
      setCurrentUser(prev => ({
        ...prev,
        isVendor: true,
        vendorProfileId: result.vendorProfileId
      }));

      showBanner('Vendor profile created successfully! 🎉', 'success');
      
      // Navigate to dashboard
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
      {/* Header */}
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

      {/* Progress bar */}
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Main content */}
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
              categories={availableCategories}
              provinces={canadianProvinces}
              cities={canadianCities}
              filterOptions={filterOptions}
              setFormData={setFormData}
              vendorProfileId={vendorProfileId}
              setVendorProfileId={setVendorProfileId}
            />
          </div>
        </div>
      </main>

      {/* Footer navigation */}
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

// Step Components will be defined below...
// (Continuing in next part due to length)

export default BecomeVendorPage;
