import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSystemHealth } from '../hooks/useSystemHealth';
import { useWebSocketContext } from './WebSocketContext';
import type { 
  HealthDashboardState, 
  HealthAlert, 
  HealthStatus,
  ServiceHealthStatus 
} from '../types';

interface HealthContextType {
  // Core health data
  dashboardState: HealthDashboardState;
  overallStatus: HealthStatus;
  
  // Quick access to key metrics
  totalServices: number;
  healthyServices: number;
  criticalServices: ServiceHealthStatus[];
  degradedServices: ServiceHealthStatus[];
  
  // Alerts and notifications
  alerts: HealthAlert[];
  unreadAlertsCount: number;
  
  // Actions
  refreshHealth: () => void;
  markAlertAsRead: (alertId: string) => void;
  clearAllAlerts: () => void;
  
  // Real-time status
  isConnected: boolean;
  lastUpdate: string | null;
  
  // Settings
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
}

const HealthContext = createContext<HealthContextType | null>(null);

interface HealthProviderProps {
  children: React.ReactNode;
  defaultAutoRefresh?: boolean;
  defaultRefreshInterval?: number;
}

export const HealthProvider: React.FC<HealthProviderProps> = ({ 
  children,
  defaultAutoRefresh = true,
  defaultRefreshInterval = 30000,
}) => {
  const [autoRefresh, setAutoRefresh] = useState(defaultAutoRefresh);
  const [refreshInterval, setRefreshInterval] = useState(defaultRefreshInterval);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set());

  const {
    dashboardState,
    overallHealthStatus,
    systemHealth,
    criticalServices,
    degradedServices,
    refetchHealth,
    lastWebSocketUpdate,
    isConnected,
  } = useSystemHealth({
    refetchInterval: autoRefresh ? refreshInterval : false,
    enabled: true,
  });

  const { subscribe } = useWebSocketContext();

  // Generate alerts from health data
  useEffect(() => {
    if (!systemHealth) return;

    const newAlerts: HealthAlert[] = [];
    const timestamp = new Date().toISOString();

    // Critical service alerts
    criticalServices.forEach(service => {
      newAlerts.push({
        id: `critical-${service.service_name}-${timestamp}`,
        service_name: service.service_name,
        severity: 'critical',
        message: `Service ${service.service_name} is unhealthy: ${service.error_message || 'No response'}`,
        timestamp,
        resolved: false,
      });
    });

    // Degraded service alerts
    degradedServices.forEach(service => {
      newAlerts.push({
        id: `warning-${service.service_name}-${timestamp}`,
        service_name: service.service_name,
        severity: 'warning',
        message: `Service ${service.service_name} is degraded: Response time ${service.response_time_ms}ms`,
        timestamp,
        resolved: false,
      });
    });

    // System-wide alerts
    if (systemHealth.overall_status === 'unhealthy') {
      newAlerts.push({
        id: `system-unhealthy-${timestamp}`,
        service_name: 'system',
        severity: 'critical',
        message: `System overall health is unhealthy. ${systemHealth.summary.unhealthy_services} services are down.`,
        timestamp,
        resolved: false,
      });
    }

    // High error rate alert
    if (systemHealth.summary.unhealthy_services > systemHealth.summary.total_services * 0.5) {
      newAlerts.push({
        id: `high-error-rate-${timestamp}`,
        service_name: 'system',
        severity: 'critical',
        message: `High failure rate detected: ${systemHealth.summary.unhealthy_services}/${systemHealth.summary.total_services} services are failing`,
        timestamp,
        resolved: false,
      });
    }

    // Update alerts, avoiding duplicates
    setAlerts(prevAlerts => {
      const existingAlertIds = new Set(prevAlerts.map(alert => alert.id));
      const uniqueNewAlerts = newAlerts.filter(alert => !existingAlertIds.has(alert.id));
      
      // Keep only recent alerts (last 24 hours) and unresolved ones
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const filteredPrevAlerts = prevAlerts.filter(alert => 
        !alert.resolved || new Date(alert.timestamp).getTime() > oneDayAgo
      );

      return [...filteredPrevAlerts, ...uniqueNewAlerts];
    });
  }, [systemHealth, criticalServices, degradedServices]);

  // Subscribe to real-time health updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe('HEALTH_UPDATE', (message) => {
      // The useSystemHealth hook will handle the actual data updates
      // Here we can add any additional alert processing if needed
      console.log('Health update received in context:', message.type);
    });

    return unsubscribe;
  }, [isConnected, subscribe]);

  const markAlertAsRead = useCallback((alertId: string) => {
    setReadAlerts(prev => new Set([...prev, alertId]));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
    setReadAlerts(new Set());
  }, []);

  const refreshHealth = useCallback(() => {
    refetchHealth();
  }, [refetchHealth]);

  const unreadAlertsCount = alerts.filter(alert => 
    !readAlerts.has(alert.id) && !alert.resolved
  ).length;

  const contextValue: HealthContextType = {
    // Core health data
    dashboardState,
    overallStatus: overallHealthStatus,
    
    // Quick access metrics
    totalServices: systemHealth?.summary.total_services || 0,
    healthyServices: systemHealth?.summary.healthy_services || 0,
    criticalServices,
    degradedServices,
    
    // Alerts
    alerts,
    unreadAlertsCount,
    
    // Actions
    refreshHealth,
    markAlertAsRead,
    clearAllAlerts,
    
    // Real-time status
    isConnected,
    lastUpdate: lastWebSocketUpdate,
    
    // Settings
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
  };

  return (
    <HealthContext.Provider value={contextValue}>
      {children}
    </HealthContext.Provider>
  );
};

export const useHealthContext = (): HealthContextType => {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealthContext must be used within a HealthProvider');
  }
  return context;
};

// Hook for component that only need health status (optimized)
export const useHealthStatus = () => {
  const { overallStatus, totalServices, healthyServices, criticalServices, isConnected } = useHealthContext();
  
  return {
    status: overallStatus,
    totalServices,
    healthyServices,
    criticalServicesCount: criticalServices.length,
    isConnected,
  };
};

// Hook for components that only need alerts
export const useHealthAlerts = () => {
  const { alerts, unreadAlertsCount, markAlertAsRead, clearAllAlerts } = useHealthContext();
  
  return {
    alerts,
    unreadCount: unreadAlertsCount,
    markAsRead: markAlertAsRead,
    clearAll: clearAllAlerts,
  };
};