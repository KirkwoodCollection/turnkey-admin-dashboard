# TurnkeyHMS Service Boundaries & Separation of Concerns

## Executive Summary

This document defines the **strict boundaries** between the Admin Dashboard, Analytics, and Session/Events microservices. Each service has clear ownership of specific capabilities, and **cross-service database access is forbidden**. This ensures scalability, maintainability, and prevents the "everyone hits Firestore directly" anti-pattern.

---

## 🎯 Service Definitions & Boundaries

### A. Admin Dashboard Microservice (`turnkey-admin-dashboard`)

#### PURPOSE
Deliver the hotelier-facing UI/UX, compose views across services, and handle admin operations. It **does not compute analytics** - it consumes them.

#### OWNS
- **UI and UX**: React app/micro-frontend (layout, theming, routing, user preferences)
- **Thin Admin API layer**: UI-specific concerns only (exports, preferences, feature flags)
- **WebSocket subscription client**: Receives real-time updates (does not broadcast)
- **View composition**: Combines pre-computed metrics with live session data
- **Admin operations**: User management, property configuration (via API calls)

#### CONSUMES
- **Analytics API**: For all KPIs, funnels, heatmaps, top lists, trends (pre-computed)
- **Admin WebSocket**: JWT-authenticated real-time connection for live activity display
- **Session Service**: Admin JWT token acquisition for WebSocket authentication
- **Firebase Auth**: Token validation for Session service authentication

#### DOES NOT
- ❌ Query BigQuery directly
- ❌ Compute aggregates in the browser
- ❌ Write to any database (Firestore, BigQuery, Redis)
- ❌ Own WebSocket broadcast logic
- ❌ Process or transform events

#### INGRESS & ROUTES
- UI served at: `admin.turnkeyhms.com`
- API endpoints: `/api/v1/admin/*` (thin layer for UI concerns)

---

### B. Analytics Microservice (`turnkey-analytics`)

#### PURPOSE
Be the **single source of truth** for all computed metrics. Computes, caches, and serves analytics backed by BigQuery (historical) and real-time layer.

#### OWNS
- **Metrics API**: `/api/v1/analytics/*` endpoints
  - `GET /metrics/overview` - Aggregated KPIs
  - `GET /metrics/funnel` - Funnel stage analysis
  - `GET /metrics/heatmap` - 2D heatmap matrices
  - `GET /metrics/top` - Top lists (destinations, hotels, etc.)
  - `GET /metrics/trends` - Time-series data
- **Historical analytics**: BigQuery queries and materialized views
- **Near-real-time layer**: Pub/Sub subscription with Redis/memory cache
- **Server-side computation**: All aggregation logic lives here
- **AI insights**: Optional narrative generation on metrics

#### CONSUMES
- **Event stream**: Via Pub/Sub (read-only)
- **BigQuery**: For historical queries (read-only)
- **Session service**: Occasional lookups if needed (read-only)

#### DOES NOT
- ❌ Manage WebSocket connections to browsers
- ❌ Own session lifecycle
- ❌ Write to session/event databases
- ❌ Serve UI components
- ❌ Handle authentication

#### INGRESS & ROUTES
- API endpoints: `/api/v1/analytics/*`
- No direct UI serving

---

### C. Session/Events Service (`turnkey-events`) - For Context

#### PURPOSE
Own session lifecycle, ingest events, and broadcast real-time updates to subscribers.

#### OWNS
- **Session state machine**: Creates, updates, expires sessions
- **Event ingestion**: Receives and validates events
- **WebSocket broadcast**: Pushes real-time updates to Admin Dashboard
- **Firestore writes**: Only service that writes session/event documents
- **Pub/Sub publishing**: Streams events for downstream consumption

#### DOES NOT
- ❌ Compute analytics (that's Analytics service)
- ❌ Serve UI (that's Admin Dashboard)
- ❌ Query BigQuery for metrics

---

## 📊 Data Flow Architecture

### Real-Time Flow (< 1 minute) - ADR-002 Compliant
```
User Action → Events Service → Firestore
                    ↓
                Pub/Sub
                ↙        ↘
        Admin WS       Analytics
       (JWT Auth)     (RT cache)
            ↓              ↓
        Admin UI    Analytics API
```

### Historical Flow (> 1 minute)
```
Events → BigQuery (batch load)
              ↓
        Analytics Service
         (SQL queries)
              ↓
        Analytics API
              ↓
      Admin UI / Grafana
```

### Key Principles
1. **Database-per-service**: Each service owns its data store
2. **No cross-service DB access**: Services communicate via APIs only
3. **Event-driven collaboration**: Use Pub/Sub for async communication
4. **Read/write separation**: Write-heavy (Events) vs read-heavy (Analytics)

---

## 🎭 Module Mapping

### What Goes Where - Decision Table

| UI Module | Data Type | Source Service | Display Method |
|-----------|-----------|---------------|----------------|
| **KPI Tiles** | Aggregated metrics | Analytics API | Custom UI or Grafana |
| **Live Session List** | Real-time events | Admin WebSocket | Custom UI only |
| **2D Heatmap** | Computed matrix | Analytics API | Grafana preferred |
| **Funnel Visualization** | Stage counts | Analytics API | Custom UI or Grafana |
| **Top Lists** | Grouped aggregates | Analytics API | Grafana preferred |
| **Active User Count** | Real-time counter | Admin WebSocket | Custom UI only |
| **Revenue Trends** | Time-series | Analytics API | Grafana preferred |
| **Alert Notifications** | Real-time events | Admin WebSocket | Custom UI only |

---

## 🔄 API Contract Examples

### Analytics API Response Shapes

```typescript
// GET /api/v1/analytics/metrics/overview
{
  "period": "last_24h",
  "property_id": "prop_123",
  "kpis": {
    "total_sessions": 1234,
    "conversion_rate": 0.023,
    "avg_session_duration": 245,
    "revenue": 45678.90
  },
  "timestamp": "2025-01-14T10:00:00Z"
}

// GET /api/v1/analytics/metrics/heatmap
{
  "dimensions": ["destination", "days_until_arrival"],
  "data": [
    {"destination": "Paris", "days_until_arrival": 7, "count": 45},
    {"destination": "London", "days_until_arrival": 14, "count": 32},
    // ... more data points
  ],
  "period": "last_7d"
}

// GET /api/v1/analytics/metrics/funnel
{
  "funnel_id": "booking_funnel",
  "stages": [
    {"name": "search", "count": 10000, "rate": 1.0},
    {"name": "view_details", "count": 4500, "rate": 0.45},
    {"name": "checkout", "count": 900, "rate": 0.09},
    {"name": "confirmed", "count": 234, "rate": 0.023}
  ],
  "period": "last_24h"
}
```

### Admin WebSocket Event Shapes (ADR-002)

Connection: `wss://api.turnkeyhms.com/ws/admin?token=<admin-jwt>`

```typescript
// Admin WebSocket authentication
{
  "type": "subscribe",
  "payload": {
    "clientType": "admin",
    "propertyId": "prop_123",
    "subscriptions": ["session.*", "event.*", "analytics.*"]
  }
}

// Real-time session update
{
  "type": "session.updated",
  "payload": {
    "session": {
      "sessionId": "sess_abc123",
      "propertyId": "prop_123",
      "stage": "viewing_room",
      "timestamp": "2025-01-14T10:00:00Z"
    }
  }
}

// Real-time analytics metrics
{
  "type": "analytics.metrics.updated",
  "payload": {
    "activeUsers": 42,
    "totalSearches": 156,
    "bookRate": 0.15,
    "propertyId": "prop_123"
  }
}
```

---

## 🚨 Anti-Patterns to Avoid

### ❌ NEVER DO THIS

1. **Admin Dashboard querying BigQuery directly**
   ```javascript
   // WRONG - Admin UI should never do this
   const query = `SELECT COUNT(*) FROM events WHERE...`;
   const results = await bigquery.query(query);
   ```

2. **Analytics service writing to Firestore**
   ```javascript
   // WRONG - Analytics is read-only
   await firestore.collection('sessions').doc(id).update({...});
   ```

3. **Computing metrics in the browser**
   ```javascript
   // WRONG - Computation belongs in Analytics service
   const conversionRate = sessions.filter(s => s.booked).length / sessions.length;
   ```

4. **Cross-service database access**
   ```javascript
   // WRONG - Use API instead
   const sessions = await otherService.database.collection('sessions').get();
   ```

### ✅ ALWAYS DO THIS

1. **Use APIs for cross-service communication**
   ```javascript
   // CORRECT - Use Analytics API
   const metrics = await fetch('/api/v1/analytics/metrics/overview');
   ```

2. **Subscribe to events via Admin WebSocket**
   ```javascript
   // CORRECT - Admin WebSocket with JWT
   const token = await adminTokenService.getAdminToken();
   const ws = new WebSocket(`wss://api.turnkeyhms.com/ws/admin?token=${token}`);
   ws.on('session.updated', (data) => updateUI(data));
   ```

3. **Keep computation server-side**
   ```javascript
   // CORRECT - Analytics service computes, UI displays
   const funnel = await analyticsAPI.getFunnelMetrics();
   displayFunnel(funnel);
   ```

---

## 🔄 Admin WebSocket Migration (ADR-002)

### Migration Status: ✅ COMPLETED (December 2024)

The Admin Dashboard has successfully migrated from Events WebSocket to dedicated Admin WebSocket per ADR-002.

### Architecture Change
- **Before**: Admin Dashboard → Events WebSocket (coupled to Events service)
- **After**: Admin Dashboard → Session Service JWT → Admin WebSocket (decoupled)

### Key Benefits
1. **Decoupling**: Admin features no longer depend on Events service
2. **Security**: JWT-authenticated WebSocket connections
3. **Scalability**: Dedicated admin channel prevents interference
4. **Maintainability**: Clear service boundaries per ADR-002

### Implementation Components
- **Token Service**: `adminTokenService.ts` - JWT acquisition from Session service
- **WebSocket Hook**: `useAdminWebSocket.ts` - Authenticated connection management
- **Migration Hook**: `useAdminRealtimeWebSocket.ts` - Fallback orchestration
- **Feature Flags**: `VITE_FEATURE_USE_ADMIN_WS` for controlled rollout

### Deployment Strategy
1. **Staging**: Feature flag enabled for validation
2. **Production**: Gradual rollout with monitoring
3. **Cleanup**: Events WS dependencies removed

---

## 📋 Migration Checklist

### Immediate Actions (Phase A) - ✅ COMPLETED
- [x] Remove any direct BigQuery queries from Admin Dashboard
- [x] Remove any direct Firestore queries from Admin Dashboard
- [x] Create Analytics API endpoints for all current metrics
- [x] Update Admin UI to use Analytics API exclusively
- [x] Implement Admin WebSocket with JWT authentication
- [x] Document all Admin WebSocket event types

### Short-term (Phase B)
- [ ] Set up Grafana for historical dashboards
- [ ] Implement Redis cache in Analytics service
- [ ] Create BigQuery materialized views for common queries
- [ ] Add service health monitoring

### Long-term (Phase C)
- [ ] Implement circuit breakers between services
- [ ] Add request tracing across services
- [ ] Create service mesh for advanced routing
- [ ] Implement automated testing for boundaries

---

## 🔍 Validation Rules

To ensure boundaries are maintained:

1. **Code Review Checklist**
   - [ ] No direct database queries in Admin Dashboard
   - [ ] All metrics come from Analytics API
   - [ ] WebSocket used only for real-time updates
   - [ ] No computation logic in UI components

2. **Automated Checks**
   - Lint rules to prevent BigQuery imports in Admin Dashboard
   - API Gateway validates all cross-service calls
   - Monitor for unauthorized database connections

3. **Architecture Reviews**
   - Monthly review of service boundaries
   - Quarterly audit of data flows
   - Annual architecture assessment

---

## 📝 Governance

- **Owner**: Platform Architecture Team
- **Review Cycle**: Monthly
- **Last Updated**: 2025-01-14
- **Next Review**: 2025-02-14

### Escalation Path
1. Service team identifies boundary violation
2. Escalate to Platform Architecture Team
3. Document exception or refactor to comply
4. Update this document if boundaries change

---

*This document is the authoritative source for service boundaries in the TurnkeyHMS platform. Any deviation requires explicit architectural approval.*