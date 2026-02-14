import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { apiGet, apiPost } from '../../../utils/api';
import { API_BASE_URL, GIPHY_API_KEY } from '../../../config';
import { useUserOnlineStatus, useVendorOnlineStatus } from '../../../hooks/useOnlineStatus';
import { decodeConversationId, isPublicId } from '../../../utils/hashIds';
import { getBookingStatusConfig } from '../../../utils/bookingStatus';
import BookingDetailsModal from '../BookingDetailsModal';

function UnifiedMessagesSection({ onSectionChange, forceViewMode = null }) {
  const { currentUser, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [allConversations, setAllConversations] = useState({ client: [], vendor: [] });
  const [messageBlockedAlert, setMessageBlockedAlert] = useState(null); // For showing blocked message alerts
  // Use forceViewMode prop if provided, otherwise use viewMode from localStorage
  const getMessageRole = () => {
    if (forceViewMode) return forceViewMode;
    const stored = localStorage.getItem('viewMode');
    return stored === 'vendor' ? 'vendor' : 'client';
  };
  const [messageRole, setMessageRole] = useState(getMessageRole());
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [vendorProfileId, setVendorProfileId] = useState(null);
  const [vendorProfileChecked, setVendorProfileChecked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isNarrowDesktop, setIsNarrowDesktop] = useState(window.innerWidth > 768 && window.innerWidth <= 1024);
  const [showChatView, setShowChatView] = useState(false); // For mobile: show chat instead of list
  const [isListCollapsed, setIsListCollapsed] = useState(false); // For narrow desktop: collapse conversation list
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [bookingInfo, setBookingInfo] = useState(null); // Booking info for current conversation
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState(null); // For More Info modal
  const [hasNewMessages, setHasNewMessages] = useState(false); // New messages notification
  const [isAtBottom, setIsAtBottom] = useState(true); // Track scroll position
  const [otherUserTyping, setOtherUserTyping] = useState(false); // Typing indicator
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const prevRoleRef = useRef(messageRole);
  
  // Get online status for the other party
  // When viewing as client: other party is a vendor - use vendorOnlineStatuses
  // When viewing as vendor: other party is a client (user) - use userOnlineStatuses
  const otherPartyVendorId = selectedConversation?.otherPartyVendorProfileId;
  const otherPartyUserId = selectedConversation?.otherPartyUserId;
  
  const { statuses: vendorOnlineStatuses } = useVendorOnlineStatus(
    otherPartyVendorId ? [otherPartyVendorId] : [],
    { enabled: !!otherPartyVendorId, refreshInterval: 180000 } // 3 minutes, same as VendorProfilePage
  );
  
  const { statuses: userOnlineStatuses } = useUserOnlineStatus(
    otherPartyUserId ? [otherPartyUserId] : [],
    { enabled: !!otherPartyUserId, refreshInterval: 180000 } // 3 minutes
  );
  
  // Get the online status for the current conversation's other party
  const getOtherPartyOnlineStatus = () => {
    // If viewing as client, other party is vendor
    if (selectedConversation?.type === 'client' && otherPartyVendorId) {
      return vendorOnlineStatuses[otherPartyVendorId];
    }
    // If viewing as vendor, other party is user (client)
    if (selectedConversation?.type === 'vendor' && otherPartyUserId) {
      return userOnlineStatuses[otherPartyUserId];
    }
    return null;
  };
  const otherPartyOnlineStatus = getOtherPartyOnlineStatus();
  
  // Quick reply suggestions
  const quickReplies = ['Hi! 👋', 'Hello!', 'Thanks!', 'Great! 👍', 'Sounds good!', 'Perfect!'];
  
  // Emoji categories with full emoji sets
  const [emojiCategory, setEmojiCategory] = useState('smileys');
  const [emojiSearch, setEmojiSearch] = useState('');
  const [gifs, setGifs] = useState([]);
  const [gifsLoading, setGifsLoading] = useState(false);
  
  const emojiCategories = {
    smileys: { icon: '😀', name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'] },
    gestures: { icon: '👋', name: 'Gestures', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'] },
    hearts: { icon: '❤️', name: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💌', '💋', '😻', '😽', '🫶'] },
    celebration: { icon: '🎉', name: 'Celebration', emojis: ['🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🍰', '🧁', '🥳', '🥂', '🍾', '✨', '🌟', '⭐', '💫', '🔥', '💥', '🎆', '🎇', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎗️', '🎯', '🎪', '🎭', '🎨'] },
    nature: { icon: '🌸', name: 'Nature', emojis: ['🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🌍', '🌎', '🌏', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌙', '🌚', '🌛', '🌜', '☀️', '🌝', '🌞', '⭐', '🌟', '🌠', '☁️', '⛅', '🌈', '☔', '❄️', '🌊'] },
    food: { icon: '🍕', name: 'Food', emojis: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚', '🍳', '🧇', '🥞', '🧈', '🍞', '🥐', '🥖', '🥨', '🧀', '🥗', '🥙', '🥪', '🌮', '🌯', '🫔', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉'] },
    objects: { icon: '💡', name: 'Objects', emojis: ['💡', '🔦', '🏮', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '💾', '💿', '📀', '📷', '📸', '📹', '🎥', '📽️', '🎬', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏱️', '⏲️', '⏰', '🕰️', '📡', '🔋', '🔌', '💰', '💵', '💴', '💶', '💷', '💳', '💎', '⚖️', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🔗', '📎', '🖇️', '📏', '📐', '✂️', '📌', '📍', '🔐', '🔑', '🗝️'] },
    symbols: { icon: '✅', name: 'Symbols', emojis: ['✅', '❌', '❓', '❗', '‼️', '⁉️', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '⬛', '⬜', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⏩', '⏪', '⏫', '⏬', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '🔄', '🔃', '🔀', '🔁', '🔂', '▶️', '⏸️', '⏹️', '⏺️', '⏭️', '⏮️', '🔼', '🔽'] }
  };
  
  // Get filtered emojis based on search
  const getFilteredEmojis = () => {
    if (!emojiSearch) return emojiCategories[emojiCategory].emojis;
    const allEmojis = Object.values(emojiCategories).flatMap(cat => cat.emojis);
    return allEmojis;
  };
  
  // GIPHY_API_KEY imported from config.js
  
  // Fetch GIFs from Giphy API
  const fetchGifs = async (query = '') => {
    setGifsLoading(true);
    try {
      const endpoint = query 
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        setGifs(data.data.map(gif => ({
          id: gif.id,
          url: gif.images.fixed_height.url,
          preview: gif.images.fixed_height_still?.url || gif.images.fixed_height.url,
          alt: gif.title || 'GIF'
        })));
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
  
  // Update messageRole when forceViewMode prop changes
  useEffect(() => {
    if (forceViewMode) {
      setMessageRole(forceViewMode);
    }
  }, [forceViewMode]);
  
  // Handle GIF search
  const handleGifSearch = () => {
    if (gifSearchQuery.trim()) {
      fetchGifs(gifSearchQuery.trim());
    } else {
      fetchGifs();
    }
  };
  
  // Helper function to update conversation list with new message immediately
  const updateConversationWithMessage = (content) => {
    if (!selectedConversation) return;
    
    // Update the conversation in the list immediately (optimistic update)
    setConversations(prevConvs => {
      return prevConvs.map(conv => {
        if (conv.id === selectedConversation.id) {
          return {
            ...conv,
            lastMessageContent: content,
            lastMessageCreatedAt: new Date().toISOString()
          };
        }
        return conv;
      });
    });
    
    // Also update allConversations
    setAllConversations(prev => {
      const updateList = (list) => list.map(conv => {
        if (conv.id === selectedConversation.id) {
          return {
            ...conv,
            lastMessageContent: content,
            lastMessageCreatedAt: new Date().toISOString()
          };
        }
        return conv;
      });
      return {
        client: updateList(prev.client),
        vendor: updateList(prev.vendor)
      };
    });
  };

  // Function to send GIF as message - directly submit without showing in text box
  const handleSendGif = async (gifUrl) => {
    if (!selectedConversation) return;
    setShowGifPicker(false);
    
    // Immediately update conversation list (optimistic update)
    updateConversationWithMessage(gifUrl);
    
    // Directly send the GIF URL as a message - always use currentUser.id
    const senderId = currentUser?.id;
    
    try {
      if (window.socket) {
        window.socket.emit('send-message', {
          conversationId: selectedConversation.id,
          senderId: senderId,
          content: gifUrl
        });
        setTimeout(() => {
          loadMessages(selectedConversation.id, selectedConversation.type);
          window.dispatchEvent(new CustomEvent('messageSent'));
        }, 300);
      } else {
        const response = await apiPost('/messages', {
          conversationId: selectedConversation.id,
          senderId: senderId,
          content: gifUrl
        });
        
        if (response.ok) {
          loadMessages(selectedConversation.id, selectedConversation.type);
          window.dispatchEvent(new CustomEvent('messageSent'));
        }
      }
    } catch (error) {
      console.error('Error sending GIF:', error);
    }
  };
  
  // Handle window resize for mobile and narrow desktop detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
      setIsNarrowDesktop(width > 768 && width <= 1024);
      // Auto-collapse list on narrow desktop when a conversation is selected
      if (width > 768 && width <= 1024 && selectedConversation) {
        setIsListCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedConversation]);

  // Listen for message-blocked and force-logout socket events
  useEffect(() => {
    if (!window.socket) return;

    const handleMessageBlocked = (data) => {
      console.log('[Chat] Message blocked:', data);
      setMessageBlockedAlert({
        reason: data.reason,
        warningMessage: data.warningMessage,
        warningLevel: data.warningLevel,
        violationType: data.violationType
      });
      
      // Auto-dismiss after 10 seconds for warnings
      if (data.warningLevel <= 2) {
        setTimeout(() => setMessageBlockedAlert(null), 10000);
      }
    };

    const handleForceLogout = (data) => {
      console.log('[Chat] Force logout:', data);
      // Dispatch event to show modal - the modal will handle logout after user clicks OK
      const message = data.isPermanent
        ? 'Your account has been locked due to using inappropriate language. You have had ' + (data.violationCount || 'multiple') + ' violation(s) in the last 24 hours. Please contact support if you believe this is an error.'
        : `Your account has been suspended for ${data.cooldownHours} hour(s) due to policy violations. Please try again later.`;
      
      window.dispatchEvent(new CustomEvent('showForceLogoutModal', {
        detail: {
          message,
          isPermanent: data.isPermanent,
          onAcknowledge: () => {
            if (logout) {
              logout(data.isPermanent ? 'account_locked' : 'account_suspended');
            }
            window.location.href = '/';
          }
        }
      }));
    };

    window.socket.on('message-blocked', handleMessageBlocked);
    window.socket.on('force-logout', handleForceLogout);

    return () => {
      window.socket.off('message-blocked', handleMessageBlocked);
      window.socket.off('force-logout', handleForceLogout);
    };
  }, [logout]);

  const scrollToBottom = useCallback((instant = false) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    } else if (instant) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Get vendor profile ID if user is a vendor
  useEffect(() => {
    const getVendorProfileId = async () => {
      if (!currentUser?.id) {
        setVendorProfileChecked(true);
        return;
      }
      
      if (!currentUser?.isVendor) {
        // Not a vendor, mark as checked so we can proceed with loading
        setVendorProfileChecked(true);
        return;
      }
      
      try {
        const response = await apiGet(`/vendors/profile?userId=${currentUser.id}`);
        if (response.ok) {
          const data = await response.json();
          setVendorProfileId(data.vendorProfileId);
        }
      } catch (error) {
        console.error('Error getting vendor profile:', error);
      } finally {
        setVendorProfileChecked(true);
      }
    };
    getVendorProfileId();
  }, [currentUser]);

  // Load all conversations (both as client and vendor) - PARALLEL for performance
  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Create promises for parallel fetching
      const clientPromise = fetch(`${API_BASE_URL}/messages/conversations/user/${currentUser.id}`, { headers })
        .then(res => res.ok ? res.json() : { conversations: [] })
        .catch(() => ({ conversations: [] }));
      
      const vendorPromise = vendorProfileId 
        ? fetch(`${API_BASE_URL}/messages/conversations/vendor/${vendorProfileId}`, { headers })
            .then(res => res.ok ? res.json() : { conversations: [] })
            .catch(() => ({ conversations: [] }))
        : Promise.resolve({ conversations: [] });
      
      // Fetch both in parallel
      const [clientData, vendorData] = await Promise.all([clientPromise, vendorPromise]);
      
      // Map client conversations
      const clientConvs = (clientData.conversations || []).map(conv => ({
        id: conv.id || conv.ConversationID,
        userName: conv.OtherPartyName || conv.userName || 'Unknown User',
        OtherPartyName: conv.OtherPartyName || conv.userName || 'Unknown User',
        OtherPartyAvatar: conv.OtherPartyAvatar || conv.OtherPartyLogo,
        otherPartyVendorProfileId: conv.VendorProfileID || conv.vendorProfileId,
        vendorBusinessName: conv.vendorBusinessName,
        vendorLogoURL: conv.vendorLogoURL,
        vendorHostName: conv.vendorHostName,
        vendorHostAvatar: conv.vendorHostAvatar,
        clientName: conv.clientName,
        clientAvatar: conv.clientAvatar,
        lastMessageContent: conv.lastMessageContent || conv.LastMessageContent || 'No messages yet',
        lastMessageCreatedAt: conv.lastMessageCreatedAt || conv.LastMessageCreatedAt || conv.createdAt,
        lastMessageSenderId: conv.lastMessageSenderId || conv.LastMessageSenderID,
        unreadCount: conv.unreadCount || conv.UnreadCount || 0,
        type: 'client'
      }));
      
      // Map vendor conversations
      const vendorConvs = (vendorData.conversations || []).map(conv => ({
        id: conv.id || conv.ConversationID,
        userName: conv.OtherPartyName || conv.userName || 'Unknown User',
        OtherPartyName: conv.OtherPartyName || conv.userName || 'Unknown User',
        OtherPartyAvatar: conv.OtherPartyAvatar || conv.OtherPartyLogo,
        otherPartyUserId: conv.userId || conv.UserID,
        clientName: conv.OtherPartyName || conv.userName,
        clientAvatar: conv.OtherPartyAvatar,
        lastMessageContent: conv.lastMessageContent || conv.LastMessageContent || 'No messages yet',
        lastMessageCreatedAt: conv.lastMessageCreatedAt || conv.LastMessageCreatedAt || conv.createdAt,
        lastMessageSenderId: conv.lastMessageSenderId || conv.LastMessageSenderID,
        unreadCount: conv.unreadCount || conv.UnreadCount || 0,
        type: 'vendor'
      }));
      
      // Store both lists separately for desktop tabs
      setAllConversations({ client: clientConvs, vendor: vendorConvs });
      
      // For mobile: combine all, for desktop: use role-based
      if (isMobile) {
        const allConvs = [...clientConvs, ...vendorConvs].sort((a, b) => {
          const dateA = new Date(a.lastMessageCreatedAt || 0);
          const dateB = new Date(b.lastMessageCreatedAt || 0);
          return dateB - dateA;
        });
        setConversations(allConvs);
      } else {
        const currentConvs = messageRole === 'vendor' ? vendorConvs : clientConvs;
        setConversations(currentConvs);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, vendorProfileId, isMobile, messageRole]);

  const loadMessages = useCallback(async (conversationId, conversationType, isPolling = false) => {
    if (!conversationId) return;
    
    try {
      // Always use userId - the API requires a UserID, not VendorProfileID
      const response = await apiGet(`/messages/conversation/${conversationId}?userId=${currentUser?.id}`);
      
      if (!response.ok) throw new Error('Failed to load messages');
      
      const data = await response.json();
      const newMessages = data.messages || [];
      
      // Get current scroll position
      const chatContainer = chatContainerRef.current;
      const atBottom = chatContainer 
        ? chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 50
        : true;
      
      // Check if there are new messages and scroll if so
      setMessages(prev => {
        const prevIds = prev.map(m => m.MessageID).join(',');
        const newIds = newMessages.map(m => m.MessageID).join(',');
        
        if (prevIds === newIds) {
          return prev; // No change
        }
        
        // New messages arrived during polling
        const hasNew = newMessages.length > prev.length;
        if (hasNew && isPolling) {
          if (atBottom) {
            setTimeout(() => scrollToBottom(false), 100);
          } else {
            setHasNewMessages(true);
          }
        }
        
        return newMessages;
      });
      
      // Always scroll on initial load
      if (!isPolling) {
        setIsAtBottom(true);
        setTimeout(() => scrollToBottom(true), 50);
        setTimeout(() => scrollToBottom(false), 300);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      if (!isPolling) {
        setMessages([]);
      }
    }
  }, [currentUser?.id, scrollToBottom]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Check for conversation to open from sessionStorage (from Chat button click)
  useEffect(() => {
    const checkForOpenConversation = () => {
      const rawConversationId = sessionStorage.getItem('openConversationId');
      const otherPartyName = sessionStorage.getItem('openConversationName');
      
      if (rawConversationId && conversations.length > 0) {
        // Decode the conversation ID if it's a public hash ID
        let conversationId = rawConversationId;
        if (isPublicId(rawConversationId)) {
          const decoded = decodeConversationId(rawConversationId);
          if (decoded) {
            conversationId = decoded;
          }
        }
        
        // Find the conversation in our list
        const conv = conversations.find(c => 
          c.id === conversationId || 
          c.id === parseInt(conversationId) ||
          c.ConversationID === conversationId ||
          c.ConversationID === parseInt(conversationId) ||
          c.id === rawConversationId ||
          c.ConversationID === rawConversationId
        );
        
        if (conv) {
          setSelectedConversation(conv);
          if (isMobile) {
            setShowChatView(true);
          }
        } else {
          // Conversation not in current list, create a temporary one
          setSelectedConversation({
            id: conversationId,
            OtherPartyName: otherPartyName || 'Chat',
            type: viewMode === 'vendor' ? 'vendor' : 'client'
          });
          if (isMobile) {
            setShowChatView(true);
          }
        }
        
        // Clear the sessionStorage
        sessionStorage.removeItem('openConversationId');
        sessionStorage.removeItem('openConversationName');
      }
    };
    
    checkForOpenConversation();
  }, [conversations, isMobile]);

  // Load booking info for the selected conversation
  useEffect(() => {
    const loadBookingInfo = async () => {
      if (!selectedConversation) {
        setBookingInfo(null);
        return;
      }
      
      try {
        const convId = selectedConversation.id || selectedConversation.ConversationID;
        const convType = selectedConversation.type;
        
        // Fetch bookings to find one associated with this conversation
        let bookings = [];
        if (convType === 'vendor' && vendorProfileId) {
          const resp = await apiGet(`/vendor/${vendorProfileId}/bookings/all`);
          if (resp.ok) bookings = await resp.json();
        } else if (currentUser?.id) {
          const resp = await apiGet(`/users/${currentUser.id}/bookings/all`);
          if (resp.ok) bookings = await resp.json();
        }
        
        // Find booking with matching conversation ID or other party
        const otherPartyName = selectedConversation.OtherPartyName || selectedConversation.userName;
        const matchingBooking = bookings.find(b => {
          if (b.ConversationID && (b.ConversationID === convId || b.ConversationID === parseInt(convId))) {
            return true;
          }
          // Match by name if no conversation ID
          if (convType === 'vendor' && b.ClientName === otherPartyName) return true;
          if (convType === 'client' && b.VendorName === otherPartyName) return true;
          return false;
        });
        
        if (matchingBooking) {
          const status = (matchingBooking.Status || '').toLowerCase();
          const eventDate = new Date(matchingBooking.EventDate);
          const now = new Date();
          const isPastBooking = eventDate < now;
          
          // Only show banner for pending or confirmed bookings that haven't passed
          if (!isPastBooking && ['pending', 'confirmed', 'accepted', 'approved', 'paid'].includes(status)) {
            setBookingInfo({
              ...matchingBooking, // Store full booking for More Info modal
              serviceName: matchingBooking.ServiceName || 'Service',
              eventDate: matchingBooking.EventDate,
              startTime: matchingBooking.StartTime,
              endTime: matchingBooking.EndTime,
              location: matchingBooking.Location || matchingBooking.EventLocation,
              status: status
            });
          } else {
            setBookingInfo(null);
          }
        } else {
          setBookingInfo(null);
        }
      } catch (error) {
        console.error('Error loading booking info:', error);
        setBookingInfo(null);
      }
    };
    
    loadBookingInfo();
  }, [selectedConversation, vendorProfileId, currentUser?.id]);

  // Get viewMode from localStorage
  const viewMode = localStorage.getItem('viewMode') || 'client';

  // Listen for viewMode changes from sidebar toggle
  useEffect(() => {
    const handleViewModeChange = (event) => {
      const newMode = event.detail?.mode;
      if (newMode) {
        const newRole = newMode === 'vendor' ? 'vendor' : 'client';
        setMessageRole(newRole);
      }
    };
    
    window.addEventListener('viewModeChanged', handleViewModeChange);
    return () => window.removeEventListener('viewModeChanged', handleViewModeChange);
  }, []);

  // Update displayed conversations when role changes on desktop
  useEffect(() => {
    if (!isMobile) {
      const currentConvs = messageRole === 'vendor' ? allConversations.vendor : allConversations.client;
      setConversations(currentConvs);
      
      // Clear selection if role changed
      if (prevRoleRef.current !== messageRole) {
        setSelectedConversation(null);
        setMessages([]);
        prevRoleRef.current = messageRole;
      }
    }
  }, [messageRole, allConversations, isMobile]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id, selectedConversation.type);
      // On mobile, show chat view when conversation is selected
      if (isMobile) {
        setShowChatView(true);
      }
    }
  }, [selectedConversation, loadMessages, isMobile]);

  // Send typing status to server
  const sendTypingStatus = useCallback(async (isTyping) => {
    if (!selectedConversation || !currentUser?.id) return;
    try {
      await fetch(`${API_BASE_URL}/messages/typing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          userId: currentUser.id,
          isTyping
        })
      });
    } catch (error) {
      // Silently fail
    }
  }, [selectedConversation, currentUser]);

  // Check if other user is typing
  const checkTypingStatus = useCallback(async () => {
    if (!selectedConversation || !currentUser?.id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/messages/typing/${selectedConversation.id}?userId=${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOtherUserTyping(data.isTyping || false);
      }
    } catch (error) {
      // Silently fail
    }
  }, [selectedConversation, currentUser]);

  // Handle typing indicator
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

  // Poll for new messages every 3 seconds when in active chat for real-time feel
  useEffect(() => {
    if (!selectedConversation) return;
    
    // Immediate check on conversation select
    checkTypingStatus();
    
    const pollInterval = setInterval(() => {
      // Silent polling - pass true to avoid loading state/scroll jump
      loadMessages(selectedConversation.id, selectedConversation.type, true);
      // Don't refresh conversation list on every poll - it causes glitchy re-renders
      // Only check typing status
      checkTypingStatus();
    }, 3000);
    
    return () => clearInterval(pollInterval);
  }, [selectedConversation, loadMessages, checkTypingStatus]);
  
  // Handle selecting a conversation
  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
  };
  
  // Handle going back to conversation list on mobile
  const handleBackToList = () => {
    setShowChatView(false);
    setSelectedConversation(null);
    setMessages([]);
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = conv.OtherPartyName?.toLowerCase() || '';
    const lastMessage = conv.lastMessageContent?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || lastMessage.includes(query);
  });

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    
    // Immediately update conversation list (optimistic update)
    updateConversationWithMessage(newMessage.trim());
    
    // Sender ID is always the current user's ID (not vendorProfileId which is a profile ID, not a user ID)
    const senderId = currentUser?.id;
    
    try {
      if (window.socket) {
        window.socket.emit('send-message', {
          conversationId: selectedConversation.id,
          senderId: senderId,
          content: newMessage.trim()
        });
        setNewMessage('');
        setTimeout(() => {
          loadMessages(selectedConversation.id, selectedConversation.type);
          // Dispatch event to refresh notification counts
          window.dispatchEvent(new CustomEvent('messageSent'));
        }, 300);
      } else {
        const response = await apiPost('/messages', {
          conversationId: selectedConversation.id,
          senderId: senderId,
          content: newMessage.trim()
        });
        
        const data = await response.json().catch(() => ({}));
        
        // Check if message was blocked by content filter
        if (data.blocked) {
          console.log('[Chat] Message blocked by content filter:', data);
          setMessageBlockedAlert({
            reason: data.message || 'Your message was blocked due to policy violations.',
            warningMessage: data.message,
            warningLevel: data.userLocked ? 3 : 1,
            violationType: 'policy_violation'
          });
          
          // If user was locked, handle logout via modal
          if (data.userLocked) {
            window.dispatchEvent(new CustomEvent('showForceLogoutModal', {
              detail: {
                message: data.lockReason || 'Your account has been suspended due to policy violations.',
                isPermanent: true,
                onAcknowledge: () => {
                  if (logout) logout('account_locked');
                  window.location.href = '/';
                }
              }
            }));
          } else {
            // Clear alert after 10 seconds for warnings
            setTimeout(() => setMessageBlockedAlert(null), 10000);
          }
          return;
        }
        
        if (response.ok) {
          setNewMessage('');
          loadMessages(selectedConversation.id, selectedConversation.type);
          // Dispatch event to refresh notification counts
          window.dispatchEvent(new CustomEvent('messageSent'));
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderConversationItem = (conv) => {
    const isSelected = selectedConversation?.id === conv.id;
    const hasUnread = conv.unreadCount > 0;
    
    // Determine display based on conversation type
    const isClientView = conv.type === 'client'; // User is the client, other party is vendor
    
    // For client view: show Business Name + Host Name
    // For vendor view: show Client Name
    const primaryName = isClientView 
      ? (conv.vendorBusinessName || conv.OtherPartyName || 'Unknown Vendor')
      : (conv.clientName || conv.OtherPartyName || 'Unknown Client');
    
    const secondaryName = isClientView 
      ? (conv.vendorHostName ? `Hosted by ${conv.vendorHostName}` : null)
      : null;
    
    // For client view: show vendor logo with host avatar overlay
    const mainAvatarUrl = isClientView
      ? (conv.vendorLogoURL || conv.OtherPartyAvatar)
      : (conv.clientAvatar || conv.OtherPartyAvatar);
    const overlayAvatarUrl = isClientView ? conv.vendorHostAvatar : null;
    
    return (
      <div 
        key={conv.id}
        onClick={() => handleSelectConversation(conv)}
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f0f0f0',
          cursor: 'pointer',
          backgroundColor: isSelected ? '#f5f5f5' : 'white',
          transition: 'background-color 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? '#f5f5f5' : 'white'; }}
      >
        {/* Avatar container - vendor logo with host profile pic overlay */}
        <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
          {mainAvatarUrl ? (
            <img 
              src={mainAvatarUrl}
              alt={primaryName}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#5e72e4',
            display: mainAvatarUrl ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 600,
            fontSize: '18px'
          }}>
            {(primaryName || 'U').charAt(0).toUpperCase()}
          </div>
          {/* Host profile pic overlay - only for client view */}
          {isClientView && overlayAvatarUrl && (
            <img
              src={overlayAvatarUrl}
              alt="Host"
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid white',
                backgroundColor: '#e5e7eb'
              }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
        </div>
        
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: secondaryName ? '2px' : '4px' }}>
            <span style={{ fontWeight: hasUnread ? 600 : 500, color: '#222', fontSize: '15px' }}>
              {primaryName}
            </span>
            <span style={{ fontSize: '12px', color: '#999' }}>
              {formatTimeAgo(conv.lastMessageCreatedAt)}
            </span>
          </div>
          
          {/* Secondary name (host name for vendors) */}
          {secondaryName && (
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
              {secondaryName}
            </div>
          )}
          
          <div style={{ 
            fontSize: '14px', 
            color: hasUnread ? '#444' : '#888',
            fontWeight: hasUnread ? 500 : 400,
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {conv.lastMessageContent && isGifUrl(conv.lastMessageContent) ? (
              <>
                <i className="fas fa-image" style={{ fontSize: '12px', color: '#9ca3af' }}></i>
                <span>GIF</span>
              </>
            ) : (
              conv.lastMessageContent || 'No messages yet'
            )}
          </div>
        </div>
        
        {/* Unread badge */}
        {hasUnread && (
          <div style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: '#5e72e4',
            color: 'white',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
          </div>
        )}
      </div>
    );
  };

  // Check if content is a GIF URL
  const isGifUrl = (content) => {
    if (!content) return false;
    return content.match(/\.(gif)$/i) || content.includes('giphy.com') || content.includes('tenor.com');
  };

  // Helper to get date string for day dividers
  const getDateString = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderMessage = (message, index, allMessages) => {
    const isOwnMessage = message.SenderID === currentUser?.id || 
                         (selectedConversation?.type === 'vendor' && message.SenderID === vendorProfileId);
    const isGif = isGifUrl(message.Content);
    
    // Check if we need a day divider
    const currentDate = message.CreatedAt ? new Date(message.CreatedAt).toDateString() : '';
    const prevMessage = index > 0 ? allMessages[index - 1] : null;
    const prevDate = prevMessage?.CreatedAt ? new Date(prevMessage.CreatedAt).toDateString() : '';
    const showDayDivider = currentDate && currentDate !== prevDate;
    
    return (
      <React.Fragment key={message.MessageID || message.id}>
        {/* Day divider */}
        {showDayDivider && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '16px 0',
            gap: '12px'
          }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
            <span style={{ 
              fontSize: '11px', 
              color: '#9ca3af', 
              fontWeight: 500,
              padding: '4px 12px',
              backgroundColor: '#f3f4f6',
              borderRadius: '12px'
            }}>
              {getDateString(message.CreatedAt)}
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
          </div>
        )}
        <div 
          style={{ 
            marginBottom: '10px',
            display: 'flex',
            justifyContent: isOwnMessage ? 'flex-end' : 'flex-start'
          }}
        >
          <div style={{ 
            padding: isGif ? '4px' : '8px 12px', 
            borderRadius: isOwnMessage ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            backgroundColor: isGif ? 'transparent' : (isOwnMessage ? '#5e72e4' : '#f0f0f0'),
            color: isOwnMessage ? 'white' : '#1a1a1a',
            maxWidth: '70%',
            boxShadow: isGif ? 'none' : '0 1px 2px rgba(0,0,0,0.08)'
          }}>
            {isGif ? (
              <img 
                src={message.Content} 
                alt="GIF" 
                style={{ 
                  maxWidth: '200px', 
                  maxHeight: '200px', 
                  borderRadius: '12px',
                  display: 'block'
                }} 
              />
            ) : (
              <div style={{ marginBottom: '3px', wordBreak: 'break-word', fontSize: '13px' }}>{message.Content}</div>
            )}
            <div style={{ 
              fontSize: '10px', 
              opacity: 0.7,
              textAlign: isOwnMessage ? 'right' : 'left'
            }}>
              {(() => {
                if (!message.CreatedAt) return '';
                const date = new Date(message.CreatedAt);
                if (isNaN(date.getTime())) return '';
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              })() || ''}
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  };

  // Render conversation list (sidebar on desktop, full screen on mobile)
  const renderConversationList = () => {
    // On narrow desktop with collapsed list, show only a thin sidebar with toggle
    const listWidth = isMobile ? '100%' : (isNarrowDesktop && isListCollapsed ? '60px' : '350px');
    
    return (
    <div style={{ 
      width: listWidth, 
      minWidth: isNarrowDesktop && isListCollapsed ? '60px' : undefined,
      borderRight: isMobile ? 'none' : '1px solid #e5e5e5',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'white',
      height: '100%',
      transition: 'width 0.3s ease',
      overflow: 'hidden'
    }}>
      {/* Collapsed state - show only expand button */}
      {isNarrowDesktop && isListCollapsed ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          padding: '12px 0',
          gap: '12px'
        }}>
          <button
            onClick={() => setIsListCollapsed(false)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              border: '1px solid #e5e5e5',
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666'
            }}
            title="Expand conversations"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
          <div style={{ 
            fontSize: '11px', 
            color: '#999', 
            writingMode: 'vertical-rl', 
            textOrientation: 'mixed',
            transform: 'rotate(180deg)'
          }}>
            {filteredConversations.length} chats
          </div>
        </div>
      ) : (
        <>
      {/* Header - compact, no title since it's in the dashboard nav */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #e5e5e5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
        {(loading || !vendorProfileChecked) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
            <span style={{ margin: 0, fontSize: '13px', color: '#666' }}>Loading conversations...</span>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
          </p>
        )}
        </div>
        {isNarrowDesktop && (
          <button
            onClick={() => setIsListCollapsed(true)}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: '1px solid #e5e5e5',
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: '12px'
            }}
            title="Collapse conversations"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
        )}
      </div>
      
      {/* Role is now determined by sidebar toggle - no separate tabs needed */}
      
      {/* Search */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e5e5' }}>
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>
        </>
      )}
      
      {/* Conversations list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {(loading || !vendorProfileChecked) ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fas fa-comments" style={{ fontSize: '48px', color: '#ddd', marginBottom: '16px', display: 'block' }}></i>
            <p style={{ color: '#666', fontSize: '15px', margin: 0 }}>
              {searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          filteredConversations.map(renderConversationItem)
        )}
      </div>
    </div>
  );
  };

  // Render chat area
  const renderChatArea = () => (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: 'white',
      height: '100%'
    }}>
      {/* Chat header */}
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid #e5e5e5',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* Back button for mobile and narrow desktop */}
        {(isMobile || isNarrowDesktop) && (
          <button
            onClick={handleBackToList}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i className="fas fa-arrow-left" style={{ fontSize: '18px', color: '#222' }}></i>
          </button>
        )}
        
        {selectedConversation ? (
          (() => {
            // Determine display based on conversation type
            const isClientView = selectedConversation.type === 'client';
            const headerPrimaryName = isClientView 
              ? (selectedConversation.vendorBusinessName || selectedConversation.OtherPartyName || 'Unknown Vendor')
              : (selectedConversation.clientName || selectedConversation.OtherPartyName || 'Unknown Client');
            const headerSecondaryName = isClientView 
              ? (selectedConversation.vendorHostName || null)
              : null;
            const headerAvatarUrl = isClientView
              ? (selectedConversation.vendorLogoURL || selectedConversation.OtherPartyAvatar)
              : (selectedConversation.clientAvatar || selectedConversation.OtherPartyAvatar);
            const headerOverlayAvatarUrl = isClientView ? selectedConversation.vendorHostAvatar : null;
            
            return (
              <>
                <div style={{ position: 'relative', width: '44px', height: '44px' }}>
                  {headerAvatarUrl ? (
                    <img
                      src={headerAvatarUrl}
                      alt={headerPrimaryName}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: '#5e72e4',
                    display: headerAvatarUrl ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '16px'
                  }}>
                    {(headerPrimaryName || 'U').charAt(0).toUpperCase()}
                  </div>
                  {/* Host profile pic overlay - only for client view */}
                  {isClientView && headerOverlayAvatarUrl ? (
                    <img
                      src={headerOverlayAvatarUrl}
                      alt="Host"
                      style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid white',
                        backgroundColor: '#e5e7eb'
                      }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    /* Online indicator - show when no host overlay */
                    <div style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: otherPartyOnlineStatus?.isOnline ? '#10b981' : '#9ca3af',
                      border: '2px solid white'
                    }}></div>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#222', fontSize: '16px' }}>
                    {headerPrimaryName}
                  </div>
                  {/* Secondary name (host name for vendors) */}
                  {headerSecondaryName && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {headerSecondaryName}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: otherPartyOnlineStatus?.isOnline ? '#10b981' : '#9ca3af' }}>
                    {otherPartyOnlineStatus?.isOnline 
                      ? 'Online' 
                      : (otherPartyOnlineStatus?.lastActiveText || 'Offline')}
                  </div>
                </div>
              </>
            );
          })()
        ) : (
          <div style={{ color: '#666', fontSize: '15px' }}>Select a conversation</div>
        )}
      </div>
      
      {/* Booking info banner - clean white style, clickable to open More Info */}
      {bookingInfo && (
        <div 
          onClick={() => setSelectedBookingForDetails(bookingInfo)}
          style={{
            padding: '10px 16px',
            backgroundColor: 'white',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            cursor: 'pointer',
            transition: 'background-color 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-calendar-alt" style={{ color: '#5e72e4', fontSize: '14px' }}></i>
            <div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '1px' }}>
                Upcoming Booking:
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                {bookingInfo.serviceName}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>
                  {bookingInfo.eventDate ? new Date(bookingInfo.eventDate).toLocaleDateString('en-US', { 
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                  }) : 'Date TBD'}
                  {bookingInfo.startTime && ` • ${bookingInfo.startTime}`}
                  {bookingInfo.endTime && ` - ${bookingInfo.endTime}`}
                </span>
                {bookingInfo.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="fas fa-map-marker-alt" style={{ fontSize: '10px', color: '#9ca3af' }}></i>
                    {bookingInfo.location}
                  </span>
                )}
              </div>
            </div>
          </div>
          {(() => {
            // Use shared booking status utility for consistency across app
            const isVendorView = messageRole === 'vendor';
            const cfg = getBookingStatusConfig(bookingInfo, isVendorView);
            return (
              <span style={{
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: cfg.bg,
                color: cfg.color,
                border: `1px ${cfg.borderStyle || 'solid'} ${cfg.color}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <i className={`fas ${cfg.icon}`} style={{ fontSize: '10px' }}></i>
                {cfg.label}
              </span>
            );
          })()}
        </div>
      )}
      
      {/* Messages container */}
      <div 
        ref={chatContainerRef}
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.target;
          const atBottom = scrollHeight - scrollTop - clientHeight < 50;
          setIsAtBottom(atBottom);
          if (atBottom) {
            setHasNewMessages(false);
          }
        }}
        style={{ 
          flex: 1, 
          padding: '20px 24px', 
          overflowY: 'auto',
          backgroundColor: '#fafafa',
          position: 'relative'
        }}>
        {!selectedConversation ? (
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#888'
          }}>
            <i className="fas fa-comments" style={{ fontSize: '64px', color: '#ddd', marginBottom: '16px' }}></i>
            <p style={{ fontSize: '16px', margin: 0 }}>Select a conversation to start messaging</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
            <p style={{ margin: 0 }}>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => renderMessage(message, index, messages))}
            
            {/* Typing indicator */}
            {otherUserTyping && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: '16px'
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '18px 18px 18px 4px',
                  background: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out', animationDelay: '0s' }}></div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out', animationDelay: '0.2s' }}></div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out', animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
            
            {/* New messages notification */}
            {hasNewMessages && !isAtBottom && (
              <div 
                onClick={() => {
                  scrollToBottom(false);
                  setHasNewMessages(false);
                  setIsAtBottom(true);
                }}
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
                  margin: '0 auto'
                }}
              >
                <i className="fas fa-arrow-down" style={{ fontSize: '11px' }}></i>
                New messages
              </div>
            )}
          </>
        )}
      </div>
      
      {/* CSS for typing animation */}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
      
      {/* Message input */}
      {selectedConversation && (
        <div style={{ 
          padding: '12px 16px', 
          borderTop: '1px solid #e5e5e5',
          backgroundColor: 'white',
          position: 'relative'
        }}>
          {/* Quick replies - always visible above input */}
          <div style={{ 
            display: 'flex', 
            gap: '6px', 
            flexWrap: 'nowrap', 
            marginBottom: '10px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: '2px'
          }} className="quick-replies-scroll">
            {quickReplies.map((reply, idx) => (
              <button
                key={idx}
                onClick={async () => {
                  // Immediately update conversation list (optimistic update)
                  updateConversationWithMessage(reply);
                  
                  // Directly send quick reply without showing in text box - always use currentUser.id
                  const senderId = currentUser?.id;
                  
                  try {
                    if (window.socket) {
                      window.socket.emit('send-message', {
                        conversationId: selectedConversation.id,
                        senderId: senderId,
                        content: reply
                      });
                      setTimeout(() => {
                        loadMessages(selectedConversation.id, selectedConversation.type);
                        window.dispatchEvent(new CustomEvent('messageSent'));
                      }, 300);
                    } else {
                      const response = await apiPost('/messages', {
                        conversationId: selectedConversation.id,
                        senderId: senderId,
                        content: reply
                      });
                      
                      if (response.ok) {
                        loadMessages(selectedConversation.id, selectedConversation.type);
                        window.dispatchEvent(new CustomEvent('messageSent'));
                      }
                    }
                  } catch (error) {
                    console.error('Error sending quick reply:', error);
                  }
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '14px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  fontSize: '12px',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                {reply}
              </button>
            ))}
          </div>
          
          {/* Emoji picker - full featured with categories */}
          {showEmojiPicker && (
            <div style={{ 
              position: 'absolute',
              bottom: '100%',
              left: '16px',
              marginBottom: '8px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
              zIndex: 100,
              width: '300px',
              maxWidth: 'calc(100vw - 48px)',
              overflow: 'hidden'
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
              {/* Search */}
              <input
                type="text"
                placeholder="Search emojis..."
                value={emojiSearch}
                onChange={(e) => setEmojiSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                  marginBottom: '8px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {/* Category tabs */}
              <div style={{ display: 'flex', gap: '2px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {Object.entries(emojiCategories).map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => setEmojiCategory(key)}
                    style={{
                      padding: '4px 6px',
                      border: 'none',
                      background: emojiCategory === key ? '#e5e7eb' : 'transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                    title={cat.name}
                  >
                    {cat.icon}
                  </button>
                ))}
              </div>
              {/* Emoji grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px', maxHeight: '180px', overflowY: 'auto' }}>
                {getFilteredEmojis().map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setNewMessage(prev => prev + emoji); }}
                    style={{
                      padding: '4px',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '18px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      transition: 'background 0.15s',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* GIF picker with Giphy integration */}
          {showGifPicker && (
            <div style={{ 
              position: 'absolute',
              bottom: '100%',
              left: '16px',
              marginBottom: '8px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
              zIndex: 100,
              width: '340px',
              maxWidth: 'calc(100vw - 48px)'
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
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Search GIFs..."
                  value={gifSearchQuery}
                  onChange={(e) => setGifSearchQuery(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter') fetchGifs(gifSearchQuery); }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  onClick={() => fetchGifs(gifSearchQuery)}
                  style={{
                    padding: '8px 12px',
                    background: '#5e72e4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Search
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
                ) : gifs.length > 0 ? (
                  gifs.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => handleSendGif(gif.url)}
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
                  ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                    No GIFs match your search
                  </div>
                )}
              </div>
              <div style={{ marginTop: '8px', fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                Powered by GIPHY
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Emoji button */}
            <button 
              onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
              style={{ 
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid #e5e7eb',
                backgroundColor: showEmojiPicker ? '#f3f4f6' : 'white',
                color: '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0
              }}
              title="Emojis"
            >
              😊
            </button>
            {/* GIF button */}
            <button 
              onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
              style={{ 
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid #e5e7eb',
                backgroundColor: showGifPicker ? '#f3f4f6' : 'white',
                color: '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                flexShrink: 0
              }}
              title="GIFs"
            >
              GIF
            </button>
            <input 
              type="text" 
              placeholder="Type your message..." 
              value={newMessage}
              onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
              onKeyPress={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
              style={{ 
                flex: 1, 
                padding: '10px 14px', 
                border: '1px solid #e5e5e5', 
                borderRadius: '20px',
                outline: 'none',
                fontSize: '14px',
                minWidth: 0
              }}
            />
            <button 
              id="send-message-btn"
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              style={{ 
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: newMessage.trim() ? '#5e72e4' : '#ddd',
                color: 'white',
                cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <i className="fas fa-paper-plane" style={{ fontSize: '14px' }}></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div 
      className="unified-messages-section" 
      style={{ 
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: 'white',
        height: '100%'
      }}
    >
      {/* Mobile: Show either list or chat */}
      {isMobile ? (
        showChatView ? renderChatArea() : renderConversationList()
      ) : isNarrowDesktop ? (
        /* Narrow Desktop: Show list OR chat based on selection (like mobile) */
        selectedConversation ? renderChatArea() : renderConversationList()
      ) : (
        /* Wide Desktop: Show both side by side */
        <>
          {renderConversationList()}
          {renderChatArea()}
        </>
      )}
      
      {/* Booking Details Modal - use the same component as Bookings page */}
      <BookingDetailsModal 
        isOpen={!!selectedBookingForDetails} 
        onClose={() => setSelectedBookingForDetails(null)} 
        booking={selectedBookingForDetails} 
      />
      
      {/* Message Blocked Alert */}
      {messageBlockedAlert && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: messageBlockedAlert.warningLevel >= 3 ? '#dc3545' : '#ffc107',
          color: messageBlockedAlert.warningLevel >= 3 ? 'white' : '#856404',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {messageBlockedAlert.warningLevel >= 3 ? '⛔ Account Suspended' : '⚠️ Message Blocked'}
              </div>
              <div style={{ fontSize: '14px' }}>{messageBlockedAlert.reason}</div>
              {messageBlockedAlert.warningMessage && (
                <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.9 }}>
                  {messageBlockedAlert.warningMessage}
                </div>
              )}
            </div>
            <button 
              onClick={() => setMessageBlockedAlert(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: 'inherit',
                padding: '0',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UnifiedMessagesSection;
