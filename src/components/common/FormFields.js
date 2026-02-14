import React from 'react';

/**
 * Reusable form field components with consistent styling
 * Used across vendor dashboard, become-a-vendor page, etc.
 */

// Two-column layout row for label on left, input on right
export const FormRow = ({ label, description, required, children, style = {} }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    gap: '2rem',
    marginBottom: '1.5rem',
    ...style
  }}>
    <div style={{ flex: '0 0 40%' }}>
      <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>
        {label}
        {required && <span style={{ color: 'red' }}> *</span>}
      </div>
      {description && (
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-light)' }}>
          {description}
        </p>
      )}
    </div>
    <div style={{ flex: '0 0 55%' }}>
      {children}
    </div>
  </div>
);

// Toggle switch component
export const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
  <label style={{ position: 'relative', display: 'inline-block', width: '52px', height: '28px' }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      style={{ opacity: 0, width: 0, height: 0 }}
    />
    <span style={{
      position: 'absolute',
      cursor: disabled ? 'not-allowed' : 'pointer',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: checked ? '#5086E8' : '#d1d5db',
      borderRadius: '28px',
      transition: '0.3s',
      opacity: disabled ? 0.5 : 1
    }}>
      <span style={{
        position: 'absolute',
        height: '22px',
        width: '22px',
        left: checked ? '27px' : '3px',
        bottom: '3px',
        backgroundColor: 'white',
        borderRadius: '50%',
        transition: '0.3s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {checked && (
          <i className="fas fa-check" style={{ fontSize: '0.6rem', color: '#5086E8' }}></i>
        )}
      </span>
    </span>
  </label>
);

// Multi-select dropdown with tags
export const MultiSelectTags = ({ 
  options = [], 
  selectedValues = [], 
  onChange, 
  placeholder = 'Select options...',
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    const newValues = selectedValues.includes(option)
      ? selectedValues.filter(v => v !== option)
      : [...selectedValues, option];
    onChange(newValues);
  };

  const removeOption = (option, e) => {
    e.stopPropagation();
    onChange(selectedValues.filter(v => v !== option));
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <div 
        style={{
          minHeight: '44px',
          padding: '0.5rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: disabled ? '#f9fafb' : 'white',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedValues.length === 0 ? (
          <span style={{ color: 'var(--text-light)', padding: '0.25rem 0.5rem' }}>{placeholder}</span>
        ) : (
          selectedValues.map(opt => (
            <span
              key={opt}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 0.75rem',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#374151'
              }}
            >
              {opt}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => removeOption(opt, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: '#9ca3af',
                    fontSize: '0.875rem',
                    lineHeight: 1,
                    marginLeft: '0.125rem'
                  }}
                >
                  ×
                </button>
              )}
            </span>
          ))
        )}
        <i className="fas fa-chevron-down" style={{ marginLeft: 'auto', color: 'var(--text-light)', fontSize: '0.8rem' }}></i>
      </div>
      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 10,
          maxHeight: '200px',
          overflowY: 'auto',
          marginTop: '4px'
        }}>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => toggleOption(opt)}
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: selectedValues.includes(opt) ? '#f3f4f6' : 'white',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = selectedValues.includes(opt) ? '#f3f4f6' : 'white'}
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(opt)}
                readOnly
                style={{ accentColor: '#5086E8' }}
              />
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Single select dropdown
export const SelectDropdown = ({ 
  options = [], 
  value = '', 
  onChange, 
  placeholder = 'Select an option',
  disabled = false 
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    style={{
      width: '100%',
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      border: '1px solid var(--border)',
      fontSize: '0.95rem',
      background: disabled ? '#f9fafb' : 'white',
      cursor: disabled ? 'not-allowed' : 'pointer'
    }}
  >
    <option value="">{placeholder}</option>
    {options.map(opt => (
      <option key={opt} value={opt}>{opt}</option>
    ))}
  </select>
);

// Text input
export const TextInput = ({ 
  value = '', 
  onChange, 
  placeholder = '',
  type = 'text',
  disabled = false,
  maxWidth = '100%'
}) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    style={{
      width: '100%',
      maxWidth,
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      border: '1px solid var(--border)',
      fontSize: '0.95rem',
      background: disabled ? '#f9fafb' : 'white'
    }}
  />
);

// Textarea
export const TextArea = ({ 
  value = '', 
  onChange, 
  placeholder = '',
  rows = 3,
  disabled = false 
}) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    disabled={disabled}
    style={{
      width: '100%',
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      border: '1px solid var(--border)',
      fontSize: '0.95rem',
      resize: 'vertical',
      background: disabled ? '#f9fafb' : 'white'
    }}
  />
);

// Chip/Tag button for feature selection - matches SelectableTile style exactly
export const ChipButton = ({ 
  selected = false, 
  onClick, 
  children,
  disabled = false,
  showRemove = true
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: '0.5rem 0.75rem',
      borderRadius: '6px',
      border: '1px solid #e5e7eb',
      background: selected ? '#f3f4f6' : 'white',
      color: '#374151',
      fontWeight: 400,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '0.875rem',
      transition: 'all 0.15s ease',
      opacity: disabled ? 0.5 : 1,
      whiteSpace: 'nowrap'
    }}
  >
    {children}
    {selected && showRemove && (
      <span style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1, marginLeft: '0.125rem' }}>×</span>
    )}
  </button>
);

// Legacy PillButton - keeping for backwards compatibility
export const PillButton = ChipButton;

// Section header with optional badge
export const SectionHeader = ({ title, badge, description }) => (
  <div style={{ marginBottom: '1rem' }}>
    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {title}
      {badge !== undefined && badge !== null && (
        <span style={{
          background: 'var(--primary)',
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: '600',
          padding: '2px 8px',
          borderRadius: '12px'
        }}>
          {badge}
        </span>
      )}
    </h3>
    {description && (
      <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', margin: 0 }}>
        {description}
      </p>
    )}
  </div>
);

export default {
  FormRow,
  ToggleSwitch,
  MultiSelectTags,
  SelectDropdown,
  TextInput,
  TextArea,
  PillButton,
  ChipButton,
  SectionHeader
};
