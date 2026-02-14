import { API_BASE_URL } from '../config';

/**
 * Start Stripe Connect onboarding for a vendor
 * @param {string} vendorProfileId - The vendor's profile ID
 * @returns {Promise<boolean>} - Success status
 */
export async function startStripeOnboarding(vendorProfileId) {
  try {
    if (!vendorProfileId) {
      console.error('startStripeOnboarding: vendorProfileId is required');
      throw new Error('Vendor profile ID is required');
    }

    const response = await fetch(`${API_BASE_URL}/payments/connect/onboard/${vendorProfileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      if (data.requiresSetup) {
        throw new Error('Stripe Connect is not configured on this server. Please contact support to set up payment processing.');
      }
      throw new Error(data.message || 'Failed to start onboarding');
    }

    if (data.success && data.authUrl) {
      // Open Stripe OAuth in new tab
      window.open(data.authUrl, '_blank');
      return true;
    } else {
      throw new Error('No authorization URL received');
    }
  } catch (error) {
    console.error('Stripe onboarding error:', error);
    throw error;
  }
}

/**
 * Continue Stripe onboarding for incomplete setups
 * @param {string} vendorProfileId - The vendor's profile ID
 * @returns {Promise<boolean>} - Success status
 */
export async function continueStripeOnboarding(vendorProfileId) {
  return await startStripeOnboarding(vendorProfileId);
}

/**
 * Check vendor's Stripe Connect status
 * @param {string} vendorProfileId - The vendor's profile ID
 * @returns {Promise<Object>} - Status object with connected, chargesEnabled, requiresSetup flags
 */
export async function checkVendorStripeStatus(vendorProfileId) {
  try {
    if (!vendorProfileId) {
      console.warn('checkVendorStripeStatus: vendorProfileId is required');
      return { connected: false, chargesEnabled: false, requiresSetup: false };
    }

    const response = await fetch(`${API_BASE_URL}/payments/connect/status/${vendorProfileId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn('Stripe status check failed:', data.message);
      return { connected: false, chargesEnabled: false, requiresSetup: false };
    }

    // Check if Stripe Connect is configured
    if (data.requiresSetup) {
      return { connected: false, chargesEnabled: false, requiresSetup: true };
    }

    return {
      connected: !!(data && data.connected),
      chargesEnabled: !!(data && data.chargesEnabled),
      requiresSetup: false,
      detailsSubmitted: data.detailsSubmitted || false,
      payoutsEnabled: data.payoutsEnabled || false
    };
  } catch (error) {
    console.warn('Stripe status check failed:', error);
    return { connected: false, chargesEnabled: false, requiresSetup: false };
  }
}

/**
 * Access Stripe Express Dashboard for vendors
 * @param {string} vendorProfileId - The vendor's profile ID
 * @returns {Promise<boolean>} - Success status
 */
export async function accessStripeDashboard(vendorProfileId) {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/connect/dashboard/${vendorProfileId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to access dashboard');
    }

    if (data.dashboardUrl) {
      // Open dashboard in new tab
      window.open(data.dashboardUrl, '_blank');
      return true;
    } else {
      throw new Error('No dashboard URL received');
    }
  } catch (error) {
    console.error('Dashboard access failed:', error);
    throw error;
  }
}

/**
 * Process a refund for a booking
 * @param {string} bookingId - The booking ID
 * @param {number} amount - Refund amount (optional, full refund if not specified)
 * @param {string} reason - Reason for refund
 * @returns {Promise<Object>} - Refund result
 */
export async function processRefund(bookingId, amount = null, reason = '') {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        bookingId,
        amount,
        reason
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to process refund');
    }

    return data;
  } catch (error) {
    console.error('Refund processing failed:', error);
    throw error;
  }
}

/**
 * Get payout history for a vendor
 * @param {string} vendorProfileId - The vendor's profile ID
 * @returns {Promise<Array>} - Array of payout records
 */
export async function getPayoutHistory(vendorProfileId) {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/connect/payouts/${vendorProfileId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch payout history');
    }

    return data.payouts || [];
  } catch (error) {
    console.error('Failed to fetch payout history:', error);
    return [];
  }
}
