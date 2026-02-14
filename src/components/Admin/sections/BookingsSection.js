/**
 * Bookings Section - Admin Dashboard
 * Booking lifecycle and operations management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate, formatCurrency } from '../../../utils/formatUtils';
import { useDebounce } from '../../../hooks/useApi';
import adminApi from '../../../services/adminApi';
import UniversalModal, { FormModal } from '../../UniversalModal';
import { FormTextareaField, FormSelectField, DetailRow, DetailSection } from '../../common/FormComponents';
import { useAlert } from '../../../context/AlertContext';

function BookingsSection() {
  const { showError } = useAlert();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [disputeResolution, setDisputeResolution] = useState('');
  const [disputeAction, setDisputeAction] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter })
      };
      console.log('Fetching bookings with params:', params);
      const data = await adminApi.getBookings(params);
      console.log('Bookings API response:', data);
      // Ensure bookings is always an array
      const bookingsArray = Array.isArray(data?.bookings) ? data.bookings : Array.isArray(data) ? data : [];
      console.log('Bookings array:', bookingsArray.length, 'items');
      setBookings(bookingsArray);
      setTotal(data?.total || bookingsArray.length || 0);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    fetchBookings();
  }, [page, debouncedSearch, statusFilter]);

  const handleRefund = async () => {
    if (!selectedBooking || !refundAmount || !refundReason) return;
    setActionLoading(true);
    try {
      await adminApi.processRefund(
        selectedBooking.BookingID || selectedBooking.id,
        parseFloat(refundAmount),
        refundReason
      );
      setShowRefundModal(false);
      setRefundAmount('');
      setRefundReason('');
      fetchBookings();
    } catch (err) {
      console.error('Error processing refund:', err);
      showError('Failed to process refund: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedBooking || !disputeResolution || !disputeAction) return;
    setActionLoading(true);
    try {
      await adminApi.resolveDispute(
        selectedBooking.BookingID || selectedBooking.id,
        disputeResolution,
        disputeAction
      );
      setShowDisputeModal(false);
      setDisputeResolution('');
      setDisputeAction('');
      fetchBookings();
    } catch (err) {
      console.error('Error resolving dispute:', err);
      showError('Failed to resolve dispute: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await adminApi.exportBookings(statusFilter);
      const contentType = response.headers.get('content-type') || '';
      
      // Check if response is JSON (error) or CSV (success)
      if (contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Export failed');
      }
      
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('No bookings to export');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookings-${statusFilter || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Error exporting bookings:', err);
      showError('Failed to export bookings: ' + (err.message || 'Unknown error'));
    }
  };

  const getStatusBadge = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (['completed', 'paid', 'confirmed'].includes(statusLower)) {
      return <span className="admin-badge admin-badge-success">{status}</span>;
    }
    if (['pending', 'processing', 'awaiting'].includes(statusLower)) {
      return <span className="admin-badge admin-badge-warning">{status}</span>;
    }
    if (['cancelled', 'refunded', 'failed', 'disputed'].includes(statusLower)) {
      return <span className="admin-badge admin-badge-danger">{status}</span>;
    }
    return <span className="admin-badge admin-badge-neutral">{status}</span>;
  };

  const totalPages = Math.ceil(total / limit);

  const renderBookings = () => (
    <>
      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search bookings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="admin-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
          <option value="disputed">Disputed</option>
        </select>
        <button className="admin-btn admin-btn-secondary" onClick={handleExport}>
          <i className="fas fa-download"></i> Export CSV
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Bookings ({total})</h3>
        </div>
        
        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner"></div>
            <p>Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="admin-empty-state">
            <i className="fas fa-calendar-times"></i>
            <h3>No Bookings Found</h3>
            <p>No bookings match your criteria</p>
          </div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Client</th>
                    <th>Vendor</th>
                    <th>Event Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.BookingID || booking.id}>
                      <td>
                        <span style={{ fontWeight: 500 }}>#{booking.BookingID || booking.id}</span>
                      </td>
                      <td>{booking.ClientName || booking.clientName}</td>
                      <td>{booking.VendorName || booking.vendorName}</td>
                      <td>{formatDate(booking.EventDate || booking.eventDate)}</td>
                      <td style={{ fontWeight: 500 }}>{formatCurrency(booking.TotalAmount || booking.totalAmount)}</td>
                      <td>{getStatusBadge(booking.Status || booking.status)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowDetailModal(true);
                            }}
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          {['completed', 'paid', 'confirmed'].includes((booking.Status || booking.status || '').toLowerCase()) && (
                            <button
                              className="admin-btn admin-btn-danger admin-btn-sm"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setRefundAmount(booking.TotalAmount || booking.totalAmount || '');
                                setShowRefundModal(true);
                              }}
                              title="Refund"
                            >
                              <i className="fas fa-undo"></i>
                            </button>
                          )}
                          {(booking.Status || booking.status || '').toLowerCase() === 'disputed' && (
                            <button
                              className="admin-btn admin-btn-primary admin-btn-sm"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowDisputeModal(true);
                              }}
                              title="Resolve Dispute"
                            >
                              <i className="fas fa-gavel"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination">
                <div className="admin-pagination-info">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
                </div>
                <div className="admin-pagination-buttons">
                  <button
                    className="admin-pagination-btn"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 1}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <button
                    className="admin-pagination-btn"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page === totalPages}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="admin-section">
      {/* Bookings Content */}
      {renderBookings()}

      {/* Booking Detail Modal */}
      <UniversalModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Booking Details"
        size="large"
        showFooter={true}
        primaryAction={{ label: 'Close', onClick: () => setShowDetailModal(false) }}
        secondaryAction={false}
      >
        {selectedBooking && (
          <div>
            <DetailSection title="Booking Information">
              <DetailRow label="Booking ID" value={`#${selectedBooking.BookingID || selectedBooking.id}`} />
              <DetailRow label="Status" value={getStatusBadge(selectedBooking.Status || selectedBooking.status)} />
              <DetailRow label="Event Date" value={formatDate(selectedBooking.EventDate || selectedBooking.eventDate)} />
              <DetailRow label="Event Type" value={selectedBooking.EventType || selectedBooking.eventType} />
              <DetailRow label="Created" value={formatDate(selectedBooking.CreatedAt || selectedBooking.createdAt)} />
            </DetailSection>
            <DetailSection title="Client">
              <DetailRow label="Name" value={selectedBooking.ClientName || selectedBooking.clientName} />
              <DetailRow label="Email" value={selectedBooking.ClientEmail || selectedBooking.clientEmail} />
            </DetailSection>
            <DetailSection title="Vendor">
              <DetailRow label="Business" value={selectedBooking.VendorName || selectedBooking.vendorName} />
              <DetailRow label="Email" value={selectedBooking.VendorEmail || selectedBooking.vendorEmail} />
            </DetailSection>
            <DetailSection title="Payment">
              <DetailRow label="Total Amount" value={formatCurrency(selectedBooking.TotalAmount || selectedBooking.totalAmount)} />
              <DetailRow label="Platform Fee" value={formatCurrency(selectedBooking.PlatformFee || selectedBooking.platformFee || 0)} />
              <DetailRow label="Vendor Payout" value={formatCurrency(selectedBooking.VendorPayout || selectedBooking.vendorPayout || 0)} />
            </DetailSection>
          </div>
        )}
      </UniversalModal>

      {/* Refund Modal */}
      <FormModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        title="Mark as Refunded"
        onSave={handleRefund}
        saving={actionLoading}
        saveLabel="Mark as Refunded"
        disabled={!refundAmount || !refundReason}
      >
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400e' }}>
            <i className="fas fa-exclamation-triangle"></i>
            <strong>Important:</strong> Actual refunds must be processed through Stripe Dashboard. This only marks the booking status as refunded for record-keeping.
          </div>
        </div>
        <p style={{ marginBottom: '1rem', color: '#374151' }}>
          Marking refund for booking <strong>#{selectedBooking?.BookingID || selectedBooking?.id}</strong>
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Refund Amount</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', color: '#374151' }}>$</span>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              max={selectedBooking?.TotalAmount || selectedBooking?.totalAmount}
              min="0"
              step="0.01"
              style={{
                flex: 1,
                padding: '0.625rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Max: {formatCurrency(selectedBooking?.TotalAmount || selectedBooking?.totalAmount || 0)}
          </p>
        </div>
        <FormTextareaField
          label="Refund Reason"
          required
          value={refundReason}
          onChange={(e) => setRefundReason(e.target.value)}
          placeholder="Explain the reason for this refund..."
          rows={3}
        />
      </FormModal>

      {/* Dispute Resolution Modal */}
      <FormModal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        title="Resolve Dispute"
        onSave={handleResolveDispute}
        saving={actionLoading}
        saveLabel="Resolve Dispute"
        disabled={!disputeResolution || !disputeAction}
      >
        <p style={{ marginBottom: '1rem', color: '#374151' }}>
          Resolving dispute for booking <strong>#{selectedBooking?.BookingID || selectedBooking?.id}</strong>
        </p>
        <FormSelectField
          label="Resolution Action"
          required
          value={disputeAction}
          onChange={(e) => setDisputeAction(e.target.value)}
          options={[
            { value: 'refund_client', label: 'Full Refund to Client' },
            { value: 'partial_refund', label: 'Partial Refund (50%)' },
            { value: 'favor_vendor', label: 'Favor Vendor (No Refund)' },
            { value: 'split', label: 'Split Decision (50/50)' }
          ]}
          placeholder="Select resolution..."
        />
        <FormTextareaField
          label="Resolution Notes"
          required
          value={disputeResolution}
          onChange={(e) => setDisputeResolution(e.target.value)}
          placeholder="Explain the resolution decision..."
          rows={4}
        />
      </FormModal>
    </div>
  );
}

export default BookingsSection;
