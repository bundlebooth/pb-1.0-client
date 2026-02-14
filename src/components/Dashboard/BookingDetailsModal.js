import React from 'react';
import UniversalModal from '../UniversalModal';
import { getBookingStatusConfig, formatTimeValue } from '../../utils/bookingStatus';
import './BookingDetailsModal.css';

function BookingDetailsModal({ isOpen, onClose, booking, isVendorView = false }) {
  if (!booking) return null;

  // Parse event date
  const eventDate = booking.EventDate ? new Date(booking.EventDate) : null;
  const formattedDate = eventDate ? eventDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : 'TBD';

  // Parse times - use StartTime/EndTime if available
  let timeDisplay = 'TBD';
  if (booking.StartTime) {
    const startFormatted = formatTimeValue(booking.StartTime);
    const endFormatted = booking.EndTime ? formatTimeValue(booking.EndTime) : '';
    timeDisplay = endFormatted ? `${startFormatted} - ${endFormatted}` : startFormatted;
  } else if (eventDate) {
    const startTime = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const endDateTime = new Date(eventDate.getTime() + 90 * 60000);
    const endTime = endDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    timeDisplay = `${startTime} - ${endTime}`;
  }
  
  // Add timezone if available
  if (booking.Timezone || booking.VendorTimezone) {
    timeDisplay += ` (${booking.Timezone || booking.VendorTimezone})`;
  }

  // Parse requested date
  const requestedDate = booking.CreatedAt || booking.RequestedAt;
  const formattedRequestedDate = requestedDate 
    ? new Date(requestedDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }) 
    : 'N/A';

  // Use shared status config - isVendorView is passed as prop
  const statusCfg = getBookingStatusConfig(booking, isVendorView);
  const s = (booking._status || booking.Status || 'pending').toString().toLowerCase();

  // Detail row component for consistency
  const DetailRow = ({ label, value, highlight = false }) => (
    <div className="bdm-detail-row">
      <div className="bdm-detail-label">{label}</div>
      <div className={`bdm-detail-value ${highlight ? 'highlight' : ''}`}>{value}</div>
    </div>
  );

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Booking Details"
      size="medium"
      primaryAction={{ label: 'Close', onClick: onClose }}
      secondaryAction={false}
      footerCentered
    >
      {/* Status Badge */}
      <div className="bdm-status-section">
        <span className={`bdm-status-badge bdm-status-${statusCfg.color}`}>
          <i className={`fas ${statusCfg.icon}`}></i>
          {statusCfg.label}
        </span>
        {s === 'declined' && booking.DeclineReason && (
          <div className="bdm-decline-reason">
            Reason: {booking.DeclineReason}
          </div>
        )}
      </div>

      {/* Details List */}
      <div className="bdm-details-list">
        {(booking.EventName || booking.ServiceName) && (
          <DetailRow label="Event Name" value={booking.EventName || booking.ServiceName} />
        )}
        
        {booking.EventType && (
          <DetailRow label="Event Type" value={booking.EventType} />
        )}
        
        {booking.ServiceName && booking.EventName && (
          <DetailRow label="Service" value={booking.ServiceName} />
        )}
        
        {(booking.ClientName || booking.VendorName) && (
          <DetailRow 
            label={booking.ClientName ? 'Client' : 'Vendor'} 
            value={booking.ClientName || booking.VendorName} 
          />
        )}
        
        {booking.AttendeeCount && (
          <DetailRow label="Attendees" value={`${booking.AttendeeCount} people`} />
        )}
        
        {booking.Location && (
          <DetailRow label="Location" value={booking.Location} />
        )}
        
        <DetailRow label="Date" value={formattedDate} />
        <DetailRow label="Time" value={timeDisplay} />
        
        {booking.TotalAmount != null && booking.TotalAmount !== '' && Number(booking.TotalAmount) > 0 && (
          <DetailRow 
            label="Total Amount" 
            value={`$${Number(booking.TotalAmount).toLocaleString()}`} 
            highlight 
          />
        )}
        
        <DetailRow label="Requested On" value={formattedRequestedDate} />
        
        {booking.SpecialRequests && (
          <DetailRow label="Special Requests" value={booking.SpecialRequests} />
        )}
      </div>
    </UniversalModal>
  );
}

export default BookingDetailsModal;
