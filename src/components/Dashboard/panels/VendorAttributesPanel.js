import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config';
import { showBanner } from '../../../utils/helpers';

function VendorAttributesPanel({ onBack, vendorProfileId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Lookup data
  const [eventTypesOptions, setEventTypesOptions] = useState([]);
  const [culturesOptions, setCulturesOptions] = useState([]);
  const [experienceRanges, setExperienceRanges] = useState([]);
  const [serviceLocations, setServiceLocations] = useState([]);
  const [leadTimeOptions, setLeadTimeOptions] = useState([]);
  const [subcategoriesOptions, setSubcategoriesOptions] = useState([]);
  
  // Selected values
  const [selectedEventTypes, setSelectedEventTypes] = useState([]);
  const [selectedCultures, setSelectedCultures] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [serviceLocationScope, setServiceLocationScope] = useState('Local');
  const [yearsOfExperienceRange, setYearsOfExperienceRange] = useState('');
  const [instantBookingEnabled, setInstantBookingEnabled] = useState(false);
  const [minBookingLeadTimeHours, setMinBookingLeadTimeHours] = useState(24);
  const [primaryCategory, setPrimaryCategory] = useState('');
  
  // Original values for change tracking
  const [originalData, setOriginalData] = useState(null);

  // Check if there are changes
  const hasChanges = originalData ? (
    JSON.stringify(selectedEventTypes.sort()) !== JSON.stringify((originalData.eventTypes || []).sort()) ||
    JSON.stringify(selectedCultures.sort()) !== JSON.stringify((originalData.cultures || []).sort()) ||
    JSON.stringify(selectedSubcategories.sort()) !== JSON.stringify((originalData.subcategories || []).sort()) ||
    serviceLocationScope !== originalData.serviceLocationScope ||
    yearsOfExperienceRange !== originalData.yearsOfExperienceRange ||
    instantBookingEnabled !== originalData.instantBookingEnabled ||
    minBookingLeadTimeHours !== originalData.minBookingLeadTimeHours
  ) : false;

  useEffect(() => {
    loadData();
  }, [vendorProfileId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Load all lookup data in parallel
      const [eventTypesRes, culturesRes, experienceRes, locationsRes, leadTimesRes, attributesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/vendors/lookup/event-types`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/vendors/lookup/cultures`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/vendors/lookup/experience-ranges`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/vendors/lookup/service-locations`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/vendors/lookup/lead-times`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/attributes`, { headers: { 'Authorization': `Bearer ${token}` } })
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
      
      if (attributesRes.ok) {
        const data = await attributesRes.json();
        const attrs = data.attributes || {};
        const eventTypes = attrs.eventTypes?.map(et => et.EventTypeID) || [];
        const cultures = attrs.cultures?.map(c => c.CultureID) || [];
        const subcategories = attrs.subcategories?.map(s => s.SubcategoryID) || [];
        const locationScope = attrs.serviceLocationScope || 'Local';
        const experienceRange = attrs.yearsOfExperienceRange || '';
        const instantBooking = attrs.instantBookingEnabled || false;
        const leadTime = attrs.minBookingLeadTimeHours || 24;
        
        setSelectedEventTypes(eventTypes);
        setSelectedCultures(cultures);
        setSelectedSubcategories(subcategories);
        setServiceLocationScope(locationScope);
        setYearsOfExperienceRange(experienceRange);
        setInstantBookingEnabled(instantBooking);
        setMinBookingLeadTimeHours(leadTime);
        
        // Store original data for change tracking
        setOriginalData({
          eventTypes,
          cultures,
          subcategories,
          serviceLocationScope: locationScope,
          yearsOfExperienceRange: experienceRange,
          instantBookingEnabled: instantBooking,
          minBookingLeadTimeHours: leadTime
        });
        
        // Get primary category from categories
        const primaryCat = attrs.categories?.find(c => c.IsPrimary)?.Category || attrs.categories?.[0]?.Category || '';
        setPrimaryCategory(primaryCat);
        
        // Load subcategories for the primary category
        if (primaryCat) {
          const subcatRes = await fetch(`${API_BASE_URL}/vendors/lookup/subcategories?category=${encodeURIComponent(primaryCat)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (subcatRes.ok) {
            const subcatData = await subcatRes.json();
            setSubcategoriesOptions(subcatData.subcategories || []);
          }
        }
      }
    } catch (error) {
      console.error('Error loading vendor attributes:', error);
      showBanner('Failed to load vendor attributes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleEventType = (eventTypeId) => {
    setSelectedEventTypes(prev => 
      prev.includes(eventTypeId) 
        ? prev.filter(id => id !== eventTypeId)
        : [...prev, eventTypeId]
    );
  };

  const toggleCulture = (cultureId) => {
    setSelectedCultures(prev => 
      prev.includes(cultureId) 
        ? prev.filter(id => id !== cultureId)
        : [...prev, cultureId]
    );
  };

  const toggleSubcategory = (subcategoryId) => {
    setSelectedSubcategories(prev => 
      prev.includes(subcategoryId) 
        ? prev.filter(id => id !== subcategoryId)
        : [...prev, subcategoryId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      // Save all attributes in parallel
      const [attrRes, eventTypesRes, culturesRes, subcatRes, bookingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/vendor-attributes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ serviceLocationScope, yearsOfExperienceRange })
        }),
        fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/event-types`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ eventTypeIds: selectedEventTypes })
        }),
        fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/cultures`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ cultureIds: selectedCultures })
        }),
        fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/subcategories`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ subcategoryIds: selectedSubcategories })
        }),
        fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/booking-settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ instantBookingEnabled, minBookingLeadTimeHours })
        })
      ]);
      
      if (attrRes.ok && eventTypesRes.ok && culturesRes.ok && subcatRes.ok && bookingRes.ok) {
        showBanner('Vendor attributes saved successfully!', 'success');
        // Update original data after successful save
        setOriginalData({
          eventTypes: [...selectedEventTypes],
          cultures: [...selectedCultures],
          subcategories: [...selectedSubcategories],
          serviceLocationScope,
          yearsOfExperienceRange,
          instantBookingEnabled,
          minBookingLeadTimeHours
        });
      } else {
        throw new Error('Failed to save some attributes');
      }
    } catch (error) {
      console.error('Error saving vendor attributes:', error);
      showBanner('Failed to save vendor attributes', 'error');
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
        <h2 className="dashboard-card-title">Service Attributes</h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Event types, cultures served, and experience level.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

        {/* Event Types */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
            Event Types
          </h3>
          <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Select the types of events you serve
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {eventTypesOptions.map(et => (
              <button
                key={et.EventTypeID}
                onClick={() => toggleEventType(et.EventTypeID)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: selectedEventTypes.includes(et.EventTypeID) ? '#f3f4f6' : 'white',
                  color: '#374151',
                  fontWeight: 400,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease'
                }}
              >
                {et.EventTypeName}
              </button>
            ))}
          </div>
        </div>

        {/* Cultures Served */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
            Cultures Served
          </h3>
          <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Select the cultural communities you specialize in serving
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {culturesOptions.map(culture => (
              <button
                key={culture.CultureID}
                onClick={() => toggleCulture(culture.CultureID)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: selectedCultures.includes(culture.CultureID) ? '#f3f4f6' : 'white',
                  color: '#374151',
                  fontWeight: 400,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease'
                }}
              >
                {culture.CultureName}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          style={{ 
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
      </div>
    </div>
  );
}

export default VendorAttributesPanel;
