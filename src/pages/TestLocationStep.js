import React, { useEffect, useRef, useState } from 'react';

function TestLocationStep({ formData = {}, onInputChange = () => {} }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [localCity, setLocalCity] = useState(formData.city || '');
  const [localProvince, setLocalProvince] = useState(formData.province || '');
  const [localPostal, setLocalPostal] = useState(formData.postalCode || '');

  useEffect(() => {
    const initGoogleMaps = () => {
      if (!window.google?.maps?.places?.Autocomplete || !inputRef.current) {
        setTimeout(initGoogleMaps, 200);
        return;
      }

      try {
        // Clear existing autocomplete if it exists
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }

        // Create autocomplete EXACTLY like EnhancedSearchBar
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'ca' }
        });

        autocompleteRef.current = autocomplete;

        // Listen for selection - EXACTLY like EnhancedSearchBar
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          
          if (place.address_components) {
            const getComponent = (type) => {
              const comp = place.address_components.find(c => c.types.includes(type));
              return comp?.long_name || '';
            };

            // Extract address components
            const streetNumber = getComponent('street_number');
            const route = getComponent('route');
            const street = `${streetNumber} ${route}`.trim();
            const city = getComponent('locality') || getComponent('sublocality');
            const province = getComponent('administrative_area_level_1');
            const postal = getComponent('postal_code');

            // Update local state for immediate UI update
            setLocalCity(city);
            setLocalProvince(province);
            setLocalPostal(postal);

            // Update parent state
            onInputChange('address', street);
            onInputChange('city', city);
            onInputChange('province', province);
            onInputChange('postalCode', postal);
            onInputChange('country', 'Canada');

            // Store coordinates if available
            if (place.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              onInputChange('latitude', lat);
              onInputChange('longitude', lng);
            }
          }
        });
      
      } catch (error) {
        console.error('❌ Error creating autocomplete:', error);
      }
    };

    initGoogleMaps();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h2>TEST - Address Autocomplete</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Street Address (Type here!)
        </label>
        <input
          ref={inputRef}
          type="text"
          placeholder="Start typing your address..."
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '2px solid #007bff',
            borderRadius: '5px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>City</label>
        <input
          type="text"
          value={localCity}
          onChange={(e) => {
            setLocalCity(e.target.value);
            onInputChange('city', e.target.value);
          }}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Province</label>
        <input
          type="text"
          value={localProvince}
          onChange={(e) => {
            setLocalProvince(e.target.value);
            onInputChange('province', e.target.value);
          }}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Postal Code</label>
        <input
          type="text"
          value={localPostal}
          onChange={(e) => {
            setLocalPostal(e.target.value);
            onInputChange('postalCode', e.target.value);
          }}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <style>{`
        .pac-container {
          background: white !important;
          z-index: 999999 !important;
          border: 1px solid #ccc !important;
          border-radius: 5px !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
        }
        .pac-item {
          padding: 10px !important;
          cursor: pointer !important;
          border-bottom: 1px solid #eee !important;
        }
        .pac-item:hover {
          background: #f0f0f0 !important;
        }
      `}</style>
    </div>
  );
}

export default TestLocationStep;
