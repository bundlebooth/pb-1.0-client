/**
 * Content Section - Admin Dashboard
 * Blog Management and FAQ Management with Rich Text Editor
 * Matches Planbeau design with table view and WYSIWYG editing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate } from '../../../utils/formatUtils';
import adminApi from '../../../services/adminApi';
import UniversalModal, { ConfirmationModal, FormModal } from '../../UniversalModal';
import RichTextEditor from '../../common/RichTextEditor';
import { useAlert } from '../../../context/AlertContext';

const blogCategories = [
  'Vendor Stories',
  'Trends',
  'Seasonal',
  'Tips & Advice',
  'Planning Guide',
  'Corporate Events',
  'Vendor Insights',
  'Real Weddings'
];

function ContentSection() {
  const { showError } = useAlert();
  const [activeTab, setActiveTab] = useState('blogs');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Blog state
  const [blogs, setBlogs] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [showDeleteBlogModal, setShowDeleteBlogModal] = useState(false);

  // FAQ state
  const [faqs, setFaqs] = useState([]);
  const [selectedFaq, setSelectedFaq] = useState(null);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showDeleteFaqModal, setShowDeleteFaqModal] = useState(false);

  // Banners state
  const [banners, setBanners] = useState([]);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [showBannerModal, setShowBannerModal] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const fetchBlogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;
      const data = await adminApi.getBlogs(params);
      const blogsArray = Array.isArray(data?.blogs) ? data.blogs : Array.isArray(data) ? data : [];
      setBlogs(blogsArray);
    } catch (err) {
      console.error('Error fetching blogs:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const fetchFaqs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getFAQs();
      const faqsArray = Array.isArray(data?.faqs) ? data.faqs : Array.isArray(data) ? data : [];
      setFaqs(faqsArray);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getBanners();
      const bannersArray = Array.isArray(data?.banners) ? data.banners : Array.isArray(data) ? data : [];
      setBanners(bannersArray);
    } catch (err) {
      console.error('Error fetching banners:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'blogs') fetchBlogs();
    else if (activeTab === 'faqs') fetchFaqs();
    else if (activeTab === 'banners') fetchBanners();
  }, [activeTab, fetchBlogs, fetchFaqs, fetchBanners]);

  // Blog handlers
  const handleSaveBlog = async () => {
    if (!selectedBlog) return;
    setActionLoading(true);
    try {
      if (selectedBlog.BlogID || selectedBlog.id) {
        await adminApi.updateBlog(selectedBlog.BlogID || selectedBlog.id, selectedBlog);
      } else {
        await adminApi.createBlog(selectedBlog);
      }
      setShowBlogModal(false);
      setSelectedBlog(null);
      fetchBlogs();
    } catch (err) {
      console.error('Error saving blog:', err);
      showError('Failed to save blog: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBlog = async () => {
    if (!selectedBlog) return;
    setActionLoading(true);
    try {
      await adminApi.deleteBlog(selectedBlog.BlogID || selectedBlog.id);
      setShowDeleteBlogModal(false);
      setSelectedBlog(null);
      fetchBlogs();
    } catch (err) {
      console.error('Error deleting blog:', err);
      showError('Failed to delete blog: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFeatured = async (blog) => {
    try {
      await adminApi.updateBlog(blog.BlogID || blog.id, { 
        ...blog, 
        IsFeatured: !blog.IsFeatured 
      });
      fetchBlogs();
    } catch (err) {
      console.error('Error toggling featured:', err);
    }
  };

  const handlePublishBlog = async (blog) => {
    try {
      if (blog.Status === 'published') {
        await adminApi.unpublishBlog(blog.BlogID || blog.id);
      } else {
        await adminApi.publishBlog(blog.BlogID || blog.id);
      }
      fetchBlogs();
    } catch (err) {
      console.error('Error publishing blog:', err);
    }
  };

  // FAQ handlers
  const handleSaveFaq = async () => {
    if (!selectedFaq) return;
    setActionLoading(true);
    try {
      await adminApi.saveFAQ(selectedFaq);
      setShowFaqModal(false);
      setSelectedFaq(null);
      fetchFaqs();
    } catch (err) {
      console.error('Error saving FAQ:', err);
      showError('Failed to save FAQ: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteFaq = async () => {
    if (!selectedFaq) return;
    setActionLoading(true);
    try {
      await adminApi.deleteFAQ(selectedFaq.FAQID || selectedFaq.id);
      setShowDeleteFaqModal(false);
      setSelectedFaq(null);
      fetchFaqs();
    } catch (err) {
      console.error('Error deleting FAQ:', err);
      showError('Failed to delete FAQ: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'published') {
      return <span className="admin-badge admin-badge-success"><i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>published</span>;
    }
    if (statusLower === 'draft') {
      return <span className="admin-badge admin-badge-warning">draft</span>;
    }
    if (statusLower === 'archived') {
      return <span className="admin-badge admin-badge-neutral">archived</span>;
    }
    return <span className="admin-badge admin-badge-neutral">{status}</span>;
  };

  const filteredBlogs = blogs.filter(blog => {
    if (statusFilter !== 'all' && (blog.Status || '').toLowerCase() !== statusFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        (blog.Title || '').toLowerCase().includes(searchLower) ||
        (blog.Author || '').toLowerCase().includes(searchLower) ||
        (blog.Category || '').toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const renderBlogs = () => (
    <>
      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['all', 'published', 'draft', 'archived'].map(status => (
            <button
              key={status}
              className={`admin-btn ${statusFilter === status ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
              onClick={() => setStatusFilter(status)}
              style={{ textTransform: 'capitalize' }}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="admin-search-input">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search blogs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            className="admin-btn admin-btn-primary"
            onClick={() => {
              setSelectedBlog({
                Title: '',
                Slug: '',
                Excerpt: '',
                Content: '',
                Category: 'Tips & Advice',
                Author: '',
                FeaturedImage: '',
                Status: 'draft',
                IsFeatured: false
              });
              setShowBlogModal(true);
            }}
          >
            <i className="fas fa-plus"></i> New Blog Post
          </button>
        </div>
      </div>

      {/* Blog Table */}
      <div className="admin-card">
        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner"></div>
            <p>Loading blogs...</p>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="admin-empty-state">
            <i className="fas fa-newspaper"></i>
            <h3>No Blog Posts</h3>
            <p>Create your first blog post to get started</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Views</th>
                  <th>Published</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBlogs.map((blog) => (
                  <tr key={blog.BlogID || blog.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {blog.FeaturedImage && (
                          <img 
                            src={blog.FeaturedImage} 
                            alt="" 
                            style={{ 
                              width: '48px', 
                              height: '36px', 
                              objectFit: 'cover', 
                              borderRadius: '4px' 
                            }} 
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 500, color: '#111827', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {blog.Title || blog.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            /{blog.Slug || blog.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{blog.Category || blog.category}</td>
                    <td style={{ color: '#5086E8' }}>{blog.Author || blog.author}</td>
                    <td>{getStatusBadge(blog.Status || blog.status)}</td>
                    <td>
                      <button
                        onClick={() => handleToggleFeatured(blog)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: blog.IsFeatured ? '#f59e0b' : '#d1d5db',
                          fontSize: '1.1rem'
                        }}
                        title={blog.IsFeatured ? 'Remove from featured' : 'Add to featured'}
                      >
                        <i className={`fas fa-star`}></i>
                      </button>
                    </td>
                    <td>{blog.Views || blog.views || 0}</td>
                    <td>{blog.PublishedAt ? formatDate(blog.PublishedAt) : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          onClick={() => window.open(`/blog/${blog.Slug || blog.slug}`, '_blank')}
                          title="Preview"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          onClick={async () => {
                            try {
                              const fullBlog = await adminApi.getBlogDetails(blog.BlogID || blog.id);
                              setSelectedBlog(fullBlog.blog || fullBlog);
                              setShowBlogModal(true);
                            } catch (err) {
                              setSelectedBlog(blog);
                              setShowBlogModal(true);
                            }
                          }}
                          title="Edit"
                        >
                          <i className="fas fa-pen"></i>
                        </button>
                        <button
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          onClick={() => handlePublishBlog(blog)}
                          title={blog.Status === 'published' ? 'Unpublish' : 'Publish'}
                        >
                          <i className={`fas ${blog.Status === 'published' ? 'fa-eye-slash' : 'fa-upload'}`}></i>
                        </button>
                        <button
                          className="admin-btn admin-btn-danger admin-btn-sm"
                          onClick={() => {
                            setSelectedBlog(blog);
                            setShowDeleteBlogModal(true);
                          }}
                          title="Delete"
                        >
                          <i className="fas fa-trash"></i>
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
    </>
  );

  const renderFaqs = () => (
    <>
      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search FAQs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          className="admin-btn admin-btn-primary"
          onClick={() => {
            setSelectedFaq({
              Question: '',
              Answer: '',
              Category: '',
              DisplayOrder: 0,
              IsActive: true
            });
            setShowFaqModal(true);
          }}
        >
          <i className="fas fa-plus"></i> New FAQ
        </button>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner"></div>
            <p>Loading FAQs...</p>
          </div>
        ) : faqs.length === 0 ? (
          <div className="admin-empty-state">
            <i className="fas fa-question-circle"></i>
            <h3>No FAQs</h3>
            <p>Create your first FAQ</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {faqs.map((faq, idx) => (
                  <tr key={faq.FAQID || faq.id || idx}>
                    <td>
                      <div style={{ maxWidth: '400px' }}>
                        <div style={{ fontWeight: 500, color: '#111827', marginBottom: '0.25rem' }}>
                          {faq.Question || faq.question}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(faq.Answer || faq.answer || '').replace(/<[^>]*>/g, '').substring(0, 80)}...
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-info">
                        {faq.Category || faq.category || 'General'}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${faq.IsActive !== false ? 'admin-badge-success' : 'admin-badge-secondary'}`}>
                        {faq.IsActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{faq.DisplayOrder || faq.displayOrder || idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          onClick={() => {
                            setSelectedFaq(faq);
                            setShowFaqModal(true);
                          }}
                          title="Edit"
                        >
                          <i className="fas fa-pen"></i>
                        </button>
                        <button
                          className="admin-btn admin-btn-danger admin-btn-sm"
                          onClick={() => {
                            setSelectedFaq(faq);
                            setShowDeleteFaqModal(true);
                          }}
                          title="Delete"
                        >
                          <i className="fas fa-trash"></i>
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
    </>
  );

  const renderBanners = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Banners & Announcements</h3>
        <button 
          className="admin-btn admin-btn-primary admin-btn-sm"
          onClick={() => {
            setSelectedBanner({ title: '', message: '', type: 'info', isActive: true });
            setShowBannerModal(true);
          }}
        >
          <i className="fas fa-plus"></i> Add Banner
        </button>
      </div>
      
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading banners...</p>
        </div>
      ) : banners.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fas fa-bullhorn"></i>
          <h3>No Banners</h3>
          <p>Create your first announcement banner</p>
        </div>
      ) : (
        <div className="admin-card-body">
          {banners.map((banner) => (
            <div 
              key={banner.BannerID || banner.id}
              style={{
                padding: '1rem',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{banner.Title || banner.title}</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{banner.Message || banner.message}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {banner.IsActive !== false ? (
                  <span className="admin-badge admin-badge-success">Active</span>
                ) : (
                  <span className="admin-badge admin-badge-neutral">Inactive</span>
                )}
                <button
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={() => {
                    setSelectedBanner(banner);
                    setShowBannerModal(true);
                  }}
                >
                  <i className="fas fa-pen"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-section">
      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'blogs' ? 'active' : ''}`} onClick={() => setActiveTab('blogs')}>
          <i className="fas fa-newspaper" style={{ marginRight: '0.5rem' }}></i>Blog Management
        </button>
        <button className={`admin-tab ${activeTab === 'faqs' ? 'active' : ''}`} onClick={() => setActiveTab('faqs')}>
          <i className="fas fa-question-circle" style={{ marginRight: '0.5rem' }}></i>FAQs
        </button>
        <button className={`admin-tab ${activeTab === 'banners' ? 'active' : ''}`} onClick={() => setActiveTab('banners')}>
          <i className="fas fa-bullhorn" style={{ marginRight: '0.5rem' }}></i>Banners
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'blogs' && renderBlogs()}
      {activeTab === 'faqs' && renderFaqs()}
      {activeTab === 'banners' && renderBanners()}

      {/* Blog Edit Modal - Matches Image 2 Design */}
      {showBlogModal && selectedBlog && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={(e) => e.target === e.currentTarget && setShowBlogModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
                {selectedBlog.BlogID || selectedBlog.id ? 'Edit Blog Post' : 'New Blog Post'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => window.open(`/blog/${selectedBlog.Slug}`, '_blank')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}
                >
                  <i className="fas fa-eye"></i> Preview
                </button>
                <button
                  onClick={() => setShowBlogModal(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    color: '#6b7280',
                    borderRadius: '6px'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
              {/* Row 1: Title, Category, Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 140px', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                    Title <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={selectedBlog.Title || ''}
                    onChange={(e) => setSelectedBlog({ ...selectedBlog, Title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.9375rem',
                      outline: 'none'
                    }}
                    placeholder="Enter blog title..."
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                    Category
                  </label>
                  <select
                    value={selectedBlog.Category || ''}
                    onChange={(e) => setSelectedBlog({ ...selectedBlog, Category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.9375rem',
                      background: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select...</option>
                    {blogCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                    Status
                  </label>
                  <select
                    value={selectedBlog.Status || 'draft'}
                    onChange={(e) => setSelectedBlog({ ...selectedBlog, Status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.9375rem',
                      background: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Row 2: URL Slug */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  URL Slug
                </label>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <span style={{ 
                    padding: '0.625rem 0.75rem',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRight: 'none',
                    borderRadius: '6px 0 0 6px',
                    color: '#6b7280',
                    fontSize: '0.9375rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    /blog/
                  </span>
                  <input
                    type="text"
                    value={selectedBlog.Slug || ''}
                    onChange={(e) => setSelectedBlog({ ...selectedBlog, Slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
                    style={{
                      flex: 1,
                      padding: '0.625rem 0.875rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0 6px 6px 0',
                      fontSize: '0.9375rem',
                      outline: 'none'
                    }}
                    placeholder="url-slug"
                  />
                </div>
              </div>

              {/* Row 3: Excerpt */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  Excerpt <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Short description shown in previews)</span>
                </label>
                <textarea
                  value={selectedBlog.Excerpt || ''}
                  onChange={(e) => setSelectedBlog({ ...selectedBlog, Excerpt: e.target.value })}
                  rows={2}
                  maxLength={500}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.9375rem',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Brief description of the blog post..."
                />
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  {(selectedBlog.Excerpt || '').length}/500 characters
                </div>
              </div>

              {/* Row 4: Featured Image URL */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  Featured Image URL
                </label>
                <input
                  type="text"
                  value={selectedBlog.FeaturedImage || ''}
                  onChange={(e) => setSelectedBlog({ ...selectedBlog, FeaturedImage: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.9375rem',
                    outline: 'none'
                  }}
                  placeholder="https://images.unsplash.com/photo-..."
                />
                {selectedBlog.FeaturedImage && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <img 
                      src={selectedBlog.FeaturedImage} 
                      alt="Featured preview" 
                      style={{ 
                        maxWidth: '150px',
                        maxHeight: '100px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }} 
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </div>

              {/* Row 5: Content Editor */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  Content <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <RichTextEditor
                  value={selectedBlog.Content || ''}
                  onChange={(content) => setSelectedBlog({ ...selectedBlog, Content: content })}
                  placeholder="Write your blog content here..."
                  height={280}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb'
            }}>
              <button
                onClick={() => setShowBlogModal(false)}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSelectedBlog({ ...selectedBlog, Status: 'draft' });
                  await handleSaveBlog();
                }}
                disabled={actionLoading}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: 'white',
                  border: '1px solid #5086E8',
                  borderRadius: '6px',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: '#5086E8',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.6 : 1
                }}
              >
                Save as Draft
              </button>
              <button
                onClick={handleSaveBlog}
                disabled={actionLoading}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: '#5086E8',
                  border: '1px solid #5086E8',
                  borderRadius: '6px',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: 'white',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.6 : 1
                }}
              >
                {actionLoading ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Edit Modal - Clean Design */}
      {showFaqModal && selectedFaq && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={(e) => e.target === e.currentTarget && setShowFaqModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '700px',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
                {selectedFaq.FAQID || selectedFaq.id ? 'Edit FAQ' : 'New FAQ'}
              </h2>
              <button
                onClick={() => setShowFaqModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  color: '#6b7280',
                  borderRadius: '6px'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
              {/* Row 1: Question and Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                    Question <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={selectedFaq.Question || selectedFaq.question || ''}
                    onChange={(e) => setSelectedFaq({ ...selectedFaq, Question: e.target.value, question: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.9375rem',
                      outline: 'none'
                    }}
                    placeholder="Enter the question..."
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                    Category
                  </label>
                  <select
                    value={selectedFaq.Category || selectedFaq.category || ''}
                    onChange={(e) => setSelectedFaq({ ...selectedFaq, Category: e.target.value, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.9375rem',
                      background: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="General">General</option>
                    <option value="Booking">Booking</option>
                    <option value="Payments">Payments</option>
                    <option value="Account">Account</option>
                    <option value="Vendors">Vendors</option>
                    <option value="Cancellation">Cancellation</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Answer Editor */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  Answer <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <RichTextEditor
                  value={selectedFaq.Answer || selectedFaq.answer || ''}
                  onChange={(content) => setSelectedFaq({ ...selectedFaq, Answer: content, answer: content })}
                  placeholder="Write the answer here..."
                  height={220}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb'
            }}>
              <button
                onClick={() => setShowFaqModal(false)}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFaq}
                disabled={actionLoading}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: '#5086E8',
                  border: '1px solid #5086E8',
                  borderRadius: '6px',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: 'white',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.6 : 1
                }}
              >
                {actionLoading ? 'Saving...' : 'Save FAQ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Blog Confirmation */}
      <ConfirmationModal
        isOpen={showDeleteBlogModal}
        onClose={() => setShowDeleteBlogModal(false)}
        title="Delete Blog Post"
        message={`Are you sure you want to delete "${selectedBlog?.Title || 'this blog post'}"? This action cannot be undone.`}
        confirmLabel={actionLoading ? 'Deleting...' : 'Delete'}
        onConfirm={handleDeleteBlog}
        variant="danger"
      />

      {/* Delete FAQ Confirmation */}
      <ConfirmationModal
        isOpen={showDeleteFaqModal}
        onClose={() => setShowDeleteFaqModal(false)}
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ? This action cannot be undone."
        confirmLabel={actionLoading ? 'Deleting...' : 'Delete'}
        onConfirm={handleDeleteFaq}
        variant="danger"
      />
    </div>
  );
}

export default ContentSection;
