import React, { useState, useEffect } from 'react';
import { checkVendorStripeStatus, startStripeOnboarding } from '../utils/stripe';
import { useAuth } from '../context/AuthContext';

function StripeConnectBanner() {
  const { currentUser } = useAuth();
  const [stripeStatus, setStripeStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (currentUser?.vendorProfileId) {
      checkStatus();
    }
  }, [currentUser]);

  const checkStatus = async () => {
    if (!currentUser?.vendorProfileId) return;
    
    setChecking(true);
    try {
      const status = await checkVendorStripeStatus(currentUser.vendorProfileId);
      setStripeStatus(status);
    } catch (error) {
      console.error('Failed to check Stripe status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      await startStripeOnboarding(currentUser.vendorProfileId);
      // Recheck status after a delay (user will complete in new tab)
      setTimeout(() => {
        checkStatus();
      }, 5000);
    } catch (error) {
      alert(`Unable to start Stripe onboarding: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Don't show banner if checking, not a vendor, or already connected
  if (checking || !currentUser?.vendorProfileId) return null;
  if (stripeStatus?.connected && stripeStatus?.chargesEnabled) return null;

  // Show different messages based on status
  if (stripeStatus?.requiresSetup) {
    return (
      <div style={{
        margin: '16px auto',
        maxWidth: '1000px',
        border: '1px solid #e5e7eb',
        background: '#fff7ed',
        color: '#7c2d12',
        borderRadius: '12px',
        padding: '14px 16px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className="fas fa-exclamation-triangle" style={{ color: '#d97706' }}></i>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#92400e' }}>Payment Processing Not Available</div>
            <div style={{ fontSize: '0.925rem', color: '#b45309' }}>
              Stripe Connect is not configured on this server. Please contact support to enable payment processing.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      margin: '16px auto',
      maxWidth: '1000px',
      border: '1px solid #e5e7eb',
      background: '#fff7ed',
      color: '#7c2d12',
      borderRadius: '12px',
      padding: '14px 16px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <i className="fas fa-exclamation-circle" style={{ color: '#b45309' }}></i>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#92400e' }}>Connect your account to receive payouts</div>
          <div style={{ fontSize: '0.925rem', color: '#b45309' }}>
            To accept payments for approved bookings, please complete Stripe Express onboarding. 
            This enables payouts to your bank and automatically handles our 8% platform fee.
          </div>
        </div>
        <button
          onClick={handleConnect}
          disabled={loading}
          style={{
            whiteSpace: 'nowrap',
            background: '#5e72e4',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {loading ? (
            <>
              <i className="fas fa-spinner fa-spin"></i> Connecting...
            </>
          ) : (
            <>
              <i className="fab fa-stripe"></i> Connect with Stripe
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default StripeConnectBanner;
