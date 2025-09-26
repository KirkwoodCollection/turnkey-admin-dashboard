import { useQuery } from '@tanstack/react-query';
import { useTimeFilter } from '../contexts/TimeFilterContext';
import { DashboardMetrics } from '../types';

// Simple API method that calls the working /sessions endpoint
const getSessionsData = async () => {
  const response = await fetch('/sessions');
  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  }
  return response.json();
};

export const useDashboardData = () => {
  const { selectedFilter } = useTimeFilter();

  const {
    data: sessionsData,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['sessionsData', selectedFilter.value],
    queryFn: getSessionsData,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Transform the real sessions data into the expected format
  const metrics: DashboardMetrics | undefined = sessionsData ? {
    activeUsers: sessionsData.active_sessions,
    totalEvents: sessionsData.total_events_today,
    avgSessionDuration: undefined,
    conversionRate: undefined,
    bounceRate: undefined,
    sessionsToday: sessionsData.active_sessions,
    timestamp: sessionsData.timestamp
  } : undefined;

  return {
    metrics,
    funnelData: undefined,
    topDestinations: undefined,
    topHotels: undefined,
    error,
    isLoading,
    refetch,
  };
};