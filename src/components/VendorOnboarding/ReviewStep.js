import React from 'react';

function ReviewStep({ formData, categories, profileStatus, steps, isStepCompleted, filterOptions }) {
  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  const getBadgeLabel = (filterId) => {
    const filter = filterOptions?.find(f => f.id === filterId);
    return filter ? filter.label : filterId.replace('filter-', '').replace(/-/g, ' ');
  };

  const allCategories = [formData.primaryCategory, ...(formData.additionalCategories || [])].filter(Boolean);
  
  const formatServiceAreas = () => {
    if (!formData.serviceAreas || formData.serviceAreas.length === 0) return null;
    return formData.serviceAreas.map(area => {
      if (typeof area === 'string') return area;
      const city = area.city || area.name || '';
      const province = area.province || area.state || '';
      return [city, province].filter(Boolean).join(', ') || area.formattedAddress || 'Unknown';
    }).join('; ');
  };

  const formatBusinessHours = () => {
    if (!formData.businessHours) return null;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const openDays = days.filter(day => formData.businessHours[day]?.isAvailable !== false);
    if (openDays.length === 0) return 'All days closed';
    if (openDays.length === 7) return 'Open all week';
    return `Open ${openDays.length} days/week`;
  };

  const StatusBadge = ({ isRequired, isComplete }) => (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <span style={{
        padding: '0.25rem 0.5rem',
        background: isRequired ? '#fef3c7' : '#f3f4f6',
        color: isRequired ? '#92400e' : '#6b7280',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {isRequired ? 'Required' : 'Optional'}
      </span>
      {isComplete ? (
        <span style={{ color: '#10b981', fontSize: '0.85rem' }}>
          <i className="fas fa-check-circle"></i>
        </span>
      ) : isRequired ? (
        <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>
          <i className="fas fa-exclamation-circle"></i>
        </span>
      ) : null}
    </div>
  );

  const FieldRow = ({ label, value, isProvided }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem' }}>
      <span style={{ color: '#6b7280' }}>{label}:</span>
      <span style={{ color: isProvided ? '#111827' : '#9ca3af' }}>
        {isProvided ? value : 'Not provided'}
      </span>
    </div>
  );

  const servicesCount = (formData.selectedServices || []).length;
  const socialLinksCount = Object.keys(formData).filter(k => ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'].includes(k) && formData[k]).length;

  return (
    <div className="review-step">
      <div style={{ maxWidth: '100%', width: '100%' }}>
        {/* Required Steps Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ padding: '0.25rem 0.5rem', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Required</span>
            Mandatory Information
          </h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {/* Categories */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Categories</h4>
                <StatusBadge isRequired={true} isComplete={allCategories.length > 0} />
              </div>
              <FieldRow label="Primary" value={getCategoryName(formData.primaryCategory)} isProvided={!!formData.primaryCategory} />
              {formData.additionalCategories?.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <FieldRow label="Additional" value={formData.additionalCategories.map(getCategoryName).join(', ')} isProvided={true} />
                </div>
              )}
            </div>

            {/* Business Details */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Business Details</h4>
                <StatusBadge isRequired={true} isComplete={!!(formData.businessName && formData.displayName)} />
              </div>
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                <FieldRow label="Business Name" value={formData.businessName} isProvided={!!formData.businessName} />
                <FieldRow label="Display Name" value={formData.displayName} isProvided={!!formData.displayName} />
                <FieldRow label="Description" value={formData.businessDescription ? (formData.businessDescription.length > 150 ? formData.businessDescription.substring(0, 150) + '...' : formData.businessDescription) : null} isProvided={!!formData.businessDescription} />
                <FieldRow label="Years in Business" value={formData.yearsInBusiness} isProvided={!!formData.yearsInBusiness} />
              </div>
            </div>

            {/* Contact */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Contact Information</h4>
                <StatusBadge isRequired={true} isComplete={!!(formData.businessPhone && formData.email)} />
              </div>
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                <FieldRow label="Phone" value={formData.businessPhone} isProvided={!!formData.businessPhone} />
                <FieldRow label="Email" value={formData.email} isProvided={!!formData.email} />
                <FieldRow label="Website" value={formData.website} isProvided={!!formData.website} />
              </div>
            </div>

            {/* Location */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Location</h4>
                <StatusBadge isRequired={true} isComplete={!!(formData.city && formData.province && formData.serviceAreas?.length > 0)} />
              </div>
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                <FieldRow label="City" value={formData.city} isProvided={!!formData.city} />
                <FieldRow label="Province" value={formData.province} isProvided={!!formData.province} />
                <FieldRow label="Service Areas" value={formatServiceAreas()} isProvided={!!formatServiceAreas()} />
                <FieldRow label="Address" value={formData.address} isProvided={!!formData.address} />
              </div>
            </div>

            {/* Business Hours */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Business Hours</h4>
                <StatusBadge isRequired={true} isComplete={!!formatBusinessHours()} />
              </div>
              {formData.businessHours ? (
                <div style={{ display: 'grid', gap: '0.25rem', fontSize: '0.85rem' }}>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                    const hours = formData.businessHours[day];
                    return (
                      <div key={day} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>{day}</span>
                        <span style={{ color: hours?.isAvailable ? '#111827' : '#9ca3af' }}>
                          {hours?.isAvailable ? `${hours.openTime || '9:00 AM'} - ${hours.closeTime || '5:00 PM'}` : 'Closed'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Not set</span>
              )}
            </div>

            {/* Photos */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Photos</h4>
                <StatusBadge isRequired={true} isComplete={(formData.photoURLs || []).length >= 5} />
              </div>
              {(formData.photoURLs || []).length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
                  {(formData.photoURLs || []).slice(0, 8).map((photo, idx) => (
                    <div key={idx} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                      <img src={typeof photo === 'string' ? photo : photo.url} alt={`Photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                  {(formData.photoURLs || []).length > 8 && (
                    <div style={{ aspectRatio: '1', borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
                      +{(formData.photoURLs || []).length - 8} more
                    </div>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>No photos uploaded</span>
              )}
            </div>

            {/* Stripe */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Stripe Payments</h4>
                <StatusBadge isRequired={true} isComplete={!!formData.stripeConnected} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <i className="fab fa-stripe" style={{ fontSize: '1.5rem', color: formData.stripeConnected ? '#635bff' : '#9ca3af' }}></i>
                <span style={{ color: formData.stripeConnected ? '#16a34a' : '#9ca3af' }}>
                  {formData.stripeConnected ? 'Connected and ready to accept payments' : 'Not connected - required to accept bookings'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Optional Steps Section */}
        <div>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ padding: '0.25rem 0.5rem', background: '#f3f4f6', color: '#6b7280', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Optional</span>
            Profile Enhancements
          </h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#6b7280' }}>
            These sections help improve your profile visibility and client engagement. You can complete them anytime.
          </p>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {/* Services */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Services</h4>
                <StatusBadge isRequired={true} isComplete={servicesCount > 0} />
              </div>
              {servicesCount > 0 ? (
                <div style={{ fontSize: '0.9rem' }}>
                  <span style={{ color: '#111827' }}>{servicesCount} service{servicesCount > 1 ? 's' : ''} configured</span>
                  {formData.selectedServices && formData.selectedServices.length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {formData.selectedServices.slice(0, 5).map((service, idx) => (
                        <span key={idx} style={{ padding: '0.25rem 0.5rem', background: '#f3f4f6', borderRadius: '4px', fontSize: '0.8rem', color: '#374151' }}>
                          {service.name || service.serviceName || `Service ${idx + 1}`}
                        </span>
                      ))}
                      {formData.selectedServices.length > 5 && (
                        <span style={{ padding: '0.25rem 0.5rem', background: '#e5e7eb', borderRadius: '4px', fontSize: '0.8rem', color: '#6b7280' }}>
                          +{formData.selectedServices.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>No services added</span>
              )}
            </div>

            {/* Subcategories */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Subcategories</h4>
                <StatusBadge isRequired={true} isComplete={(formData.selectedSubcategories || []).length > 0} />
              </div>
              {(formData.selectedSubcategories || []).length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {(formData.selectedSubcategories || []).slice(0, 10).map((subcategory, idx) => {
                    const subcategoryName = typeof subcategory === 'object' && subcategory !== null 
                      ? (subcategory.name || subcategory.SubcategoryName || subcategory.label || `Subcategory ${subcategory.id || idx + 1}`)
                      : typeof subcategory === 'string' 
                        ? subcategory 
                        : `Subcategory ${idx + 1}`;
                    return (
                      <span key={idx} style={{ padding: '0.35rem 0.75rem', background: '#eff6ff', borderRadius: '20px', fontSize: '0.8rem', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                        {subcategoryName}
                      </span>
                    );
                  })}
                  {(formData.selectedSubcategories || []).length > 10 && (
                    <span style={{ padding: '0.35rem 0.75rem', background: '#f3f4f6', borderRadius: '20px', fontSize: '0.8rem', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                      +{(formData.selectedSubcategories || []).length - 10} more
                    </span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>No subcategories selected</span>
              )}
            </div>

            {/* Social Media */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Social Media</h4>
                <StatusBadge isRequired={false} isComplete={socialLinksCount > 0} />
              </div>
              {socialLinksCount > 0 ? (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {formData.facebook && <span style={{ fontSize: '0.9rem', color: '#374151' }}><i className="fab fa-facebook" style={{ color: '#1877F2', marginRight: '0.5rem' }}></i>Facebook</span>}
                  {formData.instagram && <span style={{ fontSize: '0.9rem', color: '#374151' }}><i className="fab fa-instagram" style={{ color: '#E4405F', marginRight: '0.5rem' }}></i>Instagram</span>}
                  {formData.twitter && <span style={{ fontSize: '0.9rem', color: '#374151' }}><i className="fab fa-x-twitter" style={{ color: '#000', marginRight: '0.5rem' }}></i>X</span>}
                  {formData.linkedin && <span style={{ fontSize: '0.9rem', color: '#374151' }}><i className="fab fa-linkedin" style={{ color: '#0077B5', marginRight: '0.5rem' }}></i>LinkedIn</span>}
                  {formData.youtube && <span style={{ fontSize: '0.9rem', color: '#374151' }}><i className="fab fa-youtube" style={{ color: '#FF0000', marginRight: '0.5rem' }}></i>YouTube</span>}
                  {formData.tiktok && <span style={{ fontSize: '0.9rem', color: '#374151' }}><i className="fab fa-tiktok" style={{ color: '#000', marginRight: '0.5rem' }}></i>TikTok</span>}
                </div>
              ) : (
                <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>No social links added</span>
              )}
            </div>

            {/* Badges */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Special Badges</h4>
                <StatusBadge isRequired={false} isComplete={(formData.selectedFilters || []).length > 0} />
              </div>
              {(formData.selectedFilters || []).length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {(formData.selectedFilters || []).map((filter, idx) => {
                    const filterObj = filterOptions?.find(f => f.id === filter);
                    return (
                      <span key={idx} style={{ 
                        padding: '0.35rem 0.75rem', 
                        background: filterObj?.color ? `${filterObj.color}20` : '#fef3c7', 
                        borderRadius: '20px', 
                        fontSize: '0.8rem', 
                        color: filterObj?.color || '#92400e',
                        border: `1px solid ${filterObj?.color || '#fcd34d'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        {filterObj?.icon && <i className={`fas ${filterObj.icon}`} style={{ fontSize: '0.7rem' }}></i>}
                        {getBadgeLabel(filter)}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>No badges enabled</span>
              )}
            </div>

            {/* FAQs */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>FAQs</h4>
                <StatusBadge isRequired={false} isComplete={(formData.faqs || []).length > 0} />
              </div>
              {(formData.faqs || []).length > 0 ? (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {(formData.faqs || []).slice(0, 3).map((faq, idx) => (
                    <div key={idx} style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem', color: '#111827', marginBottom: '0.25rem' }}>
                        <i className="fas fa-question-circle" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>
                        {faq.question}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', paddingLeft: '1.5rem' }}>
                        {faq.answer?.length > 100 ? faq.answer.substring(0, 100) + '...' : faq.answer}
                      </div>
                    </div>
                  ))}
                  {(formData.faqs || []).length > 3 && (
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>+{(formData.faqs || []).length - 3} more FAQs</span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>No FAQs added</span>
              )}
            </div>

            {/* Google Reviews */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Google Reviews</h4>
                <StatusBadge isRequired={false} isComplete={!!formData.googlePlaceId} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
                  <path fill={formData.googlePlaceId ? '#4285F4' : '#9ca3af'} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill={formData.googlePlaceId ? '#34A853' : '#9ca3af'} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill={formData.googlePlaceId ? '#FBBC05' : '#9ca3af'} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill={formData.googlePlaceId ? '#EA4335' : '#9ca3af'} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span style={{ color: formData.googlePlaceId ? '#16a34a' : '#9ca3af' }}>
                  {formData.googlePlaceId ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviewStep;
