/**
 * Payments Section - Admin Dashboard
 * Financial transactions, vendor payouts, and revenue tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate, formatCurrency } from '../../../utils/formatUtils';
import adminApi from '../../../services/adminApi';

function PaymentsSection() {
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [paymentStats, setPaymentStats] = useState(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getTransactions({ page, limit });
      const txArray = Array.isArray(data?.transactions) ? data.transactions : Array.isArray(data) ? data : [];
      setTransactions(txArray);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchPayouts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getPayouts({ page, limit });
      const payoutsArray = Array.isArray(data?.payouts) ? data.payouts : Array.isArray(data) ? data : [];
      setPayouts(payoutsArray);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching payouts:', err);
      setError('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchPaymentStats = useCallback(async () => {
    try {
      const data = await adminApi.getPaymentStats();
      setPaymentStats(data);
    } catch (err) {
      console.error('Error fetching payment stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchPaymentStats();
  }, [fetchPaymentStats]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    } else if (activeTab === 'payouts') {
      fetchPayouts();
    }
  }, [activeTab, fetchTransactions, fetchPayouts]);

  const getStatusBadge = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (['completed', 'paid', 'confirmed', 'success'].includes(statusLower)) {
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

  const renderTransactions = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Payment Transactions</h3>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fas fa-credit-card"></i>
          <h3>No Transactions</h3>
          <p>No transactions found</p>
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.TransactionID || tx.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {tx.TransactionID || tx.id}
                    </td>
                    <td>{tx.Type || tx.type}</td>
                    <td style={{ fontWeight: 500 }}>{formatCurrency(tx.Amount || tx.amount)}</td>
                    <td>{getStatusBadge(tx.Status || tx.status)}</td>
                    <td>{formatDate(tx.CreatedAt || tx.createdAt)}</td>
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
  );

  const renderPayouts = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Vendor Payouts</h3>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading payouts...</p>
        </div>
      ) : payouts.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fas fa-money-check-alt"></i>
          <h3>No Payouts</h3>
          <p>No payouts found</p>
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Payout ID</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.PayoutID || payout.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      #{payout.PayoutID || payout.id}
                    </td>
                    <td>{payout.VendorName || payout.vendorName}</td>
                    <td style={{ fontWeight: 500 }}>{formatCurrency(payout.Amount || payout.amount)}</td>
                    <td>{getStatusBadge(payout.Status || payout.status)}</td>
                    <td>{formatDate(payout.CreatedAt || payout.createdAt)}</td>
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
  );

  const renderStats = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Revenue Overview</h3>
      </div>
      
      {!paymentStats ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading stats...</p>
        </div>
      ) : (
        <div style={{ padding: '1.5rem' }}>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-icon green">
                <i className="fas fa-dollar-sign"></i>
              </div>
              <div className="admin-stat-content">
                <div className="admin-stat-value">{formatCurrency(paymentStats.totalRevenue || 0)}</div>
                <div className="admin-stat-label">Total Revenue</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon blue">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="admin-stat-content">
                <div className="admin-stat-value">{formatCurrency(paymentStats.monthlyRevenue || 0)}</div>
                <div className="admin-stat-label">This Month</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon purple">
                <i className="fas fa-percentage"></i>
              </div>
              <div className="admin-stat-content">
                <div className="admin-stat-value">{formatCurrency(paymentStats.platformFees || 0)}</div>
                <div className="admin-stat-label">Platform Fees Earned</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon orange">
                <i className="fas fa-clock"></i>
              </div>
              <div className="admin-stat-content">
                <div className="admin-stat-value">{paymentStats.pendingPayouts || 0}</div>
                <div className="admin-stat-label">Pending Payouts</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ marginBottom: '1rem', color: '#374151' }}>Quick Stats</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Transactions</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>{paymentStats.totalTransactions || 0}</div>
              </div>
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Completed Payouts</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>{paymentStats.completedPayouts || 0}</div>
              </div>
              <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.875rem', color: '#92400e' }}>Total Refunds</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#92400e' }}>{formatCurrency(paymentStats.totalRefunds || 0)}</div>
              </div>
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Avg Transaction</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>{formatCurrency(paymentStats.avgTransaction || 0)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-section">
      {/* Payment Stats Summary */}
      {paymentStats && (
        <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="admin-stat-card">
            <div className="admin-stat-icon green">
              <i className="fas fa-dollar-sign"></i>
            </div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">{formatCurrency(paymentStats.totalRevenue || 0)}</div>
              <div className="admin-stat-label">Total Revenue</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon blue">
              <i className="fas fa-calendar-check"></i>
            </div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">{paymentStats.totalBookings || 0}</div>
              <div className="admin-stat-label">Total Bookings</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon orange">
              <i className="fas fa-clock"></i>
            </div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">{paymentStats.pendingPayouts || 0}</div>
              <div className="admin-stat-label">Pending Payouts</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon red">
              <i className="fas fa-undo"></i>
            </div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">{formatCurrency(paymentStats.totalRefunds || 0)}</div>
              <div className="admin-stat-label">Total Refunds</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => { setActiveTab('transactions'); setPage(1); }}
        >
          Transactions
        </button>
        <button
          className={`admin-tab ${activeTab === 'payouts' ? 'active' : ''}`}
          onClick={() => { setActiveTab('payouts'); setPage(1); }}
        >
          Payouts
        </button>
        <button
          className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Revenue Stats
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'transactions' && renderTransactions()}
      {activeTab === 'payouts' && renderPayouts()}
      {activeTab === 'stats' && renderStats()}
    </div>
  );
}

export default PaymentsSection;
