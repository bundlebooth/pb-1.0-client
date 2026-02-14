/**
 * Shared Dashboard Components for Planbeau
 * Reusable UI components for Dashboard panels and sections
 */

import React from 'react';
import { formatDate, formatCurrency, formatRelativeTime } from '../../utils/formatUtils';
import { getStatusColor, formatStatus } from '../../utils/formatUtils';
import './DashboardComponents.css';

// ============================================================
// BOOKING COMPONENTS
// ============================================================

/**
 * Booking Card - Displays booking information in a card format
 */
export const BookingCard = ({
  booking,
  onClick,
  onAction,
  actions = [],
  showVendor = true,
  showClient = false,
  showStatus = true,
  showAmount = true,
  compact = false
}) => {
  const statusColor = getStatusColor(booking.Status || booking.status);
  
  return (
    <div 
      className={`dashboard-booking-card ${compact ? 'compact' : ''} ${onClick ? 'clickable' : ''}`}
      onClick={() => onClick?.(booking)}
    >
      <div className="booking-card-header">
        <div className="booking-info">
          {showVendor && booking.VendorName && (
            <h4 className="booking-vendor">{booking.VendorName}</h4>
          )}
          {showClient && booking.ClientName && (
            <h4 className="booking-client">{booking.ClientName}</h4>
          )}
          <p className="booking-event-type">{booking.EventType || booking.ServiceName || 'Event'}</p>
        </div>
        {showStatus && (
          <span className={`booking-status status-${statusColor}`}>
            {formatStatus(booking.Status || booking.status)}
          </span>
        )}
      </div>
      
      <div className="booking-card-details">
        <div className="booking-detail">
          <i className="fas fa-calendar"></i>
          <span>{formatDate(booking.EventDate || booking.eventDate)}</span>
        </div>
        {booking.EventTime && (
          <div className="booking-detail">
            <i className="fas fa-clock"></i>
            <span>{booking.EventTime}</span>
          </div>
        )}
        {showAmount && (booking.TotalAmount || booking.totalAmount) && (
          <div className="booking-detail">
            <i className="fas fa-dollar-sign"></i>
            <span>{formatCurrency(booking.TotalAmount || booking.totalAmount)}</span>
          </div>
        )}
      </div>
      
      {actions.length > 0 && (
        <div className="booking-card-actions" onClick={e => e.stopPropagation()}>
          {actions.map((action, idx) => (
            <button
              key={idx}
              className={`booking-action-btn ${action.variant || 'default'}`}
              onClick={() => onAction?.(action.id, booking)}
              disabled={action.disabled}
            >
              {action.icon && <i className={`fas ${action.icon}`}></i>}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Booking List - Renders a list of booking cards
 */
export const BookingList = ({
  bookings = [],
  loading = false,
  emptyMessage = 'No bookings found',
  emptyIcon = 'fa-calendar-times',
  onBookingClick,
  onBookingAction,
  bookingActions = [],
  showVendor = true,
  showClient = false
}) => {
  if (loading) {
    return <DashboardLoading message="Loading bookings..." />;
  }
  
  if (bookings.length === 0) {
    return <DashboardEmpty icon={emptyIcon} message={emptyMessage} />;
  }
  
  return (
    <div className="dashboard-booking-list">
      {bookings.map(booking => (
        <BookingCard
          key={booking.BookingID || booking.id}
          booking={booking}
          onClick={onBookingClick}
          onAction={onBookingAction}
          actions={bookingActions}
          showVendor={showVendor}
          showClient={showClient}
        />
      ))}
    </div>
  );
};

// ============================================================
// MESSAGE COMPONENTS
// ============================================================

/**
 * Message Item - Single message in a conversation
 */
export const MessageItem = ({
  message,
  isOwn = false,
  showAvatar = true,
  showTimestamp = true
}) => (
  <div className={`dashboard-message-item ${isOwn ? 'own' : 'other'}`}>
    {showAvatar && !isOwn && (
      <div className="message-avatar">
        {message.SenderAvatar ? (
          <img src={message.SenderAvatar} alt={message.SenderName} />
        ) : (
          <span>{(message.SenderName || '?')[0].toUpperCase()}</span>
        )}
      </div>
    )}
    <div className="message-content">
      <div className="message-bubble">
        {message.Content || message.content || message.message}
      </div>
      {showTimestamp && (
        <span className="message-time">
          {formatRelativeTime(message.SentAt || message.sentAt || message.createdAt)}
        </span>
      )}
    </div>
  </div>
);

/**
 * Conversation Item - Preview of a conversation in list
 */
export const ConversationItem = ({
  conversation,
  isActive = false,
  onClick,
  showUnread = true,
  showOnlineStatus = false,
  isOnline = false
}) => (
  <div 
    className={`dashboard-conversation-item ${isActive ? 'active' : ''}`}
    onClick={() => onClick?.(conversation)}
  >
    <div className="conversation-avatar">
      {conversation.Avatar || conversation.avatar ? (
        <img src={conversation.Avatar || conversation.avatar} alt="" />
      ) : (
        <span>{(conversation.Name || conversation.name || '?')[0].toUpperCase()}</span>
      )}
      {showOnlineStatus && (
        <span className={`online-indicator ${isOnline ? 'online' : 'offline'}`}></span>
      )}
    </div>
    <div className="conversation-info">
      <div className="conversation-header">
        <h4>{conversation.Name || conversation.name || 'Unknown'}</h4>
        <span className="conversation-time">
          {formatRelativeTime(conversation.LastMessageAt || conversation.lastMessageAt)}
        </span>
      </div>
      <p className="conversation-preview">
        {conversation.LastMessage || conversation.lastMessage || 'No messages yet'}
      </p>
    </div>
    {showUnread && (conversation.UnreadCount || conversation.unreadCount) > 0 && (
      <span className="unread-badge">
        {conversation.UnreadCount || conversation.unreadCount}
      </span>
    )}
  </div>
);

// ============================================================
// REVIEW COMPONENTS
// ============================================================

/**
 * Review Card - Displays a review
 */
export const ReviewCard = ({
  review,
  showVendor = false,
  showClient = true,
  onReply,
  showReplyButton = false
}) => (
  <div className="dashboard-review-card">
    <div className="review-header">
      <div className="review-author">
        <div className="author-avatar">
          {review.AuthorAvatar ? (
            <img src={review.AuthorAvatar} alt={review.AuthorName} />
          ) : (
            <span>{(review.AuthorName || '?')[0].toUpperCase()}</span>
          )}
        </div>
        <div className="author-info">
          <h4>{showClient ? review.AuthorName : review.VendorName}</h4>
          <span className="review-date">{formatDate(review.CreatedAt || review.createdAt)}</span>
        </div>
      </div>
      <div className="review-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <i 
            key={star} 
            className={`fas fa-star ${star <= (review.Rating || review.rating) ? 'filled' : ''}`}
          ></i>
        ))}
      </div>
    </div>
    
    {review.Comment || review.comment ? (
      <p className="review-comment">{review.Comment || review.comment}</p>
    ) : null}
    
    {review.Response && (
      <div className="review-response">
        <strong>Response:</strong>
        <p>{review.Response}</p>
      </div>
    )}
    
    {showReplyButton && !review.Response && onReply && (
      <button className="review-reply-btn" onClick={() => onReply(review)}>
        <i className="fas fa-reply"></i> Reply
      </button>
    )}
  </div>
);

/**
 * Star Rating Input
 */
export const StarRating = ({
  value = 0,
  onChange,
  readonly = false,
  size = 'medium'
}) => {
  const [hoverValue, setHoverValue] = React.useState(0);
  
  return (
    <div className={`dashboard-star-rating ${size} ${readonly ? 'readonly' : ''}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <i
          key={star}
          className={`fas fa-star ${star <= (hoverValue || value) ? 'filled' : ''}`}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
        />
      ))}
    </div>
  );
};

// ============================================================
// INVOICE COMPONENTS
// ============================================================

/**
 * Invoice Card - Displays invoice summary
 */
export const InvoiceCard = ({
  invoice,
  onClick,
  onDownload,
  showVendor = true,
  showClient = false
}) => {
  const statusColor = getStatusColor(invoice.Status || invoice.status);
  
  return (
    <div 
      className={`dashboard-invoice-card ${onClick ? 'clickable' : ''}`}
      onClick={() => onClick?.(invoice)}
    >
      <div className="invoice-header">
        <div className="invoice-number">
          <span className="label">Invoice</span>
          <span className="number">#{invoice.InvoiceNumber || invoice.id}</span>
        </div>
        <span className={`invoice-status status-${statusColor}`}>
          {formatStatus(invoice.Status || invoice.status)}
        </span>
      </div>
      
      <div className="invoice-details">
        {showVendor && invoice.VendorName && (
          <div className="invoice-party">
            <span className="label">Vendor</span>
            <span className="value">{invoice.VendorName}</span>
          </div>
        )}
        {showClient && invoice.ClientName && (
          <div className="invoice-party">
            <span className="label">Client</span>
            <span className="value">{invoice.ClientName}</span>
          </div>
        )}
        <div className="invoice-date">
          <span className="label">Date</span>
          <span className="value">{formatDate(invoice.CreatedAt || invoice.createdAt)}</span>
        </div>
      </div>
      
      <div className="invoice-footer">
        <div className="invoice-amount">
          {formatCurrency(invoice.TotalAmount || invoice.totalAmount || invoice.Amount)}
        </div>
        {onDownload && (
          <button 
            className="invoice-download-btn"
            onClick={(e) => { e.stopPropagation(); onDownload(invoice); }}
          >
            <i className="fas fa-download"></i>
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================
// STATS COMPONENTS
// ============================================================

/**
 * Stats Grid - Grid of stat cards
 */
export const StatsGrid = ({ stats = [], columns = 4 }) => (
  <div className={`dashboard-stats-grid cols-${columns}`}>
    {stats.map((stat, idx) => (
      <StatCard key={idx} {...stat} />
    ))}
  </div>
);

/**
 * Stat Card - Single statistic display
 */
export const StatCard = ({
  icon,
  label,
  value,
  trend,
  trendDirection,
  color = 'default'
}) => (
  <div className={`dashboard-stat-card color-${color}`}>
    {icon && (
      <div className="stat-icon">
        <i className={`fas ${icon}`}></i>
      </div>
    )}
    <div className="stat-content">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {trend && (
        <div className={`stat-trend ${trendDirection || 'neutral'}`}>
          {trendDirection === 'up' && <i className="fas fa-arrow-up"></i>}
          {trendDirection === 'down' && <i className="fas fa-arrow-down"></i>}
          {trend}
        </div>
      )}
    </div>
  </div>
);

// ============================================================
// LOADING & EMPTY STATES
// ============================================================

/**
 * Dashboard Loading State
 */
export const DashboardLoading = ({ message = 'Loading...' }) => (
  <div className="dashboard-loading">
    <div className="loading-spinner"></div>
    <p>{message}</p>
  </div>
);

/**
 * Dashboard Empty State
 */
export const DashboardEmpty = ({
  icon = 'fa-inbox',
  title,
  message = 'No data found',
  action
}) => (
  <div className="dashboard-empty">
    <div className="empty-icon">
      <i className={`fas ${icon}`}></i>
    </div>
    {title && <h3>{title}</h3>}
    <p>{message}</p>
    {action && <div className="empty-action">{action}</div>}
  </div>
);

// ============================================================
// TAB & FILTER COMPONENTS
// ============================================================

/**
 * Dashboard Tabs
 */
export const DashboardTabs = ({
  tabs = [],
  activeTab,
  onTabChange,
  variant = 'default'
}) => (
  <div className={`dashboard-tabs ${variant}`}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
        onClick={() => onTabChange(tab.id)}
      >
        {tab.icon && <i className={`fas ${tab.icon}`}></i>}
        <span>{tab.label}</span>
        {tab.count !== undefined && (
          <span className="tab-count">{tab.count}</span>
        )}
      </button>
    ))}
  </div>
);

/**
 * Dashboard Filter Bar
 */
export const DashboardFilterBar = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  sortOptions = [],
  sortValue,
  onSortChange,
  filters = [],
  children
}) => (
  <div className="dashboard-filter-bar">
    {onSearchChange && (
      <div className="filter-search">
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
        />
        {searchValue && (
          <button className="clear-btn" onClick={() => onSearchChange('')}>
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>
    )}
    
    {sortOptions.length > 0 && (
      <div className="filter-sort">
        <select value={sortValue} onChange={e => onSortChange(e.target.value)}>
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    )}
    
    {filters.map((filter, idx) => (
      <div key={idx} className="filter-item">
        {filter}
      </div>
    ))}
    
    {children}
  </div>
);

// ============================================================
// ACTION MENU COMPONENT
// ============================================================

/**
 * Action Menu - Dropdown menu for item actions
 */
export const ActionMenu = ({
  isOpen,
  onToggle,
  actions = [],
  position = 'bottom-right'
}) => (
  <div className="dashboard-action-menu-wrapper">
    <button className="action-menu-trigger" onClick={onToggle}>
      <i className="fas fa-ellipsis-v"></i>
    </button>
    {isOpen && (
      <div className={`action-menu-dropdown ${position}`}>
        {actions.map((action, idx) => (
          <button
            key={idx}
            className={`action-menu-item ${action.variant || ''}`}
            onClick={() => {
              action.onClick?.();
              onToggle();
            }}
            disabled={action.disabled}
          >
            {action.icon && <i className={`fas ${action.icon}`}></i>}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);

// ============================================================
// SECTION HEADER
// ============================================================

/**
 * Dashboard Section Header
 */
export const DashboardSectionHeader = ({
  title,
  subtitle,
  icon,
  actions,
  children
}) => (
  <div className="dashboard-section-header">
    <div className="header-content">
      {icon && <i className={`fas ${icon} header-icon`}></i>}
      <div className="header-text">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
    {(actions || children) && (
      <div className="header-actions">
        {actions}
        {children}
      </div>
    )}
  </div>
);
