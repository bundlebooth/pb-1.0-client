import React, { useEffect, useRef } from 'react';

function PureHTMLLocationStep({ formData, setFormData }) {
  const containerRef = useRef(null);
  
  useEffect(() => {
    // Inject pure HTML - NO REACT CONTROL
    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <div style="max-width: 700px; margin: 0 auto;">
          <!-- Street Address -->
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.95rem;">
              Street Address <span style="color: red;">*</span>
            </label>
            <input
              id="pure-address"
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
                id="pure-city"
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
                id="pure-province"
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
                id="pure-postal"
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
                id="pure-country"
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
                id="pure-service-area"
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
                id="add-service-area"
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
                <i class="fas fa-plus"></i> Add
              </button>
            </div>

            <small style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: #f59e0b; font-size: 0.85rem;">
              <span>🔥</span> Start typing a city name and Google will suggest it!
            </small>

            <div id="service-areas-display" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;"></div>
          </div>
        </div>
      `;
      
      // Initialize Google Maps after DOM is ready
      setTimeout(() => {
        initializeGoogleMaps();
      }, 100);
    }
  }, []);
  
  const initializeGoogleMaps = () => {
    if (!window.google?.maps?.places) {
      setTimeout(initializeGoogleMaps, 200);
      return;
    }
    
    const addressInput = document.getElementById('pure-address');
    const serviceAreaInput = document.getElementById('pure-service-area');
    
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
          document.getElementById('pure-address').value = fullAddress;
          document.getElementById('pure-city').value = city;
          document.getElementById('pure-province').value = province;
          document.getElementById('pure-postal').value = postalCode;
          document.getElementById('pure-country').value = country;
          
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
            
            if (areaToAdd && !window.currentServiceAreas.includes(areaToAdd)) {
              window.currentServiceAreas.push(areaToAdd);
              updateServiceAreasDisplay();
              updateReactState();
            }
            
            serviceAreaInput.value = '';
          }
        });
      } catch (error) {
        console.error('❌ Error creating service area autocomplete:', error);
      }
    }
    
    // Add button handler
    const addBtn = document.getElementById('add-service-area');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const inputValue = serviceAreaInput?.value?.trim();
        if (inputValue && !window.currentServiceAreas.includes(inputValue)) {
          window.currentServiceAreas.push(inputValue);
          updateServiceAreasDisplay();
          updateReactState();
          serviceAreaInput.value = '';
        }
      });
    }
    
    // Initialize service areas
    window.currentServiceAreas = formData.serviceAreas || [];
    updateServiceAreasDisplay();
  };
  
  const updateServiceAreasDisplay = () => {
    const display = document.getElementById('service-areas-display');
    if (display && window.currentServiceAreas) {
      display.innerHTML = window.currentServiceAreas.map((area, index) => `
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
            onclick="removeServiceArea(${index})"
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
  
  const updateReactState = () => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: window.currentServiceAreas || []
    }));
  };
  
  // Make functions globally available
  useEffect(() => {
    window.removeServiceArea = (index) => {
      if (window.currentServiceAreas) {
        window.currentServiceAreas.splice(index, 1);
        updateServiceAreasDisplay();
        updateReactState();
      }
    };
    
    return () => {
      delete window.removeServiceArea;
      delete window.currentServiceAreas;
    };
  }, []);

  return (
    <div className="location-step">
      <div ref={containerRef}></div>
    </div>
  );
}

export default PureHTMLLocationStep;
