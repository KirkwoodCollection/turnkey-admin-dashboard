import { apiClient } from './client';
import { ApiResponse } from '../types';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: {
    api: {
      status: 'up' | 'down';
      responseTime: number;
    };
    database: {
      status: 'up' | 'down';
      responseTime: number;
    };
    websocket: {
      status: 'up' | 'down';
      connections: number;
    };
    cache: {
      status: 'up' | 'down';
      hitRate: number;
    };
  };
  version: string;
  uptime: number;
}

export const healthApi = {
  /**
   * Check overall system health
   */
  async checkHealth(): Promise<HealthStatus> {
    const response = await apiClient.get<ApiResponse<HealthStatus>>('/health');
    return response.data;
  },

  /**
   * Check if the API is reachable
   */
  async ping(): Promise<{ pong: boolean; timestamp: string }> {
    const response = await apiClient.get<ApiResponse<{ pong: boolean; timestamp: string }>>(
      '/health/ping'
    );
    return response.data;
  },

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<{
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    activeConnections: number;
    requestsPerSecond: number;
  }> {
    const response = await apiClient.get<ApiResponse<{
      memoryUsage: number;
      cpuUsage: number;
      diskUsage: number;
      activeConnections: number;
      requestsPerSecond: number;
    }>>('/health/metrics');
    return response.data;
  }
};