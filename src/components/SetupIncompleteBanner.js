import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

/**
 * SetupIncompleteBanner - Shared banner component for vendor setup status
 * 
 * CRITICAL: This component MUST use the EXACT same data fetching and isStepCompleted
 * logic as BecomeVendorPage.js to ensure both banners show identical results.
 * 
 * The data is fetched using the same endpoints and transformed into the same
 * formData structure that BecomeVendorPage uses.
 * 
 * Props:
 * - steps: Array of step objects from BecomeVendorPage (optional - for inline mode)
 * - isStepCompleted: Function to check if a step is completed (optional - for inline mode)
 * - onStepClick: Callback when a step pill is clicked (optional - for inline mode)
 * - hideButtons: Boolean to hide Complete Profile/Dismiss buttons (optional)
 * - maxWidth: Custom max width for the banner (optional)
 * - showAllSteps: Boolean to always show the banner with all steps even if all complete (optional)
 * - profileStatus: String for profile review status ('draft', 'pending_review', 'approved', 'rejected') (optional)
 */
function SetupIncompleteBanner({ 
  steps: externalSteps, 
  isStepCompleted: externalIsStepCompleted, 
  onStepClick,
  hideButtons = false,
  maxWidth,
  showAllSteps = false,
  profileStatus = 'draft'
}) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  // formData structure MUST match BecomeVendorPage.js exactly
  const [formData, setFormData] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchedProfileStatus, setFetchedProfileStatus] = useState('draft');
  const [completedCollapsed, setCompletedCollapsed] = useState(true);
  const [incompleteCollapsed, setIncompleteCollapsed] = useState(false);
  const fetchStartedRef = useRef(false);

  // Determine if we're in "inline mode" (used within BecomeVendorPage with steps prop)
  const isInlineMode = externalSteps && externalIsStepCompleted;

  // EXACT same step definitions as BecomeVendorPage (excluding account and review)
  // These titles MUST match BecomeVendorPage.js exactly
  const steps = [
    { id: 'categories', title: 'What services do you offer?' },
    { id: 'business-details', title: 'Tell us about your business' },
    { id: 'contact', title: 'How can clients reach you?' },
    { id: 'location', title: 'Where are you located?' },
    { id: 'services', title: 'What services do you provide?' },
    { id: 'cancellation-policy', title: 'Set your cancellation policy' },
    { id: 'business-hours', title: 'When are you available?' },
    { id: 'questionnaire', title: 'Tell guests what your place has to offer' },
    { id: 'gallery', title: 'Add photos to showcase your work' },
    { id: 'social-media', title: 'Connect your social profiles' },
    { id: 'filters', title: 'Enable special badges for your profile' },
    { id: 'stripe', title: 'Connect Stripe for Payments' },
    { id: 'google-reviews', title: 'Connect Google Reviews' },
    { id: 'policies', title: 'Set your policies and answer common questions' }
  ];

  useEffect(() => {
    // Skip API fetch if in inline mode
    if (isInlineMode) {
      setLoading(false);
      return;
    }

    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    // Check if banner was dismissed
    const dismissKey = `vv_hideSetupReminderUntilComplete_${currentUser.id}`;
    if (localStorage.getItem(dismissKey)) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches using ref
    if (fetchStartedRef.current) {
      return;
    }
    fetchStartedRef.current = true;
    fetchVendorData();
  }, [currentUser, isInlineMode]);

  /**
   * Fetch vendor data using EXACT same logic as BecomeVendorPage.js fetchExistingVendorData
   * This includes the same API calls for profile, stripe, filters, and social media
   */
  const fetchVendorData = async () => {
    try {
      // Check if user is a vendor first - BOTH conditions must be true
      // This prevents showing the banner for client-only users
      if (!currentUser.isVendor || !currentUser.vendorProfileId) {
        setLoading(false);
        return;
      }
      
      // Double-check: if isVendor is false, don't show banner regardless of vendorProfileId
      if (currentUser.isVendor === false) {
        setLoading(false);
        return;
      }

      // STEP 1: Fetch main profile data (same as BecomeVendorPage line 326)
      const response = await fetch(`${API_BASE_URL}/vendors/profile?userId=${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) {
        setLoading(false);
        return;
      }

      const result = await response.json();
      
      if (!result.success || !result.data) {
        setLoading(false);
        return;
      }

      const data = result.data;
      const profile = data.profile || {};
      const categories = data.categories || [];
      const services = data.services || [];
      const serviceAreas = data.serviceAreas || [];
      const businessHours = data.businessHours || [];
      const images = data.images || [];
      const selectedFeatures = data.selectedFeatures || [];
      const faqs = data.faqs || [];
      
      // Load profile status for review workflow
      if (profile.ProfileStatus) {
        setFetchedProfileStatus(profile.ProfileStatus);
      }

      // Map business hours from database format to form format (same as BecomeVendorPage lines 366-379)
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const hoursMap = {};
      businessHours.forEach(hour => {
        const dayIndex = typeof hour.DayOfWeek === 'number' ? hour.DayOfWeek : parseInt(hour.DayOfWeek);
        const day = dayNames[dayIndex];
        if (day) {
          hoursMap[day] = {
            isAvailable: hour.IsAvailable || false,
            openTime: hour.OpenTime || '09:00',
            closeTime: hour.CloseTime || '17:00'
          };
        }
      });

      // Extract primary category (same as BecomeVendorPage lines 386-389)
      const primaryCat = categories.find(c => c.IsPrimary)?.Category || categories[0]?.Category || '';

      // Map service areas (same as BecomeVendorPage lines 392-397)
      const mappedServiceAreas = serviceAreas.map(area => ({
        id: area.VendorServiceAreaID,
        name: area.CityName,
        state: area.StateProvince,
        country: area.Country
      }));

      // Extract photo URLs (same as BecomeVendorPage line 400)
      const photoURLs = images.map(img => img.ImageURL || img.imageUrl).filter(Boolean);

      // Convert social media from array to object format (same as BecomeVendorPage lines 353-361)
      let socialMediaObj = {};
      if (data.socialMedia?.length > 0) {
        data.socialMedia.forEach(sm => {
          const platform = sm.Platform?.toLowerCase();
          if (platform) {
            socialMediaObj[platform] = sm.URL || '';
          }
        });
      }

      // Build formData structure EXACTLY like BecomeVendorPage (lines 402-475)
      const updatedFormData = {
        // Categories
        primaryCategory: primaryCat,
        additionalCategories: categories.filter(c => !c.IsPrimary).map(c => c.Category),
        
        // Business Details
        businessName: profile.BusinessName || '',
        displayName: profile.DisplayName || profile.BusinessName || '',
        businessDescription: profile.BusinessDescription || '',
        
        // Contact
        businessPhone: profile.BusinessPhone || '',
        website: profile.Website || '',
        
        // Location
        city: profile.City || '',
        province: profile.State || '',
        serviceAreas: mappedServiceAreas,
        
        // Services
        selectedServices: services.map(s => ({
          id: s.VendorServiceID,
          categoryName: s.CategoryName,
          serviceName: s.ServiceName
        })),
        
        // Business Hours
        businessHours: {
          monday: hoursMap.monday || { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
          tuesday: hoursMap.tuesday || { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
          wednesday: hoursMap.wednesday || { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
          thursday: hoursMap.thursday || { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
          friday: hoursMap.friday || { isAvailable: true, openTime: '09:00', closeTime: '17:00' },
          saturday: hoursMap.saturday || { isAvailable: false, openTime: '10:00', closeTime: '16:00' },
          sunday: hoursMap.sunday || { isAvailable: false, openTime: '10:00', closeTime: '16:00' }
        },
        
        // Gallery
        photoURLs: photoURLs,
        
        // Questionnaire
        selectedFeatures: selectedFeatures,
        
        // Social Media
        facebook: socialMediaObj.facebook || '',
        instagram: socialMediaObj.instagram || '',
        twitter: socialMediaObj.twitter || '',
        linkedin: socialMediaObj.linkedin || '',
        
        // Policies & FAQs
        cancellationPolicy: profile.CancellationPolicy || '',
        depositPercentage: profile.DepositPercentage?.toString() || '',
        paymentTerms: profile.PaymentTerms || '',
        faqs: faqs.map(faq => ({
          id: faq.id || faq.FAQID,
          question: faq.question || faq.Question,
          answer: faq.answer || faq.Answer
        })),
        
        // Google Reviews - googlePlaceId is at top level of API response
        googlePlaceId: result.googlePlaceId || profile.GooglePlaceId || profile.GooglePlaceID || '',
        
        // Stripe (will be updated below)
        stripeConnected: false,
        
        // Filters (will be updated below)
        selectedFilters: []
      };

      // STEP 2: Fetch Stripe status (same as BecomeVendorPage lines 478-489)
      try {
        const stripeRes = await fetch(`${API_BASE_URL}/payments/connect/status/${currentUser.vendorProfileId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (stripeRes.ok) {
          const stripeData = await stripeRes.json();
          updatedFormData.stripeConnected = stripeData.connected || false;
        }
      } catch (e) {
      }

      // STEP 3: Fetch filters (same as BecomeVendorPage lines 492-505)
      try {
        const filtersRes = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/filters`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (filtersRes.ok) {
          const filtersData = await filtersRes.json();
          if (filtersData.filters) {
            updatedFormData.selectedFilters = filtersData.filters.split(',').filter(f => f.trim());
          }
        }
      } catch (e) {
      }

      // STEP 4: Fetch social media from dedicated endpoint (same as BecomeVendorPage lines 508-524)
      try {
        const socialRes = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/social`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (socialRes.ok) {
          const socialData = await socialRes.json();
          updatedFormData.facebook = socialData.facebook || '';
          updatedFormData.instagram = socialData.instagram || '';
          updatedFormData.twitter = socialData.twitter || '';
          updatedFormData.linkedin = socialData.linkedin || '';
        }
      } catch (e) {
      }

      // STEP 4.5: Fetch Google Place ID from dedicated endpoint (more reliable than profile API)
      try {
        const googleRes = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/google-reviews-settings`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (googleRes.ok) {
          const googleData = await googleRes.json();
          updatedFormData.googlePlaceId = googleData.GooglePlaceId || '';
        }
      } catch (e) {
      }

      // STEP 5: Fetch selected features from dedicated endpoint (more reliable than profile API)
      try {
        const featuresRes = await fetch(`${API_BASE_URL}/vendors/features/vendor/${currentUser.vendorProfileId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (featuresRes.ok) {
          const featuresData = await featuresRes.json();
          const featureIds = featuresData.selectedFeatures?.map(f => f.FeatureID) || [];
          updatedFormData.selectedFeatures = featureIds;
        }
      } catch (e) {
      }

      setFormData(updatedFormData);
      setLoading(false);
    } catch (error) {
      console.error('[SetupBanner] Failed to fetch vendor data:', error);
      setLoading(false);
    }
  };

  /**
   * EXACT same isStepCompleted logic as BecomeVendorPage.js lines 726-761
   * This function checks formData exactly like BecomeVendorPage does
   */
  const isStepCompleted = (stepId) => {
    if (!formData) return false;

    switch (stepId) {
      case 'categories':
        // BecomeVendorPage line 733: return !!formData.primaryCategory;
        return !!formData.primaryCategory;
      case 'business-details':
        // BecomeVendorPage line 735: return !!(formData.businessName && formData.displayName);
        return !!(formData.businessName && formData.displayName);
      case 'contact':
        // BecomeVendorPage line 737: return !!formData.businessPhone;
        return !!formData.businessPhone;
      case 'location':
        // BecomeVendorPage line 739: return !!(formData.city && formData.province && formData.serviceAreas.length > 0);
        return !!(formData.city && formData.province && formData.serviceAreas.length > 0);
      case 'services':
        // BecomeVendorPage line 741: return formData.selectedServices.length > 0;
        return formData.selectedServices.length > 0;
      case 'cancellation-policy':
        // Cancellation policy is complete if any policy type is set
        return !!formData.cancellationPolicy;
      case 'business-hours':
        // BecomeVendorPage line 743: return Object.values(formData.businessHours).some(h => h.isAvailable);
        return Object.values(formData.businessHours).some(h => h.isAvailable);
      case 'questionnaire':
        // BecomeVendorPage: Optional - features (if not loaded from DB for existing vendor, return true)
        return formData.selectedFeatures && formData.selectedFeatures.length > 0;
      case 'gallery':
        // BecomeVendorPage: MANDATORY - Must have at least 5 photos uploaded
        return formData.photoURLs && formData.photoURLs.length >= 5;
      case 'social-media':
        // BecomeVendorPage line 749: return !!(formData.facebook || formData.instagram || formData.twitter || formData.linkedin);
        return !!(formData.facebook || formData.instagram || formData.twitter || formData.linkedin);
      case 'filters':
        // BecomeVendorPage line 751: return formData.selectedFilters.length > 0;
        return formData.selectedFilters.length > 0;
      case 'stripe':
        // OPTIONAL (temporarily bypassed): Stripe connection not required for submission
        return true;
      case 'google-reviews':
        // BecomeVendorPage line 755: return !!formData.googlePlaceId;
        return !!formData.googlePlaceId;
      case 'policies':
        // BecomeVendorPage line 757: return !!(formData.cancellationPolicy || formData.depositPercentage || formData.paymentTerms || (formData.faqs && formData.faqs.length > 0));
        return !!(formData.cancellationPolicy || formData.depositPercentage || formData.paymentTerms || (formData.faqs && formData.faqs.length > 0));
      case 'review':
        // Review step is always complete (it's just a summary view)
        return true;
      default:
        return false;
    }
  };

  const handleDismiss = () => {
    const dismissKey = `vv_hideSetupReminderUntilComplete_${currentUser.id}`;
    localStorage.setItem(dismissKey, 'true');
    setDismissed(true);
  };

  const handleContinue = () => {
    // Navigate directly to step-by-step process (skip landing page) for signed-in vendors
    navigate('/become-a-vendor/setup?step=account');
  };

  const handleSectionClick = (stepKey) => {
    // Navigate to specific step directly using URL query param
    navigate(`/become-a-vendor/setup?step=${stepKey}`);
  };

  // Handle step click - use custom handler if provided, otherwise navigate to step
  const handleStepClick = (stepKey) => {
    if (onStepClick) {
      onStepClick(stepKey);
    } else {
      handleSectionClick(stepKey);
    }
  };

  // Calculate steps based on mode
  let incompleteSteps = [];
  let completedSteps = [];
  let totalSteps = 0;

  if (isInlineMode) {
    // Inline mode: Use external steps from BecomeVendorPage
    const filteredSteps = externalSteps.filter(step => step.id !== 'account' && step.id !== 'review');
    incompleteSteps = filteredSteps
      .filter(step => !externalIsStepCompleted(step.id))
      .map(step => ({ key: step.id, label: step.title }));
    completedSteps = filteredSteps
      .filter(step => externalIsStepCompleted(step.id))
      .map(step => ({ key: step.id, label: step.title }));
    totalSteps = filteredSteps.length;

    // If showAllSteps is true, show even when all complete; otherwise hide when all complete
    if (incompleteSteps.length === 0 && !showAllSteps) return null;
  } else {
    // API mode: Use fetched formData with same logic as BecomeVendorPage
    if (loading) {
      return null;
    }
    if (!formData) {
      return null;
    }
    if (dismissed) {
      return null;
    }
    
    incompleteSteps = steps
      .filter(step => !isStepCompleted(step.id))
      .map(step => ({ key: step.id, label: step.title }));
    completedSteps = steps
      .filter(step => isStepCompleted(step.id))
      .map(step => ({ key: step.id, label: step.title }));
    totalSteps = steps.length;

    // If showAllSteps is true, show even when all complete; otherwise hide when all complete
    if (incompleteSteps.length === 0 && !showAllSteps) return null;
  }

  // Determine banner style based on completion status and profile status
  const isAllComplete = incompleteSteps.length === 0;
  
  // Use fetched profile status in API mode, or prop in inline mode
  const currentProfileStatus = isInlineMode ? profileStatus : fetchedProfileStatus;
  
  // Determine banner styles based on profile status
  let bannerStyles;
  let bannerTitle;
  let bannerMessage;
  let bannerIcon;
  
  if (currentProfileStatus === 'pending_review') {
    // Profile submitted for review - show blue/info style
    bannerStyles = {
      background: '#eff6ff',
      border: '1px solid #93c5fd',
      iconColor: '#3b82f6',
      titleColor: '#1e40af',
      textColor: '#1e40af'
    };
    bannerTitle = 'Pending Review';
    bannerMessage = 'Your profile has been submitted for review. Our team will review it shortly and notify you once approved.';
    bannerIcon = 'fa-clock';
  } else if (currentProfileStatus === 'approved') {
    // Profile approved - show light green style
    const hasIncomplete = incompleteSteps.length > 0;
    bannerStyles = {
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      iconColor: '#16a34a',
      titleColor: '#166534',
      textColor: '#166534'
    };
    bannerTitle = 'Profile Live';
    bannerMessage = hasIncomplete 
      ? `Your profile is live and visible to clients. You can continue to update your information anytime. There ${incompleteSteps.length === 1 ? 'is' : 'are'} ${incompleteSteps.length} optional ${incompleteSteps.length === 1 ? 'section' : 'sections'} you may want to complete to improve your profile.`
      : 'Your profile is live and visible to clients. You can continue to update your information anytime.';
    bannerIcon = 'fa-circle-check';
  } else if (currentProfileStatus === 'rejected') {
    // Profile rejected - show red warning style
    bannerStyles = {
      background: '#fef2f2',
      border: '1px solid #fca5a5',
      iconColor: '#ef4444',
      titleColor: '#991b1b',
      textColor: '#991b1b'
    };
    bannerTitle = 'Review Required';
    bannerMessage = 'Your profile was not approved. Please review the feedback and make the necessary changes before resubmitting.';
    bannerIcon = 'fa-exclamation-circle';
  } else if (isAllComplete) {
    // All steps complete but not yet submitted
    bannerStyles = {
      background: '#f0fdf4',
      border: '1px solid #86efac',
      iconColor: '#16a34a',
      titleColor: '#166534',
      textColor: '#166534'
    };
    bannerTitle = 'Profile Complete';
    bannerMessage = 'All sections are complete. Go to the Review step and click "Go Live" to submit your profile for approval!';
    bannerIcon = 'fa-circle-check';
  } else {
    // Steps incomplete
    bannerStyles = {
      background: isInlineMode ? 'transparent' : '#fffbeb',
      border: isInlineMode ? 'none' : '1px solid #fde68a',
      iconColor: '#D97706',
      titleColor: '#92400e',
      textColor: '#92400e'
    };
    bannerTitle = 'Setup Incomplete';
    bannerMessage = 'Your profile will not be visible to clients until all required steps are complete.';
    bannerIcon = 'fa-triangle-exclamation';
  }

  // For inline mode (BecomeVendorPage), use full width simple layout
  // For API mode (main page), use the original card/tile layout
  if (isInlineMode) {
    return (
      <div style={{ width: '100%' }}>
        {/* Title and message - matching app aesthetics */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '0.5rem',
            color: '#111827',
            fontSize: '1.1rem',
            fontWeight: 600
          }}>
            <i className={`fas ${bannerIcon}`} style={{ color: '#f59e0b' }}></i>
            {bannerTitle}
          </div>
          <p style={{ 
            margin: 0, 
            color: '#6b7280', 
            fontSize: '0.95rem',
            lineHeight: 1.5
          }}>
            {bannerMessage}
          </p>
        </div>

        {/* Incomplete Steps Section */}
        {incompleteSteps.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <div 
              style={{ 
                fontWeight: 600, 
                color: '#7c2d12', 
                marginBottom: '1rem', 
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
              onClick={() => setIncompleteCollapsed(!incompleteCollapsed)}
            >
              Incomplete ({incompleteSteps.length}/{totalSteps})
              <i 
                className={`fas fa-chevron-${incompleteCollapsed ? 'down' : 'up'}`} 
                style={{ fontSize: '12px', color: '#7c2d12' }}
              ></i>
            </div>
            {!incompleteCollapsed && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {incompleteSteps.map((step) => {
                  const stepKey = step.key || step;
                  return (
                    <span
                      key={stepKey}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#111827',
                        border: '1px solid #ef4444',
                        borderRadius: '999px',
                        padding: '0.625rem 1.25rem',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => handleStepClick(stepKey)}
                      title={`Click to complete: ${step.label || stepKey}`}
                    >
                      <i className="fas fa-times-circle" style={{ color: '#ef4444', fontSize: '0.9rem' }}></i>
                      {step.label || stepKey}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Completed Steps Section */}
        {completedSteps.length > 0 && (
          <div>
            <div 
              style={{ 
                fontWeight: 600, 
                color: '#166534', 
                marginBottom: '1rem', 
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
              onClick={() => setCompletedCollapsed(!completedCollapsed)}
            >
              Completed ({completedSteps.length}/{totalSteps})
              <i 
                className={`fas fa-chevron-${completedCollapsed ? 'down' : 'up'}`} 
                style={{ fontSize: '12px', color: '#166534' }}
              ></i>
            </div>
            {!completedCollapsed && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {completedSteps.map((step) => {
                  const stepKey = step.key || step;
                  return (
                    <span
                      key={stepKey}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#111827',
                        border: '1px solid #10b981',
                        borderRadius: '999px',
                        padding: '0.625rem 1.25rem',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => handleStepClick(stepKey)}
                      title={`Review: ${step.label || stepKey}`}
                    >
                      <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '0.9rem' }}></i>
                      {step.label || stepKey}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // API mode (main page) - original card/tile layout
  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      padding: '16px',
      background: bannerStyles.background,
      border: bannerStyles.border,
      borderRadius: '8px',
      marginBottom: '1rem',
      position: 'relative'
    }}>
      {/* Close/Dismiss Button */}
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
          fontSize: '18px',
          color: '#9ca3af',
          lineHeight: 1,
          borderRadius: '4px',
          transition: 'all 0.15s'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(0,0,0,0.05)';
          e.target.style.color = '#6b7280';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'none';
          e.target.style.color = '#9ca3af';
        }}
        title="Dismiss banner"
        aria-label="Dismiss banner"
      >
        ×
      </button>
      <div style={{ fontSize: '20px', lineHeight: 1, color: bannerStyles.iconColor }}>
        <i className={`fas ${bannerIcon}`}></i>
      </div>
      <div style={{ flex: 1, paddingRight: '24px' }}>
        <div style={{ fontWeight: 700, color: bannerStyles.titleColor, marginBottom: '4px' }}>{bannerTitle}</div>
        <div style={{ fontSize: '.9rem', color: bannerStyles.textColor, marginBottom: '12px' }}>
          {bannerMessage}
        </div>

        {/* Incomplete Steps Section */}
        {incompleteSteps.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div 
              style={{ 
                fontWeight: 600, 
                color: '#7c2d12', 
                marginBottom: '6px', 
                fontSize: '.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              onClick={() => setIncompleteCollapsed(!incompleteCollapsed)}
            >
              Incomplete ({incompleteSteps.length}/{totalSteps})
              <i 
                className={`fas fa-chevron-${incompleteCollapsed ? 'down' : 'up'}`} 
                style={{ fontSize: '10px', color: '#7c2d12' }}
              ></i>
            </div>
            {!incompleteCollapsed && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {incompleteSteps.map((step) => {
                  const stepKey = step.key || step;
                  return (
                    <span
                      key={stepKey}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#111827',
                        border: '1px solid #ef4444',
                        borderRadius: '999px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleStepClick(stepKey)}
                      title={`Click to complete: ${step.label || stepKey}`}
                    >
                      <i className="fas fa-times-circle" style={{ color: '#ef4444' }}></i>
                      {step.label || stepKey}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Completed Steps Section */}
        {completedSteps.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <div 
              style={{ 
                fontWeight: 600, 
                color: '#166534', 
                marginBottom: '6px', 
                fontSize: '.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              onClick={() => setCompletedCollapsed(!completedCollapsed)}
            >
              Completed ({completedSteps.length}/{totalSteps})
              <i 
                className={`fas fa-chevron-${completedCollapsed ? 'down' : 'up'}`} 
                style={{ fontSize: '10px', color: '#166534' }}
              ></i>
            </div>
            {!completedCollapsed && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {completedSteps.map((step) => {
                  const stepKey = step.key || step;
                  return (
                    <span
                      key={stepKey}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#111827',
                        border: '1px solid #10b981',
                        borderRadius: '999px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleStepClick(stepKey)}
                      title={`Review: ${step.label || stepKey}`}
                    >
                      <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i>
                      {step.label || stepKey}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Complete Profile Button - only show if not all complete and buttons not hidden */}
        {!hideButtons && !isAllComplete && (
          <div style={{ marginTop: '16px' }}>
            <button 
              onClick={handleContinue}
              style={{
                background: '#222222',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '.9rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Complete Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SetupIncompleteBanner;
