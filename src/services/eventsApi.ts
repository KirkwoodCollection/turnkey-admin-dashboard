import { Session, Event, EventType } from '../types';

const EVENTS_API_BASE = process.env.REACT_APP_EVENTS_API_URL || 'http://localhost:8002/api/v1';

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

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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

    return this.fetch<SessionsResponse>(`/sessions?${params}`);
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.fetch<Session>(`/sessions/${sessionId}`);
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

    return this.fetch<EventsResponse>(`/events?${params}`);
  }

  async getSessionEvents(sessionId: string): Promise<Event[]> {
    const response = await this.getEvents({ sessionId });
    return response.events;
  }

  // Real-time metrics
  async getRealtimeMetrics(propertyId?: string): Promise<{
    activeSessions: number;
    sessionsLastHour: number;
    eventsLastMinute: number;
    topDestinations: Array<{ destination: string; count: number }>;
    topHotels: Array<{ hotel: string; count: number }>;
  }> {
    const params = propertyId ? `?property_id=${propertyId}` : '';
    return this.fetch(`/metrics/realtime${params}`);
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
    return this.fetch(`/sessions/${sessionId}/replay`);
  }
}

export const eventsApi = new EventsAPIClient();
export default EventsAPIClient;