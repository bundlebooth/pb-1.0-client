import React, { useState, useEffect } from 'react';
import { showBanner } from '../../../utils/helpers';
import { apiGet, apiPost, apiPut } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';

function GoogleReviewsPanel({ onBack, vendorProfileId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [formData, setFormData] = useState({
    googlePlaceId: '',
    googleBusinessUrl: ''
  });
  const [previewData, setPreviewData] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);

  useEffect(() => {
    if (vendorProfileId) {
      loadGoogleReviewsSettings();
    } else {
      setLoading(false);
    }
  }, [vendorProfileId]);

  const loadGoogleReviewsSettings = async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/vendors/${vendorProfileId}/google-reviews-settings`);
      
      if (response.ok) {
        const data = await response.json();
        setFormData({
          googlePlaceId: data.GooglePlaceId || '',
          googleBusinessUrl: ''
        });
        
        // If Place ID exists, verify it
        if (data.GooglePlaceId) {
          verifyPlaceId(data.GooglePlaceId, false);
        }
      }
    } catch (error) {
      console.error('Error loading Google Reviews settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyPlaceId = async (placeId, showMessage = true) => {
    if (!placeId || placeId.trim() === '') {
      setVerificationStatus(null);
      setPreviewData(null);
      return;
    }

    try {
      setVerifying(true);
      const response = await fetch(`${API_BASE_URL}/vendors/google-reviews/${placeId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const reviewData = data.data || data;
        
        setVerificationStatus('success');
        setPreviewData(reviewData);
        
        if (showMessage) {
          showBanner('✓ Valid Google Place ID! Preview loaded.', 'success');
        }
      } else {
        setVerificationStatus('error');
        setPreviewData(null);
        
        if (showMessage) {
          showBanner('Invalid Google Place ID. Please check and try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Error verifying Place ID:', error);
      setVerificationStatus('error');
      setPreviewData(null);
      
      if (showMessage) {
        showBanner('Failed to verify Place ID. Please try again.', 'error');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyClick = () => {
    verifyPlaceId(formData.googlePlaceId, true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Verify before saving
    if (formData.googlePlaceId && verificationStatus !== 'success') {
      showBanner('Please verify your Google Place ID before saving.', 'warning');
      return;
    }
    
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/google-reviews-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          GooglePlaceId: formData.googlePlaceId,
          GoogleBusinessUrl: formData.googleBusinessUrl
        })
      });
      
      if (response.ok) {
        showBanner('Google Reviews integration updated successfully!', 'success');
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showBanner('Failed to save changes', 'error');
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
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" 
              alt="Google" 
              style={{ width: '20px', height: '20px' }}
            />
          </span>
          Google Reviews Integration
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Display your Google Reviews directly on your VenueVue profile to build trust and credibility with potential clients.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-col" style={{ flex: 1 }}>
              <div className="form-group">
                <label htmlFor="google-place-id">Google Place ID <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  id="google-place-id"
                  placeholder="e.g., ChIJN1t_tDeuEmsRUsoyG83frY4"
                  value={formData.googlePlaceId}
                  onChange={(e) => {
                    setFormData({ ...formData, googlePlaceId: e.target.value });
                    setVerificationStatus(null);
                    setPreviewData(null);
                  }}
                />
              </div>
            </div>
            <div className="form-col" style={{ flex: 'none', display: 'flex', alignItems: 'flex-end', paddingBottom: '1rem' }}>
              <button 
                type="button"
                className="btn btn-outline"
                onClick={handleVerifyClick}
                disabled={!formData.googlePlaceId || verifying}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                {verifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>

          {verificationStatus === 'success' && (
            <p style={{ color: '#10b981', fontSize: '0.9rem', marginBottom: '1rem' }}>
              <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i> Verified successfully
            </p>
          )}
          {verificationStatus === 'error' && (
            <p style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '1rem' }}>
              <i className="fas fa-times-circle" style={{ color: '#ef4444' }}></i> Invalid Place ID
            </p>
          )}

          <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Find your Place ID at{' '}
            <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
              Google's Place ID Finder
            </a>
          </p>

          {/* Preview Section - Only show when verified */}
          {previewData && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '2rem 0' }} />
              
              <label style={{ display: 'block', marginBottom: '1rem' }}>Google Reviews Preview</label>
              
              {/* Google Reviews Card - matches VendorProfilePage style */}
              <div style={{ 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius)', 
                padding: '1.5rem',
                background: '#f9fafb',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <img 
                    src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" 
                    alt="Google" 
                    style={{ width: '32px', height: '32px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem' }}>Google Reviews</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Verified business reviews</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    fontSize: '2.5rem', 
                    fontWeight: 700, 
                    color: 'var(--text)', 
                    lineHeight: 1
                  }}>
                    {(previewData.rating || 0).toFixed(1)}
                  </div>
                  <div>
                    <div style={{ 
                      fontSize: '1rem', 
                      color: '#fbbc04',
                      marginBottom: '0.125rem'
                    }}>
                      {'★'.repeat(Math.round(previewData.rating || 0))}{'☆'.repeat(5 - Math.round(previewData.rating || 0))}
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--text-light)'
                    }}>
                      Based on {(previewData.user_ratings_total || 0).toLocaleString()} reviews
                    </div>
                  </div>
                </div>
                
                {previewData.url && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <a 
                      href={previewData.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.85rem', color: 'var(--primary)' }}
                    >
                      View on Google Maps <i className="fas fa-external-link-alt" style={{ fontSize: '0.7rem' }}></i>
                    </a>
                  </div>
                )}
              </div>
              
            </>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '2rem 0' }} />

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={saving || !formData.googlePlaceId || verificationStatus !== 'success'}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default GoogleReviewsPanel;
