import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import { PageLayout } from '../components/PageWrapper';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProfileModal from '../components/ProfileModal';
import MessagingWidget from '../components/MessagingWidget';
import MobileBottomNav from '../components/MobileBottomNav';
import EmojiPicker from 'emoji-picker-react';
import RichTextEditor from '../components/common/RichTextEditor';

function ForumPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', categoryId: '' });
  const [creating, setCreating] = useState(false);
  
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const emojiPickerRef = useRef(null);


  // Handle opening map - navigate to explore page with map open
  const handleOpenMap = () => {
    navigate('/?map=true');
  };

  // Handle emoji selection for post content
  const onEmojiClick = (emojiData) => {
    setNewPost(prev => ({ ...prev, content: prev.content + emojiData.emoji }));
    setShowEmojiPicker(false);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/forum/categories`);
        const data = await response.json();
        if (data.success) {
          setCategories(data.categories);
          // Set selected category from URL
          if (slug) {
            const cat = data.categories.find(c => c.Slug === slug);
            setSelectedCategory(cat || null);
          }
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, [slug]);

  // Load posts
  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        sort: sortBy
      });
      if (selectedCategory) params.append('category', selectedCategory.Slug);
      if (searchQuery) params.append('search', searchQuery);
      if (currentUser?.id) params.append('userId', currentUser.id);
      
      const response = await fetch(`${API_BASE_URL}/forum/posts?${params}`);
      const data = await response.json();
      if (data.success) {
        setPosts(data.posts);
        setTotalCount(data.totalCount);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, selectedCategory, searchQuery, currentUser?.id]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Handle category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setPage(1);
    // Close mobile sidebar when category is selected
    setMobileSidebarOpen(false);
    if (category) {
      navigate(`/forum/${category.Slug}`);
    } else {
      navigate('/forum');
    }
  };

  // Handle vote
  const handleVote = async (postId, voteType) => {
    if (!currentUser) {
      setProfileModalOpen(true);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/forum/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          postId,
          voteType
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setPosts(posts.map(p => 
          p.PostID === postId 
            ? { ...p, UpvoteCount: data.UpvoteCount, DownvoteCount: data.DownvoteCount, Score: data.Score, UserVote: voteType === 0 ? null : voteType }
            : p
        ));
      }
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  // Create post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setProfileModalOpen(true);
      return;
    }
    
    if (!newPost.title.trim() || !newPost.content.trim() || !newPost.categoryId) {
      return;
    }
    
    setCreating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/forum/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: parseInt(newPost.categoryId),
          authorId: currentUser.id,
          title: newPost.title,
          content: newPost.content
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setShowCreatePost(false);
        setNewPost({ title: '', content: '', categoryId: '' });
        navigate(`/forum/post/${data.post.Slug}`);
      }
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setCreating(false);
    }
  };

  // Format time ago
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <PageLayout variant="fullWidth" pageClassName="forum-page" style={{ backgroundColor: '#ffffff' }}>
      <Header 
        onSearch={() => {}} 
        onProfileClick={() => currentUser ? navigate('/dashboard') : setProfileModalOpen(true)} 
        onWishlistClick={() => {
          if (currentUser) {
            navigate('/dashboard?section=favorites');
          } else {
            setProfileModalOpen(true);
          }
        }} 
        onChatClick={() => {
          if (currentUser) {
            navigate(`/dashboard?section=${currentUser.isVendor ? 'vendor-messages' : 'messages'}`);
          } else {
            setProfileModalOpen(true);
          }
        }} 
        onNotificationsClick={() => {}} 
      />
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

      {/* Mobile Menu Bar - Below Header */}
      <div className="mobile-menu-bar" style={{
        display: 'none',
        alignItems: 'center',
        padding: '8px 16px',
        background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <button
          onClick={() => setMobileSidebarOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151'
          }}
        >
          <i className="fas fa-bars" style={{ fontSize: '14px' }}></i>
          <span>Categories</span>
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="forum-sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1099
          }}
        />
      )}

      {/* Main Layout with Left Sidebar - uses page-wrapper constraints */}
      <div className="forum-layout-wrapper page-wrapper" style={{ display: 'flex', minHeight: 'calc(100vh - 80px)' }}>
        {/* Left Sidebar - Categories (Reddit-style) */}
        <div className={`forum-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`} style={{
          width: '280px',
          minWidth: '280px',
          borderRight: '1px solid #e5e7eb',
          background: '#ffffff',
          flexShrink: 0,
          position: 'sticky',
          top: '80px',
          height: 'calc(100vh - 80px)',
          overflowY: 'auto'
        }}>
          {/* Mobile Header for Sidebar */}
          <div className="forum-sidebar-header" style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            background: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" style={{ height: '28px' }} />
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>Categories</span>
            </div>
          </div>
          
          <div style={{ padding: '20px' }}>
            {/* Create Post Button - at the top */}
            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                currentUser ? setShowCreatePost(true) : setProfileModalOpen(true);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#4F86E8',
                color: 'white',
                border: 'none',
                borderRadius: '24px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '14px',
                marginBottom: '24px',
                boxShadow: '0 2px 8px rgba(79, 134, 232, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#3d6fc7'}
              onMouseLeave={(e) => e.target.style.background = '#4F86E8'}
            >
              <i className="fas fa-plus"></i>
              Create Post
            </button>
            
            {/* Topics Section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                color: '#6b7280', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px', 
                padding: '8px 12px',
                marginBottom: '4px'
              }}>
                Topics
              </div>
              
              <button
                onClick={() => handleCategorySelect(null)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: !selectedCategory ? '#EBF2FF' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '14px',
                  fontWeight: !selectedCategory ? 600 : 500,
                  color: !selectedCategory ? '#4F86E8' : '#374151',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { if (selectedCategory) e.target.style.background = '#f3f4f6'; }}
                onMouseLeave={(e) => { if (selectedCategory) e.target.style.background = 'transparent'; }}
              >
                <i className="fas fa-home" style={{ width: '20px', color: '#4F86E8', fontSize: '16px' }}></i>
                Home
              </button>
              
              <button
                onClick={() => { setSortBy('top'); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: sortBy === 'top' ? '#EBF2FF' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '14px',
                  fontWeight: sortBy === 'top' ? 600 : 500,
                  color: sortBy === 'top' ? '#4F86E8' : '#374151',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { if (sortBy !== 'top') e.target.style.background = '#f3f4f6'; }}
                onMouseLeave={(e) => { if (sortBy !== 'top') e.target.style.background = 'transparent'; }}
              >
                <i className="fas fa-chart-line" style={{ width: '20px', color: '#10b981', fontSize: '16px' }}></i>
                Popular
              </button>
              
              <button
                onClick={() => { setSortBy('hot'); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: sortBy === 'hot' ? '#EBF2FF' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '14px',
                  fontWeight: sortBy === 'hot' ? 600 : 500,
                  color: sortBy === 'hot' ? '#4F86E8' : '#374151',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { if (sortBy !== 'hot') e.target.style.background = '#f3f4f6'; }}
                onMouseLeave={(e) => { if (sortBy !== 'hot') e.target.style.background = 'transparent'; }}
              >
                <i className="fas fa-fire" style={{ width: '20px', color: '#f59e0b', fontSize: '16px' }}></i>
                Hot
              </button>
            </div>
            
            <div style={{ height: '1px', background: '#e5e7eb', margin: '16px 0' }}></div>
            
            {/* Categories Section */}
            <div>
              <div style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                color: '#6b7280', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px', 
                padding: '8px 12px',
                marginBottom: '4px'
              }}>
                Categories
              </div>
              
              {categories.map(cat => (
                <button
                  key={cat.CategoryID}
                  onClick={() => handleCategorySelect(cat)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: selectedCategory?.CategoryID === cat.CategoryID ? '#EBF2FF' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    fontWeight: selectedCategory?.CategoryID === cat.CategoryID ? 600 : 500,
                    color: selectedCategory?.CategoryID === cat.CategoryID ? '#4F86E8' : '#374151',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => { if (selectedCategory?.CategoryID !== cat.CategoryID) e.target.style.background = '#f3f4f6'; }}
                  onMouseLeave={(e) => { if (selectedCategory?.CategoryID !== cat.CategoryID) e.target.style.background = 'transparent'; }}
                >
                  <i className={`fas ${cat.Icon}`} style={{ width: '20px', color: cat.Color, fontSize: '16px' }}></i>
                  <span style={{ flex: 1 }}>{cat.Name}</span>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#9ca3af',
                    background: '#f3f4f6',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 500
                  }}>{cat.PostCount || 0}</span>
                </button>
              ))}
            </div>
            
            <div style={{ height: '1px', background: '#e5e7eb', margin: '16px 0' }}></div>
            
            {/* Community Guidelines */}
            <div style={{ 
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '12px',
              marginTop: '16px'
            }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: 600, 
                color: '#374151',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fas fa-info-circle" style={{ color: '#4F86E8' }}></i>
                Community Guidelines
              </div>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '16px', 
                fontSize: '12px', 
                color: '#6b7280',
                lineHeight: 1.6
              }}>
                <li>Be respectful to others</li>
                <li>No spam or self-promotion</li>
                <li>Stay on topic</li>
                <li>Report inappropriate content</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="forum-main-content" style={{ flex: 1, background: '#f8f9fa', padding: '20px 24px' }}>
          <div style={{ maxWidth: '100%' }}>
            {/* Sort & Search Bar */}
            <div style={{
              background: '#fff',
              borderRadius: '4px',
              padding: '10px 12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: '1px solid #ccc',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['newest', 'top', 'hot'].map(sort => (
                  <button
                    key={sort}
                    onClick={() => { setSortBy(sort); setPage(1); }}
                    style={{
                      padding: '6px 12px',
                      background: sortBy === sort ? '#edeff1' : 'transparent',
                      color: sortBy === sort ? '#1c1c1c' : '#878a8c',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontWeight: sortBy === sort ? 700 : 600,
                      fontSize: '14px',
                      textTransform: 'capitalize',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <i className={`fas ${sort === 'newest' ? 'fa-clock' : sort === 'top' ? 'fa-arrow-up' : 'fa-fire'}`} style={{ fontSize: '12px' }}></i>
                    {sort === 'newest' ? 'New' : sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #edeff1',
                    borderRadius: '4px',
                    fontSize: '14px',
                    background: '#f6f7f8'
                  }}
                />
              </div>
            </div>

            {/* Posts List */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner"></div>
              </div>
            ) : posts.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '12px', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <i className="fas fa-comments" style={{ fontSize: '3rem', color: '#ddd', marginBottom: '1rem' }}></i>
                <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>No posts yet</h3>
                <p style={{ color: '#999' }}>Be the first to start a discussion!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {posts.map(post => (
                  <div
                    key={post.PostID}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '1rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      display: 'flex',
                      gap: '1rem'
                    }}
                  >
                    {/* Vote buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', minWidth: '40px' }}>
                      <button
                        onClick={() => handleVote(post.PostID, post.UserVote === 1 ? 0 : 1)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: post.UserVote === 1 ? '#f97316' : '#999',
                          fontSize: '1.25rem'
                        }}
                      >
                        <i className="fas fa-arrow-up"></i>
                      </button>
                      <span style={{ fontWeight: 600, color: post.Score > 0 ? '#f97316' : post.Score < 0 ? '#6366f1' : '#666' }}>
                        {post.Score}
                      </span>
                      <button
                        onClick={() => handleVote(post.PostID, post.UserVote === -1 ? 0 : -1)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: post.UserVote === -1 ? '#6366f1' : '#999',
                          fontSize: '1.25rem'
                        }}
                      >
                        <i className="fas fa-arrow-down"></i>
                      </button>
                    </div>

                    {/* Post content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: `${post.CategoryColor}15`,
                            color: post.CategoryColor,
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 500
                          }}
                        >
                          <i className={`fas ${post.CategoryIcon}`} style={{ marginRight: '0.25rem' }}></i>
                          {post.CategoryName}
                        </span>
                        <span style={{ color: '#999', fontSize: '0.8rem' }}>
                          Posted by {post.AuthorName} • {formatTimeAgo(post.CreatedAt)}
                        </span>
                      </div>
                      <h3
                        onClick={() => navigate(`/forum/post/${post.Slug}`)}
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          color: '#222',
                          marginBottom: '0.5rem',
                          cursor: 'pointer'
                        }}
                      >
                        {post.Title}
                      </h3>
                      <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                        {post.Content.length > 200 ? post.Content.substring(0, 200) + '...' : post.Content}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', color: '#878a8c', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => navigate(`/forum/post/${post.Slug}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#878a8c',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#f6f7f8'}
                          onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                          <i className="fas fa-comment-alt"></i> {post.CommentCount} Comments
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(window.location.origin + `/forum/post/${post.Slug}`);
                            alert('Link copied to clipboard!');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#878a8c',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#f6f7f8'}
                          onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                          <i className="fas fa-share"></i> Share
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!currentUser) {
                              setProfileModalOpen(true);
                              return;
                            }
                            alert('Post saved!');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#878a8c',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#f6f7f8'}
                          onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                          <i className="fas fa-bookmark"></i> Save
                        </button>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>
                          <i className="fas fa-eye"></i> {post.ViewCount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalCount > 20 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    opacity: page === 1 ? 0.5 : 1
                  }}
                >
                  Previous
                </button>
                <span style={{ padding: '0.5rem 1rem', color: '#666' }}>
                  Page {page} of {Math.ceil(totalCount / 20)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(totalCount / 20)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: page >= Math.ceil(totalCount / 20) ? 'not-allowed' : 'pointer',
                    opacity: page >= Math.ceil(totalCount / 20) ? 0.5 : 1
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Post Modal - Styled to match other modals */}
      {showCreatePost && (
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
          onClick={(e) => e.target === e.currentTarget && setShowCreatePost(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '700px',
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
                Create New Post
              </h2>
              <button
                onClick={() => setShowCreatePost(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  color: '#6b7280',
                  borderRadius: '6px'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
                {/* Row 1: Title and Category */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                      Title <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newPost.title}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                      required
                      maxLength={300}
                      placeholder="What's your question or topic?"
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.875rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.9375rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                      Category <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={newPost.categoryId}
                      onChange={(e) => setNewPost({ ...newPost, categoryId: e.target.value })}
                      required
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
                      <option value="">Select a category</option>
                      {categories.map(cat => (
                        <option key={cat.CategoryID} value={cat.CategoryID}>{cat.Name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Content Editor */}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                    Content <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <RichTextEditor
                    value={newPost.content}
                    onChange={(content) => setNewPost({ ...newPost, content: content })}
                    placeholder="Share more details..."
                    height={220}
                  />
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      style={{
                        background: showEmojiPicker ? '#f3f4f6' : 'transparent',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '0.5rem 0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        color: showEmojiPicker ? '#5e72e4' : '#6b7280',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}
                    >
                      <i className="far fa-smile"></i>
                      Emoji
                    </button>
                  </div>
                  {showEmojiPicker && (
                    <div 
                      ref={emojiPickerRef}
                      style={{
                        position: 'absolute',
                        bottom: '45px',
                        left: '0',
                        zIndex: 1001
                      }}
                    >
                      <EmojiPicker 
                        onEmojiClick={onEmojiClick}
                        width={320}
                        height={380}
                        searchDisabled={false}
                        skinTonesDisabled
                        previewConfig={{ showPreview: false }}
                      />
                    </div>
                  )}
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
                  type="button"
                  onClick={() => setShowCreatePost(false)}
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
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: '#5e72e4',
                    border: '1px solid #5e72e4',
                    borderRadius: '6px',
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    color: 'white',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    opacity: creating ? 0.6 : 1
                  }}
                >
                  {creating ? 'Creating...' : 'Create Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
      {currentUser && <MessagingWidget />}
      <MobileBottomNav 
        onOpenDashboard={(section) => {
          if (section) {
            const sectionMap = {
              'messages': currentUser?.isVendor ? 'vendor-messages' : 'messages',
              'dashboard': 'dashboard'
            };
            navigate(`/dashboard?section=${sectionMap[section] || section}`);
          } else {
            navigate('/dashboard');
          }
        }}
        onCloseDashboard={() => {}}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenMap={handleOpenMap}
        onOpenMessages={() => {
          // Dispatch event to open messaging widget
          window.dispatchEvent(new CustomEvent('openMessagingWidget', { detail: {} }));
        }}
      />
    </PageLayout>
  );
}

export default ForumPage;
