/**
 * Push Notification Utilities
 * 
 * Handles push notification subscription management including:
 * - Service worker registration
 * - Push subscription creation
 * - Subscription storage to backend
 * - Permission handling
 * 
 * Usage:
 *   import { subscribeToPush, unsubscribeFromPush, isPushSupported } from './pushNotifications';
 *   
 *   if (isPushSupported()) {
 *     const subscription = await subscribeToPush(userId);
 *   }
 */

import { API_BASE_URL } from '../config';

// VAPID public key - should match the server's VAPID_PUBLIC_KEY
// This needs to be set in environment variables
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || '';

/**
 * Check if push notifications are supported
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register service worker and subscribe to push notifications
 * @param {number} userId - The user ID to associate with the subscription
 * @param {string} authToken - JWT token for API authentication
 * @returns {object|null} The push subscription or null if failed
 */
export async function subscribeToPush(userId, authToken) {
  if (!isPushSupported()) {
    console.warn('[Push] Push notifications not supported');
    return null;
  }
  
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[Push] VAPID public key not configured');
    return null;
  }
  
  try {
    // Request permission first
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('[Push] Notification permission denied');
      return null;
    }
    
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw-push.js', {
      scope: '/'
    });
    console.log('[Push] Service worker registered:', registration.scope);
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      console.log('[Push] New subscription created');
    } else {
      console.log('[Push] Using existing subscription');
    }
    
    // Send subscription to backend
    const subscriptionJson = subscription.toJSON();
    const response = await fetch(`${API_BASE_URL}/users/${userId}/push-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        endpoint: subscriptionJson.endpoint,
        p256dhKey: subscriptionJson.keys?.p256dh,
        authKey: subscriptionJson.keys?.auth,
        subscription: JSON.stringify(subscriptionJson),
        deviceName: getDeviceName()
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to save subscription');
    }
    
    console.log('[Push] Subscription saved to backend');
    return subscription;
    
  } catch (error) {
    console.error('[Push] Error subscribing to push:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 * @param {number} userId - The user ID
 * @param {string} authToken - JWT token for API authentication
 */
export async function unsubscribeFromPush(userId, authToken) {
  if (!isPushSupported()) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      return false;
    }
    
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return false;
    }
    
    // Unsubscribe locally
    await subscription.unsubscribe();
    
    // Remove from backend
    const subscriptionJson = subscription.toJSON();
    await fetch(`${API_BASE_URL}/users/${userId}/push-subscription`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        endpoint: subscriptionJson.endpoint
      })
    });
    
    console.log('[Push] Unsubscribed from push notifications');
    return true;
    
  } catch (error) {
    console.error('[Push] Error unsubscribing:', error);
    return false;
  }
}

/**
 * Check if user is currently subscribed to push
 */
export async function isSubscribedToPush() {
  if (!isPushSupported()) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      return false;
    }
    
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
    
  } catch (error) {
    console.error('[Push] Error checking subscription:', error);
    return false;
  }
}

/**
 * Get device name for identifying subscriptions
 */
function getDeviceName() {
  const ua = navigator.userAgent;
  
  // Detect browser
  let browser = 'Unknown Browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome';
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari';
  } else if (ua.includes('Edg')) {
    browser = 'Edge';
  }
  
  // Detect OS
  let os = 'Unknown OS';
  if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Mac OS')) {
    os = 'macOS';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
  }
  
  return `${browser} on ${os}`;
}

/**
 * Show a local notification (for testing)
 */
export async function showLocalNotification(title, options = {}) {
  if (!isPushSupported()) {
    return false;
  }
  
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return false;
  }
  
  const registration = await navigator.serviceWorker.ready;
  
  await registration.showNotification(title, {
    body: options.body || '',
    icon: options.icon || '/images/planbeau-platform-assets/icons/notification/notif-general.svg',
    badge: '/images/planbeau-platform-assets/branding/badge-72.png',
    vibrate: [100, 50, 100],
    data: options.data || { url: '/dashboard' },
    ...options
  });
  
  return true;
}
