import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import CardRow from '../CardRow';

function VendorDashboardSection({ data, loading, onSectionChange }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [kpiData, setKpiData] = useState({ upcomingBookings: 0, pendingRequests: 0, unreadMessages: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const day = now.getDate();
  const year = now.getFullYear();
  const weekday = now.toLocaleString('en-US', { weekday: 'long' });

  // Handle switching to explore (client) mode
  const handleSwitchToExplore = () => {
    localStorage.setItem('viewMode', 'client');
    window.dispatchEvent(new CustomEvent('viewModeChanged', { detail: { mode: 'client' } }));
    navigate('/');
  };

  // Fetch KPI data and recent bookings
  useEffect(() => {
    const fetchKPIsAndBookings = async () => {
      if (!currentUser?.vendorProfileId) return;
      
      try {
        setLoadingBookings(true);
        // Fetch all bookings to calculate accurate KPIs
        const bookingsResp = await apiGet(`/vendor/${currentUser.vendorProfileId}/bookings/all`);
        
        if (bookingsResp.ok) {
          const bookings = await bookingsResp.json();
          const nowDate = new Date();
          
          // Count upcoming bookings (future events with accepted/confirmed/paid status)
          const upcoming = (bookings || []).filter(b => {
            const eventDate = new Date(b.EventDate);
            const status = (b.Status || '').toLowerCase();
            return eventDate >= nowDate && ['accepted', 'confirmed', 'paid', 'approved'].includes(status);
          }).length;
          
          // Count pending requests
          const pending = (bookings || []).filter(b => 
            (b.Status || '').toLowerCase() === 'pending'
          ).length;
          
          setKpiData(prev => ({ ...prev, upcomingBookings: upcoming, pendingRequests: pending }));
          
          // Get recent bookings (sorted by event date, most recent first)
          const sortedBookings = (bookings || [])
            .sort((a, b) => new Date(b.EventDate) - new Date(a.EventDate))
            .slice(0, 5);
          setRecentBookings(sortedBookings);
        }
        
        // Fetch unread messages count
        const msgResp = await apiGet(`/messages/conversations/vendor/${currentUser.vendorProfileId}`);
        
        if (msgResp.ok) {
          const msgData = await msgResp.json();
          const convs = msgData.conversations || msgData || [];
          const unread = convs.reduce((sum, c) => {
            const count = c.unreadCount || c.UnreadCount || c.unread_count || c.Unread || 0;
            return sum + (typeof count === 'number' ? count : parseInt(count) || 0);
          }, 0);
          setKpiData(prev => ({ ...prev, unreadMessages: unread }));
        }
      } catch (error) {
        console.error('Error fetching KPI data:', error);
      } finally {
        setLoadingBookings(false);
      }
    };
    
    fetchKPIsAndBookings();
  }, [currentUser?.vendorProfileId]);

  const upcomingBookings = kpiData.upcomingBookings;
  const pendingRequests = kpiData.pendingRequests;
  const avgRating = (() => {
    const val = data?.stats?.averageRating ?? data?.stats?.AvgRating ?? data?.averageRating ?? 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  })();
  const unreadMessages = kpiData.unreadMessages || data?.unreadMessages || 0;

  // Load messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentUser?.vendorProfileId) return;
      setLoadingMessages(true);
      try {
        const resp = await apiGet(`/messages/conversations/vendor/${currentUser.vendorProfileId}`);
        if (resp.ok) {
          const msgData = await resp.json();
          const conversations = (msgData.conversations || []).map(conv => ({
            id: conv.id || conv.ConversationID,
            name: conv.OtherPartyName || conv.userName || 'Unknown',
            last: conv.lastMessageContent || conv.LastMessageContent || '',
            ts: new Date(conv.lastMessageCreatedAt || conv.LastMessageCreatedAt || conv.createdAt || Date.now()),
            profilePicUrl: conv.OtherPartyAvatar || conv.OtherPartyLogo || null
          })).sort((a,b) => b.ts - a.ts);
          setMessages(conversations.slice(0, 5));
        }
      } catch (e) {
        console.error('Failed to load messages:', e);
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessages();
  }, [currentUser]);

  const handleKPIClick = (section) => {
    if (onSectionChange) {
      onSectionChange(section);
    }
  };

  if (loading) {
    return (
      <div id="vendor-dashboard-section">
        <div className="vendor-stats">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const renderBookingItem = (booking) => {
    const eventDate = booking.EventDate ? new Date(booking.EventDate) : null;

    const s = (booking.Status || '').toString().toLowerCase();
    const isPaid = booking.FullAmountPaid === true || booking.FullAmountPaid === 1 || s === 'paid';
    
    // Status configuration
    const statusMap = {
      pending:   { color: '#f59e0b', label: 'Pending' },
      confirmed: { color: '#10b981', label: 'Confirmed' },
      accepted:  { color: '#10b981', label: 'Confirmed' },
      approved:  { color: '#10b981', label: 'Confirmed' },
      paid:      { color: '#10b981', label: 'Paid' },
      declined:  { color: '#ef4444', label: 'Declined' },
      cancelled: { color: '#6b7280', label: 'Cancelled' },
      expired:   { color: '#6b7280', label: 'Expired' }
    };
    const status = isPaid ? 'paid' : s;
    const statusCfg = statusMap[status] || statusMap.pending;

    return (
      <div 
        key={booking.BookingID || booking.RequestID} 
        onClick={() => onSectionChange && onSectionChange('bookings')}
        style={{
          borderBottom: '1px solid #e5e7eb',
          cursor: 'pointer'
        }}
      >
        <CardRow
          date={eventDate}
          primaryName={booking.ClientName || 'Client'}
          serviceName={booking.ServiceName || 'Service'}
          location={booking.Location || booking.EventLocation}
          badgeLabel={statusCfg.label}
          badgeColor={statusCfg.color}
          isExpanded={false}
          showChevron={true}
        />
      </div>
    );
  };

  const renderMessageItem = (message) => {
    const initials = (message.name || 'U').trim().charAt(0).toUpperCase();
    const timeStr = message.ts ? message.ts.toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
    const profilePic = message.profilePicUrl || message.ProfilePicUrl || message.userProfilePic;
    
    // Avatar style matching Messages section exactly
    const avatarStyle = {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#5e72e4',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      fontSize: '15px',
      flexShrink: 0
    };
    
    return (
      <div 
        key={message.id} 
        className="message-preview-item"
        onClick={() => handleKPIClick('messages')}
        style={{ cursor: 'pointer' }}
      >
        {profilePic ? (
          <img 
            src={profilePic} 
            alt={message.name || 'User'} 
            style={{ ...avatarStyle, objectFit: 'cover' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div style={{ ...avatarStyle, display: profilePic ? 'none' : 'flex' }}>
          {initials}
        </div>
        <div className="preview-content">
          <div className="preview-name">{message.name}</div>
          <div className="preview-snippet">{message.last}</div>
        </div>
        <div className="preview-time">{timeStr}</div>
      </div>
    );
  };

  return (
    <div id="vendor-dashboard-section">
      {/* Vendor Dashboard Header removed as per user request */}
      
      <div className="vendor-stats stats-top-grid" id="vendor-stats">
        <div className="kpi-grid two-col">
          <div 
            className="kpi-card kpi-click" 
            data-target="vendor-requests"
            data-kpi="upcoming"
            onClick={() => handleKPIClick('vendor-requests')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-icon bookings">
              <i className="fas fa-calendar-check"></i>
            </div>
            <div className="kpi-content">
              <div className="kpi-value">{upcomingBookings}</div>
              <div className="kpi-label">Upcoming Bookings</div>
            </div>
          </div>
          <div 
            className="kpi-card kpi-click" 
            data-target="vendor-requests"
            data-kpi="pending"
            onClick={() => handleKPIClick('vendor-requests')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-icon requests">
              <i className="fas fa-paper-plane"></i>
            </div>
            <div className="kpi-content">
              <div className="kpi-value">{pendingRequests}</div>
              <div className="kpi-label">Pending Requests</div>
            </div>
          </div>
          <div 
            className="kpi-card kpi-click"
            data-target="vendor-reviews"
            onClick={() => handleKPIClick('vendor-reviews')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-icon rating">
              <i className="fas fa-star-half-alt"></i>
            </div>
            <div className="kpi-content">
              <div className="kpi-value">{avgRating.toFixed(1)}</div>
              <div className="kpi-label">Average Rating</div>
            </div>
          </div>
          <div 
            className="kpi-card kpi-click" 
            data-target="vendor-messages"
            onClick={() => handleKPIClick('vendor-messages')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-icon messages">
              <i className="fas fa-envelope"></i>
            </div>
            <div className="kpi-content">
              <div className="kpi-value">{unreadMessages}</div>
              <div className="kpi-label">Unread Messages</div>
            </div>
          </div>
        </div>
        <div className="kpi-card calendar-tile full-height" id="vendor-mini-calendar">
          <div className="cal-header">{month} {year}</div>
          <div className="cal-body">
            <div className="cal-day">{weekday}</div>
            <div className="cal-date">{day}</div>
          </div>
        </div>
      </div>
      <div className="overview-grid">
        <div className="dashboard-card">
          <h2 className="dashboard-card-title">Recent Bookings</h2>
          <div id="vendor-recent-bookings" className="dashboard-fixed-list">
            {loadingBookings ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" style={{ margin: '0 auto' }}></div>
              </div>
            ) : recentBookings.length > 0 ? (
              recentBookings.slice(0, 3).map(renderBookingItem)
            ) : (
              <div className="empty-state">No recent bookings.</div>
            )}
          </div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card-title-row">
            <h2 className="dashboard-card-title">Recent Messages</h2>
            <button 
              className="btn btn-outline" 
              style={{ padding: '.5rem .9rem' }}
              onClick={() => handleKPIClick('vendor-messages')}
            >
              Open Messages
            </button>
          </div>
          <div id="vendor-recent-messages" className="message-preview-list dashboard-fixed-list">
            {loadingMessages ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" style={{ margin: '0 auto' }}></div>
              </div>
            ) : messages && messages.length > 0 ? (
              messages.map(renderMessageItem)
            ) : (
              <div className="empty-state">No recent messages.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VendorDashboardSection;
