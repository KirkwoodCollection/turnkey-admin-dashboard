import { apiClient } from './client';
import { ApiResponse } from '../types';

export interface ServiceHealthStatus {
  service_name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  response_time_ms: number;
  timestamp: string;
  version?: string;
  uptime_seconds?: number;
  error_message?: string;
  dependencies?: {
    [key: string]: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      response_time_ms: number;
      error?: string;
    };
  };
  metrics?: {
    cpu_usage?: number;
    memory_usage?: number;
    disk_usage?: number;
    request_count?: number;
    error_rate?: number;
    active_connections?: number;
    cache_hit_rate?: number;
    queue_depth?: number;
  };
}

export interface SystemHealthResponse {
  overall_status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: ServiceHealthStatus[];
  summary: {
    total_services: number;
    healthy_services: number;
    unhealthy_services: number;
    degraded_services: number;
    average_response_time: number;
  };
}

export interface HealthHistoryPoint {
  timestamp: string;
  service_name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  response_time_ms: number;
  error_message?: string;
}

export interface ServiceDependency {
  service_name: string;
  depends_on: string[];
  dependent_services: string[];
  critical_path: boolean;
}

export interface IntegrationTestResult {
  test_name: string;
  status: 'passed' | 'failed' | 'running';
  duration_ms: number;
  timestamp: string;
  error_message?: string;
  details?: Record<string, unknown>;
}

export interface IntegrationTestSuite {
  overall_status: 'passed' | 'failed' | 'running';
  timestamp: string;
  tests: IntegrationTestResult[];
  summary: {
    total_tests: number;
    passed: number;
    failed: number;
    duration_ms: number;
  };
}

export const systemHealthApi = {
  /**
   * Get current system health status for all services
   */
  async getSystemHealth(): Promise<SystemHealthResponse> {
    const response = await apiClient.analytics.get<ApiResponse<SystemHealthResponse>>('/system/health');
    return response.data;
  },

  /**
   * Get health status for a specific service
   */
  async getServiceHealth(serviceId: string): Promise<ServiceHealthStatus> {
    const response = await apiClient.analytics.get<ApiResponse<ServiceHealthStatus>>(`/system/health/services/${serviceId}`);
    return response.data;
  },

  /**
   * Get historical health data
   */
  async getHealthHistory(params: {
    hours?: number;
    service?: string;
    limit?: number;
  } = {}): Promise<HealthHistoryPoint[]> {
    const searchParams = new URLSearchParams();
    if (params.hours) searchParams.set('hours', params.hours.toString());
    if (params.service) searchParams.set('service', params.service);
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const response = await apiClient.analytics.get<ApiResponse<HealthHistoryPoint[]>>(
      `/system/health/history?${searchParams.toString()}`
    );
    return response.data;
  },

  /**
   * Get service dependency information
   */
  async getDependencies(): Promise<ServiceDependency[]> {
    const response = await apiClient.analytics.get<ApiResponse<ServiceDependency[]>>('/system/health/dependencies');
    return response.data;
  },

  /**
   * Run integration tests
   */
  async runIntegrationTests(): Promise<IntegrationTestSuite> {
    const response = await apiClient.analytics.post<ApiResponse<IntegrationTestSuite>>('/system/health/integration-test');
    return response.data;
  },

  /**
   * Get latest integration test results
   */
  async getIntegrationTestResults(): Promise<IntegrationTestSuite> {
    const response = await apiClient.analytics.get<ApiResponse<IntegrationTestSuite>>('/system/health/integration-test');
    return response.data;
  },

  /**
   * Get aggregated metrics for dashboard
   */
  async getSystemMetrics(timeRange: '1h' | '6h' | '24h' | '7d' = '1h'): Promise<{
    timestamp: string;
    overall_response_time: number;
    error_rate: number;
    uptime_percentage: number;
    active_services: number;
    critical_alerts: number;
    warning_alerts: number;
    service_metrics: Array<{
      service_name: string;
      avg_response_time: number;
      error_rate: number;
      uptime_percentage: number;
      request_count: number;
    }>;
  }> {
    const response = await apiClient.get<ApiResponse<{
      timestamp: string;
      overall_response_time: number;
      error_rate: number;
      uptime_percentage: number;
      active_services: number;
      critical_alerts: number;
      warning_alerts: number;
      service_metrics: Array<{
        service_name: string;
        avg_response_time: number;
        error_rate: number;
        uptime_percentage: number;
        request_count: number;
      }>;
    }>>(`/system/health/metrics?range=${timeRange}`);
    return response.data;
  }
};