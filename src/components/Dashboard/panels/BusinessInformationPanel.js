import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { showBanner } from '../../../utils/helpers';
import { apiGet, apiPut, apiPostFormData } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';

function BusinessInformationPanel({ onBack, vendorProfileId }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategoriesOptions, setSubcategoriesOptions] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [originalSubcategories, setOriginalSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [formData, setFormData] = useState({
    businessName: '',
    displayName: '',
    email: '',
    phone: '',
    website: '',
    yearsInBusiness: 0,
    description: '',
    category: '',
    additionalCategories: [],
    priceLevel: '$$',
    logoUrl: ''
  });

  // Check if there are changes
  const hasChanges = originalData ? (
    formData.businessName !== originalData.businessName ||
    formData.displayName !== originalData.displayName ||
    formData.email !== originalData.email ||
    formData.phone !== originalData.phone ||
    formData.website !== originalData.website ||
    formData.yearsInBusiness !== originalData.yearsInBusiness ||
    formData.description !== originalData.description ||
    formData.category !== originalData.category ||
    formData.priceLevel !== originalData.priceLevel ||
    JSON.stringify([...formData.additionalCategories].sort()) !== JSON.stringify([...originalData.additionalCategories].sort()) ||
    JSON.stringify([...selectedSubcategories].sort()) !== JSON.stringify([...originalSubcategories].sort())
  ) : false;

  // Clear form data when vendorProfileId changes
  useEffect(() => {
    // Reset form to default values when vendor changes
    setFormData({
      businessName: '',
      displayName: '',
      email: '',
      phone: '',
      website: '',
      yearsInBusiness: 0,
      description: '',
      category: '',
      additionalCategories: [],
      priceLevel: '$$',
      logoUrl: ''
    });
  }, [vendorProfileId]);

  useEffect(() => {
    loadCategories();
    if (vendorProfileId) {
      loadProfileData();
    } else {
      setLoading(false);
    }
  }, [vendorProfileId]);

  // Category IDs match DB directly - no mapping needed, just pass through
  // Valid categories: venue, photo, video, music, dj, catering, entertainment, 
  // experiences, decorations, beauty, cake, transportation, planners, fashion, stationery

  // Load subcategories when primary category changes
  useEffect(() => {
    if (formData.category) {
      // Category ID matches DB directly - no mapping needed
      loadSubcategoriesForCategory(formData.category);
    } else {
      setSubcategoriesOptions([]);
    }
  }, [formData.category]);

  const loadSubcategoriesForCategory = async (categoryName) => {
    try {
      setLoadingSubcategories(true);
      const response = await fetch(`${API_BASE_URL}/vendors/lookup/subcategories?category=${encodeURIComponent(categoryName)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSubcategoriesOptions(data.subcategories || []);
      }
    } catch (error) {
      console.error('Error loading subcategories:', error);
    } finally {
      setLoadingSubcategories(false);
    }
  };

  const loadVendorSubcategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/subcategories`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const subcats = (data.subcategories || []).map(s => s.SubcategoryID);
        setSelectedSubcategories(subcats);
        setOriginalSubcategories(subcats);
      }
    } catch (error) {
      console.error('Error loading vendor subcategories:', error);
    }
  };

  const toggleSubcategory = (subcategoryId) => {
    setSelectedSubcategories(prev =>
      prev.includes(subcategoryId)
        ? prev.filter(id => id !== subcategoryId)
        : [...prev, subcategoryId]
    );
  };

  const loadCategories = async () => {
    try {
      // Use hardcoded categories matching vanilla JS
      const categoriesList = [
        { id: 'venue', name: 'Venues' },
        { id: 'photo', name: 'Photo/Video' },
        { id: 'music', name: 'Music/DJ' },
        { id: 'catering', name: 'Catering' },
        { id: 'entertainment', name: 'Entertainment' },
        { id: 'experiences', name: 'Experiences' },
        { id: 'decor', name: 'Decorations' },
        { id: 'beauty', name: 'Beauty' },
        { id: 'cake', name: 'Cake' },
        { id: 'transport', name: 'Transportation' },
        { id: 'planner', name: 'Planners' },
        { id: 'fashion', name: 'Fashion' },
        { id: 'stationery', name: 'Stationery' }
      ];
      setCategories(categoriesList);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showBanner('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showBanner('Image size must be less than 5MB', 'error');
      return;
    }

    try {
      setUploading(true);
      const formDataUpload = new FormData();
      formDataUpload.append('logo', file);

      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataUpload
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.logoUrl || data.url;
        setFormData(prev => ({ ...prev, logoUrl: imageUrl }));
        showBanner('Logo updated successfully!', 'success');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      showBanner('Failed to upload logo', 'error');
    } finally {
      setUploading(false);
    }
  };

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // CRITICAL: Clear old data FIRST before loading new data
      setFormData({
        businessName: '',
        displayName: '',
        email: '',
        phone: '',
        website: '',
        yearsInBusiness: 0,
        description: '',
        category: '',
        additionalCategories: [],
        priceLevel: '$$',
        logoUrl: ''
      });
      
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Handle nested structure from /vendors/:id endpoint
        const profile = result.data?.profile || result.profile || result;
        const categories = result.data?.categories || result.categories || [];
        
        if (profile.VendorProfileID && profile.VendorProfileID !== vendorProfileId) {
          console.error('🚨 MISMATCH! API returned different vendor data!');
          console.error('   Requested:', vendorProfileId, 'Got:', profile.VendorProfileID);
        }
        
        // Get primary and additional categories using IsPrimary flag
        let primaryCategory = '';
        let additionalCategories = [];
        if (Array.isArray(categories) && categories.length > 0) {
          // Find primary category (IsPrimary = true) or fallback to first
          const primaryCat = categories.find(cat => cat.IsPrimary);
          primaryCategory = primaryCat?.Category || categories[0]?.Category || categories[0]?.CategoryName || '';
          // Additional categories are those without IsPrimary flag
          additionalCategories = categories
            .filter(cat => !cat.IsPrimary)
            .map(cat => cat.Category || cat.CategoryName || cat);
        } else if (profile.Categories) {
          const catArray = profile.Categories.split(',').map(c => c.trim());
          primaryCategory = catArray[0] || '';
          additionalCategories = catArray.slice(1);
        }
        
        const loadedData = {
          businessName: profile.BusinessName || '',
          displayName: profile.DisplayName || profile.BusinessName || '',
          email: profile.BusinessEmail || currentUser?.email || '',
          phone: profile.BusinessPhone || '',
          website: profile.Website || '',
          yearsInBusiness: profile.YearsInBusiness || 0,
          description: profile.BusinessDescription || '',
          category: primaryCategory,
          additionalCategories: additionalCategories,
          priceLevel: profile.PriceLevel || '$$',
          logoUrl: profile.LogoURL || profile.FeaturedImageURL || profile.logoUrl || ''
        };
        setFormData(loadedData);
        setOriginalData(loadedData);
        
        // Load vendor's selected subcategories
        await loadVendorSubcategories();
      } else if (response.status === 404) {
        console.warn('Profile not found (404) - this may be a new vendor profile');
        // Don't throw error for 404, just leave form empty for new profile
      } else {
        console.error('Failed to load profile:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const allCategories = [formData.category, ...formData.additionalCategories].filter(Boolean).join(',');
      
      const response = await fetch(`${API_BASE_URL}/vendors/setup/step1-business-basics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          vendorProfileId: vendorProfileId,
          businessName: formData.businessName,
          displayName: formData.displayName,
          businessEmail: formData.email,
          businessPhone: formData.phone,
          website: formData.website,
          yearsInBusiness: formData.yearsInBusiness,
          businessDescription: formData.description,
          primaryCategory: formData.category,
          additionalCategories: formData.additionalCategories,
          priceLevel: formData.priceLevel
        })
      });
      
      // Also save subcategories
      await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/subcategories`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ subcategoryIds: selectedSubcategories })
      });
      
      if (response.ok) {
        showBanner('Profile updated successfully!', 'success');
        // Update original data after successful save
        setOriginalData({ ...formData });
        setOriginalSubcategories([...selectedSubcategories]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Save failed:', response.status, errorData);
        throw new Error(errorData.message || `Failed to update profile (${response.status})`);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showBanner(`Failed to save changes: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryToggle = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      additionalCategories: prev.additionalCategories.includes(categoryId)
        ? prev.additionalCategories.filter(c => c !== categoryId)
        : [...prev.additionalCategories, categoryId]
    }));
  };

  if (loading) {
    return (
      <div>
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
        </button>
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
      <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
        <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
      </button>
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-building"></i>
          </span>
          Business Information
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Update your business name, categories, and pricing to help clients find your services.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />
        
        <form id="vendor-profile-form" onSubmit={handleSubmit}>
          {/* Business Logo */}
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text)' }}>
            Business Logo
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              overflow: 'hidden', 
              border: '3px solid var(--border)',
              background: 'var(--secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {formData.logoUrl ? (
                <img 
                  src={formData.logoUrl} 
                  alt="Business Logo" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <i className="fas fa-building" style={{ fontSize: '3rem', color: 'var(--text-light)' }}></i>
              )}
            </div>
            <div>
              <button 
                type="button"
                className="btn btn-outline"
                onClick={() => document.getElementById('logo-upload-input').click()}
                disabled={uploading}
                style={{ marginBottom: '0.5rem' }}
              >
                <i className="fas fa-upload"></i> {uploading ? 'Uploading...' : 'Upload Logo'}
              </button>
              <input
                type="file"
                id="logo-upload-input"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
              <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', margin: 0 }}>
                JPG, PNG or SVG. Max size 5MB.
              </p>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '2rem 0' }} />

          <div className="form-row">
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="vendor-name">Business Name <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  id="vendor-name"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="vendor-display-name">Display Name (for public listing)</label>
                <input
                  type="text"
                  id="vendor-display-name"
                  placeholder="Public listing name"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="vendor-email">Business Email <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="email"
                  id="vendor-email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="vendor-phone">Business Phone <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="tel"
                  id="vendor-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="vendor-website">Website URL</label>
                <input
                  type="url"
                  id="vendor-website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            </div>
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="vendor-years-in-business">Years in Business</label>
                <input
                  type="number"
                  id="vendor-years-in-business"
                  min="0"
                  value={formData.yearsInBusiness}
                  onChange={(e) => setFormData({ ...formData, yearsInBusiness: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="vendor-description">Business Description <span style={{ color: 'red' }}>*</span></label>
            <textarea
              id="vendor-description"
              rows="4"
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            ></textarea>
          </div>

          <button 
            type="submit" 
            disabled={!hasChanges || saving}
            style={{ 
              backgroundColor: (!hasChanges || saving) ? '#9ca3af' : '#3d3d3d', 
              border: 'none', 
              color: 'white',
              padding: '12px 20px',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '14px',
              cursor: (!hasChanges || saving) ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default BusinessInformationPanel;
