/**
 * Analytics Section - Admin Dashboard
 * Full analytics with charts matching Planbeau design
 * Includes: Performance Overview, Revenue Charts, Booking Trends, Email Logs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatRelativeTime, formatDate } from '../../../utils/formatUtils';
import adminApi from '../../../services/adminApi';
import UniversalModal, { ConfirmationModal } from '../../UniversalModal';

// Line Chart Component
const LineChart = ({ data, dataKey, color = '#5086E8', height = 200 }) => {
  const chartData = Array.isArray(data) ? data : [];
  if (chartData.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', borderRadius: '8px' }}>
        <span style={{ color: '#9ca3af' }}>No data available</span>
      </div>
    );
  }
  const values = chartData.map(d => d[dataKey] || d.value || d.count || 0);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;
  const points = values.map((val, idx) => {
    const x = (idx / (values.length - 1 || 1)) * 100;
    const y = 100 - ((val - minValue) / range) * 100;
    return { x, y, val };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L 100 100 L 0 100 Z`;

  return (
    <div style={{ position: 'relative', height }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 24, width: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af', textAlign: 'right', paddingRight: '8px' }}>
        <span>{maxValue.toLocaleString()}</span>
        <span>{Math.round((maxValue + minValue) / 2).toLocaleString()}</span>
        <span>{minValue.toLocaleString()}</span>
      </div>
      <div style={{ marginLeft: '55px', height: height - 24, position: 'relative', borderLeft: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed #f3f4f6' }}></div>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id={`lg-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#lg-${color.replace('#', '')})`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill={color}><title>{chartData[i]?.label || ''}: {p.val.toLocaleString()}</title></circle>
          ))}
        </svg>
      </div>
      <div style={{ marginLeft: '55px', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af', paddingTop: '4px' }}>
        {chartData.filter((_, i) => i % Math.ceil(chartData.length / 4) === 0 || i === chartData.length - 1).map((d, i) => (
          <span key={i}>{d.label || d.month || ''}</span>
        ))}
      </div>
    </div>
  );
};

// Bar Chart Component
const BarChart = ({ data, dataKey, color = '#10b981', height = 200 }) => {
  const chartData = Array.isArray(data) ? data : [];
  if (chartData.length === 0) {
    return (<div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', borderRadius: '8px' }}><span style={{ color: '#9ca3af' }}>No data available</span></div>);
  }
  const values = chartData.map(d => d[dataKey] || d.value || d.count || 0);
  const maxValue = Math.max(...values, 1);
  return (
    <div style={{ position: 'relative', height }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 24, width: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af', textAlign: 'right', paddingRight: '8px' }}>
        <span>{maxValue.toLocaleString()}</span><span>{Math.round(maxValue / 2).toLocaleString()}</span><span>0</span>
      </div>
      <div style={{ marginLeft: '55px', height: height - 24, display: 'flex', alignItems: 'flex-end', gap: '8px', borderLeft: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '0 8px' }}>
        {chartData.map((d, i) => {
          const val = d[dataKey] || d.value || d.count || 0;
          const hp = (val / maxValue) * 100;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', maxWidth: '40px', height: `${Math.max(hp, 2)}%`, background: `linear-gradient(180deg, ${color} 0%, ${color}dd 100%)`, borderRadius: '4px 4px 0 0', cursor: 'pointer' }} title={`${d.label || d.month || ''}: ${val.toLocaleString()}`} />
            </div>
          );
        })}
      </div>
      <div style={{ marginLeft: '55px', display: 'flex', justifyContent: 'space-around', fontSize: '0.7rem', color: '#9ca3af', paddingTop: '4px' }}>
        {chartData.map((d, i) => (<span key={i} style={{ flex: 1, textAlign: 'center' }}>{d.label || d.month || ''}</span>))}
      </div>
    </div>
  );
};

// Donut Chart Component
const DonutChart = ({ data, height = 160 }) => {
  const chartData = Array.isArray(data) ? data : [];
  if (chartData.length === 0) {
    return (<div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', borderRadius: '8px' }}><span style={{ color: '#9ca3af' }}>No data</span></div>);
  }
  const total = chartData.reduce((sum, d) => sum + (d.value || d.count || 0), 0) || 1;
  const colors = ['#5086E8', '#10b981', '#f59e0b', '#ef4444'];
  let currentAngle = 0;
  const segments = chartData.map((d, i) => {
    const value = d.value || d.count || 0;
    const angle = (value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return { ...d, startAngle, angle, color: colors[i % colors.length], percent: ((value / total) * 100).toFixed(1) };
  });
  const createArc = (start, angle, inner, outer) => {
    const s = (start - 90) * (Math.PI / 180);
    const e = (start + angle - 90) * (Math.PI / 180);
    const la = angle > 180 ? 1 : 0;
    return `M ${50 + outer * Math.cos(s)} ${50 + outer * Math.sin(s)} A ${outer} ${outer} 0 ${la} 1 ${50 + outer * Math.cos(e)} ${50 + outer * Math.sin(e)} L ${50 + inner * Math.cos(e)} ${50 + inner * Math.sin(e)} A ${inner} ${inner} 0 ${la} 0 ${50 + inner * Math.cos(s)} ${50 + inner * Math.sin(s)} Z`;
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <svg width={height} height={height} viewBox="0 0 100 100">
        {segments.map((seg, i) => (<path key={i} d={createArc(seg.startAngle, seg.angle - 1, 25, 45)} fill={seg.color}><title>{seg.label}: {seg.percent}%</title></path>))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: seg.color }}></span>
            <span style={{ color: '#374151' }}>{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function AnalyticsSection() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30d');

  // Analytics data
  const [analytics, setAnalytics] = useState(null);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [emailQueue, setEmailQueue] = useState([]);
  const [emailQueueStats, setEmailQueueStats] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const logsLimit = 20;

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAnalytics(dateRange);
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchSecurityLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getSecurityLogs({ page: logsPage, limit: logsLimit });
      // Ensure securityLogs is always an array
      const logsArray = Array.isArray(data?.logs) 
        ? data.logs 
        : Array.isArray(data) 
          ? data 
          : [];
      setSecurityLogs(logsArray);
      setLogsTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching security logs:', err);
      setError('Failed to load security logs');
    } finally {
      setLoading(false);
    }
  }, [logsPage]);

  const fetchEmailLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getEmailLogs({ page: logsPage, limit: logsLimit });
      const logsArray = Array.isArray(data?.logs) ? data.logs : Array.isArray(data) ? data : [];
      setEmailLogs(logsArray);
      setLogsTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching email logs:', err);
    } finally {
      setLoading(false);
    }
  }, [logsPage]);

  const fetchEmailQueue = useCallback(async () => {
    try {
      setLoading(true);
      const [queueData, statsData] = await Promise.all([
        adminApi.getEmailQueue({ page: logsPage, limit: logsLimit }),
        adminApi.getEmailQueueStats().catch(() => null)
      ]);
      const queueArray = Array.isArray(queueData?.emails) ? queueData.emails : Array.isArray(queueData) ? queueData : [];
      setEmailQueue(queueArray);
      setEmailQueueStats(statsData);
      setLogsTotal(queueData.total || 0);
    } catch (err) {
      console.error('Error fetching email queue:', err);
    } finally {
      setLoading(false);
    }
  }, [logsPage]);

  useEffect(() => {
    if (activeTab === 'overview') fetchAnalytics();
    else if (activeTab === 'emails') fetchEmailLogs();
    else if (activeTab === 'queue') fetchEmailQueue();
    else if (activeTab === 'logs') fetchSecurityLogs();
  }, [activeTab, fetchAnalytics, fetchEmailLogs, fetchEmailQueue, fetchSecurityLogs]);

  useEffect(() => {
    setLogsPage(1);
  }, [activeTab]);

  const handleExport = async (type) => {
    try {
      let response;
      let filename;
      
      switch (type) {
        case 'bookings':
          response = await adminApi.exportBookings('all');
          filename = `bookings-export-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        default:
          return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Error exporting:', err);
      alert('Failed to export data');
    }
  };

  const getLogIcon = (type) => {
    const icons = {
      login: { icon: 'fa-sign-in-alt', color: '#10b981' },
      logout: { icon: 'fa-sign-out-alt', color: '#6b7280' },
      failed_login: { icon: 'fa-exclamation-triangle', color: '#ef4444' },
      password_reset: { icon: 'fa-key', color: '#f59e0b' },
      account_locked: { icon: 'fa-lock', color: '#ef4444' },
      account_unlocked: { icon: 'fa-unlock', color: '#10b981' },
      settings_changed: { icon: 'fa-cog', color: '#5086E8' },
      default: { icon: 'fa-shield-alt', color: '#6b7280' }
    };
    return icons[type] || icons.default;
  };

  const logsTotalPages = Math.ceil(logsTotal / logsLimit);

  const renderOverview = () => (
    <>
      {/* Date Range Selector */}
      <div className="admin-filter-bar">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['7d', '30d', '90d', '365d'].map(range => (
            <button
              key={range}
              className={`admin-btn ${dateRange === range ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
              onClick={() => setDateRange(range)}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
            </button>
          ))}
        </div>
        <button className="admin-btn admin-btn-secondary" onClick={fetchAnalytics}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading analytics...</p>
        </div>
      ) : !analytics ? (
        <div className="admin-empty-state">
          <i className="fas fa-chart-bar"></i>
          <h3>No Data Available</h3>
          <p>Analytics data is not available</p>
        </div>
      ) : (
        <>
          {/* Performance Overview Card */}
          <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
            <div className="admin-card-header">
              <h3 className="admin-card-title">Performance Overview</h3>
            </div>
            <div className="admin-card-body">
              <div className="admin-stats-grid">
                <div className="admin-stat-card" style={{ background: 'linear-gradient(135deg, rgba(80, 134, 232, 0.1) 0%, rgba(80, 134, 232, 0.02) 100%)' }}>
                  <div className="admin-stat-icon blue"><i className="fas fa-eye"></i></div>
                  <div className="admin-stat-content">
                    <div style={{ fontSize: '0.7rem', color: '#5086E8', fontWeight: 600, textTransform: 'uppercase' }}>Profile Views</div>
                    <div className="admin-stat-value">{(analytics.profileViews || analytics.totalViews || 0).toLocaleString()}</div>
                    {analytics.viewsGrowth && (
                      <div className={`admin-stat-trend ${analytics.viewsGrowth >= 0 ? 'up' : 'down'}`}>
                        <i className={`fas fa-arrow-${analytics.viewsGrowth >= 0 ? 'up' : 'down'}`}></i>
                        {Math.abs(analytics.viewsGrowth)}% from last period
                      </div>
                    )}
                  </div>
                </div>
                <div className="admin-stat-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)' }}>
                  <div className="admin-stat-icon green"><i className="fas fa-calendar-check"></i></div>
                  <div className="admin-stat-content">
                    <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>Total Bookings</div>
                    <div className="admin-stat-value">{(analytics.totalBookings || 0).toLocaleString()}</div>
                    {analytics.bookingsGrowth && (
                      <div className={`admin-stat-trend ${analytics.bookingsGrowth >= 0 ? 'up' : 'down'}`}>
                        <i className={`fas fa-arrow-${analytics.bookingsGrowth >= 0 ? 'up' : 'down'}`}></i>
                        {Math.abs(analytics.bookingsGrowth)}% from last period
                      </div>
                    )}
                  </div>
                </div>
                <div className="admin-stat-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)' }}>
                  <div className="admin-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}><i className="fas fa-dollar-sign"></i></div>
                  <div className="admin-stat-content">
                    <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>Total Revenue</div>
                    <div className="admin-stat-value">{formatCurrency(analytics.totalRevenue || 0)}</div>
                    {analytics.revenueGrowth && (
                      <div className={`admin-stat-trend ${analytics.revenueGrowth >= 0 ? 'up' : 'down'}`}>
                        <i className={`fas fa-arrow-${analytics.revenueGrowth >= 0 ? 'up' : 'down'}`}></i>
                        {Math.abs(analytics.revenueGrowth)}% from last period
                      </div>
                    )}
                  </div>
                </div>
                <div className="admin-stat-card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.02) 100%)' }}>
                  <div className="admin-stat-icon purple"><i className="fas fa-percentage"></i></div>
                  <div className="admin-stat-content">
                    <div style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: 600, textTransform: 'uppercase' }}>Conversion Rate</div>
                    <div className="admin-stat-value">{analytics.conversionRate || 0}%</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Views to bookings</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 1: Line + Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title"><i className="fas fa-chart-line" style={{ marginRight: '0.5rem', color: '#5086E8' }}></i>Profile Views Trend</h3>
              </div>
              <div className="admin-card-body">
                <LineChart data={analytics.viewsTrend || analytics.profileViewsTrend || []} dataKey="views" color="#5086E8" height={220} />
              </div>
            </div>
            <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title"><i className="fas fa-chart-bar" style={{ marginRight: '0.5rem', color: '#10b981' }}></i>Revenue by Month</h3>
              </div>
              <div className="admin-card-body">
                <BarChart data={analytics.bookingTrends || analytics.revenueByMonth || analytics.monthlyRevenue || []} dataKey="revenue" color="#10b981" height={220} />
              </div>
            </div>
          </div>

          {/* Charts Row 2: Bar + Donut + Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
            <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title"><i className="fas fa-calendar" style={{ marginRight: '0.5rem', color: '#5086E8' }}></i>Bookings Over Time</h3>
              </div>
              <div className="admin-card-body">
                <BarChart data={analytics.bookingsTrend || analytics.bookingTrends || []} dataKey="bookings" color="#5086E8" height={180} />
              </div>
            </div>
            <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title"><i className="fas fa-chart-pie" style={{ marginRight: '0.5rem', color: '#f59e0b' }}></i>Booking Status</h3>
              </div>
              <div className="admin-card-body">
                <DonutChart data={[
                  { label: 'Pending', value: analytics.pendingBookings || 0 },
                  { label: 'Confirmed', value: analytics.confirmedBookings || 0 },
                  { label: 'Completed', value: analytics.completedBookings || 0 },
                  { label: 'Cancelled', value: analytics.cancelledBookings || 0 }
                ].filter(d => d.value > 0)} height={140} />
              </div>
            </div>
            <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title"><i className="fas fa-star" style={{ marginRight: '0.5rem', color: '#f59e0b' }}></i>Additional Metrics</h3>
              </div>
              <div className="admin-card-body" style={{ padding: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#fef2f2', borderRadius: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><i className="fas fa-heart" style={{ color: '#ef4444' }}></i>Favorites</span>
                    <strong>{analytics.totalFavorites || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#f0fdf4', borderRadius: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><i className="fas fa-star" style={{ color: '#10b981' }}></i>Reviews</span>
                    <strong>{analytics.totalReviews || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#fefce8', borderRadius: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><i className="fas fa-star-half-alt" style={{ color: '#f59e0b' }}></i>Avg Rating</span>
                    <strong>{analytics.avgRating || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#eff6ff', borderRadius: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><i className="fas fa-clock" style={{ color: '#5086E8' }}></i>Avg Response</span>
                    <strong>{analytics.avgResponseTime || 0} hrs</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Categories & Vendors Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title">Top Categories</h3>
              </div>
              <div className="admin-card-body">
                {analytics.topCategories && analytics.topCategories.length > 0 ? (
                  analytics.topCategories.slice(0, 5).map((cat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0',
                        borderBottom: idx < 4 ? '1px solid #f3f4f6' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          background: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          {idx + 1}
                        </span>
                        <span>{cat.CategoryName || cat.name}</span>
                      </div>
                      <span style={{ fontWeight: 500 }}>{cat.BookingCount || cat.count} bookings</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#6b7280', textAlign: 'center' }}>No data available</p>
                )}
              </div>
            </div>

            {/* Top Vendors */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title">Top Vendors</h3>
              </div>
              <div className="admin-card-body">
                {analytics.topVendors && analytics.topVendors.length > 0 ? (
                  analytics.topVendors.slice(0, 5).map((vendor, idx) => (
                    <div 
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0',
                        borderBottom: idx < 4 ? '1px solid #f3f4f6' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          background: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          {idx + 1}
                        </span>
                        <span>{vendor.BusinessName || vendor.name}</span>
                      </div>
                      <span style={{ fontWeight: 500, color: '#10b981' }}>
                        {formatCurrency(vendor.TotalRevenue || vendor.revenue || 0)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#6b7280', textAlign: 'center' }}>No data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Booking Trends Chart - using BarChart component */}
          <div className="admin-card" style={{ marginTop: '1.5rem' }}>
            <div className="admin-card-header">
              <h3 className="admin-card-title">Booking Trends</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#5086E8' }}></span>
                  Bookings
                </div>
              </div>
            </div>
            <div className="admin-card-body">
              <BarChart 
                data={Array.isArray(analytics?.bookingTrends) ? analytics.bookingTrends : []} 
                dataKey="bookings" 
                color="#5086E8" 
                height={200} 
              />
              {(!Array.isArray(analytics?.bookingTrends) || analytics.bookingTrends.length === 0) && (
                <div style={{ 
                  height: '180px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#9ca3af',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginTop: '-200px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <i className="fas fa-chart-line" style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}></i>
                    <p style={{ margin: 0 }}>No trend data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );

  const renderExports = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Data Exports</h3>
      </div>
      <div className="admin-card-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div style={{
            padding: '1.5rem',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <i className="fas fa-calendar-check" style={{ fontSize: '2rem', color: '#5086E8', marginBottom: '0.75rem' }}></i>
            <h4 style={{ marginBottom: '0.5rem' }}>Bookings Export</h4>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
              Export all booking data as CSV
            </p>
            <button 
              className="admin-btn admin-btn-primary"
              onClick={() => handleExport('bookings')}
            >
              <i className="fas fa-download"></i> Download CSV
            </button>
          </div>

          <div style={{
            padding: '1.5rem',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <i className="fas fa-users" style={{ fontSize: '2rem', color: '#10b981', marginBottom: '0.75rem' }}></i>
            <h4 style={{ marginBottom: '0.5rem' }}>Users Export</h4>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
              Export user data as CSV
            </p>
            <button 
              className="admin-btn admin-btn-secondary"
              disabled
              title="Coming soon"
            >
              <i className="fas fa-download"></i> Coming Soon
            </button>
          </div>

          <div style={{
            padding: '1.5rem',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <i className="fas fa-store" style={{ fontSize: '2rem', color: '#f59e0b', marginBottom: '0.75rem' }}></i>
            <h4 style={{ marginBottom: '0.5rem' }}>Vendors Export</h4>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
              Export vendor data as CSV
            </p>
            <button 
              className="admin-btn admin-btn-secondary"
              disabled
              title="Coming soon"
            >
              <i className="fas fa-download"></i> Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const [showCancelEmailModal, setShowCancelEmailModal] = useState(false);
  const [emailToCancel, setEmailToCancel] = useState(null);

  const handleCancelEmail = (emailId) => {
    setEmailToCancel(emailId);
    setShowCancelEmailModal(true);
  };

  const confirmCancelEmail = async () => {
    if (!emailToCancel) return;
    setShowCancelEmailModal(false);
    try {
      await adminApi.cancelQueuedEmail(emailToCancel, 'Cancelled by admin');
      fetchEmailQueue();
    } catch (err) {
      console.error('Failed to cancel email:', err);
    } finally {
      setEmailToCancel(null);
    }
  };

  const renderEmailLogs = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Email Logs</h3>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={fetchEmailLogs}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>
      {loading ? (
        <div className="admin-loading"><div className="admin-loading-spinner"></div><p>Loading...</p></div>
      ) : emailLogs.length === 0 ? (
        <div className="admin-empty-state"><i className="fas fa-envelope"></i><h3>No Email Logs</h3><p>No emails sent yet</p></div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr><th>Recipient</th><th>Subject</th><th>Template</th><th>Status</th><th>Sent</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {emailLogs.map((log, idx) => (
                  <tr key={log.LogID || log.id || idx}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{log.RecipientEmail || log.email}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{log.RecipientName || ''}</div>
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.Subject || log.subject}</td>
                    <td><span className="admin-badge admin-badge-info">{log.TemplateName || log.template || 'Custom'}</span></td>
                    <td><span className={`admin-badge ${log.Status === 'sent' || log.status === 'sent' ? 'admin-badge-success' : 'admin-badge-danger'}`}>{log.Status || log.status}</span></td>
                    <td>{formatRelativeTime(log.SentAt || log.sentAt || log.createdAt)}</td>
                    <td>
                      <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => { setSelectedEmail(log); setShowEmailPreview(true); }}><i className="fas fa-eye"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {Math.ceil(logsTotal / logsLimit) > 1 && (
            <div className="admin-pagination">
              <div className="admin-pagination-info">Page {logsPage} of {Math.ceil(logsTotal / logsLimit)}</div>
              <div className="admin-pagination-buttons">
                <button className="admin-pagination-btn" onClick={() => setLogsPage(p => p - 1)} disabled={logsPage === 1}><i className="fas fa-chevron-left"></i></button>
                <button className="admin-pagination-btn" onClick={() => setLogsPage(p => p + 1)} disabled={logsPage >= Math.ceil(logsTotal / logsLimit)}><i className="fas fa-chevron-right"></i></button>
              </div>
            </div>
          )}
        </>
      )}
      <UniversalModal isOpen={showEmailPreview} onClose={() => setShowEmailPreview(false)} title="Email Preview" size="large">
        {selectedEmail && (
          <div>
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                <strong>To:</strong><span>{selectedEmail.RecipientEmail || selectedEmail.email}</span>
                <strong>Subject:</strong><span>{selectedEmail.Subject || selectedEmail.subject}</span>
                <strong>Sent:</strong><span>{formatDate(selectedEmail.SentAt || selectedEmail.sentAt)}</span>
              </div>
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', maxHeight: '400px', overflow: 'auto' }}>
              <div dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody || selectedEmail.HtmlBody || selectedEmail.body || '<p>No preview available</p>' }} />
            </div>
          </div>
        )}
      </UniversalModal>
    </div>
  );

  const renderEmailQueue = () => (
    <>
      {emailQueueStats && (
        <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="admin-stat-card"><div className="admin-stat-icon blue"><i className="fas fa-clock"></i></div><div className="admin-stat-content"><div className="admin-stat-value">{emailQueueStats.pending || 0}</div><div className="admin-stat-label">Pending</div></div></div>
          <div className="admin-stat-card"><div className="admin-stat-icon orange"><i className="fas fa-spinner"></i></div><div className="admin-stat-content"><div className="admin-stat-value">{emailQueueStats.processing || 0}</div><div className="admin-stat-label">Processing</div></div></div>
          <div className="admin-stat-card"><div className="admin-stat-icon green"><i className="fas fa-check"></i></div><div className="admin-stat-content"><div className="admin-stat-value">{emailQueueStats.sent || 0}</div><div className="admin-stat-label">Sent Today</div></div></div>
          <div className="admin-stat-card"><div className="admin-stat-icon red"><i className="fas fa-times"></i></div><div className="admin-stat-content"><div className="admin-stat-value">{emailQueueStats.failed || 0}</div><div className="admin-stat-label">Failed</div></div></div>
        </div>
      )}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Email Queue</h3>
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={fetchEmailQueue}><i className="fas fa-sync-alt"></i> Refresh</button>
        </div>
        {loading ? (
          <div className="admin-loading"><div className="admin-loading-spinner"></div><p>Loading...</p></div>
        ) : emailQueue.length === 0 ? (
          <div className="admin-empty-state"><i className="fas fa-inbox"></i><h3>Queue Empty</h3><p>No emails in queue</p></div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead><tr><th>Recipient</th><th>Subject</th><th>Status</th><th>Scheduled</th><th>Attempts</th><th>Actions</th></tr></thead>
              <tbody>
                {emailQueue.map((email, idx) => (
                  <tr key={email.QueueID || email.id || idx}>
                    <td>{email.RecipientEmail || email.email}</td>
                    <td>{email.Subject || email.subject}</td>
                    <td><span className={`admin-badge ${email.Status === 'pending' ? 'admin-badge-warning' : email.Status === 'sent' ? 'admin-badge-success' : 'admin-badge-danger'}`}>{email.Status || email.status}</span></td>
                    <td>{formatRelativeTime(email.ScheduledAt || email.scheduledAt)}</td>
                    <td>{email.Attempts || 0}</td>
                    <td>{(email.Status === 'pending') && (<button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleCancelEmail(email.QueueID || email.id)}><i className="fas fa-times"></i></button>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );

  const renderLogs = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Security & Audit Logs</h3>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={fetchSecurityLogs}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading logs...</p>
        </div>
      ) : securityLogs.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fas fa-shield-alt"></i>
          <h3>No Logs</h3>
          <p>No security logs found</p>
        </div>
      ) : (
        <>
          <div className="admin-card-body" style={{ padding: 0 }}>
            {securityLogs.map((log, idx) => {
              const iconStyle = getLogIcon(log.EventType || log.type);
              return (
                <div 
                  key={log.LogID || log.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.875rem 1.25rem',
                    borderBottom: '1px solid #f3f4f6'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: `${iconStyle.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: iconStyle.color,
                    flexShrink: 0
                  }}>
                    <i className={`fas ${iconStyle.icon}`}></i>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, marginBottom: '0.125rem' }}>
                      {log.Description || log.description || log.EventType || log.type}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {log.UserEmail || log.email || 'System'} • {log.IPAddress || log.ip || 'N/A'}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                    {formatRelativeTime(log.CreatedAt || log.createdAt || log.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>

          {logsTotalPages > 1 && (
            <div className="admin-pagination">
              <div className="admin-pagination-info">
                Showing {((logsPage - 1) * logsLimit) + 1} to {Math.min(logsPage * logsLimit, logsTotal)} of {logsTotal}
              </div>
              <div className="admin-pagination-buttons">
                <button 
                  className="admin-pagination-btn" 
                  onClick={() => setLogsPage(p => p - 1)} 
                  disabled={logsPage === 1}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button 
                  className="admin-pagination-btn" 
                  onClick={() => setLogsPage(p => p + 1)} 
                  disabled={logsPage === logsTotalPages}
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

  return (
    <div className="admin-section">
      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <i className="fas fa-chart-pie" style={{ marginRight: '0.5rem' }}></i>Overview
        </button>
        <button className={`admin-tab ${activeTab === 'exports' ? 'active' : ''}`} onClick={() => setActiveTab('exports')}>
          <i className="fas fa-download" style={{ marginRight: '0.5rem' }}></i>Exports
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'exports' && renderExports()}

      {/* Cancel Email Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelEmailModal}
        onClose={() => { setShowCancelEmailModal(false); setEmailToCancel(null); }}
        title="Cancel Queued Email"
        message="Are you sure you want to cancel this queued email?"
        confirmLabel="Cancel Email"
        cancelLabel="Go Back"
        onConfirm={confirmCancelEmail}
        variant="warning"
      />
    </div>
  );
}

export default AnalyticsSection;
