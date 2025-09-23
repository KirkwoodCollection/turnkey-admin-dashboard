import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { useInvalidateAnalytics } from './useAnalyticsData';

// Analytics-specific WebSocket message types
interface AnalyticsWebSocketMessage {
  id: string;
  timestamp: string;
  type: string;
  payload: any;
}

interface MetricsUpdateMessage extends AnalyticsWebSocketMessage {
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

interface FunnelUpdateMessage extends AnalyticsWebSocketMessage {
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

interface TopListsUpdateMessage extends AnalyticsWebSocketMessage {
  type: 'analytics.toplists.updated';
  payload: {
    destinations: Array<{
      destination: string;
      count: number;
      percentage: number;
      rank: number;
    }>;
    hotels: Array<{
      hotelName: string;
      searches: number;
      bookings: number;
      conversionRate: number;
      rank: number;
    }>;
    propertyId?: string;
  };
}

interface SessionsUpdateMessage extends AnalyticsWebSocketMessage {
  type: 'analytics.sessions.updated';
  payload: {
    total: number;
    recentSessions: Array<any>;
    propertyId?: string;
  };
}

type AnalyticsMessage =
  | MetricsUpdateMessage
  | FunnelUpdateMessage
  | TopListsUpdateMessage
  | SessionsUpdateMessage;

interface UseAnalyticsWebSocketOptions {
  onMetricsUpdate?: (metrics: MetricsUpdateMessage['payload']) => void;
  onFunnelUpdate?: (funnel: FunnelUpdateMessage['payload']) => void;
  onTopListsUpdate?: (topLists: TopListsUpdateMessage['payload']) => void;
  onSessionsUpdate?: (sessions: SessionsUpdateMessage['payload']) => void;
  autoInvalidateQueries?: boolean;
  propertyId?: string;
}

// Type guard functions
function isMetricsUpdate(message: AnalyticsWebSocketMessage): message is MetricsUpdateMessage {
  return message.type === 'analytics.metrics.updated';
}

function isFunnelUpdate(message: AnalyticsWebSocketMessage): message is FunnelUpdateMessage {
  return message.type === 'analytics.funnel.updated';
}

function isTopListsUpdate(message: AnalyticsWebSocketMessage): message is TopListsUpdateMessage {
  return message.type === 'analytics.toplists.updated';
}

function isSessionsUpdate(message: AnalyticsWebSocketMessage): message is SessionsUpdateMessage {
  return message.type === 'analytics.sessions.updated';
}

export function useAnalyticsWebSocket(options: UseAnalyticsWebSocketOptions = {}) {
  const {
    onMetricsUpdate,
    onFunnelUpdate,
    onTopListsUpdate,
    onSessionsUpdate,
    autoInvalidateQueries = true,
    propertyId,
  } = options;

  const queryClient = useQueryClient();
  const invalidate = useInvalidateAnalytics();

  // Use the Analytics WebSocket URL
  const analyticsWsUrl = process.env.REACT_APP_ANALYTICS_WS_URL || 'ws://localhost:8001/ws';

  const handleMessage = useCallback(
    (message: AnalyticsWebSocketMessage) => {
      // Filter by propertyId if specified
      if (propertyId && message.payload.propertyId && message.payload.propertyId !== propertyId) {
        return;
      }

      // Handle different message types
      if (isMetricsUpdate(message)) {
        // Update top metrics cache
        if (autoInvalidateQueries) {
          invalidate.invalidateTopMetrics();
          invalidate.invalidateRealtime(propertyId);
        }

        // Call custom handler
        onMetricsUpdate?.(message.payload);
      }

      if (isFunnelUpdate(message)) {
        // Update funnel cache
        if (autoInvalidateQueries) {
          invalidate.invalidateFunnel();
        }

        // Call custom handler
        onFunnelUpdate?.(message.payload);
      }

      if (isTopListsUpdate(message)) {
        // Update top lists cache
        if (autoInvalidateQueries) {
          invalidate.invalidateTopLists(propertyId);
        }

        // Call custom handler
        onTopListsUpdate?.(message.payload);
      }

      if (isSessionsUpdate(message)) {
        // Update sessions cache
        if (autoInvalidateQueries) {
          queryClient.invalidateQueries(['analytics', 'sessions']);
        }

        // Call custom handler
        onSessionsUpdate?.(message.payload);
      }
    },
    [queryClient, autoInvalidateQueries, propertyId, invalidate, onMetricsUpdate, onFunnelUpdate, onTopListsUpdate, onSessionsUpdate]
  );

  const {
    isConnected,
    error,
    subscribe,
    sendMessage,
    reconnect,
    disconnect,
  } = useWebSocket({
    url: analyticsWsUrl,
    onMessage: handleMessage as any,
    reconnectDelay: 2000, // 2 seconds
    maxReconnectAttempts: 10,
  });

  // Subscribe to Analytics message types on mount
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Subscribe to all Analytics message types
    unsubscribers.push(subscribe('analytics.metrics.updated', handleMessage as any));
    unsubscribers.push(subscribe('analytics.funnel.updated', handleMessage as any));
    unsubscribers.push(subscribe('analytics.toplists.updated', handleMessage as any));
    unsubscribers.push(subscribe('analytics.sessions.updated', handleMessage as any));

    // Send initial subscription message with propertyId if specified
    if (isConnected && propertyId) {
      sendMessage({
        type: 'analytics.subscribe',
        payload: { propertyId },
      });
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [subscribe, handleMessage, isConnected, sendMessage, propertyId]);

  // Subscribe/unsubscribe when propertyId changes
  useEffect(() => {
    if (isConnected && propertyId) {
      sendMessage({
        type: 'analytics.subscribe',
        payload: { propertyId },
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