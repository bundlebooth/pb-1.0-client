import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import { showBanner } from '../../../utils/helpers';

function PrivacySettingsPanel({ onBack, embedded = false }) {
  const { currentUser, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    showReviews: true,
    showForumPosts: true,
    showForumComments: true,
    showFavorites: true,
    showOnlineStatus: true
  });
  const [originalSettings, setOriginalSettings] = useState({
    showReviews: true,
    showForumPosts: true,
    showForumComments: true,
    showFavorites: true,
    showOnlineStatus: true
  });

  // Check if there are changes
  const hasChanges = 
    settings.showReviews !== originalSettings.showReviews ||
    settings.showForumPosts !== originalSettings.showForumPosts ||
    settings.showForumComments !== originalSettings.showForumComments ||
    settings.showFavorites !== originalSettings.showFavorites ||
    settings.showOnlineStatus !== originalSettings.showOnlineStatus;

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/privacy-settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const loadedSettings = {
          showReviews: data.ShowReviews !== false,
          showForumPosts: data.ShowForumPosts !== false,
          showForumComments: data.ShowForumComments !== false,
          showFavorites: data.ShowFavorites !== false,
          showOnlineStatus: data.ShowOnlineStatus !== false
        };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/privacy-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          showReviews: settings.showReviews,
          showForumPosts: settings.showForumPosts,
          showForumComments: settings.showForumComments,
          showFavorites: settings.showFavorites,
          showOnlineStatus: settings.showOnlineStatus
        })
      });

      if (response.ok) {
        showBanner('Privacy settings saved successfully', 'success');
        setOriginalSettings({ ...settings });
        // Update user context if needed
        if (updateUser) {
          updateUser({ ...currentUser, privacySettings: settings });
        }
      } else {
        showBanner('Failed to save privacy settings', 'error');
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      showBanner('Failed to save privacy settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div>
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Settings
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
      {!embedded && (
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Settings
        </button>
      )}
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-eye-slash"></i>
          </span>
          Privacy Settings
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Control what activities are visible to others on your public profile.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

        <div>
          {/* Show Reviews */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>Reviews Given</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Show reviews you've written for vendors</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.showReviews} onChange={() => toggleSetting('showReviews')} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: settings.showReviews ? '#5086E8' : '#E5E7EB', borderRadius: '24px', transition: 'background-color 0.3s' }}>
                <span style={{ position: 'absolute', height: '20px', width: '20px', left: settings.showReviews ? '22px' : '2px', top: '2px', backgroundColor: 'white', borderRadius: '50%', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
              </span>
            </label>
          </div>

          {/* Show Forum Posts */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>Forum Discussions</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Show discussions you've started in the forum</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.showForumPosts} onChange={() => toggleSetting('showForumPosts')} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: settings.showForumPosts ? '#5086E8' : '#E5E7EB', borderRadius: '24px', transition: 'background-color 0.3s' }}>
                <span style={{ position: 'absolute', height: '20px', width: '20px', left: settings.showForumPosts ? '22px' : '2px', top: '2px', backgroundColor: 'white', borderRadius: '50%', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
              </span>
            </label>
          </div>

          {/* Show Forum Comments */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>Forum Replies</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Show your replies to forum discussions</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.showForumComments} onChange={() => toggleSetting('showForumComments')} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: settings.showForumComments ? '#5086E8' : '#E5E7EB', borderRadius: '24px', transition: 'background-color 0.3s' }}>
                <span style={{ position: 'absolute', height: '20px', width: '20px', left: settings.showForumComments ? '22px' : '2px', top: '2px', backgroundColor: 'white', borderRadius: '50%', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
              </span>
            </label>
          </div>

          {/* Show Favorites */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>Favorited Vendors</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Show vendors you've added to favorites</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.showFavorites} onChange={() => toggleSetting('showFavorites')} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: settings.showFavorites ? '#5086E8' : '#E5E7EB', borderRadius: '24px', transition: 'background-color 0.3s' }}>
                <span style={{ position: 'absolute', height: '20px', width: '20px', left: settings.showFavorites ? '22px' : '2px', top: '2px', backgroundColor: 'white', borderRadius: '50%', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
              </span>
            </label>
          </div>

          {/* Show Online Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>Online Status</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Show when you're online to other users</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.showOnlineStatus} onChange={() => toggleSetting('showOnlineStatus')} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: settings.showOnlineStatus ? '#5086E8' : '#E5E7EB', borderRadius: '24px', transition: 'background-color 0.3s' }}>
                <span style={{ position: 'absolute', height: '20px', width: '20px', left: settings.showOnlineStatus ? '22px' : '2px', top: '2px', backgroundColor: 'white', borderRadius: '50%', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
              </span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ marginTop: '2rem' }}>
          <button 
            type="button" 
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
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PrivacySettingsPanel;
