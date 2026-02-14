import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { showBanner } from '../../utils/helpers';

function GoogleReviewsStep({ formData, setFormData, currentUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  // Load existing Google Reviews settings
  useEffect(() => {
    if (currentUser?.vendorProfileId) {
      loadGoogleReviewsSettings();
    } else {
      setLoading(false);
    }
  }, [currentUser?.vendorProfileId]);

  const loadGoogleReviewsSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/google-reviews-settings`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const placeId = data.GooglePlaceId || '';
        setGooglePlaceId(placeId);
        setFormData(prev => ({ ...prev, googlePlaceId: placeId }));
        
        // If Place ID exists, verify it to show preview
        if (placeId) {
          verifyPlaceId(placeId, false);
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
        setVerificationStatus('success');
        setPreviewData(data.data || data);
        setFormData(prev => ({ ...prev, googlePlaceId: placeId }));
        
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

  const handleVerifyGooglePlace = () => {
    verifyPlaceId(googlePlaceId, true);
  };

  const handleSaveGoogleReviews = async () => {
    if (!currentUser?.vendorProfileId) {
      showBanner('Please complete your basic profile first', 'warning');
      return;
    }

    if (googlePlaceId && verificationStatus !== 'success') {
      showBanner('Please verify your Google Place ID before saving.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/google-reviews-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          GooglePlaceId: googlePlaceId,
          GoogleBusinessUrl: ''
        })
      });

      if (response.ok) {
        showBanner('Google Reviews settings saved successfully!', 'success');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving Google Reviews:', error);
      showBanner('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="step-loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="google-reviews-step">
      <div style={{ maxWidth: '100%', width: '100%' }}>
        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Connect Google Reviews</h3>
          </div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Display your Google Business reviews on your profile to build trust and credibility with potential clients.
          </p>
        </div>

        {/* Main Content */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '2rem' }}>
          {/* Connection Status */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              Connection Status
            </label>
            <div style={{ 
              padding: '0.875rem 1rem', 
              background: '#f9fafb', 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <i className={`fas ${verificationStatus === 'success' ? 'fa-check-circle' : googlePlaceId ? 'fa-check-circle' : 'fa-times-circle'}`} 
                 style={{ color: verificationStatus === 'success' ? '#16a34a' : googlePlaceId ? '#f59e0b' : '#6b7280' }}></i>
              <span style={{ fontWeight: 500 }}>
                {!currentUser?.vendorProfileId 
                  ? 'Complete profile first'
                  : verificationStatus === 'success' 
                    ? 'Connected and verified' 
                    : googlePlaceId
                      ? 'Connected (verification pending)'
                      : 'Not connected'}
              </span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              {!currentUser?.vendorProfileId 
                ? 'You need to complete your basic profile before connecting Google Reviews.'
                : verificationStatus === 'success'
                  ? 'Your Google Reviews will be displayed on your profile.'
                  : 'Enter your Google Place ID to display reviews on your profile.'}
            </p>
          </div>

          {/* Google Place ID Input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              Google Place ID
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Enter your Google Place ID"
                value={googlePlaceId}
                onChange={(e) => setGooglePlaceId(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '0.625rem 0.875rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.9rem'
                }}
              />
              <button
                onClick={handleVerifyGooglePlace}
                disabled={verifying || !googlePlaceId.trim()}
                className="btn btn-primary"
                style={{ 
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  background: '#222222',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  cursor: (verifying || !googlePlaceId.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (verifying || !googlePlaceId.trim()) ? 0.6 : 1
                }}
              >
                {verifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
            <small style={{ display: 'block', color: '#6b7280', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                <i className="fas fa-external-link-alt" style={{ marginRight: '0.35rem', fontSize: '0.7rem' }}></i>
                How to find your Google Place ID
              </a>
            </small>
          </div>

          {/* Preview Section - Only show when connected */}
          {verificationStatus === 'success' && previewData && (
            <>
              <div style={{ marginTop: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem', color: '#374151' }}>
                  Google Reviews Preview
                </label>
                <div style={{ padding: '1.25rem', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <div>
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>Google Reviews</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Verified business reviews</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '2.25rem', fontWeight: 700, color: '#111827', lineHeight: 1 }}>{(previewData.rating || 0).toFixed(1)}</span>
                    <div>
                      <div style={{ color: '#fbbc04', fontSize: '1rem', marginBottom: '0.125rem' }}>{'★'.repeat(Math.round(previewData.rating || 0))}{'☆'.repeat(5 - Math.round(previewData.rating || 0))}</div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Based on {(previewData.user_ratings_total || 0).toLocaleString()} reviews</div>
                    </div>
                  </div>
                  <a 
                    href={`https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '1rem', color: 'var(--primary)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }}
                  >
                    View on Google Maps <i className="fas fa-external-link-alt" style={{ fontSize: '0.75rem' }}></i>
                  </a>
                </div>
              </div>
            </>
          )}

          {/* Why Connect - Only show when not connected */}
          {verificationStatus !== 'success' && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '12px' }}>
              <h5 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                Why connect Google Reviews?
              </h5>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#6b7280', fontSize: '0.95rem', lineHeight: 1.8 }}>
                <li>Build trust with potential clients through authentic reviews</li>
                <li>Display your star rating prominently on your profile</li>
                <li>Showcase recent customer feedback automatically</li>
                <li>Improve your visibility in search results</li>
                <li>Stand out from competitors without reviews</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GoogleReviewsStep;
