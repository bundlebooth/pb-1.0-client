// REMAINING STEP COMPONENTS FOR BecomeVendorPage.js
// Add these to the BecomeVendorPage_COMPLETE.js file before the export statement

import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { showBanner } from '../utils/helpers';

export function BusinessDetailsStep({ formData, onInputChange }) {
  return (
    <div className="business-details-step">
      <div className="form-group">
        <label>Business Name *</label>
        <input
          type="text"
          value={formData.businessName}
          onChange={(e) => onInputChange('businessName', e.target.value)}
          className="form-input"
          placeholder="e.g., Elegant Events Catering"
        />
      </div>

      <div className="form-group">
        <label>Display Name *</label>
        <input
          type="text"
          value={formData.displayName}
          onChange={(e) => onInputChange('displayName', e.target.value)}
          className="form-input"
          placeholder="How you want to appear to clients"
        />
      </div>

      <div className="form-group">
        <label>Business Description</label>
        <textarea
          value={formData.businessDescription}
          onChange={(e) => onInputChange('businessDescription', e.target.value)}
          className="form-textarea"
          rows="5"
          placeholder="Tell clients about your business, what makes you unique, and what they can expect..."
        />
      </div>

      <div className="form-group">
        <label>Years in Business</label>
        <input
          type="number"
          value={formData.yearsInBusiness}
          onChange={(e) => onInputChange('yearsInBusiness', e.target.value)}
          className="form-input"
          min="0"
          placeholder="e.g., 5"
        />
      </div>
    </div>
  );
}

export function ContactStep({ formData, onInputChange }) {
  return (
    <div className="contact-step">
      <div className="form-group">
        <label>Business Phone *</label>
        <input
          type="tel"
          value={formData.businessPhone}
          onChange={(e) => onInputChange('businessPhone', e.target.value)}
          className="form-input"
          placeholder="(555) 123-4567"
        />
      </div>

      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => onInputChange('email', e.target.value)}
          className="form-input"
          placeholder="your@email.com"
        />
      </div>

      <div className="form-group">
        <label>Website</label>
        <input
          type="url"
          value={formData.website}
          onChange={(e) => onInputChange('website', e.target.value)}
          className="form-input"
          placeholder="https://yourwebsite.com"
        />
      </div>
    </div>
  );
}

export function LocationStep({ formData, onInputChange, provinces, cities, googleMapsLoaded }) {
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (googleMapsLoaded && addressInputRef.current && window.google) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        addressInputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'ca' }
        }
      );

      autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
    }
  }, [googleMapsLoaded]);

  const handlePlaceSelect = () => {
    const place = autocompleteRef.current.getPlace();
    
    if (!place.geometry) return;

    let city = '';
    let state = '';
    let postalCode = '';

    place.address_components.forEach(component => {
      const types = component.types;
      if (types.includes('locality')) {
        city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      }
      if (types.includes('postal_code')) {
        postalCode = component.long_name;
      }
    });

    onInputChange('address', place.formatted_address);
    onInputChange('city', city);
    onInputChange('state', state);
    onInputChange('postalCode', postalCode);
    onInputChange('latitude', place.geometry.location.lat());
    onInputChange('longitude', place.geometry.location.lng());
  };

  const handleServiceAreaToggle = (city) => {
    const newAreas = formData.serviceAreas.includes(city)
      ? formData.serviceAreas.filter(c => c !== city)
      : [...formData.serviceAreas, city];
    onInputChange('serviceAreas', newAreas);
  };

  return (
    <div className="location-step">
      <div className="step-info-banner">
        <p>💡 Start typing your address and select from the suggestions. Your location helps clients find you.</p>
      </div>

      <div className="form-group">
        <label>Business Address *</label>
        <input
          ref={addressInputRef}
          type="text"
          placeholder="Start typing your address..."
          value={formData.address}
          onChange={(e) => onInputChange('address', e.target.value)}
          className="form-input"
        />
        <small className="form-help">Use Google Maps autocomplete for accurate location</small>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>City *</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => onInputChange('city', e.target.value)}
            className="form-input"
            placeholder="City"
          />
        </div>
        <div className="form-group">
          <label>Province *</label>
          <select
            value={formData.state}
            onChange={(e) => onInputChange('state', e.target.value)}
            className="form-select"
          >
            <option value="">Select Province</option>
            {provinces.map(province => (
              <option key={province} value={province}>{province}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Postal Code</label>
          <input
            type="text"
            value={formData.postalCode}
            onChange={(e) => onInputChange('postalCode', e.target.value)}
            className="form-input"
            placeholder="A1A 1A1"
          />
        </div>
        <div className="form-group">
          <label>Country</label>
          <input
            type="text"
            value={formData.country}
            className="form-input"
            readOnly
          />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '2rem' }}>
        <label>Service Areas (Optional)</label>
        <p className="form-help">Select the cities where you provide services</p>
        <div className="service-areas-grid">
          {cities.map(city => (
            <label key={city} className="checkbox-pill">
              <input
                type="checkbox"
                checked={formData.serviceAreas.includes(city)}
                onChange={() => handleServiceAreaToggle(city)}
              />
              <span>{city}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ServicesStep({ formData, setFormData }) {
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedServiceIds, setSelectedServiceIds] = useState(new Set());

  useEffect(() => {
    loadServices();
  }, [formData.primaryCategory, formData.additionalCategories]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vendors/predefined-services`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const servicesByCategory = data.servicesByCategory || {};
        
        // Get all categories
        const allCategories = [formData.primaryCategory, ...formData.additionalCategories].filter(Boolean);
        
        // Filter services by selected categories
        const filteredServices = [];
        allCategories.forEach(category => {
          if (servicesByCategory[category]) {
            servicesByCategory[category].forEach(service => {
              filteredServices.push({ ...service, category });
            });
          }
        });
        
        setAvailableServices(filteredServices);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = (service) => {
    const newSet = new Set(selectedServiceIds);
    if (newSet.has(service.id)) {
      newSet.delete(service.id);
      setFormData(prev => ({
        ...prev,
        selectedServices: prev.selectedServices.filter(s => s.serviceId !== service.id)
      }));
    } else {
      newSet.add(service.id);
      setFormData(prev => ({
        ...prev,
        selectedServices: [...prev.selectedServices, {
          serviceId: service.id,
          serviceName: service.name,
          price: 0,
          pricingModel: 'fixed_price'
        }]
      }));
    }
    setSelectedServiceIds(newSet);
  };

  const handlePriceChange = (serviceId, price) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.map(s =>
        s.serviceId === serviceId ? { ...s, price: parseFloat(price) || 0 } : s
      )
    }));
  };

  if (loading) {
    return <div className="loading">Loading services...</div>;
  }

  return (
    <div className="services-step">
      <div className="step-info-banner">
        <p>💡 Select the services you offer and set your pricing. You can add more services later.</p>
      </div>

      {availableServices.length === 0 ? (
        <div className="no-services">
          <p>No services available for your selected categories. You can add custom services later in your dashboard.</p>
        </div>
      ) : (
        <div className="services-list">
          {availableServices.map(service => {
            const isSelected = selectedServiceIds.has(service.id);
            const selectedService = formData.selectedServices.find(s => s.serviceId === service.id);
            
            return (
              <div key={service.id} className={`service-item ${isSelected ? 'selected' : ''}`}>
                <div className="service-header">
                  <label className="service-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleServiceToggle(service)}
                    />
                    <span className="service-name">{service.name}</span>
                  </label>
                  <span className="service-category-badge">{service.category}</span>
                </div>
                {service.description && (
                  <p className="service-description">{service.description}</p>
                )}
                {isSelected && (
                  <div className="service-pricing">
                    <label>Your Price</label>
                    <input
                      type="number"
                      value={selectedService?.price || ''}
                      onChange={(e) => handlePriceChange(service.id, e.target.value)}
                      className="form-input"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Continue in next file...
