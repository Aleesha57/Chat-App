import React, { useEffect, useRef } from 'react';

function MessageList({ messages, currentUserId }) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(message => {
      const dateKey = new Date(message.timestamp).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate();

  return (
    <div className="message-list">
      {Object.entries(messageGroups).map(([dateKey, dateMessages]) => (
        <div key={dateKey}>
          <div className="date-divider">
            <span>{formatDate(new Date(dateKey))}</span>
          </div>
          
          {dateMessages.map(message => {
            const isSent = message.sender.id === currentUserId;
            
            return (
              <div 
                key={message.id} 
                className={`message ${isSent ? 'sent' : 'received'}`}
              >
                {!isSent && (
                  <div className="message-sender">
                    {message.sender.username}
                  </div>
                )}
                <div className="message-bubble">
                  <div className="message-text">{message.text}</div>
                  <div className="message-meta">
                    <span>{formatTime(message.timestamp)}</span>
                    {isSent && (
                      <span className={`read-status ${message.is_read ? 'read' : 'unread'}`}>
                        {message.is_read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;