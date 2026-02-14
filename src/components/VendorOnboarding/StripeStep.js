import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { showBanner } from '../../utils/helpers';

function StripeStep({ formData, setFormData, currentUser }) {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [stripeStatus, setStripeStatus] = useState({
    connected: false,
    accountId: null,
    detailsSubmitted: false,
    chargesEnabled: false,
    payoutsEnabled: false
  });

  // Check Stripe connection status on mount
  useEffect(() => {
    if (currentUser?.vendorProfileId) {
      loadStripeStatus();
    } else {
      setLoading(false);
    }
  }, [currentUser?.vendorProfileId]);

  const loadStripeStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/payments/connect/status/${currentUser.vendorProfileId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStripeStatus(data);
        // Update formData so step completion can check it
        if (data.connected) {
          setFormData(prev => ({ ...prev, stripeConnected: true }));
        }
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    if (!currentUser?.vendorProfileId) {
      showBanner('Please complete your profile first before connecting Stripe.', 'info');
      return;
    }

    setConnecting(true);
    try {
      // Determine origin based on current URL path
      const origin = window.location.pathname.includes('become-a-vendor') ? 'onboarding' : 'dashboard';
      const response = await fetch(`${API_BASE_URL}/payments/connect/onboard/${currentUser.vendorProfileId}?origin=${origin}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Check for authUrl or url (dashboard uses both)
        if (data.authUrl || data.url) {
          // Open Stripe in new tab - user will be redirected back after completing setup
          window.open(data.authUrl || data.url, '_blank');
          showBanner('Stripe setup opened in a new tab. Complete the setup there, then return here.', 'info');
        } else {
          showBanner('Stripe Connect is not configured yet. Please contact support.', 'warning');
        }
      } else {
        const errorData = await response.json();
        console.error('Stripe onboard error:', errorData);
        showBanner(errorData.message || 'Failed to initiate Stripe connection', 'error');
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      showBanner('Failed to connect to Stripe. Please try again.', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleManageStripe = async () => {
    try {
      showBanner('Opening Stripe dashboard...', 'info');
      const response = await fetch(`${API_BASE_URL}/payments/connect/dashboard/${currentUser.vendorProfileId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const url = data.dashboardUrl || data.url || data.link;
        if (url) {
          window.open(url, '_blank');
        } else {
          showBanner('Could not get Stripe dashboard URL. Please try again.', 'error');
        }
      } else {
        // For Standard accounts, redirect to Stripe login
        if (data.error && data.error.includes('Express Dashboard')) {
          window.open('https://dashboard.stripe.com/login', '_blank');
          showBanner('Redirecting to Stripe Dashboard login...', 'info');
        } else {
          showBanner('Failed to open Stripe dashboard. Please try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Error opening Stripe dashboard:', error);
      showBanner('Failed to open Stripe dashboard', 'error');
    }
  };

  return (
    <div className="stripe-step">
      <div style={{ maxWidth: '100%', width: '100%' }}>
        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <i className="fab fa-stripe" style={{ color: '#635bff', fontSize: '1.5rem' }}></i>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Connect Stripe for Payments</h3>
          </div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Set up payment processing to accept online payments from clients securely through Stripe.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <div className="spinner"></div>
          </div>
        )}

        {/* Main Content */}
        {!loading && (
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
                <i className={`fas ${stripeStatus.connected ? 'fa-check-circle' : 'fa-times-circle'}`} 
                   style={{ color: stripeStatus.connected ? '#16a34a' : '#6b7280' }}></i>
                <span style={{ fontWeight: 500 }}>
                  {!currentUser?.vendorProfileId 
                    ? 'Complete profile first'
                    : !stripeStatus.connected 
                      ? 'Not connected' 
                      : stripeStatus.detailsSubmitted 
                        ? 'Connected and active' 
                        : 'Connected - setup incomplete'}
                </span>
              </div>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {!currentUser?.vendorProfileId 
                  ? 'You need to complete your basic profile before connecting Stripe.'
                  : !stripeStatus.connected 
                    ? 'Connect your Stripe account to accept credit cards, debit cards, and other payment methods.'
                    : stripeStatus.detailsSubmitted
                      ? 'Your account is ready to receive payments.'
                      : 'Complete your Stripe setup to start accepting payments.'}
              </p>
            </div>

            {/* Connect/Manage Button */}
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                onClick={stripeStatus.connected ? handleManageStripe : handleConnectStripe}
                disabled={connecting || !currentUser?.vendorProfileId}
                className="btn btn-primary"
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.95rem',
                  background: '#222222',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 600,
                  cursor: (connecting || !currentUser?.vendorProfileId) ? 'not-allowed' : 'pointer',
                  opacity: (connecting || !currentUser?.vendorProfileId) ? 0.7 : 1
                }}
              >
                {connecting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Connecting...
                  </>
                ) : (
                  <>
                    <i className={stripeStatus.connected ? "fas fa-external-link-alt" : "fab fa-stripe"} style={{ fontSize: '1.1rem' }}></i>
                    {stripeStatus.connected 
                      ? (stripeStatus.detailsSubmitted ? 'Manage Stripe Account' : 'Complete Stripe Setup')
                      : 'Connect Stripe Account'}
                  </>
                )}
              </button>
            </div>

            {/* Account Details - Only show when connected */}
            {stripeStatus.connected && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '2rem 0' }} />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>
                      Account ID
                    </label>
                    <div style={{ padding: '0.75rem 1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {stripeStatus.accountId || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>
                      Details Submitted
                    </label>
                    <div style={{ padding: '0.75rem 1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {stripeStatus.detailsSubmitted ? (
                        <><i className="fas fa-check-circle" style={{ color: '#16a34a' }}></i> <span style={{ color: '#16a34a', fontWeight: 500 }}>Yes</span></>
                      ) : (
                        <><i className="fas fa-times-circle" style={{ color: '#dc2626' }}></i> <span style={{ color: '#dc2626', fontWeight: 500 }}>No</span></>
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>
                      Charges Enabled
                    </label>
                    <div style={{ padding: '0.75rem 1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {stripeStatus.chargesEnabled ? (
                        <><i className="fas fa-check-circle" style={{ color: '#16a34a' }}></i> <span style={{ color: '#16a34a', fontWeight: 500 }}>Yes</span></>
                      ) : (
                        <><i className="fas fa-times-circle" style={{ color: '#dc2626' }}></i> <span style={{ color: '#dc2626', fontWeight: 500 }}>No</span></>
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>
                      Payouts Enabled
                    </label>
                    <div style={{ padding: '0.75rem 1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {stripeStatus.payoutsEnabled ? (
                        <><i className="fas fa-check-circle" style={{ color: '#16a34a' }}></i> <span style={{ color: '#16a34a', fontWeight: 500 }}>Yes</span></>
                      ) : (
                        <><i className="fas fa-times-circle" style={{ color: '#dc2626' }}></i> <span style={{ color: '#dc2626', fontWeight: 500 }}>No</span></>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Why Connect Stripe - Only show when not connected */}
            {!stripeStatus.connected && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '12px' }}>
                <h5 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                  Why connect Stripe?
                </h5>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#6b7280', fontSize: '0.95rem', lineHeight: 1.8 }}>
                  <li>Accept credit cards, debit cards, and digital wallets</li>
                  <li>Secure payment processing with industry-leading security</li>
                  <li>Automatic payouts to your bank account</li>
                  <li>Built-in fraud protection and dispute management</li>
                  <li>Detailed transaction reporting and analytics</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StripeStep;
