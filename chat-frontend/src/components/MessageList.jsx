import React, { useEffect, useRef } from 'react';

function MessageList({ messages, currentUserId }) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map(message => {
        const isSent = message.senderId === currentUserId;
        
        return (
          <div 
            key={message.id} 
            className={`message ${isSent ? 'sent' : 'received'}`}
          >
            <div className="message-bubble">
              <div className="message-text">{message.text}</div>
              <div className="message-meta">
                <span>{message.timestamp}</span>
                {isSent && (
                  <span className={`read-status ${message.read ? 'read' : 'unread'}`}>
                    {message.read ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;