import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';

// Real-time WebSocket message types from aggregating WebSocket Service
interface RealtimeWebSocketMessage {
  id: string;
  timestamp: string;
  type: string;
  payload: any;
  source?: string; // Which service sent the original message
}

// Session-related messages (from Events service via WebSocket service)
interface SessionUpdateMessage extends RealtimeWebSocketMessage {
  type: 'session.updated' | 'session.created' | 'session.completed';
  payload: {
    session: any;
    propertyId?: string;
  };
}

// Event-related messages (from Events service via WebSocket service)
interface EventReceivedMessage extends RealtimeWebSocketMessage {
  type: 'event.received';
  payload: {
    event: any;
    sessionId: string;
    propertyId?: string;
  };
}

// Analytics messages (from Analytics service via WebSocket service)
interface AnalyticsMetricsMessage extends RealtimeWebSocketMessage {
  type: 'analytics.metrics.updated';
  payload: {
    activeUsers: number;
    totalSearches: number;
    bookRate: number;
    liveToBookRate: number;
    avgSearchDuration: number;
    propertyId?: string;
  };
}

interface AnalyticsFunnelMessage extends RealtimeWebSocketMessage {
  type: 'analytics.funnel.updated';
  payload: {
    stages: Array<{
      stage: string;
      count: number;
      percentage: number;
      dropOffRate?: number;
    }>;
    propertyId?: string;
  };
}

interface UseRealtimeWebSocketOptions {
  onSessionUpdate?: (session: any) => void;
  onNewEvent?: (event: any, sessionId: string) => void;
  onMetricsUpdate?: (metrics: any) => void;
  onFunnelUpdate?: (funnel: any) => void;
  autoInvalidateQueries?: boolean;
  propertyId?: string;
}

// Type guard functions
function isSessionMessage(message: RealtimeWebSocketMessage): message is SessionUpdateMessage {
  return message.type.startsWith('session.');
}

function isEventMessage(message: RealtimeWebSocketMessage): message is EventReceivedMessage {
  return message.type === 'event.received';
}

function isAnalyticsMetricsMessage(message: RealtimeWebSocketMessage): message is AnalyticsMetricsMessage {
  return message.type === 'analytics.metrics.updated';
}

function isAnalyticsFunnelMessage(message: RealtimeWebSocketMessage): message is AnalyticsFunnelMessage {
  return message.type === 'analytics.funnel.updated';
}

export function useRealtimeWebSocket(options: UseRealtimeWebSocketOptions = {}) {
  const {
    onSessionUpdate,
    onNewEvent,
    onMetricsUpdate,
    onFunnelUpdate,
    autoInvalidateQueries = true,
    propertyId,
  } = options;

  const queryClient = useQueryClient();

  // Use the WebSocket Service URL with client_type parameter
  // Note: useWebSocket hook will add the token parameter automatically
  const getWebSocketServiceUrl = () => {
    // For production: Try the direct WebSocket service URL
    // For development: Use proxy through dev server
    if (process.env.NODE_ENV === 'development') {
      // In dev, try common WebSocket paths that might work
      const protocol = 'ws:';
      const host = window.location.host;
      const baseUrl = `${protocol}//${host}/ws`; // Try simpler path
      const params = new URLSearchParams();

      params.append('client_type', 'admin');

      if (propertyId) {
        params.append('property_id', propertyId);
      }

      return `${baseUrl}?${params.toString()}`;
    } else {
      // In production, try the direct WebSocket endpoint
      const baseUrl = 'wss://api.turnkeyhms.com/ws';
      const params = new URLSearchParams();

      params.append('client_type', 'admin');

      if (propertyId) {
        params.append('property_id', propertyId);
      }

      return `${baseUrl}?${params.toString()}`;
    }
  };

  const handleMessage = useCallback(
    (message: RealtimeWebSocketMessage) => {
      console.log('Received realtime message:', message.type, message);

      // Filter by propertyId if specified
      if (propertyId && message.payload.propertyId && message.payload.propertyId !== propertyId) {
        return;
      }

      // Handle session messages from Events service
      if (isSessionMessage(message)) {
        const session = message.payload.session;

        // Update React Query cache
        if (autoInvalidateQueries) {
          queryClient.setQueryData(
            ['session', session.sessionId],
            session
          );

          // Invalidate sessions lists
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
          queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
        }

        // Call custom handler
        onSessionUpdate?.(session);
      }

      // Handle event messages from Events service
      if (isEventMessage(message)) {
        const { event, sessionId } = message.payload;

        // Invalidate session events cache
        if (autoInvalidateQueries) {
          queryClient.invalidateQueries({ queryKey: ['sessionEvents', sessionId] });
        }

        // Call custom handler
        onNewEvent?.(event, sessionId);
      }

      // Handle analytics metrics from Analytics service
      if (isAnalyticsMetricsMessage(message)) {
        // Update metrics cache
        if (autoInvalidateQueries) {
          queryClient.invalidateQueries({ queryKey: ['analytics', 'metrics'] });
          queryClient.invalidateQueries({ queryKey: ['topMetrics'] });
          queryClient.invalidateQueries({ queryKey: ['realtimeMetrics'] });
        }

        // Call custom handler
        onMetricsUpdate?.(message.payload);
      }

      // Handle analytics funnel updates
      if (isAnalyticsFunnelMessage(message)) {
        // Update funnel cache
        if (autoInvalidateQueries) {
          queryClient.invalidateQueries({ queryKey: ['analytics', 'funnel'] });
        }

        // Call custom handler
        onFunnelUpdate?.(message.payload);
      }
    },
    [queryClient, autoInvalidateQueries, propertyId, onSessionUpdate, onNewEvent, onMetricsUpdate, onFunnelUpdate]
  );

  const {
    isConnected,
    error,
    subscribe,
    sendMessage,
    reconnect,
    disconnect,
  } = useWebSocket({
    url: getWebSocketServiceUrl(),
    onMessage: handleMessage as any,
    reconnectDelay: 60000, // 60 seconds between attempts (much longer)
    maxReconnectAttempts: 1, // Only try once, then give up
  });

  // Subscribe to message types on mount
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Subscribe to session-related messages
    unsubscribers.push(subscribe('session.updated', handleMessage as any));
    unsubscribers.push(subscribe('session.created', handleMessage as any));
    unsubscribers.push(subscribe('session.completed', handleMessage as any));

    // Subscribe to event messages
    unsubscribers.push(subscribe('event.received', handleMessage as any));

    // Subscribe to analytics messages
    unsubscribers.push(subscribe('analytics.metrics.updated', handleMessage as any));
    unsubscribers.push(subscribe('analytics.funnel.updated', handleMessage as any));
    unsubscribers.push(subscribe('analytics.toplists.updated', handleMessage as any));

    // Send initial subscription message
    if (isConnected) {
      sendMessage({
        type: 'subscribe' as any,
        payload: {
          clientType: 'admin',
          propertyId: propertyId || null,
          subscriptions: [
            'session.*',
            'event.*',
            'analytics.*'
          ]
        },
      });
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [subscribe, handleMessage, isConnected, sendMessage, propertyId]);

  // Subscribe/unsubscribe when propertyId changes
  useEffect(() => {
    if (isConnected) {
      sendMessage({
        type: 'update_subscription' as any,
        payload: {
          propertyId: propertyId || null
        },
      });
    }
  }, [isConnected, propertyId, sendMessage]);

  return {
    isConnected,
    error,
    sendMessage,
    reconnect,
    disconnect,
  };
}