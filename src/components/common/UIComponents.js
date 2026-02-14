/**
 * Shared UI Components for Planbeau
 * Reusable UI components for consistent styling across the entire app
 */

import React from 'react';
import './UIComponents.css';

// ============================================================
// BUTTONS
// ============================================================

/**
 * Primary Button - Main action buttons
 */
export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => (
  <button
    type={type}
    className={`ui-btn ui-btn-${variant} ui-btn-${size} ${fullWidth ? 'full-width' : ''} ${loading ? 'loading' : ''} ${className}`}
    onClick={onClick}
    disabled={disabled || loading}
    {...props}
  >
    {loading && <i className="fas fa-spinner fa-spin"></i>}
    {!loading && icon && iconPosition === 'left' && <i className={`fas ${icon}`}></i>}
    {children && <span>{children}</span>}
    {!loading && icon && iconPosition === 'right' && <i className={`fas ${icon}`}></i>}
  </button>
);

/**
 * Icon Button - Buttons with just an icon
 */
export const IconButton = ({ 
  icon, 
  onClick, 
  variant = 'ghost',
  size = 'medium',
  title,
  disabled = false,
  className = '',
  ...props
}) => (
  <button
    className={`ui-icon-btn ui-icon-btn-${variant} ui-icon-btn-${size} ${className}`}
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
 * Button Group - Group of buttons
 */
export const ButtonGroup = ({ children, className = '' }) => (
  <div className={`ui-btn-group ${className}`}>
    {children}
  </div>
);

// ============================================================
// ACTION BUTTONS - Universal Edit/Delete/View buttons
// ============================================================

/**
 * ActionButton - Universal action button (edit, delete, view, etc.)
 * Uses the global .action-btn styles from index.css
 * 
 * @param {string} action - 'edit' | 'delete' | 'view' | 'add' | 'approve' | 'reject' | 'suspend' | 'activate'
 * @param {function} onClick - Click handler
 * @param {string} title - Tooltip text
 * @param {boolean} disabled - Disabled state
 * @param {string} className - Additional classes
 */
export const ActionButton = ({ 
  action = 'view',
  onClick, 
  title,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  const iconMap = {
    edit: 'fa-pen',
    delete: 'fa-trash-alt',
    view: 'fa-eye',
    add: 'fa-plus',
    approve: 'fa-check',
    reject: 'fa-times',
    suspend: 'fa-ban',
    activate: 'fa-check-circle',
    flag: 'fa-flag',
    password: 'fa-key',
    analytics: 'fa-chart-line',
    services: 'fa-concierge-bell',
    refund: 'fa-undo',
    activity: 'fa-history'
  };

  const titleMap = {
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    add: 'Add',
    approve: 'Approve',
    reject: 'Reject',
    suspend: 'Suspend',
    activate: 'Activate',
    flag: 'Flag',
    password: 'Reset Password',
    analytics: 'Analytics',
    services: 'Services',
    refund: 'Refund',
    activity: 'Activity'
  };

  return (
    <button
      type="button"
      className={`action-btn action-btn-${action} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title || titleMap[action]}
      aria-label={title || titleMap[action]}
      {...props}
    >
      <i className={`fas ${iconMap[action] || 'fa-ellipsis-h'}`}></i>
      {children}
    </button>
  );
};

/**
 * ActionButtonGroup - Container for action buttons
 */
export const ActionButtonGroup = ({ children, className = '' }) => (
  <div className={`action-btn-group ${className}`}>
    {children}
  </div>
);

/**
 * EditButton - Shorthand for edit action button
 */
export const EditButton = (props) => <ActionButton action="edit" {...props} />;

/**
 * DeleteButton - Shorthand for delete action button
 */
export const DeleteButton = (props) => <ActionButton action="delete" {...props} />;

/**
 * ViewButton - Shorthand for view action button
 */
export const ViewButton = (props) => <ActionButton action="view" {...props} />;

// ============================================================
// LOADING & EMPTY STATES
// ============================================================

/**
 * Loading Spinner
 */
export const Spinner = ({ size = 'medium', className = '' }) => (
  <div className={`ui-spinner ui-spinner-${size} ${className}`}>
    <div className="spinner-circle"></div>
  </div>
);

/**
 * Loading State with message
 */
export const LoadingState = ({ message = 'Loading...', size = 'medium' }) => (
  <div className={`ui-loading-state ui-loading-${size}`}>
    <Spinner size={size} />
    <p>{message}</p>
  </div>
);

/**
 * Empty State
 */
export const EmptyState = ({ 
  icon = 'fa-inbox', 
  title = 'No data found', 
  message = '',
  action = null,
  size = 'medium'
}) => (
  <div className={`ui-empty-state ui-empty-${size}`}>
    <div className="empty-icon">
      <i className={`fas ${icon}`}></i>
    </div>
    <h3>{title}</h3>
    {message && <p>{message}</p>}
    {action && <div className="empty-action">{action}</div>}
  </div>
);

// ============================================================
// BADGES & TAGS
// ============================================================

/**
 * Badge Component
 */
export const Badge = ({ 
  children, 
  variant = 'default',
  size = 'medium',
  dot = false,
  className = ''
}) => (
  <span className={`ui-badge ui-badge-${variant} ui-badge-${size} ${dot ? 'dot' : ''} ${className}`}>
    {!dot && children}
  </span>
);

/**
 * Status Badge with automatic color mapping
 */
export const StatusBadge = ({ status, size = 'medium' }) => {
  const statusColors = {
    active: 'success',
    approved: 'success',
    completed: 'success',
    confirmed: 'success',
    paid: 'success',
    visible: 'success',
    online: 'success',
    pending: 'warning',
    processing: 'warning',
    in_progress: 'warning',
    awaiting: 'warning',
    inactive: 'neutral',
    hidden: 'neutral',
    offline: 'neutral',
    draft: 'neutral',
    rejected: 'danger',
    cancelled: 'danger',
    failed: 'danger',
    suspended: 'danger',
    error: 'danger',
    refunded: 'info',
    disputed: 'info',
    new: 'info'
  };

  const variant = statusColors[status?.toLowerCase()] || 'default';
  const displayStatus = status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return <Badge variant={variant} size={size}>{displayStatus}</Badge>;
};

/**
 * Tag Component
 */
export const Tag = ({ 
  children, 
  icon,
  onRemove,
  variant = 'default',
  className = ''
}) => (
  <span className={`ui-tag ui-tag-${variant} ${className}`}>
    {icon && <i className={`fas ${icon}`}></i>}
    <span>{children}</span>
    {onRemove && (
      <button className="tag-remove" onClick={onRemove} aria-label="Remove">
        <i className="fas fa-times"></i>
      </button>
    )}
  </span>
);

// ============================================================
// CARDS
// ============================================================

/**
 * Card Component
 */
export const Card = ({ 
  children, 
  title,
  subtitle,
  icon,
  actions,
  footer,
  variant = 'default',
  padding = 'medium',
  className = '',
  onClick,
  ...props
}) => (
  <div 
    className={`ui-card ui-card-${variant} ui-card-padding-${padding} ${onClick ? 'clickable' : ''} ${className}`}
    onClick={onClick}
    {...props}
  >
    {(title || actions) && (
      <div className="card-header">
        <div className="card-title-section">
          {icon && <i className={`fas ${icon} card-icon`}></i>}
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="card-actions">{actions}</div>}
      </div>
    )}
    <div className="card-body">{children}</div>
    {footer && <div className="card-footer">{footer}</div>}
  </div>
);

/**
 * Stats Card
 */
export const StatsCard = ({ 
  icon, 
  value, 
  label, 
  trend,
  variant = 'default',
  className = ''
}) => (
  <div className={`ui-stats-card ui-stats-${variant} ${className}`}>
    {icon && (
      <div className="stats-icon">
        <i className={`fas ${icon}`}></i>
      </div>
    )}
    <div className="stats-content">
      <div className="stats-value">{value}</div>
      <div className="stats-label">{label}</div>
      {trend && (
        <div className={`stats-trend ${trend.direction}`}>
          <i className={`fas fa-arrow-${trend.direction === 'up' ? 'up' : 'down'}`}></i>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  </div>
);

// ============================================================
// FORM ELEMENTS
// ============================================================

/**
 * Form Group
 */
export const FormGroup = ({ 
  label, 
  htmlFor,
  required = false,
  error,
  hint,
  children,
  className = ''
}) => (
  <div className={`ui-form-group ${error ? 'has-error' : ''} ${className}`}>
    {label && (
      <label htmlFor={htmlFor} className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
    )}
    {children}
    {hint && !error && <span className="form-hint">{hint}</span>}
    {error && <span className="form-error">{error}</span>}
  </div>
);

/**
 * Input Component
 */
export const Input = ({ 
  type = 'text',
  icon,
  error,
  size = 'medium',
  fullWidth = true,
  className = '',
  ...props
}) => (
  <div className={`ui-input-wrapper ${icon ? 'has-icon' : ''} ${error ? 'has-error' : ''} ${fullWidth ? 'full-width' : ''}`}>
    {icon && <i className={`fas ${icon} input-icon`}></i>}
    <input
      type={type}
      className={`ui-input ui-input-${size} ${className}`}
      {...props}
    />
  </div>
);

/**
 * Textarea Component
 */
export const Textarea = ({ 
  error,
  size = 'medium',
  fullWidth = true,
  className = '',
  ...props
}) => (
  <textarea
    className={`ui-textarea ui-textarea-${size} ${error ? 'has-error' : ''} ${fullWidth ? 'full-width' : ''} ${className}`}
    {...props}
  />
);

/**
 * Select Component
 */
export const Select = ({ 
  options = [],
  placeholder = 'Select...',
  icon,
  error,
  size = 'medium',
  fullWidth = true,
  className = '',
  ...props
}) => (
  <div className={`ui-select-wrapper ${icon ? 'has-icon' : ''} ${error ? 'has-error' : ''} ${fullWidth ? 'full-width' : ''}`}>
    {icon && <i className={`fas ${icon} select-icon`}></i>}
    <select className={`ui-select ui-select-${size} ${className}`} {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt, idx) => (
        <option key={opt.value || idx} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <i className="fas fa-chevron-down select-arrow"></i>
  </div>
);

// ============================================================
// NAVIGATION
// ============================================================

/**
 * Tab Navigation
 */
export const TabNav = ({ 
  tabs, 
  activeTab, 
  onTabChange,
  variant = 'default',
  className = ''
}) => (
  <div className={`ui-tab-nav ui-tab-nav-${variant} ${className}`}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
        onClick={() => onTabChange(tab.id)}
      >
        {tab.icon && <i className={`fas ${tab.icon}`}></i>}
        <span>{tab.label}</span>
        {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
      </button>
    ))}
  </div>
);

/**
 * Breadcrumb
 */
export const Breadcrumb = ({ items, className = '' }) => (
  <nav className={`ui-breadcrumb ${className}`} aria-label="Breadcrumb">
    <ol>
      {items.map((item, index) => (
        <li key={index} className={index === items.length - 1 ? 'current' : ''}>
          {item.href ? (
            <a href={item.href}>{item.label}</a>
          ) : (
            <span>{item.label}</span>
          )}
          {index < items.length - 1 && <i className="fas fa-chevron-right separator"></i>}
        </li>
      ))}
    </ol>
  </nav>
);

// ============================================================
// LAYOUT
// ============================================================

/**
 * Divider
 */
export const Divider = ({ 
  text, 
  variant = 'horizontal',
  className = ''
}) => (
  <div className={`ui-divider ui-divider-${variant} ${text ? 'with-text' : ''} ${className}`}>
    {text && <span>{text}</span>}
  </div>
);

/**
 * Flex Container
 */
export const Flex = ({ 
  children,
  direction = 'row',
  align = 'center',
  justify = 'flex-start',
  gap = 'medium',
  wrap = false,
  className = '',
  ...props
}) => (
  <div 
    className={`ui-flex ${className}`}
    style={{
      display: 'flex',
      flexDirection: direction,
      alignItems: align,
      justifyContent: justify,
      gap: gap === 'small' ? '8px' : gap === 'medium' ? '16px' : gap === 'large' ? '24px' : gap,
      flexWrap: wrap ? 'wrap' : 'nowrap'
    }}
    {...props}
  >
    {children}
  </div>
);

/**
 * Grid Container
 */
export const Grid = ({ 
  children,
  columns = 3,
  gap = 'medium',
  className = '',
  ...props
}) => (
  <div 
    className={`ui-grid ui-grid-${columns} ${className}`}
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: gap === 'small' ? '12px' : gap === 'medium' ? '20px' : gap === 'large' ? '32px' : gap
    }}
    {...props}
  >
    {children}
  </div>
);

// ============================================================
// TYPOGRAPHY
// ============================================================

/**
 * Heading Component
 */
export const Heading = ({ 
  level = 1, 
  children, 
  className = '',
  ...props
}) => {
  const Tag = `h${level}`;
  return (
    <Tag className={`ui-heading ui-h${level} ${className}`} {...props}>
      {children}
    </Tag>
  );
};

/**
 * Text Component
 */
export const Text = ({ 
  children, 
  size = 'medium',
  weight = 'normal',
  color = 'default',
  align = 'left',
  className = '',
  as: Component = 'p',
  ...props
}) => (
  <Component 
    className={`ui-text ui-text-${size} ui-text-${weight} ui-text-${color} ui-text-${align} ${className}`}
    {...props}
  >
    {children}
  </Component>
);

// ============================================================
// ALERTS & NOTIFICATIONS
// ============================================================

/**
 * Alert Component
 */
export const Alert = ({ 
  children,
  title,
  variant = 'info',
  icon,
  dismissible = false,
  onDismiss,
  className = ''
}) => {
  const defaultIcons = {
    info: 'fa-info-circle',
    success: 'fa-check-circle',
    warning: 'fa-exclamation-triangle',
    danger: 'fa-exclamation-circle'
  };

  return (
    <div className={`ui-alert ui-alert-${variant} ${className}`} role="alert">
      <i className={`fas ${icon || defaultIcons[variant]} alert-icon`}></i>
      <div className="alert-content">
        {title && <strong className="alert-title">{title}</strong>}
        <div className="alert-message">{children}</div>
      </div>
      {dismissible && (
        <button className="alert-dismiss" onClick={onDismiss} aria-label="Dismiss">
          <i className="fas fa-times"></i>
        </button>
      )}
    </div>
  );
};

// ============================================================
// AVATAR
// ============================================================

/**
 * Avatar Component
 */
export const Avatar = ({ 
  src, 
  alt = '',
  name,
  size = 'medium',
  status,
  className = ''
}) => {
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={`ui-avatar ui-avatar-${size} ${className}`}>
      {src ? (
        <img src={src} alt={alt || name} />
      ) : (
        <span className="avatar-initials">{getInitials(name)}</span>
      )}
      {status && <span className={`avatar-status ${status}`}></span>}
    </div>
  );
};

/**
 * Avatar Group
 */
export const AvatarGroup = ({ 
  avatars = [], 
  max = 4,
  size = 'medium',
  className = ''
}) => {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={`ui-avatar-group ${className}`}>
      {visible.map((avatar, idx) => (
        <Avatar key={idx} {...avatar} size={size} />
      ))}
      {remaining > 0 && (
        <div className={`ui-avatar ui-avatar-${size} avatar-more`}>
          <span>+{remaining}</span>
        </div>
      )}
    </div>
  );
};

// ============================================================
// TOOLTIP
// ============================================================

/**
 * Tooltip Wrapper
 */
export const Tooltip = ({ 
  children, 
  content,
  position = 'top',
  className = ''
}) => (
  <div className={`ui-tooltip-wrapper ${className}`}>
    {children}
    <div className={`ui-tooltip ui-tooltip-${position}`}>
      {content}
    </div>
  </div>
);
