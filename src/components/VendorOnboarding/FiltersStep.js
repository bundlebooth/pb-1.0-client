import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { showBanner } from '../../utils/helpers';

function FiltersStep({ formData, setFormData, filterOptions, currentUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState([]);

  // Load existing filters
  useEffect(() => {
    if (currentUser?.vendorProfileId) {
      loadFilters();
    } else {
      setSelectedFilters(formData.selectedFilters || []);
      setLoading(false);
    }
  }, [currentUser?.vendorProfileId]);

  const loadFilters = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/filters`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const filters = data.filters ? data.filters.split(',').filter(f => f) : [];
        setSelectedFilters(filters);
        setFormData(prev => ({ ...prev, selectedFilters: filters }));
      }
    } catch (error) {
      console.error('[FiltersStep] Error loading filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFilter = (filterId) => {
    setSelectedFilters(prev => {
      const newFilters = prev.includes(filterId)
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId];
      
      // Also update formData
      setFormData(prevData => ({ ...prevData, selectedFilters: newFilters }));
      return newFilters;
    });
  };

  const handleSaveFilters = async () => {
    if (!currentUser?.vendorProfileId) {
      showBanner('Please complete your basic profile first', 'warning');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/filters`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          filters: selectedFilters.join(',')
        })
      });

      if (response.ok) {
        showBanner('Filters saved successfully!', 'success');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving filters:', error);
      showBanner('Failed to save filters', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="filters-step">
      <div style={{ maxWidth: '100%', width: '100%' }}>
        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <i className="fas fa-tags" style={{ color: 'var(--primary)', fontSize: '1.25rem' }}></i>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Enable Special Badges</h3>
          </div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Select badges that apply to your business. These help clients find you when browsing and filtering vendors.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {filterOptions.map(filter => {
            const isSelected = selectedFilters.includes(filter.id);
            return (
              <div
                key={filter.id}
                onClick={() => handleToggleFilter(filter.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem',
                  background: isSelected ? '#f0f9ff' : 'white',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: filter.color + '20',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <i className={`fas ${filter.icon}`} style={{ color: filter.color, fontSize: '1.5rem' }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem', color: '#111827' }}>
                    {filter.label}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>
                    {filter.description || `Enable ${filter.label} badge for your profile`}
                  </div>
                </div>
                {isSelected && (
                  <i className="fas fa-check-circle" style={{ color: 'var(--primary)', fontSize: '1.5rem' }}></i>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default FiltersStep;
