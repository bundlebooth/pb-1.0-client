import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config';
import { showBanner } from '../../../utils/helpers';
import SelectableTile, { SelectableTileGroup } from '../../common/SelectableTile';

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
 * VendorFeaturesPanel - Panel for vendors to select features/amenities they offer
 */
function VendorFeaturesPanel({ onBack, vendorProfileId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendorCategory, setVendorCategory] = useState(null);
  const [featureCategories, setFeatureCategories] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [originalFeatures, setOriginalFeatures] = useState([]);

  // Check if there are changes
  const hasChanges = JSON.stringify([...selectedFeatures].sort()) !== JSON.stringify([...originalFeatures].sort());

  useEffect(() => {
    loadVendorCategory();
    loadSelectedFeatures();
  }, [vendorProfileId]);

  useEffect(() => {
    if (vendorCategory) {
      loadFeatures();
    }
  }, [vendorCategory]);

  const loadVendorCategory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const categories = data.data?.categories || [];
        const primary = categories.find(c => c.IsPrimary) || categories[0];
        if (primary) {
          setVendorCategory(primary.Category);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading vendor category:', error);
      setLoading(false);
    }
  };

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/features/all-grouped`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter categories based on vendor's category
        const applicableFeatureCategories = CATEGORY_TO_FEATURE_MAP[vendorCategory] || [];
        const filteredCategories = (data.categories || []).filter(cat => 
          applicableFeatureCategories.includes(cat.categoryName)
        );
        setFeatureCategories(filteredCategories);
      }
    } catch (error) {
      console.error('Error loading features:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedFeatures = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/features/vendor/${vendorProfileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const features = (data.features || []).map(f => f.FeatureID);
        setSelectedFeatures(features);
        setOriginalFeatures(features);
      }
    } catch (error) {
      console.error('Error loading selected features:', error);
    }
  };

  const toggleFeature = (featureId) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/features/vendor/${vendorProfileId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ featureIds: selectedFeatures })
      });

      if (response.ok) {
        showBanner('Features saved successfully!', 'success');
        setOriginalFeatures([...selectedFeatures]);
      } else {
        throw new Error('Failed to save features');
      }
    } catch (error) {
      console.error('Error saving features:', error);
      showBanner('Failed to save features. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getIconClass = (iconName) => {
    // Map Lucide icon names to FontAwesome equivalents
    const iconMap = {
      'church': 'fa-church',
      'trees': 'fa-tree',
      'chef-hat': 'fa-utensils',
      'accessibility': 'fa-wheelchair',
      'car-front': 'fa-car',
      'car': 'fa-car',
      'speaker': 'fa-volume-up',
      'wifi': 'fa-wifi',
      'eye': 'fa-eye',
      'disc': 'fa-compact-disc',
      'presentation': 'fa-chalkboard',
      'door-closed': 'fa-door-closed',
      'bed': 'fa-bed',
      'plane': 'fa-plane',
      'users': 'fa-users',
      'camera-off': 'fa-lock',
      'zap': 'fa-bolt',
      'heart': 'fa-heart',
      'camera': 'fa-camera',
      'images': 'fa-images',
      'book-open': 'fa-book-open',
      'file': 'fa-file',
      'printer': 'fa-print',
      'film': 'fa-film',
      'radio': 'fa-broadcast-tower',
      'guitar': 'fa-guitar',
      'music': 'fa-music',
      'lightbulb': 'fa-lightbulb',
      'mic': 'fa-microphone',
      'mic-vocal': 'fa-microphone-alt',
      'glass-water': 'fa-glass-martini-alt',
      'wine': 'fa-wine-glass-alt',
      'beer': 'fa-beer',
      'utensils': 'fa-utensils',
      'utensils-crossed': 'fa-utensils',
      'cake': 'fa-birthday-cake',
      'coffee': 'fa-coffee',
      'leaf': 'fa-leaf',
      'wheat-off': 'fa-bread-slice',
      'baby': 'fa-baby',
      'scroll-text': 'fa-scroll',
      'flower': 'fa-spa',
      'flower-2': 'fa-seedling',
      'hexagon': 'fa-shapes',
      'rainbow': 'fa-rainbow',
      'lamp': 'fa-lightbulb',
      'cloud': 'fa-cloud',
      'layers': 'fa-layer-group',
      'armchair': 'fa-chair',
      'circle': 'fa-circle',
      'flame': 'fa-fire',
      'signpost': 'fa-sign',
      'trending-up': 'fa-sort-numeric-up',
      'clipboard-check': 'fa-clipboard-check',
      'clipboard-list': 'fa-clipboard-list',
      'users-round': 'fa-user-friends',
      'calendar-days': 'fa-calendar-alt',
      'calendar-check': 'fa-calendar-check',
      'hand': 'fa-hand-paper',
      'handshake': 'fa-handshake',
      'dollar-sign': 'fa-dollar-sign',
      'bus': 'fa-bus',
      'bus-front': 'fa-bus',
      'key-round': 'fa-key',
      'sparkles': 'fa-magic',
      'flame-kindling': 'fa-fire-alt',
      'gamepad-2': 'fa-gamepad',
      'drama': 'fa-theater-masks',
      'wand': 'fa-magic',
      'palette': 'fa-palette',
      'scissors': 'fa-cut',
      'spray-can': 'fa-spray-can',
      'move': 'fa-arrows-alt',
      'map-pin': 'fa-map-marker-alt'
    };
    return iconMap[iconName] || 'fa-check';
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
        <h2 className="dashboard-card-title">Features & Amenities</h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Select the amenities and capabilities you offer.
        </p>
        
        {selectedFeatures.length > 0 && (
          <div style={{ 
            padding: '0.75rem 1rem', 
            background: '#eff6ff', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="fas fa-check-circle" style={{ color: '#5086E8' }}></i>
            <span style={{ color: '#1e40af', fontWeight: 500 }}>
              {selectedFeatures.length} feature{selectedFeatures.length !== 1 ? 's' : ''} selected
            </span>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

        {!vendorCategory ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem', 
            background: '#f9fafb', 
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Please select a primary category in Business Information first.
            </p>
          </div>
        ) : featureCategories.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem', 
            background: '#f9fafb', 
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <p style={{ color: '#6b7280', margin: 0 }}>
              No features available for {vendorCategory} category.
            </p>
          </div>
        ) : (
          <SelectableTileGroup>
            {featureCategories.flatMap(category => 
              category.features.map(feature => (
                <SelectableTile
                  key={feature.featureId}
                  label={feature.featureName}
                  isSelected={selectedFeatures.includes(feature.featureId)}
                  onClick={() => toggleFeature(feature.featureId)}
                  icon={getIconClass(feature.featureIcon)}
                />
              ))
            )}
          </SelectableTileGroup>
        )}

        <div style={{ marginTop: '2rem' }}>
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
            {saving ? 'Saving...' : 'Save Features'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VendorFeaturesPanel;
