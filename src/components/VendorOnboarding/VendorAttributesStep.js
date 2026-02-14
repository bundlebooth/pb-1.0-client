import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { showBanner } from '../../utils/helpers';

/**
 * VendorAttributesStep - Captures event types, cultures, service location, experience, and booking settings
 */
function VendorAttributesStep({ formData, setFormData, currentUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Lookup data
  const [eventTypesOptions, setEventTypesOptions] = useState([]);
  const [culturesOptions, setCulturesOptions] = useState([]);
  const [experienceRanges, setExperienceRanges] = useState([]);
  const [serviceLocations, setServiceLocations] = useState([]);
  const [leadTimeOptions, setLeadTimeOptions] = useState([]);

  useEffect(() => {
    loadLookupData();
  }, []);

  useEffect(() => {
    if (currentUser?.vendorProfileId) {
      loadExistingAttributes();
    }
  }, [currentUser?.vendorProfileId]);

  const loadLookupData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [eventTypesRes, culturesRes, experienceRes, locationsRes, leadTimesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/vendors/lookup/event-types`, { headers }),
        fetch(`${API_BASE_URL}/vendors/lookup/cultures`, { headers }),
        fetch(`${API_BASE_URL}/vendors/lookup/experience-ranges`, { headers }),
        fetch(`${API_BASE_URL}/vendors/lookup/service-locations`, { headers }),
        fetch(`${API_BASE_URL}/vendors/lookup/lead-times`, { headers })
      ]);
      
      if (eventTypesRes.ok) {
        const data = await eventTypesRes.json();
        setEventTypesOptions(data.eventTypes || []);
      }
      if (culturesRes.ok) {
        const data = await culturesRes.json();
        setCulturesOptions(data.cultures || []);
      }
      if (experienceRes.ok) {
        const data = await experienceRes.json();
        setExperienceRanges(data.experienceRanges || []);
      }
      if (locationsRes.ok) {
        const data = await locationsRes.json();
        setServiceLocations(data.serviceLocations || []);
      }
      if (leadTimesRes.ok) {
        const data = await leadTimesRes.json();
        setLeadTimeOptions(data.leadTimes || []);
      }
    } catch (error) {
      console.error('Error loading lookup data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAttributes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/attributes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        const attrs = data.attributes || {};
        setFormData(prev => ({
          ...prev,
          selectedEventTypes: attrs.eventTypes?.map(et => et.EventTypeID) || [],
          selectedCultures: attrs.cultures?.map(c => c.CultureID) || [],
          serviceLocationScope: attrs.serviceLocationScope || 'Local',
          yearsOfExperienceRange: attrs.yearsOfExperienceRange || '',
          instantBookingEnabled: attrs.instantBookingEnabled || false,
          minBookingLeadTimeHours: attrs.minBookingLeadTimeHours || 24
        }));
      }
    } catch (error) {
      console.error('Error loading existing attributes:', error);
    }
  };

  const toggleEventType = (eventTypeId) => {
    const current = formData.selectedEventTypes || [];
    const newSelection = current.includes(eventTypeId)
      ? current.filter(id => id !== eventTypeId)
      : [...current, eventTypeId];
    setFormData(prev => ({ ...prev, selectedEventTypes: newSelection }));
  };

  const toggleCulture = (cultureId) => {
    const current = formData.selectedCultures || [];
    const newSelection = current.includes(cultureId)
      ? current.filter(id => id !== cultureId)
      : [...current, cultureId];
    setFormData(prev => ({ ...prev, selectedCultures: newSelection }));
  };

  const handleSaveAttributes = async () => {
    if (!currentUser?.vendorProfileId) {
      showBanner('Please complete your basic profile first', 'warning');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const vendorId = currentUser.vendorProfileId;
      
      // Save all attributes in parallel
      await Promise.all([
        fetch(`${API_BASE_URL}/vendors/${vendorId}/vendor-attributes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            serviceLocationScope: formData.serviceLocationScope,
            yearsOfExperienceRange: formData.yearsOfExperienceRange
          })
        }),
        fetch(`${API_BASE_URL}/vendors/${vendorId}/event-types`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ eventTypeIds: formData.selectedEventTypes || [] })
        }),
        fetch(`${API_BASE_URL}/vendors/${vendorId}/cultures`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ cultureIds: formData.selectedCultures || [] })
        }),
        fetch(`${API_BASE_URL}/vendors/${vendorId}/booking-settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            instantBookingEnabled: formData.instantBookingEnabled || false,
            minBookingLeadTimeHours: formData.minBookingLeadTimeHours || 24
          })
        })
      ]);
      
      showBanner('Attributes saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving attributes:', error);
      showBanner('Failed to save attributes', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="step-loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="vendor-attributes-step">
      <div style={{ maxWidth: '100%', width: '100%' }}>
        
        {/* Instant Booking Section */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
            <i className="fas fa-bolt" style={{ color: '#5086E8', marginRight: '0.5rem' }}></i>
            Instant Booking
          </h3>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem',
            background: formData.instantBookingEnabled ? '#eff6ff' : '#f9fafb',
            borderRadius: '12px',
            border: formData.instantBookingEnabled ? '2px solid #5086E8' : '1px solid #e5e7eb',
            cursor: 'pointer'
          }}>
            <div>
              <span style={{ fontWeight: 600, color: '#111827', display: 'block', marginBottom: '0.25rem' }}>
                Enable Instant Booking
              </span>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Allow clients to book and pay immediately without approval
              </span>
            </div>
            <input
              type="checkbox"
              checked={formData.instantBookingEnabled || false}
              onChange={(e) => setFormData(prev => ({ ...prev, instantBookingEnabled: e.target.checked }))}
              style={{ width: '24px', height: '24px', accentColor: '#5086E8' }}
            />
          </label>
        </div>

        {/* Booking Lead Time */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
            <i className="fas fa-clock" style={{ color: '#5086E8', marginRight: '0.5rem' }}></i>
            Minimum Booking Lead Time
          </h3>
          <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
            How much advance notice do you need for bookings?
          </p>
          <select
            value={formData.minBookingLeadTimeHours || 24}
            onChange={(e) => setFormData(prev => ({ ...prev, minBookingLeadTimeHours: parseInt(e.target.value) }))}
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '1rem',
              background: 'white'
            }}
          >
            {leadTimeOptions.map(option => (
              <option key={option.hours} value={option.hours}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Event Types */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
            <i className="fas fa-calendar-alt" style={{ color: '#5086E8', marginRight: '0.5rem' }}></i>
            Event Types
          </h3>
          <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
            What types of events do you serve?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {eventTypesOptions.map(et => {
              const isSelected = (formData.selectedEventTypes || []).includes(et.EventTypeID);
              return (
                <button
                  key={et.EventTypeID}
                  type="button"
                  onClick={() => toggleEventType(et.EventTypeID)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '24px',
                    border: isSelected ? '2px solid #222222' : '1px solid #d1d5db',
                    background: isSelected ? '#f9fafb' : 'white',
                    color: isSelected ? '#222222' : '#374151',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isSelected && <i className="fas fa-check" style={{ fontSize: '0.75rem' }}></i>}
                  {et.EventTypeName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cultures Served */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
            <i className="fas fa-globe" style={{ color: '#5086E8', marginRight: '0.5rem' }}></i>
            Cultures Served
          </h3>
          <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Select the cultural communities you specialize in serving (optional)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {culturesOptions.map(culture => {
              const isSelected = (formData.selectedCultures || []).includes(culture.CultureID);
              return (
                <button
                  key={culture.CultureID}
                  type="button"
                  onClick={() => toggleCulture(culture.CultureID)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '24px',
                    border: isSelected ? '2px solid #222222' : '1px solid #d1d5db',
                    background: isSelected ? '#f9fafb' : 'white',
                    color: isSelected ? '#222222' : '#374151',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isSelected && <i className="fas fa-check" style={{ fontSize: '0.75rem' }}></i>}
                  {culture.CultureName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Service Location */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
            <i className="fas fa-map-marker-alt" style={{ color: '#5086E8', marginRight: '0.5rem' }}></i>
            Service Location
          </h3>
          <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Where are you willing to provide your services?
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {serviceLocations.map(loc => (
              <label
                key={loc.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem 1.5rem',
                  borderRadius: '12px',
                  border: formData.serviceLocationScope === loc.key ? '2px solid #222222' : '1px solid #d1d5db',
                  background: formData.serviceLocationScope === loc.key ? '#f9fafb' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minWidth: '140px'
                }}
              >
                <input
                  type="radio"
                  name="serviceLocation"
                  value={loc.key}
                  checked={formData.serviceLocationScope === loc.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceLocationScope: e.target.value }))}
                  style={{ accentColor: '#222222', width: '18px', height: '18px' }}
                />
                <span style={{ fontWeight: formData.serviceLocationScope === loc.key ? 600 : 400 }}>
                  {loc.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Years of Experience */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
            <i className="fas fa-award" style={{ color: '#5086E8', marginRight: '0.5rem' }}></i>
            Years of Experience
          </h3>
          <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
            How long have you been in business?
          </p>
          <select
            value={formData.yearsOfExperienceRange || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, yearsOfExperienceRange: e.target.value }))}
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '1rem',
              background: 'white'
            }}
          >
            <option value="">Select experience range</option>
            {experienceRanges.map(range => (
              <option key={range.key} value={range.key}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

      </div>
    </div>
  );
}

export default VendorAttributesStep;
