import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { AlertModal } from '../components/UniversalModal';

const AlertContext = createContext();

/**
 * Hook to access the global alert system
 * Usage: const { showAlert, showSuccess, showError, showWarning } = useAlert();
 */
export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

/**
 * AlertProvider - Provides global alert functionality
 * Wrap your app with this provider to use showAlert() anywhere
 */
export function AlertProvider({ children }) {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    buttonLabel: 'OK',
    onClose: null
  });

  // Show an alert and return a promise that resolves when user clicks OK
  const showAlert = useCallback((options) => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        title: options.title || 'Alert',
        message: options.message || '',
        variant: options.variant || 'info',
        buttonLabel: options.buttonLabel || 'OK',
        onClose: () => {
          setAlertState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
          if (options.onClose) {
            options.onClose();
          }
        }
      });
    });
  }, []);

  // Convenience methods
  const showSuccess = useCallback((message, title = 'Success') => {
    return showAlert({ title, message, variant: 'success' });
  }, [showAlert]);

  const showError = useCallback((message, title = 'Error') => {
    return showAlert({ title, message, variant: 'danger' });
  }, [showAlert]);

  const showWarning = useCallback((message, title = 'Warning') => {
    return showAlert({ title, message, variant: 'warning' });
  }, [showAlert]);

  const showInfo = useCallback((message, title = 'Information') => {
    return showAlert({ title, message, variant: 'info' });
  }, [showAlert]);

  const handleClose = useCallback(() => {
    if (alertState.onClose) {
      alertState.onClose();
    } else {
      setAlertState(prev => ({ ...prev, isOpen: false }));
    }
  }, [alertState.onClose]);

  // Listen for force-logout modal events from socket
  useEffect(() => {
    const handleForceLogoutModal = (event) => {
      const { message, onAcknowledge } = event.detail;
      setAlertState({
        isOpen: true,
        title: 'Account Suspended',
        message: message,
        variant: 'danger',
        buttonLabel: 'OK',
        onClose: () => {
          setAlertState(prev => ({ ...prev, isOpen: false }));
          // Wait a moment for modal to close, then execute the callback
          setTimeout(() => {
            if (onAcknowledge) {
              onAcknowledge();
            }
          }, 300);
        }
      });
    };

    window.addEventListener('showForceLogoutModal', handleForceLogoutModal);
    return () => {
      window.removeEventListener('showForceLogoutModal', handleForceLogoutModal);
    };
  }, []);

  const value = {
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={handleClose}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
        buttonLabel={alertState.buttonLabel}
      />
    </AlertContext.Provider>
  );
}

export default AlertContext;
