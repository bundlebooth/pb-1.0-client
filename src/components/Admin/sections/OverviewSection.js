/**
 * Overview Section - Admin Dashboard
 * Displays key metrics, activity feed, and quick actions
 */

import React, { useState, useEffect } from 'react';
import { formatRelativeTime, formatCurrency } from '../../../utils/formatUtils';
import adminApi from '../../../services/adminApi';

function OverviewSection() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, activityData, healthData] = await Promise.all([
        adminApi.getDashboardStats().catch(() => null),
        adminApi.getRecentActivity().catch(() => ({ activity: [], total: 0 })),
        adminApi.getPlatformHealth().catch(() => null)
      ]);

      setStats(statsData);
      // Ensure activity is always an array - backend returns { activity: [...], total: N }
      const activityArray = Array.isArray(activityData?.activity) 
        ? activityData.activity 
        : Array.isArray(activityData?.activities) 
          ? activityData.activities 
          : Array.isArray(activityData) 
            ? activityData 
            : [];
      setActivity(activityArray);
      setActivityTotal(activityData?.total || activityArray.length);
      setActivityPage(1);
      setHealth(healthData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreActivity = async () => {
    if (loadingMore || activity.length >= activityTotal) return;
    setLoadingMore(true);
    try {
      const nextPage = activityPage + 1;
      const data = await adminApi.getRecentActivity({ page: nextPage, limit: 50 });
      const newActivity = Array.isArray(data?.activity) ? data.activity : [];
      setActivity(prev => [...prev, ...newActivity]);
      setActivityPage(nextPage);
    } catch (err) {
      console.error('Error loading more activity:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const getActivityIcon = (type) => {
    const icons = {
      booking: { icon: 'fa-calendar-check', color: '#5086E8', bg: 'rgba(80, 134, 232, 0.12)' },
      user: { icon: 'fa-user-plus', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
      vendor: { icon: 'fa-store', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
      payment: { icon: 'fa-credit-card', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
      review: { icon: 'fa-star', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
      support: { icon: 'fa-headset', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
      default: { icon: 'fa-bell', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)' }
    };
    return icons[type] || icons.default;
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-empty-state">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Error Loading Dashboard</h3>
        <p>{error}</p>
        <button className="admin-btn admin-btn-primary" onClick={fetchDashboardData}>
          <i className="fas fa-redo"></i> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="admin-section">
      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <i className="fas fa-users"></i>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">
              {stats?.totalUsers?.toLocaleString() || '0'}
            </div>
            <div className="admin-stat-label">Total Users</div>
            {stats?.newUsersThisMonth > 0 && (
              <div className="admin-stat-trend up">
                <i className="fas fa-arrow-up"></i>
                +{stats.newUsersThisMonth} this month
              </div>
            )}
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <i className="fas fa-store"></i>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">
              {stats?.activeVendors?.toLocaleString() || '0'}
            </div>
            <div className="admin-stat-label">Active Vendors</div>
            {stats?.pendingApprovals > 0 && (
              <div className="admin-stat-trend" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
                <i className="fas fa-clock"></i>
                {stats.pendingApprovals} pending
              </div>
            )}
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon orange">
            <i className="fas fa-calendar-check"></i>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">
              {stats?.bookingsThisMonth?.toLocaleString() || '0'}
            </div>
            <div className="admin-stat-label">Bookings This Month</div>
            {stats?.bookingGrowth && (
              <div className={`admin-stat-trend ${stats.bookingGrowth >= 0 ? 'up' : 'down'}`}>
                <i className={`fas fa-arrow-${stats.bookingGrowth >= 0 ? 'up' : 'down'}`}></i>
                {Math.abs(stats.bookingGrowth)}% vs last month
              </div>
            )}
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon purple">
            <i className="fas fa-dollar-sign"></i>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">
              {formatCurrency(stats?.revenueThisMonth || 0)}
            </div>
            <div className="admin-stat-label">Revenue This Month</div>
            {stats?.revenueGrowth && (
              <div className={`admin-stat-trend ${stats.revenueGrowth >= 0 ? 'up' : 'down'}`}>
                <i className={`fas fa-arrow-${stats.revenueGrowth >= 0 ? 'up' : 'down'}`}></i>
                {Math.abs(stats.revenueGrowth)}% vs last month
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Quick Actions */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Quick Actions</h3>
          </div>
          <div className="admin-card-body">
            <div className="admin-quick-actions">
              <a href="?section=vendors" className="admin-quick-action">
                <i className="fas fa-user-check"></i>
                <span>Vendor Approvals</span>
                {stats?.pendingApprovals > 0 && (
                  <span className="admin-badge admin-badge-warning">{stats.pendingApprovals}</span>
                )}
              </a>
              <a href="?section=support" className="admin-quick-action">
                <i className="fas fa-ticket-alt"></i>
                <span>Support Tickets</span>
                {stats?.openTickets > 0 && (
                  <span className="admin-badge admin-badge-info">{stats.openTickets}</span>
                )}
              </a>
              <a href="?section=moderation" className="admin-quick-action">
                <i className="fas fa-flag"></i>
                <span>Flagged Content</span>
                {stats?.flaggedItems > 0 && (
                  <span className="admin-badge admin-badge-danger">{stats.flaggedItems}</span>
                )}
              </a>
              <a href="?section=bookings" className="admin-quick-action">
                <i className="fas fa-exclamation-circle"></i>
                <span>Disputes</span>
                {stats?.activeDisputes > 0 && (
                  <span className="admin-badge admin-badge-warning">{stats.activeDisputes}</span>
                )}
              </a>
              <a href="?section=analytics" className="admin-quick-action">
                <i className="fas fa-file-export"></i>
                <span>Export Reports</span>
              </a>
              <a href="?section=settings" className="admin-quick-action">
                <i className="fas fa-cog"></i>
                <span>Settings</span>
              </a>
            </div>
          </div>
        </div>

        {/* Recent Activity - All User Notifications */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Recent Activity ({activityTotal || activity.length} notifications)</h3>
            <button 
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={fetchDashboardData}
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
          <div 
            className="admin-card-body" 
            style={{ maxHeight: '500px', overflowY: 'auto' }}
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.target;
              if (scrollHeight - scrollTop <= clientHeight + 50 && !loadingMore && activity.length < activityTotal) {
                loadMoreActivity();
              }
            }}
          >
            {activity.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '2rem' }}>
                <i className="fas fa-history"></i>
                <p>No recent activity</p>
              </div>
            ) : (
              <>
                {activity.map((item, index) => {
                  const iconStyle = getActivityIcon(item.type || item.Type);
                  return (
                    <div key={item.id || index} className="admin-activity-item">
                      <div 
                        className="admin-activity-icon"
                        style={{ background: iconStyle.bg, color: iconStyle.color }}
                      >
                        <i className={`fas ${iconStyle.icon}`}></i>
                      </div>
                      <div className="admin-activity-content">
                        <p className="admin-activity-text">
                          <strong>{item.user || item.User || 'System'}</strong>{' '}
                          {item.action || item.Action || item.description || item.Description}
                        </p>
                        <p className="admin-activity-time">
                          {formatRelativeTime(item.timestamp || item.createdAt || item.CreatedAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {loadingMore && (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <div className="admin-loading-spinner" style={{ width: '24px', height: '24px', margin: '0 auto' }}></div>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>Loading more...</p>
                  </div>
                )}
                {activity.length < activityTotal && !loadingMore && (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={loadMoreActivity}>
                      Load More ({activityTotal - activity.length} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Platform Health */}
      {health && (
        <div className="admin-card" style={{ marginTop: '1.5rem' }}>
          <div className="admin-card-header">
            <h3 className="admin-card-title">Platform Health</h3>
          </div>
          <div className="admin-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ 
                  fontSize: '2rem', 
                  color: health.serverStatus === 'operational' ? '#10b981' : '#ef4444' 
                }}>
                  <i className={`fas ${health.serverStatus === 'operational' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '0.5rem' }}>API Status</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{health.serverStatus || 'Unknown'}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ 
                  fontSize: '2rem', 
                  color: health.databaseLoad < 50 ? '#10b981' : health.databaseLoad < 80 ? '#f59e0b' : '#ef4444' 
                }}>
                  <i className="fas fa-database"></i>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '0.5rem' }}>Database</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{health.databaseLoad}% load</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ 
                  fontSize: '2rem', 
                  color: '#10b981'
                }}>
                  <i className="fas fa-envelope"></i>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '0.5rem' }}>Email Service</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Operational</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ 
                  fontSize: '2rem', 
                  color: '#10b981'
                }}>
                  <i className="fas fa-credit-card"></i>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '0.5rem' }}>Payments</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{health.paymentStatus || 'Unknown'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginTop: '1.5rem' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(236, 72, 153, 0.12)', color: '#ec4899' }}>
            <i className="fas fa-star"></i>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">{stats?.totalReviews?.toLocaleString() || '0'}</div>
            <div className="admin-stat-label">Total Reviews</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4' }}>
            <i className="fas fa-comments"></i>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">{stats?.activeConversations?.toLocaleString() || '0'}</div>
            <div className="admin-stat-label">Active Chats</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon red">
            <i className="fas fa-undo"></i>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">{formatCurrency(stats?.refundsThisMonth || 0)}</div>
            <div className="admin-stat-label">Refunds This Month</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
            <i className="fas fa-percentage"></i>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">{stats?.conversionRate || '0'}%</div>
            <div className="admin-stat-label">Conversion Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewSection;
