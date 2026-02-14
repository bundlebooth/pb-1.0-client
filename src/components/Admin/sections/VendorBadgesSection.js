import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../../../utils/api';

function VendorBadgesSection() {
  const [badges, setBadges] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [error, setError] = useState('');
  const [eligibilityCriteria, setEligibilityCriteria] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const loadBadges = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet('/admin/vendor-badges');
      const data = await response.json();
      if (data.success) {
        setBadges(data.badges || []);
        if (data.badges?.length > 0 && !selectedBadge) {
          setSelectedBadge(data.badges[0]);
        }
      } else {
        setError(data.message || 'Failed to load badges');
      }
    } catch (err) {
      console.error('Error loading badges:', err);
      setError('Failed to load badges');
    } finally {
      setLoading(false);
    }
  }, [selectedBadge]);

  const loadVendorsForBadge = useCallback(async (badgeId) => {
    if (!badgeId) return;
    setVendorsLoading(true);
    try {
      const response = await apiGet(`/admin/vendor-badges/${badgeId}/vendors`);
      const data = await response.json();
      if (data.success) {
        setVendors(data.vendors || []);
        setEligibilityCriteria(data.eligibilityCriteria);
      }
    } catch (err) {
      console.error('Error loading vendors for badge:', err);
    } finally {
      setVendorsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  useEffect(() => {
    if (selectedBadge?.BadgeID) {
      loadVendorsForBadge(selectedBadge.BadgeID);
    }
  }, [selectedBadge, loadVendorsForBadge]);

  const handleGrant = async (vendorId) => {
    if (!selectedBadge) return;
    setActionLoading(vendorId);
    try {
      const response = await apiPost(`/admin/vendor-badges/${selectedBadge.BadgeID}/grant/${vendorId}`);
      const data = await response.json();
      if (data.success) {
        loadVendorsForBadge(selectedBadge.BadgeID);
      } else {
        alert(data.message || 'Failed to grant badge');
      }
    } catch (err) {
      console.error('Error granting badge:', err);
      alert('Failed to grant badge');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (vendorId) => {
    if (!selectedBadge) return;
    if (!window.confirm(`Are you sure you want to revoke the ${selectedBadge.BadgeName} badge from this vendor?`)) {
      return;
    }
    setActionLoading(vendorId);
    try {
      const response = await apiPost(`/admin/vendor-badges/${selectedBadge.BadgeID}/revoke/${vendorId}`);
      const data = await response.json();
      if (data.success) {
        loadVendorsForBadge(selectedBadge.BadgeID);
      } else {
        alert(data.message || 'Failed to revoke badge');
      }
    } catch (err) {
      console.error('Error revoking badge:', err);
      alert('Failed to revoke badge');
    } finally {
      setActionLoading(null);
    }
  };

  const currentHolders = vendors.filter(v => v.HasBadge === 1);
  const eligibleVendors = vendors.filter(v => v.HasBadge !== 1 && v.MeetsEligibility === 1);
  const otherVendors = vendors.filter(v => v.HasBadge !== 1 && v.MeetsEligibility !== 1);

  const getBadgeIcon = (badge) => {
    return badge?.BadgeIcon || 'fa-award';
  };

  const getBadgeColor = (badge) => {
    return badge?.BadgeColor || '#f59e0b';
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>Vendor Badges</h2>
        <p style={{ color: '#717171', marginTop: '4px' }}>
          Manage vendor badges and recognition. Grant or revoke badges based on eligibility criteria.
        </p>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading badges...</p>
        </div>
      ) : error ? (
        <div className="admin-error">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={loadBadges} className="admin-btn admin-btn-primary">
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Badge Selector Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '24px',
            padding: '4px',
            background: '#f9fafb',
            borderRadius: '12px'
          }}>
            {badges.map(badge => (
              <button
                key={badge.BadgeID}
                onClick={() => setSelectedBadge(badge)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  background: selectedBadge?.BadgeID === badge.BadgeID ? '#222' : 'transparent',
                  color: selectedBadge?.BadgeID === badge.BadgeID ? '#fff' : '#374151',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  transition: 'all 0.2s'
                }}
              >
                <i 
                  className={`fas ${getBadgeIcon(badge)}`} 
                  style={{ color: selectedBadge?.BadgeID === badge.BadgeID ? '#fff' : getBadgeColor(badge) }}
                ></i>
                {badge.BadgeName}
              </button>
            ))}
          </div>

          {/* Selected Badge Info */}
          {selectedBadge && (
            <div style={{
              background: `${getBadgeColor(selectedBadge)}10`,
              border: `1px solid ${getBadgeColor(selectedBadge)}30`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: getBadgeColor(selectedBadge),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className={`fas ${getBadgeIcon(selectedBadge)}`} style={{ color: '#fff', fontSize: '20px' }}></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#222' }}>{selectedBadge.BadgeName}</h3>
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    {selectedBadge.BadgeDescription}
                  </p>
                </div>
              </div>
              
              {eligibilityCriteria && Object.values(eligibilityCriteria).some(v => v != null) && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${getBadgeColor(selectedBadge)}20` }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 500, fontSize: '0.875rem', color: '#374151' }}>
                    Eligibility Criteria:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {eligibilityCriteria.minRating && (
                      <span style={{ background: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
                        Rating ≥ {eligibilityCriteria.minRating}
                      </span>
                    )}
                    {eligibilityCriteria.minReviews && (
                      <span style={{ background: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
                        Reviews ≥ {eligibilityCriteria.minReviews}
                      </span>
                    )}
                    {eligibilityCriteria.minBookings && (
                      <span style={{ background: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
                        Bookings ≥ {eligibilityCriteria.minBookings}
                      </span>
                    )}
                    {eligibilityCriteria.minResponseRate && (
                      <span style={{ background: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
                        Response Rate ≥ {eligibilityCriteria.minResponseRate}%
                      </span>
                    )}
                    {eligibilityCriteria.maxDaysOld && (
                      <span style={{ background: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
                        Registered within {eligibilityCriteria.maxDaysOld} days
                      </span>
                    )}
                    {eligibilityCriteria.minResponseTimeMinutes && (
                      <span style={{ background: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
                        Avg Response ≤ {eligibilityCriteria.minResponseTimeMinutes} min
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {vendorsLoading ? (
            <div className="admin-loading">
              <div className="admin-loading-spinner"></div>
              <p>Loading vendors...</p>
            </div>
          ) : (
            <>
              {/* Current Badge Holders */}
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
                  <i className={`fas ${getBadgeIcon(selectedBadge)}`} style={{ color: getBadgeColor(selectedBadge) }}></i>
                  Current Badge Holders ({currentHolders.length})
                </h3>
                
                {currentHolders.length === 0 ? (
                  <div style={{ 
                    background: '#f9fafb', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px', 
                    padding: '24px', 
                    textAlign: 'center',
                    color: '#6b7280'
                  }}>
                    No vendors currently have this badge.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {currentHolders.map(vendor => (
                      <VendorCard 
                        key={vendor.VendorProfileID} 
                        vendor={vendor} 
                        badge={selectedBadge}
                        hasBadge={true}
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
                        badge={selectedBadge}
                        hasBadge={false}
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
                    All vendors either have this badge or meet eligibility criteria.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {otherVendors.slice(0, 20).map(vendor => (
                      <VendorCard 
                        key={vendor.VendorProfileID} 
                        vendor={vendor} 
                        badge={selectedBadge}
                        hasBadge={false}
                        isEligible={false}
                        onAction={() => handleGrant(vendor.VendorProfileID)}
                        actionLoading={actionLoading === vendor.VendorProfileID}
                      />
                    ))}
                    {otherVendors.length > 20 && (
                      <div style={{ textAlign: 'center', color: '#6b7280', padding: '12px' }}>
                        Showing 20 of {otherVendors.length} vendors
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function VendorCard({ vendor, badge, hasBadge, isEligible, onAction, actionLoading }) {
  const getBadgeColor = (b) => b?.BadgeColor || '#f59e0b';
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      background: hasBadge ? `${getBadgeColor(badge)}08` : '#fff',
      border: `1px solid ${hasBadge ? getBadgeColor(badge) + '40' : '#e5e7eb'}`,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#222' }}>{vendor.BusinessName}</span>
            {hasBadge && (
              <span style={{ 
                background: getBadgeColor(badge), 
                color: '#fff', 
                fontSize: '0.7rem', 
                padding: '2px 6px', 
                borderRadius: '4px',
                fontWeight: 600
              }}>
                {badge?.BadgeName?.toUpperCase()}
              </span>
            )}
            {!hasBadge && isEligible && (
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
            {vendor.ActiveBadges && (
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                ({vendor.ActiveBadges.split(',').length} badges)
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
          <div style={{ fontWeight: 600, color: parseFloat(vendor.AvgRating) >= 4.5 ? '#10b981' : '#222' }}>
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
          background: hasBadge ? '#ef4444' : '#222',
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
        ) : hasBadge ? (
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

export default VendorBadgesSection;
