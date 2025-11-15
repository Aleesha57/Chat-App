import React, { useState } from 'react';

function UserList({ users, chatRooms, selectedChatRoom, onUserSelect, onChatRoomSelect }) {
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'users'
  // Ensure `chatRooms` and `users` are arrays (backend may send objects)
  const rooms = Array.isArray(chatRooms) ? chatRooms : (chatRooms ? Object.values(chatRooms) : []);
  const userList = Array.isArray(users) ? users : (users ? Object.values(users) : []);
  // Filter out null/undefined entries that can crash .map when accessing properties
  const safeRooms = rooms.filter(r => r != null);
  const safeUsers = userList.filter(u => u != null);

  const getChatRoomTitle = (room) => {
    if (room.is_group) {
      return room.name || 'Group Chat';
    }
    // For private chats, show the other user's name
    // Guard against missing or non-array `room.users` and tolerate different shapes
    const roomUsers = Array.isArray(room.users)
      ? room.users
      : (room.users ? Object.values(room.users) : []);

    if (roomUsers.length === 0) {
      return room.name || 'Private Chat';
    }

    return roomUsers
      .map(u => (typeof u === 'string' ? u : (u?.username || u?.name || 'Unknown')))
      .join(', ');
  };

  const getLastMessagePreview = (room) => {
    if (!room.last_message) return 'No messages yet';
    
    const text = room.last_message.text;
    return text.length > 30 ? text.substring(0, 30) + '...' : text;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 day
    if (diff < 86400000) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    // Less than 1 week
    if (diff < 604800000) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="user-list">
      <div className="user-list-header">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            Chats
          </button>
          <button 
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
        </div>
      </div>

      <div className="user-list-items">
        {activeTab === 'chats' && (
          <>
            {safeRooms.length === 0 ? (
              <div className="empty-state">
                <p>No chats yet</p>
                <small>Start a conversation from the Users tab</small>
              </div>
            ) : (
              safeRooms.map((room, idx) => (
                <div
                  key={room?.id ?? room?.name ?? idx}
                  className={`user-item ${selectedChatRoom?.id === room?.id ? 'active' : ''}`}
                  onClick={() => onChatRoomSelect(room)}
                >
                  <div className="user-avatar">
                    {(getChatRoomTitle(room) || '').charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <div className="user-name">{getChatRoomTitle(room)}</div>
                    <div className="user-status">
                      {getLastMessagePreview(room)}
                    </div>
                  </div>
                  <div className="chat-meta">
                    {room?.last_message && (
                      <div className="last-message-time">
                        {formatTimestamp(room.last_message.timestamp)}
                      </div>
                    )}
                    {room?.unread_count > 0 && (
                      <span className="unread-badge">{room.unread_count}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'users' && (
          <>
            {safeUsers.length === 0 ? (
              <div className="empty-state">
                <p>No users found</p>
              </div>
            ) : (
              safeUsers.map((user, idx) => {
                const displayName = (user?.username || user?.name || user?.email || 'User').toString();
                return (
                  <div
                    key={user?.id ?? user?.username ?? idx}
                    className="user-item"
                    onClick={() => onUserSelect(user)}
                  >
                    <div className="user-avatar">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{displayName}</div>
                      <div className="user-status">
                        {user?.email || 'Start a conversation'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default UserList;