import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics';
import { useTimeFilter } from '../contexts/TimeFilterContext';
import { DashboardMetrics } from '../types';

export const useDashboardData = () => {
  const { selectedFilter } = useTimeFilter();

  const {
    data: metrics,
    error,
    isLoading,
    refetch,
  } = useQuery<DashboardMetrics>({
    queryKey: ['dashboardMetrics', selectedFilter.value],
    queryFn: () => analyticsApi.getMetrics(selectedFilter.value),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
    // onSettled: () => setIsLoading(false), // Handled in component
  });

  const {
    data: funnelData,
    isLoading: funnelLoading,
  } = useQuery({
    queryKey: ['funnelData', selectedFilter.value],
    queryFn: () => analyticsApi.getFunnelData(selectedFilter.value),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const {
    data: topDestinations,
    isLoading: destinationsLoading,
  } = useQuery({
    queryKey: ['topDestinations', selectedFilter.value],
    queryFn: () => analyticsApi.getTopDestinations(selectedFilter.value, 10),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });

  const {
    data: topHotels,
    isLoading: hotelsLoading,
  } = useQuery({
    queryKey: ['topHotels', selectedFilter.value],
    queryFn: () => analyticsApi.getTopHotels(selectedFilter.value, 10),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    metrics,
    funnelData: funnelData || [],
    topDestinations: topDestinations || [],
    topHotels: topHotels || [],
    error,
    isLoading: isLoading || funnelLoading || destinationsLoading || hotelsLoading,
    refetch,
  };
};