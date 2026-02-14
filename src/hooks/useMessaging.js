import { useState, useRef, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../config';

/**
 * Centralized messaging hook for all chat functionality
 * Used by: MessagingWidget, UnifiedMessagesSection (Dashboard), SupportToolsPanel (Admin)
 * 
 * Features:
 * - Message loading with polling
 * - New messages detection and notification
 * - Auto-scroll when at bottom
 * - Typing indicator (send and receive)
 * - Scroll position tracking
 */
export const useMessaging = ({
  conversationId,
  userId,
  isSupport = false, // For admin support chat
  pollInterval = 3000,
  enabled = true
}) => {
  // State
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  // Refs
  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  
  // Scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);
  
  // Handle scroll event - track if user is at bottom
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setHasNewMessages(false);
    }
  }, []);
  
  // Load messages for conversation
  const loadMessages = useCallback(async (isPolling = false) => {
    if (!conversationId || !userId) return;
    
    if (!isPolling) {
      setLoading(true);
    }
    
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
        
        // Get current scroll position
        const chatContainer = chatContainerRef.current;
        const atBottom = chatContainer 
          ? chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 50
          : true;
        
        // Check if there are new messages
        setMessages(prev => {
          const prevIds = prev.map(m => m.MessageID || m.messageId).join(',');
          const newIds = newMessages.map(m => m.MessageID || m.messageId).join(',');
          
          if (prevIds === newIds) {
            return prev; // No change
          }
          
          // New messages arrived during polling
          const hasNew = newMessages.length > prev.length;
          if (hasNew && isPolling) {
            if (atBottom) {
              setTimeout(scrollToBottom, 100);
            } else {
              setTimeout(() => setHasNewMessages(true), 0);
            }
          }
          
          lastMessageCountRef.current = newMessages.length;
          return newMessages;
        });
        
        // Scroll on initial load
        if (!isPolling) {
          setIsAtBottom(true);
          setTimeout(scrollToBottom, 100);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      if (!isPolling) {
        setLoading(false);
      }
    }
  }, [conversationId, userId, isSupport, scrollToBottom]);
  
  // Send typing status to server
  const sendTypingStatus = useCallback(async (isTyping) => {
    if (!conversationId || !userId) return;
    
    try {
      await fetch(`${API_BASE_URL}/messages/typing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          conversationId,
          userId: isSupport ? 0 : userId, // Use 0 for support/admin
          isTyping
        })
      });
    } catch (error) {
      // Silently fail - typing indicator is not critical
    }
  }, [conversationId, userId, isSupport]);
  
  // Check if other user is typing
  const checkTypingStatus = useCallback(async () => {
    if (!conversationId || !userId) return;
    
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
  
  // Handle user typing - debounced
  const handleTyping = useCallback(() => {
    try {
      sendTypingStatus(true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(false);
      }, 2000);
    } catch (e) {
      // Ignore errors
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
        // Stop typing indicator
        sendTypingStatus(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Reload messages
        await loadMessages(false);
        
        // Callback
        if (onSuccess) onSuccess();
        
        return true;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
    
    return false;
  }, [conversationId, userId, isSupport, sendTypingStatus, loadMessages]);
  
  // Start polling when enabled
  useEffect(() => {
    if (!enabled || !conversationId || !userId) {
      return;
    }
    
    // Initial load
    loadMessages(false);
    
    // Start polling
    pollingIntervalRef.current = setInterval(() => {
      loadMessages(true);
      checkTypingStatus();
    }, pollInterval);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [enabled, conversationId, userId, pollInterval, loadMessages, checkTypingStatus]);
  
  // Reset state when conversation changes
  useEffect(() => {
    setMessages([]);
    setHasNewMessages(false);
    setIsAtBottom(true);
    setOtherUserTyping(false);
    lastMessageCountRef.current = 0;
  }, [conversationId]);
  
  return {
    // State
    messages,
    loading,
    hasNewMessages,
    isAtBottom,
    otherUserTyping,
    
    // Refs (attach to DOM elements)
    chatContainerRef,
    messagesEndRef,
    
    // Actions
    loadMessages,
    sendMessage,
    handleTyping,
    scrollToBottom,
    handleScroll,
    setHasNewMessages,
    setIsAtBottom
  };
};

/**
 * Typing Indicator Component
 * Renders bouncing dots animation
 */
export const TypingIndicator = ({ style = {} }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'flex-start', 
    marginBottom: '16px',
    ...style 
  }}>
    <div style={{
      padding: '12px 16px',
      borderRadius: '18px 18px 18px 4px',
      background: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <div style={{ 
        width: '8px', height: '8px', borderRadius: '50%', 
        background: '#9ca3af', 
        animation: 'typingBounce 1.4s infinite ease-in-out',
        animationDelay: '0s' 
      }} />
      <div style={{ 
        width: '8px', height: '8px', borderRadius: '50%', 
        background: '#9ca3af', 
        animation: 'typingBounce 1.4s infinite ease-in-out',
        animationDelay: '0.2s' 
      }} />
      <div style={{ 
        width: '8px', height: '8px', borderRadius: '50%', 
        background: '#9ca3af', 
        animation: 'typingBounce 1.4s infinite ease-in-out',
        animationDelay: '0.4s' 
      }} />
    </div>
    <style>{`
      @keyframes typingBounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-4px); }
      }
    `}</style>
  </div>
);

/**
 * New Messages Badge Component
 * Shows when user is scrolled up and new messages arrive
 */
export const NewMessagesBadge = ({ onClick, style = {} }) => (
  <div 
    onClick={onClick}
    style={{
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
      margin: '0 auto',
      ...style
    }}
  >
    <i className="fas fa-arrow-down" style={{ fontSize: '11px' }} />
    New messages
  </div>
);

export default useMessaging;
