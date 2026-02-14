import React, { useState, useEffect } from 'react';
import adminApi from '../../services/adminApi';
import { ReviewStep } from '../VendorOnboarding';
import { formatDate } from '../../utils/formatUtils';
import './VendorApprovalPreview.css';

/**
 * VendorApprovalPreview - Read-only view of vendor's become-a-vendor submission
 * Allows admin to navigate through steps or view summary
 */
function VendorApprovalPreview({ vendorId, vendor, onApprove, onReject, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vendorData, setVendorData] = useState(null);
  const [formData, setFormData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [viewMode, setViewMode] = useState('steps'); // 'steps' or 'summary'

  // Step definitions matching BecomeVendorPage
  const steps = [
    { id: 'categories', name: 'Categories', icon: 'fa-tags' },
    { id: 'business-details', name: 'Business Details', icon: 'fa-building' },
    { id: 'contact', name: 'Contact', icon: 'fa-address-card' },
    { id: 'location', name: 'Location', icon: 'fa-map-marker-alt' },
    { id: 'services', name: 'Services', icon: 'fa-concierge-bell' },
    { id: 'business-hours', name: 'Business Hours', icon: 'fa-clock' },
    { id: 'gallery', name: 'Gallery', icon: 'fa-images' },
    { id: 'social-media', name: 'Social Media', icon: 'fa-share-alt' },
    { id: 'policies', name: 'Policies', icon: 'fa-file-contract' }
  ];

  // Available categories - IDs match DB directly
  const availableCategories = [
    { id: 'venue', name: 'Venues' },
    { id: 'photo', name: 'Photography' },
    { id: 'video', name: 'Videography' },
    { id: 'music', name: 'Music' },
    { id: 'dj', name: 'DJ' },
    { id: 'catering', name: 'Catering' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'experiences', name: 'Experiences' },
    { id: 'decorations', name: 'Decorations' },
    { id: 'beauty', name: 'Beauty' },
    { id: 'cake', name: 'Cake' },
    { id: 'transportation', name: 'Transportation' },
    { id: 'planners', name: 'Planners' },
    { id: 'fashion', name: 'Fashion' },
    { id: 'stationery', name: 'Stationery' }
  ];

  useEffect(() => {
    fetchVendorData();
  }, [vendorId]);

  const fetchVendorData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getVendorApprovalDetails(vendorId);
      setVendorData(data);
      
      // Transform API data to formData format expected by step components
      const transformed = transformToFormData(data);
      setFormData(transformed);
    } catch (err) {
      console.error('Error fetching vendor data:', err);
      setError(err.message || 'Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  };

  // Transform API response to formData format
  const transformToFormData = (data) => {
    const profile = data.profile || {};
    const categories = data.categories || [];
    const services = data.services || [];
    const images = data.images || [];
    const businessHours = data.businessHours || [];
    const socialMedia = data.socialMedia || [];
    const serviceAreas = data.serviceAreas || [];
    const features = data.features || [];
    const faqs = data.faqs || [];

    // Map category names to IDs
    const categoryNameToId = {
      'Venues': 'venue', 'Photo/Video': 'photo', 'Music/DJ': 'music',
      'Catering': 'catering', 'Entertainment': 'entertainment', 'Experiences': 'experiences',
      'Decorations': 'decor', 'Beauty': 'beauty', 'Cake': 'cake',
      'Transportation': 'transport', 'Planners': 'planner', 'Fashion': 'fashion', 'Stationery': 'stationery'
    };

    const primaryCat = categories.find(c => c.IsPrimary) || categories[0];
    const primaryCategoryId = primaryCat ? (categoryNameToId[primaryCat.Category || primaryCat.CategoryName] || primaryCat.CategoryID) : '';

    // Transform business hours
    const hoursMap = {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    businessHours.forEach(h => {
      const dayName = (h.DayOfWeek || h.Day || '').toLowerCase();
      if (dayName) {
        hoursMap[dayName] = {
          isAvailable: !h.IsClosed,
          openTime: h.OpenTime || '09:00',
          closeTime: h.CloseTime || '17:00'
        };
      }
    });

    // Transform social media
    const socialMap = {};
    socialMedia.forEach(sm => {
      const platform = (sm.Platform || '').toLowerCase();
      if (platform) socialMap[platform] = sm.URL || sm.Url;
    });

    return {
      primaryCategory: primaryCategoryId,
      selectedSubcategories: categories.filter(c => !c.IsPrimary).map(c => c.SubcategoryName || c.Category),
      businessName: profile.BusinessName || '',
      displayName: profile.DisplayName || profile.BusinessName || '',
      businessDescription: profile.Description || '',
      yearsInBusiness: profile.YearsInBusiness || '',
      priceRange: profile.PriceRange || '',
      profileLogo: profile.LogoURL || '',
      businessPhone: profile.BusinessPhone || profile.Phone || '',
      website: profile.Website || '',
      email: profile.BusinessEmail || data.ownerInfo?.OwnerEmail || '',
      address: profile.Address || '',
      city: profile.City || '',
      province: profile.State || profile.Province || '',
      country: profile.Country || 'Canada',
      postalCode: profile.PostalCode || '',
      latitude: profile.Latitude,
      longitude: profile.Longitude,
      serviceAreas: serviceAreas.map(a => ({ city: a.City || a.AreaName, province: a.State || a.Province })),
      selectedServices: services.map(s => ({
        id: s.PackageID || s.ServiceID,
        name: s.Name || s.ServiceName,
        description: s.Description,
        price: s.Price || s.BasePrice,
        duration: s.Duration,
        capacity: s.Capacity
      })),
      businessHours: {
        monday: hoursMap.monday || { isAvailable: false },
        tuesday: hoursMap.tuesday || { isAvailable: false },
        wednesday: hoursMap.wednesday || { isAvailable: false },
        thursday: hoursMap.thursday || { isAvailable: false },
        friday: hoursMap.friday || { isAvailable: false },
        saturday: hoursMap.saturday || { isAvailable: false },
        sunday: hoursMap.sunday || { isAvailable: false }
      },
      selectedFeatures: features.map(f => f.FeatureName || f.Name),
      photoURLs: images.map(img => img.ImageURL || img.URL),
      facebook: socialMap.facebook || '',
      instagram: socialMap.instagram || '',
      twitter: socialMap.twitter || socialMap.x || '',
      linkedin: socialMap.linkedin || '',
      youtube: socialMap.youtube || '',
      tiktok: socialMap.tiktok || '',
      cancellationPolicy: profile.CancellationPolicy || '',
      depositPercentage: profile.DepositPercentage || '',
      paymentTerms: profile.PaymentTerms || '',
      faqs: faqs.map(f => ({ question: f.Question, answer: f.Answer })),
      stripeConnected: profile.StripeConnected || false
    };
  };

  const renderStepContent = () => {
    if (!formData) return null;
    const step = steps[currentStep];

    switch (step.id) {
      case 'categories':
        return (
          <div className="preview-section">
            <h4>Primary Category</h4>
            <div className="preview-value highlight">
              {availableCategories.find(c => c.id === formData.primaryCategory)?.name || formData.primaryCategory || 'Not selected'}
            </div>
            {formData.selectedSubcategories?.length > 0 && (
              <>
                <h4>Subcategories</h4>
                <div className="preview-tags">
                  {formData.selectedSubcategories.map((sub, idx) => (
                    <span key={idx} className="preview-tag">{typeof sub === 'object' ? sub.name : sub}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case 'business-details':
        return (
          <div className="preview-section">
            <div className="preview-grid">
              <div className="preview-field">
                <label>Business Name</label>
                <div className="preview-value">{formData.businessName || 'Not provided'}</div>
              </div>
              <div className="preview-field">
                <label>Display Name</label>
                <div className="preview-value">{formData.displayName || 'Not provided'}</div>
              </div>
              <div className="preview-field">
                <label>Years in Business</label>
                <div className="preview-value">{formData.yearsInBusiness || 'Not provided'}</div>
              </div>
              <div className="preview-field">
                <label>Price Range</label>
                <div className="preview-value">{formData.priceRange || 'Not provided'}</div>
              </div>
            </div>
            <div className="preview-field full-width">
              <label>Description</label>
              <div className="preview-value description">{formData.businessDescription || 'No description provided'}</div>
            </div>
            {formData.profileLogo && (
              <div className="preview-field">
                <label>Logo</label>
                <img src={formData.profileLogo} alt="Business Logo" className="preview-logo" />
              </div>
            )}
          </div>
        );

      case 'contact':
        return (
          <div className="preview-section">
            <div className="preview-grid">
              <div className="preview-field">
                <label>Phone</label>
                <div className="preview-value">{formData.businessPhone || 'Not provided'}</div>
              </div>
              <div className="preview-field">
                <label>Email</label>
                <div className="preview-value">{formData.email || 'Not provided'}</div>
              </div>
              <div className="preview-field">
                <label>Website</label>
                <div className="preview-value">
                  {formData.website ? (
                    <a href={formData.website} target="_blank" rel="noopener noreferrer">{formData.website}</a>
                  ) : 'Not provided'}
                </div>
              </div>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="preview-section">
            <div className="preview-grid">
              <div className="preview-field">
                <label>Address</label>
                <div className="preview-value">{formData.address || 'Not provided'}</div>
              </div>
              <div className="preview-field">
                <label>City</label>
                <div className="preview-value">{formData.city || 'Not provided'}</div>
              </div>
              <div className="preview-field">
                <label>Province/State</label>
                <div className="preview-value">{formData.province || 'Not provided'}</div>
              </div>
              <div className="preview-field">
                <label>Country</label>
                <div className="preview-value">{formData.country || 'Not provided'}</div>
              </div>
              <div className="preview-field">
                <label>Postal Code</label>
                <div className="preview-value">{formData.postalCode || 'Not provided'}</div>
              </div>
            </div>
            {formData.serviceAreas?.length > 0 && (
              <>
                <h4>Service Areas</h4>
                <div className="preview-tags">
                  {formData.serviceAreas.map((area, idx) => (
                    <span key={idx} className="preview-tag">
                      {typeof area === 'string' ? area : `${area.city}, ${area.province}`}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case 'services':
        return (
          <div className="preview-section">
            {formData.selectedServices?.length > 0 ? (
              <div className="preview-services">
                {formData.selectedServices.map((service, idx) => (
                  <div key={idx} className="preview-service-card">
                    <div className="service-header">
                      <h5>{service.name}</h5>
                      <span className="service-price">${service.price}</span>
                    </div>
                    {service.description && <p className="service-description">{service.description}</p>}
                    <div className="service-meta">
                      {service.duration && <span><i className="fas fa-clock"></i> {service.duration} min</span>}
                      {service.capacity && <span><i className="fas fa-users"></i> Up to {service.capacity}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="preview-empty">No services added</div>
            )}
          </div>
        );

      case 'business-hours':
        return (
          <div className="preview-section">
            <div className="preview-hours">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                const hours = formData.businessHours?.[day];
                return (
                  <div key={day} className={`hours-row ${hours?.isAvailable ? 'open' : 'closed'}`}>
                    <span className="day-name">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                    <span className="hours-value">
                      {hours?.isAvailable ? `${hours.openTime} - ${hours.closeTime}` : 'Closed'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'gallery':
        return (
          <div className="preview-section">
            {formData.photoURLs?.length > 0 ? (
              <div className="preview-gallery">
                {formData.photoURLs.map((url, idx) => (
                  <div key={idx} className="gallery-item">
                    <img src={url} alt={`Photo ${idx + 1}`} onError={(e) => { e.target.src = 'https://via.placeholder.com/200?text=No+Image'; }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="preview-empty">No photos uploaded</div>
            )}
          </div>
        );

      case 'social-media':
        return (
          <div className="preview-section">
            <div className="preview-social">
              {formData.facebook && (
                <a href={formData.facebook} target="_blank" rel="noopener noreferrer" className="social-link facebook">
                  <i className="fab fa-facebook"></i> Facebook
                </a>
              )}
              {formData.instagram && (
                <a href={formData.instagram} target="_blank" rel="noopener noreferrer" className="social-link instagram">
                  <i className="fab fa-instagram"></i> Instagram
                </a>
              )}
              {formData.twitter && (
                <a href={formData.twitter} target="_blank" rel="noopener noreferrer" className="social-link twitter">
                  <i className="fab fa-x-twitter"></i> X/Twitter
                </a>
              )}
              {formData.linkedin && (
                <a href={formData.linkedin} target="_blank" rel="noopener noreferrer" className="social-link linkedin">
                  <i className="fab fa-linkedin"></i> LinkedIn
                </a>
              )}
              {formData.youtube && (
                <a href={formData.youtube} target="_blank" rel="noopener noreferrer" className="social-link youtube">
                  <i className="fab fa-youtube"></i> YouTube
                </a>
              )}
              {formData.tiktok && (
                <a href={formData.tiktok} target="_blank" rel="noopener noreferrer" className="social-link tiktok">
                  <i className="fab fa-tiktok"></i> TikTok
                </a>
              )}
              {!formData.facebook && !formData.instagram && !formData.twitter && !formData.linkedin && !formData.youtube && !formData.tiktok && (
                <div className="preview-empty">No social media links added</div>
              )}
            </div>
          </div>
        );

      case 'policies':
        return (
          <div className="preview-section">
            <div className="preview-field full-width">
              <label>Cancellation Policy</label>
              <div className="preview-value">{formData.cancellationPolicy || 'Not provided'}</div>
            </div>
            <div className="preview-grid">
              <div className="preview-field">
                <label>Deposit Percentage</label>
                <div className="preview-value">{formData.depositPercentage ? `${formData.depositPercentage}%` : 'Not provided'}</div>
              </div>
              <div className="preview-field">
                <label>Payment Terms</label>
                <div className="preview-value">{formData.paymentTerms || 'Not provided'}</div>
              </div>
            </div>
            {formData.faqs?.length > 0 && (
              <>
                <h4>FAQs</h4>
                <div className="preview-faqs">
                  {formData.faqs.map((faq, idx) => (
                    <div key={idx} className="faq-item">
                      <div className="faq-question"><i className="fas fa-question-circle"></i> {faq.question}</div>
                      <div className="faq-answer">{faq.answer}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      default:
        return <div className="preview-empty">Step content not available</div>;
    }
  };

  if (loading) {
    return (
      <div className="vendor-approval-preview">
        <div className="preview-loading">
          <div className="loading-spinner"></div>
          <p>Loading vendor profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vendor-approval-preview">
        <div className="preview-error">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={fetchVendorData} className="btn-retry">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-approval-preview">
      {/* Header */}
      <div className="preview-header">
        <div className="header-info">
          <h2>{vendorData?.profile?.BusinessName || vendor?.BusinessName}</h2>
          <div className="header-meta">
            <span className="badge pending">Pending Review</span>
            <span className="meta-item"><i className="fas fa-calendar"></i> Applied: {formatDate(vendor?.CreatedAt)}</span>
            {vendorData?.ownerInfo?.OwnerEmail && (
              <span className="meta-item"><i className="fas fa-user"></i> {vendorData.ownerInfo.OwnerName} ({vendorData.ownerInfo.OwnerEmail})</span>
            )}
          </div>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button className={viewMode === 'steps' ? 'active' : ''} onClick={() => setViewMode('steps')}>
              <i className="fas fa-list"></i> Step View
            </button>
            <button className={viewMode === 'summary' ? 'active' : ''} onClick={() => setViewMode('summary')}>
              <i className="fas fa-file-alt"></i> Summary
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="preview-content">
        {viewMode === 'steps' ? (
          <div className="steps-view">
            {/* Step Sidebar */}
            <div className="steps-sidebar">
              {steps.map((step, idx) => (
                <button
                  key={step.id}
                  className={`step-item ${currentStep === idx ? 'active' : ''}`}
                  onClick={() => setCurrentStep(idx)}
                >
                  <i className={`fas ${step.icon}`}></i>
                  <span>{step.name}</span>
                </button>
              ))}
            </div>

            {/* Step Content */}
            <div className="step-content">
              <div className="step-header">
                <h3><i className={`fas ${steps[currentStep].icon}`}></i> {steps[currentStep].name}</h3>
                <div className="step-nav">
                  <button disabled={currentStep === 0} onClick={() => setCurrentStep(s => s - 1)}>
                    <i className="fas fa-chevron-left"></i> Previous
                  </button>
                  <span>{currentStep + 1} / {steps.length}</span>
                  <button disabled={currentStep === steps.length - 1} onClick={() => setCurrentStep(s => s + 1)}>
                    Next <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
              {renderStepContent()}
            </div>
          </div>
        ) : (
          <div className="summary-view">
            {formData && (
              <ReviewStep 
                formData={formData} 
                categories={availableCategories}
                profileStatus="pending_review"
                steps={steps}
                isStepCompleted={() => true}
                filterOptions={[]}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="preview-footer">
        <button className="btn-secondary" onClick={onClose}>
          <i className="fas fa-times"></i> Close
        </button>
        <div className="action-buttons">
          <button className="btn-danger" onClick={onReject}>
            <i className="fas fa-times"></i> Reject
          </button>
          <button className="btn-success" onClick={onApprove}>
            <i className="fas fa-check"></i> Approve
          </button>
        </div>
      </div>
    </div>
  );
}

export default VendorApprovalPreview;
