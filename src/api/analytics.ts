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
    const response = await apiClient.analytics.get<ApiResponse<DashboardMetrics>>(
      '/analytics/metrics',
      {
        params: { time_range: timeRange }
      }
    );
    return response.data;
  },

  /**
   * Get conversion funnel data
   */
  async getFunnelData(timeRange: string): Promise<FunnelStage[]> {
    const response = await apiClient.analytics.get<ApiResponse<FunnelStage[]>>(
      '/analytics/funnel',
      {
        params: { time_range: timeRange }
      }
    );

    // Map the response data to match our funnel stages
    return response.data.map((stage, index) => ({
      name: FUNNEL_STAGES[index] || stage.name,
      count: stage.count,
      percentage: stage.percentage,
      dropOff: stage.drop_off || stage.dropOff
    }));
  },

  /**
   * Get heatmap data for user activity across dates and hours
   */
  async getHeatmapData(dateRange: { start: string; end: string }): Promise<HeatmapData[]> {
    const response = await apiClient.analytics.get<ApiResponse<HeatmapData[]>>(
      '/analytics/heatmap',
      {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end
        }
      }
    );
    return response.data;
  },

  /**
   * Get recent analytics events
   */
  async getRecentEvents(limit = 50): Promise<AnalyticsEvent[]> {
    const response = await apiClient.analytics.get<ApiResponse<AnalyticsEvent[]>>(
      '/analytics/events',
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
    const response = await apiClient.analytics.get<ApiResponse<PaginatedResponse<Session>>>(
      '/analytics/sessions',
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
    const response = await apiClient.analytics.get<ApiResponse<Session>>(
      `/analytics/sessions/${sessionId}`
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
    const response = await apiClient.analytics.get<ApiResponse<Array<{
      destination: string;
      count: number;
      percentage: number;
    }>>>(
      '/analytics/destinations',
      {
        params: { time_range: timeRange, limit }
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
    const response = await apiClient.analytics.get<ApiResponse<Array<{
      hotel: string;
      searches: number;
      bookings: number;
      conversion_rate: number;
    }>>>(
      '/analytics/hotels',
      {
        params: { time_range: timeRange, limit }
      }
    );

    // Map response to match interface
    return response.data.map(hotel => ({
      hotel: hotel.hotel,
      searches: hotel.searches,
      bookings: hotel.bookings,
      conversionRate: hotel.conversion_rate
    }));
  },

  /**
   * Get real-time active users count
   */
  async getActiveUsersCount(): Promise<number> {
    const response = await apiClient.analytics.get<ApiResponse<{ count: number }>>(
      '/analytics/active-users'
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
    const response = await apiClient.analytics.api.get(
      '/analytics/export',
      {
        params: { time_range: timeRange, format },
        responseType: 'blob'
      }
    );
    return response.data;
  }
};