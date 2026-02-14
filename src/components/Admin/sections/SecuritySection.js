/**
 * Security Section - Admin Dashboard
 * Security & Logs with Login Activity, Admin Actions, Flagged Items, Locked Accounts, 2FA Settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate, formatRelativeTime } from '../../../utils/formatUtils';
import adminApi from '../../../services/adminApi';
import { ConfirmationModal } from '../../UniversalModal';
import { useAlert } from '../../../context/AlertContext';

function SecuritySection() {
  const { showError, showInfo, showSuccess } = useAlert();
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Data states
  const [securityLogs, setSecurityLogs] = useState([]);
  const [lockedAccounts, setLockedAccounts] = useState([]);
  const [flaggedItems, setFlaggedItems] = useState([]);
  const [twoFASettings, setTwoFASettings] = useState({
    require2FAForAdmins: false,
    require2FAForVendors: false,
    require2FAForUsers: false,
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    lockoutDuration: 30
  });

  // Modal states
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSecurityLogs = useCallback(async (logType = 'login') => {
    try {
      setLoading(true);
      const data = await adminApi.getSecurityLogs({ page, limit, type: logType });
      const logsArray = Array.isArray(data?.logs) ? data.logs : Array.isArray(data) ? data : [];
      setSecurityLogs(logsArray);
      setTotal(data.total || logsArray.length);
    } catch (err) {
      console.error('Error fetching security logs:', err);
      setError('Failed to load security logs');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchLockedAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getLockedAccounts();
      console.log('[SecuritySection] Locked accounts API response:', data);
      const accountsArray = Array.isArray(data?.accounts) ? data.accounts : Array.isArray(data) ? data : [];
      console.log('[SecuritySection] Locked accounts array:', accountsArray);
      setLockedAccounts(accountsArray);
    } catch (err) {
      console.error('Error fetching locked accounts:', err);
      setError('Failed to load locked accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFlaggedItems = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch chat violations from moderation API
      const data = await adminApi.getModerationFlagged({ page: 1, limit: 50, isReviewed: 'false' });
      const itemsArray = Array.isArray(data?.violations) ? data.violations : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setFlaggedItems(itemsArray);
    } catch (err) {
      console.error('Error fetching flagged items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetch2FASettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.get2FASettings();
      const s = data?.settings || data || {};
      setTwoFASettings({
        require2FAForAdmins: s.require2FAForAdmins || false,
        require2FAForVendors: s.require2FAForVendors || false,
        require2FAForUsers: s.require2FAForUsers || false,
        sessionTimeout: s.sessionTimeout || 60,
        maxLoginAttempts: s.failedLoginLockout || 5,
        lockoutDuration: s.lockDurationMinutes || 30
      });
    } catch (err) {
      console.error('Error fetching 2FA settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'login') fetchSecurityLogs('login');
    else if (activeTab === 'admin') fetchSecurityLogs('admin');
    else if (activeTab === 'flagged') fetchFlaggedItems();
    else if (activeTab === 'locked') fetchLockedAccounts();
    else if (activeTab === '2fa') fetch2FASettings();
  }, [activeTab, fetchSecurityLogs, fetchLockedAccounts, fetchFlaggedItems, fetch2FASettings]);

  const handleUnlockAccount = async () => {
    if (!selectedAccount) return;
    setActionLoading(true);
    try {
      const userId = selectedAccount.UserID || selectedAccount.userId || selectedAccount.id;
      await adminApi.unlockUser(userId);
      setShowUnlockModal(false);
      setSelectedAccount(null);
      fetchLockedAccounts();
    } catch (err) {
      console.error('Error unlocking account:', err);
      showError('Failed to unlock account: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = () => {
    // Export functionality placeholder
    showInfo('Export functionality coming soon');
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

  const filteredLogs = securityLogs.filter(log => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      (log.UserEmail || log.email || '').toLowerCase().includes(searchLower) ||
      (log.Description || log.description || '').toLowerCase().includes(searchLower) ||
      (log.IPAddress || log.ip || '').toLowerCase().includes(searchLower)
    );
  });

  const renderLoginActivity = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Login Activity</h3>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => fetchSecurityLogs('login')}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fas fa-sign-in-alt"></i>
          <h3>No Login Activity</h3>
          <p>No login activity recorded</p>
        </div>
      ) : (
        <div className="admin-card-body" style={{ padding: 0 }}>
          {filteredLogs.map((log, idx) => {
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
      )}
    </div>
  );

  const renderAdminActions = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Admin Actions</h3>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => fetchSecurityLogs('admin')}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fas fa-user-shield"></i>
          <h3>No Admin Actions</h3>
          <p>No admin actions recorded</p>
        </div>
      ) : (
        <div className="admin-card-body" style={{ padding: 0 }}>
          {filteredLogs.map((log, idx) => (
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
                background: 'rgba(80, 134, 232, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#5086E8',
                flexShrink: 0
              }}>
                <i className="fas fa-user-shield"></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, marginBottom: '0.125rem' }}>
                  {log.Description || log.description || log.Action || log.action}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  {log.AdminEmail || log.UserEmail || log.email || 'System'}
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                {formatRelativeTime(log.CreatedAt || log.createdAt || log.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFlaggedItems = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">
          <i className="fas fa-flag" style={{ marginRight: '0.5rem', color: '#f59e0b' }}></i>
          Chat Violations & Flagged Content
        </h3>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={fetchFlaggedItems}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>
      <p style={{ padding: '0 1.25rem', color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Content flagged by the moderation system for policy violations including profanity, contact sharing, and other prohibited content.
      </p>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading...</p>
        </div>
      ) : flaggedItems.length === 0 ? (
        <div className="admin-empty-state" style={{ padding: '3rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#10b981' }}></i>
          </div>
          <h3>No Pending Violations</h3>
          <p>All flagged content has been reviewed</p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Detected</th>
                <th>Message Preview</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {flaggedItems.map((item, idx) => (
                <tr key={item.ViolationID || item.id || idx}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 500 }}>{item.UserName || 'Unknown'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{item.UserEmail}</div>
                      {item.IsLocked && (
                        <span className="admin-badge admin-badge-danger" style={{ marginTop: '4px' }}>Locked</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      background: '#fef3c7',
                      color: '#d97706'
                    }}>
                      {item.ViolationType || item.type || 'violation'}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge ${item.Severity >= 3 ? 'admin-badge-danger' : item.Severity >= 2 ? 'admin-badge-warning' : 'admin-badge-info'}`}>
                      {item.Severity >= 3 ? 'Severe' : item.Severity >= 2 ? 'Moderate' : 'Warning'}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#dc2626' }}>
                    {item.DetectedContent || '-'}
                  </td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.OriginalMessage?.substring(0, 50) || '-'}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {formatDate(item.CreatedAt || item.flaggedAt)}
                  </td>
                  <td>
                    <span className={`admin-badge ${item.IsReviewed ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                      {item.IsReviewed ? 'Reviewed' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderLockedAccounts = () => (
    <>
      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="admin-btn admin-btn-secondary" onClick={handleExport}>
          <i className="fas fa-download"></i> Export
        </button>
        <button className="admin-btn admin-btn-primary" onClick={fetchLockedAccounts}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">
            <i className="fas fa-lock" style={{ marginRight: '0.5rem', color: '#ef4444' }}></i>
            Locked Accounts
          </h3>
        </div>
        <p style={{ padding: '0 1.25rem', color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
          All locked accounts including security violations, policy breaches, chat misconduct, and failed login attempts. You can unlock them to restore access.
        </p>
        
        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner"></div>
            <p>Loading locked accounts...</p>
          </div>
        ) : lockedAccounts.length === 0 ? (
          <div className="admin-empty-state" style={{ padding: '3rem' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#10b981' }}></i>
            </div>
            <h3>No Locked Accounts</h3>
            <p>All user accounts are currently accessible.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Lock Type</th>
                  <th>Reason</th>
                  <th>Locked At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lockedAccounts.map((account) => (
                  <tr key={account.UserID || account.userId || account.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#fef2f2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ef4444'
                        }}>
                          <i className="fas fa-lock"></i>
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {account.FirstName || account.firstName || ''} {account.LastName || account.lastName || ''}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                            ID: {account.UserID || account.userId || account.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{account.Email || account.email}</td>
                    <td>
                      <span className={`admin-badge ${
                        (account.LockType || '').toLowerCase().includes('chat') || (account.LockType || '').toLowerCase().includes('violation') 
                          ? 'admin-badge-danger' 
                          : (account.LockType || '').toLowerCase().includes('login') 
                            ? 'admin-badge-warning' 
                            : 'admin-badge-neutral'
                      }`}>
                        {account.LockType || (account.FailedLoginAttempts > 0 ? 'Failed Logins' : 'Manual Lock')}
                        {account.ViolationCount > 0 && ` (${account.ViolationCount})`}
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={account.LockReason || 'No reason provided'}>
                      {account.LockReason || 'No reason provided'}
                    </td>
                    <td>{formatDate(account.LockedAt || account.LockHistoryCreatedAt || account.UpdatedAt)}</td>
                    <td>
                      <button
                        className="admin-btn admin-btn-success admin-btn-sm"
                        onClick={() => {
                          setSelectedAccount(account);
                          setShowUnlockModal(true);
                        }}
                      >
                        <i className="fas fa-unlock"></i> Unlock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f3f4f6' }}>
          <button className="admin-btn admin-btn-secondary" onClick={fetchLockedAccounts}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>
    </>
  );

  const render2FASettings = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">2FA Settings</h3>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading settings...</p>
        </div>
      ) : (
        <div className="admin-card-body">
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={twoFASettings.require2FAForAdmins}
                onChange={(e) => setTwoFASettings({ ...twoFASettings, require2FAForAdmins: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: 500 }}>Require 2FA for Admin Users</span>
            </label>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem', marginLeft: '2rem' }}>
              All admin users must enable two-factor authentication
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={twoFASettings.require2FAForVendors}
                onChange={(e) => setTwoFASettings({ ...twoFASettings, require2FAForVendors: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: 500 }}>Require 2FA for Vendors</span>
            </label>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem', marginLeft: '2rem' }}>
              Vendor accounts must use two-factor authentication
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={twoFASettings.require2FAForUsers}
                onChange={(e) => setTwoFASettings({ ...twoFASettings, require2FAForUsers: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: 500 }}>Require 2FA for Users</span>
            </label>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem', marginLeft: '2rem' }}>
              Client/user accounts must use two-factor authentication
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={twoFASettings.sessionTimeout}
                onChange={(e) => setTwoFASettings({ ...twoFASettings, sessionTimeout: parseInt(e.target.value) || 30 })}
                min="5"
                max="480"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Max Login Attempts
              </label>
              <input
                type="number"
                value={twoFASettings.maxLoginAttempts}
                onChange={(e) => setTwoFASettings({ ...twoFASettings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                min="3"
                max="10"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Lockout Duration (minutes)
              </label>
              <input
                type="number"
                value={twoFASettings.lockoutDuration}
                onChange={(e) => setTwoFASettings({ ...twoFASettings, lockoutDuration: parseInt(e.target.value) || 15 })}
                min="5"
                max="60"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button 
              className="admin-btn admin-btn-primary"
              onClick={async () => {
                try {
                  await adminApi.update2FASettings({
                    require2FAForAdmins: twoFASettings.require2FAForAdmins,
                    require2FAForVendors: twoFASettings.require2FAForVendors,
                    require2FAForUsers: twoFASettings.require2FAForUsers,
                    sessionTimeout: twoFASettings.sessionTimeout,
                    failedLoginLockout: twoFASettings.maxLoginAttempts,
                    lockDurationMinutes: twoFASettings.lockoutDuration
                  });
                  showSuccess('Settings saved successfully');
                } catch (err) {
                  showError('Failed to save settings: ' + err.message);
                }
              }}
            >
              Save Security Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-section">
      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => setActiveTab('login')}>
          <i className="fas fa-sign-in-alt" style={{ marginRight: '0.5rem' }}></i>Login Activity
        </button>
        <button className={`admin-tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
          <i className="fas fa-user-shield" style={{ marginRight: '0.5rem' }}></i>Admin Actions
        </button>
        <button className={`admin-tab ${activeTab === 'flagged' ? 'active' : ''}`} onClick={() => setActiveTab('flagged')}>
          <i className="fas fa-flag" style={{ marginRight: '0.5rem' }}></i>Flagged Items
        </button>
        <button className={`admin-tab ${activeTab === 'locked' ? 'active' : ''}`} onClick={() => setActiveTab('locked')}>
          <i className="fas fa-lock" style={{ marginRight: '0.5rem' }}></i>Locked Accounts
        </button>
        <button className={`admin-tab ${activeTab === '2fa' ? 'active' : ''}`} onClick={() => setActiveTab('2fa')}>
          <i className="fas fa-shield-alt" style={{ marginRight: '0.5rem' }}></i>2FA Settings
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'login' && renderLoginActivity()}
      {activeTab === 'admin' && renderAdminActions()}
      {activeTab === 'flagged' && renderFlaggedItems()}
      {activeTab === 'locked' && renderLockedAccounts()}
      {activeTab === '2fa' && render2FASettings()}

      {/* Unlock Confirmation Modal */}
      <ConfirmationModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        title="Unlock Account"
        message={`Are you sure you want to unlock the account for ${selectedAccount?.Email || selectedAccount?.email || 'this user'}? They will be able to log in again.`}
        confirmLabel={actionLoading ? 'Unlocking...' : 'Unlock Account'}
        onConfirm={handleUnlockAccount}
        variant="success"
      />
    </div>
  );
}

export default SecuritySection;
