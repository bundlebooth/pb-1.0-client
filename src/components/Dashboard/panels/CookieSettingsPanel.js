import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import { showBanner } from '../../../utils/helpers';
import { ToggleSwitch } from '../../common/FormComponents';

function CookieSettingsPanel({ onBack, embedded = false }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: true
  });
  const [originalSettings, setOriginalSettings] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: true
  });

  // Check if there are changes
  const hasChanges = 
    settings.analytics !== originalSettings.analytics ||
    settings.marketing !== originalSettings.marketing ||
    settings.functional !== originalSettings.functional;

  useEffect(() => {
    loadCookieSettings();
  }, []);

  const loadCookieSettings = async () => {
    try {
      setLoading(true);
      
      // First try to load from API if user is logged in
      if (currentUser?.id) {
        const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/cookie-consent`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          const loadedSettings = {
            necessary: true, // Always true
            analytics: data.analytics || data.AnalyticsCookies || false,
            marketing: data.marketing || data.MarketingCookies || false,
            functional: data.functional !== false && data.FunctionalCookies !== false
          };
          setSettings(loadedSettings);
          setOriginalSettings(loadedSettings);
          return;
        }
      }
      
      // Fallback to localStorage
      const savedPrefs = localStorage.getItem('planbeau_cookie_preferences');
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        const loadedSettings = {
          necessary: true,
          analytics: prefs.analytics || false,
          marketing: prefs.marketing || false,
          functional: prefs.functional !== false
        };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Error loading cookie settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Save to API if user is logged in
      if (currentUser?.id) {
        const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/cookie-consent`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            necessary: true,
            analytics: settings.analytics,
            marketing: settings.marketing,
            functional: settings.functional
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save to server');
        }
      }
      
      // Also save to localStorage for consistency
      localStorage.setItem('planbeau_cookie_consent', 'custom');
      localStorage.setItem('planbeau_cookie_preferences', JSON.stringify(settings));
      
      showBanner('Cookie preferences saved successfully', 'success');
      setOriginalSettings({ ...settings });
      
      // Handle analytics based on preference
      if (settings.analytics) {
        // Re-enable analytics if needed
        window[`ga-disable-${process.env.REACT_APP_GA_MEASUREMENT_ID}`] = false;
      } else {
        // Disable analytics
        window[`ga-disable-${process.env.REACT_APP_GA_MEASUREMENT_ID}`] = true;
      }
    } catch (error) {
      console.error('Error saving cookie settings:', error);
      showBanner('Failed to save cookie preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key) => {
    if (key === 'necessary') return; // Cannot toggle necessary cookies
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div>
        {!embedded && (
          <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
            <i className="fas fa-arrow-left"></i> Back to Settings
          </button>
        )}
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
            <i className="fas fa-cookie-bite"></i>
          </span>
          Cookie Preferences
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Manage how we use cookies to personalize your experience and improve our services.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

        <div>
          {/* Necessary Cookies */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>Necessary Cookies</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Required for the website to function. Cannot be disabled.</div>
            </div>
            <ToggleSwitch
              checked={true}
              onChange={() => {}}
              disabled={true}
            />
          </div>

          {/* Analytics Cookies */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>Analytics Cookies</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Help us understand how visitors interact with our website (Google Analytics).</div>
            </div>
            <ToggleSwitch
              checked={settings.analytics}
              onChange={() => toggleSetting('analytics')}
            />
          </div>

          {/* Marketing Cookies */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>Marketing Cookies</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Used to deliver personalized advertisements and track ad performance.</div>
            </div>
            <ToggleSwitch
              checked={settings.marketing}
              onChange={() => toggleSetting('marketing')}
            />
          </div>

          {/* Functional Cookies */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>Functional Cookies</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Enable enhanced functionality like remembering your preferences.</div>
            </div>
            <ToggleSwitch
              checked={settings.functional}
              onChange={() => toggleSetting('functional')}
            />
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
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>

        {/* Privacy Policy Link */}
        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '1.5rem' }}>
          Learn more in our <a href="/privacy-policy" style={{ color: 'var(--primary)' }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

export default CookieSettingsPanel;
