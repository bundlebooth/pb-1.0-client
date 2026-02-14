/**
 * Session Timeout Provider
 * Wraps the app to provide global session timeout tracking
 * based on admin security settings.
 */

import React from 'react';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { useAuth } from '../context/AuthContext';

export function SessionTimeoutProvider({ children }) {
  const auth = useAuth();
  const currentUser = auth?.currentUser;
  
  useSessionTimeout(!!currentUser);
  
  return <>{children}</>;
}

export default SessionTimeoutProvider;
