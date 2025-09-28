import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketMessage, WebSocketError } from '../types';
import { getWebSocketUrl } from '../utils/env';

interface UseWebSocketOptions {
  url?: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: WebSocketError) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    url = getWebSocketUrl(),
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<WebSocketError | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const heartbeatTimeout = useRef<NodeJS.Timeout>();
  const messageQueue = useRef<Set<string>>(new Set()); // For deduplication
  const listeners = useRef<Map<string, ((message: WebSocketMessage) => void)[]>>(new Map());

  const connect = useCallback(async () => {
    try {
      // Get Firebase Auth token dynamically
      let token = null;
      try {
        const { auth } = await import('../config/firebase');
        const { getIdToken } = await import('firebase/auth');
        if (auth?.currentUser) {
          token = await getIdToken(auth.currentUser);
        }
      } catch (authError) {
        console.warn('Could not get Firebase auth token:', authError);
      }

      const wsUrl = token
        ? `${url}?token=${encodeURIComponent(token)}`
        : url;

      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        setReconnectCount(0);
        startHeartbeat();
        onOpen?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle heartbeat responses
          if (message.type === 'PONG') {
            resetHeartbeat();
            return;
          }
          
          // Deduplicate messages
          if (message.id && messageQueue.current.has(message.id)) {
            return;
          }
          
          if (message.id) {
            messageQueue.current.add(message.id);
            // Clean up old message IDs after 1 minute
            setTimeout(() => messageQueue.current.delete(message.id), 60000);
          }
          
          setLastMessage(message);
          onMessage?.(message);
          
          // Notify type-specific listeners
          const typeListeners = listeners.current.get(message.type);
          if (typeListeners) {
            typeListeners.forEach(listener => listener(message));
          }
          
          resetHeartbeat();
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
          const parseError = new WebSocketError('Failed to parse message', 'PARSE_ERROR', false);
          setError(parseError);
          onError?.(parseError);
        }
      };

      ws.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        const wsError = new WebSocketError('WebSocket connection error', 'CONNECTION_ERROR');
        setError(wsError);
        onError?.(wsError);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);
        stopHeartbeat();
        onClose?.();
        
        // Attempt reconnection with exponential backoff
        if (reconnectCount < maxReconnectAttempts) {
          const delay = Math.min(reconnectDelay * Math.pow(2, reconnectCount), 30000);
          setReconnectCount(prev => prev + 1);
          
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectCount + 1}/${maxReconnectAttempts})`);
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          const maxAttemptsError = new WebSocketError(
            'Maximum reconnection attempts reached',
            'MAX_RECONNECT_ATTEMPTS',
            false
          );
          setError(maxAttemptsError);
          onError?.(maxAttemptsError);
        }
      };
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      const connectError = new WebSocketError(
        'Failed to establish connection',
        'CONNECTION_FAILED'
      );
      setError(connectError);
      onError?.(connectError);
    }
  }, [url, reconnectDelay, maxReconnectAttempts, reconnectCount, onOpen, onClose, onError, onMessage]);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimeout.current);
    stopHeartbeat();
    if (ws.current) {
      ws.current.close(1000, 'Manual disconnect');
      ws.current = null;
    }
    setIsConnected(false);
    setReconnectCount(0);
  }, []);

  const sendMessage = useCallback((message: Partial<WebSocketMessage>) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        ...message
      } as WebSocketMessage;
      
      ws.current.send(JSON.stringify(fullMessage));
      return true;
    } else {
      console.warn('WebSocket is not connected');
      return false;
    }
  }, []);

  const subscribe = useCallback((messageType: string, callback: (message: WebSocketMessage) => void) => {
    if (!listeners.current.has(messageType)) {
      listeners.current.set(messageType, []);
    }
    listeners.current.get(messageType)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const typeListeners = listeners.current.get(messageType);
      if (typeListeners) {
        const index = typeListeners.indexOf(callback);
        if (index > -1) {
          typeListeners.splice(index, 1);
        }
        if (typeListeners.length === 0) {
          listeners.current.delete(messageType);
        }
      }
    };
  }, []);

  const startHeartbeat = () => {
    heartbeatTimeout.current = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'PING', payload: null });
      }
    }, heartbeatInterval);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimeout.current) {
      clearInterval(heartbeatTimeout.current);
    }
  };

  const resetHeartbeat = () => {
    stopHeartbeat();
    startHeartbeat();
  };

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    reconnectCount,
    sendMessage,
    subscribe,
    reconnect: connect,
    disconnect,
  };
};