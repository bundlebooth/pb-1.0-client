import React, { useState, useEffect } from 'react';
import { showBanner } from '../../../utils/helpers';
import { apiGet, apiPut } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';
import '../../../styles/dashboard.css';

function PopularFiltersPanel({ onBack, vendorProfileId }) {
  const [loading, setLoading] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState([]);

  const filterOptions = [
    { id: 'filter-premium', label: 'Premium', icon: 'fa-crown', color: '#fbbf24', description: 'Mark your business as a premium service provider' },
    { id: 'filter-eco-friendly', label: 'Eco-Friendly', icon: 'fa-leaf', color: '#10b981', description: 'Show that your business follows environmentally friendly practices' },
    { id: 'filter-award-winning', label: 'Award Winning', icon: 'fa-trophy', color: '#f59e0b', description: 'Indicate that your business has received industry awards or recognition' },
    { id: 'filter-last-minute', label: 'Last Minute Availability', icon: 'fa-bolt', color: '#3b82f6', description: 'Accept bookings on short notice and accommodate urgent requests' },
    { id: 'filter-certified', label: 'Certified', icon: 'fa-award', color: '#8b5cf6', description: 'Your business holds relevant industry certifications or qualifications' },
    { id: 'filter-insured', label: 'Insured', icon: 'fa-shield-alt', color: '#10b981', description: 'Your business carries appropriate liability insurance coverage' },
    { id: 'filter-local', label: 'Local', icon: 'fa-map-marker-alt', color: '#ef4444', description: 'Your business is locally owned and operated in your community' },
    { id: 'filter-accessible', label: 'Accessible', icon: 'fa-wheelchair', color: '#06b6d4', description: 'Your business is wheelchair accessible and accommodates people with disabilities' }
  ];

  useEffect(() => {
    if (vendorProfileId) {
      loadFilters();
    } else {
      setLoading(false);
    }
  }, [vendorProfileId]);

  const loadFilters = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/filters`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const filters = data.filters ? data.filters.split(',').filter(f => f) : [];
        setSelectedFilters(filters);
      }
    } catch (error) {
      console.error('[PopularFiltersPanel] Error loading filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFilter = (filterId) => {
    setSelectedFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/filters`, {
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
        showBanner('Filters updated successfully!', 'success');
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showBanner('Failed to save changes', 'error');
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
          <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1rem' }}>
            <i className="fas fa-tags"></i>
          </span>
          Popular Filters
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Enable special badges and filters that help clients find your business when browsing.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

        <form id="vendor-popular-filters-form" onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {filterOptions.map(filter => (
              <label key={filter.id} className="filter-row-card">
                <input
                  type="checkbox"
                  id={filter.id}
                  checked={selectedFilters.includes(filter.id)}
                  onChange={() => handleToggleFilter(filter.id)}
                />
                <i className={`fas ${filter.icon}`} style={{ color: filter.color }}></i>
                <span className="filter-row-content">
                  <span className="filter-row-title">{filter.label}</span>
                  <span className="filter-row-description">{filter.description}</span>
                </span>
              </label>
            ))}
          </div>

          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </form>
      </div>
    </div>
  );
}

export default PopularFiltersPanel;
