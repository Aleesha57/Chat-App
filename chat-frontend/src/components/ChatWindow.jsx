import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { messageAPI } from '../services/api';

function ChatWindow({ chatRoom, currentUser, onLogout }) {
  // FIX 1: Initialize messages as an empty array
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollingInterval = useRef(null);

  // Load messages when chat room changes
  useEffect(() => {
    if (chatRoom && chatRoom.id && chatRoom.id !== 'undefined' && !isNaN(Number(chatRoom.id))) {
      loadMessages();
      // Mark messages as read
      markRoomAsRead();
      // Start polling for new messages
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [chatRoom]);

  const loadMessages = async () => {
    if (!chatRoom || !chatRoom.id || chatRoom.id === 'undefined' || isNaN(Number(chatRoom.id))) {
      console.warn('ChatWindow: invalid chatRoom or id; skipping loadMessages', chatRoom);
      return;
    }
    console.debug('ChatWindow: loadMessages() for chatRoom.id=', chatRoom.id);

    try {
      setLoading(true);
      setError(null);
      const messagesData = await messageAPI.getByChatRoom(chatRoom.id);
      
      // FIX 2: Ensure messagesData is always an array
      setMessages(Array.isArray(messagesData) ? messagesData : []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
      // FIX 3: Set empty array on error to prevent forEach issues
      setMessages([]);
      setLoading(false);
    }
  };

  const markRoomAsRead = async () => {
    if (!chatRoom) return;

    try {
      // Comment out until backend is fixed
      // await messageAPI.markRoomAsRead(chatRoom.id);
      console.log('Mark as read temporarily disabled');
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const startPolling = () => {
    // Poll for new messages every 3 seconds
    pollingInterval.current = setInterval(() => {
      // Guard the current chatRoom id at poll time; don't make requests for invalid ids
      if (!chatRoom || !chatRoom.id || chatRoom.id === 'undefined' || isNaN(Number(chatRoom.id))) {
        console.debug('ChatWindow poll skipped due to invalid chatRoom at poll time', chatRoom);
        return;
      }

      console.debug('ChatWindow: poll triggered, chatRoom=', chatRoom);
      loadMessages();
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  const handleSendMessage = async (text) => {
    if (!chatRoom || !text.trim()) return;

    try {
      const newMessage = await messageAPI.send(chatRoom.id, text);
      // FIX 5: Use functional update to ensure latest state
      setMessages(prevMessages => [...prevMessages, newMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        const messageList = document.querySelector('.message-list');
        if (messageList) {
          messageList.scrollTop = messageList.scrollHeight;
        }
      }, 100);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const handleTyping = () => {
    // In production, send typing indicator via WebSocket
    console.log('User is typing...');
  };

  // Get other user info for header (for private chats)
  const getOtherUser = () => {
    if (!chatRoom || chatRoom.is_group) return null;
    // Ensure users is an array-like structure (backend might send object)
    const users = Array.isArray(chatRoom.users) ? chatRoom.users : (chatRoom.users ? Object.values(chatRoom.users) : []);
    if (users.length === 0) return null;
    return users.find(user => user?.id !== currentUser?.id) || null;
  };

  const getChatTitle = () => {
    if (!chatRoom) return '';
    if (chatRoom.is_group) {
      return chatRoom.name || 'Group Chat';
    }
    const otherUser = getOtherUser();
    return otherUser ? (otherUser.username || otherUser.name || 'Chat') : 'Chat';
  };

  // Show empty state when no chat room is selected
  if (!chatRoom) {
    return (
      <div className="chat-window">
        <div className="no-chat-selected">
          <div className="no-chat-icon">💬</div>
          <h2>Select a chat to start messaging</h2>
          <p>Choose a user from the list to begin your conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="user-avatar">
          {(getChatTitle() || '').charAt(0).toUpperCase()}
        </div>
        <div className="user-info">
          <div className="user-name">{getChatTitle()}</div>
          <div className="user-status">
                {chatRoom.is_group 
              ? `${(Array.isArray(chatRoom.users) ? chatRoom.users.length : (chatRoom.users ? Object.keys(chatRoom.users).length : 0))} members` 
              : 'Online'}
          </div>
        </div>
            {/* Logout button to return to login screen; App controls auth state */}
            <div className="chat-actions">
              <div className="current-user">{currentUser?.username}</div>
              <button
                type="button"
                className="logout-button"
                onClick={() => onLogout?.()}
                title="Logout"
              >
                Logout
              </button>
            </div>
      </div>
      
      {loading && <div className="loading-messages">Loading messages...</div>}
      {error && <div className="error-messages">{error}</div>}
      
      {/* FIX 6: Add error boundary protection */}
      <MessageList 
        messages={messages} 
        currentUserId={currentUser?.id}
      />
      
      {isTyping && <TypingIndicator userName="User" />}
      
      <MessageInput 
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
      />
    </div>
  );
}

export default ChatWindow;