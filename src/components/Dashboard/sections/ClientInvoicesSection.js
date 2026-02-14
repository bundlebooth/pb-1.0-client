import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { apiGet } from '../../../utils/api';
import { buildInvoiceUrl } from '../../../utils/urlHelpers';
import { formatDate, normalizeString } from '../../../utils/helpers';
import { useLocalization } from '../../../context/LocalizationContext';
import { useTranslation } from '../../../hooks/useTranslation';

function ClientInvoicesSection() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { formatCurrency } = useLocalization();
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Handle view invoice - navigate to invoice page using public IDs
  const handleViewInvoice = (invoice) => {
    const bookingId = invoice.BookingID || invoice.bookingId;
    const invoiceId = invoice.InvoiceID || invoice.invoiceId;
    
    // Prefer booking-based invoice URL as it auto-generates if missing
    if (bookingId) {
      navigate(buildInvoiceUrl(bookingId, true));
    } else if (invoiceId) {
      navigate(buildInvoiceUrl(invoiceId, false));
    } else {
      console.error('No booking or invoice ID found:', invoice);
    }
  };

  // Handle download invoice - open print dialog
  const handleDownloadInvoice = (invoice) => {
    const bookingId = invoice.BookingID || invoice.bookingId;
    const invoiceId = invoice.InvoiceID;
    
    if (bookingId) {
      // Open invoice in new tab for printing/downloading
      window.open(`${buildInvoiceUrl(bookingId, true)}?print=1`, '_blank');
    } else if (invoiceId) {
      window.open(`${buildInvoiceUrl(invoiceId, false)}?print=1`, '_blank');
    }
  };

  const loadInvoices = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoading(true);
      // Primary: fetch invoices directly
      const resp1 = await apiGet(`/invoices/user/${currentUser.id}`);
      
      if (resp1.ok) {
        const data = await resp1.json();
        setInvoices(Array.isArray(data?.invoices) ? data.invoices : []);
      } else {
        // Fallback: legacy bookings-based list
        const resp = await apiGet(`/users/${currentUser.id}/bookings/all`);
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
  }, [currentUser]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const normalize = normalizeString;

  const getFilteredAndSorted = () => {
    let arr = invoices.slice();
    
    // Filter by search
    if (searchTerm) {
      const q = normalize(searchTerm);
      arr = arr.filter(b => {
        const name = b.VendorName || '';
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
        av = normalize(a.VendorName || '');
        bv = normalize(b.VendorName || '');
      } else if (sortKey === 'status') {
        av = normalize(a.InvoiceStatus || a.Status || '');
        bv = normalize(b.InvoiceStatus || b.Status || '');
      } else if (sortKey === 'invoice') {
        av = a.InvoiceNumber || '';
        bv = b.InvoiceNumber || '';
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
      <div id="invoices-section">
        <div className="dashboard-card">
          <div id="client-invoices-list">
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
      <div id="invoices-section">
        <div className="dashboard-card">
          <div id="client-invoices-list">
            <p>{t('invoices.noInvoices')}</p>
          </div>
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

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div id="invoices-section">
      <div className="dashboard-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <input 
            type="text" 
            placeholder={t('invoices.searchInvoices', 'Search invoices...')} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              padding: '10px 14px', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px', 
              fontSize: '14px',
              flex: 1,
              minWidth: '150px',
              maxWidth: '280px',
              outline: 'none'
            }}
          />
          <span style={{ color: '#6b7280', fontSize: '14px' }}>{filteredInvoices.length} {t('invoices.title').toLowerCase()}</span>
        </div>

        {/* Mobile Card View - DISABLED, using scrollable table instead */}
        <div style={{ display: 'none' }}>
          {paginatedInvoices.map((b, idx) => {
            const invNum = b.InvoiceNumber || `INV-${b.InvoiceID || b.BookingID}`;
            let dateStr = 'N/A';
            const issueDate = b.IssueDate || b.EventDate || b.CreatedAt || b.created_at;
            if (issueDate) {
              dateStr = formatDate(issueDate);
            } else if (invNum) {
              const match = invNum.match(/(\d{4})(\d{2})(\d{2})/);
              if (match) {
                const [, year, month, day] = match;
                const extractedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(extractedDate.getTime())) {
                  dateStr = formatDate(extractedDate);
                }
              }
            }
            const name = b.VendorName || 'Vendor';
            const total = formatCurrency(b.TotalAmount || 0);
            const statusRaw = (b.InvoiceStatus || b.Status || 'pending').toString().toLowerCase();
            const statusLabel = statusRaw === 'confirmed' ? 'Accepted' : statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);
            const svc = b.ServicesSummary || b.ServiceName || 'Service';
            const statusStyle = getStatusStyle(statusRaw);

            return (
              <div key={b.InvoiceID || b.BookingID || `invoice-mobile-${idx}`} style={{ 
                padding: '16px', 
                borderBottom: '1px solid #f3f4f6'
              }}>
                {/* Invoice Number & Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>{invNum}</span>
                  <span style={{ color: '#6b7280', fontSize: '13px' }}>{dateStr}</span>
                </div>
                {/* Vendor Name */}
                <div style={{ fontWeight: 500, color: '#111827', fontSize: '14px', marginBottom: '4px' }}>{name}</div>
                {/* Service */}
                <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '12px' }}>{svc}</div>
                {/* Status & Amount Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
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
                  <span style={{ fontWeight: 700, color: '#111827', fontSize: '16px' }}>{total}</span>
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleViewInvoice(b)}
                    style={{ 
                      flex: 1,
                      padding: '10px 16px', 
                      background: '#5e72e4', 
                      color: 'white',
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  >
                    View
                  </button>
                  <button 
                    onClick={() => handleDownloadInvoice(b)}
                    style={{ 
                      padding: '10px 16px', 
                      background: 'white', 
                      color: '#374151',
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  >
                    <i className="fas fa-download"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table View - Always visible with horizontal scroll on mobile */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                  Vendor {sortKey === 'name' && <span style={{ color: '#5e72e4' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
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
                
                // Try to get date from various fields, or extract from invoice number
                let dateStr = 'N/A';
                const issueDate = b.IssueDate || b.EventDate || b.CreatedAt || b.created_at;
                if (issueDate) {
                  dateStr = formatDate(issueDate);
                } else if (invNum) {
                  // Extract date from invoice number format: INV-XX-YYYYMMDDHHmmss
                  const match = invNum.match(/(\d{4})(\d{2})(\d{2})/);
                  if (match) {
                    const [, year, month, day] = match;
                    const extractedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    if (!isNaN(extractedDate.getTime())) {
                      dateStr = formatDate(extractedDate);
                    }
                  }
                }
                
                const name = b.VendorName || 'Vendor';
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
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                        <button 
                          onClick={() => handleViewInvoice(b)}
                          style={{ 
                            padding: '4px 8px', 
                            background: 'transparent', 
                            color: '#6b7280',
                            border: 'none', 
                            cursor: 'pointer', 
                            fontSize: '12px',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#374151'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                        >
                          VIEW
                        </button>
                        <button 
                          onClick={() => handleDownloadInvoice(b)}
                          style={{ 
                            padding: '4px 8px', 
                            background: 'transparent', 
                            color: '#6b7280',
                            border: 'none', 
                            cursor: 'pointer', 
                            fontSize: '12px',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#374151'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                        >
                          DOWNLOAD
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
          <div style={{ 
            padding: '16px 24px', 
            borderTop: '1px solid #e5e7eb',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{ 
                  padding: '6px 10px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '6px', 
                  background: 'white',
                  color: currentPage === 1 ? '#d1d5db' : '#374151',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '13px'
                }}
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ 
                  padding: '6px 10px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '6px', 
                  background: 'white',
                  color: currentPage === 1 ? '#d1d5db' : '#374151',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '13px'
                }}
              >
                ‹
              </button>
              <span style={{ padding: '6px 12px', color: '#374151', fontSize: '13px' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ 
                  padding: '6px 10px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '6px', 
                  background: 'white',
                  color: currentPage === totalPages ? '#d1d5db' : '#374151',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '13px'
                }}
              >
                ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{ 
                  padding: '6px 10px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '6px', 
                  background: 'white',
                  color: currentPage === totalPages ? '#d1d5db' : '#374151',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '13px'
                }}
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientInvoicesSection;
