import React, { createContext, useContext, useState, useCallback } from 'react';
import { API_BASE_URL } from '../config';

const MessagingContext = createContext();

export function MessagingProvider({ children }) {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [targetVendor, setTargetVendor] = useState(null);
  const [pendingConversation, setPendingConversation] = useState(null);

  // Open messaging widget with a specific vendor
  const openConversationWithVendor = useCallback(async (vendorId, vendorName, currentUserId) => {
    if (!currentUserId || !vendorId) {
      console.error('Missing user ID or vendor ID');
      return null;
    }

    try {
      // First, check if a conversation already exists
      const checkResponse = await fetch(
        `${API_BASE_URL}/messages/conversations/check?userId=${currentUserId}&vendorId=${vendorId}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );

      let conversationId = null;

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.exists && checkData.conversationId) {
          conversationId = checkData.conversationId;
        }
      }

      // If no existing conversation, create one
      if (!conversationId) {
        const createResponse = await fetch(`${API_BASE_URL}/messages/conversations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: currentUserId,
            vendorId: vendorId,
            vendorName: vendorName
          })
        });

        if (createResponse.ok) {
          const createData = await createResponse.json();
          conversationId = createData.conversationId || createData.id;
        }
      }

      // Set the pending conversation to open
      if (conversationId) {
        setPendingConversation({
          id: conversationId,
          vendorId: vendorId,
          vendorName: vendorName
        });
        setTargetVendor({ id: vendorId, name: vendorName });
        setIsWidgetOpen(true);
        return conversationId;
      }

      return null;
    } catch (error) {
      console.error('Error opening conversation:', error);
      return null;
    }
  }, []);

  // Clear pending conversation after it's been handled
  const clearPendingConversation = useCallback(() => {
    setPendingConversation(null);
    setTargetVendor(null);
  }, []);

  // Open widget
  const openWidget = useCallback(() => {
    setIsWidgetOpen(true);
  }, []);

  // Close widget
  const closeWidget = useCallback(() => {
    setIsWidgetOpen(false);
    clearPendingConversation();
  }, [clearPendingConversation]);

  const value = {
    isWidgetOpen,
    setIsWidgetOpen,
    targetVendor,
    pendingConversation,
    openConversationWithVendor,
    clearPendingConversation,
    openWidget,
    closeWidget
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}

export default MessagingContext;
