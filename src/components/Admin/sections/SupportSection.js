/**
 * Support Section - Admin Dashboard
 * Support tickets and ticketing system
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate, formatRelativeTime } from '../../../utils/formatUtils';
import { useDebounce } from '../../../hooks/useApi';
import adminApi from '../../../services/adminApi';
import UniversalModal from '../../UniversalModal';
import { DetailRow, DetailSection } from '../../common/FormComponents';
import { useAlert } from '../../../context/AlertContext';

function SupportSection() {
  const { showError } = useAlert();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter })
      };
      const data = await adminApi.getSupportTickets(params);
      const ticketsArray = Array.isArray(data?.tickets) ? data.tickets : Array.isArray(data) ? data : [];
      setTickets(ticketsArray);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleViewTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.Status || ticket.status || '');
    setShowTicketModal(true);
    try {
      const data = await adminApi.getTicketMessages(ticket.TicketID || ticket.id);
      setTicketMessages(data.messages || data || []);
    } catch (err) {
      console.error('Error fetching ticket messages:', err);
      setTicketMessages([]);
    }
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      await adminApi.updateTicket(selectedTicket.TicketID || selectedTicket.id, {
        status: newStatus
      });
      fetchTickets();
    } catch (err) {
      console.error('Error updating ticket:', err);
      showError('Failed to update ticket: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyContent) return;
    setActionLoading(true);
    try {
      await adminApi.addTicketMessage(selectedTicket.TicketID || selectedTicket.id, {
        content: replyContent,
        isAdminReply: true
      });
      setReplyContent('');
      const data = await adminApi.getTicketMessages(selectedTicket.TicketID || selectedTicket.id);
      setTicketMessages(data.messages || data || []);
    } catch (err) {
      console.error('Error sending reply:', err);
      showError('Failed to send reply: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high' || p === 'urgent') return <span className="admin-badge admin-badge-danger">{priority}</span>;
    if (p === 'medium') return <span className="admin-badge admin-badge-warning">{priority}</span>;
    return <span className="admin-badge admin-badge-neutral">{priority || 'Normal'}</span>;
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'open' || s === 'new') return <span className="admin-badge admin-badge-info">{status}</span>;
    if (s === 'in_progress' || s === 'pending') return <span className="admin-badge admin-badge-warning">{status}</span>;
    if (s === 'resolved' || s === 'closed') return <span className="admin-badge admin-badge-success">{status}</span>;
    return <span className="admin-badge admin-badge-neutral">{status}</span>;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="admin-section">
      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search tickets..."
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
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          className="admin-filter-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button className="admin-btn admin-btn-secondary" onClick={fetchTickets}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {/* Tickets Card */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Support Tickets ({total})</h3>
        </div>
        
        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner"></div>
            <p>Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="admin-empty-state">
            <i className="fas fa-ticket-alt"></i>
            <h3>No Tickets Found</h3>
            <p>No support tickets match your criteria</p>
          </div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Subject</th>
                    <th>User</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.TicketID || ticket.id}>
                      <td>
                        <span style={{ fontWeight: 500 }}>#{ticket.TicketID || ticket.id}</span>
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ticket.Subject || ticket.subject}
                      </td>
                      <td>{ticket.UserName || ticket.userName || ticket.email}</td>
                      <td>{ticket.Category || ticket.category || '-'}</td>
                      <td>{getPriorityBadge(ticket.Priority || ticket.priority)}</td>
                      <td>{getStatusBadge(ticket.Status || ticket.status)}</td>
                      <td>{formatRelativeTime(ticket.CreatedAt || ticket.createdAt)}</td>
                      <td>
                        <button
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          onClick={() => handleViewTicket(ticket)}
                        >
                          <i className="fas fa-eye"></i> View
                        </button>
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
                  <button className="admin-pagination-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <button className="admin-pagination-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Ticket Detail Modal */}
      <UniversalModal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        title={`Ticket #${selectedTicket?.TicketID || selectedTicket?.id}`}
        size="large"
        showFooter={false}
      >
        {selectedTicket && (
          <div>
            <DetailSection title="Ticket Information">
              <DetailRow label="Subject" value={selectedTicket.Subject || selectedTicket.subject} />
              <DetailRow label="User" value={selectedTicket.UserName || selectedTicket.userName} />
              <DetailRow label="Email" value={selectedTicket.Email || selectedTicket.email} />
              <DetailRow label="Category" value={selectedTicket.Category || selectedTicket.category} />
              <DetailRow label="Priority" value={getPriorityBadge(selectedTicket.Priority || selectedTicket.priority)} />
              <DetailRow label="Created" value={formatDate(selectedTicket.CreatedAt || selectedTicket.createdAt)} />
              {/* Description */}
              {(selectedTicket.Description || selectedTicket.description) && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', color: '#374151' }}>Description</label>
                  <p style={{ margin: 0, color: '#4b5563', whiteSpace: 'pre-wrap' }}>{selectedTicket.Description || selectedTicket.description}</p>
                </div>
              )}
            </DetailSection>

            {/* Attachments Section */}
            {(() => {
              // Parse attachments - could be JSON string or array
              let attachments = [];
              const rawAttachments = selectedTicket.Attachments || selectedTicket.attachments;
              if (rawAttachments) {
                if (typeof rawAttachments === 'string') {
                  try { attachments = JSON.parse(rawAttachments); } catch (e) { attachments = []; }
                } else if (Array.isArray(rawAttachments)) {
                  attachments = rawAttachments;
                }
              }
              
              if (attachments.length === 0) return null;
              
              return (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="fas fa-paperclip" style={{ color: '#6b7280' }}></i>
                    Attachments ({attachments.length})
                  </h4>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '12px',
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    {attachments.map((attachment, idx) => {
                      const url = attachment.url || attachment.URL || attachment;
                      const name = attachment.name || attachment.Name || `Attachment ${idx + 1}`;
                      const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url) || 
                                     (attachment.type && attachment.type.startsWith('image/'));
                      
                      return (
                        <div key={idx} style={{ position: 'relative' }}>
                          {isImage ? (
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ display: 'block' }}
                            >
                              <img 
                                src={url} 
                                alt={name}
                                style={{
                                  width: '120px',
                                  height: '120px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  border: '1px solid #e5e7eb',
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              />
                            </a>
                          ) : (
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '120px',
                                height: '120px',
                                background: '#fff',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                textDecoration: 'none',
                                color: '#374151',
                                transition: 'all 0.2s'
                              }}
                            >
                              <i className="fas fa-file" style={{ fontSize: '2rem', color: '#6b7280', marginBottom: '8px' }}></i>
                              <span style={{ fontSize: '0.75rem', textAlign: 'center', padding: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                {name}
                              </span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Status</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  className="admin-filter-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <button 
                  className="admin-btn admin-btn-primary"
                  onClick={handleUpdateTicket}
                  disabled={actionLoading}
                >
                  Update
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>Messages</h4>
              <div style={{ 
                maxHeight: '250px', 
                overflowY: 'auto', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                padding: '0.5rem'
              }}>
                {ticketMessages.length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '1rem' }}>No messages</p>
                ) : (
                  ticketMessages.map((msg, idx) => (
                    <div 
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        background: msg.IsAdminReply || msg.isAdminReply ? '#e8f0fc' : '#f9fafb',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: '#6b7280', 
                        marginBottom: '0.25rem',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontWeight: 500 }}>
                          {msg.IsAdminReply || msg.isAdminReply ? 'Admin' : (msg.SenderName || msg.senderName || 'User')}
                        </span>
                        <span>{formatRelativeTime(msg.CreatedAt || msg.createdAt)}</span>
                      </div>
                      <div>{msg.Content || msg.content || msg.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 style={{ marginBottom: '0.5rem' }}>Reply</h4>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  resize: 'vertical'
                }}
              />
              <button 
                className="admin-btn admin-btn-primary"
                onClick={handleSendReply}
                disabled={!replyContent || actionLoading}
              >
                {actionLoading ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        )}
      </UniversalModal>
    </div>
  );
}

export default SupportSection;
