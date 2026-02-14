/**
 * Push Notification Service
 * Handles browser push notification subscription and management
 */

import { API_BASE_URL } from '../config';

/**
 * Check if push notifications are supported
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestPermission() {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }
  
  try {
    const permission = await Notification.requestPermission();
    return { success: permission === 'granted', permission };
  } catch (error) {
    console.error('[PushService] Permission request failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Register the service worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return { success: false, error: 'Service workers not supported' };
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('[PushService] Service worker registered:', registration.scope);
    return { success: true, registration };
  } catch (error) {
    console.error('[PushService] Service worker registration failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(userId, authToken) {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }
  
  try {
    // First request permission
    const permResult = await requestPermission();
    if (!permResult.success) {
      return permResult;
    }
    
    // Register service worker
    const swResult = await registerServiceWorker();
    if (!swResult.success) {
      return swResult;
    }
    
    const registration = swResult.registration;
    
    // Get existing subscription or create new one
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Get VAPID public key from server
      const vapidResponse = await fetch(`${API_BASE_URL}/push/vapid-public-key`);
      const vapidData = await vapidResponse.json();
      
      if (!vapidData.success || !vapidData.publicKey) {
        return { success: false, error: 'Failed to get VAPID key from server' };
      }
      
      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }
    
    // Send subscription to server
    const response = await fetch(`${API_BASE_URL}/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        userId,
        subscription: subscription.toJSON()
      })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('[PushService] Successfully subscribed to push notifications');
      return { success: true, subscription };
    } else {
      return { success: false, error: data.message || 'Failed to save subscription' };
    }
  } catch (error) {
    console.error('[PushService] Subscription failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(userId, authToken) {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Notify server
      await fetch(`${API_BASE_URL}/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ userId })
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('[PushService] Unsubscribe failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isSubscribed() {
  if (!isPushSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    return false;
  }
}

/**
 * Show a local notification (for testing)
 */
export async function showLocalNotification(title, options = {}) {
  if (!isPushSupported()) return false;
  
  const permission = await requestPermission();
  if (!permission.success) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/images/planbeau-platform-assets/branding/logo.png',
      badge: '/images/planbeau-platform-assets/branding/logo.png',
      ...options
    });
    return true;
  } catch (error) {
    console.error('[PushService] Failed to show notification:', error);
    return false;
  }
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

export default {
  isPushSupported,
  getPermissionStatus,
  requestPermission,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  showLocalNotification
};
