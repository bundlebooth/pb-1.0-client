import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to initialize and manage Socket.IO connection
 * Sets window.socket for global access by message components
 */
export function useSocket() {
  const { currentUser, token, logout } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    // Only connect if user is authenticated
    if (!currentUser || !token) {
      if (window.socket) {
        window.socket.disconnect();
        window.socket = null;
      }
      return;
    }

    // Don't reconnect if already connected
    if (socketRef.current?.connected) {
      return;
    }

    // Initialize socket connection
    console.log('[Socket] Connecting to:', SOCKET_BASE_URL);

    const socket = io(SOCKET_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    // Handle force-logout from server (content moderation)
    socket.on('force-logout', (data) => {
      console.log('[Socket] Force logout received:', data);
      const message = data.isPermanent
        ? 'Your account has been locked due to using inappropriate language. You have had ' + (data.violationCount || 'multiple') + ' violation(s) in the last 24 hours. Please contact support if you believe this is an error.'
        : `Your account has been suspended for ${data.cooldownHours} hour(s) due to policy violations. Please try again later.`;
      
      // Dispatch a custom event that AlertContext will handle
      // This allows the modal to show and wait for user acknowledgment before logout
      window.dispatchEvent(new CustomEvent('showForceLogoutModal', {
        detail: {
          message,
          isPermanent: data.isPermanent,
          onAcknowledge: () => {
            if (logout) {
              logout(data.isPermanent ? 'account_locked' : 'account_suspended');
            }
            window.location.href = '/';
          }
        }
      }));
    });

    // Store socket globally for access by message components
    window.socket = socket;
    socketRef.current = socket;

    return () => {
      if (socket) {
        socket.disconnect();
        window.socket = null;
        socketRef.current = null;
      }
    };
  }, [currentUser, token, logout]);

  return socketRef.current;
}

export default useSocket;
