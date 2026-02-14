import React from 'react';
import './FormComponents.css';

/**
 * Reusable Form Components
 * Single source of truth for form elements across the application
 */

/**
 * Form Group - Container for label + input
 */
export const FormGroup = ({ children, className = '' }) => (
  <div className={`form-group ${className}`}>
    {children}
  </div>
);

/**
 * Form Row - Horizontal layout for multiple form groups
 */
export const FormRow = ({ children, columns = 2, className = '' }) => (
  <div className={`form-row form-row-${columns} ${className}`}>
    {children}
  </div>
);

/**
 * Form Label
 */
export const FormLabel = ({ children, required = false, htmlFor, className = '' }) => (
  <label className={`form-label ${className}`} htmlFor={htmlFor}>
    {children}
    {required && <span className="form-required">*</span>}
  </label>
);

/**
 * Form Input - Text, email, password, number, date, time inputs
 */
export const FormInput = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  error,
  className = '',
  id,
  name,
  min,
  max,
  step,
  autoComplete,
  ...props
}) => (
  <div className={`form-input-wrapper ${error ? 'has-error' : ''}`}>
    <input
      type={type}
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      min={min}
      max={max}
      step={step}
      autoComplete={autoComplete}
      className={`form-input ${className}`}
      {...props}
    />
    {error && <span className="form-error">{error}</span>}
  </div>
);

/**
 * Form Select - Dropdown select
 */
export const FormSelect = ({
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  required = false,
  error,
  className = '',
  id,
  name,
  ...props
}) => (
  <div className={`form-input-wrapper ${error ? 'has-error' : ''}`}>
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className={`form-select ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt, idx) => (
        <option key={opt.value ?? idx} value={opt.value ?? opt}>
          {opt.label ?? opt}
        </option>
      ))}
    </select>
    {error && <span className="form-error">{error}</span>}
  </div>
);

/**
 * Form Textarea
 */
export const FormTextarea = ({
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled = false,
  required = false,
  error,
  className = '',
  id,
  name,
  maxLength,
  ...props
}) => (
  <div className={`form-input-wrapper ${error ? 'has-error' : ''}`}>
    <textarea
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      required={required}
      maxLength={maxLength}
      className={`form-textarea ${className}`}
      {...props}
    />
    {maxLength && (
      <span className="form-char-count">
        {(value || '').length}/{maxLength}
      </span>
    )}
    {error && <span className="form-error">{error}</span>}
  </div>
);

/**
 * Form Checkbox
 */
export const FormCheckbox = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  id,
  name,
  ...props
}) => (
  <label className={`form-checkbox ${disabled ? 'disabled' : ''} ${className}`}>
    <input
      type="checkbox"
      id={id}
      name={name}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      {...props}
    />
    <span className="form-checkbox-mark"></span>
    {label && <span className="form-checkbox-label">{label}</span>}
  </label>
);

/**
 * Form Radio Group
 */
export const FormRadioGroup = ({
  name,
  value,
  onChange,
  options = [],
  disabled = false,
  className = '',
  inline = false
}) => (
  <div className={`form-radio-group ${inline ? 'inline' : ''} ${className}`}>
    {options.map((opt, idx) => (
      <label key={opt.value ?? idx} className={`form-radio ${disabled ? 'disabled' : ''}`}>
        <input
          type="radio"
          name={name}
          value={opt.value ?? opt}
          checked={value === (opt.value ?? opt)}
          onChange={onChange}
          disabled={disabled}
        />
        <span className="form-radio-mark"></span>
        <span className="form-radio-label">{opt.label ?? opt}</span>
      </label>
    ))}
  </div>
);

/**
 * Form Section - Groups related form fields with a title
 */
export const FormSection = ({ title, children, className = '' }) => (
  <div className={`form-section ${className}`}>
    {title && <h4 className="form-section-title">{title}</h4>}
    {children}
  </div>
);

/**
 * Detail Row - For displaying label: value pairs
 */
export const DetailRow = ({ label, value, className = '' }) => (
  <div className={`detail-row ${className}`}>
    <span className="detail-label">{label}</span>
    <span className="detail-value">{value || '—'}</span>
  </div>
);

/**
 * Detail Section - Groups related detail rows
 */
export const DetailSection = ({ title, children, className = '' }) => (
  <div className={`detail-section ${className}`}>
    {title && <h4 className="detail-section-title">{title}</h4>}
    {children}
  </div>
);

/**
 * Warning Box - For displaying warnings in forms/modals
 */
export const WarningBox = ({ children, variant = 'warning', icon }) => {
  const icons = {
    warning: 'fa-exclamation-triangle',
    danger: 'fa-exclamation-circle',
    info: 'fa-info-circle',
    success: 'fa-check-circle'
  };

  return (
    <div className={`warning-box warning-box-${variant}`}>
      <i className={`fas ${icon || icons[variant]}`}></i>
      <div className="warning-box-content">{children}</div>
    </div>
  );
};

/**
 * Form Field - Combined label + input with consistent styling
 */
export const FormField = ({
  label,
  required = false,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  hint,
  disabled = false,
  className = '',
  ...props
}) => (
  <div className={`form-field ${className}`}>
    {label && (
      <label className="form-field-label">
        {label}
        {required && <span className="form-required">*</span>}
      </label>
    )}
    <FormInput
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      error={error}
      {...props}
    />
    {hint && !error && <span className="form-hint">{hint}</span>}
  </div>
);

/**
 * Form Select Field - Combined label + select with consistent styling
 */
export const FormSelectField = ({
  label,
  required = false,
  value,
  onChange,
  options,
  placeholder,
  error,
  hint,
  disabled = false,
  className = '',
  ...props
}) => (
  <div className={`form-field ${className}`}>
    {label && (
      <label className="form-field-label">
        {label}
        {required && <span className="form-required">*</span>}
      </label>
    )}
    <FormSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      error={error}
      {...props}
    />
    {hint && !error && <span className="form-hint">{hint}</span>}
  </div>
);

/**
 * Form Textarea Field - Combined label + textarea with consistent styling
 */
export const FormTextareaField = ({
  label,
  required = false,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  error,
  hint,
  disabled = false,
  className = '',
  ...props
}) => (
  <div className={`form-field ${className}`}>
    {label && (
      <label className="form-field-label">
        {label}
        {required && <span className="form-required">*</span>}
      </label>
    )}
    <FormTextarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      disabled={disabled}
      required={required}
      error={error}
      {...props}
    />
    {hint && !error && <span className="form-hint">{hint}</span>}
  </div>
);

/**
 * Image Upload Field - For profile photos, logos, etc.
 */
export const ImageUploadField = ({
  label,
  value,
  onChange,
  onRemove,
  accept = 'image/*',
  placeholder = 'Upload Image',
  previewSize = 100,
  disabled = false,
  loading = false,
  className = ''
}) => (
  <div className={`image-upload-field ${className}`}>
    {label && <label className="form-field-label">{label}</label>}
    <div className="image-upload-container">
      <div 
        className="image-upload-preview"
        style={{ width: previewSize, height: previewSize }}
      >
        {value ? (
          <img src={value} alt="Preview" />
        ) : (
          <i className="fas fa-image"></i>
        )}
      </div>
      <div className="image-upload-actions">
        <label className={`image-upload-btn ${disabled || loading ? 'disabled' : ''}`}>
          <input
            type="file"
            accept={accept}
            onChange={onChange}
            disabled={disabled || loading}
            style={{ display: 'none' }}
          />
          {loading ? 'Uploading...' : placeholder}
        </label>
        {value && onRemove && (
          <button 
            type="button" 
            className="image-upload-remove"
            onClick={onRemove}
            disabled={disabled}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  </div>
);

/**
 * Toggle Switch - For boolean settings
 */
export const ToggleSwitch = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = ''
}) => (
  <label className={`toggle-switch ${disabled ? 'disabled' : ''} ${className}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
    <span className="toggle-switch-slider"></span>
    {label && <span className="toggle-switch-label">{label}</span>}
  </label>
);

/**
 * Price Input - For currency inputs with formatting
 */
export const PriceInput = ({
  value,
  onChange,
  placeholder = '0.00',
  currency = '$',
  disabled = false,
  className = '',
  ...props
}) => (
  <div className={`price-input ${className}`}>
    <span className="price-input-currency">{currency}</span>
    <input
      type="number"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      min="0"
      step="0.01"
      className="price-input-field"
      {...props}
    />
  </div>
);
