import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, Event } from '../types';
import { useAdminRealtimeWebSocket } from '../hooks/useAdminRealtimeWebSocket';
import { useActiveSessions, useRealtimeMetrics } from '../hooks/useEventsApi';

interface EventsContextValue {
  // Connection status
  isConnected: boolean;
  connectionError: Error | null;
  connectionType?: 'admin' | 'events';
  
  // Session data
  activeSessions: Session[];
  sessionHistory: Map<string, Session>;
  
  // Event data
  recentEvents: Event[];
  eventsBySession: Map<string, Event[]>;
  
  // Metrics
  metrics: {
    activeSessions: number;
    sessionsLastHour: number;
    eventsLastMinute: number;
    conversionRate?: number;
  } | null;
  
  // Property filtering
  selectedPropertyId: string | null;
  setSelectedPropertyId: (propertyId: string | null) => void;
  
  // Methods
  getSessionEvents: (sessionId: string) => Event[];
  clearHistory: () => void;
}

const EventsContext = createContext<EventsContextValue | undefined>(undefined);

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within EventsProvider');
  }
  return context;
}

interface EventsProviderProps {
  children: ReactNode;
  maxHistorySize?: number;
  maxRecentEvents?: number;
}

export const EventsProvider: React.FC<EventsProviderProps> = ({
  children,
  maxHistorySize = 100,
  maxRecentEvents = 50,
}) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<Map<string, Session>>(new Map());
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [eventsBySession, setEventsBySession] = useState<Map<string, Event[]>>(new Map());
  const [localActiveSessions, setLocalActiveSessions] = useState<Session[]>([]);

  // Fetch initial active sessions
  const { data: fetchedSessions } = useActiveSessions(selectedPropertyId || undefined);
  
  // Fetch real-time metrics
  const { data: metrics } = useRealtimeMetrics(selectedPropertyId || undefined);

  // Admin WebSocket connection with fallback
  const { isConnected, error: connectionError, connectionType } = useAdminRealtimeWebSocket({
    propertyId: selectedPropertyId || undefined,
    onSessionUpdate: (session: Session) => {
      // Update session history
      setSessionHistory(prev => {
        const updated = new Map(prev);
        updated.set(session.sessionId, session);
        
        // Limit history size
        if (updated.size > maxHistorySize) {
          const firstKey = updated.keys().next().value;
          if (firstKey !== undefined) {
            updated.delete(firstKey);
          }
        }
        
        return updated;
      });

      // Update active sessions
      setLocalActiveSessions(prev => {
        const index = prev.findIndex(s => s.sessionId === session.sessionId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = session;
          return updated;
        } else if (session.status === 'LIVE' || session.status === 'DORMANT') {
          return [session, ...prev];
        }
        return prev;
      });
    },
    onNewEvent: (event: Event, sessionId: string) => {
      // Add to recent events
      setRecentEvents(prev => {
        const updated = [event, ...prev];
        return updated.slice(0, maxRecentEvents);
      });

      // Add to session-specific events
      setEventsBySession(prev => {
        const updated = new Map(prev);
        const sessionEvents = updated.get(sessionId) || [];
        updated.set(sessionId, [...sessionEvents, event]);
        return updated;
      });
    },
  });

  // Initialize active sessions from API
  useEffect(() => {
    if (fetchedSessions && Array.isArray(fetchedSessions) && localActiveSessions.length === 0) {
      setLocalActiveSessions(fetchedSessions);

      // Add to session history
      const historyUpdate = new Map(sessionHistory);
      fetchedSessions.forEach((session: Session) => {
        historyUpdate.set(session.sessionId, session);
      });
      setSessionHistory(historyUpdate);
    }
  }, [fetchedSessions]);

  // Determine active sessions (prefer local state for real-time updates)
  const activeSessions = localActiveSessions.length > 0
    ? localActiveSessions
    : (Array.isArray(fetchedSessions) ? fetchedSessions : []);

  // Helper methods
  const getSessionEvents = (sessionId: string): Event[] => {
    return eventsBySession.get(sessionId) || [];
  };

  const clearHistory = () => {
    setSessionHistory(new Map());
    setRecentEvents([]);
    setEventsBySession(new Map());
  };

  const value: EventsContextValue = {
    isConnected,
    connectionError,
    connectionType,
    activeSessions,
    sessionHistory,
    recentEvents,
    eventsBySession,
    metrics: (metrics && typeof metrics === 'object' && 'activeSessions' in metrics) ? metrics : null,
    selectedPropertyId,
    setSelectedPropertyId,
    getSessionEvents,
    clearHistory,
  };

  return (
    <EventsContext.Provider value={value}>
      {children}
    </EventsContext.Provider>
  );
};