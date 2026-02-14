import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CardRow from './CardRow';
import { encodeUserId, encodeBookingId } from '../../utils/hashIds';

/**
 * Shared BookingCard component for displaying booking information
 * Used in: ClientBookingsSection, VendorRequestsSection, Dashboard, Reviews
 * 
 * Props:
 * - booking: The booking data object
 * - isVendorView: Boolean - true if viewing as vendor (shows client info), false for client view (shows vendor info)
 * - isExpanded: Boolean - whether the card is expanded
 * - onToggleExpand: Function - callback when expand/collapse is clicked
 * - showExpandable: Boolean - whether to show expandable details (default true)
 * - compact: Boolean - whether to show compact version (for dashboard) (default false)
 * - actions: Object - action handlers { onPayNow, onCancel, onApprove, onDecline, onMessage, onViewInvoice }
 * - showActions: Boolean - whether to show action buttons (default true)
 * - customActions: React node - custom action buttons to render instead of default
 */

// Status configuration helper
const getDetailedStatus = (booking, isVendorView = false) => {
  const s = (booking.Status || booking.UnifiedStatus || '').toLowerCase();
  const isPaid = booking.FullAmountPaid === true || booking.FullAmountPaid === 1;
  const isDepositPaid = booking.DepositPaid === true || booking.DepositPaid === 1;
  const eventDate = booking.EventDate ? new Date(booking.EventDate) : null;
  const isEventPast = eventDate && eventDate < new Date();

  if (s === 'cancelled' || s === 'cancelled_by_client' || s === 'cancelled_by_vendor') {
    return { label: 'Cancelled', color: '#ef4444', bg: '#fef2f2' };
  }
  if (s === 'declined') {
    return { label: 'Declined', color: '#ef4444', bg: '#fef2f2' };
  }
  if (s === 'expired') {
    return { label: 'Expired', color: '#6b7280', bg: '#f3f4f6' };
  }
  if (isEventPast && isPaid) {
    return { label: 'Completed', color: '#10b981', bg: '#ecfdf5' };
  }
  if (isPaid) {
    return { label: 'Confirmed & Paid', color: '#10b981', bg: '#ecfdf5' };
  }
  if (isDepositPaid && !isPaid) {
    return { label: 'Deposit Paid', color: '#f59e0b', bg: '#fffbeb' };
  }
  if (s === 'confirmed' || s === 'approved' || s === 'accepted') {
    return { label: 'Awaiting Payment', color: '#5086E8', bg: 'rgba(80, 134, 232, 0.08)' };
  }
  if (s === 'pending') {
    return { label: isVendorView ? 'Pending Approval' : 'Awaiting Vendor Approval', color: '#f59e0b', bg: '#fffbeb' };
  }
  return { label: s || 'Unknown', color: '#6b7280', bg: '#f3f4f6' };
};

// Format time helper
const formatTime = (timeValue) => {
  if (!timeValue) return null;
  if (typeof timeValue === 'string') {
    if (timeValue.includes(':')) {
      const [hours, minutes] = timeValue.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
    }
    return timeValue;
  }
  if (timeValue instanceof Date) {
    return timeValue.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return null;
};

// Check if event is past
const isEventPast = (booking) => {
  const eventDate = booking.EventDate ? new Date(booking.EventDate) : null;
  return eventDate && eventDate < new Date();
};

const BookingCard = ({
  booking,
  isVendorView = false,
  isExpanded = false,
  onToggleExpand,
  showExpandable = true,
  compact = false,
  actions = {},
  showActions = true,
  customActions = null,
  customActionButton = null,
  openActionMenu,
  setOpenActionMenu,
  onCardClick = null
}) => {
  const navigate = useNavigate();
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);

  // Use internal state if external not provided
  const expanded = onToggleExpand ? isExpanded : internalExpanded;
  const toggleExpand = onToggleExpand || (() => setInternalExpanded(!internalExpanded));
  const menuOpen = setOpenActionMenu ? openActionMenu : internalMenuOpen;
  const setMenuOpen = setOpenActionMenu || setInternalMenuOpen;

  // Parse booking data
  const eventDate = booking.EventDate ? new Date(booking.EventDate) : null;
  const s = (booking.Status || booking.UnifiedStatus || '').toLowerCase();
  const isPaid = booking.FullAmountPaid === true || booking.FullAmountPaid === 1;
  const isDepositOnly = (booking.DepositPaid === true || booking.DepositPaid === 1) && !isPaid;
  const statusCfg = getDetailedStatus(booking, isVendorView);

  // Get time string
  let timeStr = '';
  if (eventDate) {
    if (booking.EventTime || booking.StartTime) {
      const startFormatted = formatTime(booking.EventTime || booking.StartTime);
      const endFormatted = formatTime(booking.EventEndTime || booking.EndTime);
      timeStr = startFormatted && endFormatted 
        ? `${startFormatted} - ${endFormatted}` 
        : startFormatted || endFormatted;
    }
  }

  // Item ID for menu tracking
  const itemId = booking.RequestID || booking.BookingID;

  // Profile info (vendor or client depending on view)
  const profileName = isVendorView 
    ? (booking.ClientName || 'Client')
    : (booking.VendorName || 'Vendor');
  const profileInitial = profileName.charAt(0).toUpperCase();
  const profilePic = isVendorView
    ? (booking.ClientProfilePic || booking.ClientProfilePicture || booking.profilePicture || booking.ClientAvatar)
    : (booking.VendorLogoUrl || booking.LogoUrl || booking.logoUrl || booking.VendorProfilePic || booking.VendorLogo);
  const profileId = isVendorView ? booking.UserID : booking.VendorProfileID;

  // Location
  const location = booking.Location || booking.EventLocation;

  // Service name - parse from Services JSON if available
  const getServiceName = () => {
    // First try direct ServiceName field
    if (booking.ServiceName && booking.ServiceName !== 'Service') {
      return booking.ServiceName;
    }
    // Try parsing Services JSON
    if (booking.Services) {
      try {
        const services = typeof booking.Services === 'string' 
          ? JSON.parse(booking.Services) 
          : booking.Services;
        if (Array.isArray(services) && services.length > 0) {
          // Get names of all services/packages
          const names = services.map(s => s.name).filter(Boolean);
          if (names.length > 0) {
            return names.join(', ');
          }
        }
      } catch (e) {
        console.error('Error parsing Services JSON:', e);
      }
    }
    return 'Service';
  };
  const serviceName = getServiceName();

  // Format date for compact display
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dateMonth = eventDate ? monthNames[eventDate.getMonth()] : '';
  const dateDay = eventDate ? eventDate.getDate() : '';
  const dateDayName = eventDate ? dayNames[eventDate.getDay()] : '';

  // Navigate to profile
  const handleViewProfile = () => {
    if (isVendorView) {
      // For vendor view, could navigate to client profile if available
    } else if (profileId) {
      navigate(`/profile/${encodeUserId(profileId)}`);
    }
  };

  // Render profile avatar
  const renderAvatar = (size = 32) => {
    if (profilePic) {
      return (
        <img 
          src={profilePic} 
          alt={profileName}
          style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }}
        />
      );
    }
    return (
      <div style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        borderRadius: '50%', 
        background: '#6b7280', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#fff', 
        fontSize: `${size * 0.44}px`, 
        fontWeight: 600 
      }}>
        {profileInitial}
      </div>
    );
  };

  // Render detail row
  const renderDetailRow = (label, value, options = {}) => {
    if (!value) return null;
    const { isLast = false, underline = false, bold = false } = options;
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', borderBottom: isLast ? 'none' : '1px solid #f3f4f6' }}>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>{label}</span>
        <span style={{ 
          fontSize: '14px', 
          color: '#111', 
          fontWeight: bold ? 600 : 500, 
          textDecoration: underline ? 'underline' : 'none',
          textAlign: 'right',
          maxWidth: '60%'
        }}>{value}</span>
      </div>
    );
  };

  // Compact card (for dashboard)
  if (compact) {
    // Determine navigation based on status and view
    const handleCompactClick = () => {
      // If custom click handler provided, use it instead
      if (onCardClick) {
        onCardClick(booking);
        return;
      }
      
      const bookingId = booking.BookingID || booking.RequestID || booking.BookingRequestId;
      const status = (booking.Status || '').toLowerCase();
      
      // If awaiting payment, navigate to payment page
      if (status === 'awaiting_payment' || status === 'awaiting payment' || status === 'accepted' || status === 'approved') {
        navigate(`/payment/${encodeBookingId(bookingId)}`);
        return;
      }
      
      // Otherwise navigate to bookings section with the item expanded
      const section = isVendorView ? 'vendor-requests' : 'bookings';
      navigate(`/dashboard?section=${section}&itemId=${encodeBookingId(bookingId)}`);
    };
    
    return (
      <div 
        style={{ 
          background: '#fff', 
          borderBottom: '1px solid #e5e7eb',
          cursor: 'pointer'
        }}
        onClick={handleCompactClick}
      >
        <CardRow
          date={eventDate}
          primaryName={profileName}
          serviceName={serviceName}
          location={location}
          badgeLabel={statusCfg.label}
          badgeColor={statusCfg.color}
          isExpanded={false}
          showChevron={true}
        />
      </div>
    );
  }

  // Extra info for time display
  const timeExtraInfo = timeStr ? (
    <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
      <i className="fas fa-clock" style={{ fontSize: '11px', color: '#9ca3af' }}></i>
      <span>{timeStr}{booking.Timezone || booking.TimeZone ? ` (${booking.Timezone || booking.TimeZone})` : ''}</span>
    </div>
  ) : null;

  // Full card with expandable details
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {/* Header Row - Using shared CardRow component */}
      <CardRow
        date={eventDate}
        primaryName={profileName}
        primaryNameClickable={!isVendorView}
        onPrimaryNameClick={handleViewProfile}
        serviceName={serviceName}
        location={location}
        badgeLabel={statusCfg.label}
        badgeColor={statusCfg.color}
        isExpanded={expanded}
        onClick={showExpandable ? toggleExpand : undefined}
        showChevron={showExpandable}
        extraInfo={timeExtraInfo}
      />

      {/* Expanded Details with Animation */}
      {showExpandable && (
        <div style={{ 
          maxHeight: expanded ? '800px' : '0', 
          overflow: 'hidden', 
          transition: 'max-height 0.3s ease-in-out'
        }}>
          <div style={{ padding: '16px', borderTop: '1px solid #e5e5e5' }}>
            {/* Details Table */}
            <div style={{ border: '1px solid #e5e5e5', borderRadius: '6px', overflow: 'hidden', background: '#fff' }}>
              {/* Profile Row with Avatar */}
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #f3f4f6' }}
              >
                <span style={{ fontSize: '14px', color: '#6b7280' }}>{isVendorView ? 'Client' : 'Vendor'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {renderAvatar(32)}
                  {!isVendorView ? (
                    <span 
                      style={{ fontSize: '14px', color: '#5086E8', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleViewProfile(); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleViewProfile(); } }}
                    >
                      {profileName}
                    </span>
                  ) : (
                    <span style={{ fontSize: '14px', color: '#111', fontWeight: 500 }}>{profileName}</span>
                  )}
                </div>
              </div>

              {renderDetailRow('Event Name', booking.EventName)}
              {renderDetailRow('Service', serviceName)}
              {renderDetailRow('Event Type', booking.EventType)}
              {renderDetailRow('Attendees', booking.AttendeeCount ? `${booking.AttendeeCount} people` : null)}
              {renderDetailRow('Location', location)}
              {renderDetailRow('Date', eventDate ? eventDate.toLocaleDateString() : null, { underline: true })}
              {renderDetailRow('Time', timeStr ? `${timeStr}${booking.Timezone || booking.TimeZone ? ` (${booking.Timezone || booking.TimeZone})` : ''}` : null)}
              {renderDetailRow('Total Amount', booking.TotalAmount != null && Number(booking.TotalAmount) > 0 ? `$${Number(booking.TotalAmount).toLocaleString()}` : null, { bold: true })}
              {renderDetailRow('Requested On', (booking.CreatedAt || booking.RequestedAt) ? new Date(booking.CreatedAt || booking.RequestedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null)}
              
              {/* Special Requests */}
              {booking.SpecialRequests && (
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '6px' }}>Special Requests</div>
                  <div style={{ fontSize: '14px', color: '#111' }}>{booking.SpecialRequests}</div>
                </div>
              )}
            </div>

            {/* Decline reason */}
            {s === 'declined' && (booking.DeclineReason || booking.DeclinedReason) && (
              <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '12px', padding: '10px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                <strong>Reason:</strong> {booking.DeclineReason || booking.DeclinedReason}
              </div>
            )}

            {/* Action Buttons */}
            {showActions && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'flex-end', marginTop: '16px' }}>
                {customActions || (
                  <>
                    {/* Vendor-specific actions */}
                    {isVendorView && s === 'pending' && actions.onApprove && (
                      <button 
                        onClick={() => actions.onApprove(booking)}
                        style={{ padding: '10px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Approve
                      </button>
                    )}
                    {isVendorView && s === 'pending' && actions.onDecline && (
                      <button 
                        onClick={() => actions.onDecline(booking)}
                        style={{ padding: '10px 20px', background: '#fff', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                      >
                        Decline
                      </button>
                    )}

                    {/* Client-specific actions */}
                    {!isVendorView && (s === 'confirmed' || s === 'accepted' || s === 'approved') && !isPaid && actions.onPayNow && (
                      <button 
                        onClick={() => actions.onPayNow(booking)}
                        style={{ padding: '10px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {isDepositOnly ? 'Pay Balance' : 'Pay Now'}
                      </button>
                    )}

                    {/* Cancel button (both views) */}
                    {(s === 'pending' || s === 'confirmed' || s === 'accepted' || s === 'approved' || s === 'paid') && 
                     !isEventPast(booking) && 
                     !['cancelled', 'cancelled_by_client', 'cancelled_by_vendor', 'completed'].includes(s) && 
                     actions.onCancel && (
                      <button 
                        onClick={() => actions.onCancel(booking)}
                        style={{ padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                      >
                        Cancel Booking
                      </button>
                    )}

                    {/* Three-dot action menu */}
                    {(actions.onMessage || actions.onViewInvoice) && (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setMenuOpen(menuOpen === itemId ? null : itemId)}
                          style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '13px', background: 'white', color: '#374151', border: '1px solid #d1d5db', cursor: 'pointer' }}
                        >
                          <i className="fas fa-ellipsis-v"></i>
                        </button>
                        {menuOpen === itemId && (
                          <div style={{ 
                            position: 'absolute', 
                            right: 0, 
                            bottom: '100%', 
                            marginBottom: '4px',
                            background: 'white', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '8px', 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
                            zIndex: 1000,
                            minWidth: '150px',
                            overflow: 'hidden'
                          }}>
                            {actions.onMessage && (
                              <button
                                onClick={() => { actions.onMessage(booking); setMenuOpen(null); }}
                                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'white', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                              >
                                <i className="fas fa-comment" style={{ color: '#6b7280', width: '16px' }}></i>
                                Message {isVendorView ? 'Client' : 'Vendor'}
                              </button>
                            )}
                            {isPaid && actions.onViewInvoice && (
                              <button
                                onClick={() => { actions.onViewInvoice(booking); setMenuOpen(null); }}
                                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'white', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151', borderTop: '1px solid #f3f4f6' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                              >
                                <i className="fas fa-file-invoice" style={{ color: '#6b7280', width: '16px' }}></i>
                                View Invoice
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingCard;
