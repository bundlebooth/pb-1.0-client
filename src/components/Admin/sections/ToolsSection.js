/**
 * Tools Section - Admin Dashboard
 * Administrative tools: Quick Search and User Impersonation
 */

import React, { useState, useEffect } from 'react';
import { useDebounce } from '../../../hooks/useApi';
import adminApi from '../../../services/adminApi';
import { ConfirmationModal } from '../../UniversalModal';
import { useAlert } from '../../../context/AlertContext';

function ToolsSection() {
  const { showError, showInfo } = useAlert();
  const [activeTab, setActiveTab] = useState('search');
  
  // Quick Search state
  const [quickSearch, setQuickSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Impersonate state
  const [impersonateSearch, setImpersonateSearch] = useState('');
  const [impersonateResults, setImpersonateResults] = useState([]);
  const [impersonating, setImpersonating] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [userToImpersonate, setUserToImpersonate] = useState(null);

  const debouncedQuickSearch = useDebounce(quickSearch, 300);

  // Quick Search effect
  useEffect(() => {
    const searchUsers = async () => {
      if (!debouncedQuickSearch || debouncedQuickSearch.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const data = await adminApi.searchUsers(debouncedQuickSearch);
        setSearchResults(data.results || data || []);
      } catch (err) {
        console.error('Error searching:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };
    searchUsers();
  }, [debouncedQuickSearch]);

  // Load users when impersonate tab is selected
  useEffect(() => {
    if (activeTab === 'impersonate' && !usersLoaded) {
      loadAllUsers();
    }
  }, [activeTab, usersLoaded]);

  const loadAllUsers = async () => {
    setSearching(true);
    try {
      const data = await adminApi.searchUsers('');
      const results = data.results || data || [];
      if (results.length === 0) {
        const dataA = await adminApi.searchUsers('a');
        setImpersonateResults(dataA.results || dataA || []);
      } else {
        setImpersonateResults(results);
      }
      setUsersLoaded(true);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleImpersonateSearch = async () => {
    if (!impersonateSearch || impersonateSearch.length < 1) {
      loadAllUsers();
      return;
    }
    setSearching(true);
    try {
      const data = await adminApi.searchUsers(impersonateSearch);
      setImpersonateResults(data.results || data || []);
    } catch (err) {
      console.error('Error searching users:', err);
      showError('Failed to search users: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleImpersonate = (userId) => {
    setUserToImpersonate(userId);
    setShowImpersonateModal(true);
  };

  const confirmImpersonate = async () => {
    if (!userToImpersonate) return;
    setShowImpersonateModal(false);
    setImpersonating(true);
    try {
      const result = await adminApi.impersonateUser(userToImpersonate);
      if (result.success && result.token) {
        // Store original token and user session
        localStorage.setItem('originalToken', localStorage.getItem('token'));
        localStorage.setItem('originalUserSession', localStorage.getItem('userSession'));
        
        // Set impersonation token and user session
        localStorage.setItem('token', result.token);
        localStorage.setItem('isImpersonating', 'true');
        
        // Update user session with impersonated user data
        const impersonatedUserSession = {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          firstName: result.user.firstName || result.user.name?.split(' ')[0] || '',
          lastName: result.user.lastName || result.user.name?.split(' ').slice(1).join(' ') || '',
          isVendor: result.user.isVendor || false,
          isAdmin: false,
          vendorProfileId: result.user.vendorProfileId || null,
          isImpersonating: true
        };
        localStorage.setItem('userSession', JSON.stringify(impersonatedUserSession));
        
        showInfo(`Now impersonating ${result.user.email}. You will be redirected to the explore page.`).then(() => {
          window.location.href = '/explore';
        });
      }
    } catch (err) {
      showError('Failed to impersonate user: ' + err.message);
    } finally {
      setImpersonating(false);
    }
  };

  const renderQuickSearch = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">
          <i className="fas fa-search" style={{ marginRight: '0.5rem' }}></i>
          Quick Search
        </h3>
      </div>
      <div className="admin-card-body">
        <div className="admin-search-input" style={{ maxWidth: '100%', marginBottom: '1rem' }}>
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search users, vendors, bookings..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
          />
        </div>

        {searching ? (
          <div className="admin-loading" style={{ padding: '2rem' }}>
            <div className="admin-loading-spinner"></div>
            <p>Searching...</p>
          </div>
        ) : quickSearch.length < 2 ? (
          <div className="admin-empty-state" style={{ padding: '2rem' }}>
            <i className="fas fa-search"></i>
            <p>Enter at least 2 characters to search</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="admin-empty-state" style={{ padding: '2rem' }}>
            <i className="fas fa-search"></i>
            <h3>No Results</h3>
            <p>No matches found for "{quickSearch}"</p>
          </div>
        ) : (
          <div>
            {searchResults.map((result, idx) => (
              <div 
                key={idx}
                style={{
                  padding: '0.75rem',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{result.name || result.Name || result.email}</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {result.type || result.Type} • {result.email || result.Email}
                  </div>
                </div>
                <span className={`admin-badge ${
                  result.type === 'vendor' ? 'admin-badge-info' : 
                  result.type === 'booking' ? 'admin-badge-warning' : 
                  'admin-badge-neutral'
                }`}>
                  {result.type || result.Type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderImpersonate = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">
          <i className="fas fa-user-secret" style={{ marginRight: '0.5rem' }}></i>
          Impersonate User or Vendor
        </h3>
      </div>
      <div className="admin-card-body">
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400e' }}>
            <i className="fas fa-exclamation-triangle"></i>
            <strong>Important:</strong> Impersonation allows you to see exactly what the user sees. Do not make changes to their account unless necessary. All actions are logged for security.
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="Filter users by email or name..."
            value={impersonateSearch}
            onChange={(e) => setImpersonateSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleImpersonateSearch()}
            style={{ flex: 1, padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}
          />
          <button className="admin-btn admin-btn-primary" onClick={handleImpersonateSearch} disabled={searching}>
            <i className="fas fa-search" style={{ marginRight: '0.5rem' }}></i>
            {searching ? 'Searching...' : 'Search'}
          </button>
          <button className="admin-btn admin-btn-secondary" onClick={loadAllUsers} disabled={searching}>
            <i className="fas fa-sync-alt" style={{ marginRight: '0.5rem' }}></i> Refresh
          </button>
        </div>

        {searching ? (
          <div className="admin-loading" style={{ padding: '2rem' }}>
            <div className="admin-loading-spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : impersonateResults.length > 0 ? (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {impersonateResults.map((user) => (
                  <tr key={user.id || user.UserID}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#5086E8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                          {(user.name || user.Name || 'U')[0].toUpperCase()}
                        </div>
                        <span>{user.name || user.Name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td>{user.email || user.Email}</td>
                    <td>
                      {(user.accountType === 'Vendor' || user.IsVendor) ? (
                        <span className="admin-badge admin-badge-info">Vendor</span>
                      ) : (user.accountType === 'Admin' || user.IsAdmin) ? (
                        <span className="admin-badge admin-badge-warning">Admin</span>
                      ) : (
                        <span className="admin-badge admin-badge-secondary">User</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="admin-btn admin-btn-sm admin-btn-primary"
                        onClick={() => handleImpersonate(user.id || user.UserID)}
                        disabled={impersonating || user.accountType === 'Admin' || user.IsAdmin}
                        title={(user.accountType === 'Admin' || user.IsAdmin) ? 'Cannot impersonate admin users' : 'Impersonate this user'}
                      >
                        <i className="fas fa-sign-in-alt"></i> Impersonate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state" style={{ padding: '2rem' }}>
            <i className="fas fa-users"></i>
            <p>No users found. Click Refresh to load users.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="admin-section">
      {/* Tabs */}
      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'search' ? 'active' : ''}`} 
          onClick={() => setActiveTab('search')}
        >
          <i className="fas fa-search" style={{ marginRight: '0.5rem' }}></i>
          Quick Search
        </button>
        <button 
          className={`admin-tab ${activeTab === 'impersonate' ? 'active' : ''}`} 
          onClick={() => setActiveTab('impersonate')}
        >
          <i className="fas fa-user-secret" style={{ marginRight: '0.5rem' }}></i>
          Impersonate User
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'search' && renderQuickSearch()}
      {activeTab === 'impersonate' && renderImpersonate()}

      {/* Impersonate Confirmation Modal */}
      <ConfirmationModal
        isOpen={showImpersonateModal}
        onClose={() => { setShowImpersonateModal(false); setUserToImpersonate(null); }}
        title="Impersonate User"
        message="Are you sure you want to impersonate this user? All actions will be logged."
        confirmLabel="Impersonate"
        cancelLabel="Cancel"
        onConfirm={confirmImpersonate}
        variant="warning"
      />
    </div>
  );
}

export default ToolsSection;
