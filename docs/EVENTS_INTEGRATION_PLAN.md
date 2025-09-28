# Admin Dashboard - Events Service Integration Plan

## ⚠️ DEPRECATED - ADR-002 Migration Completed

**Status**: This integration plan has been **SUPERSEDED** by ADR-002 implementation.

**New Architecture**: Admin Dashboard now uses dedicated Admin WebSocket with JWT authentication from Session service, eliminating direct dependency on Events service for real-time data.

**Migration Completed**: December 2024

---

## 🎯 Original Overview (For Historical Reference)

This document outlined the integration plan for the Admin Dashboard to leverage the enhanced TurnkeyHMS Events service capabilities. The integration provided real-time session monitoring, live statistics, and comprehensive booking funnel analytics.

**Note**: This approach has been replaced by the Admin WebSocket architecture per ADR-002.

## 📋 Integration Requirements

### Prerequisites
- ✅ Enhanced Events service deployed with admin endpoints
- ✅ WebSocket support configured in load balancer
- ✅ API authentication keys configured
- ✅ CORS origins updated to include admin dashboard domain

## 🔗 API Integration Points

### 1. Session Management API Client

**Create: `src/services/EventsApiClient.ts`**

```typescript
export interface SessionFilter {
  status?: 'LIVE' | 'DORMANT' | 'ABANDONED' | 'CONFIRMED_BOOKING';
  destination?: string;
  hotel?: string;
  since?: string;
  page?: number;
  pageSize?: number;
}

export interface SessionStats {
  total_sessions: number;
  active_sessions: number;
  dormant_sessions: number;
  abandoned_sessions: number;
  confirmed_bookings: number;
  conversion_rate: number;
  average_session_duration?: number;
  funnel_distribution: Record<string, number>;
  time_range: string;
  timestamp: string;
}

export class EventsApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Events API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getSessions(filters?: SessionFilter) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    return this.request(`/api/v1/sessions?${params}`);
  }

  async getActiveSessionCount(windowMinutes = 15) {
    return this.request(`/api/v1/sessions/active-count?window_minutes=${windowMinutes}`);
  }

  async getSessionStats(timeRange = '24h'): Promise<SessionStats> {
    return this.request(`/api/v1/sessions/stats?time_range=${timeRange}`);
  }

  async getSessionDetail(sessionId: string) {
    return this.request(`/api/v1/sessions/${sessionId}`);
  }

  async getSessionEvents(sessionId: string, limit = 50) {
    return this.request(`/api/v1/sessions/${sessionId}/events?limit=${limit}`);
  }
}
```

### 2. Real-time WebSocket Hook

**Create: `src/hooks/useEventsWebSocket.ts`**

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

export interface WebSocketMessage {
  type: string;
  timestamp: string;
  payload: any;
}

export interface WebSocketStats {
  connected: boolean;
  messagesReceived: number;
  connectionTime?: Date;
  lastMessageTime?: Date;
}

export const useEventsWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [stats, setStats] = useState<WebSocketStats>({
    connected: false,
    messagesReceived: 0,
  });
  
  // Message handlers
  const [sessionUpdates, setSessionUpdates] = useState<any[]>([]);
  const [activeUserCount, setActiveUserCount] = useState<number>(0);
  const [bookingNotifications, setBookingNotifications] = useState<any[]>([]);
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('Connected to Events WebSocket');
        setStats(prev => ({
          ...prev,
          connected: true,
          connectionTime: new Date(),
        }));
        
        // Reset reconnection attempts
        reconnectAttemptsRef.current = 0;
        
        // Send initial ping
        ws.send(JSON.stringify({ type: 'ping' }));
      };

      ws.onmessage = (event) => {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        setStats(prev => ({
          ...prev,
          messagesReceived: prev.messagesReceived + 1,
          lastMessageTime: new Date(),
        }));

        // Handle different message types
        switch (message.type) {
          case 'session_state_changed':
            setSessionUpdates(prev => [message.payload, ...prev.slice(0, 49)]);
            break;
            
          case 'session_updated':
            setSessionUpdates(prev => [message.payload, ...prev.slice(0, 49)]);
            break;
            
          case 'active_users_update':
            setActiveUserCount(message.payload.count);
            break;
            
          case 'booking_confirmed':
            setBookingNotifications(prev => [message.payload, ...prev.slice(0, 9)]);
            // Could trigger toast notification here
            break;
            
          case 'pong':
            // Handle ping/pong for connection health
            break;
            
          default:
            console.log('Unknown WebSocket message type:', message.type);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setStats(prev => ({ ...prev, connected: false }));
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setSocket(ws);
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [url, socket?.readyState]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: any) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, [socket]);

  return {
    socket,
    stats,
    sessionUpdates,
    activeUserCount,
    bookingNotifications,
    sendMessage,
    reconnect: connect,
  };
};
```

## 🖥️ UI Component Updates

### 1. Enhanced Top Stats Panel

**Update: `src/components/TopStatsPanel.tsx`**

```typescript
import React from 'react';
import { useEventsWebSocket } from '../hooks/useEventsWebSocket';
import { EventsApiClient } from '../services/EventsApiClient';

export const TopStatsPanel: React.FC = () => {
  const [stats, setStats] = useState(null);
  const { activeUserCount } = useEventsWebSocket(process.env.REACT_APP_EVENTS_WS_URL!);
  
  const eventsClient = new EventsApiClient(
    process.env.REACT_APP_EVENTS_API_URL!,
    process.env.REACT_APP_EVENTS_API_KEY!
  );

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await eventsClient.getSessionStats('24h');
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch session stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return <div>Loading stats...</div>;
  }

  return (
    <div className="stats-panel">
      <div className="stat-card">
        <h3>Active Users</h3>
        <div className="stat-value live-update">{activeUserCount}</div>
        <div className="stat-label">Right Now</div>
      </div>
      
      <div className="stat-card">
        <h3>Total Sessions</h3>
        <div className="stat-value">{stats.total_sessions}</div>
        <div className="stat-label">Last 24 Hours</div>
      </div>
      
      <div className="stat-card">
        <h3>Conversion Rate</h3>
        <div className="stat-value">{stats.conversion_rate}%</div>
        <div className="stat-label">
          {stats.confirmed_bookings} of {stats.total_sessions} sessions
        </div>
      </div>
      
      <div className="stat-card">
        <h3>Avg Session Time</h3>
        <div className="stat-value">
          {stats.average_session_duration ? 
            `${Math.round(stats.average_session_duration)}m` : 'N/A'}
        </div>
        <div className="stat-label">Average Duration</div>
      </div>
    </div>
  );
};
```

### 2. Real-time Session Table

**Update: `src/components/SessionRecordsTable.tsx`**

```typescript
import React, { useState, useEffect, useMemo } from 'react';
import { useEventsWebSocket } from '../hooks/useEventsWebSocket';
import { EventsApiClient } from '../services/EventsApiClient';

export const SessionRecordsTable: React.FC = () => {
  const [sessions, setSessions] = useState([]);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const { sessionUpdates } = useEventsWebSocket(process.env.REACT_APP_EVENTS_WS_URL!);
  
  const eventsClient = new EventsApiClient(
    process.env.REACT_APP_EVENTS_API_URL!,
    process.env.REACT_APP_EVENTS_API_KEY!
  );

  // Update sessions table when WebSocket updates arrive
  useEffect(() => {
    sessionUpdates.forEach(update => {
      setSessions(prev => 
        prev.map(session => 
          session.session_id === update.session_id 
            ? { ...session, ...update.updates, status: update.new_state || session.status }
            : session
        )
      );
    });
  }, [sessionUpdates]);

  const fetchSessions = async () => {
    try {
      const data = await eventsClient.getSessions({
        ...filters,
        ...pagination,
      });
      setSessions(data.sessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [filters, pagination]);

  return (
    <div className="session-table">
      <div className="table-header">
        <h2>Live Booking Sessions</h2>
        <div className="filters">
          <select 
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="">All Statuses</option>
            <option value="LIVE">Live</option>
            <option value="DORMANT">Dormant</option>
            <option value="ABANDONED">Abandoned</option>
            <option value="CONFIRMED_BOOKING">Completed</option>
          </select>
          
          <input 
            type="text" 
            placeholder="Filter by destination..."
            onChange={(e) => setFilters(prev => ({ ...prev, destination: e.target.value }))}
          />
        </div>
      </div>

      <table className="sessions-table">
        <thead>
          <tr>
            <th>Session ID</th>
            <th>Status</th>
            <th>Stage</th>
            <th>Destination</th>
            <th>Hotel</th>
            <th>Last Activity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map(session => (
            <tr 
              key={session.session_id} 
              className={`status-${session.status.toLowerCase()}`}
            >
              <td>{session.session_id.slice(0, 8)}...</td>
              <td>
                <span className={`status-badge ${session.status.toLowerCase()}`}>
                  {session.status}
                </span>
              </td>
              <td>{session.funnel_stage_name}</td>
              <td>{session.destination || 'N/A'}</td>
              <td>{session.hotel || 'N/A'}</td>
              <td>{new Date(session.last_activity).toLocaleString()}</td>
              <td>
                <button onClick={() => openSessionDetail(session.session_id)}>
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="pagination">
        <button 
          disabled={pagination.page === 1}
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
        >
          Previous
        </button>
        <span>Page {pagination.page}</span>
        <button 
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

### 3. Live Notifications Component

**Create: `src/components/LiveNotifications.tsx`**

```typescript
import React from 'react';
import { useEventsWebSocket } from '../hooks/useEventsWebSocket';

export const LiveNotifications: React.FC = () => {
  const { bookingNotifications, sessionUpdates } = useEventsWebSocket(
    process.env.REACT_APP_EVENTS_WS_URL!
  );

  return (
    <div className="live-notifications">
      <h3>Live Activity</h3>
      
      <div className="notification-feed">
        {bookingNotifications.slice(0, 5).map((booking, index) => (
          <div key={index} className="notification booking-notification">
            <div className="notification-icon">🎉</div>
            <div className="notification-content">
              <strong>Booking Confirmed!</strong>
              <p>Session {booking.session_id.slice(0, 8)} completed booking</p>
              <small>{new Date().toLocaleTimeString()}</small>
            </div>
          </div>
        ))}
        
        {sessionUpdates.slice(0, 10).map((update, index) => (
          <div key={index} className="notification session-notification">
            <div className="notification-icon">
              {update.new_state === 'ABANDONED' ? '❌' : 
               update.new_state === 'DORMANT' ? '😴' : '🔄'}
            </div>
            <div className="notification-content">
              <strong>Session Update</strong>
              <p>Session {update.session_id.slice(0, 8)} → {update.new_state}</p>
              <small>{new Date().toLocaleTimeString()}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## ⚙️ Configuration & Environment Variables

**Update: `.env.development`**
```bash
REACT_APP_EVENTS_API_URL=http://localhost:8080
REACT_APP_EVENTS_WS_URL=ws://localhost:8080/api/v1/ws
REACT_APP_EVENTS_API_KEY=your-development-api-key
```

**Update: `.env.production`**
```bash
REACT_APP_EVENTS_API_URL=https://events.turnkeyhms.com
REACT_APP_EVENTS_WS_URL=wss://events.turnkeyhms.com/api/v1/ws
REACT_APP_EVENTS_API_KEY=your-production-api-key
```

## 🎨 CSS Styling Additions

**Create: `src/styles/events-integration.css`**

```css
/* Live update animations */
.live-update {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

/* Status badges */
.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.status-badge.live {
  background-color: #10b981;
  color: white;
}

.status-badge.dormant {
  background-color: #f59e0b;
  color: white;
}

.status-badge.abandoned {
  background-color: #ef4444;
  color: white;
}

.status-badge.confirmed_booking {
  background-color: #8b5cf6;
  color: white;
}

/* Session table row highlighting */
.sessions-table tr.status-live {
  background-color: rgba(16, 185, 129, 0.1);
}

.sessions-table tr.status-dormant {
  background-color: rgba(245, 158, 11, 0.1);
}

.sessions-table tr.status-abandoned {
  background-color: rgba(239, 68, 68, 0.1);
}

/* Notification feed */
.live-notifications {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 300px;
  z-index: 1000;
}

.notification {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-out;
}

.booking-notification {
  background-color: #f0f9ff;
  border-left: 4px solid #3b82f6;
}

.session-notification {
  background-color: #fefce8;
  border-left: 4px solid #eab308;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

## 🧪 Testing Strategy

### Unit Tests

**Create: `src/services/__tests__/EventsApiClient.test.ts`**

```typescript
import { EventsApiClient } from '../EventsApiClient';

describe('EventsApiClient', () => {
  let client: EventsApiClient;

  beforeEach(() => {
    client = new EventsApiClient('http://localhost:8080', 'test-api-key');
    global.fetch = jest.fn();
  });

  test('getSessions makes correct API call', async () => {
    const mockResponse = { sessions: [], total_count: 0 };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await client.getSessions({ status: 'LIVE', page: 1 });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/sessions?status=LIVE&page=1',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-API-Key': 'test-api-key',
        }),
      })
    );

    expect(result).toEqual(mockResponse);
  });

  test('handles API errors correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
    });

    await expect(client.getSessions()).rejects.toThrow('Events API error: Unauthorized');
  });
});
```

### Integration Tests

**Create: `src/hooks/__tests__/useEventsWebSocket.test.ts`**

```typescript
import { renderHook, act } from '@testing-library/react';
import { useEventsWebSocket } from '../useEventsWebSocket';

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
})) as any;

describe('useEventsWebSocket', () => {
  test('establishes WebSocket connection', () => {
    const { result } = renderHook(() => 
      useEventsWebSocket('ws://localhost:8080/api/v1/ws')
    );

    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8080/api/v1/ws');
    expect(result.current.stats.connected).toBe(false);
  });

  test('handles session update messages', () => {
    const { result } = renderHook(() => 
      useEventsWebSocket('ws://localhost:8080/api/v1/ws')
    );

    const mockMessage = {
      type: 'session_updated',
      payload: { session_id: 'test-123', updates: { status: 'DORMANT' } },
    };

    // Simulate WebSocket message
    act(() => {
      // This would trigger the onmessage handler in real implementation
      // Test implementation depends on your testing setup
    });

    expect(result.current.sessionUpdates).toHaveLength(1);
  });
});
```

## 🚀 Deployment Integration

### Docker Configuration

**Update: `Dockerfile`**
```dockerfile
# Add build-time environment variables for API endpoints
ARG REACT_APP_EVENTS_API_URL
ARG REACT_APP_EVENTS_WS_URL
ARG REACT_APP_EVENTS_API_KEY

ENV REACT_APP_EVENTS_API_URL=$REACT_APP_EVENTS_API_URL
ENV REACT_APP_EVENTS_WS_URL=$REACT_APP_EVENTS_WS_URL
ENV REACT_APP_EVENTS_API_KEY=$REACT_APP_EVENTS_API_KEY
```

### Kubernetes Configuration

**Update: `k8s/deployment.yaml`**
```yaml
env:
  - name: REACT_APP_EVENTS_API_URL
    valueFrom:
      configMapKeyRef:
        name: admin-config
        key: events-api-url
  - name: REACT_APP_EVENTS_WS_URL
    valueFrom:
      configMapKeyRef:
        name: admin-config
        key: events-ws-url
  - name: REACT_APP_EVENTS_API_KEY
    valueFrom:
      secretKeyRef:
        name: admin-secrets
        key: events-api-key
```

## 📊 Performance Monitoring

### WebSocket Connection Health

```typescript
// Add to main App component
useEffect(() => {
  const { stats } = useEventsWebSocket(process.env.REACT_APP_EVENTS_WS_URL!);
  
  // Send connection health metrics to monitoring service
  if (window.analytics) {
    window.analytics.track('WebSocket Connection Health', {
      connected: stats.connected,
      messagesReceived: stats.messagesReceived,
      connectionDuration: stats.connectionTime ? 
        (Date.now() - stats.connectionTime.getTime()) / 1000 : 0,
    });
  }
}, []);
```

### API Performance Tracking

```typescript
// Add to EventsApiClient
private async request<T>(endpoint: string): Promise<T> {
  const startTime = performance.now();
  
  try {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    const duration = performance.now() - startTime;

    // Track API performance
    if (window.analytics) {
      window.analytics.track('Events API Request', {
        endpoint,
        duration,
        status: response.status,
        success: response.ok,
      });
    }

    if (!response.ok) {
      throw new Error(`Events API error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    const duration = performance.now() - startTime;
    
    if (window.analytics) {
      window.analytics.track('Events API Error', {
        endpoint,
        duration,
        error: error.message,
      });
    }
    
    throw error;
  }
}
```

## ✅ Implementation Checklist

### Phase 1: Core Integration
- [ ] Create EventsApiClient service
- [ ] Implement useEventsWebSocket hook
- [ ] Update environment configuration
- [ ] Add basic error handling

### Phase 2: UI Components  
- [ ] Update TopStatsPanel with real-time data
- [ ] Enhance SessionRecordsTable with WebSocket updates
- [ ] Create LiveNotifications component
- [ ] Add CSS styling for new features

### Phase 3: Testing & Validation
- [ ] Write unit tests for API client
- [ ] Write integration tests for WebSocket hook
- [ ] Perform end-to-end testing with Events service
- [ ] Load test WebSocket connections

### Phase 4: Production Deployment
- [ ] Configure production environment variables  
- [ ] Update deployment configurations
- [ ] Set up monitoring and alerting
- [ ] Deploy and monitor initial rollout

### Phase 5: Optimization
- [ ] Implement connection retry logic
- [ ] Add performance monitoring
- [ ] Optimize re-rendering with React.memo
- [ ] Add accessibility features

---

**Integration Status:** 🚧 Ready for Implementation
**Dependencies:** ✅ Enhanced Events Service  
**Estimated Timeline:** 2-3 sprints
**Risk Level:** 🟢 Low (builds on existing patterns)
