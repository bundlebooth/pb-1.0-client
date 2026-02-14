import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import { apiGet, apiPost } from '../../../utils/api';
import { useVendorOnlineStatus } from '../../../hooks/useOnlineStatus';
import { buildVendorProfileUrl } from '../../../utils/urlHelpers';

function ClientMessagesSection({ onSectionChange }) {
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [vendorProfileId, setVendorProfileId] = useState(null);
  const messagesEndRef = useRef(null);
  const hasAutoSelected = useRef(false);

  // Get online status for the vendor in the conversation
  const { statuses: onlineStatuses } = useVendorOnlineStatus(
    vendorProfileId ? [vendorProfileId] : [],
    { enabled: !!vendorProfileId, refreshInterval: 180000 } // 3 minutes
  );
  const vendorOnlineStatus = vendorProfileId ? onlineStatuses[vendorProfileId] : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoading(true);
      const url = `${API_BASE_URL}/messages/conversations/user/${currentUser.id}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const responseData = await response.json();
        let convs = responseData.conversations || [];
        
        // Map API response to expected format
        convs = convs.map(conv => ({
          id: conv.id || conv.ConversationID,
          userName: conv.OtherPartyName || conv.userName || 'Unknown User',
          OtherPartyName: conv.OtherPartyName || conv.userName || 'Unknown User',
          lastMessageContent: conv.lastMessageContent || conv.LastMessageContent || 'No messages yet',
          lastMessageCreatedAt: conv.lastMessageCreatedAt || conv.LastMessageCreatedAt || conv.createdAt,
          lastMessageSenderId: conv.lastMessageSenderId || conv.LastMessageSenderID,
          unreadCount: conv.unreadCount || conv.UnreadCount || 0
        }));
        setConversations(convs);
        
        // Auto-select first conversation only once
        if (convs.length > 0 && !hasAutoSelected.current) {
          hasAutoSelected.current = true;
          setSelectedConversation(convs[0]);
        }
      } else {
        // Fallback: Load from localStorage
        const localConversations = JSON.parse(localStorage.getItem('conversations') || '[]');
        const filtered = localConversations.filter(conv => 
          conv.userId === currentUser.id || conv.vendorProfileId === currentUser.vendorProfileId
        );
        setConversations(filtered);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Load local conversations as fallback
      const localConversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      const filtered = localConversations.filter(conv => 
        conv.userId === currentUser.id || conv.vendorProfileId === currentUser.vendorProfileId
      );
      setConversations(filtered);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const loadMessages = useCallback(async (conversationId, conversation) => {
    if (!conversationId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/messages/conversation/${conversationId}?userId=${currentUser?.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to load messages');
      
      const data = await response.json();
      setMessages(data.messages || []);
      setTimeout(scrollToBottom, 100);

      // Extract vendor profile ID from the conversation for online status
      if (conversation?.VendorProfileID) {
        setVendorProfileId(conversation.VendorProfileID);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  }, [currentUser]);

  // Load conversations only once on mount
  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Handle URL parameter for conversationId - auto-select the conversation
  useEffect(() => {
    const conversationIdParam = searchParams.get('conversationId');
    if (conversationIdParam && conversations.length > 0) {
      const targetConv = conversations.find(c => String(c.id) === conversationIdParam);
      if (targetConv) {
        setSelectedConversation(targetConv);
        hasAutoSelected.current = true;
      }
    }
  }, [searchParams, conversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id, selectedConversation);
    }
  }, [selectedConversation?.id, loadMessages]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    
    try {
      // Use Socket.IO if available, otherwise HTTP
      if (window.socket) {
        window.socket.emit('send-message', {
          conversationId: selectedConversation.id,
          senderId: currentUser?.id,
          content: newMessage.trim()
        });
        setNewMessage('');
        // Reload messages after a short delay
        setTimeout(() => loadMessages(selectedConversation.id), 500);
      } else {
        const response = await fetch(`${API_BASE_URL}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            conversationId: selectedConversation.id,
            senderId: currentUser.id,
            content: newMessage.trim()
          })
        });
        
        if (response.ok) {
          setNewMessage('');
          loadMessages(selectedConversation.id);
        } else {
          console.error('Failed to send message:', response.status);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderConversationItem = (conv) => {
    // Format last message with sender prefix
    let lastMessageDisplay = 'No messages yet';
    if (conv.lastMessageContent) {
      const isOwnLastMessage = conv.lastMessageSenderId === currentUser?.id;
      const senderPrefix = isOwnLastMessage ? 'You: ' : `${conv.userName || conv.OtherPartyName || 'Other'}: `;
      lastMessageDisplay = senderPrefix + conv.lastMessageContent;
    }
    
    const isSelected = selectedConversation?.id === conv.id;
    
    return (
      <div 
        key={conv.id}
        className="conversation-item" 
        onClick={() => setSelectedConversation(conv)}
        style={{
          padding: '1rem',
          borderBottom: '1px solid #eee',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          backgroundColor: isSelected ? '#e3f2fd' : 'transparent'
        }}
        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f5f5f5'; }}
        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
          {conv.userName || conv.OtherPartyName || 'Unknown User'}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lastMessageDisplay}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
          {(() => {
            if (!conv.lastMessageCreatedAt) return 'Recently';
            const date = new Date(conv.lastMessageCreatedAt);
            if (isNaN(date.getTime())) return 'Recently';
            return date.toLocaleString();
          })()}
        </div>
      </div>
    );
  };

  const renderMessage = (message, index, allMessages) => {
    const isOwnMessage = message.SenderID === currentUser?.id;
    const senderName = isOwnMessage ? 'You' : (message.SenderName || 'Other User');
    const isRead = message.IsRead === true || message.IsRead === 1;
    // Only show read icon on the last sent message
    const isLastSentMessage = isOwnMessage && !allMessages.slice(index + 1).some(m => m.SenderID === currentUser?.id);
    
    return (
      <div 
        key={message.MessageID || message.id} 
        style={{ 
          marginBottom: '1rem', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: isOwnMessage ? 'flex-end' : 'flex-start' 
        }}
      >
        <div style={{ 
          padding: '0.75rem 1rem', 
          borderRadius: '18px', 
          background: isOwnMessage ? '#007bff' : '#e9ecef',
          color: isOwnMessage ? 'white' : '#333',
          border: isOwnMessage ? 'none' : '1px solid #dee2e6',
          borderBottomRightRadius: isOwnMessage ? '4px' : '18px',
          borderBottomLeftRadius: isOwnMessage ? '18px' : '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)', 
          maxWidth: '70%' 
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', opacity: 0.8 }}>{senderName}</div>
          <div style={{ marginBottom: '0.25rem' }}>{message.Content}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.7, textAlign: 'right' }}>
            {(() => {
              if (!message.CreatedAt) return '';
              const date = new Date(message.CreatedAt);
              if (isNaN(date.getTime())) return '';
              return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            })()}
          </div>
        </div>
        {/* Read receipt - shown outside message bubble for last sent message */}
        {isLastSentMessage && isRead && message.ReadAt && (
          <div style={{ 
            fontSize: '0.7rem', 
            color: '#666',
            marginTop: '4px',
            paddingRight: '4px'
          }}>
            Seen on: {(() => {
              const date = new Date(message.ReadAt);
              if (isNaN(date.getTime())) return '';
              return date.toLocaleString([], { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit', 
                minute: '2-digit' 
              });
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="messages-section">
      <div className="dashboard-card">
        <h2 className="dashboard-card-title">Messages</h2>
        <div id="chat-app" style={{ height: '500px', display: 'flex', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          {/* Conversations sidebar */}
          <div id="conversations-sidebar" style={{ width: '300px', borderRight: '1px solid var(--border)', background: '#f8f9fa' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: 'white' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Conversations</h3>
            </div>
            <div id="conversations-list" style={{ height: 'calc(100% - 60px)', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '1rem', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto' }}></div>
                </div>
              ) : conversations.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>No conversations found</div>
              ) : (
                conversations.map(renderConversationItem)
              )}
            </div>
          </div>
          
          {/* Chat area */}
          <div id="chat-area" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Chat header with online status */}
            <div id="chat-header" style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div 
                  id="chat-partner-name" 
                  onClick={() => {
                    if (selectedConversation?.VendorProfileID) {
                      const url = buildVendorProfileUrl(selectedConversation.VendorProfileID, selectedConversation.vendorPublicId, selectedConversation.OtherPartyName);
                      window.open(url, '_blank');
                    }
                  }}
                  style={{ 
                    fontWeight: 600, 
                    color: selectedConversation ? '#5e72e4' : '#666',
                    cursor: selectedConversation?.VendorProfileID ? 'pointer' : 'default',
                    textDecoration: selectedConversation?.VendorProfileID ? 'none' : 'none'
                  }}
                  onMouseEnter={(e) => { if (selectedConversation?.VendorProfileID) e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                >
                  {selectedConversation ? (selectedConversation.OtherPartyName || 'Unknown') : 'Select a conversation'}
                </div>
                {/* Online status indicator */}
                {selectedConversation && vendorOnlineStatus && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: vendorOnlineStatus.isOnline ? '#22c55e' : '#9ca3af'
                    }} />
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: vendorOnlineStatus.isOnline ? '#22c55e' : '#666',
                      fontWeight: 500
                    }}>
                      {vendorOnlineStatus.isOnline ? 'Online' : vendorOnlineStatus.lastActiveText || 'Offline'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Messages container */}
            <div id="messages-container" style={{ flex: 1, padding: '1rem', overflowY: 'auto', background: '#f8f9fa' }}>
              {!selectedConversation ? (
                <div id="welcome-message" style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>
                  Select a conversation to start messaging
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>No messages yet. Start the conversation!</div>
              ) : (
                <>
                  {messages.map((message, index) => renderMessage(message, index, messages))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
            
            {/* Message input */}
            <div id="message-input-area" style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'white', display: selectedConversation ? 'block' : 'none' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  id="message-input" 
                  placeholder="Type your message..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                  style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '4px', outline: 'none' }}
                />
                <button 
                  id="send-message-btn" 
                  className="btn btn-primary" 
                  onClick={handleSendMessage}
                  style={{ padding: '0.75rem 1.5rem' }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientMessagesSection;
