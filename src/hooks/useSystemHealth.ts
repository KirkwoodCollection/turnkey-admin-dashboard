import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { systemHealthApi } from '../api/systemHealth';
import type {
  SystemHealthResponse,
  ServiceHealthStatus,
  HealthDashboardState
} from '../types';

interface UseSystemHealthOptions {
  refetchInterval?: number;
  enabled?: boolean;
  historyHours?: number;
}

export const useSystemHealth = (options: UseSystemHealthOptions = {}) => {
  const { 
    refetchInterval = 30000, // 30 seconds default
    enabled = true,
    historyHours = 24
  } = options;

  const queryClient = useQueryClient();
  const { subscribe, isConnected } = useWebSocketContext();
  const [lastWebSocketUpdate, setLastWebSocketUpdate] = useState<string | null>(null);

  // System health query
  const {
    data: systemHealth,
    isLoading: isLoadingHealth,
    error: healthError,
    refetch: refetchHealth
  } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: systemHealthApi.getSystemHealth,
    refetchInterval,
    enabled,
    staleTime: 15000, // Consider data stale after 15 seconds
    gcTime: 60000, // Cache for 1 minute
  });

  // Health history query
  const {
    data: healthHistory = [],
    isLoading: isLoadingHistory,
    error: historyError
  } = useQuery({
    queryKey: ['healthHistory', historyHours],
    queryFn: () => systemHealthApi.getHealthHistory({ hours: historyHours }),
    refetchInterval: 60000, // Refetch every minute for history
    enabled,
    staleTime: 30000,
  });

  // Dependencies query
  const {
    data: dependencies = [],
    isLoading: isLoadingDependencies,
    error: dependenciesError
  } = useQuery({
    queryKey: ['serviceDependencies'],
    queryFn: systemHealthApi.getDependencies,
    refetchInterval: 300000, // Refetch every 5 minutes (dependencies change less frequently)
    enabled,
    staleTime: 240000, // 4 minutes
  });

  // Integration tests query
  const {
    data: integrationTests,
    isLoading: isLoadingTests,
    error: testsError
  } = useQuery({
    queryKey: ['integrationTests'],
    queryFn: systemHealthApi.getIntegrationTestResults,
    enabled,
    staleTime: 60000, // 1 minute
    refetchInterval: false, // Only refetch on demand
  });

  // System metrics query
  const {
    data: systemMetrics,
    isLoading: isLoadingMetrics,
    error: metricsError
  } = useQuery({
    queryKey: ['systemMetrics', '1h'],
    queryFn: () => systemHealthApi.getSystemMetrics('1h'),
    refetchInterval,
    enabled,
    staleTime: 15000,
  });

  // Run integration tests mutation
  const runIntegrationTestsMutation = useMutation({
    mutationFn: systemHealthApi.runIntegrationTests,
    onSuccess: (data) => {
      queryClient.setQueryData(['integrationTests'], data);
    },
    onError: (error) => {
      console.error('Failed to run integration tests:', error);
    }
  });

  // Get specific service health
  const getServiceHealth = useCallback(async (serviceId: string): Promise<ServiceHealthStatus | null> => {
    try {
      return await systemHealthApi.getServiceHealth(serviceId);
    } catch (error) {
      console.error(`Failed to get health for service ${serviceId}:`, error);
      return null;
    }
  }, []);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe('HEALTH_UPDATE', (message) => {
      console.log('Received health update:', message);
      setLastWebSocketUpdate(new Date().toISOString());
      
      // Update the cache with new health data
      if (message.payload && typeof message.payload === 'object') {
        const healthUpdate = message.payload as Partial<SystemHealthResponse>;
        
        // Update system health cache
        queryClient.setQueryData(['systemHealth'], (oldData: SystemHealthResponse | undefined) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            ...healthUpdate,
            timestamp: message.timestamp,
          };
        });

        // Invalidate related queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['systemMetrics'] });
        queryClient.invalidateQueries({ queryKey: ['healthHistory'] });
      }
    });

    return unsubscribe;
  }, [isConnected, subscribe, queryClient]);

  // Calculate overall health status
  const overallHealthStatus = systemHealth?.overall_status || 'unhealthy';
  
  // Get critical services (unhealthy services)
  const criticalServices = systemHealth?.services.filter(s => s.status === 'unhealthy') || [];
  
  // Get degraded services
  const degradedServices = systemHealth?.services.filter(s => s.status === 'degraded') || [];

  // Calculate uptime percentage from history
  const uptimePercentage = healthHistory.length > 0 
    ? (healthHistory.filter(h => h.status === 'healthy').length / healthHistory.length) * 100 
    : 0;

  // Aggregated loading state
  const isLoading = isLoadingHealth || isLoadingHistory || isLoadingDependencies || isLoadingMetrics;

  // Aggregated error state
  const error = healthError || historyError || dependenciesError || metricsError || testsError;

  // Dashboard state object
  const dashboardState: HealthDashboardState = {
    systemHealth: systemHealth || null,
    healthHistory,
    dependencies,
    integrationTests: integrationTests || null,
    metrics: systemMetrics || null,
    alerts: [], // TODO: Implement alerts from health data
    isLoading,
    error: error ? String(error) : null,
    lastUpdated: lastWebSocketUpdate || systemHealth?.timestamp || null
  };

  return {
    // Data
    systemHealth,
    healthHistory,
    dependencies,
    integrationTests,
    systemMetrics,
    dashboardState,

    // Computed values
    overallHealthStatus,
    criticalServices,
    degradedServices,
    uptimePercentage,
    healthySvervicesCount: systemHealth?.summary.healthy_services || 0,
    totalServicesCount: systemHealth?.summary.total_services || 0,

    // Loading states
    isLoading,
    isLoadingHealth,
    isLoadingHistory,
    isLoadingDependencies,
    isLoadingTests,
    isLoadingMetrics,

    // Error states  
    error,
    healthError,
    historyError,
    dependenciesError,
    testsError,
    metricsError,

    // Actions
    refetchHealth,
    runIntegrationTests: runIntegrationTestsMutation.mutate,
    isRunningTests: runIntegrationTestsMutation.isPending,
    getServiceHealth,

    // Real-time info
    lastWebSocketUpdate,
    isConnected,
  };
};