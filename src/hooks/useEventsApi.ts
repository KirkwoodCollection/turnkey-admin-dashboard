import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../services/eventsApi';
import { EventType } from '../types';

// Query keys
const QUERY_KEYS = {
  sessions: 'sessions',
  session: (id: string) => ['session', id],
  activeSessions: (propertyId?: string) => ['activeSessions', propertyId],
  events: 'events',
  sessionEvents: (sessionId: string) => ['sessionEvents', sessionId],
  realtimeMetrics: (propertyId?: string) => ['realtimeMetrics', propertyId],
  sessionReplay: (sessionId: string) => ['sessionReplay', sessionId],
};

// Session hooks
export function useSessions(filters?: {
  status?: string[];
  propertyId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: [QUERY_KEYS.sessions, filters],
    queryFn: () => eventsApi.getSessions(filters),
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSession(sessionId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.session(sessionId),
    queryFn: () => eventsApi.getSession(sessionId),
    enabled: !!sessionId,
    staleTime: 5 * 1000, // 5 seconds
  });
}

export function useActiveSessions(propertyId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.activeSessions(propertyId),
    queryFn: () => eventsApi.getActiveSessions(propertyId),
    staleTime: 5 * 1000, // 5 seconds for real-time data
    refetchInterval: 10 * 1000, // Poll every 10 seconds
  });
}

// Event hooks
export function useEvents(filters?: {
  sessionId?: string;
  eventTypes?: EventType[];
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: [QUERY_KEYS.events, filters],
    queryFn: () => eventsApi.getEvents(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useSessionEvents(sessionId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.sessionEvents(sessionId),
    queryFn: () => eventsApi.getSessionEvents(sessionId),
    enabled: !!sessionId,
    staleTime: 5 * 1000, // 5 seconds
  });
}

// Real-time metrics hook
export function useRealtimeMetrics(propertyId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.realtimeMetrics(propertyId),
    queryFn: () => eventsApi.getRealtimeMetrics(propertyId),
    staleTime: 2 * 1000, // 2 seconds for real-time
    refetchInterval: 5 * 1000, // Poll every 5 seconds
  });
}

// Session replay hook
export function useSessionReplay(sessionId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.sessionReplay(sessionId),
    queryFn: () => eventsApi.getSessionReplay(sessionId),
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Mutation hooks for invalidation on WebSocket updates
export function useInvalidateSessions() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.sessions] });
    queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
  };
}

export function useInvalidateSession(sessionId: string) {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session(sessionId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessionEvents(sessionId) });
  };
}

export function useInvalidateRealtimeMetrics() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['realtimeMetrics'] });
  };
}