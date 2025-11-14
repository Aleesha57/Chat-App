import React, { useState, useEffect } from 'react';
import './App.css';
import UserList from './components/UserList';
import ChatWindow from './components/ChatWindow';
import axios from 'axios';

function App() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser] = useState({ id: 1, name: 'You' });

  // Load mock users when component mounts
  useEffect(() => {
    const mockUsers = [
      { id: 2, name: 'Aleesha Thomas', online: true, unreadCount: 3 },
      { id: 3, name: 'Shiny T', online: false, unreadCount: 0 },
      { id: 4, name: 'Annie BT', online: true, unreadCount: 1 },
      { id: 5, name: 'Anusree PV', online: true, unreadCount: 0 },
      { id: 6, name: 'Thomson Tom', online: false, unreadCount: 5 }
    ];
    setUsers(mockUsers);
  }, []);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    // Clear unread count when user is selected
    setUsers(users.map(u => 
      u.id === user.id ? { ...u, unreadCount: 0 } : u
    ));
  };

  return (
    <div className="App">
      <div className="chat-container">
        <UserList 
          users={users} 
          selectedUser={selectedUser}
          onUserSelect={handleUserSelect}
        />
        <ChatWindow 
          selectedUser={selectedUser}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}

export default App;