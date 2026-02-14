import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { showBanner } from '../../../utils/helpers';
import { apiGet, apiPut } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';
import pushService from '../../../services/pushNotificationService';

function CommunicationPreferencesPanel({ onBack, isVendorMode = false, embedded = false }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [unsubscribedFromAll, setUnsubscribedFromAll] = useState(false);
  const [preferences, setPreferences] = useState({
    email: {
      bookingConfirmations: true,
      bookingReminders: true,
      bookingUpdates: true,
      messages: true,
      payments: true,
      promotions: false,
      newsletter: false,
      // Vendor-specific
      newBookingRequests: true,
      bookingCancellations: true,
      newReviews: true,
      inquiryMessages: true
    },
    push: {
      bookingUpdates: true,
      messages: true,
      promotions: false,
      // Vendor-specific
      newBookingRequests: true,
      newReviews: true
    }
  });
  const [originalPreferences, setOriginalPreferences] = useState(null);

  // Check if there are changes
  const hasChanges = originalPreferences ? 
    JSON.stringify(preferences) !== JSON.stringify(originalPreferences) : false;

  useEffect(() => {
    loadPreferences();
    checkPushStatus();
  }, [currentUser]);

  const checkPushStatus = async () => {
    const supported = pushService.isPushSupported();
    setPushSupported(supported);
    
    if (supported) {
      setPushPermission(pushService.getPermissionStatus());
      const subscribed = await pushService.isSubscribed();
      setPushSubscribed(subscribed);
    }
  };

  const loadPreferences = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/notification-preferences`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          const loadedPrefs = {
            email: { ...preferences.email, ...data.preferences.email },
            push: { ...preferences.push, ...data.preferences.push }
          };
          setPreferences(loadedPrefs);
          setOriginalPreferences(loadedPrefs);
        } else {
          setOriginalPreferences(preferences);
        }
        setUnsubscribedFromAll(data.unsubscribedFromAll || false);
      } else {
        setOriginalPreferences(preferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePush = async () => {
    if (!currentUser?.id) return;
    
    const token = localStorage.getItem('token');
    const result = await pushService.subscribeToPush(currentUser.id, token);
    
    if (result.success) {
      setPushSubscribed(true);
      setPushPermission('granted');
      showBanner('Push notifications enabled!', 'success');
    } else if (result.permission === 'denied') {
      setPushPermission('denied');
      showBanner('Push notifications blocked. Please enable in browser settings.', 'error');
    } else {
      showBanner(result.error || 'Failed to enable push notifications', 'error');
    }
  };

  const handleDisablePush = async () => {
    if (!currentUser?.id) return;
    
    const token = localStorage.getItem('token');
    await pushService.unsubscribeFromPush(currentUser.id, token);
    setPushSubscribed(false);
    showBanner('Push notifications disabled', 'success');
  };

  const handleTestPush = async () => {
    const success = await pushService.showLocalNotification('Test Notification', {
      body: 'This is a test push notification from Planbeau!',
      tag: 'test'
    });
    if (!success) {
      showBanner('Could not show test notification', 'error');
    }
  };

  const handleToggle = (category, key) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/notification-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...preferences, unsubscribeFromAll: unsubscribedFromAll })
      });
      
      if (response.ok) {
        showBanner('Communication preferences updated!', 'success');
        setOriginalPreferences({ ...preferences });
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      showBanner('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUnsubscribeToggle = () => {
    setUnsubscribedFromAll(prev => !prev);
  };

  const ToggleSwitch = ({ checked, onChange, label, description, disabled = false }) => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '1rem 0',
      borderBottom: '1px solid #f3f4f6',
      opacity: disabled ? 0.5 : 1
    }}>
      <div>
        <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>{label}</div>
        {description && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{description}</div>
        )}
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={disabled ? undefined : onChange}
          disabled={disabled}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: checked ? '#5086E8' : '#E5E7EB',
          borderRadius: '24px',
          transition: 'background-color 0.3s'
        }}>
          <span style={{
            position: 'absolute',
            height: '20px',
            width: '20px',
            left: checked ? '22px' : '2px',
            top: '2px',
            backgroundColor: 'white',
            borderRadius: '50%',
            transition: 'left 0.3s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}></span>
        </span>
      </label>
    </div>
  );

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
            <i className={`fas ${isVendorMode ? 'fa-bell' : 'fa-envelope'}`}></i>
          </span>
          {isVendorMode ? 'Vendor Notifications' : 'Communication Preferences'}
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Customise the email and push notifications you receive.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />
        
        <form onSubmit={handleSubmit}>
          {/* Email Notifications */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <i className="fas fa-envelope" style={{ color: 'var(--primary)' }}></i>
              Email Notifications
            </h3>
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={!unsubscribedFromAll} 
                onChange={handleUnsubscribeToggle}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: !unsubscribedFromAll ? '#5086E8' : '#E5E7EB',
                borderRadius: '24px',
                transition: 'background-color 0.3s'
              }}>
                <span style={{
                  position: 'absolute',
                  height: '20px',
                  width: '20px',
                  left: !unsubscribedFromAll ? '22px' : '2px',
                  top: '2px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: 'left 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}></span>
              </span>
            </label>
          </div>
          
          <ToggleSwitch
            checked={preferences.email.bookingConfirmations}
            onChange={() => handleToggle('email', 'bookingConfirmations')}
            label="Booking Confirmations"
            description="Receive email confirmations when bookings are made or updated"
            disabled={unsubscribedFromAll}
          />
          <ToggleSwitch
            checked={preferences.email.bookingReminders}
            onChange={() => handleToggle('email', 'bookingReminders')}
            label="Booking Reminders"
            description="Get reminded about upcoming bookings"
            disabled={unsubscribedFromAll}
          />
          <ToggleSwitch
            checked={preferences.email.bookingUpdates}
            onChange={() => handleToggle('email', 'bookingUpdates')}
            label="Booking Updates"
            description="Get notified when bookings are accepted, rejected, or cancelled"
            disabled={unsubscribedFromAll}
          />
          <ToggleSwitch
            checked={preferences.email.messages}
            onChange={() => handleToggle('email', 'messages')}
            label="New Messages"
            description="Receive email notifications for new messages"
            disabled={unsubscribedFromAll}
          />
          <ToggleSwitch
            checked={preferences.email.payments}
            onChange={() => handleToggle('email', 'payments')}
            label="Payment Notifications"
            description="Receive payment confirmations and invoices"
            disabled={unsubscribedFromAll}
          />
          <ToggleSwitch
            checked={preferences.email.promotions}
            onChange={() => handleToggle('email', 'promotions')}
            label="Promotions & Offers"
            description="Receive special offers and promotional content"
            disabled={unsubscribedFromAll}
          />
          <ToggleSwitch
            checked={preferences.email.newsletter}
            onChange={() => handleToggle('email', 'newsletter')}
            label="Newsletter"
            description="Receive our monthly newsletter with tips and updates"
            disabled={unsubscribedFromAll}
          />

          {/* Vendor-Specific Email Notifications */}
          {isVendorMode && (
            <>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '2rem 0 0.5rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fas fa-store" style={{ color: 'var(--primary)' }}></i>
                Vendor Alerts
              </h3>
              <ToggleSwitch
                checked={preferences.email.newBookingRequests}
                onChange={() => handleToggle('email', 'newBookingRequests')}
                label="New Booking Requests"
                description="Get notified when clients request a booking"
                disabled={unsubscribedFromAll}
              />
              <ToggleSwitch
                checked={preferences.email.bookingCancellations}
                onChange={() => handleToggle('email', 'bookingCancellations')}
                label="Booking Cancellations"
                description="Get notified when clients cancel a booking"
                disabled={unsubscribedFromAll}
              />
              <ToggleSwitch
                checked={preferences.email.newReviews}
                onChange={() => handleToggle('email', 'newReviews')}
                label="New Reviews"
                description="Get notified when clients leave a review"
                disabled={unsubscribedFromAll}
              />
              <ToggleSwitch
                checked={preferences.email.inquiryMessages}
                onChange={() => handleToggle('email', 'inquiryMessages')}
                label="Inquiry Messages"
                description="Get notified when clients send inquiry messages"
                disabled={unsubscribedFromAll}
              />
            </>
          )}

          {/* Push Notifications */}
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '2rem 0 0.5rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-bell" style={{ color: 'var(--primary)' }}></i>
            Browser Push Notifications
          </h3>
          
          {!pushSupported ? (
            <ToggleSwitch
              checked={false}
              onChange={() => {}}
              label="Push Notifications"
              description="Push notifications are not supported in this browser"
            />
          ) : pushPermission === 'denied' ? (
            <ToggleSwitch
              checked={false}
              onChange={() => {}}
              label="Push Notifications"
              description="Blocked - please enable in browser settings"
            />
          ) : (
            <>
              <ToggleSwitch
                checked={pushSubscribed}
                onChange={pushSubscribed ? handleDisablePush : handleEnablePush}
                label="Enable Push Notifications"
                description="Receive instant browser notifications"
              />
              {pushSubscribed && (
                <>
                  <ToggleSwitch
                    checked={preferences.push.messages}
                    onChange={() => handleToggle('push', 'messages')}
                    label="New Messages"
                    description="Get notified when you receive new messages"
                  />
                  <ToggleSwitch
                    checked={preferences.push.bookingUpdates}
                    onChange={() => handleToggle('push', 'bookingUpdates')}
                    label="Booking Updates"
                    description="Get notified about booking status changes"
                  />
                  <ToggleSwitch
                    checked={preferences.push.promotions}
                    onChange={() => handleToggle('push', 'promotions')}
                    label="Promotions"
                    description="Get notified about special offers"
                  />
                  {/* Vendor-specific push notifications */}
                  {isVendorMode && (
                    <>
                      <ToggleSwitch
                        checked={preferences.push.newBookingRequests}
                        onChange={() => handleToggle('push', 'newBookingRequests')}
                        label="New Booking Requests"
                        description="Get instant alerts for new booking requests"
                      />
                      <ToggleSwitch
                        checked={preferences.push.newReviews}
                        onChange={() => handleToggle('push', 'newReviews')}
                        label="New Reviews"
                        description="Get instant alerts when you receive a review"
                      />
                    </>
                  )}
                </>
              )}
            </>
          )}

          <div style={{ marginTop: '2rem' }}>
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
          </div>
        </form>
      </div>
    </div>
  );
}

export default CommunicationPreferencesPanel;
