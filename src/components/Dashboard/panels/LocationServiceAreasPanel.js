import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { GOOGLE_MAPS_API_KEY, API_BASE_URL } from '../../../config';
import { showBanner } from '../../../utils/helpers';
import { apiGet, apiPut } from '../../../utils/api';
import SelectableTile, { SelectableTileGroup } from '../../common/SelectableTile';

// Load Google Maps API dynamically
const loadGoogleMapsAPI = () => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps?.places) {
      resolve();
      return;
    }
    
    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }
    
    // Load the script
    const script = document.createElement('script');
    const apiKey = GOOGLE_MAPS_API_KEY || 'AIzaSyCPhhp2rAt1VTrIzjgagJXZPZ_nc7K_BVo';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
};

function LocationServiceAreasPanel({ onBack, vendorProfileId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serviceAreaInput, setServiceAreaInput] = useState('');
  const [serviceLocationScopes, setServiceLocationScopes] = useState(['Local']);
  const [originalScopes, setOriginalScopes] = useState(['Local']);
  const [originalData, setOriginalData] = useState(null);
  const [serviceLocations, setServiceLocations] = useState([
    { key: 'Local', label: 'Local (within city)' },
    { key: 'Regional', label: 'Regional (within province)' },
    { key: 'National', label: 'National (across Canada)' },
    { key: 'International', label: 'International' }
  ]);
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    latitude: null,
    longitude: null,
    serviceAreas: []
  });
  
  const addressInputRef = useRef(null);
  const serviceAreaInputRef = useRef(null);
  const addressAutocompleteRef = useRef(null);
  const serviceAreaAutocompleteRef = useRef(null);

  // Clear form data when vendorProfileId changes
  useEffect(() => {
    setFormData({
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      latitude: null,
      longitude: null,
      serviceAreas: []
    });
    setServiceAreaInput('');
  }, [vendorProfileId]);

  useEffect(() => {
    if (vendorProfileId) {
      loadLocationData();
    } else {
      setLoading(false);
    }
  }, [vendorProfileId]);
  
  useEffect(() => {
    // Initialize Google Maps autocomplete after component mounts and loading is complete
    const initMaps = async () => {
      try {
        await loadGoogleMapsAPI();
        // Wait for DOM elements to be ready - retry multiple times
        const tryInit = (attempts = 0) => {
          if (attempts > 20) {
            return;
          }
          if (addressInputRef.current && window.google?.maps?.places) {
            initializeGoogleMaps();
          } else {
            setTimeout(() => tryInit(attempts + 1), 200);
          }
        };
        // Start trying after a short delay to ensure DOM is rendered
        setTimeout(() => tryInit(0), 300);
      } catch (error) {
      }
    };
    
    // Only initialize when not loading (form is rendered)
    if (!loading) {
      initMaps();
    }
    
    // Cleanup autocomplete on unmount
    return () => {
      if (addressAutocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(addressAutocompleteRef.current);
        addressAutocompleteRef.current = null;
      }
      if (serviceAreaAutocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(serviceAreaAutocompleteRef.current);
        serviceAreaAutocompleteRef.current = null;
      }
    };
  }, [loading]);

  const initializeGoogleMaps = () => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      return;
    }
    
    // Address Autocomplete - EXACTLY like EnhancedSearchBar
    if (addressInputRef.current && !addressAutocompleteRef.current) {
      addressAutocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'ca' }
      });
      
      addressAutocompleteRef.current.addListener('place_changed', () => {
        const place = addressAutocompleteRef.current.getPlace();
        
        if (!place || !place.address_components) {
          return;
        }
        
        const comps = place.address_components;
        const pick = (type) => comps.find(c => c.types.includes(type))?.long_name || '';
        
        const streetNumber = pick('street_number');
        const route = pick('route');
        const fullAddress = streetNumber && route ? `${streetNumber} ${route}` : place.formatted_address;
        
        const loc = place.geometry?.location;
        const latitude = loc ? (typeof loc.lat === 'function' ? loc.lat() : loc.lat) : null;
        const longitude = loc ? (typeof loc.lng === 'function' ? loc.lng() : loc.lng) : null;
        
        setFormData(prev => ({
          ...prev,
          address: fullAddress || '',
          city: pick('locality') || pick('sublocality') || pick('postal_town') || pick('administrative_area_level_3') || '',
          state: pick('administrative_area_level_1') || '',
          country: pick('country') || 'Canada',
          postalCode: pick('postal_code') || '',
          latitude,
          longitude
        }));
      });
    }
    
    // Service Area Autocomplete - EXACTLY like EnhancedSearchBar
    if (serviceAreaInputRef.current && !serviceAreaAutocompleteRef.current) {
      serviceAreaAutocompleteRef.current = new window.google.maps.places.Autocomplete(serviceAreaInputRef.current, {
        types: ['(cities)'],
        componentRestrictions: { country: 'ca' }
      });
      
      serviceAreaAutocompleteRef.current.addListener('place_changed', () => {
        const place = serviceAreaAutocompleteRef.current.getPlace();
        
        if (!place || !place.address_components) {
          return;
        }
        
        const comps = place.address_components;
        const pick = (type) => comps.find(c => c.types.includes(type))?.long_name || '';
        const city = pick('locality') || pick('postal_town') || pick('administrative_area_level_3') || '';
        const province = pick('administrative_area_level_1') || '';
        const country = pick('country') || formData.country || 'Canada';
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
        const exists = formData.serviceAreas.some(a => 
          (newArea.placeId && a.placeId && a.placeId === newArea.placeId) ||
          (a.city.toLowerCase() === newArea.city.toLowerCase() && 
           a.province.toLowerCase() === newArea.province.toLowerCase())
        );
        
        if (!exists) {
          setFormData(prev => ({
            ...prev,
            serviceAreas: [...prev.serviceAreas, newArea]
          }));
        }
        
        setServiceAreaInput('');
        // Clear the input field
        if (serviceAreaInputRef.current) {
          serviceAreaInputRef.current.value = '';
        }
      });
    }
  };
  
  const loadLocationData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/location`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // The /vendors/:id/location endpoint returns data directly (not nested)
        const newFormData = {
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          postalCode: data.postalCode || '',
          country: data.country || 'Canada',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          serviceAreas: (data.serviceAreas || []).map(a => ({
            placeId: a.placeId || a.GooglePlaceID || null,
            city: a.city || a.CityName || '',
            province: a.province || a.StateProvince || '',
            country: a.country || a.Country || '',
            latitude: a.latitude ?? a.Latitude ?? null,
            longitude: a.longitude ?? a.Longitude ?? null,
            serviceRadius: a.serviceRadius ?? a.ServiceRadius ?? 25.0,
            formattedAddress: a.formattedAddress || a.FormattedAddress || null,
            placeType: a.placeType || a.PlaceType || null
          }))
        };
        setFormData(newFormData);
        setOriginalData(newFormData);
        
        // Load service location scope from attributes
        if (data.serviceLocationScope) {
          // Handle both single value and array
          const scopes = Array.isArray(data.serviceLocationScope) 
            ? data.serviceLocationScope 
            : [data.serviceLocationScope];
          setServiceLocationScopes(scopes);
          setOriginalScopes(scopes);
        }
        
        // Manually update the address input value since we're using ref
        if (addressInputRef.current && newFormData.address) {
          addressInputRef.current.value = newFormData.address;
        }
      }
    } catch (error) {
      console.error('Error loading location:', error);
    } finally {
      setLoading(false);
      // Don't reinitialize - it's already initialized from the first useEffect
    }
  };

  const handleAddServiceArea = () => {
    const raw = serviceAreaInput.trim();
    if (!raw) return;
    
    // Manual entry (fallback if autocomplete not used)
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    const city = parts[0] || raw;
    const province = parts[1] || formData.state || '';
    const country = formData.country || 'Canada';
    
    const newArea = {
      city,
      province,
      country,
      serviceRadius: 25.0
    };
    
    setFormData(prev => ({
      ...prev,
      serviceAreas: [...prev.serviceAreas, newArea]
    }));
    setServiceAreaInput('');
  };

  const handleRemoveServiceArea = (index) => {
    setFormData({
      ...formData,
      serviceAreas: formData.serviceAreas.filter((_, i) => i !== index)
    });
  };

  // Check if there are changes
  const hasChanges = originalData ? (
    formData.address !== originalData.address ||
    formData.city !== originalData.city ||
    formData.state !== originalData.state ||
    formData.postalCode !== originalData.postalCode ||
    formData.country !== originalData.country ||
    JSON.stringify(formData.serviceAreas) !== JSON.stringify(originalData.serviceAreas) ||
    JSON.stringify([...serviceLocationScopes].sort()) !== JSON.stringify([...originalScopes].sort())
  ) : false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const payload = {
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
        postalCode: formData.postalCode.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        serviceAreas: formData.serviceAreas,
        serviceLocationScope: serviceLocationScopes
      };
      
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        showBanner('Location saved successfully!', 'success');
        setOriginalData({ ...formData });
        setOriginalScopes([...serviceLocationScopes]);
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save location');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      showBanner('Failed to save changes: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
        </button>
        <div className="dashboard-card">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
        <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
      </button>
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-map-marker-alt"></i>
          </span>
          Location & Service Areas
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Set your business address and define the geographic areas you serve to help clients find you.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />
        
        <form id="vendor-location-form" onSubmit={handleSubmit}>
          {/* Row 1: Street Address and City */}
          <div className="form-row">
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="loc-address">Street Address</label>
                <input
                  type="text"
                  id="loc-address"
                  ref={addressInputRef}
                  defaultValue={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Start typing your address..."
                />
              </div>
            </div>
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="loc-city">City</label>
                <input
                  type="text"
                  id="loc-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Province and Country */}
          <div className="form-row">
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="loc-state">Province</label>
                <input
                  type="text"
                  id="loc-state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            </div>
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="loc-country">Country</label>
                <input
                  type="text"
                  id="loc-country"
                  placeholder="Canada"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Row 3: Postal Code */}
          <div className="form-row">
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="loc-postal">Postal Code</label>
                <input
                  type="text"
                  id="loc-postal"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                />
              </div>
            </div>
            <div className="form-col"></div>
          </div>

          {/* Service Areas Section */}
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
              Service Areas <span style={{ color: 'var(--accent)' }}>*</span>
            </h3>
            <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              Add the cities or regions where you offer your services
            </p>

            <div className="form-row" style={{ marginBottom: '0.5rem' }}>
              <div className="form-col">
                <div className="form-group">
                  <label htmlFor="service-area-input">Add City/Region</label>
                  <input
                    type="text"
                    id="service-area-input"
                    ref={serviceAreaInputRef}
                    placeholder="Start typing a city name..."
                    value={serviceAreaInput}
                    onChange={(e) => setServiceAreaInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddServiceArea();
                      }
                    }}
                  />
                  <div className="pac-container" style={{ display: 'none' }}></div>
                </div>
              </div>
              <div className="form-col">
                <div className="form-group">
                  <label style={{ visibility: 'hidden' }}>Action</label>
                  <button
                    type="button"
                    className="btn btn-primary"
                    id="add-service-area-btn"
                    onClick={handleAddServiceArea}
                  >
                    <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>Add
                  </button>
                </div>
              </div>
            </div>

            <div
              id="service-areas-list"
              style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', minHeight: '2rem', marginBottom: '0.5rem' }}
            >
              {formData.serviceAreas.map((area, index) => {
                const label = [area.city, area.province || area.state].filter(Boolean).join(', ');
                return (
                  <span
                    key={index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.875rem',
                      background: '#f3f4f6',
                      border: 'none',
                      color: '#374151',
                      borderRadius: '8px',
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
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: '0',
                        fontSize: '1rem',
                        lineHeight: 1
                      }}
                      onMouseOver={(e) => e.target.style.color = 'var(--accent)'}
                      onMouseOut={(e) => e.target.style.color = '#6b7280'}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Service Location Scope - White with grey border unselected, grey when selected */}
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
              Service Location
            </h3>
            <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Select all areas where you are willing to provide your services
            </p>
            <SelectableTileGroup>
              {serviceLocations.map(loc => (
                <SelectableTile
                  key={loc.key}
                  label={loc.label}
                  isSelected={serviceLocationScopes.includes(loc.key)}
                  onClick={() => {
                    const isSelected = serviceLocationScopes.includes(loc.key);
                    if (isSelected) {
                      if (serviceLocationScopes.length > 1) {
                        setServiceLocationScopes(serviceLocationScopes.filter(s => s !== loc.key));
                      }
                    } else {
                      setServiceLocationScopes([...serviceLocationScopes, loc.key]);
                    }
                  }}
                />
              ))}
            </SelectableTileGroup>
          </div>

          <button 
            type="submit" 
            disabled={!hasChanges || saving}
            style={{ 
              marginTop: '2rem',
              backgroundColor: (!hasChanges || saving) ? '#9ca3af' : '#3d3d3d', 
              border: 'none', 
              color: 'white',
              padding: '12px 20px',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '14px',
              cursor: (!hasChanges || saving) ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LocationServiceAreasPanel;
