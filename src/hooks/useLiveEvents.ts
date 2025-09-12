import { useState, useEffect, useCallback } from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { WebSocketMessage, Session, ActivityRecord, EventType, EVENT_METADATA, EVENT_CATEGORIES } from '../types';
import { throttle } from '../utils/rateLimiter';

export const useLiveEvents = () => {
  const [activeUsers, setActiveUsers] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityRecord[]>([]);
  const [liveEvents, setLiveEvents] = useState<ActivityRecord[]>([]);
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
      
      // Also add to liveEvents for the new analytics components
      if (activity.metadata?.originalEventType) {
        setLiveEvents(prev => {
          const updated = [activity, ...prev].slice(0, 1000); // Keep more events for analytics
          return updated;
        });
      }
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

    // Subscribe to new events - enhanced for 28-event system
    unsubscribers.push(
      subscribe('NEW_EVENT', (message: WebSocketMessage) => {
        if (typeof message.payload === 'object' && message.payload) {
          try {
            const rawEvent = message.payload as { 
              sessionId?: string;
              session_id?: string;
              eventType?: string; 
              event_type?: string;
              data?: Record<string, unknown>;
              event_data?: Record<string, unknown>;
              timestamp: string;
              id?: string;
            };
            
            const activity = processLiveEvent(rawEvent);
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
    liveEvents,
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

// Enhanced event processing for 28 canonical events
function formatEventType(eventType: string): string {
  const metadata = EVENT_METADATA[eventType as EventType];
  return metadata?.label || eventType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getEventIcon(eventType: string): string {
  const metadata = EVENT_METADATA[eventType as EventType];
  return metadata?.icon || 'help_outline';
}

function getEventColor(eventType: string): string {
  const metadata = EVENT_METADATA[eventType as EventType];
  return metadata?.color || '#757575';
}

function getEventImportance(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
  const metadata = EVENT_METADATA[eventType as EventType];
  return metadata?.importance || 'medium';
}

function getEventCategory(eventType: string): string {
  for (const [category, events] of Object.entries(EVENT_CATEGORIES)) {
    if (events.includes(eventType as EventType)) {
      return category;
    }
  }
  return 'uncategorized';
}

// Enhanced activity record creation for 28-event system
function processLiveEvent(rawEvent: any): ActivityRecord {
  const eventType = rawEvent.event_type || rawEvent.eventType;
  const importance = getEventImportance(eventType);
  const category = getEventCategory(eventType);
  
  // Determine status based on event importance and type
  let status: ActivityRecord['status'] = 'info';
  if (eventType === EventType.RESERVATION_CONFIRMED) {
    status = 'success';
  } else if (eventType === EventType.BOOKING_ENGINE_EXITED && !rawEvent.data?.completed) {
    status = 'warning';
  } else if (importance === 'critical') {
    status = 'info';
  } else if (importance === 'low') {
    status = 'info';
  }
  
  return {
    id: rawEvent.id || `${rawEvent.sessionId || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sessionId: rawEvent.session_id || rawEvent.sessionId || 'unknown',
    event: formatEventType(eventType),
    timestamp: new Date(rawEvent.timestamp).toISOString(),
    details: formatEventDetails(rawEvent.data || rawEvent.event_data || {}, eventType),
    status: status,
    metadata: {
      originalEventType: eventType,
      icon: getEventIcon(eventType),
      color: getEventColor(eventType),
      importance: importance,
      category: category
    }
  };
}

function formatEventDetails(data: Record<string, unknown>, eventType: string): string {
  // Custom formatting based on event type
  switch (eventType) {
    case EventType.CHECKIN_DATE_SELECTED:
    case EventType.CHECKOUT_DATE_SELECTED:
      if (data.date) {
        return `Date: ${new Date(data.date as string).toLocaleDateString()}`;
      }
      break;
      
    case EventType.GUEST_COUNT_CHANGED:
      if (data.guests) {
        return `Guests: ${data.guests}`;
      }
      break;
      
    case EventType.ROOM_COUNT_CHANGED:
      if (data.rooms) {
        return `Rooms: ${data.rooms}`;
      }
      break;
      
    case EventType.ROOM_TYPE_SELECTED:
    case EventType.ROOM_RATE_SELECTED:
      if (data.room_type && data.rate) {
        return `${data.room_type} - $${data.rate}/night`;
      } else if (data.room_type) {
        return `Room: ${data.room_type}`;
      }
      break;
      
    case EventType.PAYMENT_METHOD_SELECTED:
      if (data.method) {
        return `Payment: ${data.method}`;
      }
      break;
      
    case EventType.SEARCH_SUBMITTED:
      const parts = [];
      if (data.destination) parts.push(`${data.destination}`);
      if (data.checkin && data.checkout) {
        parts.push(`${new Date(data.checkin as string).toLocaleDateString()} - ${new Date(data.checkout as string).toLocaleDateString()}`);
      }
      if (data.guests) parts.push(`${data.guests} guests`);
      return parts.join(' • ') || 'Search submitted';
      
    case EventType.RESERVATION_CONFIRMED:
      if (data.confirmation_code) {
        return `Confirmed: ${data.confirmation_code}`;
      }
      break;
  }
  
  // Fallback formatting
  if (data.destination && data.hotel) {
    return `${data.destination} - ${data.hotel}`;
  }
  if (data.action) {
    return String(data.action);
  }
  if (data.value) {
    return String(data.value);
  }
  
  return 'Event processed';
}