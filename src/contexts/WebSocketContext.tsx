import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { WebSocketMessage, WebSocketError } from '../types';

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  error: WebSocketError | null;
  reconnectCount: number;
  sendMessage: (message: Partial<WebSocketMessage>) => boolean;
  subscribe: (messageType: string, callback: (message: WebSocketMessage) => void) => () => void;
  reconnect: () => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
  url?: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  url 
}) => {
  const [connectionState, setConnectionState] = useState<{
    isHealthy: boolean;
    lastHeartbeat: Date | null;
  }>({
    isHealthy: false,
    lastHeartbeat: null
  });

  const handleOpen = useCallback(() => {
    console.log('WebSocket connection established');
    setConnectionState(prev => ({ ...prev, isHealthy: true }));
  }, []);

  const handleClose = useCallback(() => {
    console.log('WebSocket connection closed');
    setConnectionState(prev => ({ ...prev, isHealthy: false }));
  }, []);

  const handleError = useCallback((error: WebSocketError) => {
    console.error('WebSocket error:', error);
    setConnectionState(prev => ({ ...prev, isHealthy: false }));
  }, []);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    // Update heartbeat on any message
    setConnectionState(prev => ({ 
      ...prev, 
      isHealthy: true,
      lastHeartbeat: new Date() 
    }));

    // Log important events
    if (message.type !== 'PONG') {
      console.log('WebSocket message received:', message.type);
    }
  }, []);

  const {
    isConnected,
    lastMessage,
    error,
    reconnectCount,
    sendMessage,
    subscribe,
    reconnect,
    disconnect,
  } = useWebSocket({
    url,
    onOpen: handleOpen,
    onClose: handleClose,
    onError: handleError,
    onMessage: handleMessage,
    reconnectDelay: 60000, // 60 seconds between attempts (much longer)
    maxReconnectAttempts: 1, // Only try once, then give up
  });

  // Health check - mark as unhealthy if no heartbeat for 2 minutes
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      if (connectionState.lastHeartbeat) {
        const timeSinceHeartbeat = Date.now() - connectionState.lastHeartbeat.getTime();
        if (timeSinceHeartbeat > 120000) { // 2 minutes
          setConnectionState(prev => ({ ...prev, isHealthy: false }));
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(healthCheckInterval);
  }, [connectionState.lastHeartbeat]);

  const contextValue: WebSocketContextType = {
    isConnected: isConnected && connectionState.isHealthy,
    lastMessage,
    error,
    reconnectCount,
    sendMessage,
    subscribe,
    reconnect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};