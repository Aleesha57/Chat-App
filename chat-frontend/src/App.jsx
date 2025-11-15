import React, { useState, useEffect } from 'react';
import './App.css';
import UserList from './components/UserList';
import ChatWindow from './components/ChatWindow';
import Login from './components/Login';
import { userAPI, chatRoomAPI, authAPI } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedChatRoom, setSelectedChatRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    // If a token exists, validate it by calling /api/users/me/ before showing the app
    if (authAPI.isAuthenticated()) {
      (async () => {
        try {
          // Attempt to fetch current user using token. If this fails, token is invalid.
          await userAPI.getMe();
          setIsAuthenticated(true);
          await initializeApp();
        } catch (err) {
          console.warn('Saved token invalid or expired; clearing token and showing login', err);
          authAPI.logout();
          setIsAuthenticated(false);
          setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }
  }, []);

  // Load initial data when authenticated
  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all users
      const usersData = await userAPI.getAll();
      setUsers(usersData);

      // Load chat rooms for current user
      const chatRoomsData = await chatRoomAPI.getAll();
      setChatRooms(chatRoomsData);

      // Get current user info (first user for demo - you should implement a proper endpoint)
      // Use server-provided /api/users/me/ to fetch the authenticated user's data
      try {
        const me = await userAPI.getMe();
        setCurrentUser(me);
      } catch (err) {
        // Fallback to first user in the list if `me` endpoint fails
        if (usersData.length > 0) {
          setCurrentUser(usersData[0]);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error initializing app:', err);
      setError(err.message);
      setLoading(false);
      
      // If unauthorized, logout
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    initializeApp();
  };

  const handleLogout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setUsers([]);
    setChatRooms([]);
    setSelectedChatRoom(null);
    setCurrentUser(null);
  };

  const handleUserSelect = async (user) => {
    try {
      setError(null);
      // Get or create private chat room with this user
      const chatRoom = await chatRoomAPI.getOrCreatePrivate(user.id);
      setSelectedChatRoom(chatRoom);

      // Update chat rooms list if new room was created
      const exists = chatRooms.find(room => room.id === chatRoom.id);
      if (!exists) {
        setChatRooms([chatRoom, ...chatRooms]);
      } else {
        // Update existing room data
        setChatRooms(chatRooms.map(room => 
          room.id === chatRoom.id ? chatRoom : room
        ));
      }
    } catch (err) {
      console.error('Error selecting user:', err);
      setError('Failed to open chat');
    }
  };

  const handleChatRoomSelect = async (chatRoom) => {
    setSelectedChatRoom(chatRoom);
    setError(null);
  };

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (loading) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      <div className="chat-container">
        <UserList 
          users={users}
          chatRooms={chatRooms}
          selectedChatRoom={selectedChatRoom}
          onUserSelect={handleUserSelect}
          onChatRoomSelect={handleChatRoomSelect}
        />
        <ChatWindow 
          chatRoom={selectedChatRoom}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
}

export default App;