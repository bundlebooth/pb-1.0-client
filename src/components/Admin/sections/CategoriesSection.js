import React, { useState, useEffect, useCallback } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory, toggleCategoryVisibility } from '../../../services/adminApi';

function CategoriesSection() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', icon: '', sortOrder: 0 });
  const [actionLoading, setActionLoading] = useState(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCategories();
      setCategories(data.categories || data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading('submit');
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.CategoryID || editingCategory.id, formData);
      } else {
        await createCategory(formData);
      }
      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', icon: '', sortOrder: 0 });
      loadCategories();
    } catch (err) {
      console.error('Error saving category:', err);
      alert('Failed to save category');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.CategoryName || category.name || '',
      description: category.Description || category.description || '',
      icon: category.Icon || category.icon || '',
      sortOrder: category.SortOrder || category.sortOrder || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }
    setActionLoading(categoryId);
    try {
      await deleteCategory(categoryId);
      loadCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVisibility = async (categoryId, currentVisibility) => {
    setActionLoading(categoryId);
    try {
      await toggleCategoryVisibility(categoryId, !currentVisibility);
      loadCategories();
    } catch (err) {
      console.error('Error toggling visibility:', err);
      alert('Failed to update visibility');
    } finally {
      setActionLoading(null);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', icon: '', sortOrder: 0 });
    setShowModal(true);
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Service Categories</h2>
          <p style={{ color: '#717171', marginTop: '4px', marginBottom: 0 }}>
            Manage vendor service categories and subcategories
          </p>
        </div>
        <button
          onClick={openCreateModal}
          style={{
            padding: '10px 20px',
            background: '#222',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-plus"></i>
          Add Category
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading categories...</p>
        </div>
      ) : error ? (
        <div className="admin-error">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={loadCategories} className="admin-btn admin-btn-primary">
            Retry
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <i className="fas fa-folder-open" style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px' }}></i>
          <h3 style={{ margin: '0 0 8px', color: '#374151' }}>No categories yet</h3>
          <p style={{ color: '#6b7280', margin: '0 0 16px' }}>Create your first service category to get started.</p>
          <button
            onClick={openCreateModal}
            style={{
              padding: '10px 20px',
              background: '#5086E8',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Create Category
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {categories.map((category) => {
            const categoryId = category.CategoryID || category.id;
            const categoryName = category.CategoryName || category.name;
            const description = category.Description || category.description;
            const icon = category.Icon || category.icon;
            const isVisible = category.IsVisible !== false && category.isVisible !== false;
            const vendorCount = category.VendorCount || category.vendorCount || 0;

            return (
              <div
                key={categoryId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: isVisible ? '#fff' : '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  opacity: isVisible ? 1 : 0.7
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #f0f4ff 0%, #e8efff 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <i className={`fas ${icon || 'fa-folder'}`} style={{ fontSize: '18px', color: '#5086E8' }}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: '#222' }}>{categoryName}</span>
                      {!isVisible && (
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          background: '#fef3c7',
                          color: '#92400e',
                          borderRadius: '4px',
                          fontWeight: 500
                        }}>
                          HIDDEN
                        </span>
                      )}
                    </div>
                    {description && (
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>
                        {description}
                      </div>
                    )}
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '4px' }}>
                      {vendorCount} vendor{vendorCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleToggleVisibility(categoryId, isVisible)}
                    disabled={actionLoading === categoryId}
                    title={isVisible ? 'Hide category' : 'Show category'}
                    style={{
                      padding: '8px 12px',
                      background: 'transparent',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#6b7280'
                    }}
                  >
                    <i className={`fas ${isVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                  <button
                    onClick={() => handleEdit(category)}
                    disabled={actionLoading === categoryId}
                    style={{
                      padding: '8px 12px',
                      background: 'transparent',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#6b7280'
                    }}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(categoryId)}
                    disabled={actionLoading === categoryId || vendorCount > 0}
                    title={vendorCount > 0 ? 'Cannot delete category with vendors' : 'Delete category'}
                    style={{
                      padding: '8px 12px',
                      background: 'transparent',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      cursor: vendorCount > 0 ? 'not-allowed' : 'pointer',
                      color: vendorCount > 0 ? '#d1d5db' : '#ef4444',
                      opacity: vendorCount > 0 ? 0.5 : 1
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px', color: '#222' }}>
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                  placeholder="e.g., Photography"
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    resize: 'vertical'
                  }}
                  placeholder="Brief description of this category"
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                  Icon (Font Awesome class)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                  placeholder="e.g., fa-camera"
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                  placeholder="0"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 20px',
                    background: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'submit'}
                  style={{
                    padding: '10px 20px',
                    background: '#222',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    opacity: actionLoading === 'submit' ? 0.7 : 1
                  }}
                >
                  {actionLoading === 'submit' ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoriesSection;
