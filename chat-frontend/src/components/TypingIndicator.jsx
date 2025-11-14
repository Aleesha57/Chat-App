import React from 'react';

function TypingIndicator({ userName }) {
  return (
    <div className="typing-indicator">
      <span>{userName} is typing</span>
      <div className="typing-dots">
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
      </div>
    </div>
  );
}

export default TypingIndicator;