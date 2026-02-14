import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { showBanner } from '../../utils/helpers';

function QuestionnaireStep({ formData, setFormData, currentUser, setFeaturesLoadedFromDB }) {
  const [categories, setCategories] = useState([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState(new Set(formData.selectedFeatures || []));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadQuestionnaire();
  }, [formData.primaryCategory, formData.additionalCategories, currentUser?.vendorProfileId]);

  const loadQuestionnaire = async () => {
    try {
      setLoading(true);
      
      // Fetch all features grouped by category
      const response = await fetch(`${API_BASE_URL}/vendors/features/all-grouped`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      } else {
        console.error('[BecomeVendor Questionnaire] Failed to fetch, status:', response.status);
      }
      
      // Load vendor's existing selections if vendorProfileId exists
      if (currentUser?.vendorProfileId) {
        const selectionsResponse = await fetch(`${API_BASE_URL}/vendors/features/vendor/${currentUser.vendorProfileId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (selectionsResponse.ok) {
          const selectionsData = await selectionsResponse.json();
          const selectedIds = new Set(
            selectionsData.selectedFeatures?.map(f => f.FeatureID) || []
          );
          setSelectedFeatureIds(selectedIds);
          // Store feature objects with names for display in ReviewStep
          const selectedFeatureObjects = selectionsData.selectedFeatures?.map(f => ({
            id: f.FeatureID,
            name: f.FeatureName || f.Name || `Feature ${f.FeatureID}`
          })) || [];
          setFormData(prev => ({ ...prev, selectedFeatures: selectedFeatureObjects }));
          // Mark that features have been loaded from DB
          if (setFeaturesLoadedFromDB) setFeaturesLoadedFromDB(true);
        } else {
          // Still mark as loaded even if response not OK
          if (setFeaturesLoadedFromDB) setFeaturesLoadedFromDB(true);
        }
      }
    } catch (error) {
      console.error('[BecomeVendor Questionnaire] Error loading:', error);
      // Still mark as loaded even on error
      if (setFeaturesLoadedFromDB) setFeaturesLoadedFromDB(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatureSelection = (featureId, featureName) => {
    // First update the local state
    const isCurrentlySelected = selectedFeatureIds.has(featureId);
    const newSet = new Set(selectedFeatureIds);
    
    if (isCurrentlySelected) {
      newSet.delete(featureId);
    } else {
      newSet.add(featureId);
    }
    
    setSelectedFeatureIds(newSet);
    
    // Then update formData separately (not inside setState callback to avoid warning)
    const currentFeatures = formData.selectedFeatures || [];
    if (!isCurrentlySelected) {
      // Add feature object
      const exists = currentFeatures.some(f => (typeof f === 'object' ? f.id : f) === featureId);
      if (!exists) {
        setFormData(prev => ({ ...prev, selectedFeatures: [...currentFeatures, { id: featureId, name: featureName }] }));
      }
    } else {
      // Remove feature
      setFormData(prev => ({ ...prev, selectedFeatures: currentFeatures.filter(f => (typeof f === 'object' ? f.id : f) !== featureId) }));
    }
  };

  const handleSaveFeatures = async () => {
    if (!currentUser?.vendorProfileId) {
      showBanner('Please complete your basic profile first', 'warning');
      return;
    }
    
    setSaving(true);
    try {
      const featureIdsArray = Array.from(selectedFeatureIds);
      
      const response = await fetch(`${API_BASE_URL}/vendors/features/vendor/${currentUser.vendorProfileId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          featureIds: featureIdsArray
        })
      });
      
      const responseData = await response.json();
      
      if (response.ok) {
        showBanner('Features saved successfully!', 'success');
      } else {
        throw new Error(responseData.message || 'Failed to save features');
      }
    } catch (error) {
      console.error('[BecomeVendor Questionnaire] Error saving:', error);
      showBanner('Failed to save features: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const getFeatureIcon = (iconName) => {
    if (!iconName) return 'check';
    const iconMap = {
      'church': 'church', 'chef-hat': 'hat-chef', 'accessibility': 'wheelchair',
      'car-front': 'car', 'speaker': 'volume-up', 'wifi': 'wifi', 'trees': 'tree',
      'eye': 'eye', 'disc': 'circle', 'presentation': 'chalkboard', 'door-closed': 'door-closed',
      'bed': 'bed', 'plane': 'plane', 'users': 'users', 'camera-off': 'camera',
      'zap': 'bolt', 'heart': 'heart', 'file': 'file', 'images': 'images',
      'printer': 'print', 'book-open': 'book-open', 'video': 'video', 'film': 'film',
      'radio': 'broadcast-tower', 'mic': 'microphone', 'volume-2': 'volume-up',
      'lightbulb': 'lightbulb', 'glass-water': 'glass-martini', 'list-music': 'list',
      'guitar': 'guitar', 'mic-vocal': 'microphone-alt', 'lamp': 'lamp', 'cloud': 'cloud',
      'truck': 'truck', 'badge-check': 'check-circle', 'leaf': 'leaf', 'wheat-off': 'ban',
      'utensils-crossed': 'utensils', 'wine': 'wine-glass', 'arrow-right-circle': 'arrow-circle-right',
      'beer': 'beer', 'scroll-text': 'scroll', 'cake': 'birthday-cake', 'coffee': 'coffee',
      'flower': 'flower', 'hexagon': 'hexagon', 'rainbow': 'rainbow', 'trending-up': 'arrow-up',
      'armchair': 'couch', 'layers': 'layer-group', 'lamp-desk': 'lamp', 'wallpaper': 'image',
      'signpost': 'sign', 'flame': 'fire', 'circle': 'circle', 'drama': 'theater-masks',
      'wand': 'magic', 'flame-kindling': 'fire-alt', 'person-standing': 'walking',
      'baby': 'baby', 'gamepad-2': 'gamepad', 'bus': 'bus', 'bus-front': 'bus',
      'key-round': 'key', 'move': 'arrows-alt', 'palette': 'palette', 'scissors': 'cut',
      'spray-can': 'spray-can', 'calendar-check': 'calendar-check', 'map-pin': 'map-marker-alt',
      'users-round': 'users', 'hand': 'hand-paper', 'clipboard-check': 'clipboard-check',
      'clipboard-list': 'clipboard-list', 'calendar-days': 'calendar-alt', 'handshake': 'handshake',
      'dollar-sign': 'dollar-sign', 'clock': 'clock'
    };
    return iconMap[iconName] || iconName.replace('fa-', '');
  };

  const getCategoryIcon = (icon) => {
    if (!icon) return 'list';
    return icon.replace('fa-', '');
  };

  // Filter categories based on selected primary and additional categories
  const getFilteredCategories = () => {
    const selectedCategoryIds = [
      formData.primaryCategory,
      ...(formData.additionalCategories || [])
    ].filter(Boolean);
    
    if (selectedCategoryIds.length === 0) {
      return categories; // Show all if no categories selected
    }
    
    // Filter using applicableVendorCategories field from API
    return categories.filter(cat => {
      const applicableCategories = (cat.applicableVendorCategories || '').toLowerCase().split(',').map(c => c.trim());
      return selectedCategoryIds.some(vendorCat => 
        applicableCategories.includes(vendorCat.toLowerCase())
      );
    });
  };

  const filteredCategories = getFilteredCategories();

  if (loading) {
    return (
      <div className="step-loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="questionnaire-step">
      <div style={{ maxWidth: '100%', width: '100%' }}>
        {filteredCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#f9fafb', borderRadius: '12px', border: '2px dashed #e5e7eb' }}>
            <i className="fas fa-info-circle" style={{ fontSize: '3rem', color: 'var(--text-light)', marginBottom: '1rem' }}></i>
            <p style={{ color: 'var(--text-light)', fontSize: '1.1rem', margin: 0 }}>
              No features available for your selected categories yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '2.5rem' }}>
            {filteredCategories.map(category => {
              if (!category.features || category.features.length === 0) return null;
              
              return (
                <div key={category.categoryName} style={{ background: 'white', borderRadius: '16px', padding: '0' }}>
                  <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#1f2937' }}>
                    {category.categoryName}
                  </h3>
                  <div className="features-grid-3col">
                    {category.features.map(feature => {
                      const isSelected = selectedFeatureIds.has(feature.featureID);
                      return (
                        <div key={feature.featureID} style={{ display: 'flex' }}>
                          <div
                            onClick={() => toggleFeatureSelection(feature.featureID, feature.featureName)}
                            style={{
                              padding: '1rem 1.25rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.875rem',
                              borderRadius: '10px',
                              border: isSelected ? '2px solid #222222' : '1px solid #e5e7eb',
                              background: isSelected ? '#f9fafb' : 'white',
                              boxShadow: isSelected ? '0 1px 3px rgba(0, 123, 255, 0.1)' : 'none',
                              width: '100%'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = '#d1d5db';
                                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = '#e5e7eb';
                                e.currentTarget.style.boxShadow = 'none';
                              }
                            }}
                          >
                            <i 
                              className={`fas fa-${getFeatureIcon(feature.featureIcon)}`} 
                              style={{ 
                                color: '#717171', 
                                fontSize: '0.875rem', 
                                flexShrink: 0,
                                width: '14px',
                                textAlign: 'center'
                              }}
                            ></i>
                            <span style={{ 
                              fontSize: '0.9375rem', 
                              color: '#222', 
                              flex: 1, 
                              fontWeight: isSelected ? 600 : 400,
                              lineHeight: 1.4
                            }}>
                              {feature.featureName}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

export default QuestionnaireStep;
