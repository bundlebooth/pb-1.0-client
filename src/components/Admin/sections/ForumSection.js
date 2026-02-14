/**
 * Forum Section - Admin Dashboard
 * Forum moderation: posts, comments, flagged content
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate, formatRelativeTime } from '../../../utils/formatUtils';
import adminApi from '../../../services/adminApi';
import { ConfirmationModal } from '../../UniversalModal';
import { useAlert } from '../../../context/AlertContext';

function ForumSection() {
  const { showError, showSuccess } = useAlert();
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [selectedPost, setSelectedPost] = useState(null);
  const [showHideModal, setShowHideModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hideReason, setHideReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getForumPosts({
        page,
        limit,
        status: statusFilter,
        search
      });
      setPosts(data?.posts || []);
      setTotal(data?.total || 0);
    } catch (err) {
      console.error('Error fetching forum posts:', err);
      showError('Failed to load forum posts');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, showError]);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getForumComments({
        page,
        limit,
        status: statusFilter
      });
      setComments(data?.comments || []);
      setTotal(data?.total || 0);
    } catch (err) {
      console.error('Error fetching forum comments:', err);
      showError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, showError]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await adminApi.getForumStats();
      setStats(data?.stats || null);
    } catch (err) {
      console.error('Error fetching forum stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchPosts();
    } else if (activeTab === 'comments') {
      fetchComments();
    }
  }, [activeTab, fetchPosts, fetchComments]);

  const handleHidePost = async () => {
    if (!selectedPost) return;
    setActionLoading(true);
    try {
      await adminApi.hideForumPost(selectedPost.PostID, hideReason);
      showSuccess('Post hidden successfully');
      setShowHideModal(false);
      setSelectedPost(null);
      setHideReason('');
      fetchPosts();
    } catch (err) {
      showError('Failed to hide post');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnhidePost = async (postId) => {
    setActionLoading(true);
    try {
      await adminApi.unhideForumPost(postId);
      showSuccess('Post unhidden');
      fetchPosts();
    } catch (err) {
      showError('Failed to unhide post');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePinPost = async (postId, currentPinned) => {
    try {
      await adminApi.pinForumPost(postId, !currentPinned);
      showSuccess(currentPinned ? 'Post unpinned' : 'Post pinned');
      fetchPosts();
    } catch (err) {
      showError('Failed to update pin status');
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    setActionLoading(true);
    try {
      await adminApi.deleteForumPost(selectedPost.PostID);
      showSuccess('Post deleted');
      setShowDeleteModal(false);
      setSelectedPost(null);
      fetchPosts();
      fetchStats();
    } catch (err) {
      showError('Failed to delete post');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHideComment = async (commentId) => {
    try {
      await adminApi.hideForumComment(commentId);
      showSuccess('Comment hidden');
      fetchComments();
    } catch (err) {
      showError('Failed to hide comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await adminApi.deleteForumComment(commentId);
      showSuccess('Comment deleted');
      fetchComments();
      fetchStats();
    } catch (err) {
      showError('Failed to delete comment');
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>Forum Moderation</h2>
        <p style={{ color: '#717171', marginTop: '4px' }}>
          Manage forum posts and comments, hide or delete inappropriate content.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="admin-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#5086E8' }}>{stats.TotalPosts || 0}</div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Total Posts</div>
          </div>
          <div className="admin-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#10b981' }}>{stats.TotalComments || 0}</div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Total Comments</div>
          </div>
          <div className="admin-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f59e0b' }}>{stats.FlaggedPosts || 0}</div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Flagged Posts</div>
          </div>
          <div className="admin-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ef4444' }}>{stats.HiddenPosts || 0}</div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Hidden Posts</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs" style={{ marginBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
        <button
          className={`admin-tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => { setActiveTab('posts'); setPage(1); }}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'posts' ? '2px solid #5086E8' : '2px solid transparent',
            color: activeTab === 'posts' ? '#5086E8' : '#6b7280',
            fontWeight: activeTab === 'posts' ? 600 : 400,
            cursor: 'pointer'
          }}
        >
          <i className="fas fa-file-alt" style={{ marginRight: '8px' }}></i>
          Posts
        </button>
        <button
          className={`admin-tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => { setActiveTab('comments'); setPage(1); }}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'comments' ? '2px solid #5086E8' : '2px solid transparent',
            color: activeTab === 'comments' ? '#5086E8' : '#6b7280',
            fontWeight: activeTab === 'comments' ? 600 : 400,
            cursor: 'pointer'
          }}
        >
          <i className="fas fa-comment" style={{ marginRight: '8px' }}></i>
          Comments
        </button>
      </div>

      {/* Filters */}
      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <div className="admin-card-header" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {activeTab === 'posts' && (
            <input
              type="text"
              placeholder="Search posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input"
              style={{ flex: 1, minWidth: '200px', padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            />
          )}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="admin-select"
            style={{ padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: '6px' }}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="flagged">Flagged</option>
            <option value="hidden">Hidden</option>
          </select>
          <button className="admin-btn admin-btn-secondary" onClick={activeTab === 'posts' ? fetchPosts : fetchComments}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="admin-card">
        <div className="admin-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="admin-loading" style={{ padding: '3rem' }}>
              <div className="admin-loading-spinner"></div>
              <p>Loading...</p>
            </div>
          ) : activeTab === 'posts' ? (
            posts.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '3rem' }}>
                <i className="fas fa-file-alt" style={{ fontSize: '2rem', color: '#d1d5db' }}></i>
                <h3>No Posts Found</h3>
                <p>No forum posts match your filters.</p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Category</th>
                    <th>Stats</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.PostID}>
                      <td>
                        <div style={{ maxWidth: '250px' }}>
                          <div style={{ fontWeight: 500, color: '#222' }}>{post.Title}</div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {post.ContentPreview}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.9rem' }}>{post.AuthorName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{post.AuthorEmail}</div>
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-info">{post.CategoryName || 'Uncategorized'}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          <span title="Views"><i className="fas fa-eye"></i> {post.ViewCount || 0}</span>
                          <span style={{ marginLeft: '8px' }} title="Likes"><i className="fas fa-heart"></i> {post.LikeCount || 0}</span>
                          <span style={{ marginLeft: '8px' }} title="Comments"><i className="fas fa-comment"></i> {post.CommentCount || 0}</span>
                        </div>
                      </td>
                      <td>
                        {post.IsPinned && <span className="admin-badge admin-badge-primary" style={{ marginRight: '4px' }}>Pinned</span>}
                        {post.IsFlagged && <span className="admin-badge admin-badge-warning" style={{ marginRight: '4px' }}>Flagged</span>}
                        {post.IsHidden && <span className="admin-badge admin-badge-danger">Hidden</span>}
                        {!post.IsFlagged && !post.IsHidden && !post.IsPinned && <span className="admin-badge admin-badge-success">Active</span>}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>{formatRelativeTime(post.CreatedAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            onClick={() => handlePinPost(post.PostID, post.IsPinned)}
                            title={post.IsPinned ? 'Unpin' : 'Pin'}
                          >
                            <i className={`fas fa-thumbtack ${post.IsPinned ? 'text-primary' : ''}`}></i>
                          </button>
                          {post.IsHidden ? (
                            <button
                              className="admin-btn admin-btn-success admin-btn-sm"
                              onClick={() => handleUnhidePost(post.PostID)}
                              title="Unhide"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                          ) : (
                            <button
                              className="admin-btn admin-btn-warning admin-btn-sm"
                              onClick={() => { setSelectedPost(post); setShowHideModal(true); }}
                              title="Hide"
                            >
                              <i className="fas fa-eye-slash"></i>
                            </button>
                          )}
                          <button
                            className="admin-btn admin-btn-danger admin-btn-sm"
                            onClick={() => { setSelectedPost(post); setShowDeleteModal(true); }}
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
            )
          ) : (
            comments.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '3rem' }}>
                <i className="fas fa-comment" style={{ fontSize: '2rem', color: '#d1d5db' }}></i>
                <h3>No Comments Found</h3>
                <p>No comments match your filters.</p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Comment</th>
                    <th>Author</th>
                    <th>Post</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {comments.map((comment) => (
                    <tr key={comment.CommentID}>
                      <td>
                        <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {comment.Content}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.9rem' }}>{comment.AuthorName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{comment.AuthorEmail}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{comment.PostTitle}</td>
                      <td>
                        {comment.IsFlagged && <span className="admin-badge admin-badge-warning" style={{ marginRight: '4px' }}>Flagged</span>}
                        {comment.IsHidden && <span className="admin-badge admin-badge-danger">Hidden</span>}
                        {!comment.IsFlagged && !comment.IsHidden && <span className="admin-badge admin-badge-success">Active</span>}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>{formatRelativeTime(comment.CreatedAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {!comment.IsHidden && (
                            <button
                              className="admin-btn admin-btn-warning admin-btn-sm"
                              onClick={() => handleHideComment(comment.CommentID)}
                              title="Hide"
                            >
                              <i className="fas fa-eye-slash"></i>
                            </button>
                          )}
                          <button
                            className="admin-btn admin-btn-danger admin-btn-sm"
                            onClick={() => handleDeleteComment(comment.CommentID)}
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
            )
          )}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <button
              className="admin-btn admin-btn-secondary admin-btn-sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </button>
            <span style={{ padding: '0.5rem 1rem', color: '#6b7280' }}>
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <button
              className="admin-btn admin-btn-secondary admin-btn-sm"
              disabled={page >= Math.ceil(total / limit)}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Hide Post Modal */}
      {showHideModal && selectedPost && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', width: '450px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Hide Post</h3>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              Hide "{selectedPost.Title}" from public view?
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Reason (optional)</label>
              <textarea
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                placeholder="Why is this post being hidden?"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="admin-btn admin-btn-secondary" onClick={() => { setShowHideModal(false); setSelectedPost(null); setHideReason(''); }}>
                Cancel
              </button>
              <button className="admin-btn admin-btn-warning" onClick={handleHidePost} disabled={actionLoading}>
                {actionLoading ? 'Hiding...' : 'Hide Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedPost(null); }}
        title="Delete Post"
        message={`Are you sure you want to permanently delete "${selectedPost?.Title}"? This will also delete all comments on this post.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeletePost}
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}

export default ForumSection;
