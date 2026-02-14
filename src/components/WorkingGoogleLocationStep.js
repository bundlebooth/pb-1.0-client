import React, { useState, useEffect, useRef } from 'react';
import { GOOGLE_MAPS_API_KEY } from '../config';
import { formatFromGooglePlace, extractAddressComponents } from '../utils/locationUtils';

function WorkingGoogleLocationStep({ formData, setFormData }) {
  const [serviceAreaInput, setServiceAreaInput] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  
  const addressInputRef = useRef(null);
  const serviceAreaInputRef = useRef(null);
  const addressAutocompleteRef = useRef(null);
  const serviceAreaAutocompleteRef = useRef(null);

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      initializeGooglePlaces();
    } else {
      // Load Google Maps API if not already loaded
      loadGoogleMapsAPI();
    }
  }, []);

  // Reinitialize when component becomes visible (like EnhancedSearchBar does when expanded)
  useEffect(() => {
    setIsVisible(true);
    if (window.google && window.google.maps && window.google.maps.places) {
      setTimeout(() => {
        initializeGooglePlaces();
      }, 100);
    }
  }, []);

  // Also reinitialize after a delay to ensure DOM is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.google && window.google.maps && window.google.maps.places) {
        initializeGooglePlaces();
      }
    }, 500);
    
    return () => clearTimeout(timer);
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
    // Address Autocomplete
    if (addressInputRef.current && !addressAutocompleteRef.current) {
      const input = addressInputRef.current;
      
      // Clear existing autocomplete if it exists
      if (addressAutocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(addressAutocompleteRef.current);
        addressAutocompleteRef.current = null;
      }

      // CRITICAL: Remove React's control over this input
      input.removeAttribute('value');
      input.removeAttribute('defaultValue');
      
      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        types: ['address'],
        componentRestrictions: { country: 'ca' } // Restrict to Canada
      });

      addressAutocompleteRef.current = autocomplete;
      
      // Prevent React from interfering
      input.addEventListener('input', (e) => {
        e.stopPropagation();
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (place.address_components) {
          // Use centralized utility to extract address components
          const extracted = extractAddressComponents(place);
          
          setFormData(prev => ({
            ...prev,
            address: extracted.fullAddress || '',
            city: extracted.city,
            province: extracted.province,
            country: extracted.country,
            postalCode: extracted.postalCode,
            latitude: extracted.latitude,
            longitude: extracted.longitude
          }));
          
        }
      });
    }
    
    // Service Area Autocomplete
    if (serviceAreaInputRef.current && !serviceAreaAutocompleteRef.current) {
      const input = serviceAreaInputRef.current;
      
      // Clear existing autocomplete if it exists
      if (serviceAreaAutocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(serviceAreaAutocompleteRef.current);
      }

      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        types: ['(cities)'],
        componentRestrictions: { country: 'ca' } // Restrict to Canada
      });

      serviceAreaAutocompleteRef.current = autocomplete;

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (place.geometry) {
          // Use centralized formatting utility
          const areaToAdd = formatFromGooglePlace(place.address_components, place.name);
          
          if (areaToAdd && !formData.serviceAreas.includes(areaToAdd)) {
            setFormData(prev => ({
              ...prev,
              serviceAreas: [...prev.serviceAreas, areaToAdd]
            }));
          }
          
          setServiceAreaInput('');
        }
      });
    }
  };
  
  const handleAddServiceArea = () => {
    if (serviceAreaInput.trim() && !formData.serviceAreas.includes(serviceAreaInput.trim())) {
      setFormData(prev => ({
        ...prev,
        serviceAreas: [...prev.serviceAreas, serviceAreaInput.trim()]
      }));
      setServiceAreaInput('');
    }
  };
  
  const handleRemoveServiceArea = (area) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter(a => a !== area)
    }));
  };

  return (
    <div className="location-step">
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        {/* Street Address with Google Autocomplete */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Street Address <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            ref={addressInputRef}
            type="text"
            className="form-input"
            placeholder="Start typing your address..."
            onClick={() => {
              // Reinitialize on click like EnhancedSearchBar does
              setTimeout(() => {
                if (window.google && window.google.maps && window.google.maps.places) {
                  initializeGooglePlaces();
                }
              }, 100);
            }}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.95rem',
              boxSizing: 'border-box'
            }}
          />
          <small style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: '#f59e0b', fontSize: '0.85rem' }}>
            <span>🔥</span> Start typing your address and Google will suggest it!
          </small>
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
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              className="form-input"
              placeholder=""
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
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              Province <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.province || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
              className="form-input"
              placeholder="Ontario"
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

        {/* Postal Code and Country Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              Postal Code <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.postalCode || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
              className="form-input"
              placeholder="M5H 2N2"
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

        {/* Service Areas Section */}
        <div className="form-group">
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Service Areas <span style={{ color: 'red' }}>*</span>
          </label>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Add the cities or regions where you offer your services
          </p>
          
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input
              ref={serviceAreaInputRef}
              type="text"
              value={serviceAreaInput}
              onChange={(e) => setServiceAreaInput(e.target.value)}
              className="form-input"
              placeholder=""
              onClick={() => {
                // Reinitialize on click like EnhancedSearchBar does
                setTimeout(() => {
                  if (window.google && window.google.maps && window.google.maps.places) {
                    initializeGooglePlaces();
                  }
                }, 100);
              }}
              style={{
                flex: 1,
                padding: '0.875rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddServiceArea();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddServiceArea}
              style={{
                padding: '0.875rem 1.5rem',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Add
            </button>
          </div>

          <small style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#f59e0b', fontSize: '0.85rem' }}>
            <span>🔥</span> Start typing a city name and Google will suggest it!
          </small>

          {/* Service Areas Tags */}
          {formData.serviceAreas && formData.serviceAreas.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
              {formData.serviceAreas.map((area, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #3b82f6',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    color: '#1e40af'
                  }}
                >
                  <i className="fas fa-map-marker-alt" style={{ fontSize: '0.8rem' }}></i>
                  {area}
                  <button
                    type="button"
                    onClick={() => handleRemoveServiceArea(area)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: '0',
                      marginLeft: '0.25rem'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkingGoogleLocationStep;
