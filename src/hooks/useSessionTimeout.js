/**
 * Session Timeout Hook
 * Tracks user activity and automatically logs out inactive users
 * based on the session timeout setting configured in admin dashboard.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../utils/api';

const DEFAULT_TIMEOUT_MINUTES = 60;

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click'
];

export function useSessionTimeout(enabled = true) {
  const auth = useAuth() || {};
  const currentUser = auth.currentUser;
  const logout = auth.logout;
  const timeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const timeoutMinutesRef = useRef(DEFAULT_TIMEOUT_MINUTES);
  const isInitializedRef = useRef(false);

  const fetchTimeoutSetting = useCallback(async () => {
    try {
      const response = await apiGet('/admin/security/2fa-settings');
      if (response && response.ok) {
        const data = await response.json();
        if (data && data.settings && data.settings.sessionTimeout) {
          timeoutMinutesRef.current = parseInt(data.settings.sessionTimeout, 10) || DEFAULT_TIMEOUT_MINUTES;
        }
      }
    } catch (error) {
      // Use default timeout
    }
  }, []);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const checkTimeout = useCallback(() => {
    if (!currentUser || typeof logout !== 'function') return;

    const now = Date.now();
    const lastActivity = lastActivityRef.current;
    const timeoutMs = timeoutMinutesRef.current * 60 * 1000;
    const timeSinceActivity = now - lastActivity;

    if (timeSinceActivity >= timeoutMs) {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }

      try {
        logout('session_expired');
      } catch (e) {
        // Continue with redirect
      }
      
      // Set session storage for ProfileModal to display message
      sessionStorage.setItem('logoutReason', 'session_expired');
      window.location.href = '/?sessionExpired=true';
    }
  }, [currentUser, logout]);

  useEffect(() => {
    if (!enabled || !currentUser || isInitializedRef.current) return;

    isInitializedRef.current = true;
    fetchTimeoutSetting();

    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    timeoutRef.current = setInterval(checkTimeout, 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimeout();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [enabled, currentUser, fetchTimeoutSetting, handleActivity, checkTimeout]);

  useEffect(() => {
    if (!currentUser) {
      isInitializedRef.current = false;
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [currentUser]);

  return {
    resetActivity: handleActivity,
    timeoutMinutes: timeoutMinutesRef.current
  };
}

export default useSessionTimeout;
