import React, { useState, useEffect } from 'react';
import { showBanner } from '../../../utils/helpers';
import { apiGet, apiPost } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';

function VendorQuestionnairePanel({ onBack, vendorProfileId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState(new Set());
  const [originalFeatureIds, setOriginalFeatureIds] = useState(new Set());
  const [vendorCategories, setVendorCategories] = useState([]);

  // Check if there are changes
  const hasChanges = JSON.stringify([...selectedFeatureIds].sort()) !== JSON.stringify([...originalFeatureIds].sort());

  // Clear state when vendorProfileId changes
  useEffect(() => {
    setCategories([]);
    setSelectedFeatureIds(new Set());
    setOriginalFeatureIds(new Set());
    setVendorCategories([]);
  }, [vendorProfileId]);

  useEffect(() => {
    if (vendorProfileId) {
      loadQuestionnaire();
    } else {
      setLoading(false);
    }
  }, [vendorProfileId]);

  const loadQuestionnaire = async () => {
    try {
      setLoading(true);
      // Load vendor profile to get categories
      const profileRes = await apiGet(`/vendors/${vendorProfileId}`);
      
      if (profileRes.ok) {
        const result = await profileRes.json();
        
        // Handle nested structure from /vendors/:id endpoint
        const profile = result.data?.profile || result.profile || result;
        const categories = result.data?.categories || result.categories || [];
        
        // Get category names from categories array or fallback to Categories string
        let catArray = [];
        if (Array.isArray(categories) && categories.length > 0) {
          catArray = categories.map(cat => cat.Category || cat.CategoryName || cat);
        } else if (profile.Categories) {
          catArray = profile.Categories.split(',').map(c => c.trim()).filter(Boolean);
        }
        
        setVendorCategories(catArray);
      }
      
      // Fetch all features grouped by category
      const response = await fetch(`${API_BASE_URL}/vendors/features/all-grouped`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load questionnaire');
      }
      
      const data = await response.json();
      const allCategories = data.categories || [];
      setCategories(allCategories);
      
      // Load vendor's existing selections
      if (vendorProfileId) {
        const selectionsResponse = await fetch(`${API_BASE_URL}/vendors/features/vendor/${vendorProfileId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (selectionsResponse.ok) {
          const selectionsData = await selectionsResponse.json();
          const selectedIds = new Set(
            (selectionsData.selectedFeatures || []).map(f => f.FeatureID)
          );
          setSelectedFeatureIds(selectedIds);
          setOriginalFeatureIds(new Set(selectedIds));
        }
      }
    } catch (error) {
      console.error('[VendorQuestionnairePanel] ERROR loading questionnaire:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatureSelection = (featureId) => {
    setSelectedFeatureIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(featureId)) {
        newSet.delete(featureId);
      } else {
        newSet.add(featureId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      if (!vendorProfileId) {
        throw new Error('Vendor profile ID not found');
      }
      
      const featureIdsArray = Array.from(selectedFeatureIds);
      
      const response = await fetch(`${API_BASE_URL}/vendors/features/vendor/${vendorProfileId}`, {
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
        setOriginalFeatureIds(new Set(selectedFeatureIds));
      } else {
        throw new Error(responseData.message || 'Failed to save features');
      }
    } catch (error) {
      console.error('[Questionnaire] Error saving features:', error);
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

  const getFeatureIcon = (iconName) => {
    if (!iconName) return 'check';
    
    const iconMap = {
      'church': 'church',
      'chef-hat': 'hat-chef',
      'accessibility': 'wheelchair',
      'car-front': 'car',
      'speaker': 'volume-up',
      'wifi': 'wifi',
      'trees': 'tree',
      'eye': 'eye',
      'disc': 'circle',
      'presentation': 'chalkboard',
      'door-closed': 'door-closed',
      'bed': 'bed',
      'plane': 'plane',
      'users': 'users',
      'camera-off': 'camera',
      'zap': 'bolt',
      'heart': 'heart',
      'file': 'file',
      'images': 'images',
      'printer': 'print',
      'book-open': 'book-open',
      'video': 'video',
      'film': 'film',
      'radio': 'broadcast-tower',
      'mic': 'microphone',
      'volume-2': 'volume-up',
      'lightbulb': 'lightbulb',
      'glass-water': 'glass-martini',
      'list-music': 'list',
      'guitar': 'guitar',
      'mic-vocal': 'microphone-alt',
      'lamp': 'lamp',
      'cloud': 'cloud',
      'truck': 'truck',
      'badge-check': 'check-circle',
      'leaf': 'leaf',
      'wheat-off': 'ban',
      'utensils-crossed': 'utensils',
      'wine': 'wine-glass',
      'arrow-right-circle': 'arrow-circle-right',
      'beer': 'beer',
      'scroll-text': 'scroll',
      'cake': 'birthday-cake',
      'coffee': 'coffee',
      'flower': 'flower',
      'hexagon': 'hexagon',
      'rainbow': 'rainbow',
      'trending-up': 'arrow-up',
      'armchair': 'couch',
      'layers': 'layer-group',
      'lamp-desk': 'lamp',
      'wallpaper': 'image',
      'signpost': 'sign',
      'flame': 'fire',
      'circle': 'circle',
      'drama': 'theater-masks',
      'wand': 'magic',
      'flame-kindling': 'fire-alt',
      'person-standing': 'walking',
      'baby': 'baby',
      'gamepad-2': 'gamepad',
      'bus': 'bus',
      'bus-front': 'bus',
      'key-round': 'key',
      'move': 'arrows-alt',
      'palette': 'palette',
      'scissors': 'cut',
      'spray-can': 'spray-can',
      'calendar-check': 'calendar-check',
      'map-pin': 'map-marker-alt',
      'users-round': 'users',
      'hand': 'hand-paper',
      'clipboard-check': 'clipboard-check',
      'clipboard-list': 'clipboard-list',
      'calendar-days': 'calendar-alt',
      'handshake': 'handshake',
      'dollar-sign': 'dollar-sign',
      'clock': 'clock'
    };
    
    return iconMap[iconName] || iconName.replace('fa-', '').replace('fas ', '').replace('far ', '');
  };
  
  const getCategoryIcon = (icon) => {
    if (!icon) return 'list';
    return icon.replace('fa-', '').replace('fas ', '').replace('far ', '');
  };
  
  // Filter categories to only show those matching vendor's selected business categories
  const getFilteredCategories = () => {
    if (!vendorCategories || vendorCategories.length === 0) {
      return categories; // Show all if no categories set
    }
    
    // Filter using applicableVendorCategories field from API
    // Each feature category has an applicableVendorCategories field like "venue" or "photo,music"
    return categories.filter(cat => {
      const applicableCategories = (cat.applicableVendorCategories || '').toLowerCase().split(',').map(c => c.trim());
      return vendorCategories.some(vendorCat => 
        applicableCategories.includes(vendorCat.toLowerCase())
      );
    });
  };
  
  const filteredCategories = getFilteredCategories();
  
  return (
    <div>
      <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
        <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
      </button>
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-clipboard-check"></i>
          </span>
          Vendor Setup Questionnaire
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Select the features and services that apply to your business. This helps clients understand what you offer.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />
        
        <div id="vendor-questionnaire-container" style={{ marginBottom: '2rem' }}>
          {filteredCategories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
              <i className="fas fa-info-circle" style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '1rem', display: 'block' }}></i>
              <p>No questionnaire features available {vendorCategories.length > 0 ? `for your selected categories (${vendorCategories.join(', ')})` : 'for your profile'}.</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Please make sure you have set your primary category in Business Information.</p>
            </div>
          ) : (
            filteredCategories.map(category => {
              if (!category.features || category.features.length === 0) return null;
              
              return (
                <div key={category.categoryName} className="questionnaire-category" style={{ marginBottom: '2rem' }}>
                  <div className="questionnaire-category-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div className="questionnaire-category-icon" style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#222' }}>
                      <i className={`fas fa-${getCategoryIcon(category.categoryIcon)}`}></i>
                    </div>
                    <h3 className="questionnaire-category-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{category.categoryName}</h3>
                  </div>
                  <div className="questionnaire-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem 1.5rem' }}>
                    {category.features.map(feature => {
                      const isSelected = selectedFeatureIds.has(feature.featureID);
                      return (
                        <div
                          key={feature.featureID}
                          className={`feature-tile ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleFeatureSelection(feature.featureID)}
                          style={{
                            padding: '0.5rem 0.625rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            position: 'relative'
                          }}
                        >
                          <i className={`fas fa-${getFeatureIcon(feature.featureIcon)} feature-tile-icon`} style={{ color: '#717171', fontSize: '0.875rem', flexShrink: 0, width: '14px' }}></i>
                          <span className="feature-tile-name" style={{ fontSize: '0.9375rem', color: '#222', flex: 1, lineHeight: 1.4 }}>{feature.featureName}</span>
                          {isSelected && (
                            <i className="fas fa-check feature-tile-checkmark" style={{ color: '#222', fontSize: '0.9rem', marginLeft: 'auto' }}></i>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {filteredCategories.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <button
              type="button"
              onClick={handleSubmit}
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
        )}
      </div>
    </div>
  );
}

export default VendorQuestionnairePanel;
