import { useQuery } from '@tanstack/react-query';
import { useTimeFilter } from '../contexts/TimeFilterContext';
import { DashboardMetrics } from '../types';
import { analyticsApi } from '../api/analytics';

export const useDashboardData = () => {
  const { selectedFilter } = useTimeFilter();

  // Fetch dashboard metrics
  const {
    data: metrics,
    error: metricsError,
    isLoading: metricsLoading,
  } = useQuery({
    queryKey: ['dashboardMetrics', selectedFilter.value],
    queryFn: () => analyticsApi.getMetrics(selectedFilter.value),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Fetch funnel data
  const {
    data: funnelData,
    error: funnelError,
    isLoading: funnelLoading,
  } = useQuery({
    queryKey: ['funnelData', selectedFilter.value],
    queryFn: () => analyticsApi.getFunnelData(selectedFilter.value),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });

  // Fetch top destinations
  const {
    data: topDestinations,
    error: destinationsError,
    isLoading: destinationsLoading,
  } = useQuery({
    queryKey: ['topDestinations', selectedFilter.value],
    queryFn: () => analyticsApi.getTopDestinations(selectedFilter.value, 10),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch top hotels
  const {
    data: topHotels,
    error: hotelsError,
    isLoading: hotelsLoading,
  } = useQuery({
    queryKey: ['topHotels', selectedFilter.value],
    queryFn: () => analyticsApi.getTopHotels(selectedFilter.value, 10),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Combine all errors
  const error = metricsError || funnelError || destinationsError || hotelsError;
  const isLoading = metricsLoading || funnelLoading || destinationsLoading || hotelsLoading;

  return {
    metrics,
    funnelData: funnelData || [],
    topDestinations: topDestinations || [],
    topHotels: topHotels || [],
    error,
    isLoading,
    refetch: () => {
      // Note: Individual refetch methods would be available from useQuery if needed
    },
  };
};