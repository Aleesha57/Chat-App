class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.messageHandlers = new Set();
    this.typingHandlers = new Set();
    this.connectionHandlers = new Set();
  }

  connect(roomId, token) {
    if (this.socket) {
      this.disconnect();
    }

    // Construct WebSocket URL with auth token
    const wsUrl = `ws://localhost:8000/ws/chat/${roomId}/?token=${token}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket connected to room:', roomId);
      this.reconnectAttempts = 0;
      this.notifyConnectionHandlers({ status: 'connected', roomId });
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        switch (data.type) {
          case 'chat_message':
            this.notifyMessageHandlers(data.message);
            break;
          case 'typing':
            this.notifyTypingHandlers(data);
            break;
          case 'read_receipt':
            this.notifyReadReceiptHandlers(data);
            break;
          case 'connection_established':
            console.log('Connection confirmed:', data.message);
            break;
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.notifyConnectionHandlers({ status: 'error', error });
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.notifyConnectionHandlers({ status: 'disconnected' });
      
      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
        setTimeout(() => {
          this.connect(roomId, token);
        }, this.reconnectDelay);
      }
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.messageHandlers.clear();
    this.typingHandlers.clear();
    this.connectionHandlers.clear();
  }

  sendMessage(text) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'chat_message',
        message: text
      }));
      return true;
    }
    console.error('WebSocket is not connected');
    return false;
  }

  sendTyping(isTyping) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping
      }));
    }
  }

  sendReadReceipt(messageId) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'read_receipt',
        message_id: messageId
      }));
    }
  }

  // Handler registration
  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onTyping(handler) {
    this.typingHandlers.add(handler);
    return () => this.typingHandlers.delete(handler);
  }

  onConnectionChange(handler) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  // Notify handlers
  notifyMessageHandlers(message) {
    this.messageHandlers.forEach(handler => handler(message));
  }

  notifyTypingHandlers(data) {
    this.typingHandlers.forEach(handler => handler(data));
  }

  notifyReadReceiptHandlers(data) {
    this.messageHandlers.forEach(handler => handler({ type: 'read_receipt', ...data }));
  }

  notifyConnectionHandlers(status) {
    this.connectionHandlers.forEach(handler => handler(status));
  }

  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const wsService = new WebSocketService();
export default wsService;