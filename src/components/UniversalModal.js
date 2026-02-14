import React, { useEffect, useState, useCallback } from 'react';
import './UniversalModal.css';

/**
 * Universal Modal Component
 * Provides consistent modal styling across the application
 * 
 * GROUND RULE: On mobile/tablet (≤768px), modals must always leave space
 * for the bottom navigation bar. This is enforced via CSS in UniversalModal.css.
 * Any modal using this component will automatically respect this rule.
 * 
 * Props:
 * - isOpen: boolean - controls modal visibility
 * - onClose: function - called when modal should close
 * - title: string - modal header title
 * - children: React nodes - modal body content
 * - footer: React nodes - custom footer content (optional)
 * - primaryAction: { label: string, onClick: function, loading?: boolean } - primary button config
 * - secondaryAction: { label: string, onClick: function } - secondary button config (optional, defaults to Cancel)
 * - size: 'small' | 'medium' | 'large' - modal width (default: medium)
 * - showFooter: boolean - whether to show footer (default: true)
 * - variant: 'default' | 'warning' | 'success' | 'danger' - modal style variant
 * - icon: React node - optional icon to show in header area
 */

const UniversalModal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  primaryAction,
  secondaryAction,
  size = 'medium',
  showFooter = true,
  variant = 'default',
  icon,
  footerCentered = false
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Match animation duration
  }, [onClose]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  // Handle unmount after close animation
  useEffect(() => {
    if (!isOpen && !isClosing) {
      setShouldRender(false);
    }
  }, [isOpen, isClosing]);

  if (!shouldRender && !isOpen) return null;

  const sizeClasses = {
    small: 'um-modal-small',
    medium: 'um-modal-medium',
    large: 'um-modal-large'
  };

  // Removed backdrop click to close - modals can only be closed via X button or explicit actions

  return (
    <div className={`um-backdrop ${isClosing ? 'closing' : ''}`}>
      <div className={`um-modal ${sizeClasses[size] || sizeClasses.medium} ${isClosing ? 'closing' : ''}`}>
        {/* Modal Header */}
        <div className="um-header">
          <div className="um-header-content">
            {icon && <div className="um-header-icon">{icon}</div>}
            <h3 className="um-title">{title}</h3>
          </div>
          <button className="um-close-btn" onClick={handleClose} aria-label="Close modal">
            <span>×</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="um-body">
          {children}
        </div>

        {/* Modal Footer */}
        {showFooter && (
          <div className={`um-footer ${footerCentered ? 'um-footer-centered' : ''}`}>
            {footer ? (
              footer
            ) : (
              <>
                {secondaryAction !== false && (
                  <button
                    type="button"
                    className="um-btn um-btn-secondary"
                    onClick={secondaryAction?.onClick || handleClose}
                  >
                    {secondaryAction?.label || 'Cancel'}
                  </button>
                )}
                {primaryAction && (
                  <button
                    type="button"
                    className={`um-btn um-btn-primary ${primaryAction.loading ? 'um-btn-loading' : ''}`}
                    onClick={primaryAction.onClick}
                    disabled={primaryAction.loading}
                  >
                    {primaryAction.loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>Loading...</span>
                      </>
                    ) : (
                      primaryAction.label
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Confirmation Modal - A preset modal for confirmations/warnings
 */
export const ConfirmationModal = ({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'warning',
  icon
}) => {
  const variantIcons = {
    warning: <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b', fontSize: '28px' }}></i>,
    danger: <i className="fas fa-exclamation-circle" style={{ color: '#ef4444', fontSize: '28px' }}></i>,
    success: <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '28px' }}></i>,
    info: <i className="fas fa-info-circle" style={{ color: '#5086E8', fontSize: '28px' }}></i>
  };

  const variantColors = {
    warning: '#fef3c7',
    danger: '#fee2e2',
    success: '#d1fae5',
    info: '#dbeafe'
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      primaryAction={{ label: confirmLabel, onClick: onConfirm }}
      secondaryAction={{ label: cancelLabel, onClick: onClose }}
    >
      <div className="um-confirmation-content">
        <div 
          className="um-confirmation-icon"
          style={{ background: variantColors[variant] || variantColors.warning }}
        >
          {icon || variantIcons[variant] || variantIcons.warning}
        </div>
        <p className="um-confirmation-message">{message}</p>
      </div>
    </UniversalModal>
  );
};

/**
 * Detail Modal - For viewing details with sections
 */
export const DetailModal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'large',
  actions
}) => {
  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      footer={
        <div className="um-footer-actions">
          {actions}
          <button type="button" className="um-btn um-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      {children}
    </UniversalModal>
  );
};

/**
 * Form Modal - For forms with save/cancel actions
 */
export const FormModal = ({
  isOpen,
  onClose,
  title,
  children,
  onSave,
  saving = false,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  size = 'medium',
  disabled = false
}) => {
  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      primaryAction={{
        label: saving ? 'Saving...' : saveLabel,
        onClick: onSave,
        loading: saving,
        disabled: disabled || saving
      }}
      secondaryAction={{ label: cancelLabel, onClick: onClose }}
    >
      {children}
    </UniversalModal>
  );
};

/**
 * Delete Confirmation Modal - Preset for delete confirmations
 */
export const DeleteModal = ({
  isOpen,
  onClose,
  title = 'Confirm Delete',
  itemName,
  onConfirm,
  loading = false
}) => {
  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      primaryAction={{
        label: loading ? 'Deleting...' : 'Delete',
        onClick: onConfirm,
        loading
      }}
      secondaryAction={{ label: 'Cancel', onClick: onClose }}
    >
      <div className="um-confirmation-content">
        <div className="um-confirmation-icon" style={{ background: '#fee2e2' }}>
          <i className="fas fa-trash-alt" style={{ color: '#ef4444', fontSize: '28px' }}></i>
        </div>
        <p className="um-confirmation-message">
          Are you sure you want to delete {itemName ? <strong>{itemName}</strong> : 'this item'}? 
          This action cannot be undone.
        </p>
      </div>
    </UniversalModal>
  );
};

/**
 * Alert Modal - For showing alerts/info
 * Clean, minimal design matching Airbnb/app style
 */
export const AlertModal = ({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  buttonLabel = 'OK'
}) => {
  const variantConfig = {
    warning: { icon: 'fas fa-exclamation-triangle', iconColor: '#f59e0b' },
    danger: { icon: 'fas fa-times-circle', iconColor: '#ef4444' },
    success: { icon: 'fas fa-check-circle', iconColor: '#10b981' },
    info: { icon: 'fas fa-info-circle', iconColor: '#5086E8' }
  };

  const config = variantConfig[variant] || variantConfig.info;

  if (!isOpen) return null;

  return (
    <div 
      className="um-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '380px',
          margin: '20px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          animation: 'modalSlideIn 0.2s ease-out'
        }}
      >
        {/* Header with icon and close button */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #ebebeb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className={config.icon} style={{ color: config.iconColor, fontSize: '18px' }}></i>
            <h3 style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 600,
              color: '#222'
            }}>
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: '#717171',
              fontSize: '18px',
              lineHeight: 1,
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        {/* Content */}
        <div style={{ padding: '20px' }}>
          <p style={{
            margin: 0,
            fontSize: '0.95rem',
            color: '#484848',
            lineHeight: 1.6
          }}>
            {message}
          </p>
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #ebebeb',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#222',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#000'}
            onMouseLeave={(e) => e.target.style.background = '#222'}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default UniversalModal;
