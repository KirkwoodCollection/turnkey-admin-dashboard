import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminWebSocket } from './useAdminWebSocket';
import { useRealtimeWebSocket } from './useRealtimeWebSocket';
import { useAdminWebSocket as shouldUseAdminWS, useEventsWebSocketFallback } from '../utils/env';

interface AdminRealtimeWebSocketMessage {
  id: string;
  timestamp: string;
  type: string;
  payload: any;
  source?: string;
}

interface SessionUpdateMessage extends AdminRealtimeWebSocketMessage {
  type: 'session.updated' | 'session.created' | 'session.completed';
  payload: {
    session: any;
    propertyId?: string;
  };
}

interface EventReceivedMessage extends AdminRealtimeWebSocketMessage {
  type: 'event.received';
  payload: {
    event: any;
    sessionId: string;
    propertyId?: string;
  };
}

interface AnalyticsMetricsMessage extends AdminRealtimeWebSocketMessage {
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

interface AnalyticsFunnelMessage extends AdminRealtimeWebSocketMessage {
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

interface UseAdminRealtimeWebSocketOptions {
  onSessionUpdate?: (session: any) => void;
  onNewEvent?: (event: any, sessionId: string) => void;
  onMetricsUpdate?: (metrics: any) => void;
  onFunnelUpdate?: (funnel: any) => void;
  autoInvalidateQueries?: boolean;
  propertyId?: string;
}

function isSessionMessage(message: AdminRealtimeWebSocketMessage): message is SessionUpdateMessage {
  return message.type.startsWith('session.');
}

function isEventMessage(message: AdminRealtimeWebSocketMessage): message is EventReceivedMessage {
  return message.type === 'event.received';
}

function isAnalyticsMetricsMessage(message: AdminRealtimeWebSocketMessage): message is AnalyticsMetricsMessage {
  return message.type === 'analytics.metrics.updated';
}

function isAnalyticsFunnelMessage(message: AdminRealtimeWebSocketMessage): message is AnalyticsFunnelMessage {
  return message.type === 'analytics.funnel.updated';
}

export function useAdminRealtimeWebSocket(options: UseAdminRealtimeWebSocketOptions = {}) {
  const {
    onSessionUpdate,
    onNewEvent,
    onMetricsUpdate,
    onFunnelUpdate,
    autoInvalidateQueries = true,
    propertyId,
  } = options;

  const queryClient = useQueryClient();

  const handleMessage = useCallback(
    (message: AdminRealtimeWebSocketMessage) => {
      console.log('Received admin realtime message:', message.type, message);

      if (propertyId && message.payload.propertyId && message.payload.propertyId !== propertyId) {
        return;
      }

      if (isSessionMessage(message)) {
        const session = message.payload.session;

        if (autoInvalidateQueries) {
          queryClient.setQueryData(
            ['session', session.sessionId],
            session
          );

          queryClient.invalidateQueries({ queryKey: ['sessions'] });
          queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
        }

        onSessionUpdate?.(session);
      }

      if (isEventMessage(message)) {
        const { event, sessionId } = message.payload;

        if (autoInvalidateQueries) {
          queryClient.invalidateQueries({ queryKey: ['sessionEvents', sessionId] });
        }

        onNewEvent?.(event, sessionId);
      }

      if (isAnalyticsMetricsMessage(message)) {
        if (autoInvalidateQueries) {
          queryClient.invalidateQueries({ queryKey: ['analytics', 'metrics'] });
          queryClient.invalidateQueries({ queryKey: ['topMetrics'] });
          queryClient.invalidateQueries({ queryKey: ['realtimeMetrics'] });
        }

        onMetricsUpdate?.(message.payload);
      }

      if (isAnalyticsFunnelMessage(message)) {
        if (autoInvalidateQueries) {
          queryClient.invalidateQueries({ queryKey: ['analytics', 'funnel'] });
        }

        onFunnelUpdate?.(message.payload);
      }
    },
    [queryClient, autoInvalidateQueries, propertyId, onSessionUpdate, onNewEvent, onMetricsUpdate, onFunnelUpdate]
  );

  const useAdminWS = shouldUseAdminWS();
  const useFallback = useEventsWebSocketFallback();

  const adminWS = useAdminWebSocket({
    enabled: useAdminWS,
    onMessage: handleMessage as any,
    reconnectDelay: 60000,
    maxReconnectAttempts: 1,
  });

  const eventsWS = useRealtimeWebSocket({
    ...(useFallback || !useAdminWS ? options : {}),
    autoInvalidateQueries: useFallback || !useAdminWS ? autoInvalidateQueries : false,
    propertyId: useFallback || !useAdminWS ? propertyId : undefined,
  });

  useEffect(() => {
    const activeWS = useAdminWS && adminWS.isConnected ? adminWS : eventsWS;

    if (activeWS.isConnected) {
      const unsubscribers: (() => void)[] = [];

      unsubscribers.push(activeWS.subscribe('session.updated', handleMessage as any));
      unsubscribers.push(activeWS.subscribe('session.created', handleMessage as any));
      unsubscribers.push(activeWS.subscribe('session.completed', handleMessage as any));
      unsubscribers.push(activeWS.subscribe('event.received', handleMessage as any));
      unsubscribers.push(activeWS.subscribe('analytics.metrics.updated', handleMessage as any));
      unsubscribers.push(activeWS.subscribe('analytics.funnel.updated', handleMessage as any));
      unsubscribers.push(activeWS.subscribe('analytics.toplists.updated', handleMessage as any));

      if (activeWS.sendMessage) {
        activeWS.sendMessage({
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
    }
  }, [adminWS.isConnected, eventsWS.isConnected, useAdminWS, handleMessage, propertyId]);

  const isUsingAdminWS = useAdminWS && adminWS.isConnected;
  const isUsingEventsWS = (!useAdminWS || !adminWS.isConnected) && eventsWS.isConnected;

  return {
    isConnected: isUsingAdminWS || isUsingEventsWS,
    error: isUsingAdminWS ? adminWS.error : eventsWS.error,
    sendMessage: isUsingAdminWS ? adminWS.sendMessage : eventsWS.sendMessage,
    reconnect: isUsingAdminWS ? adminWS.reconnect : eventsWS.reconnect,
    disconnect: isUsingAdminWS ? adminWS.disconnect : eventsWS.disconnect,
    connectionType: isUsingAdminWS ? 'admin' : 'events',
    adminWS: {
      isEnabled: adminWS.isEnabled,
      isConnected: adminWS.isConnected,
      error: adminWS.error,
    },
    eventsWS: {
      isConnected: eventsWS.isConnected,
      error: eventsWS.error,
    },
  };
}