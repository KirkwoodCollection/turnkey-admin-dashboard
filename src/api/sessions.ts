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
    const response = await apiClient.get<ApiResponse<AnalyticsEvent[]>>(
      `/api/v1/sessions/${sessionId}/timeline`
    );
    
    return response.data.map((event: unknown) => AnalyticsEventSchema.parse(event));
  },

  /**
   * Get current live sessions
   */
  async getLiveSessions(): Promise<Session[]> {
    const response = await apiClient.get<ApiResponse<Session[]>>(
      '/api/v1/sessions/live'
    );
    
    return response.data.map((session: unknown) => SessionSchema.parse(session));
  },

  /**
   * Get session conversion path statistics
   */
  async getConversionPaths(timeRange: string): Promise<Array<{
    path: string[];
    count: number;
    conversionRate: number;
  }>> {
    const response = await apiClient.get<ApiResponse<Array<{
      path: string[];
      count: number;
      conversionRate: number;
    }>>>(
      '/api/v1/sessions/conversion-paths',
      { params: { timeRange } }
    );
    
    return response.data;
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
    const response = await apiClient.get<ApiResponse<{
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
    }>>(
      '/api/v1/sessions/abandonment-analysis',
      { params: { timeRange } }
    );
    
    return response.data;
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
    const response = await apiClient.post<ApiResponse<Session[]>>(
      '/api/v1/sessions/search',
      query
    );
    
    return response.data.map((session: unknown) => SessionSchema.parse(session));
  }
};