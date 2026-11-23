type MessageHandler = (data: any) => void;

class WebSocketClient {
  private sockets: Map<string, WebSocket> = new Map();
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimers: Map<string, any> = new Map();

  joinRoom(room: string, token: string) {
    if (this.sockets.has(room)) {
      const existing = this.sockets.get(room);
      if (existing?.readyState === WebSocket.OPEN || existing?.readyState === WebSocket.CONNECTING) {
        return;
      }
    }

    const wsUrl = `ws://localhost:8000/ws/${room}?token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log(`[WS] Connected to room: ${room}`);
      if (this.reconnectTimers.has(room)) {
        clearTimeout(this.reconnectTimers.get(room));
        this.reconnectTimers.delete(room);
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const roomListeners = this.listeners.get(room);
        if (roomListeners) {
          roomListeners.forEach((handler) => handler(data));
        }
      } catch (e) {
        console.error('[WS] Error parsing message:', e);
      }
    };

    socket.onclose = () => {
      console.log(`[WS] Disconnected from room: ${room}`);
      this.sockets.delete(room);
      // Auto reconnect after 3 seconds
      if (!this.reconnectTimers.has(room)) {
        const timer = setTimeout(() => {
          this.reconnectTimers.delete(room);
          this.joinRoom(room, token);
        }, 3000);
        this.reconnectTimers.set(room, timer);
      }
    };

    socket.onerror = (err) => {
      console.warn(`[WS] Error in room ${room}:`, err);
    };

    this.sockets.set(room, socket);
  }

  leaveRoom(room: string) {
    const timer = this.reconnectTimers.get(room);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(room);
    }
    const socket = this.sockets.get(room);
    if (socket) {
      socket.close();
      this.sockets.delete(room);
    }
    this.listeners.delete(room);
  }

  send(room: string, message: any) {
    const socket = this.sockets.get(room);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  subscribe(room: string, handler: MessageHandler): () => void {
    if (!this.listeners.has(room)) {
      this.listeners.set(room, new Set());
    }
    this.listeners.get(room)!.add(handler);

    return () => {
      const roomListeners = this.listeners.get(room);
      if (roomListeners) {
        roomListeners.delete(handler);
      }
    };
  }
}

export const wsClient = new WebSocketClient();
