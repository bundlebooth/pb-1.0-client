import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { API_BASE_URL, GIPHY_API_KEY } from '../config';
import { useVendorOnlineStatus } from '../hooks/useOnlineStatus';
import Header from './Header';
import ImageUpload from './common/ImageUpload';

function MessagingWidget() {
  const { currentUser } = useAuth();
  const { showError, showWarning, showSuccess } = useAlert();
  const [isOpen, setIsOpen] = useState(false);
  const [mainView, setMainView] = useState('home'); // 'home', 'messages', 'help'
  const [view, setView] = useState('conversations'); // 'conversations' or 'chat'
  const [messageRole, setMessageRole] = useState('client'); // 'client' or 'vendor'
  const [conversations, setConversations] = useState([]);
  const [allConversations, setAllConversations] = useState({ client: [], vendor: [] });
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false); // Show "new messages" badge when scrolled up
  const [isAtBottom, setIsAtBottom] = useState(true); // Track if user is at bottom of chat
  const [otherUserTyping, setOtherUserTyping] = useState(false); // Typing indicator
  const chatContainerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: '', description: '', category: 'general', priority: 'medium', attachments: [] });
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(null);
  const [userTickets, setUserTickets] = useState([]);
  const fileInputRef = useRef(null);
  const [faqs, setFaqs] = useState([]);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [selectedFaq, setSelectedFaq] = useState(null); // For full FAQ detail view
  const [faqFeedbackSubmitted, setFaqFeedbackSubmitted] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null); // For category browsing
  const [helpBreadcrumb, setHelpBreadcrumb] = useState([]); // Navigation trail: ['home'] or ['home', 'category'] or ['home', 'category', 'article']
  const [isWidgetExpanded, setIsWidgetExpanded] = useState(false); // For expanding widget when viewing article
  const [helpSearchQuery, setHelpSearchQuery] = useState(''); // Search within help
  
  // Guest state for non-logged-in users
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(false); // Pre-chat form for guests
  const [guestReferenceNumber, setGuestReferenceNumber] = useState(''); // Reference # for guest support
  const [isFreshSupportChat, setIsFreshSupportChat] = useState(false); // Prevent polling from overwriting welcome message
  
  // Support chat topic selection (like ticket form)
  const [supportTopic, setSupportTopic] = useState({
    category: '',
    subject: '',
    description: ''
  });
  const [supportFormStep, setSupportFormStep] = useState(1); // 1=topic, 2=details (name/email for guests)
  
  // Support category options
  const supportCategories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'booking_issue', label: 'Booking Issue' },
    { value: 'payment_refund', label: 'Payment & Refunds' },
    { value: 'vendor_complaint', label: 'Vendor Complaint' },
    { value: 'technical_bug', label: 'Technical Bug' },
    { value: 'account_access', label: 'Account Access' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'vendor_onboarding', label: 'Vendor Onboarding Help' },
    { value: 'other', label: 'Other' }
  ];
  
  // Generate reference number for guest support
  const generateReferenceNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PB-${timestamp}-${random}`;
  };

  // FAQ Categories matching help-centre page
  const faqCategories = [
    { name: 'Most Frequently Asked', slug: 'Getting Started', icon: 'fa-star' },
    { name: 'General', slug: 'general', icon: 'fa-file-alt' },
    { name: 'Help with Booking', slug: 'Booking', icon: 'fa-calendar-check' },
    { name: 'For Vendors', slug: 'Vendors', icon: 'fa-briefcase' },
    { name: 'For Clients', slug: 'Clients', icon: 'fa-users' },
    { name: 'Payments & Billing', slug: 'Payments', icon: 'fa-credit-card' },
    { name: 'Trust & Safety', slug: 'Trust & Safety', icon: 'fa-shield-alt' },
    { name: 'Account & Profile', slug: 'Account', icon: 'fa-user-circle' },
    { name: 'Reviews & Ratings', slug: 'Reviews', icon: 'fa-star' },
    { name: 'Cancellations & Refunds', slug: 'Cancellations', icon: 'fa-undo' },
    { name: 'Messages & Communication', slug: 'Messages', icon: 'fa-comments' },
    { name: 'Technical Support', slug: 'Technical', icon: 'fa-cog' }
  ];

  // Group FAQs by category
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const cat = faq.Category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  // Get FAQs for selected category
  const categoryFaqs = selectedCategory 
    ? faqs.filter(faq => faq.Category === selectedCategory.slug || faq.Category === selectedCategory.name)
    : [];

  // Handle category click
  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setSelectedFaq(null);
    setHelpBreadcrumb(['home', 'category']);
  };

  // Handle article click
  const handleArticleClick = (faq) => {
    setSelectedFaq(faq);
    setHelpBreadcrumb(['home', 'category', 'article']);
  };

  // Handle back navigation
  const handleHelpBack = () => {
    if (selectedFaq) {
      setSelectedFaq(null);
      // Don't change isWidgetExpanded - preserve user's preference
      setHelpBreadcrumb(['home', 'category']);
    } else if (selectedCategory) {
      setSelectedCategory(null);
      setHelpBreadcrumb(['home']);
    }
  };

  // Filter FAQs by search query
  const filteredFaqCategories = helpSearchQuery.length >= 2
    ? faqCategories.filter(cat => {
        const catFaqs = faqs.filter(faq => faq.Category === cat.slug || faq.Category === cat.name);
        return catFaqs.some(faq => 
          faq.Question?.toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
          faq.Answer?.toLowerCase().includes(helpSearchQuery.toLowerCase())
        );
      })
    : faqCategories;

  // Get search results across all FAQs
  const helpSearchResults = helpSearchQuery.length >= 2
    ? faqs.filter(faq => 
        faq.Question?.toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
        faq.Answer?.toLowerCase().includes(helpSearchQuery.toLowerCase())
      )
    : [];

  // Reset help navigation when switching views
  const resetHelpNavigation = () => {
    setSelectedCategory(null);
    setSelectedFaq(null);
    setHelpBreadcrumb([]);
  };
  const [otherPartyVendorId, setOtherPartyVendorId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifs, setGifs] = useState([]);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifsLoading, setGifsLoading] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [emojiCategory, setEmojiCategory] = useState('smileys');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Emoji categories matching dashboard
  const emojiCategories = {
    smileys: { icon: '😀', name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'] },
    gestures: { icon: '👋', name: 'Gestures', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪'] },
    hearts: { icon: '❤️', name: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💌', '💋', '😻', '😽', '🫶'] },
    objects: { icon: '⭐', name: 'Objects', emojis: ['⭐', '🌟', '✨', '💫', '🔥', '💥', '💢', '💦', '💨', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🎯', '🎮', '🎲', '🎭', '🎨', '🎬', '🎤', '🎧', '🎵', '🎶', '💡', '📱', '💻', '⌨️', '🖥️', '📷', '📸'] },
    food: { icon: '🍕', name: 'Food', emojis: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚', '🍳', '🧇', '🥞', '🧈', '🍞', '🥐', '🥖', '🥨', '🧀', '🥗', '🥙', '🥪', '🌮', '🌯', '🫔', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍩', '🍪', '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉'] },
    animals: { icon: '🐶', name: 'Animals', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'] },
    nature: { icon: '🌸', name: 'Nature', emojis: ['🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🌰', '🦀', '🦞', '🦐', '🦑', '🌍', '🌎', '🌏', '🌐', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌙', '🌚', '🌛', '🌜', '☀️', '🌝', '🌞', '⭐', '🌟', '🌠', '☁️', '⛅', '⛈️', '🌤️', '🌥️', '🌦️', '🌧️', '🌨️', '🌩️', '🌪️', '🌫️', '🌬️', '🌀', '🌈', '🌂', '☂️', '☔', '⛱️', '⚡', '❄️', '☃️', '⛄', '🔥', '💧', '🌊'] }
  };

  // Get filtered emojis based on search
  const getFilteredEmojis = () => {
    if (!emojiSearch) return emojiCategories[emojiCategory]?.emojis || [];
    const allEmojis = Object.values(emojiCategories).flatMap(cat => cat.emojis);
    return allEmojis;
  };
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Handle resize for mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent background scrolling when widget is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, isMobile]);

  // Quick reply suggestions - matching dashboard
  const quickReplies = [
    "Hi! 👋",
    "Hello!",
    "Thanks!",
    "Great! 👍",
    "Sounds good!",
    "Perfect!"
  ];

  // GIPHY API key - imported from config.js

  // Fetch GIFs from GIPHY
  const fetchGifs = async (query = '') => {
    setGifsLoading(true);
    try {
      const endpoint = query 
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.data) {
        setGifs(data.data.map(gif => ({
          id: gif.id,
          url: gif.images.fixed_height.url,
          alt: gif.title
        })));
      }
    } catch (error) {
      console.error('Error fetching GIFs:', error);
    } finally {
      setGifsLoading(false);
    }
  };

  // Load trending GIFs when picker opens
  useEffect(() => {
    if (showGifPicker && gifs.length === 0) {
      fetchGifs();
    }
  }, [showGifPicker]);

  // Handle sending a GIF
  const handleSendGif = async (gifUrl) => {
    if (!currentConversation) return;
    
    setShowGifPicker(false);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId: currentConversation.ConversationID || currentConversation.id,
          senderId: currentUser?.id,
          content: gifUrl
        })
      });
      
      if (response.ok) {
        loadMessages(currentConversation.ConversationID || currentConversation.id);
      }
    } catch (error) {
      console.error('Error sending GIF:', error);
    }
  };

  // Handle emoji selection
  const onEmojiClick = (emojiData) => {
    setMessageInput(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Handle quick reply click - send directly like dashboard
  const handleQuickReply = async (reply) => {
    if (!currentConversation) {
      setMessageInput(reply);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId: currentConversation.ConversationID || currentConversation.id,
          senderId: currentUser?.id,
          content: reply
        })
      });
      
      if (response.ok) {
        loadMessages(currentConversation.ConversationID || currentConversation.id);
      }
    } catch (error) {
      console.error('Error sending quick reply:', error);
      setMessageInput(reply);
    }
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

  // Get online status for the other party (vendor) in the conversation
  const { statuses: vendorOnlineStatuses } = useVendorOnlineStatus(
    otherPartyVendorId ? [otherPartyVendorId] : [],
    { enabled: !!otherPartyVendorId, refreshInterval: 180000 } // 3 minutes
  );
  const otherPartyOnlineStatus = otherPartyVendorId ? vendorOnlineStatuses[otherPartyVendorId] : null;

  // Load FAQs from API
  useEffect(() => {
    const loadFaqs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/public/faqs`);
        if (response.ok) {
          const data = await response.json();
          setFaqs(data.faqs || []);
        }
      } catch (error) {
        console.error('Failed to load FAQs:', error);
      }
    };
    loadFaqs();
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/messages/conversations/user/${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const allConvs = data.conversations || [];
        
        // Split conversations by role
        // Client conversations: where user is the client (initiated the conversation)
        // Vendor conversations: where user is the vendor (receiving inquiries)
        const clientConvs = allConvs.filter(c => c.OtherPartyType === 'vendor' || c.isClientRole);
        const vendorConvs = allConvs.filter(c => c.OtherPartyType === 'user' || c.isVendorRole);
        
        setAllConversations({ client: clientConvs, vendor: vendorConvs });
        
        // Set current view's conversations based on role
        const currentConvs = messageRole === 'vendor' ? vendorConvs : clientConvs;
        setConversations(currentConvs);
        
        // Calculate total unread count
        const unread = allConvs.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [currentUser, messageRole]);

  // Load messages for a conversation - silent refresh to avoid flicker
  const loadMessages = useCallback(async (conversationId, isPolling = false) => {
    if (!conversationId) return;
    
    // Only show loading on initial load, not on polling refreshes
    if (!isPolling) {
      setLoading(true);
    }
    try {
      // For guest users, fetch without auth; for logged-in users, use auth
      const userId = currentUser?.id || 0;
      const headers = currentUser?.id 
        ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        : { 'Content-Type': 'application/json' };
      
      const response = await fetch(`${API_BASE_URL}/messages/conversation/${conversationId}?userId=${userId}`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        const newMessages = data.messages || [];
        
        // Get current scroll position to decide whether to scroll or show notification
        const chatContainer = chatContainerRef.current;
        const atBottom = chatContainer 
          ? chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 50
          : true;
        
        // Update messages and handle new message notifications
        setMessages(prev => {
          const prevIds = prev.map(m => m.MessageID).join(',');
          const newIds = newMessages.map(m => m.MessageID).join(',');
          
          // No change
          if (prevIds === newIds) {
            return prev;
          }
          
                    
          // New messages arrived during polling
          const hasNew = newMessages.length > prev.length;
          if (hasNew && isPolling) {
            if (atBottom) {
                            setTimeout(() => {
                if (chatContainerRef.current) {
                  chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
              }, 100);
            } else {
                            // Use setTimeout to avoid setState during render
              setTimeout(() => setHasNewMessages(true), 0);
            }
          }
          
          return newMessages;
        });
        
        // Always scroll on initial load
        if (!isPolling) {
          setIsAtBottom(true);
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      if (!isPolling) {
        setLoading(false);
      }
    }
  }, [currentUser]);

  // Send message with optimistic update for instant feel
  const sendMessage = useCallback(async () => {
    if (!messageInput.trim() || !currentConversation) return;
    
    // For guest users, require name first
    if (!currentUser?.id && showGuestForm) {
      return; // Don't send until guest enters name
    }
    
    const messageText = messageInput.trim();
    setMessageInput('');
    
    // Clear fresh support chat flag so polling can resume after user sends a message
    if (isFreshSupportChat) {
      setIsFreshSupportChat(false);
    }
    
    // For guest users, use a guest identifier
    const senderId = currentUser?.id || 'guest';
    const isGuestUser = !currentUser?.id && currentConversation.isGuest;
    
    // Optimistic update - show message immediately
    const optimisticMessage = {
      MessageID: `temp-${Date.now()}`,
      ConversationID: currentConversation.id,
      SenderID: senderId,
      Content: messageText,
      SentAt: new Date().toISOString(),
      IsRead: false,
      _optimistic: true,
      _isCurrentUser: true // Flag to identify as current user's message
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(scrollToBottom, 50);
    
    try {
      let response;
      
      if (isGuestUser) {
        // Use guest message endpoint (no auth required)
        response = await fetch(`${API_BASE_URL}/messages/guest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: currentConversation.id,
            guestEmail: currentConversation.guestEmail || guestEmail,
            referenceNumber: currentConversation.referenceNumber || guestReferenceNumber,
            content: messageText
          })
        });
      } else {
        // Regular authenticated message
        response = await fetch(`${API_BASE_URL}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            conversationId: currentConversation.id,
            senderId: currentUser?.id || 'guest',
            content: messageText
          })
        });
      }
      
      if (response.ok) {
        // For support conversations, don't reload messages to preserve clean slate
        // Just update the optimistic message to confirmed
        if (currentConversation.ConversationType === 'support' || currentConversation.isSupport || currentConversation.isGuest) {
          // Keep the optimistic message, just remove the _optimistic flag
          setMessages(prev => prev.map(m => 
            m.MessageID === optimisticMessage.MessageID 
              ? { ...m, _optimistic: false } 
              : m
          ));
        } else {
          // For regular conversations, reload to get server-confirmed version
          loadMessages(currentConversation.id);
        }
      } else {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.MessageID !== optimisticMessage.MessageID));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.MessageID !== optimisticMessage.MessageID));
    }
  }, [messageInput, currentConversation, currentUser, loadMessages, isFreshSupportChat, showGuestForm, guestEmail, guestReferenceNumber]);

  // Open conversation
  const openConversation = useCallback((conversation) => {
    setCurrentConversation(conversation);
    setView('chat');
    loadMessages(conversation.id);
    // Set vendor profile ID for online status tracking
    if (conversation.VendorProfileID) {
      setOtherPartyVendorId(conversation.VendorProfileID);
    }
  }, [loadMessages]);

  // Back to conversations
  const backToConversations = useCallback(() => {
    setView('conversations');
    setCurrentConversation(null);
    setMessages([]);
    setOtherPartyVendorId(null);
    loadConversations();
  }, [loadConversations]);

  // Toggle widget
  const toggleWidget = useCallback(() => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setMainView('home'); // Always start with home view
      loadConversations();
    }
  }, [isOpen, loadConversations]);

  // Switch main view - preserve expanded state, only reset navigation
  const switchMainView = useCallback((newView) => {
    setMainView(newView);
    // Don't change isWidgetExpanded - preserve user's preference
    setSelectedCategory(null); // Reset category navigation
    setSelectedFaq(null); // Reset article selection
    setHelpSearchQuery(''); // Clear search
    if (newView === 'messages') {
      setView('conversations');
      loadConversations();
    }
  }, [loadConversations]);

  // Start or open support conversation - reuses today's conversation or creates new one for new day
  const openSupportChat = useCallback(async () => {
    // If no user logged in, show pre-chat form for name/email
    if (!currentUser?.id) {
      setShowGuestForm(true);
      setMainView('messages');
      setView('guest-form'); // Show guest form view instead of chat
      return;
    }
    
    try {
      // First check if user has a support conversation from TODAY
      const checkResponse = await fetch(`${API_BASE_URL}/messages/conversations/support/today?userId=${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        
        if (checkData.conversationId) {
          // Use existing today's conversation - load messages
          const supportConversation = {
            id: checkData.conversationId,
            ConversationID: checkData.conversationId,
            OtherPartyName: 'Planbeau Support',
            ConversationType: 'support',
            isSupport: true
          };
          
          setCurrentConversation(supportConversation);
          setMainView('messages');
          setView('chat');
          
          // Load existing messages for today's conversation
          loadMessages(checkData.conversationId);
          return;
        }
      }
      
      // No conversation today - create a NEW support conversation (clean slate for new day)
      const response = await fetch(`${API_BASE_URL}/messages/conversations/support`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id,
          subject: 'Support Request',
          createNew: true // Flag to always create new conversation
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.conversationId) {
          // Create conversation object for the chat view
          const supportConversation = {
            id: data.conversationId,
            ConversationID: data.conversationId,
            OtherPartyName: 'Planbeau Support',
            ConversationType: 'support',
            isSupport: true
          };
          
          // Set the conversation and switch to chat view
          setCurrentConversation(supportConversation);
          setMainView('messages'); // Must set mainView to 'messages' for chat to render
          setView('chat');
          
          // Start with clean slate - show only welcome message (personalized like Intercom)
          const userName = currentUser.firstName || currentUser.name?.split(' ')[0] || 'there';
          setMessages([{
            id: 'welcome-msg',
            content: `👋 Hi ${userName}! I'm here to help with any questions about Planbeau.\n\nYou can ask me about bookings, vendors, your account, or anything else. How can I help you today?`,
            senderId: 'support',
            SenderID: 'support',
            isSupport: true,
            CreatedAt: new Date().toISOString()
          }]);
          
          // Mark as fresh support chat to prevent polling from overwriting welcome message
          setIsFreshSupportChat(true);
          
          // Reload conversations in background
          loadConversations();
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to create support conversation:', errorData);
        showError('Unable to start support chat. Please try again.');
      }
    } catch (error) {
      console.error('Failed to start support chat:', error);
      showError('Unable to start support chat. Please check your connection.');
    }
  }, [currentUser, loadConversations, loadMessages]);

  // Start guest chat after form submission - calls backend API
  const startGuestChat = useCallback(async () => {
    if (!guestName.trim() || !guestEmail.trim()) return;
    if (!supportTopic.category || !supportTopic.subject.trim()) return;
    
    // Generate reference number
    const refNumber = generateReferenceNumber();
    setGuestReferenceNumber(refNumber);
    
    try {
      // Call backend API to create guest support conversation
      const response = await fetch(`${API_BASE_URL}/messages/conversations/support/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          category: supportTopic.category,
          subject: supportTopic.subject.trim(),
          description: supportTopic.description.trim(),
          referenceNumber: refNumber
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Set up guest conversation with real ID from backend
        const guestConversation = {
          id: data.conversationId || 'guest-support',
          ConversationID: data.conversationId || 'guest-support',
          OtherPartyName: 'Planbeau Support',
          ConversationType: 'guest_support',
          isSupport: true,
          isGuest: true,
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          referenceNumber: refNumber,
          ticketNumber: data.ticketNumber
        };
        
        setCurrentConversation(guestConversation);
        setShowGuestForm(false);
        setSupportFormStep(1); // Reset form step
        setView('chat');
        
        // Show welcome message immediately (don't wait for loadMessages)
        const categoryLabel = supportCategories.find(c => c.value === supportTopic.category)?.label || supportTopic.category;
        setMessages([{
          MessageID: 'welcome-msg',
          Content: `👋 Hi ${guestName.trim()}! Thanks for reaching out to Planbeau Support.\n\nYour reference number is: **${refNumber}**\nPlease save this for future reference.\n\nWe'll send a response to ${guestEmail.trim()} when we reply.\n\n**Topic:** ${categoryLabel}\n**Subject:** ${supportTopic.subject}\n\nHow can we help you today?`,
          SenderID: null,
          SenderType: 'support',
          isSupport: true,
          CreatedAt: new Date().toISOString()
        }]);
        
        setIsFreshSupportChat(true);
      } else {
        console.error('Failed to create guest conversation');
        showError('Unable to start support chat. Please try again.');
      }
    } catch (error) {
      console.error('Failed to start guest chat:', error);
      showError('Unable to start support chat. Please check your connection.');
    }
  }, [guestName, guestEmail, supportTopic, loadMessages, supportCategories]);

  // Upload file to Cloudinary
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'support-tickets');
    
    const response = await fetch(`${API_BASE_URL}/upload/image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    
    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();
    return { url: data.url || data.secure_url, name: file.name, type: file.type };
  };

  // Submit support ticket
  const submitTicket = useCallback(async () => {
    if (!ticketForm.subject || !ticketForm.description) return;
    
    setTicketSubmitting(true);
    try {
      // Upload attachments to Cloudinary first
      let uploadedAttachments = [];
      if (ticketForm.attachments && ticketForm.attachments.length > 0) {
        for (const file of ticketForm.attachments) {
          try {
            const uploaded = await uploadToCloudinary(file);
            uploadedAttachments.push(uploaded);
          } catch (uploadError) {
            console.error('Failed to upload attachment:', uploadError);
          }
        }
      }

      const response = await fetch(`${API_BASE_URL}/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          userName: currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : null,
          subject: ticketForm.subject,
          description: ticketForm.description,
          category: ticketForm.category,
          priority: ticketForm.priority,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTicketSuccess(`Ticket #${data.ticketNumber} submitted successfully! We will get back to you soon.`);
        setTicketForm({ subject: '', description: '', category: 'general', priority: 'medium', attachments: [] });
        // Refresh tickets list
        if (currentUser?.id) {
          const ticketsRes = await fetch(`${API_BASE_URL}/support/tickets/user/${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (ticketsRes.ok) {
            const ticketsData = await ticketsRes.json();
            setUserTickets(ticketsData.tickets || []);
          }
        }
        setTimeout(() => {
          setShowTicketForm(false);
          setTicketSuccess(null);
        }, 2000);
      } else {
        const errorData = await response.json();
        showError(errorData.message || 'Failed to submit ticket');
      }
    } catch (error) {
      console.error('Failed to submit ticket:', error);
      showError('Failed to submit ticket. Please try again.');
    } finally {
      setTicketSubmitting(false);
    }
  }, [currentUser, ticketForm]);

  // Submit FAQ feedback
  const submitFaqFeedback = useCallback(async (faqId, rating) => {
    try {
      await fetch(`${API_BASE_URL}/public/faqs/${faqId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: currentUser?.id,
          rating: rating, // 'helpful', 'neutral', 'not_helpful'
          faqId: faqId
        })
      });
      setFaqFeedbackSubmitted(prev => ({ ...prev, [faqId]: rating }));
    } catch (error) {
      console.error('Failed to submit FAQ feedback:', error);
    }
  }, [currentUser]);

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = conv.OtherPartyName?.toLowerCase() || '';
    const lastMessage = conv.lastMessageContent?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || lastMessage.includes(query);
  });

  // Send typing status to server
  const sendTypingStatus = useCallback(async (isTyping) => {
    if (!currentConversation || !currentUser?.id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/messages/typing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId: currentConversation.id,
          userId: currentUser.id,
          isTyping
        })
      });
      await response.json();
    } catch (error) {
      console.error('[WIDGET TYPING] Error:', error);
    }
  }, [currentConversation, currentUser]);

  // Check if other user is typing
  const checkTypingStatus = useCallback(async () => {
    if (!currentConversation || !currentUser?.id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/messages/typing/${currentConversation.id}?userId=${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOtherUserTyping(data.isTyping || false);
      }
    } catch (error) {
      // Silently fail
    }
  }, [currentConversation, currentUser]);

  // Debounced typing indicator - send typing status when user types
  const typingTimeoutRef = useRef(null);
  const handleTyping = useCallback(() => {
    // Fire and forget - don't let typing indicator errors affect messaging
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
      // Ignore typing indicator errors
    }
  }, [sendTypingStatus]);

  // Poll for new messages when widget is open - faster polling when in chat view
  useEffect(() => {
    if (isOpen && currentUser?.id) {
      loadConversations();
      
      // Poll faster (3 seconds) when in active chat, slower (10 seconds) otherwise
      const pollInterval = currentConversation && view === 'chat' ? 3000 : 10000;
      
      pollingIntervalRef.current = setInterval(() => {
        if (currentConversation && view === 'chat') {
          // Skip polling for fresh support chats to preserve welcome message
          if (!isFreshSupportChat) {
            // Silent polling - pass true to avoid loading state/scroll
            loadMessages(currentConversation.id, true);
          }
          // Also check typing status
          checkTypingStatus();
        }
        loadConversations();
      }, pollInterval);
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isOpen, currentUser, currentConversation, view, loadConversations, loadMessages, checkTypingStatus, isFreshSupportChat]);

  // Poll for unread count even when closed
  useEffect(() => {
    if (currentUser?.id && !isOpen) {
      loadConversations();
      
      const interval = setInterval(() => {
        loadConversations();
      }, 30000); // Every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [currentUser, isOpen, loadConversations]);

  // Update displayed conversations when role changes
  useEffect(() => {
    const currentConvs = messageRole === 'vendor' ? allConversations.vendor : allConversations.client;
    setConversations(currentConvs);
  }, [messageRole, allConversations]);

  // State for booking info to display at top of chat
  const [activeBookingInfo, setActiveBookingInfo] = useState(null);

  // Listen for openMessagingWidget events from other components
  useEffect(() => {
    const handleOpenWidget = async (event) => {
      const { conversationId, vendorProfileId, vendorName, showHome, bookingInfo } = event.detail || {};
      
      // Store booking info if provided
      if (bookingInfo) {
        setActiveBookingInfo(bookingInfo);
      }
      
      // Open the widget
      setIsOpen(true);
      
      // If showHome is true or no specific conversation requested, show home view
      if (showHome || (!conversationId && !vendorProfileId)) {
        setMainView('home');
        setActiveBookingInfo(null);
        return;
      }
      
      setMainView('messages');
      
      // If we have a conversationId, open that conversation
      if (conversationId) {
        await loadConversations();
        const conv = conversations.find(c => c.id === conversationId || c.ConversationID === conversationId);
        if (conv) {
          openConversation(conv);
        } else {
          // Try to open by ID directly
          openConversation({ id: conversationId, OtherPartyName: vendorName || 'Vendor' });
        }
      } else if (vendorProfileId) {
        // Load conversations and find one with this vendor
        await loadConversations();
        const existingConv = conversations.find(c => c.VendorProfileID === vendorProfileId);
        if (existingConv) {
          openConversation(existingConv);
        }
      }
    };
    
    const handleCloseWidget = () => {
      setIsOpen(false);
    };
    
    window.addEventListener('openMessagingWidget', handleOpenWidget);
    window.addEventListener('closeMessagingWidget', handleCloseWidget);
    return () => {
      window.removeEventListener('openMessagingWidget', handleOpenWidget);
      window.removeEventListener('closeMessagingWidget', handleCloseWidget);
    };
  }, [conversations, loadConversations, openConversation]);

  // Handle Enter key to send message
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Submit support ticket
  const submitSupportTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      showWarning('Please fill in all required fields');
      return;
    }
    
    setTicketSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/support/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id,
          userEmail: currentUser.email,
          userName: currentUser.name,
          subject: ticketForm.subject,
          description: ticketForm.description,
          category: ticketForm.category,
          priority: ticketForm.priority,
          source: 'chat'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTicketSuccess(data.ticketNumber);
        setTicketForm({ subject: '', description: '', category: 'general', priority: 'medium' });
        setTimeout(() => {
          setShowTicketForm(false);
          setTicketSuccess(null);
        }, 3000);
      } else {
        showError('Failed to submit ticket. Please try again.');
      }
    } catch (error) {
      console.error('Failed to submit ticket:', error);
      showError('Failed to submit ticket. Please try again.');
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Show widget for all users - non-signed-in users can still access Help/FAQs
  return (
    <div className={`messaging-widget ${isOpen ? 'widget-open' : ''}`} style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999
    }}>
      {/* Chat Button - Smaller with Custom Icon */}
      <div className="chat-button" onClick={toggleWidget} style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: '#5e72e4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(94, 114, 228, 0.3), 0 2px 6px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(94, 114, 228, 0.4), 0 3px 8px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(94, 114, 228, 0.3), 0 2px 6px rgba(0,0,0,0.1)';
      }}>
        {/* Support Icon using Font Awesome */}
        <i className="fas fa-headset" style={{ 
          fontSize: '24px', 
          color: 'white'
        }}></i>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: '#ff385c',
            color: 'white',
            borderRadius: '8px',
            minWidth: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '9px',
            fontWeight: '700',
            border: '1.5px solid white',
            padding: '0 3px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {/* Mobile: Full-screen page layout (not a popup - treated as a page like Forum) */}
      {isOpen && isMobile && (
        <div 
          className="messages-mobile-page"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            background: 'white',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Header 
            onSearch={() => {}} 
            onProfileClick={() => {}} 
            onWishlistClick={() => {}} 
            onChatClick={() => {}} 
            onNotificationsClick={() => {}} 
          />
          
          {/* Ticket Form Overlay - Shows when creating a support ticket */}
          {showTicketForm && (
            <div style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'white', 
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto'
            }}>
              {/* Header */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '16px', 
                borderBottom: '1px solid #e5e7eb',
                background: 'white'
              }}>
                <button 
                  onClick={() => { setShowTicketForm(false); setTicketSuccess(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', marginRight: '8px' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5M12 19L5 12L12 5" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Create Support Ticket</h3>
              </div>
              
              <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
                {ticketSuccess ? (
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1px solid #86efac',
                    borderRadius: '16px',
                    padding: '32px 24px',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      width: '64px', 
                      height: '64px', 
                      background: '#22c55e', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      margin: '0 auto 16px'
                    }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#166534', fontSize: '18px', fontWeight: 600 }}>Ticket Submitted Successfully!</h4>
                    <p style={{ margin: '0 0 16px 0', color: '#166534', fontSize: '14px' }}>
                      Your ticket number is: <strong style={{ fontFamily: 'monospace', background: '#bbf7d0', padding: '2px 8px', borderRadius: '4px' }}>{ticketSuccess}</strong>
                    </p>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                      We'll get back to you within 24-48 hours.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Category Selection - Dropdown */}
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#222' }}>
                        Category *
                      </label>
                      <select
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: 'white',
                          color: '#222',
                          cursor: 'pointer',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center'
                        }}
                      >
                        <option value="general">General Inquiry</option>
                        <option value="booking_issue">Booking Issue</option>
                        <option value="payment_refund">Payment & Refunds</option>
                        <option value="vendor_complaint">Vendor Complaint</option>
                        <option value="technical_bug">Technical Bug</option>
                        <option value="account_access">Account Access</option>
                        <option value="feature_request">Feature Request</option>
                        <option value="vendor_onboarding">Vendor Onboarding Help</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#222' }}>
                        Subject *
                      </label>
                      <input
                        type="text"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        placeholder="Brief description of your issue"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#222' }}>
                        Description *
                      </label>
                      <textarea
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                        placeholder="Please describe your issue in detail..."
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          resize: 'vertical',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Screenshot Upload - Using centralized ImageUpload component */}
                    <ImageUpload
                      label="Screenshots"
                      hint="optional"
                      files={ticketForm.attachments || []}
                      onUpload={(files) => setTicketForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), ...files] }))}
                      onRemove={(idx) => setTicketForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))}
                      multiple={true}
                      maxFiles={5}
                      maxSize={10}
                      showPreviews={true}
                    />

                    {/* Technical Issues Tip */}
                    {ticketForm.category === 'technical_bug' && (
                      <div style={{
                        background: '#fef3c7',
                        border: '1px solid #fcd34d',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        fontSize: '13px',
                        color: '#92400e'
                      }}>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>💡 Tip for technical issues:</strong>
                        Press <kbd style={{ background: '#fef9c3', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>F12</kbd> → Console tab and include any red error messages in your description. This helps us fix the issue faster!
                      </div>
                    )}
                    
                    <button
                      onClick={submitSupportTicket}
                      disabled={ticketSubmitting || !ticketForm.subject || !ticketForm.description}
                      style={{
                        background: (ticketSubmitting || !ticketForm.subject || !ticketForm.description) ? '#d1d5db' : 'var(--primary, #5e72e4)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '14px 24px',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: ticketSubmitting ? 'not-allowed' : 'pointer',
                        marginTop: '8px'
                      }}
                    >
                      {ticketSubmitting ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Navigation Bar - Shows back button when in category/article view */}
          {(selectedCategory || selectedFaq) && mainView === 'home' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'white',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <button
                onClick={handleHelpBack}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>Help</span>
              <div style={{ width: '36px' }}></div>
            </div>
          )}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* Home/Help Center View - Like Image 2 */}
          {mainView === 'home' && !selectedCategory && !selectedFaq && (
            <div style={{ flex: 1, overflow: 'auto', background: 'white', padding: '20px' }}>
              {/* Avatar Stack */}
              <div style={{ display: 'flex', marginBottom: '20px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#5e72e4', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 600, marginLeft: '0' }}>PB</div>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#10b981', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 600, marginLeft: '-12px' }}>S</div>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f59e0b', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 600, marginLeft: '-12px' }}>T</div>
              </div>

              {/* Greeting */}
              <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 600, color: '#111' }}>
                Hi {currentUser?.firstName || 'there'} 👋
              </h2>
              <p style={{ margin: '0 0 24px 0', fontSize: '24px', color: '#111', fontWeight: 600 }}>
                How can we help?
              </p>

              {/* Ask a Question Card */}
              <div 
                onClick={() => openSupportChat()}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  marginBottom: '12px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px', color: '#111', marginBottom: '2px' }}>Ask a question</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Our team can help</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="6" cy="6" r="2" fill="#5e72e4"/>
                    <circle cx="12" cy="6" r="2" fill="#5e72e4"/>
                    <circle cx="18" cy="6" r="2" fill="#5e72e4"/>
                    <circle cx="6" cy="12" r="2" fill="#5e72e4"/>
                    <circle cx="12" cy="12" r="2" fill="#5e72e4"/>
                    <circle cx="18" cy="12" r="2" fill="#5e72e4"/>
                  </svg>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#5e72e4' }}>
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Create Support Ticket */}
              <div 
                onClick={() => setShowTicketForm(true)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  marginBottom: '16px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px', color: '#111', marginBottom: '2px' }}>Create support ticket</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Submit a detailed request</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#5e72e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="#5e72e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 18V12" stroke="#5e72e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 15H15" stroke="#5e72e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#5e72e4' }}>
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Search for Help */}
              <div style={{ 
                position: 'relative', 
                marginBottom: '20px',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'white'
              }}>
                <input
                  type="text"
                  placeholder="Search for help"
                  value={helpSearchQuery}
                  onChange={(e) => setHelpSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && helpSearchQuery.length >= 2) {
                      const match = faqs.find(faq => 
                        faq.Question?.toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
                        faq.Answer?.toLowerCase().includes(helpSearchQuery.toLowerCase())
                      );
                      if (match) {
                        const cat = faqCategories.find(c => c.slug === match.Category || c.name === match.Category);
                        if (cat) setSelectedCategory(cat);
                        setSelectedFaq(match);
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 44px 14px 16px',
                    border: 'none',
                    fontSize: '16px',
                    outline: 'none',
                    background: 'white'
                  }}
                />
                <svg 
                  width="18" height="18" viewBox="0 0 24 24" fill="none" 
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#5e72e4' }}
                >
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>

              {/* Search Results */}
              {helpSearchQuery.length >= 2 && (
                <div style={{ marginBottom: '16px' }}>
                  {faqs.filter(faq => 
                    faq.Question?.toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
                    faq.Answer?.toLowerCase().includes(helpSearchQuery.toLowerCase())
                  ).slice(0, 5).map(faq => (
                    <div 
                      key={faq.FAQID}
                      onClick={() => {
                        const cat = faqCategories.find(c => c.slug === faq.Category || c.name === faq.Category);
                        if (cat) setSelectedCategory(cat);
                        setSelectedFaq(faq);
                        setHelpSearchQuery('');
                      }}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '14px 0', 
                        borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ color: '#111', fontSize: '15px' }}>{faq.Question}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginLeft: '12px', color: '#5e72e4' }}>
                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ))}
                </div>
              )}

              {/* Most Viewed Articles - sorted by ViewCount */}
              {helpSearchQuery.length < 2 && (
                <>
                  {[...faqs].sort((a, b) => (b.ViewCount || 0) - (a.ViewCount || 0)).slice(0, 4).map(faq => (
                    <div 
                      key={faq.FAQID}
                      onClick={() => {
                        const cat = faqCategories.find(c => c.slug === faq.Category || c.name === faq.Category);
                        if (cat) setSelectedCategory(cat);
                        setSelectedFaq(faq);
                      }}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '14px 0', 
                        borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ color: '#111', fontSize: '15px', lineHeight: '1.4' }}>{faq.Question}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginLeft: '12px', color: '#5e72e4' }}>
                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Category/Article View for Mobile */}
          {mainView === 'home' && (selectedCategory || selectedFaq) && (
            <div style={{ flex: 1, overflow: 'auto', background: 'white', padding: '20px' }}>
              {/* Article Detail View */}
              {selectedFaq ? (
                <div style={{ paddingBottom: '80px' }}>
                  {/* Article Title */}
                  <h2 style={{ 
                    fontSize: '22px', 
                    fontWeight: 700, 
                    color: '#111', 
                    marginBottom: '16px',
                    lineHeight: '1.3'
                  }}>
                    {selectedFaq.Question}
                  </h2>
                  
                  {/* Author/Updated info */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    marginBottom: '20px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <div style={{ 
                      width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        background: '#5e72e4', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#fff', 
                        fontSize: '12px', 
                        fontWeight: '600' 
                      }}>PB</div>
                      <div>
                        <div style={{ color: '#111', fontWeight: '500', fontSize: '14px' }}>Written by Planbeau Team</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          Updated {selectedFaq.UpdatedAt ? new Date(selectedFaq.UpdatedAt).toLocaleDateString() : 'recently'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Article Content */}
                    <div 
                      className="widget-article-content"
                      style={{ 
                        fontSize: '15px', 
                        lineHeight: '1.75', 
                        color: '#374151'
                      }}
                      dangerouslySetInnerHTML={{ __html: selectedFaq.Answer }}
                    />
                  </div>
                ) : selectedCategory ? (
                  /* Category Articles List - Like Image 2 */
                  <div style={{ paddingBottom: '80px' }}>
                    {/* Category Header with avatars */}
                    <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111' }}>{selectedCategory.name}</h3>
                          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
                            {categoryFaqs.length} articles
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#9ca3af' }}>
                            By Planbeau Team
                          </p>
                        </div>
                        {/* Avatar stack */}
                        <div style={{ display: 'flex', marginLeft: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#5e72e4', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 600 }}>PB</div>
                        </div>
                      </div>
                    </div>

                    {/* Articles List - Simple rows */}
                    {categoryFaqs.length > 0 ? categoryFaqs.map((faq) => (
                      <div 
                        key={faq.FAQID}
                        onClick={() => handleArticleClick(faq)}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '14px 0', 
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ color: '#111', fontSize: '15px', lineHeight: '1.4' }}>{faq.Question}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginLeft: '12px', color: '#5e72e4' }}>
                          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )) : (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                        No articles found in this category.
                      </div>
                    )}
                  </div>
                ) : null}
            </div>
          )}

          {/* Messages View - Support Only (Show intro only when not in chat) */}
          {mainView === 'messages' && view !== 'chat' && view !== 'guest-form' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', padding: '20px' }}>
              {/* Support Chat Header */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: '#5e72e4', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 16px',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 600
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#111' }}>Support Chat</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Chat with our support team</p>
              </div>

              {/* Step 1: Topic Selection */}
              {supportFormStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                      What can we help you with? *
                    </label>
                    <select
                      value={supportTopic.category}
                      onChange={(e) => setSupportTopic({ ...supportTopic, category: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Select a topic...</option>
                      {supportCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                      Subject *
                    </label>
                    <input
                      type="text"
                      placeholder="Brief description of your issue"
                      value={supportTopic.subject}
                      onChange={(e) => setSupportTopic({ ...supportTopic, subject: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                      Description *
                    </label>
                    <textarea
                      placeholder="Please describe your issue in detail..."
                      value={supportTopic.description}
                      onChange={(e) => setSupportTopic({ ...supportTopic, description: e.target.value })}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                        minHeight: '80px'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Name/Email for guests */}
              {supportFormStep === 2 && !currentUser?.id && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ 
                    padding: '10px 12px', 
                    background: '#f0f4ff', 
                    borderRadius: '8px', 
                    marginBottom: '4px',
                    fontSize: '13px',
                    color: '#5e72e4'
                  }}>
                    <strong>Topic:</strong> {supportCategories.find(c => c.value === supportTopic.category)?.label || supportTopic.category}
                    <br />
                    <strong>Subject:</strong> {supportTopic.subject}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                      Your Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6b7280' }}>
                      We'll email you when we respond
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {supportFormStep === 2 && (
                  <button
                    onClick={() => setSupportFormStep(1)}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    ← Back
                  </button>
                )}
                <button
                  onClick={() => {
                    if (supportFormStep === 1) {
                      // Validate step 1
                      if (supportTopic.category && supportTopic.subject.trim() && supportTopic.description.trim()) {
                        if (currentUser?.id) {
                          // Logged in user - go directly to chat
                          openSupportChat();
                        } else {
                          // Guest - go to step 2 for name/email
                          setSupportFormStep(2);
                        }
                      }
                    } else if (supportFormStep === 2) {
                      // Validate step 2 and start chat
                      if (guestName.trim() && guestEmail.trim() && guestEmail.includes('@')) {
                        startGuestChat();
                      }
                    }
                  }}
                  disabled={
                    (supportFormStep === 1 && (!supportTopic.category || !supportTopic.subject.trim() || !supportTopic.description.trim())) ||
                    (supportFormStep === 2 && (!guestName.trim() || !guestEmail.trim() || !guestEmail.includes('@')))
                  }
                  style={{
                    flex: supportFormStep === 2 ? 2 : 1,
                    padding: '14px',
                    background: (
                      (supportFormStep === 1 && (!supportTopic.category || !supportTopic.subject.trim() || !supportTopic.description.trim())) ||
                      (supportFormStep === 2 && (!guestName.trim() || !guestEmail.trim() || !guestEmail.includes('@')))
                    ) ? '#d1d5db' : '#5e72e4',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'white',
                    cursor: (
                      (supportFormStep === 1 && (!supportTopic.category || !supportTopic.subject.trim() || !supportTopic.description.trim())) ||
                      (supportFormStep === 2 && (!guestName.trim() || !guestEmail.trim() || !guestEmail.includes('@')))
                    ) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {supportFormStep === 1 ? (
                    currentUser?.id ? (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Start Chat
                      </>
                    ) : 'Continue →'
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Start Chat
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Hidden - Old conversations view for reference */}
          {false && mainView === 'messages-old' && view === 'conversations' && (
            <div className="widget-view">
              <div className="conversations-list">
                {loading ? (
                  <div className="loading-state">
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                  </div>
                ) : (
                  <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#666' }}>
                    <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>Support Only</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Guest Pre-Chat Form - Name & Email before starting chat */}
          {mainView === 'messages' && view === 'guest-form' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', padding: '24px' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 16px',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 700
                }}>
                  PB
                </div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600, color: '#111' }}>
                  Contact Planbeau Support
                </h2>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                  Please provide your details so we can assist you
                </p>
              </div>

              {/* Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                    Your Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#5e72e4'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#5e72e4'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#6b7280' }}>
                    We'll send you an email when we respond to your message
                  </p>
                </div>

                <button
                  onClick={startGuestChat}
                  disabled={!guestName.trim() || !guestEmail.trim() || !guestEmail.includes('@')}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: (guestName.trim() && guestEmail.trim() && guestEmail.includes('@')) 
                      ? 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)' 
                      : '#d1d5db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: (guestName.trim() && guestEmail.trim() && guestEmail.includes('@')) ? 'pointer' : 'not-allowed',
                    marginTop: '8px'
                  }}
                >
                  Start Chat
                </button>
              </div>

              {/* Info note */}
              <div style={{ 
                marginTop: '24px', 
                padding: '12px 14px', 
                background: '#f9fafb', 
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <i className="fas fa-info-circle" style={{ color: '#5e72e4', marginTop: '2px' }}></i>
                  <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
                    You'll receive a reference number after starting the chat. Save it to continue your conversation later.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat View */}
          {mainView === 'messages' && view === 'chat' && currentConversation && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Clean Chat Header */}
              <div className="chat-header" style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                background: 'white',
                gap: '12px'
              }}>
                <button className="back-button" onClick={backToConversations} style={{
                  background: 'none',
                  border: 'none',
                  color: '#374151',
                  cursor: 'pointer',
                  padding: '8px',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <i className="fas fa-arrow-left"></i>
                </button>
                {/* Avatar */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: (currentConversation.isSupport || currentConversation.ConversationType === 'support') 
                      ? 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)' 
                      : '#5e72e4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 700
                  }}>
                    {(currentConversation.isSupport || currentConversation.ConversationType === 'support') 
                      ? 'PB' 
                      : (currentConversation.OtherPartyName || 'U')[0].toUpperCase()}
                  </div>
                  {/* Online indicator */}
                  <span style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    border: '2px solid white'
                  }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '15px', color: '#111' }}>
                    {(currentConversation.isSupport || currentConversation.ConversationType === 'support') 
                      ? 'Planbeau Support' 
                      : (currentConversation.OtherPartyName || 'Unknown')}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {(currentConversation.isSupport || currentConversation.ConversationType === 'support') 
                      ? "You'll receive an email when we respond" 
                      : 'Online'}
                  </span>
                </div>
                {/* End Chat Button - for support chats */}
                {(currentConversation.isSupport || currentConversation.ConversationType === 'support' || currentConversation.isGuest) && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_BASE_URL}/messages/conversations/end-chat`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            conversationId: currentConversation.id || currentConversation.ConversationID,
                            recipientEmail: currentConversation.guestEmail || guestEmail || currentUser?.email,
                            recipientName: currentConversation.guestName || guestName || currentUser?.firstName,
                            referenceNumber: currentConversation.referenceNumber || guestReferenceNumber,
                            subject: supportTopic.subject || currentConversation.Subject || 'Support Request',
                            category: supportTopic.category || currentConversation.Category || 'General',
                            isGuest: currentConversation.isGuest || !currentUser?.id
                          })
                        });
                        if (response.ok) {
                          showSuccess('Chat ended. A summary has been sent to your email.');
                          backToConversations();
                        } else {
                          showError('Failed to end chat. Please try again.');
                        }
                      } catch (error) {
                        console.error('End chat error:', error);
                        showError('Failed to end chat. Please try again.');
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#dc2626',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <i className="fas fa-times-circle" style={{ fontSize: '11px' }}></i>
                    End Chat
                  </button>
                )}
              </div>
              
              {/* Reference Number Banner - show for guests */}
              {currentConversation?.isGuest && guestReferenceNumber && (
                <div style={{
                  padding: '10px 16px',
                  background: '#f0fdf4',
                  borderBottom: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <i className="fas fa-bookmark" style={{ color: '#22c55e', fontSize: '14px' }}></i>
                  <div style={{ flex: 1, fontSize: '13px', color: '#166534' }}>
                    <span style={{ fontWeight: 600 }}>Reference:</span> {guestReferenceNumber}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(guestReferenceNumber)}
                    style={{
                      padding: '4px 10px',
                      background: '#dcfce7',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#166534',
                      cursor: 'pointer'
                    }}
                  >
                    Copy
                  </button>
                </div>
              )}
              
              {/* Booking Info Banner */}
              {activeBookingInfo && (
                <div style={{
                  padding: '10px 16px',
                  background: '#f0f4ff',
                  borderBottom: '1px solid #e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <i className="fas fa-calendar-check" style={{ color: '#5e72e4', fontSize: '14px' }}></i>
                  <div style={{ flex: 1, fontSize: '13px' }}>
                    <span style={{ fontWeight: 600, color: '#374151' }}>
                      {activeBookingInfo.eventName || 'Booking'}
                    </span>
                    {activeBookingInfo.eventDate && (
                      <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                        {new Date(activeBookingInfo.eventDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    )}
                  </div>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 500,
                    background: activeBookingInfo.status === 'paid' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    color: activeBookingInfo.status === 'paid' ? '#10b981' : '#f59e0b',
                    border: `1px ${activeBookingInfo.status === 'paid' ? 'solid' : 'dashed'} ${activeBookingInfo.status === 'paid' ? '#10b981' : '#f59e0b'}`
                  }}>
                    {activeBookingInfo.status === 'paid' ? 'Paid' : activeBookingInfo.status === 'pending' ? 'Pending' : 'Confirmed'}
                  </span>
                </div>
              )}
              
              <div 
                ref={chatContainerRef}
                className="chat-messages-container" 
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '20px',
                  background: 'white',
                  position: 'relative'
                }}
                onScroll={(e) => {
                  const { scrollTop, scrollHeight, clientHeight } = e.target;
                  const atBottom = scrollHeight - scrollTop - clientHeight < 50;
                  setIsAtBottom(atBottom);
                  if (atBottom) {
                    setHasNewMessages(false);
                  }
                }}
              >
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages
                    // Hide first auto-reply message when widget is collapsed (not expanded)
                    .filter((msg, index) => {
                      if (!isWidgetExpanded && index === 0 && msg.SenderID !== currentUser?.id) {
                        // Skip first message if it's from support (auto-reply) and widget is collapsed
                        return false;
                      }
                      return true;
                    })
                    .map((msg, index) => {
                    // Determine if message is from current user - handle guests and support messages
                    const isSent = msg._isCurrentUser || (currentUser?.id && msg.SenderID === currentUser.id);
                    // Support/system messages are never "sent" by user - check SenderType from database
                    const isFromSupport = msg.isSupport || msg.SenderID === 'support' || msg.senderId === 'support' || 
                                          msg.SenderType === 'support' || msg.SenderID === null || msg.SenderID === 0;
                    // Guest messages are "sent" by the guest user
                    const isGuestMessage = msg.SenderType === 'guest';
                    const isSentFinal = (isSent || isGuestMessage) && !isFromSupport;
                    const isRead = msg.IsRead === true || msg.IsRead === 1;
                    // Only show read receipt on the last sent message
                    const isLastSentMessage = isSentFinal && !messages.slice(index + 1).some(m => m._isCurrentUser || (currentUser?.id && m.SenderID === currentUser.id));
                    // Check if this is a new day compared to previous message
                    const showDateDivider = index === 0 || (() => {
                      const prevDate = new Date(messages[index - 1]?.CreatedAt || messages[index - 1]?.SentAt);
                      const currDate = new Date(msg.CreatedAt || msg.SentAt);
                      return prevDate.toDateString() !== currDate.toDateString();
                    })();
                    return (
                      <React.Fragment key={msg.MessageID}>
                        {/* Date divider - matching dashboard style */}
                        {showDateDivider && (
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
                              {(() => {
                                const date = new Date(msg.CreatedAt || msg.SentAt);
                                const today = new Date();
                                const yesterday = new Date(today);
                                yesterday.setDate(yesterday.getDate() - 1);
                                if (date.toDateString() === today.toDateString()) return 'Today';
                                if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
                                return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
                              })()}
                            </span>
                            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
                          </div>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isSentFinal ? 'flex-end' : 'flex-start',
                            marginBottom: '16px'
                          }}
                        >
                          {/* Sender name for received messages (from support) */}
                          {!isSentFinal && (
                            <div style={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '6px',
                              marginLeft: '4px'
                            }}>
                              {/* Support avatar */}
                              <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: 700
                              }}>
                                PB
                              </div>
                              <span style={{ 
                                fontSize: '12px', 
                                fontWeight: 600, 
                                color: '#374151'
                              }}>
                                {(currentConversation?.isSupport || currentConversation?.ConversationType === 'support') 
                                  ? 'Planbeau' 
                                  : (currentConversation?.OtherPartyName || 'Support')}
                              </span>
                            </div>
                          )}
                          <div style={{
                            maxWidth: isWidgetExpanded ? '60%' : '75%',
                            padding: '12px 16px',
                            borderRadius: isSentFinal ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: isSentFinal ? '#5e72e4' : '#f3f4f6',
                            color: isSentFinal ? 'white' : '#1f2937',
                            wordWrap: 'break-word',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}>
                            <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{msg.Content || msg.content || msg.MessageText}</div>
                          </div>
                          {/* Timestamp below message */}
                          <div style={{ 
                            fontSize: '11px', 
                            marginTop: '4px',
                            color: '#9ca3af',
                            marginLeft: isSentFinal ? '0' : '4px',
                            marginRight: isSentFinal ? '4px' : '0'
                          }}>
                            {(() => {
                              const dateStr = msg.CreatedAt || msg.SentAt;
                              if (!dateStr) return '';
                              const date = new Date(dateStr);
                              if (isNaN(date.getTime())) return '';
                              return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            })()}
                            {/* Read receipt inline for sent messages */}
                            {isLastSentMessage && isRead && ' • Seen'}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                {/* Quick reply suggestions for support chat - show only when fresh chat with just welcome message */}
                {(currentConversation?.isSupport || currentConversation?.ConversationType === 'support') && 
                 messages.length === 1 && 
                 messages[0]?.SenderID !== currentUser?.id && (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px', 
                    marginBottom: '16px',
                    marginTop: '-8px'
                  }}>
                    {[
                      { text: 'How can I help?', icon: '💬' },
                      { text: 'I have a booking question', icon: '📅' },
                      { text: 'I need help with my account', icon: '👤' },
                      { text: 'Report an issue', icon: '🔧' }
                    ].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setMessageInput(suggestion.text);
                          // Focus the input
                          document.querySelector('.chat-input-field')?.focus();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: '#374151',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.borderColor = '#5e72e4';
                          e.target.style.background = '#f8f9ff';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.background = 'white';
                        }}
                      >
                        <span>{suggestion.icon}</span>
                        <span>{suggestion.text}</span>
                      </button>
                    ))}
                  </div>
                )}
                
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
                      background: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <div className="typing-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out', animationDelay: '0s' }}></div>
                      <div className="typing-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out', animationDelay: '0.2s' }}></div>
                      <div className="typing-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out', animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
                
                {/* New messages notification */}
                {hasNewMessages && !isAtBottom && (
                  <div 
                    onClick={() => {
                      scrollToBottom();
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
              </div>
              
              {/* CSS for typing animation */}
              <style>{`
                @keyframes typingBounce {
                  0%, 60%, 100% { transform: translateY(0); }
                  30% { transform: translateY(-4px); }
                }
              `}</style>
              
                            
              <div className="chat-input-container" style={{
                padding: '12px 16px',
                borderTop: '1px solid #e5e5e5',
                background: 'white',
                position: 'relative'
              }}>
                {/* Quick replies - only show when expanded */}
                {isWidgetExpanded && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '6px', 
                    flexWrap: 'wrap', 
                    marginBottom: '10px',
                    overflowX: 'hidden'
                  }}>
                    {quickReplies.map((reply, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickReply(reply)}
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
                )}

                {/* Emoji Picker - Custom matching dashboard */}
                {showEmojiPicker && (
                  <div 
                    ref={emojiPickerRef}
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '16px',
                      marginBottom: '8px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '10px',
                      boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      width: '300px',
                      maxWidth: 'calc(100vw - 48px)',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Emojis</span>
                      <button 
                        onClick={() => setShowEmojiPicker(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '14px', padding: '4px' }}
                      >
                        ✕
                      </button>
                    </div>
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
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '6px' }}>
                      {emojiCategories[emojiCategory]?.name}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px', maxHeight: '180px', overflowY: 'auto' }}>
                      {getFilteredEmojis().map((emoji, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setMessageInput(prev => prev + emoji); }}
                          style={{
                            padding: '4px',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '18px',
                            cursor: 'pointer',
                            borderRadius: '4px',
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

                {/* GIF Picker */}
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
                    zIndex: 1000,
                    width: '300px',
                    maxWidth: 'calc(100vw - 48px)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>GIFs</span>
                      <button 
                        onClick={() => setShowGifPicker(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '14px', padding: '4px' }}
                      >
                        ✕
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
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {gifsLoading ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#6b7280' }}>
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
                              height: '80px'
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
                          Search for GIFs
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
                    className="widget-chat-input"
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => { setMessageInput(e.target.value); if (handleTyping) handleTyping(); }}
                    onKeyPress={handleKeyPress}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '20px',
                      fontSize: '14px',
                      outline: 'none',
                      minWidth: 0
                    }}
                  />
                  <button 
                    className="widget-send-button" 
                    onClick={sendMessage}
                    disabled={!messageInput.trim()}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: messageInput.trim() ? '#5e72e4' : '#e5e7eb',
                      color: 'white',
                      cursor: messageInput.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'background 0.2s'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Help View */}
          {mainView === 'help' && (
            <div style={{ flex: 1, overflow: 'auto', background: 'white', padding: '20px' }}>
              {/* FAQ Detail View */}
              {selectedFaq ? (
                <div>
                  {/* Back button */}
                  <button 
                    onClick={() => setSelectedFaq(null)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      padding: '8px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#666',
                      marginBottom: '16px'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: '14px' }}>Back</span>
                  </button>
                  
                  {/* FAQ Title */}
                  <h2 style={{ 
                    fontSize: '20px', 
                    fontWeight: 600, 
                    color: '#222', 
                    marginBottom: '16px',
                    lineHeight: '1.4'
                  }}>
                    {selectedFaq.Question}
                  </h2>
                  
                  {/* Author/Updated info */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '20px',
                    color: '#666',
                    fontSize: '13px'
                  }}>
                    <span>Updated {selectedFaq.UpdatedAt ? new Date(selectedFaq.UpdatedAt).toLocaleDateString() : 'recently'}</span>
                  </div>
                  
                  {/* FAQ Answer */}
                  <div style={{ 
                    fontSize: '15px', 
                    lineHeight: '1.7', 
                    color: '#333',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedFaq.Answer}
                  </div>
                  
                  {/* Feedback Section */}
                  <div style={{ 
                    marginTop: '32px', 
                    paddingTop: '24px', 
                    borderTop: '1px solid #e0e0e0',
                    textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                      Did this answer your question?
                    </p>
                    {faqFeedbackSubmitted[selectedFaq.FAQID] ? (
                      <p style={{ color: '#28a745', fontSize: '14px' }}>Thank you for your feedback!</p>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                        <button 
                          onClick={() => submitFaqFeedback(selectedFaq.FAQID, 'not_helpful')}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            fontSize: '28px',
                            padding: '8px',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          title="Not helpful"
                        >
                          😞
                        </button>
                        <button 
                          onClick={() => submitFaqFeedback(selectedFaq.FAQID, 'neutral')}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            fontSize: '28px',
                            padding: '8px',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          title="Somewhat helpful"
                        >
                          😐
                        </button>
                        <button 
                          onClick={() => submitFaqFeedback(selectedFaq.FAQID, 'helpful')}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            fontSize: '28px',
                            padding: '8px',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          title="Very helpful"
                        >
                          🙂
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : !showTicketForm ? (
                <>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>Help Center</h3>
                  <p style={{ color: '#717171', fontSize: '14px', lineHeight: '1.5', marginBottom: '16px' }}>
                    Browse our help articles or contact support for assistance.
                  </p>
                  
                  {/* Connect with Support Team Button */}
                  <div 
                    onClick={() => openSupportChat()}
                    style={{
                      background: '#5e72e4',
                      color: 'white',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '20px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#4c60d3'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#5e72e4'}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>Connect with Support Team</div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>Get help from our team</div>
                    </div>
                  </div>
                  
                  {/* FAQ Section */}
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#222' }}>Frequently Asked Questions</h4>
                    {faqs.length > 0 ? faqs.map((faq) => (
                      <div 
                        key={faq.FAQID} 
                        onClick={() => setSelectedFaq(faq)}
                        style={{ 
                          borderBottom: '1px solid #f0f0f0',
                          padding: '12px 0',
                          fontSize: '14px',
                          color: '#222',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span>{faq.Question}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M9 18L15 12L9 6" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )) : (
                      <p style={{ color: '#999', fontSize: '13px' }}>Loading FAQs...</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Ticket Form */}
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <button 
                      onClick={() => { setShowTicketForm(false); setTicketSuccess(null); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', marginRight: '8px' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M19 12H5M12 19L5 12L12 5" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Create Support Ticket</h3>
                  </div>
                  
                  {ticketSuccess ? (
                    <div style={{
                      background: '#d4edda',
                      border: '1px solid #c3e6cb',
                      borderRadius: '8px',
                      padding: '20px',
                      textAlign: 'center'
                    }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px' }}>
                        <circle cx="12" cy="12" r="10" stroke="#28a745" strokeWidth="2"/>
                        <path d="M9 12L11 14L15 10" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <h4 style={{ margin: '0 0 8px 0', color: '#155724' }}>Ticket Submitted!</h4>
                      <p style={{ margin: 0, color: '#155724', fontSize: '14px' }}>
                        Your ticket number is: <strong>{ticketSuccess}</strong>
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#222' }}>
                          Subject *
                        </label>
                        <input
                          type="text"
                          value={ticketForm.subject}
                          onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                          placeholder="Brief description of your issue"
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#222' }}>
                          Category
                        </label>
                        <select
                          value={ticketForm.category}
                          onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            background: 'white'
                          }}
                        >
                          <option value="general">General Inquiry</option>
                          <option value="booking">Booking Issue</option>
                          <option value="payment">Payment Problem</option>
                          <option value="vendor">Vendor Related</option>
                          <option value="technical">Technical Issue</option>
                          <option value="account">Account Help</option>
                        </select>
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#222' }}>
                          Description *
                        </label>
                        <textarea
                          value={ticketForm.description}
                          onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                          placeholder="Please describe your issue in detail..."
                          rows={4}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            resize: 'vertical'
                          }}
                        />
                      </div>

                      {/* Attachments */}
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#222' }}>
                          Attachments (optional)
                        </label>
                        <input
                          type="file"
                          ref={fileInputRef}
                          multiple
                          accept="image/*,.pdf,.txt,.log"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setTicketForm({ ...ticketForm, attachments: [...ticketForm.attachments, ...files] });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px dashed #e0e0e0',
                            borderRadius: '8px',
                            background: '#f9f9f9',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#666',
                            fontSize: '14px'
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M21.44 11.05L12.25 20.24C11.1242 21.3658 9.59718 21.9983 8.005 21.9983C6.41282 21.9983 4.88584 21.3658 3.76 20.24C2.63416 19.1142 2.00166 17.5872 2.00166 15.995C2.00166 14.4028 2.63416 12.8758 3.76 11.75L12.33 3.18C13.0806 2.42975 14.0991 2.00129 15.1608 2.00129C16.2226 2.00129 17.241 2.42975 17.9917 3.18C18.7419 3.93063 19.1704 4.94905 19.1704 6.01083C19.1704 7.07261 18.7419 8.09103 17.9917 8.84167L9.41 17.42C9.03472 17.7953 8.52551 18.0048 7.995 18.0048C7.46449 18.0048 6.95528 17.7953 6.58 17.42C6.20472 17.0447 5.99529 16.5355 5.99529 16.005C5.99529 15.4745 6.20472 14.9653 6.58 14.59L15.07 6.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Add Screenshots or Files
                        </button>
                        {ticketForm.attachments.length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {ticketForm.attachments.map((file, idx) => (
                              <div key={idx} style={{ 
                                display: 'flex', alignItems: 'center', gap: '6px', 
                                background: '#e7f1ff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' 
                              }}>
                                <span>{file.name}</span>
                                <button 
                                  onClick={() => setTicketForm({ 
                                    ...ticketForm, 
                                    attachments: ticketForm.attachments.filter((_, i) => i !== idx) 
                                  })}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f5365c', padding: '2px' }}
                                >×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Helpful Tips */}
                      <div style={{ 
                        background: '#fff8e6', 
                        border: '1px solid #ffeeba', 
                        borderRadius: '8px', 
                        padding: '12px', 
                        fontSize: '13px',
                        color: '#856404'
                      }}>
                        <strong style={{ display: 'block', marginBottom: '6px' }}>💡 Tips for faster resolution:</strong>
                        <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.6' }}>
                          <li>Include a screenshot of the issue</li>
                          <li>If you see an error, copy it from the browser console (F12 → Console tab)</li>
                          <li>Mention the page/feature where the issue occurred</li>
                        </ul>
                      </div>
                      
                      <button
                        onClick={submitSupportTicket}
                        disabled={ticketSubmitting}
                        style={{
                          background: ticketSubmitting ? '#ccc' : '#5e72e4',
                          color: 'white',
                          border: 'none',
                          padding: '14px',
                          borderRadius: '8px',
                          fontSize: '15px',
                          fontWeight: 600,
                          cursor: ticketSubmitting ? 'not-allowed' : 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        {ticketSubmitting ? 'Submitting...' : 'Submit Ticket'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Bottom Navigation - hide on mobile since we use the app's bottom nav */}
          {!isMobile && (
            <div style={{
              display: 'flex',
              borderTop: '1px solid #e0e0e0',
              background: 'white',
              padding: '8px 0'
            }}>
              <button
                onClick={() => switchMainView('home')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  color: mainView === 'home' ? '#5e72e4' : '#717171',
                  transition: 'color 0.2s'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: '12px', fontWeight: mainView === 'home' ? 600 : 400 }}>Home</span>
              </button>
              <button
                onClick={() => switchMainView('messages')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  color: mainView === 'messages' ? '#5e72e4' : '#717171',
                  transition: 'color 0.2s',
                  position: 'relative'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: '12px', fontWeight: mainView === 'messages' ? 600 : 400 }}>Messages</span>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '50%',
                    transform: 'translateX(12px)',
                    background: '#ff385c',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: 600,
                    minWidth: '18px',
                    textAlign: 'center'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => switchMainView('help')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  color: mainView === 'help' ? '#5e72e4' : '#717171',
                  transition: 'color 0.2s'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="17" r="1" fill="currentColor"/>
                </svg>
                <span style={{ fontSize: '12px', fontWeight: mainView === 'help' ? 600 : 400 }}>Help</span>
              </button>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Desktop: Widget popup container */}
      {isOpen && !isMobile && (
        <div className="widget-container" style={{ 
          display: 'flex',
          flexDirection: 'column',
          width: isWidgetExpanded ? '700px' : '380px',
          height: isWidgetExpanded ? '85vh' : '600px',
          maxHeight: isWidgetExpanded ? '800px' : '600px',
          borderRadius: '16px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          background: 'white',
          position: 'absolute',
          bottom: '80px',
          right: '0',
          border: '1px solid rgba(0,0,0,0.1)',
          transition: 'width 0.3s ease, height 0.3s ease, max-height 0.3s ease'
        }}>
          {/* Desktop Ticket Form Overlay */}
          {showTicketForm && (
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'white', 
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '16px', 
                borderBottom: '1px solid #e5e7eb',
                background: 'white'
              }}>
                <button 
                  onClick={() => { setShowTicketForm(false); setTicketSuccess(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', marginRight: '8px' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5M12 19L5 12L12 5" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Create Support Ticket</h3>
              </div>
              
              <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
                {ticketSuccess ? (
                  <div style={{
                    background: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center'
                  }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px' }}>
                      <circle cx="12" cy="12" r="10" stroke="#28a745" strokeWidth="2"/>
                      <path d="M9 12L11 14L15 10" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h4 style={{ margin: '0 0 8px 0', color: '#155724' }}>Ticket Submitted!</h4>
                    <p style={{ margin: 0, color: '#155724', fontSize: '14px' }}>
                      Your ticket number is: <strong>{ticketSuccess}</strong>
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Category Selection - Dropdown */}
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#222' }}>
                        Category *
                      </label>
                      <select
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: 'white',
                          color: '#222',
                          cursor: 'pointer',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center'
                        }}
                      >
                        <option value="general">General Inquiry</option>
                        <option value="booking_issue">Booking Issue</option>
                        <option value="payment_refund">Payment & Refunds</option>
                        <option value="vendor_complaint">Vendor Complaint</option>
                        <option value="technical_bug">Technical Bug</option>
                        <option value="account_access">Account Access</option>
                        <option value="feature_request">Feature Request</option>
                        <option value="vendor_onboarding">Vendor Onboarding Help</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#222' }}>
                        Subject *
                      </label>
                      <input
                        type="text"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        placeholder="Brief description of your issue"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Console Error Help - Above description, app theme colors */}
                    <div style={{
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '13px',
                      color: '#374151'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <i className="fas fa-lightbulb" style={{ color: '#6b7280', marginTop: '2px' }}></i>
                        <div>
                          <div style={{ fontWeight: 500, marginBottom: '4px', color: '#222' }}>Having technical issues?</div>
                          <div style={{ lineHeight: '1.5', color: '#6b7280' }}>
                            Press <kbd style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', border: '1px solid #d1d5db' }}>F12</kbd> → 
                            <strong> Console</strong> tab → Copy any red error messages and paste them in your description.
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#222' }}>
                        Description *
                      </label>
                      <textarea
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                        placeholder="Please describe your issue in detail..."
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          resize: 'vertical',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Screenshot Upload - Using centralized ImageUpload component */}
                    <ImageUpload
                      label="Screenshots"
                      hint="optional"
                      files={ticketForm.attachments || []}
                      onUpload={(files) => setTicketForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), ...files] }))}
                      onRemove={(idx) => setTicketForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))}
                      multiple={true}
                      maxFiles={5}
                      maxSize={10}
                      showPreviews={true}
                      compact={true}
                    />

                    <button
                      onClick={submitTicket}
                      disabled={ticketSubmitting || !ticketForm.subject || !ticketForm.description}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: ticketSubmitting || !ticketForm.subject || !ticketForm.description ? '#d1d5db' : 'var(--primary, #5e72e4)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: ticketSubmitting || !ticketForm.subject || !ticketForm.description ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {ticketSubmitting ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Header like Image 1 - back button left, expand/collapse and X right */}
          <header style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'white',
            borderBottom: selectedFaq ? 'none' : '1px solid #e5e7eb',
            minHeight: '48px'
          }}>
            {/* Left side - Back button (only when navigating) */}
            <div style={{ width: '40px' }}>
              {(selectedCategory || selectedFaq || mainView === 'help' || mainView === 'messages') && (
                <button 
                  onClick={() => {
                    if (selectedFaq) {
                      handleHelpBack();
                    } else if (selectedCategory) {
                      handleHelpBack();
                    } else {
                      switchMainView('home');
                      setSelectedCategory(null);
                      setSelectedFaq(null);
                    }
                  }}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#111'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
            
            {/* Right side - Expand/Collapse and Close buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Expand/Collapse button - always visible */}
              <button 
                  onClick={() => setIsWidgetExpanded(!isWidgetExpanded)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#111'
                  }}
                  title={isWidgetExpanded ? 'Collapse' : 'Expand'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M15 3H21V9M9 21H3V15M21 3L14 10M3 21L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              {/* Close button - styled X */}
              <button 
                onClick={toggleWidget}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#111'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </header>

          {/* Desktop content - same views as mobile */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Home/Help Center View - Like Image 2 */}
            {mainView === 'home' && !selectedCategory && !selectedFaq && (
              <div style={{ flex: 1, overflow: 'auto', background: 'white', padding: '20px' }}>
                {/* Avatar Stack */}
                <div style={{ display: 'flex', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#5e72e4', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 600, marginLeft: '0' }}>PB</div>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#10b981', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 600, marginLeft: '-12px' }}>S</div>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f59e0b', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 600, marginLeft: '-12px' }}>T</div>
                </div>

                {/* Greeting */}
                <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 600, color: '#111' }}>
                  Hi {currentUser?.firstName || 'there'} 👋
                </h2>
                <p style={{ margin: '0 0 24px 0', fontSize: '22px', color: '#111', fontWeight: 600 }}>
                  How can we help?
                </p>

                {/* Ask a Question Card */}
                <div 
                  onClick={() => openSupportChat()}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    marginBottom: '16px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#111', marginBottom: '2px' }}>Ask a question</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>Our team can help</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="6" cy="6" r="2" fill="#5e72e4"/>
                      <circle cx="12" cy="6" r="2" fill="#5e72e4"/>
                      <circle cx="18" cy="6" r="2" fill="#5e72e4"/>
                      <circle cx="6" cy="12" r="2" fill="#5e72e4"/>
                      <circle cx="12" cy="12" r="2" fill="#5e72e4"/>
                      <circle cx="18" cy="12" r="2" fill="#5e72e4"/>
                    </svg>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#5e72e4' }}>
                      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {/* Create Support Ticket */}
                <div 
                  onClick={() => setShowTicketForm(true)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    marginBottom: '16px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#111', marginBottom: '2px' }}>Create support ticket</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>Submit a detailed request</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#5e72e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2V8H20" stroke="#5e72e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 18V12" stroke="#5e72e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 15H15" stroke="#5e72e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#5e72e4' }}>
                      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {/* Search for Help */}
                <div style={{ 
                  position: 'relative', 
                  marginBottom: '20px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: 'white'
                }}>
                  <input
                    type="text"
                    placeholder="Search for help"
                    value={helpSearchQuery}
                    onChange={(e) => setHelpSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && helpSearchQuery.length >= 2) {
                        // Find first matching FAQ and show it
                        const match = faqs.find(faq => 
                          faq.Question?.toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
                          faq.Answer?.toLowerCase().includes(helpSearchQuery.toLowerCase())
                        );
                        if (match) {
                          const cat = faqCategories.find(c => c.slug === match.Category || c.name === match.Category);
                          if (cat) setSelectedCategory(cat);
                          setSelectedFaq(match);
                        }
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 44px 14px 16px',
                      border: 'none',
                      fontSize: '15px',
                      outline: 'none',
                      background: 'white'
                    }}
                  />
                  <svg 
                    width="18" height="18" viewBox="0 0 24 24" fill="none" 
                    style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#5e72e4' }}
                  >
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>

                {/* Search Results */}
                {helpSearchQuery.length >= 2 && (
                  <div style={{ marginBottom: '16px' }}>
                    {faqs.filter(faq => 
                      faq.Question?.toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
                      faq.Answer?.toLowerCase().includes(helpSearchQuery.toLowerCase())
                    ).slice(0, 5).map(faq => (
                      <div 
                        key={faq.FAQID}
                        onClick={() => {
                          const cat = faqCategories.find(c => c.slug === faq.Category || c.name === faq.Category);
                          if (cat) setSelectedCategory(cat);
                          setSelectedFaq(faq);
                          setHelpSearchQuery('');
                        }}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '12px 0', 
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ color: '#111', fontSize: '14px' }}>{faq.Question}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginLeft: '12px', color: '#5e72e4' }}>
                          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                )}

                {/* Most Viewed Articles - sorted by ViewCount */}
                {helpSearchQuery.length < 2 && (
                  <>
                    {[...faqs].sort((a, b) => (b.ViewCount || 0) - (a.ViewCount || 0)).slice(0, 4).map(faq => (
                      <div 
                        key={faq.FAQID}
                        onClick={() => {
                          const cat = faqCategories.find(c => c.slug === faq.Category || c.name === faq.Category);
                          if (cat) setSelectedCategory(cat);
                          setSelectedFaq(faq);
                        }}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '14px 0', 
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ color: '#111', fontSize: '14px', lineHeight: '1.4' }}>{faq.Question}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginLeft: '12px', color: '#5e72e4' }}>
                          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Category/Article View */}
            {mainView === 'home' && (selectedCategory || selectedFaq) && (
              <div style={{ flex: 1, overflow: 'auto', background: 'white', padding: '20px' }}>

                  {/* Article Detail View */}
                  {selectedFaq ? (
                    <div style={{ paddingBottom: '60px' }}>
                      {/* Article Title */}
                      <h2 style={{ 
                        fontSize: isWidgetExpanded ? '24px' : '18px', 
                        fontWeight: 700, 
                        color: '#111', 
                        marginBottom: '16px',
                        lineHeight: '1.3'
                      }}>
                        {selectedFaq.Question}
                      </h2>
                      
                      {/* Author/Updated info */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        marginBottom: '20px',
                        paddingBottom: '16px',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '50%', 
                          background: '#5e72e4', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: '#fff', 
                          fontSize: '12px', 
                          fontWeight: '600' 
                        }}>PB</div>
                        <div>
                          <div style={{ color: '#111', fontWeight: '500', fontSize: '14px' }}>Written by Planbeau Team</div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>
                            Updated {selectedFaq.UpdatedAt ? new Date(selectedFaq.UpdatedAt).toLocaleDateString() : 'recently'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Article Content */}
                      <div 
                        className="widget-article-content"
                        style={{ 
                          fontSize: isWidgetExpanded ? '15px' : '14px', 
                          lineHeight: '1.75', 
                          color: '#374151'
                        }}
                        dangerouslySetInnerHTML={{ __html: selectedFaq.Answer }}
                      />
                    </div>
                  ) : selectedCategory ? (
                    /* Category Articles List - Like Image 2 */
                    <div style={{ paddingBottom: '60px' }}>
                      {/* Category Header with avatars */}
                      <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111' }}>{selectedCategory.name}</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                              {categoryFaqs.length} articles
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>
                              By Planbeau Team
                            </p>
                          </div>
                          {/* Avatar stack */}
                          <div style={{ display: 'flex', marginLeft: '12px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#5e72e4', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 600 }}>PB</div>
                          </div>
                        </div>
                      </div>

                      {/* Articles List - Simple rows */}
                      {categoryFaqs.length > 0 ? categoryFaqs.map((faq) => (
                        <div 
                          key={faq.FAQID}
                          onClick={() => handleArticleClick(faq)}
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '14px 0', 
                            borderBottom: '1px solid #f0f0f0',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ color: '#111', fontSize: '14px', lineHeight: '1.4' }}>{faq.Question}</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginLeft: '12px', color: '#5e72e4' }}>
                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )) : (
                        <div style={{ padding: '20px 0', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                          No articles found in this category.
                        </div>
                      )}
                    </div>
                  ) : null}
              </div>
            )}

            {/* Messages View - Support Only (Desktop) */}
            {mainView === 'messages' && view === 'conversations' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', padding: '20px' }}>
                {/* Support Chat Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '50%', 
                    background: '#5e72e4', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 16px',
                    color: 'white'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#111' }}>Support Chat</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Chat with our support team</p>
                </div>

                {/* Step 1: Topic Selection (Desktop) */}
                {supportFormStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                        What can we help you with? *
                      </label>
                      <select
                        value={supportTopic.category}
                        onChange={(e) => setSupportTopic({ ...supportTopic, category: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">Select a topic...</option>
                        {supportCategories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                        Subject *
                      </label>
                      <input
                        type="text"
                        placeholder="Brief description of your issue"
                        value={supportTopic.subject}
                        onChange={(e) => setSupportTopic({ ...supportTopic, subject: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                        Description *
                      </label>
                      <textarea
                        placeholder="Please describe your issue in detail..."
                        value={supportTopic.description}
                        onChange={(e) => setSupportTopic({ ...supportTopic, description: e.target.value })}
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          resize: 'vertical',
                          minHeight: '80px'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Name/Email for guests (Desktop) */}
                {supportFormStep === 2 && !currentUser?.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ 
                      padding: '10px 12px', 
                      background: '#f0f4ff', 
                      borderRadius: '8px', 
                      marginBottom: '4px',
                      fontSize: '13px',
                      color: '#5e72e4'
                    }}>
                      <strong>Topic:</strong> {supportCategories.find(c => c.value === supportTopic.category)?.label || supportTopic.category}
                      <br />
                      <strong>Subject:</strong> {supportTopic.subject}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                        Your Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your full name"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                        Email Address *
                      </label>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6b7280' }}>
                        We'll email you when we respond
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons (Desktop) */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  {supportFormStep === 2 && (
                    <button
                      onClick={() => setSupportFormStep(1)}
                      style={{
                        flex: 1,
                        padding: '14px',
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#374151',
                        cursor: 'pointer'
                      }}
                    >
                      ← Back
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (supportFormStep === 1) {
                        if (supportTopic.category && supportTopic.subject.trim() && supportTopic.description.trim()) {
                          if (currentUser?.id) {
                            openSupportChat();
                          } else {
                            setSupportFormStep(2);
                          }
                        }
                      } else if (supportFormStep === 2) {
                        if (guestName.trim() && guestEmail.trim() && guestEmail.includes('@')) {
                          startGuestChat();
                        }
                      }
                    }}
                    disabled={
                      (supportFormStep === 1 && (!supportTopic.category || !supportTopic.subject.trim() || !supportTopic.description.trim())) ||
                      (supportFormStep === 2 && (!guestName.trim() || !guestEmail.trim() || !guestEmail.includes('@')))
                    }
                    style={{
                      flex: supportFormStep === 2 ? 2 : 1,
                      padding: '14px',
                      background: (
                        (supportFormStep === 1 && (!supportTopic.category || !supportTopic.subject.trim() || !supportTopic.description.trim())) ||
                        (supportFormStep === 2 && (!guestName.trim() || !guestEmail.trim() || !guestEmail.includes('@')))
                      ) ? '#d1d5db' : '#5e72e4',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'white',
                      cursor: (
                        (supportFormStep === 1 && (!supportTopic.category || !supportTopic.subject.trim() || !supportTopic.description.trim())) ||
                        (supportFormStep === 2 && (!guestName.trim() || !guestEmail.trim() || !guestEmail.includes('@')))
                      ) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {supportFormStep === 1 ? (
                      currentUser?.id ? (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Start Chat
                        </>
                      ) : 'Continue →'
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Start Chat
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Chat View */}
            {mainView === 'messages' && view === 'chat' && currentConversation && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                {/* Clean Support Chat Header */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'white',
                  gap: '12px'
                }}>
                  {/* Avatar */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: (currentConversation.isSupport || currentConversation.ConversationType === 'support') 
                        ? 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)' 
                        : '#5e72e4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 700
                    }}>
                      {(currentConversation.isSupport || currentConversation.ConversationType === 'support') 
                        ? 'PB' 
                        : (currentConversation.OtherPartyName || 'U')[0].toUpperCase()}
                    </div>
                    {/* Online indicator */}
                    <span style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                      border: '2px solid white'
                    }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '15px', color: '#111' }}>
                      {(currentConversation.isSupport || currentConversation.ConversationType === 'support') 
                        ? 'Planbeau Support' 
                        : (currentConversation.OtherPartyName || 'Unknown')}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {(currentConversation.isSupport || currentConversation.ConversationType === 'support') 
                        ? "You'll receive an email when we respond" 
                        : 'Online'}
                    </span>
                  </div>
                  {/* End Chat Button - Desktop */}
                  {(currentConversation.isSupport || currentConversation.ConversationType === 'support' || currentConversation.isGuest) && (
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(`${API_BASE_URL}/messages/conversations/end-chat`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              conversationId: currentConversation.id || currentConversation.ConversationID,
                              recipientEmail: currentConversation.guestEmail || guestEmail || currentUser?.email,
                              recipientName: currentConversation.guestName || guestName || currentUser?.firstName,
                              referenceNumber: currentConversation.referenceNumber || guestReferenceNumber,
                              subject: supportTopic.subject || currentConversation.Subject || 'Support Request',
                              category: supportTopic.category || currentConversation.Category || 'General',
                              isGuest: currentConversation.isGuest || !currentUser?.id
                            })
                          });
                          if (response.ok) {
                            showSuccess('Chat ended. A summary has been sent to your email.');
                            setView('conversations');
                            setCurrentConversation(null);
                          } else {
                            showError('Failed to end chat. Please try again.');
                          }
                        } catch (error) {
                          console.error('End chat error:', error);
                          showError('Failed to end chat. Please try again.');
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#dc2626',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <i className="fas fa-times-circle" style={{ fontSize: '11px' }}></i>
                      End Chat
                    </button>
                  )}
                </div>
                
                {/* Reference Number Banner - show for guests */}
                {currentConversation?.isGuest && guestReferenceNumber && (
                  <div style={{
                    padding: '10px 16px',
                    background: '#f0fdf4',
                    borderBottom: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <i className="fas fa-bookmark" style={{ color: '#22c55e', fontSize: '14px' }}></i>
                    <div style={{ flex: 1, fontSize: '13px', color: '#166534' }}>
                      <span style={{ fontWeight: 600 }}>Reference:</span> {guestReferenceNumber}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(guestReferenceNumber);
                      }}
                      style={{
                        padding: '4px 10px',
                        background: '#dcfce7',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#166534',
                        cursor: 'pointer'
                      }}
                    >
                      Copy
                    </button>
                  </div>
                )}
                
                {/* Messages container - EXACT SAME AS DASHBOARD */}
                <div 
                  ref={chatContainerRef}
                  onScroll={(e) => {
                    const { scrollTop, scrollHeight, clientHeight } = e.target;
                    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
                    setIsAtBottom(atBottom);
                    if (atBottom) setHasNewMessages(false);
                  }}
                  style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', backgroundColor: '#fafafa', position: 'relative' }}
                >
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner"></div></div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                      <p style={{ margin: 0 }}>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, index, allMsgs) => {
                        // Determine if message is from current user - handle guests and support messages
                        const isSentByUser = msg._isCurrentUser || (currentUser?.id && msg.SenderID === currentUser.id);
                        // Support/system messages are never "sent" by user
                        const isFromSupport = msg.isSupport || msg.SenderID === 'support' || msg.senderId === 'support' || 
                                              msg.SenderType === 'support' || msg.SenderID === null || msg.SenderID === 0;
                        const isGuestMessage = msg.SenderType === 'guest';
                        const isSent = (isSentByUser || isGuestMessage) && !isFromSupport;
                        const isGif = msg.Content && (msg.Content.includes('giphy.com') || msg.Content.match(/\.(gif)$/i));
                        const currentDate = msg.CreatedAt ? new Date(msg.CreatedAt).toDateString() : '';
                        const prevMessage = index > 0 ? allMsgs[index - 1] : null;
                        const prevDate = prevMessage?.CreatedAt ? new Date(prevMessage.CreatedAt).toDateString() : '';
                        const showDayDivider = currentDate && currentDate !== prevDate;
                        
                        const formatDayDivider = (dateStr) => {
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
                        
                        return (
                          <React.Fragment key={msg.MessageID || msg.id || index}>
                            {showDayDivider && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px 0', gap: '12px' }}>
                                <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
                                <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500, padding: '4px 12px', backgroundColor: '#f3f4f6', borderRadius: '12px' }}>
                                  {formatDayDivider(msg.CreatedAt)}
                                </span>
                                <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
                              </div>
                            )}
                            <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', alignItems: isSent ? 'flex-end' : 'flex-start' }}>
                              {/* Show avatar and name for support messages */}
                              {!isSent && (currentConversation?.isSupport || currentConversation?.ConversationType === 'support') && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '10px',
                                    fontWeight: 700
                                  }}>
                                    PB
                                  </div>
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Planbeau</span>
                                </div>
                              )}
                              <div style={{
                                padding: isGif ? '4px' : '10px 14px',
                                borderRadius: isSent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                backgroundColor: isGif ? 'transparent' : (isSent ? '#5e72e4' : '#f0f0f0'),
                                color: isSent ? 'white' : '#1a1a1a',
                                maxWidth: '70%',
                                boxShadow: isGif ? 'none' : '0 1px 2px rgba(0,0,0,0.08)'
                              }}>
                                {isGif ? (
                                  <img src={msg.Content || msg.content} alt="GIF" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '12px', display: 'block' }} />
                                ) : (
                                  <div style={{ wordBreak: 'break-word', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{msg.Content || msg.content}</div>
                                )}
                              </div>
                              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
                                {msg.CreatedAt ? new Date(msg.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                      
                      {otherUserTyping && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out', animationDelay: '0s' }}></div>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out', animationDelay: '0.2s' }}></div>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af', animation: 'typingBounce 1.4s infinite ease-in-out', animationDelay: '0.4s' }}></div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                      
                      {hasNewMessages && !isAtBottom && (
                        <div onClick={() => { scrollToBottom(); setHasNewMessages(false); setIsAtBottom(true); }}
                          style={{ position: 'sticky', bottom: '10px', left: '50%', transform: 'translateX(-50%)', background: '#5e72e4', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 10, width: 'fit-content', margin: '0 auto' }}>
                          <i className="fas fa-arrow-down" style={{ fontSize: '11px' }}></i>
                          New messages
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <style>{`@keyframes typingBounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }`}</style>
                
                {/* Message input - EXACT SAME AS DASHBOARD */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e5e5', backgroundColor: 'white', position: 'relative' }}>
                  {/* Quick replies - only show when widget is expanded */}
                  {isWidgetExpanded && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {quickReplies.map((reply, idx) => (
                        <button key={idx} onClick={() => handleQuickReply(reply)}
                          style={{ padding: '5px 10px', borderRadius: '14px', border: '1px solid #e5e7eb', background: 'white', fontSize: '12px', color: '#374151', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                        >{reply}</button>
                      ))}
                    </div>
                  )}
                  
                  {/* Emoji picker - EXACT SAME AS DASHBOARD */}
                  {showEmojiPicker && (
                    <div style={{ position: 'absolute', bottom: '100%', left: '16px', marginBottom: '8px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '10px', boxShadow: '0 -4px 12px rgba(0,0,0,0.15)', zIndex: 100, width: '300px', maxWidth: 'calc(100vw - 48px)', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Emojis</span>
                        <button onClick={() => setShowEmojiPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '14px', padding: '4px' }}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '2px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {Object.entries(emojiCategories).map(([key, cat]) => (
                          <button key={key} onClick={() => setEmojiCategory(key)}
                            style={{ padding: '4px 6px', border: 'none', background: emojiCategory === key ? '#e5e7eb' : 'transparent', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
                            title={cat.name}>{cat.icon}</button>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px', maxHeight: '180px', overflowY: 'auto' }}>
                        {getFilteredEmojis().map((emoji, idx) => (
                          <button key={idx} onClick={() => { setMessageInput(prev => prev + emoji); }}
                            style={{ padding: '4px', border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', borderRadius: '4px', transition: 'background 0.15s', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >{emoji}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* GIF picker - EXACT SAME AS DASHBOARD */}
                  {showGifPicker && (
                    <div style={{ position: 'absolute', bottom: '100%', left: '16px', marginBottom: '8px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', boxShadow: '0 -4px 12px rgba(0,0,0,0.15)', zIndex: 100, width: '340px', maxWidth: 'calc(100vw - 48px)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>GIFs</span>
                        <button onClick={() => setShowGifPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '14px', padding: '4px' }}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                        <input type="text" placeholder="Search GIFs..." value={gifSearchQuery} onChange={(e) => setGifSearchQuery(e.target.value)}
                          onKeyPress={(e) => { if (e.key === 'Enter') fetchGifs(gifSearchQuery); }}
                          style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                        <button onClick={() => fetchGifs(gifSearchQuery)} style={{ padding: '8px 12px', background: '#5e72e4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Search</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                        {gifsLoading ? (
                          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                            <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>Loading GIFs...
                          </div>
                        ) : gifs.length > 0 ? (
                          gifs.map((gif) => (
                            <button key={gif.id} onClick={() => handleSendGif(gif.url)}
                              style={{ padding: 0, border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb', cursor: 'pointer', overflow: 'hidden', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img src={gif.url} alt={gif.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                            </button>
                          ))
                        ) : (
                          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#6b7280' }}>No GIFs match your search</div>
                        )}
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>Powered by GIPHY</div>
                    </div>
                  )}
                  
                  {/* Input row - EXACT SAME AS DASHBOARD */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #e5e7eb', backgroundColor: showEmojiPicker ? '#f3f4f6' : 'white', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}
                      title="Emojis">😊</button>
                    <button onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #e5e7eb', backgroundColor: showGifPicker ? '#f3f4f6' : 'white', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}
                      title="GIFs">GIF</button>
                    <input type="text" placeholder="Type your message..." value={messageInput}
                      onChange={(e) => { setMessageInput(e.target.value); handleTyping(); }}
                      onKeyPress={(e) => { if (e.key === 'Enter') sendMessage(); }}
                      style={{ flex: 1, padding: '10px 14px', border: '1px solid #e5e5e5', borderRadius: '20px', outline: 'none', fontSize: '14px', minWidth: 0 }} />
                    <button onClick={sendMessage} disabled={!messageInput.trim()}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: messageInput.trim() ? '#5e72e4' : '#ddd', color: 'white', cursor: messageInput.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="fas fa-paper-plane" style={{ fontSize: '14px' }}></i>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Help View - show FAQs and support options */}
            {mainView === 'help' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                  {/* Search Bar */}
                  <div style={{ 
                    position: 'relative', 
                    marginBottom: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <input
                      type="text"
                      placeholder="Search for help"
                      value={helpSearchQuery}
                      onChange={(e) => setHelpSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 36px 10px 12px',
                        border: 'none',
                        fontSize: '13px',
                        outline: 'none',
                        background: 'white'
                      }}
                    />
                    <svg 
                      width="16" height="16" viewBox="0 0 24 24" fill="none" 
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#5e72e4' }}
                    >
                      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                      <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>

                  {/* Search Results - show when searching */}
                  {helpSearchQuery.length >= 2 ? (
                    <div>
                      <div style={{ marginBottom: '12px', color: '#6b7280', fontSize: '12px' }}>
                        {faqs.filter(faq => 
                          faq.Question?.toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
                          faq.Answer?.toLowerCase().includes(helpSearchQuery.toLowerCase())
                        ).length} results for "{helpSearchQuery}"
                      </div>
                      {faqs.filter(faq => 
                        faq.Question?.toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
                        faq.Answer?.toLowerCase().includes(helpSearchQuery.toLowerCase())
                      ).map(faq => (
                        <div 
                          key={faq.FAQID}
                          onClick={() => {
                            const cat = faqCategories.find(c => c.slug === faq.Category || c.name === faq.Category);
                            if (cat) setSelectedCategory(cat);
                            setSelectedFaq(faq);
                            setHelpSearchQuery('');
                          }}
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '12px 0', 
                            borderBottom: '1px solid #f0f0f0',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ color: '#111', fontSize: '13px' }}>{faq.Question}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginLeft: '8px', color: '#5e72e4' }}>
                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      ))}
                      {faqs.filter(faq => 
                        faq.Question?.toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
                        faq.Answer?.toLowerCase().includes(helpSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <div style={{ padding: '20px 0', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                          No articles found matching "{helpSearchQuery}"
                        </div>
                      )}
                    </div>
                  ) : selectedFaq ? (
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111', marginBottom: '12px', lineHeight: '1.4' }}>
                        {selectedFaq.Question}
                      </h2>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#5e72e4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: '600' }}>PB</div>
                        <div>
                          <div style={{ color: '#111', fontWeight: '500', fontSize: '12px' }}>Written by Planbeau Team</div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>Updated recently</div>
                        </div>
                      </div>
                      
                      <div 
                        className="widget-article-content"
                        style={{ fontSize: '13px', lineHeight: '1.7', color: '#374151' }}
                        dangerouslySetInnerHTML={{ __html: selectedFaq.Answer }}
                      />
                    </div>
                  ) : selectedCategory ? (
                    <div>
                      {/* Category Header */}
                      <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111' }}>{selectedCategory.name}</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>{categoryFaqs.length} articles</p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9ca3af' }}>By Planbeau Team</p>
                          </div>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#5e72e4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '9px', fontWeight: 600 }}>PB</div>
                        </div>
                      </div>

                      {/* Articles List */}
                      {categoryFaqs.length > 0 ? categoryFaqs.map((faq) => (
                        <div 
                          key={faq.FAQID}
                          onClick={() => handleArticleClick(faq)}
                          style={{ 
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                            padding: '12px 0', 
                            borderBottom: '1px solid #f0f0f0',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ color: '#111', fontSize: '13px' }}>{faq.Question}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginLeft: '8px', color: '#5e72e4' }}>
                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )) : (
                        <div style={{ padding: '16px 0', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>No articles found.</div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Collection count */}
                      <div style={{ marginBottom: '12px', color: '#6b7280', fontSize: '13px' }}>
                        {faqCategories.filter(cat => groupedFaqs[cat.slug]?.length > 0).length} collections
                      </div>
                      
                      {/* Category rows - simple list */}
                      {faqCategories.filter(cat => groupedFaqs[cat.slug]?.length > 0).map(category => (
                        <div 
                          key={category.slug}
                          onClick={() => handleCategoryClick(category)}
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '14px 0', 
                            borderBottom: '1px solid #f0f0f0',
                            cursor: 'pointer'
                          }}
                        >
                          <div>
                            <div style={{ color: '#111', fontSize: '14px', fontWeight: '500', marginBottom: '2px' }}>{category.name}</div>
                            <div style={{ color: '#6b7280', fontSize: '12px' }}>{groupedFaqs[category.slug]?.length || 0} articles</div>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: '#5e72e4' }}>
                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Bottom Navigation */}
          <div style={{
            display: 'flex',
            borderTop: '1px solid #e0e0e0',
            background: 'white',
            padding: '8px 0'
          }}>
            <button
              onClick={() => switchMainView('home')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: mainView === 'home' ? '#5e72e4' : '#717171',
                transition: 'color 0.2s'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: '12px', fontWeight: mainView === 'home' ? 600 : 400 }}>Home</span>
            </button>
            <button
              onClick={() => switchMainView('messages')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: mainView === 'messages' ? '#5e72e4' : '#717171',
                transition: 'color 0.2s',
                position: 'relative'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: '12px', fontWeight: mainView === 'messages' ? 600 : 400 }}>Messages</span>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '8px',
                  right: '50%',
                  transform: 'translateX(12px)',
                  background: '#ff385c',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 600,
                  minWidth: '18px',
                  textAlign: 'center'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => switchMainView('help')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: mainView === 'help' ? '#5e72e4' : '#717171',
                transition: 'color 0.2s'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="17" r="1" fill="currentColor"/>
              </svg>
              <span style={{ fontSize: '12px', fontWeight: mainView === 'help' ? 600 : 400 }}>Help</span>
            </button>
          </div>
        </div>
      )}

      {/* Styles for article content within widget */}
      <style>{`
        .widget-article-content h2 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #111;
          margin: 1.25rem 0 0.75rem;
        }
        .widget-article-content h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #111;
          margin: 1rem 0 0.5rem;
        }
        .widget-article-content h4 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #374151;
          margin: 0.75rem 0 0.5rem;
        }
        .widget-article-content p {
          margin-bottom: 0.875rem;
        }
        .widget-article-content ul,
        .widget-article-content ol {
          margin-bottom: 0.875rem;
          padding-left: 1.5rem;
        }
        .widget-article-content li {
          margin-bottom: 0.4rem;
          line-height: 1.6;
        }
        .widget-article-content strong {
          color: #111;
          font-weight: 600;
        }
        .widget-article-content a {
          color: #5e72e4;
          text-decoration: underline;
        }
        .widget-article-content a:hover {
          color: #4c60d3;
        }
        .widget-article-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          font-size: 0.85rem;
        }
        .widget-article-content table th,
        .widget-article-content table td {
          padding: 0.5rem 0.75rem;
          border: 1px solid #e5e7eb;
          text-align: left;
        }
        .widget-article-content table th {
          background-color: #f9fafb;
          font-weight: 600;
          color: #111;
        }
        .widget-article-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 0.75rem 0;
        }
        .widget-article-content blockquote {
          border-left: 3px solid #5e72e4;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
        }
        .widget-article-content code {
          background: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.85em;
          font-family: monospace;
        }
        .widget-article-content pre {
          background: #f3f4f6;
          padding: 0.75rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 0.75rem 0;
        }
        .widget-article-content pre code {
          background: none;
          padding: 0;
        }
      `}</style>
    </div>
  );
}

export default MessagingWidget;
