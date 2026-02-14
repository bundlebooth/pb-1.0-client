import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { showBanner } from '../../utils/helpers';

function SocialMediaStep({ formData, onInputChange, setFormData, currentUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localData, setLocalData] = useState({
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    tiktok: ''
  });

  const socialPlatforms = [
    { key: 'facebook', label: 'Facebook', icon: 'fab fa-facebook', color: '#1877F2', prefix: 'facebook.com/' },
    { key: 'instagram', label: 'Instagram', icon: 'fab fa-instagram', color: '#E4405F', prefix: 'instagram.com/' },
    { key: 'twitter', label: 'X (Twitter)', icon: 'fab fa-x-twitter', color: '#000000', prefix: 'x.com/' },
    { key: 'linkedin', label: 'LinkedIn', icon: 'fab fa-linkedin', color: '#0077B5', prefix: 'linkedin.com/in/' },
    { key: 'youtube', label: 'YouTube', icon: 'fab fa-youtube', color: '#FF0000', prefix: 'youtube.com/' },
    { key: 'tiktok', label: 'TikTok', icon: 'fab fa-tiktok', color: '#000000', prefix: 'tiktok.com/@' }
  ];

  // Load existing social media from API
  useEffect(() => {
    if (currentUser?.vendorProfileId) {
      loadSocialMedia();
    } else {
      // Use formData if no vendorProfileId
      setLocalData({
        facebook: formData.facebook || '',
        instagram: formData.instagram || '',
        twitter: formData.twitter || '',
        linkedin: formData.linkedin || '',
        youtube: formData.youtube || '',
        tiktok: formData.tiktok || ''
      });
      setLoading(false);
    }
  }, [currentUser?.vendorProfileId]);

  const loadSocialMedia = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/social`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const newData = {
          facebook: data.facebook || '',
          instagram: data.instagram || '',
          twitter: data.twitter || '',
          linkedin: data.linkedin || '',
          youtube: data.youtube || '',
          tiktok: data.tiktok || ''
        };
        setLocalData(newData);
        // Update formData too
        setFormData(prev => ({ ...prev, ...newData }));
      }
    } catch (error) {
      console.error('Error loading social media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setLocalData(prev => ({ ...prev, [key]: value }));
    onInputChange(key, value);
  };

  const handleSave = async () => {
    if (!currentUser?.vendorProfileId) return;
    
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/social`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(localData)
      });
      
      if (response.ok) {
        showBanner('Social media links saved successfully!', 'success');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving social media:', error);
      showBanner('Failed to save social media links', 'error');
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
    <div className="social-media-step">
      <div style={{ maxWidth: '100%', width: '100%' }}>
        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <i className="fas fa-share-alt" style={{ color: 'var(--primary)', fontSize: '1.25rem' }}></i>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Connect Your Social Media</h3>
          </div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Link your social media profiles to increase engagement and make it easier for clients to connect with you.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '0' }}>
          {socialPlatforms.map((platform, index) => (
            <div key={platform.key} style={{ paddingBottom: '1.25rem', marginBottom: '1.25rem', borderBottom: index < socialPlatforms.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>
                <i className={platform.icon} style={{ color: platform.color, fontSize: '1.5rem' }}></i>
                {platform.label}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white', overflow: 'hidden' }}>
                <span style={{ padding: '0.875rem 1rem', color: '#6b7280', fontSize: '0.9rem', backgroundColor: '#f9fafb', borderRight: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                  {platform.prefix}
                </span>
                <input
                  type="text"
                  placeholder={`your${platform.key}`}
                  value={localData[platform.key] || ''}
                  onChange={(e) => handleChange(platform.key, e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    padding: '0.875rem 1rem',
                    flex: 1,
                    fontSize: '0.95rem',
                    background: 'transparent'
                  }}
                />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default SocialMediaStep;
