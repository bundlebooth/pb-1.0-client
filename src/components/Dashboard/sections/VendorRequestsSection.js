import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { apiGet, apiPost } from '../../../utils/api';
import { showBanner } from '../../../utils/banners';
import { buildInvoiceUrl } from '../../../utils/urlHelpers';
import { getBookingStatusConfig, isEventPast } from '../../../utils/bookingStatus';
import { decodeBookingId, isPublicId } from '../../../utils/hashIds';
import BookingDetailsModal from '../BookingDetailsModal';
import BookingCard from '../BookingCard';

function VendorRequestsSection({ deepLinkBookingId, onDeepLinkHandled }) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorProfileId, setVendorProfileId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sortBy, setSortBy] = useState('eventDate'); // 'eventDate', 'requestedOn', 'client'
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [processingAction, setProcessingAction] = useState(null); // Track which button is processing: 'approve-{id}' or 'decline-{id}'
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});

  // Fetch vendor profile ID first
  useEffect(() => {
    getVendorProfileId();
  }, [currentUser]);

  // Load bookings when vendorProfileId is available
  useEffect(() => {
    if (vendorProfileId) {
      loadBookings();
    }
  }, [vendorProfileId]);

  const getVendorProfileId = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    
    // First check if vendorProfileId is already on currentUser
    if (currentUser?.vendorProfileId) {
      setVendorProfileId(currentUser.vendorProfileId);
      return;
    }
    
    try {
      const response = await apiGet(`/vendors/profile?userId=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setVendorProfileId(data.vendorProfileId);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error getting vendor profile:', error);
      setLoading(false);
    }
  };

  const loadBookings = useCallback(async () => {
    if (!vendorProfileId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const resp = await apiGet(`/vendor/${vendorProfileId}/bookings/all`);
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ message: 'Unknown error' }));
        console.error('API Error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch bookings');
      }
      
      const data = await resp.json();
      const bookings = Array.isArray(data) ? data : [];
      
      // Status is now unified from backend - just normalize to lowercase for consistency
      const normalized = bookings.map(b => ({ 
        ...b, 
        _status: ((b.Status || '').toString().toLowerCase()),
        _statusCategory: (b.StatusCategory || '').toString().toLowerCase(),
        _statusLabel: b.StatusLabel || b.Status || 'Unknown'
      }));
      
      setAllBookings(normalized);
    } catch (error) {
      console.error('Error loading vendor bookings:', error);
      setAllBookings([]);
    } finally {
      setLoading(false);
    }
  }, [vendorProfileId]);

  // Handle deep link - auto-open booking details when deepLinkBookingId is provided
  useEffect(() => {
    if (deepLinkBookingId && allBookings.length > 0 && !loading) {
      // Decode the booking ID if it's a public hash ID
      let targetId = deepLinkBookingId;
      if (isPublicId(deepLinkBookingId)) {
        const decoded = decodeBookingId(deepLinkBookingId);
        if (decoded) {
          targetId = decoded;
        }
      }
      
      // Find the booking by ID (could be BookingID, RequestID, or public ID)
      const booking = allBookings.find(b => 
        String(b.BookingID) === String(targetId) || 
        String(b.RequestID) === String(targetId) ||
        String(b.bookingPublicId) === String(deepLinkBookingId)
      );
      
      if (booking) {
        // Auto-expand the booking card
        const itemId = booking.RequestID || booking.BookingID;
        setExpandedCards(prev => ({ ...prev, [itemId]: true }));
        
        // Open the details modal
        setSelectedBooking(booking);
        setShowDetailsModal(true);
        
        // Scroll to the booking card
        setTimeout(() => {
          const element = document.getElementById(`booking-card-${itemId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } else {
        // Booking not found - show error message
        showBanner('The booking you are looking for was not found. It may have been cancelled, expired, or you may not have access to view it.', 'error');
      }
      
      // Clear the deep link after handling
      if (onDeepLinkHandled) {
        onDeepLinkHandled();
      }
    }
  }, [deepLinkBookingId, allBookings, loading, onDeepLinkHandled]);

  // Sort bookings based on selected sort option
  const sortBookings = (bookings) => {
    const sorted = [...bookings];
    switch (sortBy) {
      case 'eventDate':
        sorted.sort((a, b) => new Date(b.EventDate || 0) - new Date(a.EventDate || 0));
        break;
      case 'requestedOn':
        sorted.sort((a, b) => new Date(b.CreatedAt || 0) - new Date(a.CreatedAt || 0));
        break;
      case 'client':
        sorted.sort((a, b) => (a.ClientName || '').localeCompare(b.ClientName || ''));
        break;
      default:
        sorted.sort((a, b) => new Date(b.EventDate || 0) - new Date(a.EventDate || 0));
    }
    return sorted;
  };

  // isEventPast is now imported from bookingStatus.js utility

  const getFilteredBookings = () => {
    // Use StatusCategory from backend for consistent filtering
    // StatusCategory values: 'pending', 'upcoming', 'completed', 'cancelled', 'declined', 'expired'
    let filtered;
    if (activeTab === 'all') {
      filtered = allBookings;
    } else if (activeTab === 'pending') {
      filtered = allBookings.filter(b => b._statusCategory === 'pending');
    } else if (activeTab === 'approved') {
      // 'approved' tab shows upcoming bookings (approved or paid, event not passed)
      filtered = allBookings.filter(b => b._statusCategory === 'upcoming');
    } else if (activeTab === 'completed') {
      filtered = allBookings.filter(b => b._statusCategory === 'completed');
    } else if (activeTab === 'cancelled') {
      filtered = allBookings.filter(b => b._statusCategory === 'cancelled');
    } else if (activeTab === 'declined') {
      filtered = allBookings.filter(b => b._statusCategory === 'declined');
    } else {
      filtered = allBookings;
    }
    
    return sortBookings(filtered);
  };

  // Get detailed status label for vendor view - uses shared utility
  const getDetailedStatus = (booking) => {
    return getBookingStatusConfig(booking, true); // true = vendor view
  };

  const handleShowDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedBooking(null);
  };

  const handleApproveRequest = async (bookingId) => {
    setProcessingAction(`approve-${bookingId}`);
    try {
      const response = await apiPost(`/bookings/requests/${bookingId}/approve`, { vendorProfileId });
      
      if (response.ok) {
        // Update the booking status locally without full reload
        setAllBookings(prev => prev.map(b => 
          b.BookingID === bookingId ? { ...b, _status: 'approved', _statusCategory: 'upcoming', Status: 'approved' } : b
        ));
        showBanner('Request approved successfully', 'success');
      } else {
        const data = await response.json();
        showBanner(data.message || 'Failed to approve request', 'error');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      showBanner('Failed to approve request', 'error');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDeclineRequest = async (bookingId) => {
    setProcessingAction(`decline-${bookingId}`);
    try {
      const response = await apiPost(`/bookings/requests/${bookingId}/decline`, { vendorProfileId });
      
      if (response.ok) {
        // Update the booking status locally without full reload
        setAllBookings(prev => prev.map(b => 
          b.BookingID === bookingId ? { ...b, _status: 'declined', _statusCategory: 'declined', Status: 'declined' } : b
        ));
        showBanner('Request declined', 'info');
      } else {
        const data = await response.json();
        showBanner(data.message || 'Failed to decline request', 'error');
      }
    } catch (error) {
      console.error('Error declining request:', error);
      showBanner('Failed to decline request', 'error');
    } finally {
      setProcessingAction(null);
    }
  };

  // Handle Vendor Cancel Booking - full refund to client
  const handleCancelBooking = (booking) => {
    const bookingId = booking.BookingID || booking.RequestID;
    if (!bookingId) {
      showBanner('Unable to cancel: Booking ID not found', 'error');
      return;
    }
    setCancellingBooking({ ...booking, _resolvedBookingId: bookingId });
    setShowCancelModal(true);
    setCancelReason('');
  };

  const confirmCancelBooking = async () => {
    if (!cancellingBooking) return;
    
    const bookingId = cancellingBooking._resolvedBookingId;
    if (!bookingId) {
      showBanner('Unable to cancel: Booking ID not found', 'error');
      return;
    }
    
    setCancelling(true);
    try {
      const response = await apiPost(`/bookings/${bookingId}/vendor-cancel`, { reason: cancelReason, vendorProfileId });

      if (response.ok) {
        const data = await response.json();
        showBanner('Booking cancelled. Full refund issued to client.', 'success');
        setShowCancelModal(false);
        setCancellingBooking(null);
        loadBookings();
      } else {
        const error = await response.json();
        showBanner(error.message || 'Failed to cancel booking', 'error');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      showBanner('Failed to cancel booking', 'error');
    } finally {
      setCancelling(false);
    }
  };

  // Handle View Invoice - uses public IDs
  const handleViewInvoice = async (booking) => {
    try {
      if (!currentUser?.id) {
        showBanner('Please log in to view invoice', 'error');
        return;
      }
      
      const bookingId = booking.bookingPublicId || booking.BookingID;
      const response = await apiGet(`/invoices/booking/${bookingId}?userId=${currentUser.id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.invoice?.InvoiceID) {
          window.open(buildInvoiceUrl(data.invoice.InvoiceID, false), '_blank');
        } else {
          showBanner('Invoice not available yet', 'info');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        showBanner(errorData.message || 'Could not load invoice', 'error');
      }
    } catch (error) {
      console.error('Invoice error:', error);
      showBanner('Failed to load invoice', 'error');
    }
  };

  // Handle Chat - navigate to Messages section and open conversation
  const handleOpenChat = async (booking) => {
    // If no conversation exists, create one first
    if (!booking.ConversationID) {
      try {
        const response = await apiPost('/messages/conversations', {
          userId: currentUser.id,
          vendorProfileId: vendorProfileId,
          clientUserId: booking.ClientUserID,
          subject: `Booking: ${booking.EventName || booking.ServiceName || 'Service Request'}`,
          bookingId: booking.BookingID || booking.RequestID
        });
        
        if (!response.ok) {
          showBanner('Could not start conversation', 'error');
          return;
        }
        
        const data = await response.json();
        booking.ConversationID = data.conversationId;
        loadBookings();
      } catch (error) {
        console.error('Error starting conversation:', error);
        showBanner('Could not start conversation', 'error');
        return;
      }
    }
    
    // Navigate to Messages section with conversation ID
    window.dispatchEvent(new CustomEvent('navigateToMessages', { 
      detail: { 
        conversationId: booking.ConversationID,
        otherPartyName: booking.ClientName
      } 
    }));
  };

  const renderBookingItem = (booking) => {
    const itemId = booking.BookingID || booking.RequestID;
    const isExpanded = expandedCards[itemId] || false;
    const s = booking._status || 'pending';
    const isPendingRequest = s === 'pending';
    const isPaid = booking.FullAmountPaid === true || booking.FullAmountPaid === 1 || booking._status === 'paid';
    
    // Custom actions for vendor view with approve/decline buttons
    const customActions = (
      <>
        {isPendingRequest && (
          <>
            <button 
              onClick={() => !processingAction && handleApproveRequest(booking.BookingID)}
              disabled={!!processingAction}
              style={{ padding: '10px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: processingAction ? 'not-allowed' : 'pointer', opacity: processingAction && processingAction !== `approve-${booking.BookingID}` ? 0.6 : 1 }}
            >
              {processingAction === `approve-${booking.BookingID}` ? 'Approving...' : 'Approve'}
            </button>
            <button 
              onClick={() => !processingAction && handleDeclineRequest(booking.BookingID)}
              disabled={!!processingAction}
              style={{ padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: processingAction ? 'not-allowed' : 'pointer', opacity: processingAction && processingAction !== `decline-${booking.BookingID}` ? 0.6 : 1 }}
            >
              {processingAction === `decline-${booking.BookingID}` ? 'Declining...' : 'Decline'}
            </button>
          </>
        )}
        {(s === 'confirmed' || s === 'accepted' || s === 'approved' || s === 'paid') && 
         !isEventPast(booking) && 
         !['cancelled', 'cancelled_by_client', 'cancelled_by_vendor', 'completed'].includes(s) && (
          <button 
            onClick={() => handleCancelBooking(booking)}
            style={{ padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
          >
            Cancel Booking
          </button>
        )}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setOpenActionMenu(openActionMenu === itemId ? null : itemId)}
            style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '13px', background: 'white', color: '#374151', border: '1px solid #d1d5db', cursor: 'pointer' }}
          >
            <i className="fas fa-ellipsis-v"></i>
          </button>
          {openActionMenu === itemId && (
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
              <button
                onClick={() => { handleOpenChat(booking); setOpenActionMenu(null); }}
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'white', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <i className="fas fa-comment" style={{ color: '#6b7280', width: '16px' }}></i>
                Message Client
              </button>
              {isPaid && (
                <button
                  onClick={() => { handleViewInvoice(booking); setOpenActionMenu(null); }}
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
      </>
    );
    
    return (
      <BookingCard
        key={itemId}
        booking={booking}
        isVendorView={true}
        isExpanded={isExpanded}
        onToggleExpand={() => setExpandedCards(prev => ({ ...prev, [itemId]: !prev[itemId] }))}
        showExpandable={true}
        compact={false}
        showActions={true}
        customActions={customActions}
        openActionMenu={openActionMenu}
        setOpenActionMenu={setOpenActionMenu}
      />
    );
  };

  const filteredBookings = getFilteredBookings();

  return (
    <div id="vendor-requests-section">
      <BookingDetailsModal 
        isOpen={showDetailsModal} 
        onClose={handleCloseDetails} 
        booking={selectedBooking}
        isVendorView={true}
      />
      
      {/* Cancel Booking Modal - Vendor gets full refund warning */}
      {showCancelModal && cancellingBooking && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowCancelModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '450px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Cancel Booking</h3>
              <button 
                onClick={() => setShowCancelModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#6b7280' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', marginTop: '0.15rem' }}></i>
                <div>
                  <strong style={{ color: '#991b1b' }}>Are you sure you want to cancel?</strong>
                  <p style={{ margin: '0.5rem 0 0', color: '#991b1b', fontSize: '0.9rem' }}>
                    As the vendor, cancelling this booking will issue a <strong>full refund</strong> to the client.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '0.5rem' }}>
                <strong>Booking:</strong> {cancellingBooking.ServiceName || 'Service'} for {cancellingBooking.ClientName || 'Client'}
              </div>
              {cancellingBooking.EventDate && (
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  <strong>Date:</strong> {new Date(cancellingBooking.EventDate).toLocaleDateString()}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>
                Reason for cancellation
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Let the client know why you're cancelling..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#374151'
                }}
              >
                Keep Booking
              </button>
              <button
                onClick={confirmCancelBooking}
                disabled={cancelling}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  opacity: cancelling ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {cancelling ? (
                  <><i className="fas fa-spinner fa-spin"></i> Cancelling...</>
                ) : (
                  <><i className="fas fa-times"></i> Cancel & Refund</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="dashboard-card">
        <div className="booking-tabs">
          <button 
            className={`booking-tab ${activeTab === 'all' ? 'active' : ''}`} 
            data-tab="all"
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button 
            className={`booking-tab ${activeTab === 'pending' ? 'active' : ''}`} 
            data-tab="pending"
            onClick={() => setActiveTab('pending')}
          >
            Pending
          </button>
          <button 
            className={`booking-tab ${activeTab === 'approved' ? 'active' : ''}`} 
            data-tab="approved"
            onClick={() => setActiveTab('approved')}
          >
            Upcoming
          </button>
          <button 
            className={`booking-tab ${activeTab === 'completed' ? 'active' : ''}`} 
            data-tab="completed"
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
          <button 
            className={`booking-tab ${activeTab === 'cancelled' ? 'active' : ''}`} 
            data-tab="cancelled"
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled
          </button>
          <button 
            className={`booking-tab ${activeTab === 'declined' ? 'active' : ''}`} 
            data-tab="declined"
            onClick={() => setActiveTab('declined')}
          >
            Declined
          </button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : (
          <>
            {/* Sort dropdown - below tabs */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', color: '#374151', background: 'white', cursor: 'pointer' }}
                >
                  <option value="eventDate">Event Date</option>
                  <option value="requestedOn">Requested On</option>
                  <option value="client">Client Name</option>
                </select>
              </div>
            </div>
            <div className="booking-content">
              <div id={`${activeTab}-bookings`} className="booking-tab-content active">
                <div className="booking-count">
                  {filteredBookings.length} {activeTab === 'pending' ? 'requests' : 'bookings'}
                </div>
                <div id={`${activeTab}-bookings-list`}>
                  {filteredBookings.length > 0 ? (
                    filteredBookings.map(renderBookingItem)
                  ) : (
                    <div className="empty-state">No booking requests yet.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default VendorRequestsSection;
