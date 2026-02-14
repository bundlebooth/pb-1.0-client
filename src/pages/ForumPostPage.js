import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, GIPHY_API_KEY } from '../config';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import { PageLayout, ContentWrapper } from '../components/PageWrapper';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProfileModal from '../components/ProfileModal';
import MessagingWidget from '../components/MessagingWidget';

function ForumPostPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { currentUser } = useAuth();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hotPosts, setHotPosts] = useState([]);
  
  // Emoji and GIF picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState('smileys');
  const [gifs, setGifs] = useState([]);
  const [gifsLoading, setGifsLoading] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [selectedGif, setSelectedGif] = useState(null); // Store selected GIF separately
  
  // Emoji categories
  const emojiCategories = {
    smileys: { icon: '😀', name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'] },
    gestures: { icon: '👋', name: 'Gestures', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪'] },
    hearts: { icon: '❤️', name: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💌', '💋', '😻', '😽', '🫶'] },
    celebration: { icon: '🎉', name: 'Celebration', emojis: ['🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🍰', '🧁', '🥳', '🥂', '🍾', '✨', '🌟', '⭐', '💫', '🔥', '💥', '🎆', '🎇', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎗️', '🎯', '🎪', '🎭', '🎨'] }
  };
  
  // GIPHY_API_KEY imported from config.js
  
  // Fetch GIFs
  const fetchGifs = async (query = '') => {
    setGifsLoading(true);
    try {
      const endpoint = query 
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const mappedGifs = data.data.map(gif => ({
          id: gif.id,
          // Use fixed_height.url like messaging - this is the animated version
          url: gif.images.fixed_height.url,
          preview: gif.images.fixed_height_still?.url || gif.images.fixed_height.url,
          alt: gif.title || 'GIF'
        }));
        setGifs(mappedGifs);
      } else {
        setGifs([]);
      }
    } catch (error) {
      console.error('Error fetching GIFs:', error);
      setGifs([]);
    }
    setGifsLoading(false);
  };
  
  // Load trending GIFs when picker opens
  useEffect(() => {
    if (showGifPicker) {
      fetchGifs();
    }
  }, [showGifPicker]);
  
  // Insert emoji into comment
  const insertEmoji = (emoji) => {
    setNewComment(prev => prev + emoji);
  };
  
  // Select GIF - store it separately, don't put URL in textarea
  const selectGif = (gifUrl) => {
    setSelectedGif(gifUrl);
    setShowGifPicker(false);
  };
  
  // Remove selected GIF
  const removeSelectedGif = () => {
    setSelectedGif(null);
  };
  
  // Check if content is a GIF URL
  const isGifUrl = (content) => {
    if (!content) return false;
    const trimmed = content.trim();
    return trimmed.match(/\.(gif)($|\?)/i) || 
           trimmed.includes('giphy.com') || 
           trimmed.includes('tenor.com') ||
           trimmed.includes('media.giphy.com') ||
           trimmed.match(/^https?:\/\/[^\s]+\.(gif|webp)/i);
  };
  
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Load post and comments
  const loadPost = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentUser?.id) params.append('userId', currentUser.id);
      
      const response = await fetch(`${API_BASE_URL}/forum/posts/${slug}?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setPost(data.post);
        setComments(data.comments || []);
      } else {
        navigate('/forum');
      }
    } catch (err) {
      console.error('Failed to load post:', err);
      navigate('/forum');
    } finally {
      setLoading(false);
    }
  }, [slug, currentUser?.id, navigate]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  // Load hot posts for sidebar
  useEffect(() => {
    const fetchHotPosts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/forum/posts?sortBy=hot&limit=5`);
        const data = await response.json();
        if (data.success && data.posts) {
          // Filter out current post
          setHotPosts(data.posts.filter(p => p.Slug !== slug).slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load hot posts:', err);
      }
    };
    fetchHotPosts();
  }, [slug]);

  // Handle vote on post
  const handlePostVote = async (voteType) => {
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
          postId: post.PostID,
          voteType
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setPost(prev => ({
          ...prev,
          UpvoteCount: data.UpvoteCount,
          DownvoteCount: data.DownvoteCount,
          Score: data.Score,
          UserVote: voteType === 0 ? null : voteType
        }));
      }
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  // Handle vote on comment
  const handleCommentVote = async (commentId, voteType) => {
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
          commentId,
          voteType
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setComments(comments.map(c => 
          c.CommentID === commentId 
            ? { ...c, UpvoteCount: data.UpvoteCount, DownvoteCount: data.DownvoteCount, Score: data.Score, UserVote: voteType === 0 ? null : voteType }
            : c
        ));
      }
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  // Submit comment
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setProfileModalOpen(true);
      return;
    }
    
    // Allow submit if there's text OR a selected GIF
    if (!newComment.trim() && !selectedGif) return;
    
    // Combine text and GIF URL for submission
    const commentContent = selectedGif 
      ? (newComment.trim() ? `${newComment.trim()}\n${selectedGif}` : selectedGif)
      : newComment;
    
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/forum/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.PostID,
          authorId: currentUser.id,
          content: commentContent,
          parentCommentId: replyTo?.CommentID || null
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setNewComment('');
        setSelectedGif(null); // Clear selected GIF
        setReplyTo(null);
        loadPost(); // Reload to get updated comments
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setSubmitting(false);
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

  // State for collapsed comments
  const [collapsedComments, setCollapsedComments] = useState(new Set());
  
  const toggleCollapse = (commentId) => {
    setCollapsedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Render comment with nested replies - Reddit style with connecting lines
  const renderComment = (comment, level = 0) => {
    const childComments = comments.filter(c => c.ParentCommentID === comment.CommentID);
    const isCollapsed = collapsedComments.has(comment.CommentID);
    
    return (
      <div 
        key={comment.CommentID} 
        id={`comment-${comment.CommentID}`}
        style={{ 
          marginLeft: level > 0 ? '20px' : 0, 
          marginTop: level === 0 ? '16px' : '8px',
          position: 'relative'
        }}
      >
        {/* Reddit-style connecting line */}
        {level > 0 && (
          <div 
            style={{
              position: 'absolute',
              left: '-12px',
              top: 0,
              bottom: 0,
              width: '2px',
              background: '#e5e7eb',
              cursor: 'pointer'
            }}
            onClick={() => toggleCollapse(comment.CommentID)}
            title={isCollapsed ? 'Expand thread' : 'Collapse thread'}
          />
        )}
        <div style={{
          background: 'transparent',
          padding: level > 0 ? '8px 0' : '12px 0',
          borderRadius: '4px'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {/* Vote buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem' }}>
              <button
                onClick={() => handleCommentVote(comment.CommentID, comment.UserVote === 1 ? 0 : 1)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: comment.UserVote === 1 ? '#f97316' : '#999',
                  fontSize: '0.875rem',
                  padding: '0.25rem'
                }}
              >
                <i className="fas fa-arrow-up"></i>
              </button>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: comment.Score > 0 ? '#f97316' : comment.Score < 0 ? '#6366f1' : '#666' }}>
                {comment.Score}
              </span>
              <button
                onClick={() => handleCommentVote(comment.CommentID, comment.UserVote === -1 ? 0 : -1)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: comment.UserVote === -1 ? '#6366f1' : '#999',
                  fontSize: '0.875rem',
                  padding: '0.25rem'
                }}
              >
                <i className="fas fa-arrow-down"></i>
              </button>
            </div>

            {/* Comment content */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {comment.AuthorAvatar ? (
                  <img 
                    src={comment.AuthorAvatar} 
                    alt="" 
                    style={{ width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer' }}
                    onClick={() => navigate(`/profile/${comment.AuthorID}`)}
                  />
                ) : (
                  <div 
                    style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => navigate(`/profile/${comment.AuthorID}`)}
                  >
                    <i className="fas fa-user" style={{ fontSize: '0.625rem', color: '#999' }}></i>
                  </div>
                )}
                <span 
                  style={{ fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', color: '#4F86E8' }}
                  onClick={() => navigate(`/profile/${comment.AuthorID}`)}
                >
                  {comment.AuthorName}
                </span>
                <span style={{ color: '#999', fontSize: '0.75rem' }}>• {formatTimeAgo(comment.CreatedAt)}</span>
              </div>
              <div style={{ color: '#333', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                {comment.IsDeleted ? (
                  <em style={{ color: '#999' }}>[deleted]</em>
                ) : (
                  <>
                    {/* Render text content (excluding GIF URLs) */}
                    {comment.Content.split('\n').map((line, idx) => {
                      if (isGifUrl(line)) {
                        return (
                          <img 
                            key={idx}
                            src={line} 
                            alt="GIF" 
                            style={{ 
                              maxWidth: '300px', 
                              maxHeight: '200px', 
                              borderRadius: '8px',
                              display: 'block',
                              marginTop: idx > 0 ? '8px' : 0
                            }} 
                          />
                        );
                      }
                      return line ? <p key={idx} style={{ margin: idx > 0 ? '8px 0 0 0' : 0 }}>{line}</p> : null;
                    })}
                  </>
                )}
              </div>
              {!comment.IsDeleted && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        setProfileModalOpen(true);
                        return;
                      }
                      setReplyTo(comment);
                      // Scroll to comment form and focus
                      setTimeout(() => {
                        const textarea = document.querySelector('textarea[placeholder*="thoughts"]');
                        if (textarea) {
                          textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          textarea.focus();
                        }
                      }, 100);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <i className="fas fa-reply"></i>
                    Reply
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.href}#comment-${comment.CommentID}`);
                      const toast = document.createElement('div');
                      toast.textContent = 'Link copied!';
                      toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-size:14px;';
                      document.body.appendChild(toast);
                      setTimeout(() => toast.remove(), 2000);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <i className="fas fa-share"></i>
                    Share
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Child comments with collapse/expand */}
        {childComments.length > 0 && !isCollapsed && (
          childComments.map(child => renderComment(child, level + 1))
        )}
        {childComments.length > 0 && isCollapsed && (
          <button
            onClick={() => toggleCollapse(comment.CommentID)}
            style={{
              background: 'none',
              border: 'none',
              color: '#4F86E8',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600,
              padding: '8px 0',
              marginLeft: '20px'
            }}
          >
            <i className="fas fa-plus-square" style={{ marginRight: '4px' }}></i>
            {childComments.length} more {childComments.length === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <Header onSearch={() => {}} onProfileClick={() => {}} onWishlistClick={() => {}} onChatClick={() => {}} onNotificationsClick={() => {}} />
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!post) return null;

  const topLevelComments = comments.filter(c => !c.ParentCommentID);

  return (
    <PageLayout variant="fullWidth" pageClassName="forum-post-page" style={{ backgroundColor: '#f8f9fa' }}>
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
      
      <div className="page-wrapper" style={{ padding: '2rem 0', display: 'flex', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Main Content */}
        <div style={{ flex: 1, maxWidth: '800px' }}>
          {/* Back button */}
          <button
            onClick={() => navigate('/forum')}
            style={{
              background: 'none',
              border: 'none',
              color: '#6366f1',
              cursor: 'pointer',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <i className="fas fa-arrow-left"></i>
            Back to Forum
          </button>

        {/* Post */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {/* Vote buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', minWidth: '50px' }}>
              <button
                onClick={() => handlePostVote(post.UserVote === 1 ? 0 : 1)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: post.UserVote === 1 ? '#f97316' : '#999',
                  fontSize: '1.5rem'
                }}
              >
                <i className="fas fa-arrow-up"></i>
              </button>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: post.Score > 0 ? '#f97316' : post.Score < 0 ? '#6366f1' : '#666' }}>
                {post.Score}
              </span>
              <button
                onClick={() => handlePostVote(post.UserVote === -1 ? 0 : -1)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: post.UserVote === -1 ? '#6366f1' : '#999',
                  fontSize: '1.5rem'
                }}
              >
                <i className="fas fa-arrow-down"></i>
              </button>
            </div>

            {/* Post content */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span
                  onClick={() => navigate(`/forum/${post.CategorySlug}`)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: `${post.CategoryColor}15`,
                    color: post.CategoryColor,
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <i className={`fas ${post.CategoryIcon}`} style={{ marginRight: '0.25rem' }}></i>
                  {post.CategoryName}
                </span>
                <span style={{ color: '#999', fontSize: '0.8rem' }}>
                  Posted by
                </span>
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                  onClick={() => navigate(`/profile/${post.AuthorID}`)}
                >
                  {post.AuthorAvatar ? (
                    <img src={post.AuthorAvatar} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e5e7eb' }}></div>
                  )}
                  <span style={{ fontWeight: 500, fontSize: '0.8rem', color: '#4F86E8' }}>{post.AuthorName}</span>
                </div>
                <span style={{ color: '#999', fontSize: '0.8rem' }}>
                  • {formatTimeAgo(post.CreatedAt)}
                </span>
              </div>
              
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#222', marginBottom: '1rem' }}>
                {post.Title}
              </h1>
              
              <div style={{ color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {post.Content}
              </div>

              {post.ImageURL && (
                <img 
                  src={post.ImageURL} 
                  alt="" 
                  style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '1rem' }}
                />
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', color: '#878a8c', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontWeight: 700 }}>
                  <i className="fas fa-comment-alt"></i> {post.CommentCount} Comments
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    // Show toast notification
                    const toast = document.createElement('div');
                    toast.textContent = 'Link copied to clipboard!';
                    toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-size:14px;';
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 2000);
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
                  onClick={() => {
                    if (!currentUser) {
                      setProfileModalOpen(true);
                      return;
                    }
                    // Show toast notification
                    const toast = document.createElement('div');
                    toast.textContent = 'Post saved!';
                    toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-size:14px;';
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 2000);
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
                <button
                  onClick={() => {
                    if (!currentUser) {
                      setProfileModalOpen(true);
                      return;
                    }
                    // Show toast notification
                    const toast = document.createElement('div');
                    toast.textContent = 'Thank you for your report. We will review this post.';
                    toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-size:14px;';
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 2000);
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
                  <i className="fas fa-flag"></i> Report
                </button>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>
                  <i className="fas fa-eye"></i> {post.ViewCount} views
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Comment form */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            {replyTo ? `Replying to ${replyTo.AuthorName}` : 'Add a comment'}
          </h3>
          {replyTo && (
            <div style={{ 
              background: '#f3f4f6', 
              padding: '0.75rem', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div style={{ flex: 1 }}>
                {isGifUrl(replyTo.Content) ? (
                  <img 
                    src={replyTo.Content.trim()} 
                    alt="GIF" 
                    style={{ 
                      maxWidth: '150px', 
                      maxHeight: '100px', 
                      borderRadius: '6px'
                    }} 
                  />
                ) : (
                  <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>
                    {replyTo.Content.length > 100 ? replyTo.Content.substring(0, 100) + '...' : replyTo.Content}
                  </p>
                )}
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="modal-close-btn"
                style={{ width: '28px', height: '28px', fontSize: '16px' }}
              >
                ×
              </button>
            </div>
          )}
          <form onSubmit={handleSubmitComment}>
            <div style={{ position: 'relative' }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={currentUser ? "What are your thoughts?" : "Please log in to comment"}
                disabled={!currentUser || post.IsLocked}
                rows={selectedGif ? 2 : 4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  marginBottom: '0.5rem'
                }}
              />
              
              {/* Selected GIF Preview */}
              {selectedGif && (
                <div style={{
                  position: 'relative',
                  display: 'inline-block',
                  marginBottom: '0.5rem'
                }}>
                  <img 
                    src={selectedGif} 
                    alt="Selected GIF" 
                    style={{
                      maxWidth: '200px',
                      maxHeight: '150px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  />
                  <button
                    type="button"
                    onClick={removeSelectedGif}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
              
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: '8px',
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  padding: '12px',
                  width: '280px',
                  zIndex: 100
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Emojis</span>
                    <button 
                      onClick={() => setShowEmojiPicker(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '14px', padding: '4px' }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                    {Object.entries(emojiCategories).map(([key, cat]) => (
                      <button
                        key={key}
                        onClick={() => setEmojiCategory(key)}
                        style={{
                          padding: '6px 8px',
                          background: emojiCategory === key ? '#f3f4f6' : 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                        title={cat.name}
                      >
                        {cat.icon}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px', maxHeight: '150px', overflowY: 'auto' }}>
                    {emojiCategories[emojiCategory].emojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        onClick={() => insertEmoji(emoji)}
                        style={{
                          padding: '4px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '18px',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* GIF Picker */}
              {showGifPicker && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: '8px',
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  padding: '12px',
                  width: '320px',
                  zIndex: 100
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>GIFs</span>
                    <button 
                      onClick={() => setShowGifPicker(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '14px', padding: '4px' }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Search GIFs..."
                      value={gifSearchQuery}
                      onChange={(e) => setGifSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && fetchGifs(gifSearchQuery)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}
                    />
                    <button
                      onClick={() => fetchGifs(gifSearchQuery)}
                      style={{
                        padding: '8px 12px',
                        background: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fas fa-search"></i>
                    </button>
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '6px',
                    maxHeight: '280px',
                    overflowY: 'auto',
                    paddingRight: '4px'
                  }}>
                    {gifsLoading ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                        <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                        Loading GIFs...
                      </div>
                    ) : gifs.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '13px' }}>
                        No GIFs found. Try searching for something!
                      </div>
                    ) : gifs.map(gif => (
                      <button
                        key={gif.id}
                        type="button"
                        onClick={() => selectGif(gif.url)}
                        style={{
                          padding: 0,
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          background: '#f9fafb',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          height: '100px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img 
                          src={gif.url} 
                          alt={gif.alt}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', textAlign: 'center' }}>
                    <img src="https://giphy.com/static/img/poweredby_giphy.png" alt="Powered by GIPHY" style={{ height: '14px', opacity: 0.6 }} />
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Emoji and GIF buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                  disabled={!currentUser || post.IsLocked}
                  style={{
                    padding: '8px 12px',
                    background: showEmojiPicker ? '#f3f4f6' : 'white',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: currentUser && !post.IsLocked ? 'pointer' : 'not-allowed',
                    fontSize: '16px',
                    opacity: currentUser && !post.IsLocked ? 1 : 0.5
                  }}
                  title="Add emoji"
                >
                  😀
                </button>
                <button
                  type="button"
                  onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                  disabled={!currentUser || post.IsLocked}
                  style={{
                    padding: '8px 12px',
                    background: showGifPicker ? '#f3f4f6' : 'white',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: currentUser && !post.IsLocked ? 'pointer' : 'not-allowed',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b7280',
                    opacity: currentUser && !post.IsLocked ? 1 : 0.5
                  }}
                  title="Add GIF"
                >
                  GIF
                </button>
              </div>
              
              <button
                type="submit"
                disabled={!currentUser || (!newComment.trim() && !selectedGif) || submitting || post.IsLocked}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: (!currentUser || (!newComment.trim() && !selectedGif) || submitting) ? 'not-allowed' : 'pointer',
                  opacity: (!currentUser || (!newComment.trim() && !selectedGif) || submitting) ? 0.5 : 1
                }}
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        </div>

        {/* Comments */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Comments ({post.CommentCount})
          </h3>
          
          {topLevelComments.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
              No comments yet. Be the first to share your thoughts!
            </p>
          ) : (
            topLevelComments.map(comment => renderComment(comment))
          )}
        </div>
        </div>
        
        {/* Hot Posts Sidebar */}
        <div style={{ 
          width: '300px', 
          flexShrink: 0,
          display: 'none'
        }} className="forum-sidebar-desktop">
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: '100px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <i className="fas fa-fire" style={{ color: '#f59e0b' }}></i>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                Hot Posts
              </h3>
            </div>
            
            {hotPosts.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                No hot posts yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {hotPosts.map((hotPost, idx) => (
                  <div 
                    key={hotPost.PostID}
                    onClick={() => navigate(`/forum/post/${hotPost.Slug}`)}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '8px',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: '13px', 
                        fontWeight: 500, 
                        color: '#374151',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.4,
                        marginBottom: '4px'
                      }}>
                        {hotPost.Title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                        {hotPost.Score} upvotes · {hotPost.CommentCount} comments
                      </div>
                    </div>
                    {hotPost.ImageURL && (
                      <img 
                        src={hotPost.ImageURL} 
                        alt="" 
                        style={{ 
                          width: '60px', 
                          height: '60px', 
                          borderRadius: '6px',
                          objectFit: 'cover',
                          flexShrink: 0
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
      {currentUser && <MessagingWidget />}
    </PageLayout>
  );
}

export default ForumPostPage;
