import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { apiGet, apiPost } from '../utils/api';

const EmailPreferencesPage = () => {
  const { token } = useParams();
  
  const [status, setStatus] = useState('loading');
  const [email, setEmail] = useState('');
  const [preferences, setPreferences] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/email-preferences/${token}`);
        const data = await response.json();
        
        if (data.success) {
          setPreferences(data.preferences);
          setEmail(data.email);
          setStatus('loaded');
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
        setStatus('error');
      }
    };

    if (token) {
      fetchPreferences();
    }
  }, [token]);

  const handleToggle = (category, key) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key]
      }
    }));
    setSaveMessage('');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/email-preferences/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences })
      });
      
      const data = await response.json();
      if (data.success) {
        setSaveMessage('Preferences saved successfully!');
      } else {
        setSaveMessage('Failed to save preferences. Please try again.');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveMessage('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const emailPreferenceLabels = {
    bookingConfirmations: { label: 'Booking Confirmations', description: 'Receive confirmations when bookings are made' },
    bookingReminders: { label: 'Booking Reminders', description: 'Get reminded about upcoming bookings' },
    bookingUpdates: { label: 'Booking Updates', description: 'Updates about booking status changes' },
    messages: { label: 'Messages', description: 'Notifications when you receive new messages' },
    payments: { label: 'Payment Notifications', description: 'Receipts and payment confirmations' },
    promotions: { label: 'Promotions', description: 'Special offers and discounts' },
    newsletter: { label: 'Newsletter', description: 'Tips, updates, and platform news' }
  };

  if (status === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" style={styles.logo} />
          <div style={styles.spinner}></div>
          <h2 style={styles.title}>Loading Preferences...</h2>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" style={styles.logo} />
          <div style={styles.iconError}>
            <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 style={styles.title}>Link Expired or Invalid</h1>
          <p style={styles.text}>
            This preferences link has expired or is invalid. Please log in to manage your email preferences.
          </p>
          <a href="/dashboard" style={styles.button}>
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.cardWide}>
        <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" style={styles.logo} />
        <h1 style={styles.title}>Email Preferences</h1>
        <p style={styles.subtitle}>Manage email notifications for <strong>{email}</strong></p>
        
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Email Notifications</h3>
          <p style={styles.sectionDesc}>Choose which emails you'd like to receive</p>
          
          {preferences?.email && Object.entries(emailPreferenceLabels).map(([key, { label, description }]) => (
            <div key={key} style={styles.toggleRow}>
              <div style={styles.toggleInfo}>
                <span style={styles.toggleLabel}>{label}</span>
                <span style={styles.toggleDesc}>{description}</span>
              </div>
              <button
                onClick={() => handleToggle('email', key)}
                style={{
                  ...styles.toggle,
                  background: preferences.email[key] ? '#222222' : '#ccc'
                }}
              >
                <span style={{
                  ...styles.toggleKnob,
                  transform: preferences.email[key] ? 'translateX(20px)' : 'translateX(0)'
                }} />
              </button>
            </div>
          ))}
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Push Notifications</h3>
          <p style={styles.sectionDesc}>Browser push notification preferences</p>
          
          {preferences?.push && Object.entries(preferences.push).map(([key, value]) => {
            const labels = {
              bookingUpdates: 'Booking Updates',
              messages: 'New Messages',
              promotions: 'Promotions'
            };
            return (
              <div key={key} style={styles.toggleRow}>
                <div style={styles.toggleInfo}>
                  <span style={styles.toggleLabel}>{labels[key] || key}</span>
                </div>
                <button
                  onClick={() => handleToggle('push', key)}
                  style={{
                    ...styles.toggle,
                    background: value ? '#222222' : '#ccc'
                  }}
                >
                  <span style={{
                    ...styles.toggleKnob,
                    transform: value ? 'translateX(20px)' : 'translateX(0)'
                  }} />
                </button>
              </div>
            );
          })}
        </div>

        {saveMessage && (
          <div style={{
            ...styles.saveMessage,
            background: saveMessage.includes('success') ? '#d4edda' : '#f8d7da',
            color: saveMessage.includes('success') ? '#155724' : '#721c24'
          }}>
            {saveMessage}
          </div>
        )}

        <div style={styles.buttonRow}>
          <button onClick={handleSave} disabled={saving} style={styles.button}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
          <a href="/" style={styles.linkButton}>Return to Planbeau</a>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f7f7f7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '48px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #ebebeb'
  },
  cardWide: {
    background: 'white',
    borderRadius: '12px',
    padding: '48px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #ebebeb'
  },
  logo: {
    height: '40px',
    marginBottom: '32px',
    display: 'block'
  },
  iconError: {
    width: '80px',
    height: '80px',
    background: '#f0f0f0',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    color: '#222222'
  },
  title: {
    color: '#222222',
    fontSize: '24px',
    marginBottom: '8px',
    fontWeight: '600'
  },
  subtitle: {
    color: '#717171',
    fontSize: '14px',
    marginBottom: '32px'
  },
  text: {
    color: '#484848',
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '24px'
  },
  section: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #ebebeb'
  },
  sectionTitle: {
    color: '#222222',
    fontSize: '18px',
    marginBottom: '4px',
    fontWeight: '600'
  },
  sectionDesc: {
    color: '#717171',
    fontSize: '14px',
    marginBottom: '20px'
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0'
  },
  toggleInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  toggleLabel: {
    color: '#222222',
    fontSize: '15px',
    fontWeight: '500'
  },
  toggleDesc: {
    color: '#717171',
    fontSize: '13px',
    marginTop: '2px'
  },
  toggle: {
    width: '50px',
    height: '30px',
    borderRadius: '15px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.3s'
  },
  toggleKnob: {
    width: '26px',
    height: '26px',
    background: 'white',
    borderRadius: '50%',
    position: 'absolute',
    top: '2px',
    left: '2px',
    transition: 'transform 0.3s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  saveMessage: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
    fontSize: '14px'
  },
  buttonRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  button: {
    display: 'inline-block',
    background: '#222222',
    color: 'white',
    padding: '14px 32px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px'
  },
  buttonSecondary: {
    display: 'inline-block',
    background: 'white',
    color: '#222222',
    padding: '14px 32px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    border: '1px solid #222222',
    cursor: 'pointer',
    fontSize: '16px'
  },
  linkButton: {
    color: '#222222',
    textDecoration: 'underline',
    fontSize: '14px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #222222',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 24px'
  }
};

export default EmailPreferencesPage;
