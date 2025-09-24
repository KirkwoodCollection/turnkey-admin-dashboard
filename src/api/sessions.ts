import { apiClient } from './client';
import { 
  Session, 
  AnalyticsEvent, 
  ApiResponse,
  SessionSchema,
  AnalyticsEventSchema 
} from '../types';

export const sessionsApi = {
  /**
   * Get session timeline/journey for a specific session
   */
  async getSessionTimeline(sessionId: string): Promise<AnalyticsEvent[]> {
    const response = await apiClient.events.get<ApiResponse<AnalyticsEvent[]>>(
      `/admin/sessions/${sessionId}/events`
    );

    return response.data.map((event: unknown) => AnalyticsEventSchema.parse(event));
  },

  /**
   * Get current live sessions
   */
  async getLiveSessions(): Promise<Session[]> {
    const response = await apiClient.events.get<ApiResponse<{
      sessions: Session[];
      total_count: number;
    }>>(
      '/admin/sessions',
      { params: { status: 'LIVE' } }
    );

    return response.data.sessions.map((session: unknown) => SessionSchema.parse(session));
  },

  /**
   * Get session conversion path statistics
   */
  async getConversionPaths(timeRange: string): Promise<Array<{
    path: string[];
    count: number;
    conversionRate: number;
  }>> {
    const response = await apiClient.analytics.get<ApiResponse<Array<{
      path: string[];
      count: number;
      conversion_rate: number;
    }>>>(
      '/analytics/conversion-paths',
      { params: { time_range: timeRange } }
    );

    return response.data.map(item => ({
      path: item.path,
      count: item.count,
      conversionRate: item.conversion_rate
    }));
  },

  /**
   * Get abandonment analysis
   */
  async getAbandonmentAnalysis(timeRange: string): Promise<{
    totalAbandoned: number;
    abandonmentRate: number;
    commonExitPoints: Array<{
      stage: string;
      count: number;
      percentage: number;
    }>;
    reasonsForAbandonment: Array<{
      reason: string;
      count: number;
    }>;
  }> {
    const response = await apiClient.analytics.get<ApiResponse<{
      total_abandoned: number;
      abandonment_rate: number;
      common_exit_points: Array<{
        stage: string;
        count: number;
        percentage: number;
      }>;
      reasons_for_abandonment: Array<{
        reason: string;
        count: number;
      }>;
    }>>(
      '/analytics/abandonment-analysis',
      { params: { time_range: timeRange } }
    );

    return {
      totalAbandoned: response.data.total_abandoned,
      abandonmentRate: response.data.abandonment_rate,
      commonExitPoints: response.data.common_exit_points,
      reasonsForAbandonment: response.data.reasons_for_abandonment
    };
  },

  /**
   * Search sessions by criteria
   */
  async searchSessions(query: {
    destination?: string;
    hotel?: string;
    dateRange?: { start: string; end: string };
    status?: string;
    userAgent?: string;
  }): Promise<Session[]> {
    // Convert query to admin sessions API format
    const params: any = {};
    if (query.destination) params.destination = query.destination;
    if (query.hotel) params.hotel = query.hotel;
    if (query.status) params.status = query.status;
    if (query.dateRange) params.since = query.dateRange.start;

    const response = await apiClient.events.get<ApiResponse<{
      sessions: Session[];
      total_count: number;
    }>>(
      '/admin/sessions',
      { params }
    );

    return response.data.sessions.map((session: unknown) => SessionSchema.parse(session));
  }
};