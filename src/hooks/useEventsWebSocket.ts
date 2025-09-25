import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import {
  EventsWebSocketMessage,
  isSessionMessage,
  isEventMessage,
  isMetricsMessage,
  EventReceivedMessage,
} from '../types/websocket';
import { Session } from '../types';

interface UseEventsWebSocketOptions {
  onSessionUpdate?: (session: Session) => void;
  onNewEvent?: (event: any, sessionId: string) => void;
  onMetricsUpdate?: (metrics: any) => void;
  autoInvalidateQueries?: boolean;
  propertyId?: string;
}

export function useEventsWebSocket(options: UseEventsWebSocketOptions = {}) {
  const {
    onSessionUpdate,
    onNewEvent,
    onMetricsUpdate,
    autoInvalidateQueries = true,
    propertyId,
  } = options;

  const queryClient = useQueryClient();
  const eventsWsUrl = process.env.REACT_APP_EVENTS_WS_URL || 'ws://localhost:8002/ws';

  const handleMessage = useCallback(
    (message: EventsWebSocketMessage) => {
      // Handle session messages
      if (isSessionMessage(message)) {
        switch (message.type) {
          case 'session.updated':
          case 'session.created':
          case 'session.completed':
            const session = message.payload.session;
            
            // Filter by propertyId if specified
            if (propertyId && (session as any).propertyId !== propertyId) {
              return;
            }

            // Update React Query cache
            if (autoInvalidateQueries) {
              queryClient.setQueryData(
                ['session', session.sessionId],
                session
              );
              
              // Invalidate sessions list to refetch
              queryClient.invalidateQueries({ queryKey: ['sessions'] });
              queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
            }

            // Call custom handler
            onSessionUpdate?.(session);
            break;
        }
      }

      // Handle event messages
      if (isEventMessage(message)) {
        switch (message.type) {
          case 'event.received':
            const { event, sessionId } = (message as EventReceivedMessage).payload;
            
            // Invalidate session events cache
            if (autoInvalidateQueries) {
              queryClient.invalidateQueries({ queryKey: ['sessionEvents', sessionId] });
            }

            // Call custom handler
            onNewEvent?.(event, sessionId);
            break;
            
          case 'events.batch':
            const { events, sessionId: batchSessionId } = message.payload;
            
            // Invalidate session events cache
            if (autoInvalidateQueries) {
              queryClient.invalidateQueries({ queryKey: ['sessionEvents', batchSessionId] });
            }

            // Call custom handler for each event
            events.forEach((event: any) => {
              onNewEvent?.(event, batchSessionId);
            });
            break;
        }
      }

      // Handle metrics messages
      if (isMetricsMessage(message)) {
        // Invalidate metrics queries
        if (autoInvalidateQueries) {
          queryClient.invalidateQueries({ queryKey: ['realtimeMetrics'] });
        }

        // Call custom handler
        onMetricsUpdate?.(message.payload);
      }
    },
    [queryClient, autoInvalidateQueries, propertyId, onSessionUpdate, onNewEvent, onMetricsUpdate]
  );

  const {
    isConnected,
    error,
    subscribe,
    sendMessage,
    reconnect,
    disconnect,
  } = useWebSocket({
    url: eventsWsUrl,
    onMessage: handleMessage as any,
  });

  // Subscribe to relevant message types on mount
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Subscribe to all session-related messages
    unsubscribers.push(subscribe('session.updated', handleMessage as any));
    unsubscribers.push(subscribe('session.created', handleMessage as any));
    unsubscribers.push(subscribe('session.completed', handleMessage as any));
    
    // Subscribe to event messages
    unsubscribers.push(subscribe('event.received', handleMessage as any));
    unsubscribers.push(subscribe('events.batch', handleMessage as any));
    
    // Subscribe to metrics messages
    unsubscribers.push(subscribe('metrics.updated', handleMessage as any));
    unsubscribers.push(subscribe('funnel.updated', handleMessage as any));
    unsubscribers.push(subscribe('toplists.updated', handleMessage as any));

    // Send initial subscription message with propertyId if specified
    if (isConnected && propertyId) {
      sendMessage({
        type: 'subscribe' as any,
        payload: { propertyId },
      });
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [subscribe, handleMessage, isConnected, sendMessage, propertyId]);

  return {
    isConnected,
    error,
    sendMessage,
    reconnect,
    disconnect,
  };
}