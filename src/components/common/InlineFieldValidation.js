import React from 'react';

/**
 * InlineFieldValidation - Reusable component for inline field validation
 * Use this component across the app for consistent validation styling
 * 
 * Usage:
 * <InlineFieldValidation 
 *   errors={fieldErrors} 
 *   onClearError={(field) => setFieldErrors(prev => ({ ...prev, [field]: null }))}
 * />
 * 
 * For individual field error:
 * <InlineFieldValidation.FieldError error={fieldErrors.fieldName} />
 * 
 * For input wrapper with error styling:
 * <InlineFieldValidation.InputWrapper error={fieldErrors.fieldName}>
 *   <input ... />
 * </InlineFieldValidation.InputWrapper>
 */

// Error summary banner - shows all errors at top of form
export const ValidationErrorBanner = ({ errors, style = {} }) => {
  const errorList = Object.entries(errors || {}).filter(([_, v]) => v);
  
  if (errorList.length === 0) return null;
  
  return (
    <div style={{
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '20px',
      ...style
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <i className="fas fa-exclamation-circle" style={{ color: '#dc2626' }}></i>
        <span style={{ fontWeight: 600, color: '#dc2626' }}>Please fix the following errors:</span>
      </div>
      <ul style={{ margin: 0, paddingLeft: '24px', color: '#b91c1c', fontSize: '0.9rem' }}>
        {errorList.map(([field, error], idx) => (
          <li key={field || idx} style={{ marginBottom: '4px' }}>{error}</li>
        ))}
      </ul>
    </div>
  );
};

// Individual field error message
export const FieldError = ({ error, style = {} }) => {
  if (!error) return null;
  
  return (
    <span style={{ 
      color: '#dc2626', 
      fontSize: '0.8rem', 
      marginTop: '4px', 
      display: 'block',
      ...style 
    }}>
      {error}
    </span>
  );
};

// Get error styling for input fields
export const getErrorStyle = (hasError) => {
  if (!hasError) return {};
  return {
    borderColor: '#dc2626',
    boxShadow: '0 0 0 1px #dc2626'
  };
};

// Required field indicator
export const RequiredIndicator = () => (
  <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>
);

// Input wrapper that applies error styling
export const InputWrapper = ({ children, error, className = '' }) => {
  return (
    <div className={`inline-validation-wrapper ${error ? 'has-error' : ''} ${className}`}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && (child.type === 'input' || child.type === 'select' || child.type === 'textarea')) {
          return React.cloneElement(child, {
            style: {
              ...child.props.style,
              ...(error ? getErrorStyle(true) : {})
            }
          });
        }
        return child;
      })}
      <FieldError error={error} />
    </div>
  );
};

// Hook for managing field errors
export const useFieldValidation = (initialErrors = {}) => {
  const [fieldErrors, setFieldErrors] = React.useState(initialErrors);
  
  const setError = (field, message) => {
    setFieldErrors(prev => ({ ...prev, [field]: message }));
  };
  
  const clearError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: null }));
  };
  
  const clearAllErrors = () => {
    setFieldErrors({});
  };
  
  const hasErrors = () => {
    return Object.values(fieldErrors).some(v => v);
  };
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return {
    fieldErrors,
    setFieldErrors,
    setError,
    clearError,
    clearAllErrors,
    hasErrors,
    scrollToTop,
    getErrorStyle: (field) => getErrorStyle(!!fieldErrors[field])
  };
};

// Main component that combines all features
const InlineFieldValidation = {
  Banner: ValidationErrorBanner,
  FieldError,
  InputWrapper,
  RequiredIndicator,
  getErrorStyle,
  useFieldValidation
};

export default InlineFieldValidation;
