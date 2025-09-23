# Turnkey Admin Dashboard Microservice

## Purpose
Delivers the hotelier-facing UI/UX as a **pure presentation layer**. Composes views across services and handles admin operations. **This service does not compute analytics** - it consumes pre-computed metrics from the Analytics service and real-time session signals via WebSocket.

## Microservice Boundaries

### What This Service OWNS
- **UI and UX**: React app/micro-frontend (layout, theming, routing, user preferences)
- **Thin Admin API layer**: UI-specific concerns only (exports, preferences, feature flags)
- **WebSocket subscription client**: Receives real-time updates (does not broadcast)
- **View composition**: Combines pre-computed metrics with live session data
- **Admin operations**: User management, property configuration (via API calls)

### What This Service CONSUMES
- **Analytics API**: All KPIs, funnels, heatmaps, top lists, trends from `/api/v1/analytics/*`
- **WebSocket feed**: Real-time session updates from Session/Events service
- **Firebase Auth**: Token validation only (does not issue tokens)

### What This Service DOES NOT DO
- **Database Access**: Never queries BigQuery, Firestore, or any database directly
- **Metric Computation**: Never calculates aggregates, rates, or any metrics
- **Event Processing**: Never transforms or processes raw events
- **WebSocket Broadcasting**: Does not push events to other services
- **Session Management**: Does not write or manage session lifecycle
- **Data Storage**: Never writes to any database

## Core Principles
1. **Presentation Only**: UI/UX layer that displays pre-computed metrics
2. **Database-Per-Service**: Never access other services' databases directly
3. **API-First Communication**: All cross-service data via APIs only
4. **Real-time via WebSocket**: Subscribe to events for live updates
5. **Cache-First Strategy**: Use React Query for intelligent caching
6. **No Client-Side Computation**: All metrics come pre-calculated from Analytics API

## Data Flow Architecture

### Real-Time Flow
```
Session/Events Service
        ↓
   WebSocket
        ↓
Admin Dashboard → Display live sessions, counters
```

### Analytics Flow
```
Analytics Service
        ↓
  Analytics API
        ↓
Admin Dashboard → Display KPIs, funnels, heatmaps
```

### Key Principles
- **No Direct DB Access**: All data via APIs
- **Event-Driven Updates**: WebSocket for real-time
- **Pre-Computed Metrics**: Analytics service owns all calculations
- **Separation of Concerns**: UI displays, never computes

## API Endpoints

### Consumed Analytics Endpoints
- `GET /api/v1/metrics/overview` - KPIs and totals
- `GET /api/v1/metrics/funnel` - Funnel stage analysis
- `GET /api/v1/metrics/realtime` - Live metrics
- `GET /api/v1/metrics/sessions/duration` - Session engagement metrics
- `GET /api/v1/metrics/hourly` - Time-series data
- `GET /api/v1/analytics/heatmap` - 2D heatmap data (pending documentation)
- `GET /api/v1/metrics/top/*` - Top lists (pending documentation)

### Exposed Admin Endpoints
- `GET /api/v1/admin/preferences` - User preferences
- `POST /api/v1/admin/export` - Export functionality
- `GET /api/v1/admin/features` - Feature flags

### WebSocket Events Consumed
```typescript
// Real-time session update
{
  "type": "session.updated",
  "data": {
    "session_id": "sess_abc123",
    "stage": "viewing_room",
    "timestamp": "2025-01-14T10:00:00Z"
  }
}

// Real-time counter update
{
  "type": "metrics.live",
  "data": {
    "active_sessions": 42,
    "sessions_last_hour": 156
  }
}
```

## Module Decision Matrix

| UI Module | Data Source | Display Method | Why |
|-----------|-------------|----------------|-----|
| **KPI Tiles** | Analytics API | Custom UI or Grafana | Pre-computed metrics |
| **Live Sessions** | WebSocket | Custom UI only | Real-time updates |
| **2D Heatmap** | Analytics API | Grafana preferred | Complex visualization |
| **Funnel** | Analytics API | Custom UI or Grafana | Stage analysis |
| **Top Lists** | Analytics API | Grafana preferred | Aggregated data |
| **Active Users** | WebSocket | Custom UI only | Live counter |
| **Revenue Trends** | Analytics API | Grafana preferred | Time-series data |
| **Alerts** | WebSocket | Custom UI only | Real-time notifications |

## RACI Matrix

| Capability | Responsible | Accountable | Consulted | Informed |
|------------|-------------|-------------|-----------|----------|
| **UI/UX Delivery** | Admin Dashboard | Admin Dashboard | Analytics | Session/Events |
| **Metrics Computation** | Analytics | Analytics | - | Admin Dashboard |
| **Session Management** | Session/Events | Session/Events | Analytics | Admin Dashboard |
| **WebSocket Broadcast** | Session/Events | Session/Events | - | Admin Dashboard |
| **Historical Analytics** | Analytics | Analytics | - | Admin Dashboard |
| **Real-time Display** | Admin Dashboard | Admin Dashboard | Session/Events | - |
| **User Preferences** | Admin Dashboard | Admin Dashboard | - | - |
| **Event Processing** | Session/Events | Session/Events | Analytics | Admin Dashboard |

## Anti-Patterns to Avoid

### ❌ NEVER DO THIS
```javascript
// WRONG - Direct database query
const query = `SELECT COUNT(*) FROM events WHERE...`;
const results = await bigquery.query(query);

// WRONG - Computing metrics in browser
const conversionRate = sessions.filter(s => s.booked).length / sessions.length;

// WRONG - Direct Firestore access
const sessions = await firestore.collection('sessions').get();
```

### ✅ ALWAYS DO THIS
```javascript
// CORRECT - Use Analytics API
const metrics = await fetch('/api/v1/analytics/metrics/overview');

// CORRECT - Display pre-computed metrics
const { conversionRate } = await analyticsAPI.getMetrics();

// CORRECT - Subscribe to WebSocket
ws.on('session.updated', (data) => updateUI(data));
```

## Development Guidelines

### Architecture Rules
- **Never query databases directly** - always use APIs
- **Never compute metrics** - request from Analytics API
- **Never process events** - display only
- **Never write to databases** - read-only service
- **Always use TypeScript** strict mode
- **Always implement error boundaries** for modules
- **Follow data flow**: UI → Hook → Service → API

### Technology Stack
- React 18+ with TypeScript
- WebSocket for real-time streaming
- React Query for cache management
- Module federation ready
- Firebase Auth (validation only)
- Optional Grafana embedding

### Performance Requirements
- Sub-100ms UI updates for real-time
- Graceful degradation on failures
- Support 100+ concurrent users
- Intelligent caching strategy

## Implementation Roadmap

### Phase A - Lock Boundaries (Immediate)
- Remove all direct database queries
- Implement Analytics API consumption
- Set up WebSocket subscriptions
- Document consumed endpoints

### Phase B - Grafana Integration (Next)
- Embed Grafana for historical dashboards
- Route `/admin/analytics/*` to Grafana
- Keep real-time in custom UI
- Ensure SSO consistency

### Phase C - Optimization (Future)
- Add circuit breakers
- Implement request tracing
- Optimize caching strategy
- Performance monitoring

## Critical Constraints

### Security
- No direct database access
- Token validation only
- Sanitize all user inputs
- Secure WebSocket connections

### Data Integrity
- Single source of truth: Analytics service
- No duplicate calculations
- Consistent metric definitions
- Event-driven updates

### Integration Points

#### Consumes From
- **Analytics Service**: All metrics via REST API
- **Session/Events Service**: Real-time via WebSocket
- **Auth Service**: Token validation

#### Provides To
- **End Users**: Hotelier dashboard UI
- **API Gateway**: Admin-specific endpoints

## Data Ownership Matrix

| Data Type | Owner Service | Admin Dashboard Role |
|-----------|--------------|---------------------|
| Session State | Session/Events | Display only via WebSocket |
| Raw Events | Session/Events | No access |
| Computed Metrics | Analytics | Display via API |
| Funnel Calculations | Analytics | Display via API |
| Heatmap Aggregations | Analytics | Display via API/Grafana |
| Historical Analytics | Analytics | Display via API/Grafana |
| WebSocket Broadcasts | Session/Events | Subscribe and display |
| UI State | **Admin Dashboard** | Full ownership |
| User Preferences | **Admin Dashboard** | Full ownership |

## Module Decision Framework

### Use Custom UI When:
- Real-time data via WebSocket (live tables, instant counters)
- Tight coupling to admin actions required
- Sub-second update requirements
- Unique interaction patterns
- Brand-specific UI requirements

### Use Grafana When:
- Historical/aggregate data from BigQuery
- Standard visualizations (charts, tables, maps)
- Can be expressed as SQL query/view
- Refresh-on-load semantics acceptable
- Complex time-series analysis

## Testing Strategy

### Unit Tests
- Component rendering tests
- Hook logic testing
- Service layer mocking

### Integration Tests
- API endpoint consumption
- WebSocket connection handling
- Error boundary behavior

### E2E Tests
- User flow validation
- Real-time update verification
- Cross-browser compatibility

## Monitoring & Observability

### Metrics to Track
- API response times
- WebSocket connection stability
- Component render performance
- Cache hit rates

### Logging
- User actions
- API errors
- WebSocket disconnections
- Performance bottlenecks

## Future Enhancements

### Planned Features
- Advanced filtering and segmentation UI
- Customizable dashboard layouts
- Export scheduling interface
- Alert configuration UI

### Technical Roadmap
- Micro-frontend architecture
- Progressive Web App capabilities
- Offline mode with sync
- Advanced state management

## Integration Guides

### External Service Integration
- [Analytics API Integration](./docs/integration/ANALYTICS_API_INTEGRATION.md) - Complete Analytics service integration guide with API contracts, WebSocket patterns, and error handling

## Related Documentation
- [SERVICE_BOUNDARIES.md](./docs/SERVICE_BOUNDARIES.md) - Detailed boundary definitions
- [ADMIN_DASHBOARD_SCOPE.md](./docs/ADMIN_DASHBOARD_SCOPE.md) - Service scope
- [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) - Deployment instructions
- Analytics Service CLAUDE.md - Analytics boundaries