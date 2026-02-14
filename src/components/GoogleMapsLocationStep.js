import React, { useEffect, useRef } from 'react';

function GoogleMapsLocationStep({ formData, setFormData, onInputChange }) {
  const containerRef = useRef(null);
  
  useEffect(() => {
    // Inject the working HTML directly
    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <div style="max-width: 700px; margin: 0 auto;">
          <!-- Street Address with Google Autocomplete -->
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.95rem;">
              Street Address <span style="color: red;">*</span>
            </label>
            <input
              id="google-address-input"
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

          <!-- City and Province Row -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.95rem;">
                City <span style="color: red;">*</span>
              </label>
              <input
                id="google-city-input"
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
                id="google-province-input"
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

          <!-- Postal Code and Country Row -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
            <div>
              <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.95rem;">
                Postal Code <span style="color: red;">*</span>
              </label>
              <input
                id="google-postal-input"
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
                id="google-country-input"
                type="text"
                placeholder=""
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

          <!-- Service Areas Section -->
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0;" />
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.95rem;">
              Service Areas <span style="color: red;">*</span>
            </label>
            <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 1rem;">
              Add the cities or regions where you offer your services
            </p>
            
            <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem;">
              <input
                id="google-service-area-input"
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
                id="add-service-area-btn"
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

            <!-- Service Areas Tags -->
            <div id="service-areas-display" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;">
              <!-- Service area tags will be added here -->
            </div>
          </div>
        </div>
      `;
      
      // Initialize Google Maps after HTML is injected
      setTimeout(() => {
        initializeGoogleMapsForInjectedHTML();
      }, 100);
    }
  }, []);
  
  const initializeGoogleMapsForInjectedHTML = () => {
    if (!window.google?.maps?.places) {
      console.error('❌ Google Maps not ready');
      return;
    }
    
    const addressInput = document.getElementById('google-address-input');
    const serviceAreaInput = document.getElementById('google-service-area-input');
    
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
          
          // Update the input fields
          document.getElementById('google-city-input').value = city;
          document.getElementById('google-province-input').value = province;
          document.getElementById('google-postal-input').value = postalCode;
          document.getElementById('google-country-input').value = country;
          
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
            
            if (areaToAdd && !formData.serviceAreas.includes(areaToAdd)) {
              setFormData(prev => ({
                ...prev,
                serviceAreas: [...prev.serviceAreas, areaToAdd]
              }));
              updateServiceAreasDisplay([...formData.serviceAreas, areaToAdd]);
            }
            
            serviceAreaInput.value = '';
          }
        });
      } catch (error) {
        console.error('❌ Error creating service area autocomplete:', error);
      }
    }
    
    // Add service area button handler
    const addBtn = document.getElementById('add-service-area-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const inputValue = serviceAreaInput?.value?.trim();
        if (inputValue && !formData.serviceAreas.includes(inputValue)) {
          setFormData(prev => ({
            ...prev,
            serviceAreas: [...prev.serviceAreas, inputValue]
          }));
          updateServiceAreasDisplay([...formData.serviceAreas, inputValue]);
          serviceAreaInput.value = '';
        }
      });
    }
  };
  
  const updateServiceAreasDisplay = (areas) => {
    const display = document.getElementById('service-areas-display');
    if (display) {
      display.innerHTML = areas.map((area, index) => `
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
  
  // Make removeServiceArea globally available
  useEffect(() => {
    window.removeServiceArea = (index) => {
      const newAreas = formData.serviceAreas.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        serviceAreas: newAreas
      }));
      updateServiceAreasDisplay(newAreas);
    };
    
    return () => {
      delete window.removeServiceArea;
    };
  }, [formData.serviceAreas, setFormData]);
  
  // Update display when service areas change
  useEffect(() => {
    updateServiceAreasDisplay(formData.serviceAreas);
  }, [formData.serviceAreas]);

  return (
    <div className="location-step">
      <div ref={containerRef}></div>
    </div>
  );
}

export default GoogleMapsLocationStep;
