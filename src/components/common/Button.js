import React from 'react';
import './Button.css';

/**
 * Reusable Button Component
 * Single source of truth for button styling across the application
 */

const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && 'btn-full',
    loading && 'btn-loading',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <i className="fas fa-spinner fa-spin"></i>
          <span>{typeof children === 'string' ? children : 'Loading...'}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <i className={`fas ${icon}`}></i>}
          {children}
          {icon && iconPosition === 'right' && <i className={`fas ${icon}`}></i>}
        </>
      )}
    </button>
  );
};

/**
 * Icon Button - For icon-only buttons
 */
export const IconButton = ({
  icon,
  onClick,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  title,
  className = '',
  ...props
}) => (
  <button
    type="button"
    className={`icon-btn icon-btn-${variant} icon-btn-${size} ${className}`}
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    {...props}
  >
    <i className={`fas ${icon}`}></i>
  </button>
);

/**
 * Button Group - For grouping related buttons
 */
export const ButtonGroup = ({ children, className = '' }) => (
  <div className={`btn-group ${className}`}>
    {children}
  </div>
);

/**
 * Action Buttons - Common pattern for form actions
 */
export const ActionButtons = ({
  onSave,
  onCancel,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  saving = false,
  disabled = false,
  className = ''
}) => (
  <div className={`action-buttons ${className}`}>
    <Button variant="secondary" onClick={onCancel} disabled={saving}>
      {cancelLabel}
    </Button>
    <Button 
      variant="primary" 
      onClick={onSave} 
      loading={saving}
      disabled={disabled}
    >
      {saveLabel}
    </Button>
  </div>
);

export default Button;
