import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TimeRange,
  TopMetrics,
  FunnelStage,
  TopDestination,
  TopHotel,
  SessionsResponse,
  HeatmapResponse,
  RealtimeMetrics
} from '../services/analyticsApi';


// Query keys for consistent caching
const ANALYTICS_QUERY_KEYS = {
  topMetrics: (timeRange: TimeRange, propertyId?: string) => ['analytics', 'topMetrics', timeRange, propertyId],
  funnelData: (timeRange: TimeRange, propertyId?: string) => ['analytics', 'funnel', timeRange, propertyId],
  topDestinations: (timeRange: TimeRange, limit: number, propertyId?: string) => ['analytics', 'topDestinations', timeRange, limit, propertyId],
  topHotels: (timeRange: TimeRange, limit: number, propertyId?: string) => ['analytics', 'topHotels', timeRange, limit, propertyId],
  sessions: (timeRange: TimeRange, limit: number, offset: number, propertyId?: string) => ['analytics', 'sessions', timeRange, limit, offset, propertyId],
  heatmap: (timeRange: TimeRange, propertyId?: string) => ['analytics', 'heatmap', timeRange, propertyId],
  realtimeMetrics: (propertyId?: string) => ['analytics', 'realtime', propertyId],
};

// Top metrics hook - uses Analytics API overview endpoint
export function useTopMetrics(timeRange: TimeRange = '24h', propertyId?: string) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.topMetrics(timeRange, propertyId),
    queryFn: async (): Promise<TopMetrics> => {
      const { analyticsApi } = await import('../services/analyticsApi');
      const overviewData = await analyticsApi.getOverview(timeRange, propertyId);
      return {
        activeUsers: overviewData.realtime.active_sessions,
        totalSearches: overviewData.conversion.total_sessions,
        bookRate: overviewData.conversion.conversion_rate * 100,
        leadTime: 0, // Not available in current API
        avgSearchDuration: 0, // Not available in current API
        timestamp: overviewData.timestamp
      };
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// Funnel data hook - uses Analytics API funnel endpoint
export function useFunnelData(timeRange: TimeRange = '24h', propertyId?: string) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.funnelData(timeRange, propertyId),
    queryFn: async (): Promise<FunnelStage[]> => {
      const { analyticsApi } = await import('../services/analyticsApi');
      const response = await analyticsApi.getFunnelData(timeRange, propertyId);
      return response.funnel || [];
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Top destinations hook - endpoint not available, return empty array for now
export function useTopDestinations(timeRange: TimeRange = '24h', limit = 10, propertyId?: string) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.topDestinations(timeRange, limit, propertyId),
    queryFn: async (): Promise<TopDestination[]> => {
      // Endpoint /top/destinations doesn't exist in current Analytics API
      return [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// Top hotels hook - endpoint not available, return empty array for now
export function useTopHotels(timeRange: TimeRange = '24h', limit = 10, propertyId?: string) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.topHotels(timeRange, limit, propertyId),
    queryFn: async (): Promise<TopHotel[]> => {
      // Endpoint /top/hotels doesn't exist in current Analytics API
      return [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// Sessions hook - returns empty data
export function useAnalyticsSessions(
  timeRange: TimeRange = '24h',
  limit = 50,
  offset = 0,
  propertyId?: string
) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.sessions(timeRange, limit, offset, propertyId),
    queryFn: async (): Promise<SessionsResponse> => {
      return {
        sessions: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize: 50,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        filters: {
          appliedFilters: []
        },
        timestamp: new Date().toISOString()
      };
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

// Heatmap data hook - returns empty data
export function useHeatmapData(timeRange: TimeRange = '7d', propertyId?: string) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.heatmap(timeRange, propertyId),
    queryFn: async (): Promise<HeatmapResponse> => {
      return {
        heatmapData: [],
        metadata: {
          type: 'destination_time',
          granularity: 'hour',
          xAxis: { label: 'Destination', values: [] },
          yAxis: { label: 'Time', values: [] },
          valueRange: { min: 0, max: 0, unit: 'count' }
        },
        period: {
          start: new Date().toISOString(),
          end: new Date().toISOString(),
        },
        timestamp: new Date().toISOString()
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// Real-time metrics hook - uses Analytics API overview endpoint
export function useRealtimeAnalyticsMetrics(propertyId?: string) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.realtimeMetrics(propertyId),
    queryFn: async (): Promise<RealtimeMetrics> => {
      const { analyticsApi } = await import('../services/analyticsApi');
      const overviewData = await analyticsApi.getOverview('24h', propertyId);
      return {
        active_sessions: overviewData.realtime.active_sessions,
        events_last_hour: overviewData.realtime.events_last_hour,
        events_last_15_minutes: 0,
        events_by_type: overviewData.realtime.events_by_type || {},
        avg_events_per_session: overviewData.realtime.avg_events_per_session,
        peak_concurrent_sessions: overviewData.realtime.active_sessions,
        timestamp: overviewData.timestamp
      };
    },
    staleTime: 5 * 1000,
    gcTime: 1 * 60 * 1000,
    refetchInterval: 10 * 1000,
  });
}

// Comprehensive dashboard data hook that fetches all needed data
export function useDashboardData(timeRange: TimeRange = '24h', propertyId?: string) {
  const topMetrics = useTopMetrics(timeRange, propertyId);
  const funnelData = useFunnelData(timeRange, propertyId);
  const topDestinations = useTopDestinations(timeRange, 10, propertyId);
  const topHotels = useTopHotels(timeRange, 10, propertyId);
  const realtimeMetrics = useRealtimeAnalyticsMetrics(propertyId);

  return {
    topMetrics,
    funnelData,
    topDestinations,
    topHotels,
    realtimeMetrics,
    isLoading: topMetrics.isLoading || funnelData.isLoading || topDestinations.isLoading || topHotels.isLoading,
    isError: topMetrics.isError || funnelData.isError || topDestinations.isError || topHotels.isError,
    error: topMetrics.error || funnelData.error || topDestinations.error || topHotels.error,
  };
}

// Utility hook for invalidating analytics queries (useful for WebSocket updates)
export function useInvalidateAnalytics() {
  const queryClient = useQueryClient();

  return {
    invalidateTopMetrics: (timeRange?: TimeRange, propertyId?: string) => {
      if (timeRange && propertyId !== undefined) {
        queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEYS.topMetrics(timeRange, propertyId) });
      } else {
        queryClient.invalidateQueries({ queryKey: ['analytics', 'topMetrics'] });
      }
    },
    invalidateFunnel: (timeRange?: TimeRange, propertyId?: string) => {
      if (timeRange && propertyId !== undefined) {
        queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEYS.funnelData(timeRange, propertyId) });
      } else {
        queryClient.invalidateQueries({ queryKey: ['analytics', 'funnel'] });
      }
    },
    invalidateTopLists: (_propertyId?: string) => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'topDestinations'] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'topHotels'] });
    },
    invalidateRealtime: (propertyId?: string) => {
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEYS.realtimeMetrics(propertyId) });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  };
}

// Export functionality hook - disabled since export endpoint doesn't exist
export function useExportAnalytics() {
  const exportData = async (
    timeRange: TimeRange,
    format: 'csv' | 'json' = 'csv',
    propertyId?: string
  ) => {
    console.warn('Export functionality disabled - endpoint not available');
    throw new Error('Export functionality not available');
  };

  return { exportData };
}