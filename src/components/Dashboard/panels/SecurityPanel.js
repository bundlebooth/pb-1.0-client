import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { showBanner } from '../../../utils/helpers';
import { API_BASE_URL } from '../../../config';

function SecurityPanel({ onBack, embedded = false }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [lastLogin, setLastLogin] = useState(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [toggling2FA, setToggling2FA] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const INITIAL_ACTIVITY_COUNT = 5;

  useEffect(() => {
    loadSecurityData();
  }, [currentUser]);

  const loadSecurityData = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/security/sessions?limit=10`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
        setLastLogin(data.lastLogin);
        setTwoFactorEnabled(data.twoFactorEnabled || false);
      }
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    if (!currentUser?.id) return;

    try {
      setToggling2FA(true);
      const newState = !twoFactorEnabled;
      
      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/security/2fa/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ enabled: newState })
      });

      if (response.ok) {
        setTwoFactorEnabled(newState);
        showBanner(newState ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update 2FA settings');
      }
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      showBanner(error.message || 'Failed to update 2FA settings', 'error');
    } finally {
      setToggling2FA(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!currentUser?.id) return;

    try {
      setLoggingOutAll(true);
      
      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/security/logout-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        showBanner('All other sessions have been logged out', 'success');
        loadSecurityData(); // Refresh the data
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to logout all sessions');
      }
    } catch (error) {
      console.error('Error logging out all devices:', error);
      showBanner(error.message || 'Failed to logout all sessions', 'error');
    } finally {
      setLoggingOutAll(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Unknown';
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Unknown';
    }
  };

  const parseUserAgent = (userAgent) => {
    if (!userAgent) return { browser: 'Unknown', os: 'Unknown' };
    
    let browser = 'Unknown';
    let os = 'Unknown';
    
    // Detect browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edg')) browser = 'Edge';
    else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera';
    
    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    
    return { browser, os };
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'Login': return 'fa-sign-in-alt';
      case 'Logout': return 'fa-sign-out-alt';
      case 'LoginFailed': return 'fa-exclamation-triangle';
      case 'PasswordResetRequested': return 'fa-envelope';
      case 'PasswordResetCompleted': return 'fa-check-circle';
      default: return 'fa-shield-alt';
    }
  };

  const getActionColor = (action, status) => {
    if (status === 'Failed' || action === 'LoginFailed') return '#ef4444';
    if (action === 'Login') return '#10b981';
    if (action === 'Logout') return '#6b7280';
    return '#3b82f6';
  };

  if (loading) {
    return (
      <div>
        {!embedded && (
          <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
            <i className="fas fa-arrow-left"></i> Back to Settings
          </button>
        )}
        <div className="dashboard-card">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!embedded && (
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Settings
        </button>
      )}
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-shield-alt"></i>
          </span>
          Security
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Manage your account security settings.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

        {/* Last Login Info */}
        {lastLogin && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fas fa-clock" style={{ color: 'var(--primary)' }}></i>
              Last Login
            </h3>
            <div style={{ 
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Date & Time</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 500 }}>{formatDate(lastLogin.timestamp)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Location</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 500 }}>{lastLogin.location || 'Unknown'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>IP Address</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 500 }}>{lastLogin.ipAddress || 'Unknown'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Device</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 500 }}>
                    {lastLogin.device || (() => {
                      const { browser, os } = parseUserAgent(lastLogin.userAgent);
                      return `${browser} on ${os}`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two-Factor Authentication */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-mobile-alt" style={{ color: 'var(--primary)' }}></i>
            Two-Factor Authentication
          </h3>
          <div style={{ 
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.25rem', fontWeight: 500 }}>
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                Add an extra layer of security to your account by requiring a verification code when signing in.
              </p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', cursor: toggling2FA ? 'not-allowed' : 'pointer', opacity: toggling2FA ? 0.6 : 1 }}>
              <input 
                type="checkbox" 
                checked={twoFactorEnabled} 
                onChange={handleToggle2FA}
                disabled={toggling2FA}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: twoFactorEnabled ? '#4F86E8' : '#E5E7EB',
                borderRadius: '26px',
                transition: 'background-color 0.3s'
              }}>
                <span style={{
                  position: 'absolute',
                  height: '22px',
                  width: '22px',
                  left: twoFactorEnabled ? '26px' : '2px',
                  top: '2px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: 'left 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}></span>
              </span>
            </label>
          </div>
        </div>

        {/* Active Sessions / Login History */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <i className="fas fa-history" style={{ color: 'var(--primary)' }}></i>
              Login Activity
            </h3>
            <button
              onClick={handleLogoutAllDevices}
              disabled={loggingOutAll}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: loggingOutAll ? 'not-allowed' : 'pointer',
                opacity: loggingOutAll ? 0.6 : 1
              }}
            >
              <i className="fas fa-sign-out-alt" style={{ marginRight: '6px' }}></i>
              {loggingOutAll ? 'Logging out...' : 'Log out all devices'}
            </button>
          </div>
          
          {(() => {
            // Separate active sessions (successful logins) from activity history
            const activeDevices = sessions.filter(s => s.action === 'Login' && s.status === 'Success');
            const activityToShow = showAllActivity ? sessions : sessions.slice(0, INITIAL_ACTIVITY_COUNT);
            
            return (
              <>
                {/* Currently Logged In Devices */}
                {activeDevices.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.75rem' }}>
                      <i className="fas fa-desktop" style={{ marginRight: '0.5rem', color: '#4F86E8' }}></i>
                      Active Devices ({activeDevices.length})
                    </h4>
                    <div style={{ 
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      {activeDevices.slice(0, 3).map((device, index) => {
                        const { browser, os } = parseUserAgent(device.userAgent);
                        return (
                          <div 
                            key={device.id}
                            style={{ 
                              padding: '0.75rem 1rem',
                              background: index % 2 === 0 ? '#fff' : '#f9fafb',
                              borderBottom: index < Math.min(activeDevices.length, 3) - 1 ? '1px solid var(--border)' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem'
                            }}
                          >
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              background: '#4F86E815',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <i className={`fas ${os === 'Windows' ? 'fa-windows' : os === 'macOS' ? 'fa-apple' : os === 'iOS' ? 'fa-mobile-alt' : os === 'Android' ? 'fa-android' : 'fa-desktop'}`} style={{ color: '#4F86E8', fontSize: '0.8rem' }}></i>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
                                {browser} on {os}
                              </p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', margin: 0 }}>
                                {device.ipAddress || 'Unknown IP'} • Last active {formatDate(device.timestamp)}
                              </p>
                            </div>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              padding: '2px 8px', 
                              background: '#10b98115', 
                              color: '#10b981', 
                              borderRadius: '4px',
                              fontWeight: 500
                            }}>Active</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <h4 style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.75rem' }}>
                  Recent Activity
                </h4>
                {sessions.length === 0 ? (
                  <div style={{ 
                    padding: '2rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                    color: 'var(--text-light)'
                  }}>
                    <i className="fas fa-history" style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}></i>
                    <p>No login activity found</p>
                  </div>
                ) : (
                  <>
                    <div style={{ 
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      {activityToShow.map((session, index) => {
                        const { browser, os } = parseUserAgent(session.userAgent);
                        return (
                          <div 
                            key={session.id}
                            style={{ 
                              padding: '1rem',
                              background: index % 2 === 0 ? '#fff' : '#f9fafb',
                              borderBottom: index < activityToShow.length - 1 ? '1px solid var(--border)' : 'none',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '1rem'
                            }}
                          >
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: `${getActionColor(session.action, session.status)}15`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <i className={`fas ${getActionIcon(session.action)}`} style={{ color: getActionColor(session.action, session.status), fontSize: '0.85rem' }}></i>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div>
                                  <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
                                    {session.action === 'Login' && session.status === 'Success' ? 'Successful login' :
                                     session.action === 'LoginFailed' ? 'Failed login attempt' :
                                     session.action === 'Logout' ? 'Logged out' :
                                     session.action === 'PasswordResetRequested' ? 'Password reset requested' :
                                     session.action === 'PasswordResetCompleted' ? 'Password reset completed' :
                                     session.action}
                                  </p>
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '0.25rem 0 0 0' }}>
                                    {session.device || `${browser} on ${os}`} • {session.ipAddress || 'Unknown IP'}
                                    {session.location && ` • ${session.location}`}
                                  </p>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', margin: 0, whiteSpace: 'nowrap' }}>
                                  {formatDate(session.timestamp)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {sessions.length > INITIAL_ACTIVITY_COUNT && (
                      <button
                        onClick={() => setShowAllActivity(!showAllActivity)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          marginTop: '0.75rem',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: '#4F86E8',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        {showAllActivity ? (
                          <><i className="fas fa-chevron-up" style={{ marginRight: '0.5rem' }}></i>Show Less</>
                        ) : (
                          <><i className="fas fa-chevron-down" style={{ marginRight: '0.5rem' }}></i>Show More ({sessions.length - INITIAL_ACTIVITY_COUNT} more)</>  
                        )}
                      </button>
                    )}
                  </>
                )}
              </>
            );
          })()}
        </div>

        {/* Security Tips */}
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-info-circle" style={{ color: 'var(--primary)' }}></i>
            Security Tips
          </h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-light)', fontSize: '0.9rem', lineHeight: 1.8 }}>
            <li>Use a strong, unique password for your account</li>
            <li>Enable two-factor authentication for extra security</li>
            <li>Log out when using shared devices</li>
            <li>Review your login activity regularly</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default SecurityPanel;
