import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { apiGet } from '../utils/api';
import { PageLayout } from '../components/PageWrapper';
import Header from '../components/Header';
import Invoice from '../components/common/Invoice';
import { decodeInvoiceId, decodeBookingId, isPublicId } from '../utils/hashIds';
import { formatCurrency, formatDateFormal } from '../utils/helpers';
import './InvoicePage.css';

function InvoicePage() {
  const { invoiceId: rawInvoiceId, bookingId: rawBookingId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Decode public IDs to internal IDs for API calls
  // The backend middleware will also handle this, but we decode here for consistency
  const invoiceId = rawInvoiceId;
  const bookingId = rawBookingId;

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!currentUser?.id) {
        setError('Please log in to view this invoice');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let url;
        
        // Use the raw public IDs in the URL - backend will decode them
        if (invoiceId) {
          url = `${API_BASE_URL}/invoices/${invoiceId}?userId=${currentUser.id}`;
        } else if (bookingId) {
          url = `${API_BASE_URL}/invoices/booking/${bookingId}?userId=${currentUser.id}`;
        } else {
          throw new Error('No invoice or booking ID provided');
        }

        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to load invoice');
        }

        const data = await response.json();
        setInvoice(data.invoice);
      } catch (err) {
        console.error('Error loading invoice:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId, bookingId, currentUser]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // For now, just print - PDF generation would require a backend service
    window.print();
  };

  const formatDate = formatDateFormal;

  if (loading) {
    return (
      <div className="invoice-page">
        <div className="invoice-loading">
          <div className="spinner"></div>
          <p>Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invoice-page">
        <div className="invoice-error">
          <i className="fas fa-exclamation-circle"></i>
          <h2>Unable to Load Invoice</h2>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="btn-back">
            <i className="fas fa-arrow-left"></i> Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="invoice-page">
        <div className="invoice-error">
          <i className="fas fa-file-invoice"></i>
          <h2>Invoice Not Found</h2>
          <p>The requested invoice could not be found.</p>
          <button onClick={() => navigate(-1)} className="btn-back">
            <i className="fas fa-arrow-left"></i> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageLayout variant="fullWidth" pageClassName="invoice-page-layout">
      <Header 
        onSearch={() => {}}
        onProfileClick={() => {}}
        onWishlistClick={() => {}}
        onChatClick={() => {}}
        onNotificationsClick={() => {}}
      />
      <div className="invoice-page">
        <div className="page-wrapper">
          <div className="invoice-actions no-print">
            <button onClick={() => navigate(-1)} className="btn-back">
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="action-buttons-right">
              <button onClick={handlePrint} className="btn-print">
                <i className="fas fa-print"></i> Print
              </button>
              <button onClick={handleDownloadPDF} className="btn-download">
                <i className="fas fa-download"></i> Download PDF
              </button>
            </div>
          </div>

          <div className="invoice-container">
            {/* Use centralized Invoice component - single source of truth */}
            <Invoice invoice={invoice} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default InvoicePage;
