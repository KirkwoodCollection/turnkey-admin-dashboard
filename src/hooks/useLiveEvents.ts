import { useState, useEffect, useCallback } from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { WebSocketMessage, Session, ActivityRecord } from '../types';
import { throttle } from '../utils/rateLimiter';

export const useLiveEvents = () => {
  const [activeUsers, setActiveUsers] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityRecord[]>([]);
  const [liveSessions, setLiveSessions] = useState<Session[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { subscribe, isConnected } = useWebSocketContext();

  // Throttled update functions to prevent UI flooding
  const updateActiveUsers = useCallback(
    throttle((count: number) => {
      setActiveUsers(count);
      setLastUpdated(new Date());
    }, 1000),
    []
  );

  const addActivity = useCallback(
    throttle((activity: ActivityRecord) => {
      setRecentActivity(prev => {
        const updated = [activity, ...prev].slice(0, 100); // Keep only latest 100
        setLastUpdated(new Date());
        return updated;
      });
    }, 500),
    []
  );

  const updateSession = useCallback(
    throttle((session: Session) => {
      setLiveSessions(prev => {
        const index = prev.findIndex(s => s.sessionId === session.sessionId);
        let updated;
        
        if (index >= 0) {
          // Update existing session
          updated = [...prev];
          updated[index] = session;
        } else if (session.status === 'LIVE') {
          // Add new live session
          updated = [session, ...prev];
        } else {
          // Session no longer live, remove it
          updated = prev.filter(s => s.sessionId !== session.sessionId);
        }
        
        setLastUpdated(new Date());
        return updated.slice(0, 50); // Keep only latest 50 live sessions
      });
    }, 1000),
    []
  );

  // Set up WebSocket subscriptions
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribers: Array<() => void> = [];

    // Subscribe to user count updates
    unsubscribers.push(
      subscribe('USER_COUNT', (message: WebSocketMessage) => {
        if (typeof message.payload === 'object' && message.payload && 'count' in message.payload) {
          updateActiveUsers((message.payload as { count: number }).count);
        }
      })
    );

    // Subscribe to session updates
    unsubscribers.push(
      subscribe('SESSION_UPDATE', (message: WebSocketMessage) => {
        if (typeof message.payload === 'object' && message.payload) {
          try {
            const session = message.payload as Session;
            updateSession(session);
            
            // Create activity record
            const activity: ActivityRecord = {
              id: `${session.sessionId}-${Date.now()}`,
              sessionId: session.sessionId,
              event: getSessionEventDescription(session),
              timestamp: session.updatedAt,
              details: `${session.destination} - ${session.hotel}`,
              status: getActivityStatus(session.status)
            };
            addActivity(activity);
          } catch (error) {
            console.error('Error processing session update:', error);
          }
        }
      })
    );

    // Subscribe to new events
    unsubscribers.push(
      subscribe('NEW_EVENT', (message: WebSocketMessage) => {
        if (typeof message.payload === 'object' && message.payload) {
          try {
            const event = message.payload as { 
              sessionId: string; 
              eventType: string; 
              data: Record<string, unknown>;
              timestamp: string;
            };
            
            const activity: ActivityRecord = {
              id: `${event.sessionId}-${Date.now()}`,
              sessionId: event.sessionId,
              event: formatEventType(event.eventType),
              timestamp: event.timestamp,
              details: formatEventDetails(event.data),
              status: 'info'
            };
            addActivity(activity);
          } catch (error) {
            console.error('Error processing new event:', error);
          }
        }
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [isConnected, subscribe, updateActiveUsers, addActivity, updateSession]);

  return {
    activeUsers,
    recentActivity,
    liveSessions,
    lastUpdated,
    isConnected,
  };
};

// Helper functions
function getSessionEventDescription(session: Session): string {
  switch (session.status) {
    case 'LIVE':
      return 'Session started';
    case 'DORMANT':
      return 'Session idle';
    case 'CONFIRMED_BOOKING':
      return 'Booking confirmed';
    case 'ABANDONED':
      return 'Session abandoned';
    default:
      return 'Session updated';
  }
}

function getActivityStatus(status: string): ActivityRecord['status'] {
  switch (status) {
    case 'CONFIRMED_BOOKING':
      return 'success';
    case 'ABANDONED':
      return 'error';
    case 'DORMANT':
      return 'warning';
    default:
      return 'info';
  }
}

function formatEventType(eventType: string): string {
  return eventType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatEventDetails(data: Record<string, unknown>): string {
  if (data.destination && data.hotel) {
    return `${data.destination} - ${data.hotel}`;
  }
  if (data.action) {
    return String(data.action);
  }
  return 'Event details';
}