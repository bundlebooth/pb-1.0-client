import React from 'react';

function SimpleLocationStep({ formData = {}, onInputChange = () => {} }) {
  const addressContainerRef = React.useRef(null);
  const serviceAreaContainerRef = React.useRef(null);
  const addressElementRef = React.useRef(null);
  const serviceAreaElementRef = React.useRef(null);

  // Initialize NEW Google Maps PlaceAutocompleteElement for address
  React.useEffect(() => {
    const initAutocomplete = async () => {
      if (!addressContainerRef.current || !window.google?.maps) {
        return;
      }

      try {
        // Import the Places library
        const { PlaceAutocompleteElement } = await window.google.maps.importLibrary("places");
        
        // Clear container
        addressContainerRef.current.innerHTML = '';
        
        // Create PlaceAutocompleteElement
        const autocompleteElement = new PlaceAutocompleteElement({
          componentRestrictions: { country: 'ca' },
          types: ['address']
        });
        
        addressElementRef.current = autocompleteElement;
        addressContainerRef.current.appendChild(autocompleteElement);
        
        // Style the element
        autocompleteElement.style.width = '100%';
        
        // Listen for place selection
        autocompleteElement.addEventListener('gmp-placeselect', async (event) => {
          const place = event.place;
          
          if (!place) {
            return;
          }
          
          // Fetch place details
          await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'addressComponents', 'location']
          });
          
          const getComponent = (type) => {
            const comp = place.addressComponents?.find(c => c.types.includes(type));
            return comp?.longText || '';
          };
          
          // Extract address components
          const streetNumber = getComponent('street_number');
          const route = getComponent('route');
          const fullAddress = streetNumber && route ? `${streetNumber} ${route}` : place.formattedAddress;
          
          const addressData = {
            address: fullAddress || '',
            city: getComponent('locality') || getComponent('sublocality') || '',
            province: getComponent('administrative_area_level_1') || '',
            country: getComponent('country') || 'Canada',
            postalCode: getComponent('postal_code') || ''
          };
          
          // Update all fields
          onInputChange('address', addressData.address);
          onInputChange('city', addressData.city);
          onInputChange('province', addressData.province);
          onInputChange('country', addressData.country);
          onInputChange('postalCode', addressData.postalCode);
          
          // Store coordinates
          if (place.location) {
            const lat = place.location.lat();
            const lng = place.location.lng();
            onInputChange('latitude', lat);
            onInputChange('longitude', lng);
          }
          
        });
      } catch (error) {
      }
    };

    // Wait for Google Maps to load
    if (window.google?.maps) {
      initAutocomplete();
    } else {
      const checkGoogle = setInterval(() => {
        if (window.google?.maps) {
          initAutocomplete();
          clearInterval(checkGoogle);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkGoogle);
      }, 10000);
      
      return () => clearInterval(checkGoogle);
    }
  }, []);

  // Initialize NEW Google Maps PlaceAutocompleteElement for service areas
  React.useEffect(() => {
    const initServiceAreaAutocomplete = async () => {
      if (!serviceAreaContainerRef.current || !window.google?.maps) {
        return;
      }

      try {
        // Import the Places library
        const { PlaceAutocompleteElement } = await window.google.maps.importLibrary("places");
        
        // Clear container
        serviceAreaContainerRef.current.innerHTML = '';
        
        // Create PlaceAutocompleteElement for cities
        const autocompleteElement = new PlaceAutocompleteElement({
          componentRestrictions: { country: 'ca' },
          types: ['(cities)']
        });
        
        serviceAreaElementRef.current = autocompleteElement;
        serviceAreaContainerRef.current.appendChild(autocompleteElement);
        
        // Style the element
        autocompleteElement.style.width = '100%';
        
        // Listen for place selection
        autocompleteElement.addEventListener('gmp-placeselect', async (event) => {
          const place = event.place;
          
          if (!place) return;
          
          // Fetch place details
          await place.fetchFields({
            fields: ['displayName', 'formattedAddress']
          });
          
          const cityName = place.formattedAddress || place.displayName;
          
          // Add to service areas
          const areas = formData.serviceAreas || [];
          if (!areas.includes(cityName)) {
            onInputChange('serviceAreas', [...areas, cityName]);
          }
          
          // Clear the input by recreating the element
          serviceAreaContainerRef.current.innerHTML = '';
          const newElement = new PlaceAutocompleteElement({
            componentRestrictions: { country: 'ca' },
            types: ['(cities)']
          });
          newElement.style.width = '100%';
          serviceAreaContainerRef.current.appendChild(newElement);
          
          // Re-attach listener
          newElement.addEventListener('gmp-placeselect', arguments.callee);
          serviceAreaElementRef.current = newElement;
        });
      } catch (error) {
      }
    };

    // Wait for Google Maps to load
    if (window.google?.maps) {
      initServiceAreaAutocomplete();
    } else {
      const checkGoogle = setInterval(() => {
        if (window.google?.maps) {
          initServiceAreaAutocomplete();
          clearInterval(checkGoogle);
        }
      }, 100);

      setTimeout(() => clearInterval(checkGoogle), 10000);
      return () => clearInterval(checkGoogle);
    }
  }, [formData.serviceAreas]);

  const handleAddServiceArea = () => {
    const input = serviceAreaInputRef.current;
    const value = input?.value?.trim();
    if (!value) return;

    const areas = formData.serviceAreas || [];
    if (!areas.includes(value)) {
      onInputChange('serviceAreas', [...areas, value]);
    }
    if (input) input.value = '';
  };

  const handleRemoveServiceArea = (index) => {
    const areas = formData.serviceAreas || [];
    onInputChange('serviceAreas', areas.filter((_, i) => i !== index));
  };

  return (
    <div className="location-step">
      {/* Address Input with NEW Google Autocomplete Element */}
      <div className="form-group">
        <label>Street Address *</label>
        <div ref={addressContainerRef} className="google-autocomplete-container"></div>
        <small className="form-help">🔥 Start typing your address and Google will suggest it!</small>
      </div>

      {/* City and Province */}
      <div className="form-row">
        <div className="form-group">
          <label>City *</label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.city || ''} 
            onChange={(e) => onInputChange('city', e.target.value)} 
            placeholder="" 
          />
        </div>
        <div className="form-group">
          <label>Province *</label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.province || ''} 
            onChange={(e) => onInputChange('province', e.target.value)} 
            placeholder="Ontario" 
          />
        </div>
      </div>

      {/* Postal Code and Country */}
      <div className="form-row">
        <div className="form-group">
          <label>Postal Code *</label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.postalCode || ''} 
            onChange={(e) => onInputChange('postalCode', e.target.value)} 
            placeholder="M5H 2N2" 
          />
        </div>
        <div className="form-group">
          <label>Country</label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.country || 'Canada'} 
            onChange={(e) => onInputChange('country', e.target.value)} 
            placeholder="" 
          />
        </div>
      </div>

      {/* Service Areas */}
      <div className="form-group" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #EBEBEB' }}>
        <label>Service Areas *</label>
        <p className="form-help">Add the cities or regions where you offer your services</p>
        
        <div className="form-row" style={{ marginBottom: '1rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <div ref={serviceAreaContainerRef} className="google-autocomplete-container"></div>
            <small className="form-help">🔥 Start typing a city name and Google will suggest it!</small>
          </div>
        </div>

        {/* Service Areas List */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', minHeight: '2rem' }}>
          {(formData.serviceAreas || []).map((area, index) => (
            <span key={index} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.875rem', background: '#F7F7F7', border: '1px solid #DDDDDD',
              color: '#222222', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500
            }}>
              {area}
              <button 
                type="button" 
                onClick={() => handleRemoveServiceArea(index)}
                style={{
                  background: 'none', border: 'none', color: '#999', cursor: 'pointer',
                  padding: '0', fontSize: '1.3rem', lineHeight: 1
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SimpleLocationStep;
