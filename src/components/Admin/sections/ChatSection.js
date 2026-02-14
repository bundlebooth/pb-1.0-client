/**
 * Chat Section - Admin Dashboard
 * Real-time communication oversight, live chat management, and content moderation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatRelativeTime, formatDate } from '../../../utils/formatUtils';
import adminApi from '../../../services/adminApi';
import { GIPHY_API_KEY } from '../../../config';
import { ConfirmationModal } from '../../UniversalModal';
import { useAlert } from '../../../context/AlertContext';

function ChatSection() {
  const { showError, showSuccess } = useAlert();
  const [activeTab, setActiveTab] = useState('conversations');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [supportReply, setSupportReply] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [userToUnlock, setUserToUnlock] = useState(null);
  
  // Flagged messages / moderation state
  const [flaggedMessages, setFlaggedMessages] = useState([]);
  const [flaggedLoading, setFlaggedLoading] = useState(false);
  const [flaggedTotal, setFlaggedTotal] = useState(0);
  const [flaggedPage, setFlaggedPage] = useState(1);
  const [reviewFilter, setReviewFilter] = useState('pending'); // 'pending', 'reviewed', 'all'
  const [violationTypeFilter, setViolationTypeFilter] = useState('');
  const [moderationStats, setModerationStats] = useState(null);
  
  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  
  // Lock user modal state
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockUserId, setLockUserId] = useState(null);
  const [lockReason, setLockReason] = useState('');
  const [lockType, setLockType] = useState('chat_violation');
  
  // Chat enhancements - emoji/GIF picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [gifsLoading, setGifsLoading] = useState(false);
  
  // Quick reply suggestions
  const quickReplies = ['Hi! 👋', 'Hello!', 'Thanks!', 'Great! 👍', 'Sounds good!', 'Perfect!', 'How can I help?', 'Let me check that for you.'];
  
  // Common emojis for quick access
  const commonEmojis = ['😊', '👍', '❤️', '🎉', '✨', '🙏', '👋', '😄', '🔥', '💯', '✅', '⭐', '💬', '📞', '📧', '🎯'];
  
  // Fetch GIFs from Giphy
  const fetchGifs = async (query) => {
    if (!GIPHY_API_KEY) return;
    setGifsLoading(true);
    try {
      const endpoint = query 
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`;
      const response = await fetch(endpoint);
      const data = await response.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('Error fetching GIFs:', err);
    } finally {
      setGifsLoading(false);
    }
  };
  
  const handleGifSelect = (gif) => {
    const gifUrl = gif.images?.fixed_height?.url || gif.images?.original?.url;
    if (gifUrl) {
      setSupportReply(prev => prev + ` ${gifUrl} `);
    }
    setShowGifPicker(false);
  };
  
  const handleEmojiSelect = (emoji) => {
    setSupportReply(prev => prev + emoji);
  };
  
  const handleQuickReply = (text) => {
    setSupportReply(text);
  };

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getSupportConversations();
      const convsArray = Array.isArray(data?.conversations) ? data.conversations : Array.isArray(data) ? data : [];
      setConversations(convsArray);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch flagged messages for moderation
  const fetchFlaggedMessages = useCallback(async () => {
    try {
      setFlaggedLoading(true);
      const isReviewed = reviewFilter === 'pending' ? 'false' : reviewFilter === 'reviewed' ? 'true' : null;
      const data = await adminApi.getModerationFlagged({
        page: flaggedPage,
        limit: 20,
        isReviewed,
        violationType: violationTypeFilter || null
      });
      setFlaggedMessages(data?.violations || []);
      setFlaggedTotal(data?.total || 0);
    } catch (err) {
      console.error('Error fetching flagged messages:', err);
    } finally {
      setFlaggedLoading(false);
    }
  }, [flaggedPage, reviewFilter, violationTypeFilter]);

  // Fetch moderation stats
  const fetchModerationStats = useCallback(async () => {
    try {
      const data = await adminApi.getModerationStats();
      setModerationStats(data?.stats || null);
    } catch (err) {
      console.error('Error fetching moderation stats:', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'flagged') {
      fetchFlaggedMessages();
      fetchModerationStats();
    }
  }, [activeTab, fetchFlaggedMessages, fetchModerationStats]);

  // Handle review violation
  const handleReviewViolation = async () => {
    if (!selectedViolation || !reviewAction) return;
    setActionLoading(true);
    try {
      await adminApi.reviewViolation({
        violationId: selectedViolation.ViolationID,
        actionTaken: reviewAction,
        adminNotes: reviewNotes
      });
      setShowReviewModal(false);
      setSelectedViolation(null);
      setReviewAction('');
      setReviewNotes('');
      fetchFlaggedMessages();
      fetchModerationStats();
    } catch (err) {
      showError('Failed to review violation');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle lock user
  const handleLockUser = async () => {
    if (!lockUserId || !lockReason) return;
    setActionLoading(true);
    try {
      await adminApi.lockUserAccount({
        userId: lockUserId,
        lockType,
        lockReason
      });
      setShowLockModal(false);
      setLockUserId(null);
      setLockReason('');
      fetchFlaggedMessages();
      fetchModerationStats();
      showSuccess('User account locked successfully');
    } catch (err) {
      showError('Failed to lock user account');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle unlock user
  const handleUnlockUser = (userId) => {
    setUserToUnlock(userId);
    setShowUnlockModal(true);
  };

  const confirmUnlockUser = async () => {
    if (!userToUnlock) return;
    setShowUnlockModal(false);
    setActionLoading(true);
    try {
      await adminApi.unlockUserAccount({ userId: userToUnlock, unlockReason: 'Account reviewed and unlocked by admin' });
      fetchFlaggedMessages();
      fetchModerationStats();
    } catch (err) {
      console.error('Failed to unlock user account:', err);
    } finally {
      setActionLoading(false);
      setUserToUnlock(null);
    }
  };

  // Get severity badge
  const getSeverityBadge = (severity) => {
    const badges = {
      1: { label: 'Warning', class: 'admin-badge-warning' },
      2: { label: 'Moderate', class: 'admin-badge-info' },
      3: { label: 'Severe', class: 'admin-badge-danger' }
    };
    const badge = badges[severity] || badges[1];
    return <span className={`admin-badge ${badge.class}`}>{badge.label}</span>;
  };

  // Get violation type badge
  const getViolationTypeBadge = (type) => {
    const colors = {
      email: '#3b82f6',
      phone: '#8b5cf6',
      profanity: '#f59e0b',
      racism: '#ef4444',
      solicitation: '#ec4899'
    };
    return (
      <span style={{
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 500,
        background: `${colors[type] || '#6b7280'}20`,
        color: colors[type] || '#6b7280'
      }}>
        {type}
      </span>
    );
  };

  const handleViewConversation = async (conv) => {
    setSelectedConversation(conv);
    try {
      const data = await adminApi.getSupportConversationMessages(conv.ConversationID || conv.id);
      const msgs = Array.isArray(data?.messages) ? data.messages : Array.isArray(data) ? data : [];
      setConversationMessages(msgs);
    } catch (err) {
      console.error('Error fetching conversation:', err);
      setConversationMessages([]);
    }
  };

  const handleSendSupportReply = async () => {
    if (!selectedConversation || !supportReply.trim()) return;
    setActionLoading(true);
    try {
      await adminApi.sendSupportReply(selectedConversation.ConversationID || selectedConversation.id, supportReply);
      setSupportReply('');
      const data = await adminApi.getSupportConversationMessages(selectedConversation.ConversationID || selectedConversation.id);
      setConversationMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (err) {
      showError('Failed to send reply');
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch all vendor-client conversations
  const fetchAllChats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getChats({ page: 1, limit: 50 });
      const chatsArray = Array.isArray(data?.conversations) ? data.conversations : Array.isArray(data) ? data : [];
      setConversations(chatsArray);
    } catch (err) {
      console.error('Error fetching all chats:', err);
      setError('Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for vendor-client conversation
  const handleViewAllChat = async (conv) => {
    setSelectedConversation(conv);
    try {
      const data = await adminApi.getChatMessages(conv.ConversationID || conv.id);
      const msgs = Array.isArray(data?.messages) ? data.messages : Array.isArray(data) ? data : [];
      setConversationMessages(msgs);
    } catch (err) {
      console.error('Error fetching chat messages:', err);
      setConversationMessages([]);
    }
  };

  // Render flagged messages tab content
  const renderFlaggedMessages = () => {
    return (
    <div className="admin-card">
      {/* Stats Row */}
      {moderationStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ textAlign: 'center', padding: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ef4444' }}>{moderationStats.PendingReviews || 0}</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Pending Reviews</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f59e0b' }}>{moderationStats.ViolationsLast24h || 0}</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Last 24h</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#8b5cf6' }}>{moderationStats.UniqueViolators || 0}</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Unique Violators</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#dc2626' }}>{moderationStats.LockedAccounts || 0}</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Locked Accounts</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="admin-card-header" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            value={reviewFilter}
            onChange={(e) => { setReviewFilter(e.target.value); setFlaggedPage(1); }}
            className="admin-select"
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}
          >
            <option value="pending">Pending Review</option>
            <option value="reviewed">Reviewed</option>
            <option value="all">All</option>
          </select>
          <select
            value={violationTypeFilter}
            onChange={(e) => { setViolationTypeFilter(e.target.value); setFlaggedPage(1); }}
            className="admin-select"
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}
          >
            <option value="">All Types</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="profanity">Profanity</option>
            <option value="racism">Racism</option>
            <option value="solicitation">Solicitation</option>
          </select>
        </div>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={fetchFlaggedMessages}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {/* Flagged Messages Table */}
      <div className="admin-card-body" style={{ padding: 0 }}>
        {flaggedLoading ? (
          <div className="admin-loading"><div className="admin-loading-spinner"></div><p>Loading...</p></div>
        ) : flaggedMessages.length === 0 ? (
          <div className="admin-empty-state" style={{ padding: '3rem' }}>
            <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i>
            <h3>No Flagged Messages</h3>
            <p>All clear! No violations to review.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {flaggedMessages.map((v) => (
                  <tr key={v.ViolationID}>
                    <td>
                      <div>
                        <strong>{v.UserName || 'Unknown'}</strong>
                        {v.UserIsLocked && <span className="admin-badge admin-badge-danger" style={{ marginLeft: '0.5rem' }}>Locked</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{v.UserEmail}</div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{v.UserTotalViolations} total violations</div>
                    </td>
                    <td>{getViolationTypeBadge(v.ViolationType)}</td>
                    <td>{getSeverityBadge(v.Severity)}</td>
                    <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.DetectedContent || '-'}
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.OriginalMessage?.substring(0, 100) || '-'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>{formatRelativeTime(v.CreatedAt)}</td>
                    <td>
                      {v.IsReviewed ? (
                        <span className="admin-badge admin-badge-success">{v.ActionTaken}</span>
                      ) : (
                        <span className="admin-badge admin-badge-warning">Pending</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!v.IsReviewed && (
                          <button
                            className="admin-btn admin-btn-primary admin-btn-sm"
                            onClick={() => { setSelectedViolation(v); setShowReviewModal(true); }}
                            title="Review"
                          >
                            <i className="fas fa-gavel"></i>
                          </button>
                        )}
                        {!v.UserIsLocked ? (
                          <button
                            className="admin-btn admin-btn-danger admin-btn-sm"
                            onClick={() => { setLockUserId(v.UserID); setShowLockModal(true); }}
                            title="Lock Account"
                          >
                            <i className="fas fa-lock"></i>
                          </button>
                        ) : (
                          <button
                            className="admin-btn admin-btn-success admin-btn-sm"
                            onClick={() => handleUnlockUser(v.UserID)}
                            title="Unlock Account"
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
        )}
      </div>

      {/* Pagination */}
      {flaggedTotal > 20 && (
        <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          <button
            className="admin-btn admin-btn-secondary admin-btn-sm"
            disabled={flaggedPage === 1}
            onClick={() => setFlaggedPage(p => p - 1)}
          >
            Previous
          </button>
          <span style={{ padding: '0.5rem 1rem', color: '#6b7280' }}>
            Page {flaggedPage} of {Math.ceil(flaggedTotal / 20)}
          </span>
          <button
            className="admin-btn admin-btn-secondary admin-btn-sm"
            disabled={flaggedPage >= Math.ceil(flaggedTotal / 20)}
            onClick={() => setFlaggedPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
    );
  };

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'support') {
      fetchConversations();
    } else if (activeTab === 'all-chats') {
      fetchAllChats();
    }
  }, [activeTab, fetchConversations, fetchAllChats]);

  return (
    <div className="admin-section">
      {/* Tab Navigation */}
      <div className="admin-tabs" style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        <button
          className={`admin-tab ${activeTab === 'support' ? 'active' : ''}`}
          onClick={() => setActiveTab('support')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'support' ? '2px solid #5086E8' : '2px solid transparent',
            color: activeTab === 'support' ? '#5086E8' : '#6b7280',
            fontWeight: activeTab === 'support' ? 600 : 400,
            cursor: 'pointer'
          }}
        >
          <i className="fas fa-headset" style={{ marginRight: '8px' }}></i>
          Support Chat
        </button>
        <button
          className={`admin-tab ${activeTab === 'all-chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('all-chats')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'all-chats' ? '2px solid #5086E8' : '2px solid transparent',
            color: activeTab === 'all-chats' ? '#5086E8' : '#6b7280',
            fontWeight: activeTab === 'all-chats' ? 600 : 400,
            cursor: 'pointer'
          }}
        >
          <i className="fas fa-comments" style={{ marginRight: '8px' }}></i>
          All Vendor-Client Messages
        </button>
        <button
          className={`admin-tab ${activeTab === 'flagged' ? 'active' : ''}`}
          onClick={() => setActiveTab('flagged')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'flagged' ? '2px solid #5086E8' : '2px solid transparent',
            color: activeTab === 'flagged' ? '#5086E8' : '#6b7280',
            fontWeight: activeTab === 'flagged' ? 600 : 400,
            cursor: 'pointer'
          }}
        >
          <i className="fas fa-flag" style={{ marginRight: '8px' }}></i>
          Flagged Messages
        </button>
      </div>

      {/* Flagged Messages Tab */}
      {activeTab === 'flagged' && renderFlaggedMessages()}

      {/* Support Chat & All Chats Tabs */}
      {(activeTab === 'support' || activeTab === 'all-chats') && (
      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1.5rem', height: '650px' }}>
        {/* Conversations List */}
        <div className="admin-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="admin-card-header">
            <h3 className="admin-card-title">Conversations</h3>
            <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={fetchConversations}>
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
          <div className="admin-card-body" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
            {loading ? (
              <div className="admin-loading"><div className="admin-loading-spinner"></div></div>
            ) : conversations.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '2rem' }}>
                <i className="fas fa-comments"></i>
                <p>No conversations</p>
              </div>
            ) : (
              conversations.map((conv, idx) => (
                <div
                  key={conv.ConversationID || conv.id || idx}
                  onClick={() => handleViewConversation(conv)}
                  style={{
                    padding: '0.875rem 1rem',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    background: selectedConversation?.id === conv.id || selectedConversation?.ConversationID === conv.ConversationID ? 'rgba(80, 134, 232, 0.08)' : 'transparent',
                    borderLeft: selectedConversation?.id === conv.id || selectedConversation?.ConversationID === conv.ConversationID ? '3px solid #5086E8' : '3px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{conv.UserName || conv.userName || 'User'}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatRelativeTime(conv.LastMessageAt || conv.updatedAt)}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.LastMessage || conv.lastMessage || 'No messages'}
                  </div>
                  {(conv.UnreadCount || conv.unreadCount) > 0 && (
                    <span className="admin-badge admin-badge-danger" style={{ marginTop: '0.25rem' }}>{conv.UnreadCount || conv.unreadCount} new</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="admin-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {!selectedConversation ? (
            <div className="admin-empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div>
                <i className="fas fa-comments" style={{ fontSize: '3rem', color: '#d1d5db', marginBottom: '1rem' }}></i>
                <h3>Select a Conversation</h3>
                <p>Choose a conversation from the list to view messages</p>
              </div>
            </div>
          ) : (
            <>
              <div className="admin-card-header" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <div>
                  <h3 className="admin-card-title" style={{ marginBottom: '0.125rem' }}>{selectedConversation.UserName || 'User'}</h3>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{selectedConversation.UserEmail || selectedConversation.email || ''}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => handleViewConversation(selectedConversation)}>
                    <i className="fas fa-sync-alt"></i> Refresh
                  </button>
                </div>
              </div>
              <div className="admin-card-body" style={{ flex: 1, overflowY: 'auto', background: '#f9fafb', padding: '1rem' }}>
                {conversationMessages.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#9ca3af' }}>No messages yet</p>
                ) : (
                  conversationMessages.map((msg, idx) => {
                    const isFromSupport = msg.IsFromSupport || msg.isFromSupport || msg.IsAdmin || msg.isAdmin || msg.SenderType === 'admin' || msg.SenderType === 'support';
                    return (
                      <div key={idx} style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: isFromSupport ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '70%',
                          padding: '0.75rem 1rem',
                          borderRadius: isFromSupport ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                          background: isFromSupport ? '#5086E8' : '#fff',
                          color: isFromSupport ? '#fff' : '#1f2937',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                          <div style={{ fontSize: '0.9rem' }}>{msg.Content || msg.content || msg.message}</div>
                          <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', opacity: 0.7 }}>{formatRelativeTime(msg.CreatedAt || msg.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Quick Replies */}
              <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {quickReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickReply(reply)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      background: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      color: '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#e5e7eb'}
                    onMouseOut={(e) => e.target.style.background = '#f3f4f6'}
                  >
                    {reply}
                  </button>
                ))}
              </div>
              
              {/* Chat Input with Emoji/GIF */}
              <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', position: 'relative' }}>
                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '100%', 
                    left: '1rem',
                    background: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '12px', 
                    padding: '0.75rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxWidth: '280px' }}>
                      {commonEmojis.map((emoji, idx) => (
                        <button
                          key={idx}
                          onClick={() => { handleEmojiSelect(emoji); setShowEmojiPicker(false); }}
                          style={{ 
                            fontSize: '1.5rem', 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            padding: '0.25rem',
                            borderRadius: '4px'
                          }}
                          onMouseOver={(e) => e.target.style.background = '#f3f4f6'}
                          onMouseOut={(e) => e.target.style.background = 'none'}
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
                    left: '1rem',
                    right: '1rem',
                    background: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '12px', 
                    padding: '0.75rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    marginBottom: '0.5rem',
                    maxHeight: '300px',
                    overflow: 'hidden'
                  }}>
                    <input
                      type="text"
                      placeholder="Search GIFs..."
                      value={gifSearchQuery}
                      onChange={(e) => { setGifSearchQuery(e.target.value); fetchGifs(e.target.value); }}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '6px', marginBottom: '0.5rem' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                      {gifsLoading ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '1rem', color: '#6b7280' }}>Loading...</div>
                      ) : gifs.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
                          {gifSearchQuery ? 'No GIFs found' : 'Search for GIFs'}
                        </div>
                      ) : (
                        gifs.map((gif) => (
                          <img
                            key={gif.id}
                            src={gif.images?.fixed_height_small?.url || gif.images?.preview_gif?.url}
                            alt={gif.title}
                            onClick={() => handleGifSelect(gif)}
                            style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                    style={{ 
                      padding: '0.5rem', 
                      background: showEmojiPicker ? '#5086E8' : '#f3f4f6', 
                      color: showEmojiPicker ? 'white' : '#6b7280',
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      fontSize: '1.1rem'
                    }}
                    title="Emoji"
                  >
                    😊
                  </button>
                  <button
                    onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); if (!showGifPicker && gifs.length === 0) fetchGifs(''); }}
                    style={{ 
                      padding: '0.5rem 0.75rem', 
                      background: showGifPicker ? '#5086E8' : '#f3f4f6', 
                      color: showGifPicker ? 'white' : '#6b7280',
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}
                    title="GIF"
                  >
                    GIF
                  </button>
                  <input
                    type="text"
                    value={supportReply}
                    onChange={(e) => setSupportReply(e.target.value)}
                    placeholder="Type your message..."
                    style={{ flex: 1, padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendSupportReply()}
                    onFocus={() => { setShowEmojiPicker(false); setShowGifPicker(false); }}
                  />
                  <button 
                    className="admin-btn admin-btn-primary" 
                    onClick={handleSendSupportReply} 
                    disabled={!supportReply.trim() || actionLoading}
                    style={{ padding: '0.75rem 1rem' }}
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* Review Violation Modal */}
      {showReviewModal && selectedViolation && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', width: '500px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Review Violation</h3>
            
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 0.5rem' }}><strong>User:</strong> {selectedViolation.UserName}</p>
              <p style={{ margin: '0 0 0.5rem' }}><strong>Type:</strong> {selectedViolation.ViolationType}</p>
              <p style={{ margin: '0 0 0.5rem' }}><strong>Detected:</strong> {selectedViolation.DetectedContent}</p>
              <p style={{ margin: '0', fontSize: '0.9rem', color: '#6b7280' }}><strong>Message:</strong> {selectedViolation.OriginalMessage?.substring(0, 200)}</p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Action</label>
              <select
                value={reviewAction}
                onChange={(e) => setReviewAction(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px' }}
              >
                <option value="">Select action...</option>
                <option value="dismissed">Dismiss (False Positive)</option>
                <option value="warned">Warn User</option>
                <option value="locked">Lock Account</option>
                <option value="escalated">Escalate</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Notes (optional)</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about this review..."
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => { setShowReviewModal(false); setSelectedViolation(null); setReviewAction(''); setReviewNotes(''); }}
              >
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleReviewViolation}
                disabled={!reviewAction || actionLoading}
              >
                {actionLoading ? 'Saving...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock User Modal */}
      {showLockModal && lockUserId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', width: '500px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: '#dc2626' }}>
              <i className="fas fa-lock" style={{ marginRight: '0.5rem' }}></i>
              Lock User Account
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Lock Type</label>
              <select
                value={lockType}
                onChange={(e) => setLockType(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px' }}
              >
                <option value="chat_violation">Chat Policy Violation</option>
                <option value="admin_manual">Administrative Action</option>
                <option value="suspicious_activity">Suspicious Activity</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Reason *</label>
              <textarea
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="Explain why this account is being locked..."
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', minHeight: '100px', resize: 'vertical' }}
              />
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
                This reason will be sent to the user via email.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => { setShowLockModal(false); setLockUserId(null); setLockReason(''); }}
              >
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-danger"
                onClick={handleLockUser}
                disabled={!lockReason.trim() || actionLoading}
              >
                {actionLoading ? 'Locking...' : 'Lock Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock User Confirmation Modal */}
      <ConfirmationModal
        isOpen={showUnlockModal}
        onClose={() => { setShowUnlockModal(false); setUserToUnlock(null); }}
        title="Unlock User Account"
        message="Are you sure you want to unlock this user account?"
        confirmLabel="Unlock"
        cancelLabel="Cancel"
        onConfirm={confirmUnlockUser}
        variant="success"
      />
    </div>
  );
}

export default ChatSection;
