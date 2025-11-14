import React, { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

function ChatWindow({ selectedUser, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // Load messages when user is selected
  useEffect(() => {
    if (selectedUser) {
      // Mock messages for each user
      const mockMessages = [
        {
          id: 1,
          senderId: selectedUser.id,
          text: 'Hey! How are you?',
          timestamp: '10:30 AM',
          read: true
        },
        {
          id: 2,
          senderId: currentUser.id,
          text: 'I\'m doing great! Thanks for asking.',
          timestamp: '10:32 AM',
          read: true
        },
        {
          id: 3,
          senderId: selectedUser.id,
          text: 'That\'s wonderful to hear!',
          timestamp: '10:33 AM',
          read: true
        },
        {
          id: 4,
          senderId: currentUser.id,
          text: 'What about you?',
          timestamp: '10:34 AM',
          read: false
        }
      ];
      setMessages(mockMessages);
      setIsTyping(false);
    }
  }, [selectedUser, currentUser]);

  const handleSendMessage = (text) => {
    const newMessage = {
      id: Date.now(),
      senderId: currentUser.id,
      text: text,
      timestamp: new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      read: false
    };

    setMessages([...messages, newMessage]);

    // Simulate typing indicator after 1 second
    setTimeout(() => {
      setIsTyping(true);
      
      // Remove typing and add response after 3 seconds
      setTimeout(() => {
        setIsTyping(false);
        const responseMessage = {
          id: Date.now() + 1,
          senderId: selectedUser.id,
          text: 'Thanks for your message! This is a demo response.',
          timestamp: new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          read: true
        };
        setMessages(prev => [...prev, responseMessage]);
      }, 3000);
    }, 1000);
  };

  const handleTyping = () => {
    // In real app, this would send typing indicator via WebSocket
    console.log('User is typing...');
  };

  // Show empty state when no user is selected
  if (!selectedUser) {
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
          {selectedUser.name.charAt(0).toUpperCase()}
          {selectedUser.online && <span className="online-indicator"></span>}
        </div>
        <div className="user-info">
          <div className="user-name">{selectedUser.name}</div>
          <div className="user-status">
            {selectedUser.online ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>
      
      <MessageList 
        messages={messages} 
        currentUserId={currentUser.id}
      />
      
      {isTyping && <TypingIndicator userName={selectedUser.name} />}
      
      <MessageInput 
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
      />
    </div>
  );
}

export default ChatWindow;