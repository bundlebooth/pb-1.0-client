import React, { useEffect, useRef } from 'react';

function WorkingLocationStep({ formData, setFormData }) {
  const addressInputRef = useRef(null);
  const serviceAreaInputRef = useRef(null);
  const cityInputRef = useRef(null);
  const provinceInputRef = useRef(null);
  const postalCodeInputRef = useRef(null);
  const countryInputRef = useRef(null);
  
  useEffect(() => {
    // Wait for Google Maps to load, then initialize
    const initializeWhenReady = () => {
      if (window.google?.maps?.places) {
        setTimeout(initializeAutocomplete, 100);
      } else {
        setTimeout(initializeWhenReady, 200);
      }
    };
    
    initializeWhenReady();
  }, []);
  
  const initializeAutocomplete = () => {
    if (!addressInputRef.current) {
      console.error('❌ Address input not ready');
      return;
    }
    
    // Address Autocomplete - EXACT COPY FROM WORKING HTML
    const addressAutocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'ca' }
    });
    
    addressAutocomplete.addListener('place_changed', function() {
      const place = addressAutocomplete.getPlace();
      
      if (place.address_components) {
        const comps = place.address_components;
        const pick = (type) => comps.find(c => c.types.includes(type))?.long_name || '';
        
        const streetNumber = pick('street_number');
        const route = pick('route');
        const fullAddress = streetNumber && route ? `${streetNumber} ${route}` : place.formatted_address;
        
        const city = pick('locality') || pick('sublocality') || pick('postal_town') || '';
        const province = pick('administrative_area_level_1') || '';
        const postalCode = pick('postal_code') || '';
        const country = pick('country') || 'Canada';
        
        // Update DOM elements directly (bypass React)
        if (addressInputRef.current) addressInputRef.current.value = fullAddress;
        if (cityInputRef.current) cityInputRef.current.value = city;
        if (provinceInputRef.current) provinceInputRef.current.value = province;
        if (postalCodeInputRef.current) postalCodeInputRef.current.value = postalCode;
        if (countryInputRef.current) countryInputRef.current.value = country;
        
        // Update React state
        setFormData(prev => ({
          ...prev,
          address: fullAddress || '',
          city: city,
          province: province,
          country: country,
          postalCode: postalCode,
          latitude: place.geometry?.location?.lat() || null,
          longitude: place.geometry?.location?.lng() || null
        }));
        
      }
    });
    
    // Service Area Autocomplete
    if (serviceAreaInputRef.current) {
      
      const serviceAreaAutocomplete = new window.google.maps.places.Autocomplete(serviceAreaInputRef.current, {
        types: ['(cities)'],
        componentRestrictions: { country: 'ca' }
      });
      
      serviceAreaAutocomplete.addListener('place_changed', function() {
        const place = serviceAreaAutocomplete.getPlace();
        
        if (place.address_components) {
          const comps = place.address_components;
          const pick = (type) => comps.find(c => c.types.includes(type))?.long_name || '';
          const city = pick('locality') || pick('postal_town') || '';
          const areaToAdd = city || place.name || place.formatted_address?.split(',')[0];
          
          if (areaToAdd && !formData.serviceAreas.includes(areaToAdd)) {
            setFormData(prev => ({
              ...prev,
              serviceAreas: [...prev.serviceAreas, areaToAdd]
            }));
          }
          
          // Clear input
          if (serviceAreaInputRef.current) {
            serviceAreaInputRef.current.value = '';
          }
        }
      });
    }
  };
  
  const handleAddServiceArea = () => {
    const inputValue = serviceAreaInputRef.current?.value?.trim();
    if (inputValue && !formData.serviceAreas.includes(inputValue)) {
      setFormData(prev => ({
        ...prev,
        serviceAreas: [...prev.serviceAreas, inputValue]
      }));
      if (serviceAreaInputRef.current) {
        serviceAreaInputRef.current.value = '';
      }
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
              ref={cityInputRef}
              type="text"
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
              ref={provinceInputRef}
              type="text"
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
              ref={postalCodeInputRef}
              type="text"
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
              ref={countryInputRef}
              type="text"
              className="form-input"
              defaultValue="Canada"
              readOnly
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
              className="form-input"
              placeholder=""
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
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#4f46e5'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#6366f1'}
            >
              <i className="fas fa-plus"></i> Add
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

export default WorkingLocationStep;
