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
    // Admin endpoints use X-Internal-API-Key authentication
    if (path.includes('/admin/')) {
      if (EVENTS_API_KEY) {
        return {
          'X-Internal-API-Key': EVENTS_API_KEY,
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
      params.append('status', filters.status.join(','));
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

    return this.fetch<SessionsResponse>(`/api/v1/admin/sessions?${params}`);
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.fetch<Session>(`/api/v1/admin/sessions/${sessionId}`);
  }

  async getActiveSessions(propertyId?: string): Promise<Session[]> {
    const filters: SessionFilters = {
      status: ['LIVE', 'DORMANT'],
      propertyId,
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

    return this.fetch<EventsResponse>(`/api/v1/admin/events?${params}`);
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
    }>('/api/v1/admin/sessions/realtime');

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
    return this.fetch(`/api/v1/admin/sessions/${sessionId}/replay`);
  }
}

export const eventsApi = new EventsAPIClient();
export default EventsAPIClient;