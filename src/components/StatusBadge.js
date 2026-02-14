import React from 'react';
import './StatusBadge.css';

/**
 * Universal Status Badge Component
 * Used consistently across bookings, messages, invoices, and dashboard pages
 * 
 * Props:
 * - status: string - The status text to display
 * - type: string - Optional type override for styling (paid, cancelled, pending, confirmed, completed, etc.)
 * - size: string - 'sm', 'md', 'lg' (default: 'md')
 */
const StatusBadge = ({ status, type, size = 'md' }) => {
  const statusLower = (type || status || '').toLowerCase().trim();
  
  // Determine the badge type based on status
  const getBadgeType = () => {
    // Success/Positive statuses
    if (['paid', 'completed', 'confirmed', 'approved', 'active', 'accepted', 'success', 'delivered', 'resolved'].includes(statusLower)) {
      return 'success';
    }
    // Warning/Pending statuses
    if (['pending', 'awaiting', 'processing', 'in_progress', 'in progress', 'review', 'draft', 'scheduled'].includes(statusLower)) {
      return 'warning';
    }
    // Error/Negative statuses
    if (['cancelled', 'canceled', 'rejected', 'failed', 'expired', 'declined', 'refunded', 'disputed'].includes(statusLower)) {
      return 'error';
    }
    // Info statuses
    if (['new', 'sent', 'read', 'viewed', 'open'].includes(statusLower)) {
      return 'info';
    }
    // Default
    return 'default';
  };

  const badgeType = getBadgeType();
  const displayText = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : '';

  return (
    <span className={`status-badge status-badge-${badgeType} status-badge-${size}`}>
      {displayText}
    </span>
  );
};

export default StatusBadge;
