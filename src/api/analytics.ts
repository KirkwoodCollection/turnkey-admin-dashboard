import { apiClient } from './client';
import { 
  DashboardMetrics, 
  FunnelStage, 
  HeatmapData, 
  Session, 
  AnalyticsEvent, 
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  SessionSchema, 
  AnalyticsEventSchema,
  FUNNEL_STAGES
} from '../types';

export const analyticsApi = {
  /**
   * Get dashboard metrics for the specified time range
   */
  async getMetrics(timeRange: string): Promise<DashboardMetrics> {
    const response = await apiClient.get<ApiResponse<DashboardMetrics>>(
      '/api/v1/analytics/metrics', 
      {
        params: { timeRange }
      }
    );
    return response.data;
  },

  /**
   * Get conversion funnel data
   */
  async getFunnelData(timeRange: string): Promise<FunnelStage[]> {
    const response = await apiClient.get<ApiResponse<FunnelStage[]>>(
      '/api/v1/analytics/funnel', 
      {
        params: { timeRange }
      }
    );
    
    // Map the response data to match our funnel stages
    return response.data.map((stage, index) => ({
      name: FUNNEL_STAGES[index] || stage.name,
      count: stage.count,
      percentage: stage.percentage,
      dropOff: stage.dropOff
    }));
  },

  /**
   * Get heatmap data for user activity across dates and hours
   */
  async getHeatmapData(dateRange: { start: string; end: string }): Promise<HeatmapData[]> {
    const response = await apiClient.get<ApiResponse<HeatmapData[]>>(
      '/api/v1/analytics/heatmap', 
      {
        params: dateRange
      }
    );
    return response.data;
  },

  /**
   * Get recent analytics events
   */
  async getRecentEvents(limit = 50): Promise<AnalyticsEvent[]> {
    const response = await apiClient.get<ApiResponse<AnalyticsEvent[]>>(
      '/api/v1/analytics/events', 
      {
        params: { limit }
      }
    );
    
    // Validate each event with Zod
    return response.data.map((event: unknown) => AnalyticsEventSchema.parse(event));
  },

  /**
   * Get paginated session data
   */
  async getSessions(params: PaginationParams & { 
    timeRange?: string; 
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<Session>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Session>>>(
      '/api/v1/analytics/sessions',
      { params }
    );
    
    // Validate each session
    const validatedData = {
      ...response.data,
      data: response.data.data.map((session: unknown) => SessionSchema.parse(session))
    };
    
    return validatedData;
  },

  /**
   * Get session details by ID
   */
  async getSessionById(sessionId: string): Promise<Session> {
    const response = await apiClient.get<ApiResponse<Session>>(
      `/api/v1/analytics/sessions/${sessionId}`
    );
    
    return SessionSchema.parse(response.data);
  },

  /**
   * Get top destinations with counts
   */
  async getTopDestinations(timeRange: string, limit = 10): Promise<Array<{
    destination: string;
    count: number;
    percentage: number;
  }>> {
    const response = await apiClient.get<ApiResponse<Array<{
      destination: string;
      count: number;
      percentage: number;
    }>>>(
      '/api/v1/analytics/destinations',
      {
        params: { timeRange, limit }
      }
    );
    return response.data;
  },

  /**
   * Get top hotels with search and booking metrics
   */
  async getTopHotels(timeRange: string, limit = 10): Promise<Array<{
    hotel: string;
    searches: number;
    bookings: number;
    conversionRate: number;
  }>> {
    const response = await apiClient.get<ApiResponse<Array<{
      hotel: string;
      searches: number;
      bookings: number;
      conversionRate: number;
    }>>>(
      '/api/v1/analytics/hotels',
      {
        params: { timeRange, limit }
      }
    );
    return response.data;
  },

  /**
   * Get real-time active users count
   */
  async getActiveUsersCount(): Promise<number> {
    const response = await apiClient.get<ApiResponse<{ count: number }>>(
      '/api/v1/analytics/active-users'
    );
    return response.data.count;
  },

  /**
   * Export analytics data
   */
  async exportData(
    timeRange: string, 
    format: 'csv' | 'json' = 'csv'
  ): Promise<Blob> {
    const response = await apiClient.api.get(
      '/api/v1/analytics/export',
      {
        params: { timeRange, format },
        responseType: 'blob'
      }
    );
    return response.data;
  }
};