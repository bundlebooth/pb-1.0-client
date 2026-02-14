/**
 * Vendors Section - Admin Dashboard
 * Vendor approvals, management, and categories
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatCurrency } from '../../../utils/formatUtils';
import { useDebounce } from '../../../hooks/useApi';
import adminApi from '../../../services/adminApi';
import UniversalModal, { ConfirmationModal, FormModal } from '../../UniversalModal';
import { FormField, FormTextareaField, DetailRow, DetailSection } from '../../common/FormComponents';
import { useAlert } from '../../../context/AlertContext';

function VendorsSection() {
  const navigate = useNavigate();
  const { showError } = useAlert();
  const [activeTab, setActiveTab] = useState('approvals');
  const [vendors, setVendors] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorFullProfile, setVendorFullProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTab, setReviewTab] = useState('overview');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const fetchVendorFullProfile = async (vendorId) => {
    setProfileLoading(true);
    try {
      const data = await adminApi.getVendorApprovalDetails(vendorId);
      setVendorFullProfile(data);
    } catch (err) {
      console.error('Error fetching vendor profile:', err);
      setVendorFullProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleViewFullProfile = (vendor) => {
    // Navigate to actual BecomeVendorPage in admin review mode
    const vendorId = vendor.VendorProfileID || vendor.id;
    console.log('[VendorsSection] handleViewFullProfile called with vendorId:', vendorId);
    console.log('[VendorsSection] Navigating to:', `/become-a-vendor/setup?adminReview=${vendorId}`);
    navigate(`/become-a-vendor/setup?adminReview=${vendorId}`);
  };

  const debouncedSearch = useDebounce(search, 300);

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getVendorApprovals('pending');
      // Ensure approvals is always an array
      const approvalsArray = Array.isArray(data?.profiles) 
        ? data.profiles 
        : Array.isArray(data) 
          ? data 
          : [];
      setApprovals(approvalsArray);
    } catch (err) {
      console.error('Error fetching approvals:', err);
      setError('Failed to load vendor approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter })
      };
      const data = await adminApi.getVendors(params);
      setVendors(data.vendors || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getCategories();
      // Ensure categories is always an array
      const categoriesArray = Array.isArray(data?.categories) 
        ? data.categories 
        : Array.isArray(data) 
          ? data 
          : [];
      setCategories(categoriesArray);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchApprovals();
    } else if (activeTab === 'vendors') {
      fetchVendors();
    } else if (activeTab === 'categories') {
      fetchCategories();
    }
  }, [activeTab, fetchApprovals, fetchVendors, fetchCategories]);

  useEffect(() => {
    if (activeTab === 'vendors') {
      fetchVendors();
    }
  }, [page, debouncedSearch, statusFilter]);

  const handleApprove = async () => {
    if (!selectedVendor) return;
    setActionLoading(true);
    try {
      await adminApi.approveVendor(selectedVendor.VendorProfileID || selectedVendor.id, adminNotes);
      setShowApprovalModal(false);
      setAdminNotes('');
      fetchApprovals();
    } catch (err) {
      console.error('Error approving vendor:', err);
      showError('Failed to approve vendor: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVendor || !rejectReason) return;
    setActionLoading(true);
    try {
      await adminApi.rejectVendor(selectedVendor.VendorProfileID || selectedVendor.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
      fetchApprovals();
    } catch (err) {
      console.error('Error rejecting vendor:', err);
      showError('Failed to reject vendor: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVendorAction = (action, vendor) => {
    setSelectedVendor(vendor);
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const executeVendorAction = async () => {
    if (!selectedVendor || !confirmAction) return;
    setActionLoading(true);
    try {
      const vendorId = selectedVendor.VendorProfileID || selectedVendor.id;
      switch (confirmAction) {
        case 'suspend':
          await adminApi.suspendVendor(vendorId, 'Suspended by admin');
          break;
        case 'reactivate':
          await adminApi.reactivateVendor(vendorId);
          break;
        case 'toggleVisibility':
          await adminApi.toggleVendorVisibility(vendorId);
          break;
        default:
          break;
      }
      setShowConfirmModal(false);
      setConfirmAction(null);
      fetchVendors();
    } catch (err) {
      console.error('Error executing action:', err);
      showError('Action failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!selectedCategory) return;
    setActionLoading(true);
    try {
      if (selectedCategory.CategoryID || selectedCategory.id) {
        await adminApi.updateCategory(selectedCategory.CategoryID || selectedCategory.id, selectedCategory);
      } else {
        await adminApi.createCategory(selectedCategory);
      }
      setShowCategoryModal(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (err) {
      console.error('Error saving category:', err);
      showError('Failed to save category: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (vendor) => {
    const status = vendor.ApprovalStatus || vendor.Status || vendor.status;
    if (status === 'suspended') return <span className="admin-badge admin-badge-danger">Suspended</span>;
    if (status === 'pending') return <span className="admin-badge admin-badge-warning">Pending</span>;
    if (status === 'rejected') return <span className="admin-badge admin-badge-danger">Rejected</span>;
    if (vendor.IsVisible === false) return <span className="admin-badge admin-badge-neutral">Hidden</span>;
    return <span className="admin-badge admin-badge-success">Active</span>;
  };

  const totalPages = Math.ceil(total / limit);

  const renderApprovals = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Pending Approvals ({approvals.length})</h3>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={fetchApprovals}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading approvals...</p>
        </div>
      ) : approvals.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fas fa-check-circle"></i>
          <h3>All Caught Up!</h3>
          <p>No pending vendor approvals</p>
        </div>
      ) : (
        <div className="admin-card-body">
          {approvals.map((vendor) => (
            <div 
              key={vendor.VendorProfileID || vendor.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderBottom: '1px solid #f3f4f6',
                gap: '1rem'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>
                  {vendor.BusinessName || vendor.businessName}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  {vendor.CategoryName || vendor.category} • {vendor.City || vendor.city}, {vendor.State || vendor.state}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  Applied: {formatDate(vendor.CreatedAt || vendor.createdAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={() => handleViewFullProfile(vendor)}
                >
                  <i className="fas fa-eye"></i> View
                </button>
                <button
                  className="admin-btn admin-btn-success admin-btn-sm"
                  onClick={() => {
                    setSelectedVendor(vendor);
                    setShowApprovalModal(true);
                  }}
                >
                  <i className="fas fa-check"></i> Approve
                </button>
                <button
                  className="admin-btn admin-btn-danger admin-btn-sm"
                  onClick={() => {
                    setSelectedVendor(vendor);
                    setShowRejectModal(true);
                  }}
                >
                  <i className="fas fa-times"></i> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderVendors = () => (
    <>
      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search vendors..."
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
          <option value="suspended">Suspended</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">All Vendors ({total})</h3>
        </div>
        
        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner"></div>
            <p>Loading vendors...</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="admin-empty-state">
            <i className="fas fa-store"></i>
            <h3>No Vendors Found</h3>
            <p>No vendors match your criteria</p>
          </div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Rating</th>
                    <th>Bookings</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.VendorProfileID || vendor.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{vendor.BusinessName || vendor.businessName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          {vendor.OwnerName || vendor.ownerName}
                        </div>
                      </td>
                      <td>{vendor.CategoryName || vendor.category}</td>
                      <td>{vendor.City || vendor.city}, {vendor.State || vendor.state}</td>
                      <td>{getStatusBadge(vendor)}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <i className="fas fa-star" style={{ color: '#f59e0b', fontSize: '0.8rem' }}></i>
                          {vendor.AverageRating?.toFixed(1) || vendor.rating?.toFixed(1) || 'N/A'}
                        </span>
                      </td>
                      <td>{vendor.TotalBookings || vendor.bookings || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            onClick={() => handleViewFullProfile(vendor)}
                            title="View Profile"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            onClick={() => handleVendorAction('toggleVisibility', vendor)}
                            title={vendor.IsVisible === false ? 'Show' : 'Hide'}
                          >
                            <i className={`fas ${vendor.IsVisible === false ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                          </button>
                          {vendor.Status !== 'suspended' ? (
                            <button
                              className="admin-btn admin-btn-danger admin-btn-sm"
                              onClick={() => handleVendorAction('suspend', vendor)}
                              title="Suspend"
                            >
                              <i className="fas fa-ban"></i>
                            </button>
                          ) : (
                            <button
                              className="admin-btn admin-btn-success admin-btn-sm"
                              onClick={() => handleVendorAction('reactivate', vendor)}
                              title="Reactivate"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                          )}
                        </div>
                      </td>
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
    </>
  );

  const renderCategories = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Service Categories ({categories.length})</h3>
        <button 
          className="admin-btn admin-btn-primary admin-btn-sm"
          onClick={() => {
            setSelectedCategory({ name: '', description: '', icon: 'fa-tag', isActive: true });
            setShowCategoryModal(true);
          }}
        >
          <i className="fas fa-plus"></i> Add Category
        </button>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fas fa-tags"></i>
          <h3>No Categories</h3>
          <p>Create your first service category</p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Vendors</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.CategoryID || category.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className={`fas ${category.Icon || category.icon || 'fa-tag'}`} style={{ color: '#5086E8' }}></i>
                      <span style={{ fontWeight: 500 }}>{category.Name || category.name}</span>
                    </div>
                  </td>
                  <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {category.Description || category.description || '-'}
                  </td>
                  <td>{category.VendorCount || category.vendorCount || 0}</td>
                  <td>
                    {category.IsActive !== false ? (
                      <span className="admin-badge admin-badge-success">Active</span>
                    ) : (
                      <span className="admin-badge admin-badge-neutral">Inactive</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        onClick={() => {
                          setSelectedCategory(category);
                          setShowCategoryModal(true);
                        }}
                      >
                        <i className="fas fa-pen"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-section">
      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'approvals' ? 'active' : ''}`}
          onClick={() => setActiveTab('approvals')}
        >
          Pending Approvals
          {approvals.length > 0 && (
            <span className="admin-tab-count">{approvals.length}</span>
          )}
        </button>
        <button
          className={`admin-tab ${activeTab === 'vendors' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendors')}
        >
          All Vendors
        </button>
        <button
          className={`admin-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'approvals' && renderApprovals()}
      {activeTab === 'vendors' && renderVendors()}
      {activeTab === 'categories' && renderCategories()}

      {/* Vendor Detail Modal */}
      <UniversalModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Vendor Details"
        size="large"
        showFooter={true}
        primaryAction={{ label: 'Close', onClick: () => setShowDetailModal(false) }}
        secondaryAction={false}
      >
        {selectedVendor && (
          <div>
            <DetailSection title="Business Information">
              <DetailRow label="Business Name" value={selectedVendor.BusinessName || selectedVendor.businessName} />
              <DetailRow label="Category" value={selectedVendor.CategoryName || selectedVendor.category} />
              <DetailRow label="Description" value={selectedVendor.Description || selectedVendor.description} />
              <DetailRow label="Location" value={`${selectedVendor.City || selectedVendor.city}, ${selectedVendor.State || selectedVendor.state}`} />
              <DetailRow label="Status" value={getStatusBadge(selectedVendor)} />
            </DetailSection>
            <DetailSection title="Owner Information">
              <DetailRow label="Owner Name" value={selectedVendor.OwnerName || selectedVendor.ownerName} />
              <DetailRow label="Email" value={selectedVendor.Email || selectedVendor.email} />
              <DetailRow label="Phone" value={selectedVendor.Phone || selectedVendor.phone} />
            </DetailSection>
            <DetailSection title="Performance">
              <DetailRow label="Average Rating" value={selectedVendor.AverageRating?.toFixed(1) || 'N/A'} />
              <DetailRow label="Total Bookings" value={selectedVendor.TotalBookings || 0} />
              <DetailRow label="Total Revenue" value={formatCurrency(selectedVendor.TotalRevenue || 0)} />
            </DetailSection>
          </div>
        )}
      </UniversalModal>

      {/* Approval Modal */}
      <FormModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title="Approve Vendor"
        onSave={handleApprove}
        saving={actionLoading}
        saveLabel="Approve Vendor"
      >
        <p style={{ marginBottom: '1rem', color: '#374151' }}>
          You are about to approve <strong>{selectedVendor?.BusinessName}</strong>. 
          They will be visible on the platform immediately.
        </p>
        <FormTextareaField
          label="Admin Notes (Optional)"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Add any notes about this approval..."
          rows={3}
        />
      </FormModal>

      {/* Reject Modal */}
      <FormModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Vendor"
        onSave={handleReject}
        saving={actionLoading}
        saveLabel="Reject Vendor"
        disabled={!rejectReason}
      >
        <p style={{ marginBottom: '1rem', color: '#374151' }}>
          You are about to reject <strong>{selectedVendor?.BusinessName}</strong>. 
          Please provide a reason.
        </p>
        <FormTextareaField
          label="Rejection Reason"
          required
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Explain why this vendor is being rejected..."
          rows={4}
        />
      </FormModal>

      {/* Category Modal */}
      <FormModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={selectedCategory?.CategoryID ? 'Edit Category' : 'Add Category'}
        onSave={handleSaveCategory}
        saving={actionLoading}
        saveLabel="Save Category"
      >
        {selectedCategory && (
          <div>
            <FormField
              label="Category Name"
              required
              value={selectedCategory.Name || selectedCategory.name || ''}
              onChange={(e) => setSelectedCategory({ ...selectedCategory, Name: e.target.value, name: e.target.value })}
            />
            <FormTextareaField
              label="Description"
              value={selectedCategory.Description || selectedCategory.description || ''}
              onChange={(e) => setSelectedCategory({ ...selectedCategory, Description: e.target.value, description: e.target.value })}
              rows={3}
            />
            <FormField
              label="Icon (FontAwesome class)"
              value={selectedCategory.Icon || selectedCategory.icon || ''}
              onChange={(e) => setSelectedCategory({ ...selectedCategory, Icon: e.target.value, icon: e.target.value })}
              placeholder="fa-camera"
            />
          </div>
        )}
      </FormModal>

      {/* Confirm Action Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Action"
        message={
          confirmAction === 'suspend' 
            ? `Are you sure you want to suspend ${selectedVendor?.BusinessName}? They will not be visible on the platform.`
            : confirmAction === 'reactivate'
            ? `Are you sure you want to reactivate ${selectedVendor?.BusinessName}?`
            : `Are you sure you want to ${selectedVendor?.IsVisible === false ? 'show' : 'hide'} ${selectedVendor?.BusinessName}?`
        }
        confirmLabel={actionLoading ? 'Processing...' : 'Confirm'}
        onConfirm={executeVendorAction}
        variant={confirmAction === 'suspend' ? 'danger' : 'warning'}
      />

    </div>
  );
}

export default VendorsSection;
