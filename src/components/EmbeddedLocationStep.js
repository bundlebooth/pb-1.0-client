import React, { useEffect, useRef } from 'react';

function EmbeddedLocationStep({ formData, setFormData }) {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  
  useEffect(() => {
    // Only initialize once to prevent React re-renders from breaking Google Maps
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    // Inject the EXACT working HTML and JavaScript
    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
          <style>
            .embedded-pac-container {
              background-color: white !important;
              z-index: 9999999 !important;
              border: 2px solid #007bff !important;
              border-radius: 8px !important;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
              margin-top: 4px !important;
              font-family: inherit !important;
              pointer-events: auto !important;
              position: absolute !important;
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              width: auto !important;
              min-width: 300px !important;
            }
            
            .embedded-pac-item {
              padding: 12px 16px !important;
              cursor: pointer !important;
              border-bottom: 1px solid #EBEBEB !important;
              font-size: 14px !important;
            }
            
            .embedded-pac-item:hover {
              background: #f0f8ff !important;
            }
          </style>
          
          <!-- Street Address -->
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.95rem;">
              Street Address <span style="color: red;">*</span>
            </label>
            <input
              id="embedded-address"
              type="text"
              placeholder="Start typing your address..."
              style="
                width: 100%;
                padding: 0.875rem 1rem;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                font-size: 0.95rem;
                box-sizing: border-box;
              "
            />
            <small style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; color: #f59e0b; font-size: 0.85rem;">
              <span>🔥</span> Start typing your address and Google will suggest it!
            </small>
          </div>

          <!-- City and Province -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.95rem;">
                City <span style="color: red;">*</span>
              </label>
              <input
                id="embedded-city"
                type="text"
                placeholder=""
                style="
                  width: 100%;
                  padding: 0.875rem 1rem;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  font-size: 0.95rem;
                  background-color: #f3f4f6;
                  box-sizing: border-box;
                "
              />
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.95rem;">
                Province <span style="color: red;">*</span>
              </label>
              <input
                id="embedded-province"
                type="text"
                placeholder="Ontario"
                style="
                  width: 100%;
                  padding: 0.875rem 1rem;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  font-size: 0.95rem;
                  background-color: #f3f4f6;
                  box-sizing: border-box;
                "
              />
            </div>
          </div>

          <!-- Postal Code and Country -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.95rem;">
                Postal Code <span style="color: red;">*</span>
              </label>
              <input
                id="embedded-postal"
                type="text"
                placeholder="M5H 2N2"
                style="
                  width: 100%;
                  padding: 0.875rem 1rem;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  font-size: 0.95rem;
                  background-color: #f3f4f6;
                  box-sizing: border-box;
                "
              />
            </div>
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.95rem;">
                Country
              </label>
              <input
                id="embedded-country"
                type="text"
                value="Canada"
                readonly
                style="
                  width: 100%;
                  padding: 0.875rem 1rem;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  font-size: 0.95rem;
                  background-color: #f3f4f6;
                  box-sizing: border-box;
                "
              />
            </div>
          </div>

          <!-- Service Areas -->
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0;">
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.95rem;">
              Service Areas <span style="color: red;">*</span>
            </label>
            <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 1rem;">
              Add the cities or regions where you offer your services
            </p>
            
            <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem;">
              <input
                id="embedded-service-area"
                type="text"
                placeholder=""
                style="
                  flex: 1;
                  padding: 0.875rem 1rem;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  font-size: 0.95rem;
                  box-sizing: border-box;
                "
              />
              <button
                id="embedded-add-btn"
                type="button"
                style="
                  padding: 0.875rem 1.5rem;
                  background-color: #6366f1;
                  color: white;
                  border: none;
                  border-radius: 8px;
                  font-size: 0.95rem;
                  font-weight: 600;
                  cursor: pointer;
                "
              >
                Add
              </button>
            </div>

            <small style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: #f59e0b; font-size: 0.85rem;">
              <span>🔥</span> Start typing a city name and Google will suggest it!
            </small>

            <div id="embedded-service-areas" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;"></div>
          </div>
        </div>
      `;
      
      // Initialize Google Maps after DOM injection
      setTimeout(() => {
        initializeEmbeddedGoogleMaps();
      }, 100);
    }
  }, []); // Empty dependency array - only run once
  
  const initializeEmbeddedGoogleMaps = () => {
    // Wait for Google Maps to be available
    const waitForGoogle = () => {
      if (!window.google?.maps?.places) {
        setTimeout(waitForGoogle, 200);
        return;
      }
      
      const addressInput = document.getElementById('embedded-address');
      const serviceAreaInput = document.getElementById('embedded-service-area');
      
      if (!addressInput) {
        console.error('❌ Address input not found');
        return;
      }
      
      // Address Autocomplete - EXACT COPY FROM WORKING TEST
      try {
        const addressAutocomplete = new window.google.maps.places.Autocomplete(addressInput, {
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
            
            // Update DOM directly
            document.getElementById('embedded-address').value = fullAddress;
            document.getElementById('embedded-city').value = city;
            document.getElementById('embedded-province').value = province;
            document.getElementById('embedded-postal').value = postalCode;
            document.getElementById('embedded-country').value = country;
            
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
      } catch (error) {
        console.error('❌ Error creating address autocomplete:', error);
      }
      
      // Service Area Autocomplete
      if (serviceAreaInput) {
        try {
          const serviceAreaAutocomplete = new window.google.maps.places.Autocomplete(serviceAreaInput, {
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
              
              if (areaToAdd && !window.embeddedServiceAreas.includes(areaToAdd)) {
                window.embeddedServiceAreas.push(areaToAdd);
                updateEmbeddedServiceAreas();
                updateReactServiceAreas();
              }
              
              serviceAreaInput.value = '';
            }
          });
        } catch (error) {
          console.error('❌ Error creating service area autocomplete:', error);
        }
      }
      
      // Add button handler
      const addBtn = document.getElementById('embedded-add-btn');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const inputValue = serviceAreaInput?.value?.trim();
          if (inputValue && !window.embeddedServiceAreas.includes(inputValue)) {
            window.embeddedServiceAreas.push(inputValue);
            updateEmbeddedServiceAreas();
            updateReactServiceAreas();
            serviceAreaInput.value = '';
          }
        });
      }
      
      // Initialize service areas
      window.embeddedServiceAreas = formData.serviceAreas || [];
      updateEmbeddedServiceAreas();
    };
    
    waitForGoogle();
  };
  
  const updateEmbeddedServiceAreas = () => {
    const display = document.getElementById('embedded-service-areas');
    if (display && window.embeddedServiceAreas) {
      display.innerHTML = window.embeddedServiceAreas.map((area, index) => `
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background-color: #f0f9ff;
          border: 1px solid #3b82f6;
          border-radius: 20px;
          font-size: 0.9rem;
          color: #1e40af;
        ">
          <i class="fas fa-map-marker-alt" style="font-size: 0.8rem;"></i>
          ${area}
          <button 
            onclick="removeEmbeddedServiceArea(${index})"
            style="
              background: none;
              border: none;
              color: #ef4444;
              cursor: pointer;
              font-size: 1rem;
              padding: 0;
              margin-left: 0.25rem;
            "
          >×</button>
        </div>
      `).join('');
    }
  };
  
  const updateReactServiceAreas = () => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: window.embeddedServiceAreas || []
    }));
  };
  
  // Make functions globally available
  useEffect(() => {
    window.removeEmbeddedServiceArea = (index) => {
      if (window.embeddedServiceAreas) {
        window.embeddedServiceAreas.splice(index, 1);
        updateEmbeddedServiceAreas();
        updateReactServiceAreas();
      }
    };
    
    return () => {
      delete window.removeEmbeddedServiceArea;
      delete window.embeddedServiceAreas;
    };
  }, []);

  return (
    <div className="location-step">
      <div ref={containerRef}></div>
    </div>
  );
}

export default EmbeddedLocationStep;
