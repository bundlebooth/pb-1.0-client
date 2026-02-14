import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config';

// Global cache to prevent duplicate API calls across components
const vendorStatusCache = {
  data: {},
  lastFetch: 0,
  pendingRequest: null,
  subscribers: new Set()
};

const CACHE_TTL = 60000; // 1 minute cache TTL
const MIN_FETCH_INTERVAL = 30000; // Minimum 30 seconds between fetches
const POLLING_INTERVAL = 300000; // Poll every 5 minutes

/**
 * Hook to fetch and track online status for vendors
 * Uses global cache to prevent duplicate API calls
 */
export function useVendorOnlineStatus(vendorProfileIds, options = {}) {
  const { enabled = true } = options;
  const [statuses, setStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);
  
  // Store vendorProfileIds in a ref to avoid dependency changes
  const idsRef = useRef(vendorProfileIds);
  idsRef.current = vendorProfileIds;

  const fetchStatus = useCallback(async () => {
    if (!enabled || !idsRef.current) return;

    const ids = Array.isArray(idsRef.current) ? idsRef.current : [idsRef.current];
    if (ids.length === 0) return;

    const now = Date.now();
    
    // Check if we have fresh cached data
    if (now - vendorStatusCache.lastFetch < MIN_FETCH_INTERVAL && Object.keys(vendorStatusCache.data).length > 0) {
      // Use cached data
      const cachedStatuses = {};
      ids.forEach(id => {
        if (vendorStatusCache.data[id]) {
          cachedStatuses[id] = vendorStatusCache.data[id];
        }
      });
      if (Object.keys(cachedStatuses).length > 0 && mountedRef.current) {
        setStatuses(cachedStatuses);
      }
      return;
    }

    // If there's already a pending request, wait for it
    if (vendorStatusCache.pendingRequest) {
      try {
        await vendorStatusCache.pendingRequest;
        const cachedStatuses = {};
        ids.forEach(id => {
          if (vendorStatusCache.data[id]) {
            cachedStatuses[id] = vendorStatusCache.data[id];
          }
        });
        if (mountedRef.current) {
          setStatuses(cachedStatuses);
        }
      } catch (e) { /* ignore */ }
      return;
    }

    setIsLoading(true);

    // Create the fetch promise
    const fetchPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/vendors/online-status/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorProfileIds: ids })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Update global cache
            vendorStatusCache.data = { ...vendorStatusCache.data, ...data.statuses };
            vendorStatusCache.lastFetch = Date.now();
            return data.statuses;
          }
        }
      } catch (err) {
        // Silently fail - online status is not critical
      }
      return null;
    })();

    vendorStatusCache.pendingRequest = fetchPromise;

    try {
      const result = await fetchPromise;
      if (result && mountedRef.current) {
        setStatuses(result);
      }
    } finally {
      vendorStatusCache.pendingRequest = null;
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    fetchStatus();

    // Single global polling interval - only one component needs to poll
    const intervalId = setInterval(fetchStatus, POLLING_INTERVAL);
    
    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchStatus]);

  return { statuses, isLoading, error: null, refresh: fetchStatus };
}

// Global cache for user online status
const userStatusCache = {
  data: {},
  lastFetch: 0,
  pendingRequest: null
};

/**
 * Hook to fetch and track online status for users
 * Uses global cache to prevent duplicate API calls
 */
export function useUserOnlineStatus(userIds, options = {}) {
  const { enabled = true } = options;
  const [statuses, setStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);
  
  // Store userIds in a ref to avoid dependency changes
  const idsRef = useRef(userIds);
  idsRef.current = userIds;

  const fetchStatus = useCallback(async () => {
    if (!enabled || !idsRef.current) return;

    const ids = Array.isArray(idsRef.current) ? idsRef.current : [idsRef.current];
    if (ids.length === 0) return;

    const now = Date.now();
    
    // Check if we have fresh cached data
    if (now - userStatusCache.lastFetch < MIN_FETCH_INTERVAL && Object.keys(userStatusCache.data).length > 0) {
      const cachedStatuses = {};
      ids.forEach(id => {
        if (userStatusCache.data[id]) {
          cachedStatuses[id] = userStatusCache.data[id];
        }
      });
      if (Object.keys(cachedStatuses).length > 0 && mountedRef.current) {
        setStatuses(cachedStatuses);
      }
      return;
    }

    // If there's already a pending request, wait for it
    if (userStatusCache.pendingRequest) {
      try {
        await userStatusCache.pendingRequest;
        const cachedStatuses = {};
        ids.forEach(id => {
          if (userStatusCache.data[id]) {
            cachedStatuses[id] = userStatusCache.data[id];
          }
        });
        if (mountedRef.current) {
          setStatuses(cachedStatuses);
        }
      } catch (e) { /* ignore */ }
      return;
    }

    setIsLoading(true);

    const fetchPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/online-status/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: ids })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            userStatusCache.data = { ...userStatusCache.data, ...data.statuses };
            userStatusCache.lastFetch = Date.now();
            return data.statuses;
          }
        }
      } catch (err) {
        // Silently fail
      }
      return null;
    })();

    userStatusCache.pendingRequest = fetchPromise;

    try {
      const result = await fetchPromise;
      if (result && mountedRef.current) {
        setStatuses(result);
      }
    } finally {
      userStatusCache.pendingRequest = null;
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    fetchStatus();

    const intervalId = setInterval(fetchStatus, POLLING_INTERVAL);
    
    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchStatus]);

  return { statuses, isLoading, error: null, refresh: fetchStatus };
}

/**
 * Hook to send heartbeat to keep user online status updated
 * Should be used in the main App component or layout
 */
export function useHeartbeat() {
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let lastHeartbeat = 0;
    const MIN_HEARTBEAT_INTERVAL = 10000; // Minimum 10 seconds between heartbeats

    const sendHeartbeat = async () => {
      const now = Date.now();
      // Prevent sending heartbeats too frequently
      if (now - lastHeartbeat < MIN_HEARTBEAT_INTERVAL) return;
      lastHeartbeat = now;
      
      try {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) return;
        
        await fetch(`${API_BASE_URL}/users/heartbeat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (err) {
        // Silently fail - heartbeat is not critical
      }
    };

    // Send initial heartbeat immediately
    sendHeartbeat();

    // Send heartbeat every 2 minutes
    const interval = setInterval(sendHeartbeat, 2 * 60 * 1000);

    // Track last activity time
    let lastActivityTime = Date.now();
    
    // Send heartbeat on any user activity (debounced)
    let activityTimeout = null;
    const handleActivity = () => {
      lastActivityTime = Date.now();
      
      // Clear any pending timeout
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      
      // Send heartbeat after short delay to batch rapid events
      activityTimeout = setTimeout(() => {
        sendHeartbeat();
      }, 1000); // 1 second debounce
    };

    // Listen to various user activity events
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('focus', handleActivity);
    
    // Also send heartbeat when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      if (activityTimeout) clearTimeout(activityTimeout);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('focus', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}

/**
 * Online status indicator component styles
 */
export const OnlineStatusStyles = {
  dot: {
    online: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: '#22c55e',
      border: '2px solid white',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
    },
    offline: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: '#9ca3af',
      border: '2px solid white',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
    }
  },
  text: {
    online: {
      color: '#22c55e',
      fontSize: '12px',
      fontWeight: 500
    },
    offline: {
      color: '#6b7280',
      fontSize: '12px',
      fontWeight: 400
    }
  }
};

export default { useVendorOnlineStatus, useUserOnlineStatus, useHeartbeat, OnlineStatusStyles };
