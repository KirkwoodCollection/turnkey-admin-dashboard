# Analytics API Integration Guide for Admin Dashboard

## Overview

This document provides comprehensive integration instructions for the Admin Dashboard to consume Analytics service APIs. The Analytics service is the single source of truth for all metrics, KPIs, and business intelligence data.

**⚠️ ADR-002 Update**: As of December 2024, real-time analytics data flows through the Admin WebSocket (`/ws/admin`) rather than direct Analytics WebSocket connections. This guide has been updated to reflect the new architecture.

## Service Architecture

```
Events Service → PubSub → Analytics Service → Admin Dashboard
                                    ↓
                            Pre-computed Metrics
```

## Base Configuration

### Service Endpoints
- **Development**: `http://localhost:8001`
- **Production**: `https://analytics.turnkeyhms.com` (when deployed)

### API Base Path
All analytics endpoints are prefixed with `/api/v1/`

## Core Analytics APIs

### 1. Overview Metrics (`/api/v1/metrics/overview`)

**Purpose**: Primary dashboard summary with key KPIs

**Request**:
```http
GET /api/v1/metrics/overview
```

**Response**:
```json
{
  "period": {
    "start": "2025-09-22T05:13:41.170830",
    "end": "2025-09-23T05:13:41.170830",
    "hours": 24
  },
  "conversion": {
    "conversion_rate": 5.4,
    "abandonment_rate": 94.6,
    "total_sessions": 294,
    "completed_bookings": 16,
    "abandoned_sessions": 278
  },
  "realtime": {
    "active_sessions": 2,
    "events_last_hour": 3,
    "events_by_type": {
      "booking_completed": 1,
      "reservation_confirmed": 2
    },
    "avg_events_per_session": 1.5
  },
  "timestamp": "2025-09-23T05:13:41.172378"
}
```

**Dashboard Usage**:
- **Hero Cards**: `conversion.conversion_rate`, `conversion.total_sessions`, `conversion.completed_bookings`
- **Live Status**: `realtime.active_sessions`, `realtime.events_last_hour`
- **Event Breakdown**: `realtime.events_by_type` for pie charts

**Refresh Rate**: Every 30 seconds for real-time data

---

### 2. Conversion Funnel (`/api/v1/metrics/funnel`)

**Purpose**: Multi-stage conversion funnel visualization

**Request**:
```http
GET /api/v1/metrics/funnel
```

**Response**:
```json
{
  "period": {
    "start": "2025-09-22T05:16:56.000000",
    "end": "2025-09-23T05:16:56.000000"
  },
  "funnel": [
    {
      "stage": "Visitors",
      "count": 294,
      "percentage": 100.0,
      "drop_off": 0,
      "drop_off_rate": 0
    },
    {
      "stage": "Search Initiated",
      "count": 166,
      "percentage": 56.46,
      "drop_off": 128,
      "drop_off_rate": 43.54
    },
    {
      "stage": "Room Selected",
      "count": 115,
      "percentage": 39.12,
      "drop_off": 51,
      "drop_off_rate": 30.72
    },
    {
      "stage": "Booking Completed",
      "count": 16,
      "percentage": 5.44,
      "drop_off": 99,
      "drop_off_rate": 86.09
    }
  ],
  "timestamp": "2025-09-23T05:16:56.681234"
}
```

**Dashboard Usage**:
- **Funnel Chart**: Use `stage`, `count`, `percentage` for visualization
- **Drop-off Analysis**: Use `drop_off` and `drop_off_rate` for insights
- **Conversion Tracking**: Track improvement over time

**Refresh Rate**: Every 5 minutes

---

### 3. Real-time Metrics (`/api/v1/metrics/realtime`)

**Purpose**: Live activity monitoring for operations dashboard

**Request**:
```http
GET /api/v1/metrics/realtime
```

**Response**:
```json
{
  "active_sessions": 2,
  "events_last_hour": 15,
  "events_last_15_minutes": 4,
  "events_by_type": {
    "widget_opened": 5,
    "search_initiated": 3,
    "booking_completed": 1,
    "room_selected": 6
  },
  "avg_events_per_session": 2.1,
  "peak_concurrent_sessions": 8,
  "timestamp": "2025-09-23T05:20:15.123456"
}
```

**Dashboard Usage**:
- **Live Counters**: `active_sessions`, `events_last_hour`
- **Activity Timeline**: `events_last_15_minutes` for trend charts
- **Event Type Distribution**: `events_by_type` for real-time monitoring

**Refresh Rate**: Every 15 seconds

---

### 4. Session Duration Analytics (`/api/v1/metrics/sessions/duration`)

**Purpose**: User engagement and session quality metrics

**Request**:
```http
GET /api/v1/metrics/sessions/duration
```

**Response**:
```json
{
  "avg_duration": 245.7,
  "median_duration": 180.5,
  "max_duration": 1205.2,
  "min_duration": 12.3,
  "duration_buckets": {
    "0-30s": 45,
    "30s-2m": 89,
    "2m-5m": 102,
    "5m-10m": 38,
    "10m+": 20
  },
  "total_sessions": 294,
  "period": {
    "start": "2025-09-22T05:00:00.000000",
    "end": "2025-09-23T05:00:00.000000"
  }
}
```

**Dashboard Usage**:
- **Engagement Metrics**: `avg_duration`, `median_duration`
- **Duration Distribution**: `duration_buckets` for histogram charts
- **Quality Indicators**: Sessions > 2 minutes indicate quality traffic

**Refresh Rate**: Every 10 minutes

---

### 5. Hourly Breakdown (`/api/v1/metrics/hourly`)

**Purpose**: Time-series data for trend analysis

**Request**:
```http
GET /api/v1/metrics/hourly?hours=24
```

**Response**:
```json
{
  "hourly_data": [
    {
      "hour": "2025-09-23 04:00",
      "sessions": 12,
      "events": 34,
      "bookings": 1,
      "conversion_rate": 8.33
    },
    {
      "hour": "2025-09-23 05:00",
      "sessions": 8,
      "events": 19,
      "bookings": 0,
      "conversion_rate": 0.0
    }
  ],
  "period": {
    "start": "2025-09-22T05:00:00.000000",
    "end": "2025-09-23T05:00:00.000000"
  },
  "totals": {
    "sessions": 294,
    "events": 1205,
    "bookings": 16
  }
}
```

**Dashboard Usage**:
- **Time Series Charts**: `hourly_data` for line graphs
- **Peak Analysis**: Identify high-traffic hours
- **Trend Detection**: Compare hourly conversion rates

**Refresh Rate**: Every 15 minutes

---

## Error Handling & Reliability

### HTTP Status Codes

- **200**: Success with data
- **503**: Service temporarily unavailable (show cached data)
- **404**: Endpoint not found
- **429**: Rate limit exceeded (slow down requests)

### Error Response Format
```json
{
  "error": "Service temporarily unavailable",
  "code": "INFRASTRUCTURE_ERROR",
  "retry_after": 30,
  "timestamp": "2025-09-23T05:20:15.123456"
}
```

### Graceful Degradation Strategy

1. **Cache Previous Data**: Store last successful response for 5 minutes
2. **Show Stale Data**: Display cached data with "Data may be delayed" indicator
3. **Retry Logic**: Exponential backoff (5s, 10s, 20s, 40s)
4. **Fallback UI**: Show simplified metrics or "Metrics temporarily unavailable"

---

## Performance Optimization

### Caching Strategy
- **Browser Cache**: Cache responses for 60 seconds
- **Request Batching**: Combine multiple API calls where possible
- **Conditional Requests**: Use ETags when available

### Request Patterns
```typescript
// Good: Single overview call
const metrics = await fetch('/api/v1/metrics/overview');

// Avoid: Multiple individual metric calls
const sessions = await fetch('/api/v1/metrics/sessions');
const funnel = await fetch('/api/v1/metrics/funnel');
const realtime = await fetch('/api/v1/metrics/realtime');
```

### Rate Limiting
- **Limit**: 60 requests per minute per IP
- **Burst**: Up to 10 requests per 10 seconds
- **Headers**: Check `X-RateLimit-Remaining` header

---

## Real-time Integration via Admin WebSocket (ADR-002)

### Admin WebSocket Connection

**Development URL**: `ws://localhost:8002/ws/admin?token=<admin-jwt>`
**Production URL**: `wss://api.turnkeyhms.com/ws/admin?token=<admin-jwt>`

**Note**: Admin Dashboard uses dedicated Admin WebSocket (not Analytics WebSocket) per ADR-002. Real-time analytics data flows through the Admin channel.

### Message Format

All Admin WebSocket messages follow this structure:
```typescript
interface AdminWebSocketMessage {
  id: string;
  timestamp: string;
  type: string;
  payload: any;
  source?: string; // Original service (analytics, events, etc.)
}
```

### Subscription Pattern

To receive analytics updates via Admin WebSocket:
```typescript
// Admin WebSocket subscription (handled automatically by useAdminWebSocket)
{
  "type": "subscribe",
  "payload": {
    "clientType": "admin",
    "propertyId": "hotel_123",
    "subscriptions": ["analytics.*", "session.*", "event.*"]
  }
}
```

### Message Types

#### 1. Metrics Updates (`analytics.metrics.updated`)
```typescript
{
  "type": "analytics.metrics.updated",
  "payload": {
    "activeUsers": 42,
    "totalSearches": 156,
    "bookRate": 5.4,
    "liveToBookRate": 3.2,
    "avgSearchDuration": 245.7,
    "propertyId": "hotel_123"
  }
}
```

#### 2. Funnel Updates (`analytics.funnel.updated`)
```typescript
{
  "type": "analytics.funnel.updated",
  "payload": {
    "stages": [
      {
        "stage": "Visitors",
        "count": 294,
        "percentage": 100.0,
        "dropOffRate": 0
      },
      {
        "stage": "Search Initiated",
        "count": 166,
        "percentage": 56.46,
        "dropOffRate": 43.54
      }
    ],
    "propertyId": "hotel_123"
  }
}
```

#### 3. Top Lists Updates (`analytics.toplists.updated`)
```typescript
{
  "type": "analytics.toplists.updated",
  "payload": {
    "destinations": [
      {
        "destination": "Paris",
        "count": 45,
        "percentage": 23.5,
        "rank": 1
      }
    ],
    "hotels": [
      {
        "hotelName": "Grand Hotel",
        "searches": 89,
        "bookings": 12,
        "conversionRate": 13.5,
        "rank": 1
      }
    ],
    "propertyId": "hotel_123"
  }
}
```

#### 4. Sessions Updates (`analytics.sessions.updated`)
```typescript
{
  "type": "analytics.sessions.updated",
  "payload": {
    "total": 294,
    "recentSessions": [
      {
        "sessionId": "sess_abc123",
        "status": "LIVE",
        "destination": "Paris",
        "hotel": "Grand Hotel",
        "currentStage": 2,
        "duration": 245
      }
    ],
    "propertyId": "hotel_123"
  }
}
```

### Implementation Example

```typescript
// React hook for Admin WebSocket with Analytics data
const useAnalyticsData = (propertyId?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use the Admin WebSocket hook instead of direct connection
    const { isConnected, subscribe } = useAdminWebSocket();

    // Subscribe to analytics events
    const unsubscribe = subscribe('analytics.metrics.updated', (message) => {
      handleAnalyticsMessage(message);
    });

    return unsubscribe;
  }, [propertyId]);

  return { isConnected, error };
};

// Usage in component
const MyDashboard = ({ propertyId }) => {
  const { isConnected } = useAnalyticsData(propertyId);

  return (
    <div>
      <div>Connection: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {/* Dashboard components */}
    </div>
  );
};

```

### Update Frequencies

- **Metrics Updates**: Every 30 seconds
- **Funnel Updates**: Every 5 minutes
- **Top Lists Updates**: Every 10 minutes
- **Session Updates**: Real-time (as events occur)

### Error Handling

Admin WebSocket disconnections should trigger:
1. Automatic token refresh and reconnection with exponential backoff
2. Fallback to REST API polling for analytics data
3. User notification of connection status
4. Emergency fallback to Events WebSocket if configured

---

## Authentication & Security

### Development
No authentication required for localhost testing.

### Production
- **JWT Tokens**: Include `Authorization: Bearer <token>` header
- **API Keys**: Alternative authentication via `X-API-Key` header
- **CORS**: Dashboard domain must be whitelisted

---

## Sample Integration Code

### React/TypeScript Example

```typescript
interface AnalyticsOverview {
  period: { start: string; end: string; hours: number };
  conversion: {
    conversion_rate: number;
    total_sessions: number;
    completed_bookings: number;
    abandoned_sessions: number;
  };
  realtime: {
    active_sessions: number;
    events_last_hour: number;
    events_by_type: Record<string, number>;
  };
}

class AnalyticsService {
  private baseUrl = 'http://localhost:8001/api/v1';

  async getOverview(): Promise<AnalyticsOverview> {
    const response = await fetch(`${this.baseUrl}/metrics/overview`);

    if (!response.ok) {
      throw new Error(`Analytics API error: ${response.status}`);
    }

    return response.json();
  }

  async getFunnel(): Promise<FunnelData> {
    const response = await fetch(`${this.baseUrl}/metrics/funnel`);
    return response.json();
  }
}

// Usage in React component
const Dashboard = () => {
  const [metrics, setMetrics] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await analyticsService.getOverview();
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError('Failed to load metrics');
        console.error('Analytics error:', err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <div className="error">Metrics temporarily unavailable</div>;
  }

  return (
    <div className="dashboard">
      <div className="metrics-cards">
        <MetricCard
          title="Conversion Rate"
          value={`${metrics?.conversion.conversion_rate}%`}
        />
        <MetricCard
          title="Total Sessions"
          value={metrics?.conversion.total_sessions}
        />
        <MetricCard
          title="Active Now"
          value={metrics?.realtime.active_sessions}
        />
      </div>
    </div>
  );
};
```

---

## Testing & Validation

### Health Check
```http
GET /health
```
Response: `{"status": "healthy", "timestamp": "..."}`

### Service Ready
```http
GET /ready
```
Response: `{"status": "ready", "checks": {...}}`

### Sample Data Validation
```bash
# Check if data is flowing
curl -s http://localhost:8001/api/v1/metrics/overview | jq '.realtime.events_last_hour'

# Should return a number > 0 if events are being processed
```

---

## Support & Troubleshooting

### Common Issues

1. **All Metrics Show Zero**
   - Cause: PubSub pipeline not delivering events
   - Solution: Check Infrastructure service status

2. **503 Service Unavailable**
   - Cause: Infrastructure dependencies down
   - Solution: Show cached data, implement fallback UI

3. **Slow API Responses**
   - Cause: High load or database issues
   - Solution: Implement request timeout (10s), show loading states

### Debug Information
- **Service Version**: Check `/` endpoint for version info
- **Logs**: Monitor Analytics service logs for errors
- **Infrastructure**: Verify PubSub topics and subscriptions exist

---

## Roadmap & Future APIs

### Planned Enhancements
- **Custom Date Ranges**: `?start_date=2025-09-01&end_date=2025-09-30`
- **Property Filtering**: `?property_id=hotel_123`
- **Cohort Analysis**: `/api/v1/analytics/cohorts`
- **A/B Testing**: `/api/v1/analytics/experiments`

### Breaking Changes
All breaking changes will be versioned (v2, v3) with 30-day deprecation notices.

---

## Contact & Support

- **Analytics Team**: For API questions and integration support
- **Infrastructure Team**: For PubSub and deployment issues
- **Events Team**: For raw event data questions

**This integration guide provides everything needed to build a comprehensive analytics dashboard consuming real-time booking engine metrics.**