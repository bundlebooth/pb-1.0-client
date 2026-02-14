import React, { useState, useEffect, useRef } from 'react';
import { GOOGLE_MAPS_API_KEY } from '../config';
import SelectableTile, { SelectableTileGroup } from './common/SelectableTile';

/**
 * SimpleWorkingLocationStep - Vendor onboarding step for location & service areas
 * UI cloned from LocationServiceAreasPanel for consistency
 */
function SimpleWorkingLocationStep({ formData, setFormData }) {
  const addressInputRef = useRef(null);
  const serviceAreaInputRef = useRef(null);
  const addressAutocompleteRef = useRef(null);
  const serviceAreaAutocompleteRef = useRef(null);
  
  // Service location scope options (matching LocationServiceAreasPanel)
  const [serviceLocationScopes, setServiceLocationScopes] = useState(formData.serviceLocationScopes || ['Local']);
  const serviceLocationOptions = [
    { key: 'Local', label: 'Local (within city)' },
    { key: 'Regional', label: 'Regional (within province)' },
    { key: 'National', label: 'National (across Canada)' },
    { key: 'International', label: 'International' }
  ];
  
  // Update formData when scopes change
  useEffect(() => {
    setFormData(prev => ({ ...prev, serviceLocationScopes }));
  }, [serviceLocationScopes]);
  
  const toggleServiceScope = (key) => {
    setServiceLocationScopes(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key) 
        : [...prev, key]
    );
  };

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      initializeGooglePlaces();
    } else {
      loadGoogleMapsAPI();
    }
  }, []);

  // Reinitialize when component mounts
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setTimeout(() => {
        initializeGooglePlaces();
      }, 100);
    }
  }, []);

  const loadGoogleMapsAPI = () => {
    if (window.google) return;
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initializeGooglePlaces;
    document.head.appendChild(script);
  };

  const initializeGooglePlaces = () => {
    // ADDRESS AUTOCOMPLETE - EXACT PATTERN FROM EnhancedSearchBar
    if (!addressInputRef.current) return;
    
    const addressInput = addressInputRef.current.querySelector('input');
    if (!addressInput) return;
    
    // Clear existing autocomplete if it exists
    if (addressAutocompleteRef.current) {
      window.google.maps.event.clearInstanceListeners(addressAutocompleteRef.current);
    }

    const addressAutocomplete = new window.google.maps.places.Autocomplete(addressInput, {
      types: ['address'],
      componentRestrictions: { country: 'ca' }
    });

    addressAutocompleteRef.current = addressAutocomplete;

    addressAutocomplete.addListener('place_changed', () => {
      const place = addressAutocomplete.getPlace();
      
      if (place.address_components) {
        const comps = place.address_components;
        const pick = (type) => comps.find(c => c.types.includes(type))?.long_name || '';
        
        const streetNumber = pick('street_number');
        const route = pick('route');
        const fullAddress = streetNumber && route ? `${streetNumber} ${route}` : place.formatted_address;
        
        setFormData(prev => ({
          ...prev,
          address: fullAddress || '',
          city: pick('locality') || pick('sublocality') || '',
          province: pick('administrative_area_level_1') || '',
          postalCode: pick('postal_code') || '',
          country: pick('country') || 'Canada',
          latitude: place.geometry?.location?.lat() || null,
          longitude: place.geometry?.location?.lng() || null
        }));
        
      }
    });

    // SERVICE AREA AUTOCOMPLETE - EXACT PATTERN FROM EnhancedSearchBar
    if (!serviceAreaInputRef.current) return;
    
    const serviceAreaInput = serviceAreaInputRef.current.querySelector('input');
    if (!serviceAreaInput) return;
    
    // Clear existing autocomplete if it exists
    if (serviceAreaAutocompleteRef.current) {
      window.google.maps.event.clearInstanceListeners(serviceAreaAutocompleteRef.current);
    }

    const serviceAreaAutocomplete = new window.google.maps.places.Autocomplete(serviceAreaInput, {
      types: ['(cities)'],
      componentRestrictions: { country: 'ca' }
    });

    serviceAreaAutocompleteRef.current = serviceAreaAutocomplete;

    serviceAreaAutocomplete.addListener('place_changed', () => {
      const place = serviceAreaAutocomplete.getPlace();
      
      if (place.address_components) {
        const comps = place.address_components;
        const pick = (type) => comps.find(c => c.types.includes(type))?.long_name || '';
        const city = pick('locality') || pick('postal_town') || pick('administrative_area_level_3') || '';
        const province = pick('administrative_area_level_1') || '';
        const country = pick('country') || 'Canada';
        const loc = place.geometry?.location;
        
        const newArea = {
          placeId: place.place_id || null,
          city,
          province,
          country,
          latitude: loc ? (typeof loc.lat === 'function' ? loc.lat() : loc.lat) : null,
          longitude: loc ? (typeof loc.lng === 'function' ? loc.lng() : loc.lng) : null,
          formattedAddress: [city, province].filter(Boolean).join(', ') || place.formatted_address,
          placeType: Array.isArray(place.types) ? place.types[0] : 'locality',
          serviceRadius: 25.0
        };
        
        // Check for duplicates
        const exists = (formData.serviceAreas || []).some(a => 
          (newArea.placeId && a.placeId && a.placeId === newArea.placeId) ||
          (a.city && a.city.toLowerCase() === newArea.city.toLowerCase() && 
           a.province && a.province.toLowerCase() === newArea.province.toLowerCase())
        );
        
        if (!exists) {
          setFormData(prev => ({
            ...prev,
            serviceAreas: [...(prev.serviceAreas || []), newArea]
          }));
        }
        
        // Clear input
        serviceAreaInput.value = '';
        
        // Hide Google Maps dropdown
        const pacContainers = document.querySelectorAll('.pac-container');
        pacContainers.forEach(container => {
          container.style.display = 'none';
        });
        
        // Remove focus from input
        if (serviceAreaInput) {
          serviceAreaInput.blur();
        }
      }
    });
  };

  const handleRemoveServiceArea = (index) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="location-step">
      <div style={{ maxWidth: '100%', width: '100%' }}>
        
        {/* Street Address with Google Autocomplete */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Street Address <span style={{ color: 'red' }}>*</span>
          </label>
          <div ref={addressInputRef}>
            <input
              type="text"
              className="form-input"
              placeholder="Start typing your address..."
              autoComplete="off"
              defaultValue={formData.address || ''}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* City and Province Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              City <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.city || ''}
              readOnly
              className="form-input"
              placeholder="Auto-filled from address"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.95rem',
                backgroundColor: '#f3f4f6',
                boxSizing: 'border-box',
                cursor: 'not-allowed'
              }}
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              Province <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.province || ''}
              readOnly
              className="form-input"
              placeholder="Auto-filled from address"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.95rem',
                backgroundColor: '#f3f4f6',
                boxSizing: 'border-box',
                cursor: 'not-allowed'
              }}
            />
          </div>
        </div>

        {/* Postal Code and Country Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              Postal Code <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.postalCode || ''}
              readOnly
              className="form-input"
              placeholder="Auto-filled from address"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.95rem',
                backgroundColor: '#f3f4f6',
                boxSizing: 'border-box',
                cursor: 'not-allowed'
              }}
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              Country
            </label>
            <input
              type="text"
              value={formData.country || 'Canada'}
              readOnly
              className="form-input"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.95rem',
                backgroundColor: '#f3f4f6',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '2rem 0' }} />

        {/* Service Location Scope Section - using centralized SelectableTile component */}
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Service Location Scope
          </label>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Select the geographic scope of your services
          </p>
          <SelectableTileGroup>
            {serviceLocationOptions.map(option => {
              const isSelected = serviceLocationScopes.includes(option.key);
              return (
                <SelectableTile
                  key={option.key}
                  label={option.label}
                  isSelected={isSelected}
                  onClick={() => toggleServiceScope(option.key)}
                />
              );
            })}
          </SelectableTileGroup>
        </div>

        {/* Service Areas Section */}
        <div className="form-group">
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Service Areas <span style={{ color: 'red' }}>*</span>
          </label>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Add the cities or regions where you offer your services
          </p>
          
          <div ref={serviceAreaInputRef} style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder=""
              autoComplete="off"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Service Areas Tags - Matching Business Profile Style */}
          {formData.serviceAreas && formData.serviceAreas.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
              {formData.serviceAreas.map((area, index) => {
                // Handle both object format and string format for service areas
                let label;
                if (typeof area === 'string') {
                  label = area;
                } else {
                  // Use city + province, or formattedAddress, or just the area name
                  const city = area.city || area.name || '';
                  const province = area.province || area.state || '';
                  label = [city, province].filter(Boolean).join(', ') || area.formattedAddress || 'Unknown';
                }
                return (
                  <span
                    key={index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      background: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      color: '#374151',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 400
                    }}
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => handleRemoveServiceArea(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        padding: '0',
                        fontSize: '0.875rem',
                        lineHeight: 1,
                        marginLeft: '0.125rem'
                      }}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SimpleWorkingLocationStep;
