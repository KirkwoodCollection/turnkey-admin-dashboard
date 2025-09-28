import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketMessage, WebSocketError } from '../types';
import { getAdminWebSocketUrl, useAdminWebSocket as shouldUseAdminWS } from '../utils/env';
import { adminTokenService } from '../services/auth/adminTokenService';

interface UseAdminWebSocketOptions {
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: WebSocketError) => void;
  onMessage?: (message: WebSocketMessage) => void;
  enabled?: boolean;
}

export const useAdminWebSocket = (options: UseAdminWebSocketOptions = {}) => {
  const {
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    onOpen,
    onClose,
    onError,
    onMessage,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<WebSocketError | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const heartbeatTimeout = useRef<NodeJS.Timeout>();
  const messageQueue = useRef<Set<string>>(new Set());
  const listeners = useRef<Map<string, ((message: WebSocketMessage) => void)[]>>(new Map());

  const connect = useCallback(async () => {
    if (!enabled || !shouldUseAdminWS()) {
      return;
    }

    try {
      const token = await adminTokenService.getAdminToken();
      const baseUrl = getAdminWebSocketUrl();
      const wsUrl = `${baseUrl}?token=${encodeURIComponent(token)}`;

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('Admin WebSocket connected');
        setIsConnected(true);
        setError(null);
        setReconnectCount(0);
        startHeartbeat();
        onOpen?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'PONG') {
            resetHeartbeat();
            return;
          }

          if (message.id && messageQueue.current.has(message.id)) {
            return;
          }

          if (message.id) {
            messageQueue.current.add(message.id);
            setTimeout(() => messageQueue.current.delete(message.id), 60000);
          }

          setLastMessage(message);
          onMessage?.(message);

          const typeListeners = listeners.current.get(message.type);
          if (typeListeners) {
            typeListeners.forEach(listener => listener(message));
          }

          resetHeartbeat();
        } catch (err) {
          console.error('Failed to parse Admin WebSocket message:', err);
          const parseError = new WebSocketError('Failed to parse message', 'PARSE_ERROR', false);
          setError(parseError);
          onError?.(parseError);
        }
      };

      ws.current.onerror = (event) => {
        console.error('Admin WebSocket error:', event);
        const wsError = new WebSocketError('Admin WebSocket connection error', 'CONNECTION_ERROR');
        setError(wsError);
        onError?.(wsError);
      };

      ws.current.onclose = (event) => {
        console.log('Admin WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);
        stopHeartbeat();
        onClose?.();

        if (event.code === 1006 || event.code === 1001 || event.code === 401) {
          console.log('Connection closed due to auth issue, attempting token refresh');
          try {
            adminTokenService.clearToken();
          } catch (err) {
            console.warn('Failed to clear token:', err);
          }
        }

        if (reconnectCount < maxReconnectAttempts) {
          const delay = Math.min(reconnectDelay * Math.pow(2, reconnectCount), 30000);
          setReconnectCount(prev => prev + 1);

          console.log(`Reconnecting Admin WebSocket in ${delay}ms (attempt ${reconnectCount + 1}/${maxReconnectAttempts})`);
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          const maxAttemptsError = new WebSocketError(
            'Maximum Admin WebSocket reconnection attempts reached',
            'MAX_RECONNECT_ATTEMPTS',
            false
          );
          setError(maxAttemptsError);
          onError?.(maxAttemptsError);
        }
      };
    } catch (err) {
      console.error('Failed to connect Admin WebSocket:', err);
      const connectError = new WebSocketError(
        'Failed to establish Admin WebSocket connection',
        'CONNECTION_FAILED'
      );
      setError(connectError);
      onError?.(connectError);

      if (err instanceof Error && err.message.includes('token')) {
        adminTokenService.clearToken();
      }
    }
  }, [enabled, reconnectDelay, maxReconnectAttempts, reconnectCount, onOpen, onClose, onError, onMessage]);

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
      console.warn('Admin WebSocket is not connected');
      return false;
    }
  }, []);

  const subscribe = useCallback((messageType: string, callback: (message: WebSocketMessage) => void) => {
    if (!listeners.current.has(messageType)) {
      listeners.current.set(messageType, []);
    }
    listeners.current.get(messageType)!.push(callback);

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
    if (enabled && shouldUseAdminWS()) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled]);

  return {
    isConnected,
    lastMessage,
    error,
    reconnectCount,
    sendMessage,
    subscribe,
    reconnect: connect,
    disconnect,
    isEnabled: enabled && shouldUseAdminWS(),
  };
};