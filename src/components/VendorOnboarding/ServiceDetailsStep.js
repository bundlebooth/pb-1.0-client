import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import SelectableTile, { SelectableTileGroup } from '../common/SelectableTile';

// Category ID to display name - IDs match DB directly, no mapping needed
const CATEGORY_ID_TO_NAME = {
  'venue': 'Venues',
  'photo': 'Photography',
  'video': 'Videography',
  'music': 'Music',
  'dj': 'DJ',
  'catering': 'Catering',
  'entertainment': 'Entertainment',
  'experiences': 'Experiences',
  'decorations': 'Decorations',
  'beauty': 'Beauty',
  'cake': 'Cake',
  'transportation': 'Transportation',
  'planners': 'Planners',
  'fashion': 'Fashion',
  'stationery': 'Stationery'
};

// Map vendor category IDs to feature category names
const CATEGORY_TO_FEATURE_MAP = {
  'venue': ['Venue Features'],
  'photo': ['Photography & Video'],
  'video': ['Photography & Video'],
  'music': ['Music & Entertainment'],
  'dj': ['Music & Entertainment'],
  'catering': ['Catering & Bar'],
  'entertainment': ['Music & Entertainment', 'Experience Services'],
  'experiences': ['Experience Services'],
  'decorations': ['Floral & Decor'],
  'beauty': ['Beauty & Fashion Services'],
  'cake': ['Cake & Desserts'],
  'transportation': ['Transportation'],
  'planners': ['Event Planning', 'Event Services'],
  'fashion': ['Fashion & Attire', 'Beauty & Fashion Services'],
  'stationery': ['Stationery & Paper Goods']
};

/**
 * ServiceDetailsStep - Vendor onboarding step for selecting subcategories, event types, cultures,
 * and features/amenities. Category questions are now in CategoryQuestionsStep.
 */
function ServiceDetailsStep({ formData, onInputChange, setFormData, currentUser }) {
  // Subcategories state
  const [subcategories, setSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  
  // Event Types state
  const [eventTypes, setEventTypes] = useState([]);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);
  
  // Cultures state
  const [cultures, setCultures] = useState([]);
  const [loadingCultures, setLoadingCultures] = useState(false);
  
  // Features state
  const [featureCategories, setFeatureCategories] = useState([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  
  // Load event types and cultures on mount
  useEffect(() => {
    loadEventTypes();
    loadCultures();
  }, []);

  // Fetch category-specific data when primary category changes
  useEffect(() => {
    if (!formData.primaryCategory) {
      setSubcategories([]);
      setFeatureCategories([]);
      return;
    }
    
    const categoryName = CATEGORY_ID_TO_NAME[formData.primaryCategory] || formData.primaryCategory;
    loadSubcategories(categoryName);
    loadFeatures(categoryName);
  }, [formData.primaryCategory]);

  const loadSubcategories = async (categoryName) => {
    if (!categoryName) return;
    
    setLoadingSubcategories(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/lookup/subcategories?category=${encodeURIComponent(categoryName)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSubcategories(data.subcategories || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setSubcategories([]);
    } finally {
      setLoadingSubcategories(false);
    }
  };

  const loadEventTypes = async () => {
    try {
      setLoadingEventTypes(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/lookup/event-types`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEventTypes(data.eventTypes || []);
      }
    } catch (error) {
      console.error('Error loading event types:', error);
    } finally {
      setLoadingEventTypes(false);
    }
  };

  const loadCultures = async () => {
    try {
      setLoadingCultures(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/lookup/cultures`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCultures(data.cultures || []);
      }
    } catch (error) {
      console.error('Error loading cultures:', error);
    } finally {
      setLoadingCultures(false);
    }
  };

  const loadFeatures = async (categoryName) => {
    if (!categoryName) return;
    
    try {
      setLoadingFeatures(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/features/all-grouped`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Filter categories based on vendor's category
        const applicableFeatureCategories = CATEGORY_TO_FEATURE_MAP[categoryName] || [];
        const catId = formData.primaryCategory;
        
        const filteredCategories = (data.categories || []).filter(cat => {
          const matchesByMap = applicableFeatureCategories.includes(cat.categoryName);
          const matchesByApplicable = cat.applicableVendorCategories === catId;
          return matchesByMap || matchesByApplicable;
        });
        
        // Filter out categories with no features
        const categoriesWithFeatures = filteredCategories.filter(cat => 
          cat.features && cat.features.length > 0 && cat.features[0]?.featureId
        );
        
        setFeatureCategories(categoriesWithFeatures);
      }
    } catch (error) {
      console.error('Error loading features:', error);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const handleSubcategoryToggle = (subcategoryId) => {
    const currentSubcategories = formData.selectedSubcategories || [];
    const newSubcategories = currentSubcategories.includes(subcategoryId)
      ? currentSubcategories.filter(id => id !== subcategoryId)
      : [...currentSubcategories, subcategoryId];
    
    onInputChange('selectedSubcategories', newSubcategories);
  };

  const toggleEventType = (eventTypeId) => {
    const current = formData.selectedEventTypes || [];
    const newSelection = current.includes(eventTypeId)
      ? current.filter(id => id !== eventTypeId)
      : [...current, eventTypeId];
    onInputChange('selectedEventTypes', newSelection);
  };

  const toggleCulture = (cultureId) => {
    const current = formData.selectedCultures || [];
    const newSelection = current.includes(cultureId)
      ? current.filter(id => id !== cultureId)
      : [...current, cultureId];
    onInputChange('selectedCultures', newSelection);
  };

  const toggleFeature = (featureId) => {
    const current = formData.selectedFeatures || [];
    const newSelection = current.includes(featureId)
      ? current.filter(id => id !== featureId)
      : [...current, featureId];
    onInputChange('selectedFeatures', newSelection);
  };

  const selectedSubcategoriesCount = (formData.selectedSubcategories || []).length;
  const selectedEventTypesCount = (formData.selectedEventTypes || []).length;
  const selectedCulturesCount = (formData.selectedCultures || []).length;
  const selectedFeaturesCount = (formData.selectedFeatures || []).length;

  return (
    <div className="service-details-step">
      {/* Subcategories/Services Section */}
      {formData.primaryCategory && (
        <>
          <h3 style={{ 
            marginBottom: '1rem', 
            color: '#222', 
            fontSize: '1.125rem', 
            fontWeight: '600'
          }}>
            Select Your Services <span style={{ color: '#ef4444' }}>*</span>
          </h3>
          <p style={{ marginBottom: '1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Select all the specific services you offer within your category. This helps clients find exactly what they need.
          </p>
          
          {loadingSubcategories ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
              Loading services...
            </div>
          ) : subcategories.length > 0 ? (
            <SelectableTileGroup>
              {subcategories.map(subcategory => {
                const isSelected = (formData.selectedSubcategories || []).includes(subcategory.SubcategoryID);
                return (
                  <SelectableTile
                    key={subcategory.SubcategoryID}
                    label={subcategory.SubcategoryName}
                    isSelected={isSelected}
                    onClick={() => handleSubcategoryToggle(subcategory.SubcategoryID)}
                  />
                );
              })}
            </SelectableTileGroup>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem', 
              color: '#6b7280',
              background: '#f9fafb',
              borderRadius: '8px'
            }}>
              No specific services available for this category yet.
            </div>
          )}
        </>
      )}

      {/* Event Types Section */}
      {eventTypes.length > 0 && (
        <>
          <h3 style={{ 
            marginBottom: '1rem', 
            color: '#222', 
            fontSize: '1.125rem', 
            fontWeight: '600'
          }}>
            Event Types
          </h3>
          <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
            What types of events do you serve?
          </p>
          {loadingEventTypes ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
              Loading event types...
            </div>
          ) : (
            <SelectableTileGroup>
              {eventTypes.map(et => {
                const isSelected = (formData.selectedEventTypes || []).includes(et.EventTypeID);
                return (
                  <SelectableTile
                    key={et.EventTypeID}
                    label={et.EventTypeName}
                    isSelected={isSelected}
                    onClick={() => toggleEventType(et.EventTypeID)}
                  />
                );
              })}
            </SelectableTileGroup>
          )}
        </>
      )}

      {/* Cultures Served Section */}
      {cultures.length > 0 && (
        <>
          <h3 style={{ 
            marginTop: '2.5rem', 
            marginBottom: '1rem', 
            color: '#222', 
            fontSize: '1.125rem', 
            fontWeight: '600'
          }}>
            Cultures Served
          </h3>
          <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Select the cultural communities you specialize in serving (optional)
          </p>
          {loadingCultures ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
              Loading cultures...
            </div>
          ) : (
            <SelectableTileGroup>
              {cultures.map(culture => {
                const isSelected = (formData.selectedCultures || []).includes(culture.CultureID);
                return (
                  <SelectableTile
                    key={culture.CultureID}
                    label={culture.CultureName}
                    isSelected={isSelected}
                    onClick={() => toggleCulture(culture.CultureID)}
                  />
                );
              })}
            </SelectableTileGroup>
          )}
        </>
      )}

      {/* Features & Amenities Section */}
      {featureCategories.length > 0 && (
        <>
          <h3 style={{ 
            marginTop: '2.5rem', 
            marginBottom: '1rem', 
            color: '#222', 
            fontSize: '1.125rem', 
            fontWeight: '600'
          }}>
            Features & Amenities
          </h3>
          <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Select the amenities and capabilities you offer
          </p>
          {loadingFeatures ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
              Loading features...
            </div>
          ) : (
            <div>
              {featureCategories.map(cat => (
                <div key={cat.categoryName} style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.5rem' }}>
                    {cat.categoryName}
                  </div>
                  <SelectableTileGroup>
                    {cat.features.map(feature => {
                      const featureId = feature.FeatureID || feature.featureId;
                      const featureName = feature.FeatureName || feature.featureName;
                      const isSelected = (formData.selectedFeatures || []).includes(featureId);
                      return (
                        <SelectableTile
                          key={featureId}
                          label={featureName}
                          isSelected={isSelected}
                          onClick={() => toggleFeature(featureId)}
                          size="small"
                        />
                      );
                    })}
                  </SelectableTileGroup>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Show message if no category selected */}
      {!formData.primaryCategory && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          color: '#6b7280',
          background: '#f9fafb',
          borderRadius: '12px'
        }}>
          <i className="fas fa-info-circle" style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block' }}></i>
          <p style={{ margin: 0 }}>Please select a category in the previous step to see service details options.</p>
        </div>
      )}
    </div>
  );
}

export default ServiceDetailsStep;
