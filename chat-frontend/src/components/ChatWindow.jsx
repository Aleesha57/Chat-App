import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { messageAPI, authAPI } from '../services/api';
import wsService from '../services/websocket';

function ChatWindow({ chatRoom, currentUser, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const typingTimeoutRef = useRef(null);

  // Debug: Log chatRoom whenever it changes
  useEffect(() => {
    console.log('ChatWindow chatRoom changed:', chatRoom);
  }, [chatRoom]);

  // Load initial messages and setup WebSocket
  useEffect(() => {
    if (chatRoom && chatRoom.id) {
      console.log('Loading messages for room:', chatRoom.id);
      loadMessages();
      setupWebSocket();
    } else {
      console.warn('ChatWindow: No valid chatRoom or chatRoom.id', chatRoom);
    }

    return () => {
      cleanupWebSocket();
    };
  }, [chatRoom]);

  const loadMessages = async () => {
    if (!chatRoom || !chatRoom.id) {
      console.warn('Cannot load messages: invalid chatRoom', chatRoom);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const messagesData = await messageAPI.getByChatRoom(chatRoom.id);
      setMessages(Array.isArray(messagesData) ? messagesData : []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
      setMessages([]);
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    if (!chatRoom || !chatRoom.id) {
      console.warn('Cannot setup WebSocket: invalid chatRoom', chatRoom);
      return;
    }

    const token = authAPI.isAuthenticated() ? localStorage.getItem('token') : null;
    
    if (!token) {
      console.error('No auth token available');
      return;
    }

    // Connect to WebSocket
    console.log('Connecting WebSocket for room:', chatRoom.id);
    wsService.connect(chatRoom.id, token);

    // Handle incoming messages
    const unsubscribeMessage = wsService.onMessage((message) => {
      if (message.type === 'read_receipt') {
        // Update message read status
        setMessages(prev => prev.map(msg => 
          msg.id === message.message_id 
            ? { ...msg, is_read: true }
            : msg
        ));
      } else {
        // New message received
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
        
        // Send read receipt if message is from another user
        if (message.sender.id !== currentUser?.id) {
          wsService.sendReadReceipt(message.id);
        }
      }
    });

    // Handle typing indicators
    const unsubscribeTyping = wsService.onTyping((data) => {
      if (data.user_id !== currentUser?.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.is_typing) {
            newSet.add(data.username);
          } else {
            newSet.delete(data.username);
          }
          return newSet;
        });
      }
    });

    // Handle connection status
    const unsubscribeConnection = wsService.onConnectionChange((status) => {
      console.log('WebSocket connection status:', status);
      setConnectionStatus(status.status);
      if (status.status === 'error') {
        setError('Connection error. Retrying...');
      } else if (status.status === 'connected') {
        setError(null);
      }
    });

    // Cleanup function
    return () => {
      unsubscribeMessage();
      unsubscribeTyping();
      unsubscribeConnection();
    };
  };

  const cleanupWebSocket = () => {
    console.log('Cleaning up WebSocket');
    wsService.disconnect();
    setTypingUsers(new Set());
    setConnectionStatus('disconnected');
  };

  const handleSendMessage = async (text) => {
    if (!text.trim()) {
      console.warn('Cannot send empty message');
      return;
    }

    if (!chatRoom || !chatRoom.id) {
      console.error('Cannot send message: chatRoom or chatRoom.id is missing', chatRoom);
      setError('Cannot send message: No chat room selected');
      return;
    }

    console.log('Sending message to room:', chatRoom.id, 'Text:', text);

    try {
      // Try WebSocket first
      if (wsService.isConnected()) {
        console.log('Sending via WebSocket');
        const success = wsService.sendMessage(text);
        if (success) {
          // Message will be received via WebSocket callback
          return;
        }
        console.warn('WebSocket send failed, falling back to HTTP');
      } else {
        console.log('WebSocket not connected, using HTTP');
      }

      // Fallback to HTTP if WebSocket fails
      console.log('Sending via HTTP with chatRoomId:', chatRoom.id);
      const newMessage = await messageAPI.send(chatRoom.id, text);
      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message: ' + err.message);
    }
  };

  const handleTyping = () => {
    if (!wsService.isConnected()) {
      return;
    }

    // Send typing indicator
    wsService.sendTyping(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      wsService.sendTyping(false);
    }, 3000);
  };

  const getOtherUser = () => {
    if (!chatRoom || chatRoom.is_group) return null;
    const users = Array.isArray(chatRoom.users) 
      ? chatRoom.users 
      : (chatRoom.users ? Object.values(chatRoom.users) : []);
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

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢';
      case 'disconnected':
        return '🔴';
      case 'error':
        return '🟡';
      default:
        return '⚪';
    }
  };

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

  // Additional safety check
  if (!chatRoom.id) {
    return (
      <div className="chat-window">
        <div className="no-chat-selected">
          <div className="no-chat-icon">⚠️</div>
          <h2>Invalid Chat Room</h2>
          <p>Please select a valid chat room</p>
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
          <div className="user-name">
            {getChatTitle()}
            <small style={{ marginLeft: '8px', fontSize: '11px', opacity: 0.7 }}>
              (ID: {chatRoom.id})
            </small>
          </div>
          <div className="user-status">
            {chatRoom.is_group 
              ? `${(Array.isArray(chatRoom.users) ? chatRoom.users.length : 0)} members` 
              : 'Online'}
            <span style={{ marginLeft: '8px' }} title={`WebSocket: ${connectionStatus}`}>
              {getConnectionStatusIcon()}
            </span>
          </div>
        </div>
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
      
      <MessageList 
        messages={messages} 
        currentUserId={currentUser?.id}
      />
      
      {typingUsers.size > 0 && (
        <TypingIndicator 
          userName={Array.from(typingUsers).join(', ')} 
        />
      )}
      
      <MessageInput 
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
      />
    </div>
  );
}

export default ChatWindow;