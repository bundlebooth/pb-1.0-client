import React, { useState, useRef, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../../config';

/**
 * CENTRALIZED CHAT COMPONENTS - DASHBOARD STYLE BENCHMARK
 * 
 * This file contains all shared chat functionality and styling.
 * Used by: MessagingWidget, UnifiedMessagesSection (Dashboard), SupportToolsPanel (Admin)
 * 
 * ALL CHAT PLATFORMS MUST USE THESE STYLES FOR CONSISTENCY.
 * DO NOT duplicate this code - import from here instead.
 * 
 * Benchmark: Dashboard UnifiedMessagesSection styling
 */

// ============================================================
// SHARED STYLES - DASHBOARD BENCHMARK
// ============================================================

export const chatStyles = {
  // Message bubble - sent (right side, purple) - DASHBOARD STYLE
  sentMessage: {
    padding: '8px 12px',
    borderRadius: '16px 16px 4px 16px',
    backgroundColor: '#5e72e4',
    color: 'white',
    maxWidth: '70%',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    wordBreak: 'break-word'
  },
  
  // Message bubble - received (left side, gray) - DASHBOARD STYLE
  receivedMessage: {
    padding: '8px 12px',
    borderRadius: '16px 16px 16px 4px',
    backgroundColor: '#f0f0f0',
    color: '#1a1a1a',
    maxWidth: '70%',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    wordBreak: 'break-word'
  },
  
  // Message text - DASHBOARD STYLE
  messageText: {
    marginBottom: '3px',
    wordBreak: 'break-word',
    fontSize: '13px'
  },
  
  // Timestamp - DASHBOARD STYLE
  timestamp: {
    fontSize: '10px',
    opacity: 0.7,
    marginTop: '2px'
  },
  
  // Message container - DASHBOARD STYLE
  messageContainer: {
    marginBottom: '10px',
    display: 'flex'
  },
  
  // Typing indicator bubble - DASHBOARD STYLE
  typingBubble: {
    padding: '12px 16px',
    borderRadius: '16px 16px 16px 4px',
    background: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  
  // Typing dot
  typingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#9ca3af'
  },
  
  // New messages badge - DASHBOARD STYLE
  newMessagesBadge: {
    position: 'sticky',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#5e72e4',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    zIndex: 10,
    width: 'fit-content',
    margin: '0 auto'
  },
  
  // Chat container - DASHBOARD STYLE
  chatContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
    backgroundColor: '#fafafa',
    position: 'relative'
  },
  
  // Input container - DASHBOARD STYLE
  inputContainer: {
    padding: '16px',
    borderTop: '1px solid #e5e7eb',
    background: 'white'
  },
  
  // Text input - DASHBOARD STYLE
  textInput: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '24px',
    fontSize: '14px',
    outline: 'none',
    resize: 'none'
  },
  
  // Send button - DASHBOARD STYLE
  sendButton: {
    padding: '10px 20px',
    background: '#5e72e4',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  
  // Day divider - DASHBOARD STYLE
  dayDivider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '16px 0',
    gap: '12px'
  },
  
  dayDividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e5e7eb'
  },
  
  dayDividerText: {
    fontSize: '11px',
    color: '#9ca3af',
    fontWeight: 500,
    padding: '4px 12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '12px'
  }
};

// ============================================================
// CSS KEYFRAMES (inject once)
// ============================================================

export const ChatStylesheet = () => (
  <style>{`
    @keyframes typingBounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }
  `}</style>
);

// ============================================================
// TYPING INDICATOR COMPONENT
// ============================================================

export const TypingIndicator = ({ visible = false, style = {} }) => {
  if (!visible) return null;
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'flex-start', 
      marginBottom: '16px',
      ...style 
    }}>
      <div style={chatStyles.typingBubble}>
        <div style={{ 
          ...chatStyles.typingDot, 
          animation: 'typingBounce 1.4s infinite ease-in-out',
          animationDelay: '0s' 
        }} />
        <div style={{ 
          ...chatStyles.typingDot, 
          animation: 'typingBounce 1.4s infinite ease-in-out',
          animationDelay: '0.2s' 
        }} />
        <div style={{ 
          ...chatStyles.typingDot, 
          animation: 'typingBounce 1.4s infinite ease-in-out',
          animationDelay: '0.4s' 
        }} />
      </div>
    </div>
  );
};

// ============================================================
// NEW MESSAGES BADGE COMPONENT
// ============================================================

export const NewMessagesBadge = ({ visible = false, onClick, style = {} }) => {
  if (!visible) return null;
  
  return (
    <div onClick={onClick} style={{ ...chatStyles.newMessagesBadge, ...style }}>
      <i className="fas fa-arrow-down" style={{ fontSize: '11px' }} />
      New messages
    </div>
  );
};

// ============================================================
// MESSAGE BUBBLE COMPONENT
// ============================================================

export const MessageBubble = ({ 
  message, 
  isSent, 
  showSenderName = false,
  senderName = '',
  showTimestamp = true,
  showReadReceipt = false,
  isRead = false
}) => {
  const content = message.Content || message.MessageText || message.content;
  const timestamp = message.CreatedAt || message.SentAt || message.createdAt;
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isSent ? 'flex-end' : 'flex-start',
      marginBottom: '16px'
    }}>
      {/* Sender name for received messages */}
      {!isSent && showSenderName && senderName && (
        <div style={{ 
          fontSize: '12px', 
          fontWeight: 600, 
          color: '#6b7280', 
          marginBottom: '4px',
          marginLeft: '4px'
        }}>
          {senderName}
        </div>
      )}
      
      {/* Message bubble */}
      <div style={isSent ? chatStyles.sentMessage : chatStyles.receivedMessage}>
        <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
          {content}
        </div>
      </div>
      
      {/* Timestamp */}
      {showTimestamp && timestamp && (
        <div style={{ 
          ...chatStyles.timestamp,
          marginLeft: isSent ? '0' : '4px',
          marginRight: isSent ? '4px' : '0'
        }}>
          {(() => {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          })()}
          {showReadReceipt && isRead && ' • Seen'}
        </div>
      )}
    </div>
  );
};

// ============================================================
// DATE DIVIDER COMPONENT
// ============================================================

export const DateDivider = ({ date }) => {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { 
      weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' 
    });
  };
  
  return (
    <div style={{ 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '16px 0',
      gap: '12px'
    }}>
      <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
      <span style={{
        fontSize: '11px',
        color: '#9ca3af',
        fontWeight: 500,
        padding: '4px 12px',
        backgroundColor: '#f3f4f6',
        borderRadius: '12px'
      }}>
        {formatDate(date)}
      </span>
      <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
    </div>
  );
};

// ============================================================
// CUSTOM HOOK: useMessaging
// ============================================================

export const useMessaging = ({
  conversationId,
  userId,
  isSupport = false,
  pollInterval = 3000,
  enabled = true
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);
  
  // Handle scroll
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setHasNewMessages(false);
    }
  }, []);
  
  // Load messages
  const loadMessages = useCallback(async (isPolling = false) => {
    if (!conversationId || (userId === undefined && !isSupport)) return;
    
    if (!isPolling) setLoading(true);
    
    try {
      const endpoint = isSupport 
        ? `${API_BASE_URL}/admin/support/conversations/${conversationId}/messages`
        : `${API_BASE_URL}/messages/conversation/${conversationId}?userId=${userId}`;
      
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const newMessages = data.messages || [];
        
        const chatContainer = chatContainerRef.current;
        const atBottom = chatContainer 
          ? chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 50
          : true;
        
        setMessages(prev => {
          const prevIds = prev.map(m => m.MessageID || m.messageId).join(',');
          const newIds = newMessages.map(m => m.MessageID || m.messageId).join(',');
          
          if (prevIds === newIds) return prev;
          
          const hasNew = newMessages.length > prev.length;
          if (hasNew && isPolling) {
            if (atBottom) {
              setTimeout(scrollToBottom, 100);
            } else {
              setTimeout(() => setHasNewMessages(true), 0);
            }
          }
          
          return newMessages;
        });
        
        if (!isPolling) {
          setIsAtBottom(true);
          setTimeout(scrollToBottom, 100);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [conversationId, userId, isSupport, scrollToBottom]);
  
  // Send typing status
  const sendTypingStatus = useCallback(async (isTyping) => {
    if (!conversationId || (userId === undefined && !isSupport)) return;
    
    try {
      await fetch(`${API_BASE_URL}/messages/typing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          conversationId,
          userId: isSupport ? 0 : userId,
          isTyping
        })
      });
    } catch (error) {
      // Silently fail
    }
  }, [conversationId, userId, isSupport]);
  
  // Check typing status
  const checkTypingStatus = useCallback(async () => {
    if (!conversationId || (userId === undefined && !isSupport)) return;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/messages/typing/${conversationId}?userId=${isSupport ? 0 : userId}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setOtherUserTyping(data.isTyping || false);
      }
    } catch (error) {
      // Silently fail
    }
  }, [conversationId, userId, isSupport]);
  
  // Handle typing (debounced)
  const handleTyping = useCallback(() => {
    try {
      sendTypingStatus(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(false);
      }, 2000);
    } catch (e) {
      // Ignore
    }
  }, [sendTypingStatus]);
  
  // Send message
  const sendMessage = useCallback(async (content, onSuccess) => {
    if (!content.trim() || !conversationId) return false;
    
    try {
      const endpoint = isSupport
        ? `${API_BASE_URL}/admin/support/conversations/${conversationId}/reply`
        : `${API_BASE_URL}/messages`;
      
      const body = isSupport
        ? { content: content.trim() }
        : { conversationId, senderId: userId, content: content.trim() };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        sendTypingStatus(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        await loadMessages(false);
        if (onSuccess) onSuccess();
        return true;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
    
    return false;
  }, [conversationId, userId, isSupport, sendTypingStatus, loadMessages]);
  
  // Polling effect
  useEffect(() => {
    if (!enabled || !conversationId || (userId === undefined && !isSupport)) return;
    
    loadMessages(false);
    
    pollingIntervalRef.current = setInterval(() => {
      loadMessages(true);
      checkTypingStatus();
    }, pollInterval);
    
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [enabled, conversationId, userId, isSupport, pollInterval, loadMessages, checkTypingStatus]);
  
  // Reset on conversation change
  useEffect(() => {
    setMessages([]);
    setHasNewMessages(false);
    setIsAtBottom(true);
    setOtherUserTyping(false);
  }, [conversationId]);
  
  return {
    messages,
    loading,
    hasNewMessages,
    isAtBottom,
    otherUserTyping,
    chatContainerRef,
    messagesEndRef,
    loadMessages,
    sendMessage,
    handleTyping,
    scrollToBottom,
    handleScroll,
    setHasNewMessages,
    setIsAtBottom
  };
};

export default {
  chatStyles,
  ChatStylesheet,
  TypingIndicator,
  NewMessagesBadge,
  MessageBubble,
  DateDivider,
  useMessaging
};
