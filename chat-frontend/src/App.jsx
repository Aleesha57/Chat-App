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
    if (authAPI.isAuthenticated()) {
      (async () => {
        try {
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

  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all users
      const usersData = await userAPI.getAll();
      console.log('Loaded users:', usersData);
      setUsers(usersData);

      // Load chat rooms for current user
      const chatRoomsData = await chatRoomAPI.getAll();
      console.log('Loaded chat rooms:', chatRoomsData);
      // Ensure it's an array (handle pagination)
      const roomsArray = Array.isArray(chatRoomsData) 
        ? chatRoomsData 
        : (chatRoomsData?.results || []);
      console.log('Chat rooms array:', roomsArray);
      setChatRooms(roomsArray);

      // Get current user info
      try {
        const me = await userAPI.getMe();
        console.log('Current user:', me);
        setCurrentUser(me);
      } catch (err) {
        if (usersData.length > 0) {
          setCurrentUser(usersData[0]);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error initializing app:', err);
      setError(err.message);
      setLoading(false);
      
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
      console.log('User selected:', user);
      
      // Get or create private chat room with this user
      const chatRoom = await chatRoomAPI.getOrCreatePrivate(user.id);
      console.log('Chat room retrieved/created:', chatRoom);
      
      // CRITICAL: Verify chatRoom has an id
      if (!chatRoom || !chatRoom.id) {
        console.error('Invalid chat room received:', chatRoom);
        setError('Failed to open chat: Invalid room data');
        return;
      }

      setSelectedChatRoom(chatRoom);
      console.log('Selected chat room set:', chatRoom);

      // Update chat rooms list - ensure chatRooms is an array
      setChatRooms(prevRooms => {
        const roomsArray = Array.isArray(prevRooms) ? prevRooms : [];
        const exists = roomsArray.find(room => room.id === chatRoom.id);
        
        if (!exists) {
          return [chatRoom, ...roomsArray];
        } else {
          return roomsArray.map(room => 
            room.id === chatRoom.id ? chatRoom : room
          );
        }
      });
    } catch (err) {
      console.error('Error selecting user:', err);
      setError('Failed to open chat: ' + err.message);
    }
  };

  const handleChatRoomSelect = async (chatRoom) => {
    console.log('Chat room selected:', chatRoom);
    
    // Verify chatRoom has an id
    if (!chatRoom || !chatRoom.id) {
      console.error('Invalid chat room selected:', chatRoom);
      setError('Invalid chat room selected');
      return;
    }
    
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