// services/api.js

const API_BASE_URL = 'http://localhost:8000';

// Note: Backend uses endpoints registered under names 'chatrooms' not 'chat_rooms'

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Helper function to make authenticated requests
const authenticatedFetch = async (url, options = {}) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    // Try to parse JSON error body; if that fails, fallback to text (useful for Django HTML tracebacks)
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.detail || JSON.stringify(errorData) || errorMessage;
    } catch (jsonErr) {
      // Not JSON — try plain text (may contain Django traceback HTML)
      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch (textErr) {
        // ignore
      }
    }

    // Log full response to console for easier debugging
    console.error('API error response:', { url, status: response.status, message: errorMessage });

    throw new Error(errorMessage);
  }

  return response.json();
};

// Message API
export const messageAPI = {
  // Get messages for a specific chat room
  getByChatRoom: async (roomId) => {
    try {
      if (roomId == null || roomId === 'undefined' || isNaN(Number(roomId))) {
        // Don't call backend when chat room id is invalid — return empty array
        console.warn(`messageAPI.getByChatRoom called with invalid id: ${roomId}`);
        return [];
      }
      const data = await authenticatedFetch(
        `${API_BASE_URL}/api/messages/?chat_room=${roomId}`
      );
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  // Send a new message
  send: async (chatRoomId, text) => {
    try {
      return await authenticatedFetch(
        `${API_BASE_URL}/api/messages/`,
        {
          method: 'POST',
          body: JSON.stringify({
            chat_room: chatRoomId,
            text: text,
          }),
        }
      );
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Mark all messages in a room as read
  markRoomAsRead: async (roomId) => {
    try {
      return await authenticatedFetch(
        `${API_BASE_URL}/api/messages/mark_room_read/`,
        {
          method: 'POST',
          body: JSON.stringify({ chat_room_id: roomId }),
        }
      );
    } catch (error) {
      console.error('Error marking room as read:', error);
      // Don't throw - this is a non-critical operation
      return null;
    }
  },
};

// Chat Room API (if needed)
export const chatRoomAPI = {
  getAll: async () => {
    try {
      return await authenticatedFetch(`${API_BASE_URL}/api/chatrooms/`);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      throw error;
    }
  },

  getOrCreatePrivate: async (otherUserId) => {
    try {
      return await authenticatedFetch(
        `${API_BASE_URL}/api/chatrooms/get_or_create_private/`,
        {
          method: 'POST',
          body: JSON.stringify({ user_id: otherUserId }),
        }
      );
    } catch (error) {
      console.error('Error getting/creating private chat room:', error);
      throw error;
    }
  },

  create: async (data) => {
    try {
      return await authenticatedFetch(
        `${API_BASE_URL}/api/chatrooms/`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  },
};

// User API
export const userAPI = {
  getAll: async () => {
    try {
      const data = await authenticatedFetch(`${API_BASE_URL}/api/users/`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },
  getMe: async () => {
    try {
      return await authenticatedFetch(`${API_BASE_URL}/api/users/me/`);
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  }
};

// Authentication helpers
export const authAPI = {
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
  login: async (username, password) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      // TokenObtainPairView returns `access` and `refresh`
      if (data.access) {
        localStorage.setItem('token', data.access);
        if (data.refresh) {
          localStorage.setItem('refreshToken', data.refresh);
        }
        return data;
      }
      throw new Error('Invalid login response');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }
};

export default { messageAPI, chatRoomAPI, userAPI, authAPI };