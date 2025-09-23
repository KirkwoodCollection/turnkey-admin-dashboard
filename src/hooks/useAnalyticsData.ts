import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  analyticsApi,
  TopMetrics,
  FunnelStage,
  TopDestination,
  TopHotel,
  HeatmapDataPoint,
  AnalyticsSession,
  TimeRange
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

// Top metrics hook
export function useTopMetrics(timeRange: TimeRange = '24h', propertyId?: string) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.topMetrics(timeRange, propertyId),
    queryFn: () => analyticsApi.getTopMetrics(timeRange, propertyId),
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Funnel data hook
export function useFunnelData(timeRange: TimeRange = '24h', propertyId?: string) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.funnelData(timeRange, propertyId),
    queryFn: () => analyticsApi.getFunnelData(timeRange, propertyId),
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Top destinations hook
export function useTopDestinations(timeRange: TimeRange = '24h', limit = 10, propertyId?: string) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.topDestinations(timeRange, limit, propertyId),
    queryFn: () => analyticsApi.getTopDestinations(timeRange, limit, propertyId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Top hotels hook
export function useTopHotels(timeRange: TimeRange = '24h', limit = 10, propertyId?: string) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.topHotels(timeRange, limit, propertyId),
    queryFn: () => analyticsApi.getTopHotels(timeRange, limit, propertyId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Sessions hook
export function useAnalyticsSessions(
  timeRange: TimeRange = '24h',
  limit = 50,
  offset = 0,
  propertyId?: string
) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.sessions(timeRange, limit, offset, propertyId),
    queryFn: () => analyticsApi.getSessions(timeRange, limit, offset, propertyId),
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true, // For pagination
  });
}

// Heatmap data hook
export function useHeatmapData(timeRange: TimeRange = '7d', propertyId?: string) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.heatmap(timeRange, propertyId),
    queryFn: () => analyticsApi.getHeatmapData(timeRange, propertyId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Real-time metrics hook
export function useRealtimeAnalyticsMetrics(propertyId?: string) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.realtimeMetrics(propertyId),
    queryFn: () => analyticsApi.getRealtimeMetrics(propertyId),
    staleTime: 5 * 1000, // 5 seconds for real-time
    cacheTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
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
        queryClient.invalidateQueries(ANALYTICS_QUERY_KEYS.topMetrics(timeRange, propertyId));
      } else {
        queryClient.invalidateQueries(['analytics', 'topMetrics']);
      }
    },
    invalidateFunnel: (timeRange?: TimeRange, propertyId?: string) => {
      if (timeRange && propertyId !== undefined) {
        queryClient.invalidateQueries(ANALYTICS_QUERY_KEYS.funnelData(timeRange, propertyId));
      } else {
        queryClient.invalidateQueries(['analytics', 'funnel']);
      }
    },
    invalidateTopLists: (propertyId?: string) => {
      queryClient.invalidateQueries(['analytics', 'topDestinations']);
      queryClient.invalidateQueries(['analytics', 'topHotels']);
    },
    invalidateRealtime: (propertyId?: string) => {
      queryClient.invalidateQueries(ANALYTICS_QUERY_KEYS.realtimeMetrics(propertyId));
    },
    invalidateAll: () => {
      queryClient.invalidateQueries(['analytics']);
    },
  };
}

// Export functionality hook
export function useExportAnalytics() {
  const queryClient = useQueryClient();

  const exportData = async (
    timeRange: TimeRange,
    format: 'csv' | 'json' = 'csv',
    propertyId?: string
  ) => {
    try {
      const blob = await analyticsApi.exportData(timeRange, format, propertyId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  };

  return { exportData };
}