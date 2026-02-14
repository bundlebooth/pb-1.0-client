import React, { useState, useEffect } from 'react';
import { ToggleSwitch } from './common/FormComponents';
import UniversalModal from './UniversalModal';
import { API_BASE_URL } from '../config';

const COOKIE_CONSENT_KEY = 'planbeau_cookie_consent';
const COOKIE_PREFERENCES_KEY = 'planbeau_cookie_preferences';

// Google Analytics Measurement ID - should be configured in environment
const GA_MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';

function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    functional: true
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Load saved preferences and initialize analytics if accepted
      const savedPrefs = localStorage.getItem(COOKIE_PREFERENCES_KEY);
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        setPreferences(prefs);
        if (prefs.analytics) {
          initializeGoogleAnalytics();
        }
      }
    }
  }, []);

  const initializeGoogleAnalytics = () => {
    if (typeof window === 'undefined' || !GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
      console.log('[CookieConsent] Google Analytics not configured');
      return;
    }

    // Check if already loaded
    if (window.gtag) {
      console.log('[CookieConsent] Google Analytics already initialized');
      return;
    }

    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    script.onload = () => {
      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', GA_MEASUREMENT_ID, {
        anonymize_ip: true,
        cookie_flags: 'SameSite=None;Secure'
      });
      console.log('[CookieConsent] Google Analytics initialized');
    };
  };

  const disableGoogleAnalytics = () => {
    // Set opt-out cookie
    window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
    
    // Remove GA cookies
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith('_ga') || name.startsWith('_gid') || name.startsWith('_gat')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
  };

  // Save consent to backend database
  const saveConsentToBackend = async (prefs) => {
    try {
      const sessionId = localStorage.getItem('planbeau_session_id') || 
        `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('planbeau_session_id', sessionId);
      
      await fetch(`${API_BASE_URL}/users/cookie-consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          necessary: prefs.necessary,
          analytics: prefs.analytics,
          marketing: prefs.marketing,
          functional: prefs.functional
        })
      });
    } catch (error) {
      console.warn('[CookieConsent] Failed to save consent to backend:', error);
    }
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true
    };
    setPreferences(allAccepted);
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(allAccepted));
    initializeGoogleAnalytics();
    saveConsentToBackend(allAccepted);
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: true
    };
    setPreferences(onlyNecessary);
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(onlyNecessary));
    disableGoogleAnalytics();
    saveConsentToBackend(onlyNecessary);
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'custom');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences));
    
    if (preferences.analytics) {
      initializeGoogleAnalytics();
    } else {
      disableGoogleAnalytics();
    }
    
    saveConsentToBackend(preferences);
    setShowBanner(false);
    setShowPreferences(false);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner - Full width bottom bar */}
      {!showPreferences && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
          zIndex: 1000000,
          padding: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <i className="fas fa-cookie-bite" style={{ fontSize: '20px', color: '#5B68F4' }}></i>
              <span style={{ fontWeight: '600', fontSize: '15px', color: '#1f2937' }}>
                We use cookies
              </span>
            </div>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '13px', 
              lineHeight: '1.4',
              margin: '0 0 12px 0'
            }}>
              We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. 
              By clicking "Accept All", you consent to our use of cookies. You can manage your preferences anytime.
            </p>
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'nowrap',
              alignItems: 'center',
              justifyContent: 'flex-start'
            }}>
              <button
                onClick={() => setShowPreferences(true)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto'
                }}
              >
                Preferences
              </button>
              <button
                onClick={handleRejectAll}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto'
                }}
              >
                Reject
              </button>
              <button
                onClick={handleAcceptAll}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1f2937',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto'
                }}
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal - Using UniversalModal */}
      <UniversalModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        title="Cookie Preferences"
        size="medium"
        footer={
          <>
            <button
              type="button"
              className="um-btn um-btn-secondary"
              onClick={handleRejectAll}
            >
              Reject All
            </button>
            <button
              type="button"
              className="um-btn um-btn-primary"
              onClick={handleSavePreferences}
            >
              Save Preferences
            </button>
          </>
        }
      >
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
          Manage your cookie preferences below. Some cookies are essential for the website to function properly.
        </p>

        {/* Cookie Categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Necessary Cookies */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                  Necessary Cookies
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Required for the website to function. Cannot be disabled.
                </div>
              </div>
              <ToggleSwitch
                checked={true}
                onChange={() => {}}
                disabled={true}
              />
            </div>
          </div>

          {/* Analytics Cookies */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                  Analytics Cookies
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Help us understand how visitors interact with our website (Google Analytics).
                </div>
              </div>
              <ToggleSwitch
                checked={preferences.analytics}
                onChange={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
              />
            </div>
          </div>

          {/* Marketing Cookies */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                  Marketing Cookies
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Used to deliver personalized advertisements and track ad performance.
                </div>
              </div>
              <ToggleSwitch
                checked={preferences.marketing}
                onChange={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
              />
            </div>
          </div>

          {/* Functional Cookies */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                  Functional Cookies
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Enable enhanced functionality like remembering your preferences.
                </div>
              </div>
              <ToggleSwitch
                checked={preferences.functional}
                onChange={() => setPreferences(p => ({ ...p, functional: !p.functional }))}
              />
            </div>
          </div>
        </div>

        <p style={{
          fontSize: '12px',
          color: '#9ca3af',
          marginTop: '16px',
          textAlign: 'center'
        }}>
          Learn more in our <a href="/privacy-policy" style={{ color: '#5B68F4' }}>Privacy Policy</a>
        </p>
      </UniversalModal>
    </>
  );
}

export default CookieConsent;
