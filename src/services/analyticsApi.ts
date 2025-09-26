// import { apiClient } from '../api/client'; // Commented until needed

const ANALYTICS_API_BASE = '/api/v1';

// Analytics Overview Response (matches /api/v1/metrics/overview)
export interface AnalyticsOverview {
  period: {
    start: string;
    end: string;
    hours: number;
    timeRange?: string;
  };
  conversion: {
    conversion_rate: number;
    abandonment_rate: number;
    total_sessions: number;
    completed_bookings: number;
    abandoned_sessions: number;
  };
  realtime: {
    active_sessions: number;
    events_last_hour: number;
    events_by_type: Record<string, number>;
    avg_events_per_session: number;
  };
  timestamp: string;
}

// Legacy interface for backward compatibility
export interface TopMetrics {
  activeUsers: number;
  totalSearches: number;
  leadTime: number; // in hours
  bookRate: number; // percentage
  liveToBookRate: number; // percentage
  avgSearchDuration: number; // in seconds
  timestamp: string;
}

// Funnel Response (matches /api/v1/metrics/funnel)
export interface FunnelResponse {
  period: {
    start: string;
    end: string;
    timeRange?: string;
  };
  funnel: FunnelStage[];
  timestamp: string;
}

// Funnel stage interface
export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  drop_off: number;
  drop_off_rate: number;
}

// Top Destinations Response (matches /api/v1/top/destinations)
export interface TopDestinationsResponse {
  destinations: TopDestination[];
  period: {
    start: string;
    end: string;
  };
  total_searches: number;
  timestamp: string;
}

// Top destination interface
export interface TopDestination {
  destination: string;
  count: number;
  percentage: number;
  rank: number;
}

// Top Hotels Response (matches /api/v1/top/hotels)
export interface TopHotelsResponse {
  hotels: TopHotel[];
  period: {
    start: string;
    end: string;
  };
  totals: {
    searches: number;
    bookings: number;
    revenue: number;
  };
  timestamp: string;
}

// Top hotel interface
export interface TopHotel {
  hotelName: string;
  propertyId: string;
  searches: number;
  bookings: number;
  conversionRate: number;
  rank: number;
  revenue: number;
}

// Heatmap Response (matches /api/v1/analytics/heatmap)
export interface HeatmapResponse {
  heatmapData: HeatmapDataPoint[];
  metadata: {
    type: string;
    granularity: string;
    xAxis: {
      label: string;
      values: string[];
    };
    yAxis: {
      label: string;
      values: string[];
    };
    valueRange: {
      min: number;
      max: number;
      unit: string;
    };
  };
  period: {
    start: string;
    end: string;
  };
  timestamp: string;
}

// Heatmap data point
export interface HeatmapDataPoint {
  x: string; // X-axis value (destination, hotel, etc.)
  y: string; // Y-axis value (time, day, etc.)
  value: number; // activity count
  intensity: number; // 0-1 for color intensity
}

// Export Response (matches /api/v1/analytics/export)
export interface ExportResponse {
  exportData: any[];
  metadata: {
    exportType: string;
    format: string;
    recordCount: number;
    exportedAt: string;
    filters: Record<string, any>;
  };
}

// Sessions Response (matches /api/v1/analytics/sessions)
export interface SessionsResponse {
  sessions: AnalyticsSession[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    status?: string;
    appliedFilters: string[];
  };
  timestamp: string;
}

// Session record interface (enhanced)
export interface AnalyticsSession {
  sessionId: string;
  status: 'LIVE' | 'DORMANT' | 'CONFIRMED_BOOKING' | 'ABANDONED';
  destination: string;
  hotel: string;
  propertyId: string;
  currentStage: number;
  interactions: number;
  duration: number; // in seconds
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
  userAgent: string;
  events: Array<{
    eventType: string;
    timestamp: string;
  }>;
}

// Real-time metrics response
export interface RealtimeMetrics {
  active_sessions: number;
  events_last_hour: number;
  events_last_15_minutes: number;
  events_by_type: Record<string, number>;
  avg_events_per_session: number;
  peak_concurrent_sessions: number;
  timestamp: string;
}

// Session duration analytics response
export interface SessionDurationMetrics {
  avg_duration: number;
  median_duration: number;
  max_duration: number;
  min_duration: number;
  duration_buckets: Record<string, number>;
  total_sessions: number;
  period: {
    start: string;
    end: string;
  };
}

// Hourly breakdown response
export interface HourlyMetrics {
  hourly_data: Array<{
    hour: string;
    sessions: number;
    events: number;
    bookings: number;
    conversion_rate: number;
  }>;
  period: {
    start: string;
    end: string;
  };
  totals: {
    sessions: number;
    events: number;
    bookings: number;
  };
}

// Time range type
export type TimeRange = '1h' | '24h' | '7d' | '30d' | 'today' | 'custom';

// API response wrapper
interface ApiResponse<T> {
  data: T;
  success: boolean;
  timestamp: string;
}

class AnalyticsAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = ANALYTICS_API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Analytics API error: ${response.statusText}`);
    }

    const result: ApiResponse<T> = await response.json();
    return result.data;
  }

  // Analytics overview endpoint (replaces getTopMetrics) - Fallback implementation
  async getOverview(timeRange: TimeRange = '24h', propertyId?: string): Promise<AnalyticsOverview> {
    try {
      const params = new URLSearchParams();
      params.append('timeRange', timeRange);
      if (propertyId) {
        params.append('propertyId', propertyId);
      }

      return await this.fetch<AnalyticsOverview>(`/metrics/overview?${params}`);
    } catch (error) {
      console.warn('Analytics overview endpoint not available');
      throw error;
    }
  }

  // Legacy method for backward compatibility
  async getTopMetrics(timeRange: TimeRange = '24h', propertyId?: string): Promise<TopMetrics> {
    const overview = await this.getOverview(timeRange, propertyId);
    // Map new structure to legacy format
    return {
      activeUsers: overview.realtime.active_sessions,
      totalSearches: overview.conversion.total_sessions,
      leadTime: 0, // Not available in new API
      bookRate: overview.conversion.conversion_rate,
      liveToBookRate: overview.conversion.conversion_rate,
      avgSearchDuration: overview.realtime.avg_events_per_session * 30, // Estimate
      timestamp: overview.timestamp
    };
  }

  // Funnel data endpoint - With fallback
  async getFunnelData(timeRange: TimeRange = '24h', propertyId?: string): Promise<FunnelResponse> {
    try {
      const params = new URLSearchParams();
      params.append('timeRange', timeRange);
      if (propertyId) {
        params.append('propertyId', propertyId);
      }

      return await this.fetch<FunnelResponse>(`/metrics/funnel?${params}`);
    } catch (error) {
      console.warn('Funnel endpoint not available');
      throw error;
    }
  }

  // Legacy method returning just stages array
  async getFunnelStages(timeRange: TimeRange = '24h', propertyId?: string): Promise<FunnelStage[]> {
    const response = await this.getFunnelData(timeRange, propertyId);
    return response.funnel;
  }

  // Top destinations endpoint - With fallback
  async getTopDestinations(timeRange: TimeRange = '24h', limit = 10, propertyId?: string): Promise<TopDestinationsResponse> {
    try {
      const params = new URLSearchParams();
      params.append('timeRange', timeRange);
      params.append('limit', limit.toString());
      if (propertyId) {
        params.append('propertyId', propertyId);
      }

      return await this.fetch<TopDestinationsResponse>(`/top/destinations?${params}`);
    } catch (error) {
      console.warn('Top destinations endpoint not available');
      throw error;
    }
  }

  // Legacy method returning just destinations array
  async getTopDestinationsList(timeRange: TimeRange = '24h', limit = 10, propertyId?: string): Promise<TopDestination[]> {
    const response = await this.getTopDestinations(timeRange, limit, propertyId);
    return response.destinations;
  }

  // Top hotels endpoint
  async getTopHotels(timeRange: TimeRange = '24h', limit = 10, propertyId?: string): Promise<TopHotelsResponse> {
    const params = new URLSearchParams();
    params.append('timeRange', timeRange);
    params.append('limit', limit.toString());
    if (propertyId) {
      params.append('propertyId', propertyId);
    }

    return await this.fetch<TopHotelsResponse>(`/top/hotels?${params}`);
  }

  // Legacy method returning just hotels array
  async getTopHotelsList(timeRange: TimeRange = '24h', limit = 10, propertyId?: string): Promise<TopHotel[]> {
    const response = await this.getTopHotels(timeRange, limit, propertyId);
    return response.hotels;
  }

  // Session records endpoint
  async getSessions(
    page = 1,
    pageSize = 50,
    status?: string,
    destination?: string,
    propertyId?: string
  ): Promise<SessionsResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    if (status) params.append('status', status);
    if (destination) params.append('destination', destination);
    if (propertyId) params.append('propertyId', propertyId);

    return await this.fetch<SessionsResponse>(`/analytics/sessions?${params}`);
  }

  // Heatmap data endpoint
  async getHeatmapData(
    type: string = 'destination_time',
    granularity: string = 'hour',
    startDate?: string,
    endDate?: string,
    propertyId?: string
  ): Promise<HeatmapResponse> {
    const params = new URLSearchParams();
    params.append('type', type);
    params.append('granularity', granularity);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (propertyId) params.append('propertyId', propertyId);

    return await this.fetch<HeatmapResponse>(`/analytics/heatmap?${params}`);
  }

  // Real-time metrics endpoint
  async getRealtimeMetrics(propertyId?: string): Promise<RealtimeMetrics> {
    const params = propertyId ? `?propertyId=${propertyId}` : '';
    return this.fetch<RealtimeMetrics>(`/metrics/realtime${params}`);
  }

  // Session duration analytics
  async getSessionDuration(timeRange: TimeRange = '24h', propertyId?: string): Promise<SessionDurationMetrics> {
    const params = new URLSearchParams();
    params.append('timeRange', timeRange);
    if (propertyId) {
      params.append('propertyId', propertyId);
    }

    return this.fetch<SessionDurationMetrics>(`/metrics/sessions/duration?${params}`);
  }

  // Hourly breakdown metrics
  async getHourlyMetrics(hours: number = 24, propertyId?: string): Promise<HourlyMetrics> {
    const params = new URLSearchParams();
    params.append('hours', hours.toString());
    if (propertyId) {
      params.append('propertyId', propertyId);
    }

    return this.fetch<HourlyMetrics>(`/metrics/hourly?${params}`);
  }

  // Export functionality
  async exportData(
    format: 'csv' | 'json' | 'xlsx' = 'csv',
    type: 'sessions' | 'events' | 'metrics' | 'funnel' = 'sessions',
    startDate?: string,
    endDate?: string,
    filters?: Record<string, any>
  ): Promise<Blob | ExportResponse> {
    const params = new URLSearchParams();
    params.append('format', format);
    params.append('type', type);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (filters) params.append('filters', JSON.stringify(filters));

    const response = await fetch(`${this.baseUrl}/analytics/export?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    if (format === 'json') {
      return await response.json() as ExportResponse;
    } else {
      return await response.blob();
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.fetch('/health');
  }
}

export const analyticsApi = new AnalyticsAPIClient();
export default AnalyticsAPIClient;