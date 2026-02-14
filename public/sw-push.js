/**
 * Push Notification Service Worker
 * 
 * Handles incoming push notifications and notification click events.
 * This service worker runs in the background and displays push notifications
 * even when the app is not open.
 */

// Handle incoming push notifications
self.addEventListener('push', function(event) {
  console.log('[SW Push] Push received:', event);
  
  let data = {
    title: 'PlanBeau',
    body: 'You have a new notification',
    icon: '/images/planbeau-platform-assets/icons/notification/notif-general.svg',
    badge: '/images/planbeau-platform-assets/branding/badge-72.png',
    data: { url: '/dashboard' }
  };
  
  // Parse push data if available
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error('[SW Push] Error parsing push data:', e);
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: data.data || { url: '/dashboard' },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: false,
    tag: data.tag || 'planbeau-notification',
    renotify: true
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click events
self.addEventListener('notificationclick', function(event) {
  console.log('[SW Push] Notification clicked:', event.action);
  
  event.notification.close();
  
  // Handle different actions
  if (event.action === 'dismiss') {
    return;
  }
  
  // Default action or 'open' action - open the URL
  const url = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open with the app
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Navigate existing window to the URL and focus it
            client.navigate(url);
            return client.focus();
          }
        }
        // No existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle notification close events
self.addEventListener('notificationclose', function(event) {
  console.log('[SW Push] Notification closed:', event.notification.tag);
});

// Handle service worker installation
self.addEventListener('install', function(event) {
  console.log('[SW Push] Service worker installed');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', function(event) {
  console.log('[SW Push] Service worker activated');
  event.waitUntil(clients.claim());
});
