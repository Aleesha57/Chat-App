import React from 'react';

function UserList({ users, selectedUser, onUserSelect }) {
  return (
    <div className="user-list">
      <div className="user-list-header">
        Chats
      </div>
      <div className="user-list-items">
        {users.map(user => (
          <div
            key={user.id}
            className={`user-item ${selectedUser?.id === user.id ? 'active' : ''}`}
            onClick={() => onUserSelect(user)}
          >
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
              {user.online && <span className="online-indicator"></span>}
            </div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-status">
                {user.online ? 'Online' : 'Offline'}
              </div>
            </div>
            {user.unreadCount > 0 && (
              <span className="unread-badge">{user.unreadCount}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserList;