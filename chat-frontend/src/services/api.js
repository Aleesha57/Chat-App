// src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (username, password) => {
    const response = await axios.post(`${API_BASE_URL}/token/`, {
      username,
      password,
    });
    const { access, refresh } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },
};

// User API
export const userAPI = {
  getAll: async () => {
    const response = await api.get('/users/');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/users/${id}/`);
    return response.data;
  },

  getCurrentUser: async () => {
    // You'll need to add this endpoint in Django or decode JWT
    const response = await api.get('/users/me/');
    return response.data;
  },
};

// Chat Room API
export const chatRoomAPI = {
  getAll: async () => {
    const response = await api.get('/chatrooms/');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/chatrooms/${id}/`);
    return response.data;
  },

  create: async (data) => {
    // data = { name: 'Group Name', is_group: true, user_ids: [1, 2, 3] }
    const response = await api.post('/chatrooms/', data);
    return response.data;
  },

  getOrCreatePrivate: async (userId) => {
    const response = await api.post('/chatrooms/get_or_create_private/', {
      user_id: userId,
    });
    return response.data;
  },
};

// Message API
export const messageAPI = {
  getByChatRoom: async (chatRoomId, page = 1, pageSize = 50) => {
    const response = await api.get('/messages/', {
      params: {
        chat_room: chatRoomId,
        page,
        page_size: pageSize,
      },
    });
    return response.data;
  },

  send: async (chatRoomId, text) => {
    const response = await api.post('/messages/', {
      chat_room: chatRoomId,
      text,
    });
    return response.data;
  },

  markAsRead: async (messageId) => {
    const response = await api.post(`/messages/${messageId}/mark_read/`);
    return response.data;
  },

  markRoomAsRead: async (chatRoomId) => {
    const response = await api.post('/messages/mark_room_read/', {
      chat_room_id: chatRoomId,
    });
    return response.data;
  },
};

export default api;