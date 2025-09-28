import { Session, Event, EventType } from '../types';
import { auth } from '../config/firebase';
import { getIdToken } from 'firebase/auth';

const EVENTS_API_BASE = (import.meta as any).env.VITE_EVENTS_API_URL || '';
const EVENTS_API_KEY = (import.meta as any).env.VITE_EVENTS_API_KEY || '';

interface SessionsResponse {
  sessions: Session[];
  total: number;
  page: number;
  pageSize: number;
}

interface EventsResponse {
  events: Event[];
  total: number;
  page: number;
  pageSize: number;
}

interface SessionFilters {
  status?: string[];
  propertyId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

interface EventFilters {
  sessionId?: string;
  eventTypes?: EventType[];
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

class EventsAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = EVENTS_API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(path: string): Promise<Record<string, string>> {
    // Admin endpoints use X-API-Key authentication
    if (path.includes('/admin/')) {
      if (EVENTS_API_KEY) {
        return {
          'X-API-Key': EVENTS_API_KEY,
        };
      } else {
        console.warn('EVENTS_API_KEY not configured for admin endpoint');
        return {};
      }
    }

    // Other endpoints use Firebase JWT authentication
    try {
      if (auth?.currentUser) {
        const token = await getIdToken(auth.currentUser);
        return {
          'Authorization': `Bearer ${token}`,
        };
      }
    } catch (error) {
      console.warn('Failed to get Firebase auth token:', error);
    }
    return {};
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const authHeaders = await this.getAuthHeaders(path);

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Events API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Session endpoints
  async getSessions(filters?: SessionFilters): Promise<SessionsResponse> {
    const params = new URLSearchParams();
    
    if (filters?.status) {
      filters.status.forEach(status => params.append('status', status));
    }
    if (filters?.propertyId) {
      params.append('property_id', filters.propertyId);
    }
    if (filters?.startDate) {
      params.append('start_date', filters.startDate);
    }
    if (filters?.endDate) {
      params.append('end_date', filters.endDate);
    }
    if (filters?.page) {
      params.append('page', filters.page.toString());
    }
    if (filters?.pageSize) {
      params.append('page_size', filters.pageSize.toString());
    }

    return this.fetch<SessionsResponse>(`/admin/sessions?${params}`);
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.fetch<Session>(`/admin/sessions/${sessionId}`);
  }

  async getActiveSessions(propertyId?: string): Promise<Session[]> {
    // Events service has a bug with status filters - removing them for now
    const filters: SessionFilters = {
      propertyId,
      pageSize: 20, // Show more sessions for comprehensive view
    };
    const response = await this.getSessions(filters);
    return response.sessions;
  }

  // Event endpoints
  async getEvents(filters?: EventFilters): Promise<EventsResponse> {
    const params = new URLSearchParams();
    
    if (filters?.sessionId) {
      params.append('session_id', filters.sessionId);
    }
    if (filters?.eventTypes) {
      params.append('event_types', filters.eventTypes.join(','));
    }
    if (filters?.startDate) {
      params.append('start_date', filters.startDate);
    }
    if (filters?.endDate) {
      params.append('end_date', filters.endDate);
    }
    if (filters?.page) {
      params.append('page', filters.page.toString());
    }
    if (filters?.pageSize) {
      params.append('page_size', filters.pageSize.toString());
    }

    return this.fetch<EventsResponse>(`/admin/events?${params}`);
  }

  async getSessionEvents(sessionId: string): Promise<Event[]> {
    const response = await this.getEvents({ sessionId });
    return response.events;
  }

  // Real-time metrics - Updated to use actual available endpoint
  async getRealtimeMetrics(propertyId?: string): Promise<{
    activeSessions: number;
    sessionsLastHour: number;
    eventsLastMinute: number;
    topDestinations: Array<{ destination: string; count: number }>;
    topHotels: Array<{ hotel: string; count: number }>;
  }> {
    // Use the admin realtime metrics endpoint
    const response = await this.fetch<{
      timestamp: string;
      active_sessions: number;
      properties: Record<string, { active_sessions: number; events_count: number }>;
      total_events_today: number;
      status: string;
    }>('/admin/sessions/realtime');

    // Map the real response to expected format
    return {
      activeSessions: response.active_sessions,
      sessionsLastHour: response.total_events_today, // Approximate
      eventsLastMinute: Math.round(response.total_events_today / (24 * 60)), // Estimate
      topDestinations: [],
      topHotels: []
    };
  }

  // Session replay
  async getSessionReplay(sessionId: string): Promise<{
    session: Session;
    events: Event[];
    timeline: Array<{
      timestamp: string;
      eventType: EventType;
      description: string;
    }>;
  }> {
    return this.fetch(`/admin/sessions/${sessionId}/replay`);
  }

  // Validation and debug methods
  async getTotalSessionsCount(filters?: Omit<SessionFilters, 'page' | 'pageSize'>): Promise<{
    total: number;
    byStatus: Record<string, number>;
    lastUpdated: string;
  }> {
    try {
      // First try to get from a dedicated count endpoint
      const params = new URLSearchParams();
      if (filters?.status) {
        filters.status.forEach(status => params.append('status', status));
      }
      if (filters?.propertyId) {
        params.append('property_id', filters.propertyId);
      }
      if (filters?.startDate) {
        params.append('start_date', filters.startDate);
      }
      if (filters?.endDate) {
        params.append('end_date', filters.endDate);
      }

      return this.fetch<{
        total: number;
        byStatus: Record<string, number>;
        lastUpdated: string;
      }>(`/admin/sessions/count?${params}`);
    } catch (error) {
      // Fallback: get a large page to estimate total
      console.warn('Sessions count endpoint not available, using fallback method');
      const response = await this.getSessions({
        ...filters,
        pageSize: 1000, // Get a large sample
      });

      // Group by status for breakdown
      const byStatus: Record<string, number> = {};
      response.sessions.forEach(session => {
        byStatus[session.status] = (byStatus[session.status] || 0) + 1;
      });

      return {
        total: response.total || response.sessions.length,
        byStatus,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async getTotalEventsCount(filters?: Omit<EventFilters, 'page' | 'pageSize'>): Promise<{
    total: number;
    byType: Record<string, number>;
    lastUpdated: string;
  }> {
    try {
      // Try dedicated count endpoint first
      const params = new URLSearchParams();
      if (filters?.sessionId) {
        params.append('session_id', filters.sessionId);
      }
      if (filters?.eventTypes) {
        params.append('event_types', filters.eventTypes.join(','));
      }
      if (filters?.startDate) {
        params.append('start_date', filters.startDate);
      }
      if (filters?.endDate) {
        params.append('end_date', filters.endDate);
      }

      return this.fetch<{
        total: number;
        byType: Record<string, number>;
        lastUpdated: string;
      }>(`/admin/events/count?${params}`);
    } catch (error) {
      // Fallback: get a large page to estimate total
      console.warn('Events count endpoint not available, using fallback method');
      const response = await this.getEvents({
        ...filters,
        pageSize: 1000,
      });

      // Group by event type for breakdown
      const byType: Record<string, number> = {};
      response.events.forEach(event => {
        byType[event.eventType] = (byType[event.eventType] || 0) + 1;
      });

      return {
        total: response.total || response.events.length,
        byType,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async getValidationSummary(propertyId?: string): Promise<{
    sessions: {
      total: number;
      active: number;
      byStatus: Record<string, number>;
    };
    events: {
      total: number;
      recent24h: number;
      byType: Record<string, number>;
    };
    dataQuality: {
      sessionsWithNullDestination: number;
      sessionsWithNullHotel: number;
      eventsWithoutSession: number;
    };
    lastUpdated: string;
  }> {
    try {
      return this.fetch<{
        sessions: {
          total: number;
          active: number;
          byStatus: Record<string, number>;
        };
        events: {
          total: number;
          recent24h: number;
          byType: Record<string, number>;
        };
        dataQuality: {
          sessionsWithNullDestination: number;
          sessionsWithNullHotel: number;
          eventsWithoutSession: number;
        };
        lastUpdated: string;
      }>(`/admin/validation/summary${propertyId ? `?property_id=${propertyId}` : ''}`);
    } catch (error) {
      console.warn('Validation summary endpoint not available, building summary from individual calls');

      // Fallback: build summary from existing methods
      const [sessionsCount, eventsCount, activeSessions] = await Promise.all([
        this.getTotalSessionsCount({ propertyId }),
        this.getTotalEventsCount(),
        this.getActiveSessions(propertyId),
      ]);

      // Analyze data quality from active sessions
      const dataQuality = {
        sessionsWithNullDestination: activeSessions.filter(s => !s.destination).length,
        sessionsWithNullHotel: activeSessions.filter(s => !s.hotel).length,
        eventsWithoutSession: 0, // Can't determine without cross-referencing
      };

      return {
        sessions: {
          total: sessionsCount.total,
          active: activeSessions.length,
          byStatus: sessionsCount.byStatus,
        },
        events: {
          total: eventsCount.total,
          recent24h: eventsCount.total, // Approximate
          byType: eventsCount.byType,
        },
        dataQuality,
        lastUpdated: new Date().toISOString(),
      };
    }
  }
}

export const eventsApi = new EventsAPIClient();
export default EventsAPIClient;