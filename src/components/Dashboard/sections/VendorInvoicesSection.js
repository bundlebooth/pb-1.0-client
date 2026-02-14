import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { apiGet } from '../../../utils/api';
import { buildInvoiceUrl } from '../../../utils/urlHelpers';
import { formatDate, normalizeString } from '../../../utils/helpers';
import { useLocalization } from '../../../context/LocalizationContext';

function VendorInvoicesSection() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { formatCurrency } = useLocalization();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [vendorProfileId, setVendorProfileId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Handle view invoice - navigate to invoice page using public IDs
  const handleViewInvoice = (invoice) => {
    const bookingId = invoice.BookingID || invoice.bookingId;
    const invoiceId = invoice.InvoiceID;
    
    if (bookingId) {
      navigate(buildInvoiceUrl(bookingId, true));
    } else if (invoiceId) {
      navigate(buildInvoiceUrl(invoiceId, false));
    }
  };

  // Handle download invoice - open print dialog
  const handleDownloadInvoice = (invoice) => {
    const bookingId = invoice.BookingID || invoice.bookingId;
    const invoiceId = invoice.InvoiceID;
    
    if (bookingId) {
      window.open(`${buildInvoiceUrl(bookingId, true)}?print=1`, '_blank');
    } else if (invoiceId) {
      window.open(`${buildInvoiceUrl(invoiceId, false)}?print=1`, '_blank');
    }
  };

  useEffect(() => {
    getVendorProfileId();
  }, [currentUser]);

  useEffect(() => {
    if (vendorProfileId) {
      loadInvoices();
    }
  }, [vendorProfileId]);

  const getVendorProfileId = async () => {
    if (!currentUser?.id) return;
    try {
      const response = await apiGet(`/vendors/profile?userId=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setVendorProfileId(data.vendorProfileId);
      }
    } catch (error) {
      console.error('Error getting vendor profile:', error);
    }
  };

  const loadInvoices = useCallback(async () => {
    if (!vendorProfileId) return;
    
    try {
      setLoading(true);
      // Primary: fetch invoices directly
      const resp1 = await apiGet(`/invoices/vendor/${vendorProfileId}`);
      
      if (resp1.ok) {
        const data = await resp1.json();
        setInvoices(Array.isArray(data?.invoices) ? data.invoices : []);
      } else {
        // Fallback: legacy bookings-based list
        const resp = await apiGet(`/vendor/${vendorProfileId}/bookings/all`);
        if (resp.ok) {
          const bookings = await resp.json();
          const accepted = (Array.isArray(bookings) ? bookings : []).filter(b => {
            const s = (b.Status || '').toString().toLowerCase();
            return s === 'confirmed' || s === 'paid' || s === 'approved';
          }).sort((a,b) => new Date(b.EventDate) - new Date(a.EventDate));
          setInvoices(accepted);
        } else {
          setInvoices([]);
        }
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [vendorProfileId]);

  const normalize = normalizeString;

  const getFilteredAndSorted = () => {
    let arr = invoices.slice();
    
    // Filter by search
    if (searchTerm) {
      const q = normalize(searchTerm);
      arr = arr.filter(b => {
        const name = b.ClientName || '';
        const status = b.InvoiceStatus || b.Status || '';
        const invNum = b.InvoiceNumber || '';
        const svc = b.ServicesSummary || '';
        const evn = b.EventName || '';
        const typ = b.EventType || '';
        const loc = b.EventLocation || '';
        const tz = b.TimeZone || '';
        const guests = b.AttendeeCount != null ? String(b.AttendeeCount) : '';
        return normalize(name).includes(q) || normalize(status).includes(q) || 
               normalize(invNum).includes(q) || normalize(svc).includes(q) || 
               normalize(evn).includes(q) || normalize(typ).includes(q) || 
               normalize(loc).includes(q) || normalize(tz).includes(q) || 
               normalize(guests).includes(q);
      });
    }
    
    // Sort
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let av, bv;
      if (sortKey === 'date') {
        av = new Date(a.IssueDate || a.EventDate || 0);
        bv = new Date(b.IssueDate || b.EventDate || 0);
      } else if (sortKey === 'amount') {
        av = Number(a.TotalAmount || 0);
        bv = Number(b.TotalAmount || 0);
      } else if (sortKey === 'name') {
        av = normalize(a.ClientName || '');
        bv = normalize(b.ClientName || '');
      } else if (sortKey === 'status') {
        av = normalize(a.InvoiceStatus || a.Status || '');
        bv = normalize(b.InvoiceStatus || b.Status || '');
      } else if (sortKey === 'invoice') {
        av = a.InvoiceNumber || '';
        bv = b.InvoiceNumber || '';
      } else if (sortKey === 'due') {
        av = new Date(a.DueDate || 0);
        bv = new Date(b.DueDate || 0);
      } else if (sortKey === 'service') {
        av = normalize(a.ServicesSummary || a.ServiceName || '');
        bv = normalize(b.ServicesSummary || b.ServiceName || '');
      } else {
        av = new Date(a.IssueDate || a.EventDate || 0);
        bv = new Date(b.IssueDate || b.EventDate || 0);
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    
    return arr;
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filteredInvoices = getFilteredAndSorted();
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <div id="vendor-invoices-section">
        <div className="dashboard-card">
          <div id="vendor-invoices-list">
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div id="vendor-invoices-section">
        <div className="dashboard-card" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          <i className="fas fa-file-invoice" style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px', display: 'block' }}></i>
          <p style={{ margin: 0 }}>No invoices available yet.</p>
        </div>
      </div>
    );
  }

  // Get status badge styling
  const getStatusStyle = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') return { bg: '#dcfce7', color: '#166534' };
    if (s === 'confirmed' || s === 'accepted') return { bg: '#dbeafe', color: '#1e40af' };
    if (s === 'pending' || s === 'issued') return { bg: '#fef3c7', color: '#92400e' };
    if (s === 'cancelled' || s === 'canceled') return { bg: '#fee2e2', color: '#991b1b' };
    return { bg: '#f3f4f6', color: '#374151' };
  };

  return (
    <div id="vendor-invoices-section">
      <div className="dashboard-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Search invoices..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                padding: '10px 14px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                fontSize: '14px',
                width: '280px',
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}
              >
                Clear
              </button>
            )}
          </div>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>{filteredInvoices.length} invoices</span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th onClick={() => handleSort('invoice')} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#fafafa', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Invoice {sortKey === 'invoice' && <span style={{ color: '#5e72e4' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th onClick={() => handleSort('date')} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#fafafa', cursor: 'pointer', whiteSpace: 'nowrap', minWidth: '120px' }}>
                  Date {sortKey === 'date' && <span style={{ color: '#5e72e4' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th onClick={() => handleSort('name')} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#fafafa', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Client {sortKey === 'name' && <span style={{ color: '#5e72e4' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th onClick={() => handleSort('service')} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#fafafa', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Service {sortKey === 'service' && <span style={{ color: '#5e72e4' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th onClick={() => handleSort('status')} style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#fafafa', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Status {sortKey === 'status' && <span style={{ color: '#5e72e4' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th onClick={() => handleSort('amount')} style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#fafafa', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Amount {sortKey === 'amount' && <span style={{ color: '#5e72e4' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#fafafa', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.map((b, idx) => {
                const invNum = b.InvoiceNumber || `INV-${b.InvoiceID || b.BookingID}`;
                
                // Try to get date from various fields
                let dateStr = 'N/A';
                const issueDate = b.IssueDate || b.EventDate || b.CreatedAt || b.created_at;
                if (issueDate) {
                  dateStr = formatDate(issueDate);
                }
                
                const name = b.ClientName || 'Client';
                const total = formatCurrency(b.TotalAmount || 0);
                const statusRaw = (b.InvoiceStatus || b.Status || 'pending').toString().toLowerCase();
                const statusLabel = statusRaw === 'confirmed' ? 'Accepted' : statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);
                const svc = b.ServicesSummary || b.ServiceName || 'Service';
                const statusStyle = getStatusStyle(statusRaw);
                
                return (
                  <tr key={b.InvoiceID || b.BookingID || `invoice-${idx}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontWeight: 500, color: '#111827', fontSize: '14px' }}>{invNum}</span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#6b7280', fontSize: '14px', whiteSpace: 'nowrap', minWidth: '120px' }}>{dateStr}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 500, color: '#111827', fontSize: '14px' }}>{name}</td>
                    <td style={{ padding: '16px 20px', color: '#6b7280', fontSize: '14px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '12px', 
                        fontWeight: 500,
                        background: statusStyle.bg, 
                        color: statusStyle.color 
                      }}>
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#111827', fontSize: '14px' }}>{total}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button 
                          onClick={() => handleViewInvoice(b)}
                          style={{ 
                            padding: '8px 16px', 
                            background: '#111827', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            cursor: 'pointer', 
                            fontSize: '13px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <i className="fas fa-eye" style={{ fontSize: '12px' }}></i>
                          View
                        </button>
                        <button 
                          onClick={() => handleDownloadInvoice(b)}
                          style={{ 
                            padding: '8px 12px', 
                            background: '#f3f4f6', 
                            color: '#374151', 
                            border: 'none', 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Download"
                        >
                          <i className="fas fa-download" style={{ fontSize: '13px' }}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1}
                style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >«</button>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >‹</button>
              <span style={{ padding: '8px 16px', background: '#f3f4f6', borderRadius: '6px', fontSize: '14px' }}>{currentPage} / {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages}
                style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >›</button>
              <button 
                onClick={() => setCurrentPage(totalPages)} 
                disabled={currentPage === totalPages}
                style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VendorInvoicesSection;
