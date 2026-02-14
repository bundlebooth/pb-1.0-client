import React, { useState, useEffect } from 'react';
import { showBanner } from '../../../utils/helpers';
import { apiGet, apiPost } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';

function StripeSetupPanel({ onBack, vendorProfileId }) {
  const [loading, setLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState({
    connected: false,
    accountId: null,
    detailsSubmitted: false,
    chargesEnabled: false,
    payoutsEnabled: false
  });

  useEffect(() => {
    if (vendorProfileId) {
      loadStripeStatus();
    } else {
      setLoading(false);
    }
  }, [vendorProfileId]);

  const loadStripeStatus = async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/payments/connect/status/${vendorProfileId}`);
      
      if (response.ok) {
        const data = await response.json();
        setStripeStatus(data);
      }
    } catch (error) {
      console.error('Error loading Stripe status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      // Pass origin=dashboard so redirect comes back to dashboard after Stripe setup
      const response = await fetch(`${API_BASE_URL}/payments/connect/onboard/${vendorProfileId}?origin=dashboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl || data.url) {
          // Open Stripe in new tab - user will be redirected back after completing setup
          window.open(data.authUrl || data.url, '_blank');
          showBanner('Stripe setup opened in a new tab. Complete the setup there, then return here.', 'info');
        }
      } else {
        throw new Error('Failed to start onboarding');
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      showBanner('Failed to connect Stripe', 'error');
    }
  };

  const handleManageStripe = async () => {
    try {
      showBanner('Opening Stripe dashboard...', 'info');
      const response = await fetch(`${API_BASE_URL}/payments/connect/dashboard/${vendorProfileId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const url = data.dashboardUrl || data.url || data.link;
        if (url) {
          window.open(url, '_blank');
        } else {
          console.error('No dashboard URL in response:', data);
          showBanner('Could not get Stripe dashboard URL. Please try again.', 'error');
        }
      } else {
        // Check if this is a Standard account (not Express)
        if (data.error && data.error.includes('Express Dashboard')) {
          // For Standard accounts, redirect to Stripe login
          window.open('https://dashboard.stripe.com/login', '_blank');
          showBanner('Redirecting to Stripe Dashboard login...', 'info');
        } else {
          console.error('Stripe dashboard error:', response.status, data);
          showBanner('Failed to open Stripe dashboard. Please try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Error opening Stripe dashboard:', error);
      showBanner('Failed to open Stripe dashboard', 'error');
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
              src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" 
              alt="Stripe" 
              style={{ width: '20px', height: '20px', objectFit: 'contain' }}
            />
          </span>
          Stripe Setup
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Connect your Stripe account to accept payments from customers.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

        <div className="form-group">
          <label>Connection Status</label>
          <input
            type="text"
            value={
              !stripeStatus.connected 
                ? 'Not connected' 
                : stripeStatus.detailsSubmitted 
                  ? 'Connected and active' 
                  : 'Connected - setup incomplete'
            }
            readOnly
            style={{ background: '#f9fafb' }}
          />
          <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            {!stripeStatus.connected 
              ? 'Connect your Stripe account to accept credit cards, debit cards, and other payment methods.'
              : stripeStatus.detailsSubmitted
                ? 'Your account is ready to receive payments.'
                : 'Complete your Stripe setup to start accepting payments.'}
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <button 
            type="button"
            className="btn btn-primary"
            onClick={stripeStatus.connected ? handleManageStripe : handleConnectStripe}
          >
            {stripeStatus.connected 
              ? (stripeStatus.detailsSubmitted ? 'Manage Stripe Account' : 'Complete Stripe Setup')
              : 'Connect Stripe Account'
            }
          </button>
        </div>

        {/* Account Details - Only show when connected */}
        {stripeStatus.connected && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '2rem 0' }} />
            
            <div className="form-row">
              <div className="form-col">
                <div className="form-group">
                  <label>Account ID</label>
                  <input
                    type="text"
                    value={stripeStatus.accountId || 'N/A'}
                    readOnly
                    style={{ background: '#f9fafb', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
              <div className="form-col">
                <div className="form-group">
                  <label>Details Submitted</label>
                  <input
                    type="text"
                    value={stripeStatus.detailsSubmitted ? 'Yes' : 'No'}
                    readOnly
                    style={{ background: '#f9fafb' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <div className="form-group">
                  <label>Charges Enabled</label>
                  <input
                    type="text"
                    value={stripeStatus.chargesEnabled ? 'Yes' : 'No'}
                    readOnly
                    style={{ background: '#f9fafb' }}
                  />
                </div>
              </div>
              <div className="form-col">
                <div className="form-group">
                  <label>Payouts Enabled</label>
                  <input
                    type="text"
                    value={stripeStatus.payoutsEnabled ? 'Yes' : 'No'}
                    readOnly
                    style={{ background: '#f9fafb' }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default StripeSetupPanel;
