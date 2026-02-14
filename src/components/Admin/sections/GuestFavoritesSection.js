import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../../../utils/api';

function GuestFavoritesSection() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eligibilityCriteria, setEligibilityCriteria] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet('/admin/guest-favorites');
      const data = await response.json();
      if (data.success) {
        setVendors(data.vendors || []);
        setEligibilityCriteria(data.eligibilityCriteria);
      } else {
        setError(data.message || 'Failed to load vendors');
      }
    } catch (err) {
      console.error('Error loading guest favorites:', err);
      setError('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleGrant = async (vendorId) => {
    setActionLoading(vendorId);
    try {
      const response = await apiPost(`/admin/guest-favorites/${vendorId}/grant`);
      const data = await response.json();
      if (data.success) {
        loadVendors();
      } else {
        alert(data.message || 'Failed to grant status');
      }
    } catch (err) {
      console.error('Error granting guest favorite:', err);
      alert('Failed to grant status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (vendorId) => {
    if (!window.confirm('Are you sure you want to revoke Guest Favorite status from this vendor?')) {
      return;
    }
    setActionLoading(vendorId);
    try {
      const response = await apiPost(`/admin/guest-favorites/${vendorId}/revoke`);
      const data = await response.json();
      if (data.success) {
        loadVendors();
      } else {
        alert(data.message || 'Failed to revoke status');
      }
    } catch (err) {
      console.error('Error revoking guest favorite:', err);
      alert('Failed to revoke status');
    } finally {
      setActionLoading(null);
    }
  };

  const currentFavorites = vendors.filter(v => v.IsGuestFavorite);
  const eligibleVendors = vendors.filter(v => !v.IsGuestFavorite && v.MeetsEligibility);
  const otherVendors = vendors.filter(v => !v.IsGuestFavorite && !v.MeetsEligibility);

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>Vendor Badges & Guest Favorites</h2>
        <p style={{ color: '#717171', marginTop: '4px' }}>
          Manage vendor badges and "Guest Favorite" status. Grant or revoke special recognition badges.
        </p>
      </div>

      {/* Eligibility Criteria Info */}
      {eligibilityCriteria && (
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h4 style={{ margin: '0 0 8px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="far fa-info-circle"></i>
            Eligibility Criteria
          </h4>
          <p style={{ margin: 0, color: '#0c4a6e', fontSize: '0.9rem' }}>
            Vendors automatically qualify when they meet ALL of the following:
          </p>
          <ul style={{ margin: '8px 0 0', paddingLeft: '20px', color: '#0c4a6e', fontSize: '0.9rem' }}>
            <li>Average Rating ≥ <strong>{eligibilityCriteria.minRating}</strong></li>
            <li>Total Reviews ≥ <strong>{eligibilityCriteria.minReviews}</strong></li>
            <li>Total Bookings ≥ <strong>{eligibilityCriteria.minBookings}</strong></li>
            <li>Response Rate ≥ <strong>{eligibilityCriteria.minResponseRate}%</strong></li>
          </ul>
          <p style={{ margin: '8px 0 0', color: '#0c4a6e', fontSize: '0.85rem', fontStyle: 'italic' }}>
            Note: You can grant Guest Favorite status to any vendor, even if they don't meet the criteria.
          </p>
        </div>
      )}

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading vendors...</p>
        </div>
      ) : error ? (
        <div className="admin-error">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={loadVendors} className="admin-btn admin-btn-primary">
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Current Guest Favorites */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '1.1rem', 
              fontWeight: 600, 
              color: '#222', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-award" style={{ color: '#f59e0b' }}></i>
              Current Guest Favorites ({currentFavorites.length})
            </h3>
            
            {currentFavorites.length === 0 ? (
              <div style={{ 
                background: '#f9fafb', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                padding: '24px', 
                textAlign: 'center',
                color: '#6b7280'
              }}>
                No vendors have Guest Favorite status yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {currentFavorites.map(vendor => (
                  <VendorCard 
                    key={vendor.VendorProfileID} 
                    vendor={vendor} 
                    isFavorite={true}
                    onAction={() => handleRevoke(vendor.VendorProfileID)}
                    actionLoading={actionLoading === vendor.VendorProfileID}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Eligible Vendors */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '1.1rem', 
              fontWeight: 600, 
              color: '#222', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i>
              Eligible Vendors ({eligibleVendors.length})
            </h3>
            
            {eligibleVendors.length === 0 ? (
              <div style={{ 
                background: '#f9fafb', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                padding: '24px', 
                textAlign: 'center',
                color: '#6b7280'
              }}>
                No vendors currently meet all eligibility criteria.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {eligibleVendors.map(vendor => (
                  <VendorCard 
                    key={vendor.VendorProfileID} 
                    vendor={vendor} 
                    isFavorite={false}
                    isEligible={true}
                    onAction={() => handleGrant(vendor.VendorProfileID)}
                    actionLoading={actionLoading === vendor.VendorProfileID}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Other Vendors */}
          <div>
            <h3 style={{ 
              fontSize: '1.1rem', 
              fontWeight: 600, 
              color: '#222', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-store" style={{ color: '#6b7280' }}></i>
              Other Vendors ({otherVendors.length})
            </h3>
            
            {otherVendors.length === 0 ? (
              <div style={{ 
                background: '#f9fafb', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                padding: '24px', 
                textAlign: 'center',
                color: '#6b7280'
              }}>
                All vendors are either Guest Favorites or meet eligibility criteria.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {otherVendors.map(vendor => (
                  <VendorCard 
                    key={vendor.VendorProfileID} 
                    vendor={vendor} 
                    isFavorite={false}
                    isEligible={false}
                    onAction={() => handleGrant(vendor.VendorProfileID)}
                    actionLoading={actionLoading === vendor.VendorProfileID}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function VendorCard({ vendor, isFavorite, isEligible, onAction, actionLoading }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      background: isFavorite ? '#fffbeb' : '#fff',
      border: `1px solid ${isFavorite ? '#fcd34d' : '#e5e7eb'}`,
      borderRadius: '8px',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: '#f3f4f6',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {vendor.LogoURL ? (
            <img src={vendor.LogoURL} alt={vendor.BusinessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <i className="far fa-store" style={{ fontSize: '18px', color: '#9ca3af' }}></i>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: '#222' }}>{vendor.BusinessName}</span>
            {isFavorite && (
              <span style={{ 
                background: '#f59e0b', 
                color: '#fff', 
                fontSize: '0.7rem', 
                padding: '2px 6px', 
                borderRadius: '4px',
                fontWeight: 600
              }}>
                GUEST FAVORITE
              </span>
            )}
            {!isFavorite && isEligible && (
              <span style={{ 
                background: '#10b981', 
                color: '#fff', 
                fontSize: '0.7rem', 
                padding: '2px 6px', 
                borderRadius: '4px',
                fontWeight: 600
              }}>
                ELIGIBLE
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            {vendor.City}{vendor.State ? `, ${vendor.State}` : ''} • {vendor.OwnerName}
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Rating</div>
          <div style={{ fontWeight: 600, color: vendor.AvgRating >= 4.5 ? '#10b981' : '#222' }}>
            {parseFloat(vendor.AvgRating || 0).toFixed(1)}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Reviews</div>
          <div style={{ fontWeight: 600, color: vendor.TotalReviews >= 5 ? '#10b981' : '#222' }}>
            {vendor.TotalReviews || 0}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Bookings</div>
          <div style={{ fontWeight: 600, color: vendor.TotalBookings >= 10 ? '#10b981' : '#222' }}>
            {vendor.TotalBookings || 0}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Response</div>
          <div style={{ fontWeight: 600, color: vendor.ResponseRate >= 90 ? '#10b981' : '#222' }}>
            {parseFloat(vendor.ResponseRate || 0).toFixed(0)}%
          </div>
        </div>
      </div>
      
      {/* Action Button */}
      <button
        onClick={onAction}
        disabled={actionLoading}
        style={{
          padding: '8px 16px',
          borderRadius: '6px',
          border: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          cursor: actionLoading ? 'not-allowed' : 'pointer',
          background: isFavorite ? '#ef4444' : '#222',
          color: '#fff',
          opacity: actionLoading ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          whiteSpace: 'nowrap'
        }}
      >
        {actionLoading ? (
          <i className="fas fa-spinner fa-spin"></i>
        ) : isFavorite ? (
          <>
            <i className="far fa-times-circle"></i>
            Revoke
          </>
        ) : (
          <>
            <i className="far fa-award"></i>
            Grant
          </>
        )}
      </button>
    </div>
  );
}

export default GuestFavoritesSection;
