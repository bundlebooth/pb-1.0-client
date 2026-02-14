import React, { useState, useEffect } from 'react';
import { showBanner } from '../../../utils/helpers';
import { apiGet, apiPut } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';

function SocialMediaPanel({ onBack, vendorProfileId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [formData, setFormData] = useState({
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    tiktok: ''
  });

  // Clear form data when vendorProfileId changes
  useEffect(() => {
    setFormData({
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: '',
      tiktok: ''
    });
  }, [vendorProfileId]);

  useEffect(() => {
    if (vendorProfileId) {
      loadSocialMedia();
    } else {
      setLoading(false);
    }
  }, [vendorProfileId]);

  const loadSocialMedia = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/social`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const loadedData = {
          facebook: data.facebook || '',
          instagram: data.instagram || '',
          twitter: data.twitter || '',
          linkedin: data.linkedin || '',
          youtube: data.youtube || '',
          tiktok: data.tiktok || ''
        };
        setFormData(loadedData);
        setOriginalData(loadedData);
      }
    } catch (error) {
      console.error('Error loading social media:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if there are changes
  const hasChanges = originalData ? (
    formData.facebook !== originalData.facebook ||
    formData.instagram !== originalData.instagram ||
    formData.twitter !== originalData.twitter ||
    formData.linkedin !== originalData.linkedin ||
    formData.youtube !== originalData.youtube ||
    formData.tiktok !== originalData.tiktok
  ) : false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/social`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          facebook: formData.facebook,
          instagram: formData.instagram,
          twitter: formData.twitter,
          linkedin: formData.linkedin,
          youtube: formData.youtube,
          tiktok: formData.tiktok
        })
      });
      
      if (response.ok) {
        showBanner('Social media links updated successfully!', 'success');
        setOriginalData({ ...formData });
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
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-share-alt"></i>
          </span>
          Social Media & Booking
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Connect your social media profiles and booking links to increase engagement and make it easier for clients to reach you.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />
        
        <form id="vendor-social-form" onSubmit={handleSubmit}>
          <h3 className="dashboard-card-subtitle" style={{ margin: '1rem 0', color: 'var(--primary)' }}>Social Media Profiles</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {/* Facebook */}
            <div className="form-group">
              <label htmlFor="social-facebook-settings" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fab fa-facebook" style={{ color: '#1877F2', fontSize: '1.2rem' }}></i>
                Facebook
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'white' }}>
                <span style={{ padding: '0.75rem 0.5rem 0.75rem 0.75rem', color: 'var(--text-light)', fontSize: '0.9rem', backgroundColor: 'var(--secondary)', borderRight: '1px solid var(--border)' }}>facebook.com/</span>
                <input
                  type="text"
                  id="social-facebook-settings"
                  placeholder="yourpage"
                  style={{ border: 'none', outline: 'none', padding: '0.75rem', flex: 1, fontSize: '0.9rem', background: 'transparent' }}
                  value={formData.facebook}
                  onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                  data-prefix="https://facebook.com/"
                />
              </div>
            </div>

            {/* Instagram */}
            <div className="form-group">
              <label htmlFor="social-instagram-settings" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fab fa-instagram" style={{ color: '#E4405F', fontSize: '1.2rem' }}></i>
                Instagram
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'white' }}>
                <span style={{ padding: '0.75rem 0.5rem 0.75rem 0.75rem', color: 'var(--text-light)', fontSize: '0.9rem', backgroundColor: 'var(--secondary)', borderRight: '1px solid var(--border)' }}>instagram.com/</span>
                <input
                  type="text"
                  id="social-instagram-settings"
                  placeholder="youraccount"
                  style={{ border: 'none', outline: 'none', padding: '0.75rem', flex: 1, fontSize: '0.9rem', background: 'transparent' }}
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  data-prefix="https://instagram.com/"
                />
              </div>
            </div>

            {/* X (Twitter) */}
            <div className="form-group">
              <label htmlFor="social-twitter-settings" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#000000" style={{ marginRight: '0.25rem' }}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'white' }}>
                <span style={{ padding: '0.75rem 0.5rem 0.75rem 0.75rem', color: 'var(--text-light)', fontSize: '0.9rem', backgroundColor: 'var(--secondary)', borderRight: '1px solid var(--border)' }}>x.com/</span>
                <input
                  type="text"
                  id="social-twitter-settings"
                  placeholder="youraccount"
                  style={{ border: 'none', outline: 'none', padding: '0.75rem', flex: 1, fontSize: '0.9rem', background: 'transparent' }}
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  data-prefix="https://x.com/"
                />
              </div>
            </div>

            {/* LinkedIn */}
            <div className="form-group">
              <label htmlFor="social-linkedin-settings" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fab fa-linkedin" style={{ color: '#0077B5', fontSize: '1.2rem' }}></i>
                LinkedIn
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'white' }}>
                <span style={{ padding: '0.75rem 0.5rem 0.75rem 0.75rem', color: 'var(--text-light)', fontSize: '0.9rem', backgroundColor: 'var(--secondary)', borderRight: '1px solid var(--border)' }}>linkedin.com/in/</span>
                <input
                  type="text"
                  id="social-linkedin-settings"
                  placeholder="yourprofile"
                  style={{ border: 'none', outline: 'none', padding: '0.75rem', flex: 1, fontSize: '0.9rem', background: 'transparent' }}
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  data-prefix="https://linkedin.com/in/"
                />
              </div>
            </div>

            {/* YouTube */}
            <div className="form-group">
              <label htmlFor="social-youtube-settings" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fab fa-youtube" style={{ color: '#FF0000', fontSize: '1.2rem' }}></i>
                YouTube
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'white' }}>
                <span style={{ padding: '0.75rem 0.5rem 0.75rem 0.75rem', color: 'var(--text-light)', fontSize: '0.9rem', backgroundColor: 'var(--secondary)', borderRight: '1px solid var(--border)' }}>youtube.com/</span>
                <input
                  type="text"
                  id="social-youtube-settings"
                  placeholder="yourchannel"
                  style={{ border: 'none', outline: 'none', padding: '0.75rem', flex: 1, fontSize: '0.9rem', background: 'transparent' }}
                  value={formData.youtube}
                  onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                  data-prefix="https://youtube.com/"
                />
              </div>
            </div>

            {/* TikTok */}
            <div className="form-group">
              <label htmlFor="social-tiktok-settings" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fab fa-tiktok" style={{ color: '#6b7280', fontSize: '1.2rem' }}></i>
                TikTok
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'white' }}>
                <span style={{ padding: '0.75rem 0.5rem 0.75rem 0.75rem', color: 'var(--text-light)', fontSize: '0.9rem', backgroundColor: 'var(--secondary)', borderRight: '1px solid var(--border)' }}>tiktok.com/@</span>
                <input
                  type="text"
                  id="social-tiktok-settings"
                  placeholder="youraccount"
                  style={{ border: 'none', outline: 'none', padding: '0.75rem', flex: 1, fontSize: '0.9rem', background: 'transparent' }}
                  value={formData.tiktok}
                  onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                  data-prefix="https://tiktok.com/@"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
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
        </form>
      </div>
    </div>
  );
}

export default SocialMediaPanel;
