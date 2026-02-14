/**
 * Users Section - Admin Dashboard
 * User management with search, filters, and actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate, formatRelativeTime } from '../../../utils/formatUtils';
import { useDebounce } from '../../../hooks/useApi';
import adminApi from '../../../services/adminApi';
import UniversalModal, { ConfirmationModal, FormModal } from '../../UniversalModal';
import { FormField, DetailRow, DetailSection } from '../../common/FormComponents';
import { useAlert } from '../../../context/AlertContext';

function UsersSection() {
  const { showError } = useAlert();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [userActivity, setUserActivity] = useState([]);

  const debouncedSearch = useDebounce(search, 300);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter })
      };
      const data = await adminApi.getUsers(params);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
    try {
      const activityData = await adminApi.getUserActivity(user.UserID || user.userId || user.id);
      // Ensure userActivity is always an array
      const activityArray = Array.isArray(activityData?.activities) 
        ? activityData.activities 
        : Array.isArray(activityData) 
          ? activityData 
          : [];
      setUserActivity(activityArray);
    } catch (err) {
      console.error('Error fetching user activity:', err);
      setUserActivity([]);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleAction = (action, user) => {
    setSelectedUser(user);
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const executeAction = async () => {
    if (!selectedUser || !confirmAction) return;
    
    setActionLoading(true);
    try {
      const userId = selectedUser.UserID || selectedUser.userId || selectedUser.id;
      
      switch (confirmAction) {
        case 'toggle':
          await adminApi.toggleUserStatus(userId);
          break;
        case 'freeze':
          await adminApi.freezeUser(userId);
          break;
        case 'unfreeze':
          await adminApi.unfreezeUser(userId);
          break;
        case 'unlock':
          await adminApi.unlockUser(userId);
          break;
        case 'resetPassword':
          await adminApi.resetUserPassword(userId);
          break;
        default:
          break;
      }
      
      setShowConfirmModal(false);
      setConfirmAction(null);
      fetchUsers();
    } catch (err) {
      console.error('Error executing action:', err);
      showError('Action failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      const userId = selectedUser.UserID || selectedUser.userId || selectedUser.id;
      await adminApi.updateUser(userId, {
        firstName: selectedUser.FirstName || selectedUser.firstName,
        lastName: selectedUser.LastName || selectedUser.lastName,
        email: selectedUser.Email || selectedUser.email,
        isAdmin: selectedUser.IsAdmin || selectedUser.isAdmin
      });
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      showError('Failed to update user: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (user) => {
    if (user.IsLocked || user.isLocked) {
      return <span className="admin-badge admin-badge-danger">Locked</span>;
    }
    if (user.IsFrozen || user.isFrozen) {
      return <span className="admin-badge admin-badge-warning">Frozen</span>;
    }
    if (user.IsActive === false || user.isActive === false) {
      return <span className="admin-badge admin-badge-neutral">Inactive</span>;
    }
    return <span className="admin-badge admin-badge-success">Active</span>;
  };

  const getUserType = (user) => {
    if (user.IsAdmin || user.isAdmin) return 'Admin';
    if (user.IsVendor || user.isVendor) return 'Vendor';
    return 'Client';
  };

  const totalPages = Math.ceil(total / limit);

  const getConfirmMessage = () => {
    const userName = selectedUser?.FirstName || selectedUser?.firstName || 'this user';
    switch (confirmAction) {
      case 'toggle':
        return `Are you sure you want to ${selectedUser?.IsActive === false ? 'activate' : 'deactivate'} ${userName}?`;
      case 'freeze':
        return `Are you sure you want to freeze ${userName}'s account? They will not be able to log in.`;
      case 'unfreeze':
        return `Are you sure you want to unfreeze ${userName}'s account?`;
      case 'unlock':
        return `Are you sure you want to unlock ${userName}'s account?`;
      case 'resetPassword':
        return `Are you sure you want to reset ${userName}'s password? They will receive an email with instructions.`;
      default:
        return 'Are you sure you want to perform this action?';
    }
  };

  return (
    <div className="admin-section">
      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="admin-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="frozen">Frozen</option>
          <option value="locked">Locked</option>
        </select>
        <button className="admin-btn admin-btn-secondary" onClick={fetchUsers}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {/* Users Table */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Users ({total})</h3>
        </div>
        
        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : error ? (
          <div className="admin-empty-state">
            <i className="fas fa-exclamation-triangle"></i>
            <h3>Error</h3>
            <p>{error}</p>
            <button className="admin-btn admin-btn-primary" onClick={fetchUsers}>Retry</button>
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty-state">
            <i className="fas fa-users"></i>
            <h3>No Users Found</h3>
            <p>No users match your search criteria</p>
          </div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.UserID || user.userId || user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: '#374151'
                          }}>
                            {(user.FirstName || user.firstName || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: '#111827' }}>
                              {user.FirstName || user.firstName} {user.LastName || user.lastName}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                              ID: {user.UserID || user.userId || user.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{user.Email || user.email}</td>
                      <td>
                        <span className={`admin-badge ${
                          getUserType(user) === 'Admin' ? 'admin-badge-danger' :
                          getUserType(user) === 'Vendor' ? 'admin-badge-info' :
                          'admin-badge-neutral'
                        }`}>
                          {getUserType(user)}
                        </span>
                      </td>
                      <td>{getStatusBadge(user)}</td>
                      <td>{formatDate(user.CreatedAt || user.createdAt)}</td>
                      <td>{user.LastLogin || user.lastLogin ? formatRelativeTime(user.LastLogin || user.lastLogin) : 'Never'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            onClick={() => handleViewUser(user)}
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            onClick={() => handleEditUser(user)}
                            title="Edit"
                          >
                            <i className="fas fa-pen"></i>
                          </button>
                          <button
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            onClick={() => handleAction('toggle', user)}
                            title={user.IsActive === false ? 'Activate' : 'Deactivate'}
                          >
                            <i className={`fas ${user.IsActive === false ? 'fa-check' : 'fa-ban'}`}></i>
                          </button>
                          {(user.IsLocked || user.isLocked) && (
                            <button
                              className="admin-btn admin-btn-success admin-btn-sm"
                              onClick={() => handleAction('unlock', user)}
                              title="Unlock"
                            >
                              <i className="fas fa-unlock"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="admin-pagination">
                <div className="admin-pagination-info">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} users
                </div>
                <div className="admin-pagination-buttons">
                  <button
                    className="admin-pagination-btn"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 1}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = page <= 3 ? i + 1 : page + i - 2;
                    if (pageNum > totalPages || pageNum < 1) return null;
                    return (
                      <button
                        key={pageNum}
                        className={`admin-pagination-btn ${page === pageNum ? 'active' : ''}`}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
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

      {/* User Detail Modal */}
      <UniversalModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="User Details"
        size="large"
        showFooter={true}
        primaryAction={{
          label: 'Close',
          onClick: () => setShowDetailModal(false)
        }}
        secondaryAction={false}
      >
        {selectedUser && (
          <div>
            <DetailSection title="Profile Information">
              <DetailRow label="Full Name" value={`${selectedUser.FirstName || selectedUser.firstName || ''} ${selectedUser.LastName || selectedUser.lastName || ''}`} />
              <DetailRow label="Email" value={selectedUser.Email || selectedUser.email} />
              <DetailRow label="User ID" value={selectedUser.UserID || selectedUser.userId || selectedUser.id} />
              <DetailRow label="Account Type" value={getUserType(selectedUser)} />
              <DetailRow label="Status" value={getStatusBadge(selectedUser)} />
              <DetailRow label="Joined" value={formatDate(selectedUser.CreatedAt || selectedUser.createdAt)} />
              <DetailRow label="Last Login" value={selectedUser.LastLogin ? formatRelativeTime(selectedUser.LastLogin) : 'Never'} />
            </DetailSection>

            <DetailSection title="Recent Activity">
              {userActivity.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No recent activity</p>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {userActivity.slice(0, 10).map((activity, idx) => (
                    <div key={idx} style={{ 
                      padding: '0.5rem 0', 
                      borderBottom: '1px solid #f3f4f6',
                      fontSize: '0.9rem'
                    }}>
                      <span style={{ color: '#374151' }}>{activity.action || activity.Action}</span>
                      <span style={{ color: '#9ca3af', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                        {formatRelativeTime(activity.createdAt || activity.CreatedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button 
                className="admin-btn admin-btn-secondary"
                onClick={() => handleAction('resetPassword', selectedUser)}
              >
                <i className="fas fa-key"></i> Reset Password
              </button>
              {(selectedUser.IsFrozen || selectedUser.isFrozen) ? (
                <button 
                  className="admin-btn admin-btn-success"
                  onClick={() => handleAction('unfreeze', selectedUser)}
                >
                  <i className="fas fa-unlock"></i> Unfreeze Account
                </button>
              ) : (
                <button 
                  className="admin-btn admin-btn-danger"
                  onClick={() => handleAction('freeze', selectedUser)}
                >
                  <i className="fas fa-snowflake"></i> Freeze Account
                </button>
              )}
            </div>
          </div>
        )}
      </UniversalModal>

      {/* Edit User Modal */}
      <FormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User"
        onSave={handleSaveUser}
        saving={actionLoading}
        saveLabel="Save Changes"
      >
        {selectedUser && (
          <div>
            <FormField
              label="First Name"
              value={selectedUser.FirstName || selectedUser.firstName || ''}
              onChange={(e) => setSelectedUser({ ...selectedUser, FirstName: e.target.value, firstName: e.target.value })}
            />
            <FormField
              label="Last Name"
              value={selectedUser.LastName || selectedUser.lastName || ''}
              onChange={(e) => setSelectedUser({ ...selectedUser, LastName: e.target.value, lastName: e.target.value })}
            />
            <FormField
              label="Email"
              type="email"
              value={selectedUser.Email || selectedUser.email || ''}
              onChange={(e) => setSelectedUser({ ...selectedUser, Email: e.target.value, email: e.target.value })}
            />
          </div>
        )}
      </FormModal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Action"
        message={getConfirmMessage()}
        confirmLabel={actionLoading ? 'Processing...' : 'Confirm'}
        onConfirm={executeAction}
        variant={confirmAction === 'freeze' || confirmAction === 'toggle' ? 'warning' : 'info'}
      />
    </div>
  );
}

export default UsersSection;
