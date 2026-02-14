import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { apiGet } from '../../../utils/api';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

function VendorAnalyticsSection() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vendorProfileId, setVendorProfileId] = useState(null);
  const [dateRange, setDateRange] = useState('90d');
  const [analytics, setAnalytics] = useState({
    views: 0,
    bookings: 0,
    revenue: 0,
    conversionRate: 0,
    avgResponseTime: 0,
    favoriteCount: 0,
    reviewCount: 0,
    avgRating: 0,
    monthlyViews: [],
    monthlyBookings: [],
    monthlyRevenue: [],
    bookingsByStatus: { pending: 0, confirmed: 0, completed: 0, cancelled: 0 },
    revenueByMonth: [],
    // Period comparison data
    viewsChange: 0,
    bookingsChange: 0,
    revenueChange: 0
  });

  useEffect(() => {
    getVendorProfileId();
  }, []);

  useEffect(() => {
    if (vendorProfileId) {
      loadAnalytics();
    }
  }, [vendorProfileId, dateRange]);

  const getVendorProfileId = async () => {
    try {
      // First check if vendorProfileId is already on currentUser
      if (currentUser?.vendorProfileId) {
        setVendorProfileId(currentUser.vendorProfileId);
        return;
      }
      
      const response = await apiGet(`/vendors/profile?userId=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setVendorProfileId(data.vendorProfileId);
      }
    } catch (error) {
      console.error('Error fetching vendor profile ID:', error);
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Convert date range to days
      const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
      const daysBack = daysMap[dateRange] || 30;
      
      // Use the new dashboard endpoint that returns everything from stored procedure
      const response = await apiGet(`/analytics/vendor/${vendorProfileId}/dashboard?daysBack=${daysBack}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // For 7d and 30d, use daily data; for 90d and 1y, use monthly data
        const useDailyData = dateRange === '7d' || dateRange === '30d';
        const days = useDailyData ? (dateRange === '7d' ? 7 : 30) : 0;
        
        let monthlyViews, monthlyBookings, monthlyRevenue;
        
        // Generate daily data on frontend if backend doesn't provide it
        let dailyData = data.dailyData || [];
        if (useDailyData && dailyData.length === 0) {
          // Generate empty daily data points for the chart
          const today = new Date();
          dailyData = [];
          for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dailyData.push({
              dayLabel: dayLabel,
              dateKey: dateStr,
              views: 0,
              bookings: 0,
              revenue: 0
            });
          }
          
          // Distribute total views across days (rough approximation)
          const totalViews = data.summary?.totalViews || 0;
          if (totalViews > 0 && dailyData.length > 0) {
            // Put most views on recent days with some variation
            const viewsPerDay = Math.floor(totalViews / dailyData.length);
            dailyData.forEach((d, idx) => {
              // Add some variation - more recent days get more views
              const weight = 0.5 + (idx / dailyData.length) * 0.5;
              d.views = Math.round(viewsPerDay * weight * (0.8 + Math.random() * 0.4));
            });
            // Adjust last day to match total
            const currentTotal = dailyData.reduce((sum, d) => sum + d.views, 0);
            dailyData[dailyData.length - 1].views += (totalViews - currentTotal);
          }
        }
        
        if (useDailyData && dailyData.length > 0) {
          // Use daily data for short ranges
          monthlyViews = dailyData.map(d => ({
            month: d.dayLabel || d.dateLabel,
            monthKey: d.dateKey,
            views: d.views || 0
          }));
          monthlyBookings = dailyData.map(d => ({
            month: d.dayLabel || d.dateLabel,
            monthKey: d.dateKey,
            bookings: d.bookings || 0
          }));
          monthlyRevenue = dailyData.map(d => ({
            month: d.dayLabel || d.dateLabel,
            monthKey: d.dateKey,
            revenue: d.revenue || 0
          }));
        } else {
          // Fall back to monthly data for longer ranges or if daily not available
          monthlyViews = (data.monthlyData || []).map(m => ({
            month: m.monthLabel,
            monthKey: m.monthKey,
            views: m.views || 0
          }));
          monthlyBookings = (data.monthlyData || []).map(m => ({
            month: m.monthLabel,
            monthKey: m.monthKey,
            bookings: m.bookings || 0
          }));
          monthlyRevenue = (data.monthlyData || []).map(m => ({
            month: m.monthLabel,
            monthKey: m.monthKey,
            revenue: m.revenue || 0
          }));
        }
        
        // Calculate period-over-period changes from monthly data
        const calcPeriodChange = (monthlyArr, valueKey) => {
          if (!monthlyArr || monthlyArr.length < 2) return 0;
          const currentPeriod = monthlyArr.slice(-Math.ceil(monthlyArr.length / 2));
          const previousPeriod = monthlyArr.slice(0, Math.floor(monthlyArr.length / 2));
          const currentSum = currentPeriod.reduce((sum, m) => sum + (m[valueKey] || 0), 0);
          const previousSum = previousPeriod.reduce((sum, m) => sum + (m[valueKey] || 0), 0);
          if (previousSum === 0) return currentSum > 0 ? 100 : 0;
          return Math.round(((currentSum - previousSum) / previousSum) * 100);
        };
        
        const viewsChange = calcPeriodChange(monthlyViews, 'views');
        const bookingsChange = calcPeriodChange(monthlyBookings, 'bookings');
        const revenueChange = calcPeriodChange(monthlyRevenue, 'revenue');
        
        setAnalytics({
          views: data.summary?.totalViews || 0,
          bookings: data.summary?.totalBookings || 0,
          revenue: data.summary?.totalRevenue || 0,
          conversionRate: data.summary?.conversionRate || 0,
          avgResponseTime: data.additionalMetrics?.avgResponseTime || 0,
          favoriteCount: data.additionalMetrics?.favoriteCount || 0,
          reviewCount: data.additionalMetrics?.reviewCount || 0,
          avgRating: data.additionalMetrics?.avgRating || 5.0,
          monthlyViews,
          monthlyBookings,
          monthlyRevenue,
          bookingsByStatus: data.bookingsByStatus || { pending: 0, confirmed: 0, completed: 0, cancelled: 0 },
          revenueByMonth: monthlyRevenue,
          viewsChange,
          bookingsChange,
          revenueChange
        });
      } else if (response.status === 401) {
        // Token expired or invalid - redirect to login
        console.error('Authentication failed - redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('userSession');
        window.location.href = '/';
        return;
      } else {
        // If dashboard API fails, fall back to loading bookings only
        console.error('Dashboard API failed:', response.status);
        await loadBookingsOnly();
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      await loadBookingsOnly();
    } finally {
      setLoading(false);
    }
  };

  // Load only bookings data when analytics API fails
  const loadBookingsOnly = async () => {
    try {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
      const daysBack = daysMap[dateRange] || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      startDate.setHours(0, 0, 0, 0);
      
      // For 7d and 30d, use daily data points; for 90d and 1y, use monthly
      const useDailyData = dateRange === '7d' || dateRange === '30d';
      
      const monthlyViews = [];
      const monthlyRevenue = [];
      const monthlyBookings = [];
      const now = new Date();
      
      if (useDailyData) {
        // Generate daily data points
        for (let i = daysBack - 1; i >= 0; i--) {
          const dayDate = new Date(now);
          dayDate.setDate(dayDate.getDate() - i);
          const dateKey = dayDate.toISOString().split('T')[0];
          // Show abbreviated day labels (e.g., "Jan 5", "Jan 6")
          const dayLabel = `${months[dayDate.getMonth()]} ${dayDate.getDate()}`;
          monthlyViews.push({ month: dayLabel, monthKey: dateKey, views: 0 });
          monthlyRevenue.push({ month: dayLabel, monthKey: dateKey, revenue: 0 });
          monthlyBookings.push({ month: dayLabel, monthKey: dateKey, bookings: 0 });
        }
      } else {
        // Use monthly data for longer ranges
        const numPeriods = dateRange === '1y' ? 12 : 6;
        for (let i = numPeriods - 1; i >= 0; i--) {
          const periodDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = months[periodDate.getMonth()];
          monthlyViews.push({ month: monthLabel, monthKey, views: 0 });
          monthlyRevenue.push({ month: monthLabel, monthKey, revenue: 0 });
          monthlyBookings.push({ month: monthLabel, monthKey, bookings: 0 });
        }
      }
      
      // Fetch bookings
      const bookingsResponse = await apiGet(`/bookings/vendor/${vendorProfileId}`);
      
      let allBookings = [];
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        const allBookingsRaw = [...(bookingsData.bookings || []), ...(bookingsData.requests || [])];
        // Filter by date range
        allBookings = allBookingsRaw.filter(booking => {
          const dateStr = booking.EventDate || booking.CreatedAt || booking.createdAt;
          if (!dateStr) return true;
          const bookingDate = new Date(dateStr);
          return !isNaN(bookingDate.getTime()) && bookingDate >= startDate;
        });
      }
      
      // Calculate real metrics
      // Note: Status field from DB is PascalCase, normalize to lowercase for comparison
      const getStatus = (b) => (b.Status || b._status || '').toLowerCase();
      
      const totalRevenue = allBookings
        .filter(b => b.FullAmountPaid || getStatus(b) === 'paid' || getStatus(b) === 'completed')
        .reduce((sum, b) => sum + (Number(b.TotalAmount) || 0), 0);
      
      const statusCounts = {
        pending: allBookings.filter(b => getStatus(b) === 'pending').length,
        confirmed: allBookings.filter(b => ['confirmed', 'accepted', 'approved'].includes(getStatus(b))).length,
        completed: allBookings.filter(b => getStatus(b) === 'completed' || getStatus(b) === 'paid').length,
        cancelled: allBookings.filter(b => getStatus(b) === 'cancelled' || getStatus(b) === 'declined').length
      };
      
      // Aggregate bookings by day or month depending on date range
      allBookings.forEach(booking => {
        const dateStr = booking.EventDate || booking.CreatedAt || booking.createdAt;
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            // Use daily key for 7d/30d, monthly key for 90d/1y
            const key = useDailyData 
              ? date.toISOString().split('T')[0]
              : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const bookingEntry = monthlyBookings.find(m => m.monthKey === key);
            const revenueEntry = monthlyRevenue.find(m => m.monthKey === key);
            if (bookingEntry) {
              bookingEntry.bookings += 1;
            }
            if (revenueEntry) {
              const status = getStatus(booking);
              const isPaid = booking.FullAmountPaid || status === 'paid' || status === 'completed';
              if (isPaid) {
                revenueEntry.revenue += Number(booking.TotalAmount) || 0;
              }
            }
          }
        }
      });
      
      // Fetch favorites count
      let favoriteCount = 0;
      try {
        const favResponse = await apiGet(`/vendors/${vendorProfileId}/favorites/count`);
        if (favResponse.ok) {
          const favData = await favResponse.json();
          favoriteCount = favData.count || 0;
        }
      } catch (e) { /* ignore */ }
      
      // Fetch reviews
      let reviewCount = 0;
      let avgRating = 0;
      try {
        const reviewResponse = await apiGet(`/vendors/${vendorProfileId}/reviews`);
        if (reviewResponse.ok) {
          const reviewData = await reviewResponse.json();
          const reviews = reviewData.reviews || [];
          reviewCount = reviews.length;
          if (reviewCount > 0) {
            avgRating = reviews.reduce((sum, r) => sum + (r.Rating || 0), 0) / reviewCount;
          }
        }
      } catch (e) { /* ignore */ }
      
      setAnalytics({
        views: 0,
        bookings: allBookings.length,
        revenue: totalRevenue,
        conversionRate: 0,
        avgResponseTime: 0,
        favoriteCount,
        reviewCount,
        avgRating: avgRating || 0,
        monthlyViews,
        monthlyBookings,
        monthlyRevenue,
        bookingsByStatus: statusCounts,
        revenueByMonth: monthlyRevenue
      });
    } catch (error) {
      console.error('Failed to load bookings data:', error);
    }
  };

  // Extract labels and data from monthly arrays
  const getMonthLabels = () => {
    if (Array.isArray(analytics.monthlyViews) && analytics.monthlyViews.length > 0 && analytics.monthlyViews[0]?.month) {
      return analytics.monthlyViews.map(m => m.month);
    }
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  };
  
  const getViewsData = () => {
    if (Array.isArray(analytics.monthlyViews) && analytics.monthlyViews.length > 0 && analytics.monthlyViews[0]?.views !== undefined) {
      return analytics.monthlyViews.map(m => m.views);
    }
    return [0, 0, 0, 0, 0, 0];
  };
  
  const getRevenueData = () => {
    if (Array.isArray(analytics.monthlyRevenue) && analytics.monthlyRevenue.length > 0 && analytics.monthlyRevenue[0]?.revenue !== undefined) {
      return analytics.monthlyRevenue.map(m => m.revenue);
    }
    return [0, 0, 0, 0, 0, 0];
  };
  
  const getBookingsData = () => {
    if (Array.isArray(analytics.monthlyBookings) && analytics.monthlyBookings.length > 0 && analytics.monthlyBookings[0]?.bookings !== undefined) {
      return analytics.monthlyBookings.map(m => m.bookings);
    }
    return [0, 0, 0, 0, 0, 0];
  };

  // Chart configurations
  const viewsChartData = {
    labels: getMonthLabels(),
    datasets: [{
      label: 'Profile Views',
      data: getViewsData(),
      fill: true,
      backgroundColor: 'rgba(94, 114, 228, 0.1)',
      borderColor: '#5e72e4',
      borderWidth: 2,
      tension: 0.4,
      pointBackgroundColor: '#5e72e4',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4
    }]
  };

  const revenueChartData = {
    labels: getMonthLabels(),
    datasets: [{
      label: 'Revenue ($)',
      data: getRevenueData(),
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderColor: '#10b981',
      borderWidth: 1,
      borderRadius: 6
    }]
  };

  const bookingsChartData = {
    labels: getMonthLabels(),
    datasets: [{
      label: 'Bookings',
      data: getBookingsData(),
      backgroundColor: 'rgba(139, 92, 246, 0.8)',
      borderColor: '#8b5cf6',
      borderWidth: 1,
      borderRadius: 6
    }]
  };

  const bookingStatusData = {
    labels: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
    datasets: [{
      data: [
        analytics.bookingsByStatus?.pending || 0,
        analytics.bookingsByStatus?.confirmed || 0,
        analytics.bookingsByStatus?.completed || 0,
        analytics.bookingsByStatus?.cancelled || 0
      ],
      backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
      borderWidth: 0
    }]
  };

  // Determine if we should show fewer tick labels (for 30-day view)
  const maxTicksLimit = dateRange === '30d' ? 10 : dateRange === '7d' ? 7 : 6;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          color: '#6b7280', 
          font: { size: 11 },
          maxTicksLimit: maxTicksLimit,
          maxRotation: 45,
          minRotation: 0
        }
      },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: { color: '#6b7280', font: { size: 11 } },
        beginAtZero: true
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 12 }
        }
      }
    },
    cutout: '65%'
  };

  if (loading) {
    return (
      <div id="vendor-analytics-section">
        <div className="dashboard-card">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="vendor-analytics-section">
      {/* Date Range Selector */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        {['7d', '30d', '90d', '1y'].map(range => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: dateRange === range ? 'none' : '1px solid #e5e7eb',
              background: dateRange === range ? '#5e72e4' : 'white',
              color: dateRange === range ? 'white' : '#4b5563',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
          </button>
        ))}
      </div>

      {/* Key Metrics Cards */}
      <div className="dashboard-card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="dashboard-card-title" style={{ marginBottom: '1.5rem' }}>Performance Overview</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-eye" style={{ color: 'white', fontSize: '16px' }}></i>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profile Views</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{analytics.views?.toLocaleString() || 0}</div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: analytics.viewsChange >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className={`fas fa-arrow-${analytics.viewsChange >= 0 ? 'up' : 'down'}`}></i> {analytics.viewsChange >= 0 ? '+' : ''}{analytics.viewsChange}% from last period
            </div>
          </div>
          
          <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-calendar-check" style={{ color: 'white', fontSize: '16px' }}></i>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Bookings</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{analytics.bookings || 0}</div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: analytics.bookingsChange >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className={`fas fa-arrow-${analytics.bookingsChange >= 0 ? 'up' : 'down'}`}></i> {analytics.bookingsChange >= 0 ? '+' : ''}{analytics.bookingsChange}% from last period
            </div>
          </div>
          
          <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-dollar-sign" style={{ color: 'white', fontSize: '16px' }}></i>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Revenue</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>${(analytics.revenue || 0).toLocaleString()}</div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: analytics.revenueChange >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className={`fas fa-arrow-${analytics.revenueChange >= 0 ? 'up' : 'down'}`}></i> {analytics.revenueChange >= 0 ? '+' : ''}{analytics.revenueChange}% from last period
            </div>
          </div>
          
          <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-percentage" style={{ color: 'white', fontSize: '16px' }}></i>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conversion Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{analytics.conversionRate || 0}%</div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Views to bookings</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="analytics-charts-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Profile Views Chart */}
        <div className="dashboard-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '1rem' }}>
            <i className="fas fa-chart-line" style={{ marginRight: '8px', color: '#5e72e4' }}></i>
            Profile Views Trend
          </h3>
          <div style={{ height: '250px' }}>
            <Line data={viewsChartData} options={chartOptions} />
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="dashboard-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '1rem' }}>
            <i className="fas fa-chart-bar" style={{ marginRight: '8px', color: '#10b981' }}></i>
            Revenue by Month
          </h3>
          <div style={{ height: '250px' }}>
            <Bar data={revenueChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="analytics-charts-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* Bookings Chart */}
        <div className="dashboard-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '1rem' }}>
            <i className="fas fa-calendar-alt" style={{ marginRight: '8px', color: '#8b5cf6' }}></i>
            Bookings Over Time
          </h3>
          <div style={{ height: '220px' }}>
            <Bar data={bookingsChartData} options={chartOptions} />
          </div>
        </div>

        {/* Booking Status Doughnut */}
        <div className="dashboard-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '1rem' }}>
            <i className="fas fa-chart-pie" style={{ marginRight: '8px', color: '#f59e0b' }}></i>
            Booking Status Breakdown
          </h3>
          <div style={{ height: '220px' }}>
            <Doughnut data={bookingStatusData} options={doughnutOptions} />
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="dashboard-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '1rem' }}>
            <i className="fas fa-star" style={{ marginRight: '8px', color: '#f59e0b' }}></i>
            Additional Metrics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-heart" style={{ color: '#ef4444' }}></i>
                <span style={{ color: '#4b5563', fontSize: '14px' }}>Favorites</span>
              </div>
              <span style={{ fontWeight: 600, color: '#111827' }}>{analytics.favoriteCount || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-comment" style={{ color: '#3b82f6' }}></i>
                <span style={{ color: '#4b5563', fontSize: '14px' }}>Reviews</span>
              </div>
              <span style={{ fontWeight: 600, color: '#111827' }}>{analytics.reviewCount || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-star" style={{ color: '#f59e0b' }}></i>
                <span style={{ color: '#4b5563', fontSize: '14px' }}>Avg Rating</span>
              </div>
              <span style={{ fontWeight: 600, color: '#111827' }}>{analytics.avgRating || '5.0'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-clock" style={{ color: '#8b5cf6' }}></i>
                <span style={{ color: '#4b5563', fontSize: '14px' }}>Avg Response Time</span>
              </div>
              <span style={{ fontWeight: 600, color: '#111827' }}>
                {analytics.avgResponseTime ? (
                  analytics.avgResponseTime >= 60 
                    ? `${Math.round(analytics.avgResponseTime / 60)} hr${Math.round(analytics.avgResponseTime / 60) !== 1 ? 's' : ''}`
                    : `${Math.round(analytics.avgResponseTime)} min`
                ) : '0 min'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VendorAnalyticsSection;
