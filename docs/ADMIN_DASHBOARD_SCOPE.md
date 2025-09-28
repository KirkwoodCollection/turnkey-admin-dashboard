# TurnkeyHMS Admin Dashboard - Service Scope & Boundaries

## Purpose Statement

The Admin Dashboard microservice delivers the **hotelier-facing UI/UX**, composing views across services and handling admin operations. It is a **pure presentation layer** that **consumes pre-computed analytics** from the Analytics service and real-time session signals via WebSocket. It **does not compute analytics** - it only displays them.

---

## 🎯 What This Service IS

### Core Responsibilities (OWNS)
- **UI and UX**: React app/micro-frontend including layout, theming, routing, user preferences
- **View Composition**: Combines pre-computed metrics from Analytics API with live session data
- **Thin Admin API Layer**: UI-specific concerns only (exports, preferences, feature flags)
- **Admin WebSocket Subscription Client**: Receives real-time session changes via JWT-authenticated connection to update "now" counters and live lists
- **Admin-Only Interface**: Authenticated access for hotel operators and system administrators
- **Presentation Logic**: Rendering charts, tables, and dashboards (no computation)

### Technical Scope (CONSUMES)
- **Analytics API**: For all KPIs, funnels, heatmaps, top lists, trend series (pre-computed)
- **Admin WebSocket**: JWT-authenticated real-time connection for live activity display (ADR-002)
- **Firebase Auth**: Token validation only (does not issue tokens)
- **React Query Cache**: For API response caching (does not compute data)
- **Optional Grafana Embed**: For historical/analytical visualizations

---

## 🚫 What This Service IS NOT

### Explicit Non-Responsibilities
- **NOT a Data Writer**: Never directly modifies databases, only reads via APIs
- **NOT an Events Service**: Does not ingest, process, or store events
- **NOT an Analytics Engine**: Never queries BigQuery directly or computes aggregates in the browser
- **NOT an Auth Provider**: Does not manage authentication, only validates tokens
- **NOT a Test Dashboard**: Completely separate from any test/debug dashboards in `turnkey-events`
- **NOT a Database Owner**: Does not own or write to any database (Firestore, BigQuery, or Redis)
- **NOT a Booking Engine**: Cannot create or modify reservations
- **NOT a Payment Processor**: Cannot handle financial transactions

---

## 📊 Service Boundaries

### Inbound Dependencies (What We Consume)
```
┌─────────────────────────────────────────────────────┐
│                   Admin Dashboard                    │
│                  (THIS SERVICE)                      │
└─────────────┬───────────────────────────────────────┘
              │ READS FROM (Never Writes)
              ▼
┌─────────────────────────────────────────────────────┐
│  • Analytics API  (GET /api/v1/analytics/*)         │
│  • Admin API      (GET /api/v1/admin/*) - thin layer│
│  • Admin WebSocket   (wss://api.turnkeyhms.com/ws/admin) │
│  • Firebase Auth  (Token validation only)           │
└─────────────────────────────────────────────────────┘
```

### Outbound Consumers (Who Uses Us)
```
┌─────────────────────────────────────────────────────┐
│  • Hotel Administrators (via web browser)           │
│  • System Operators (via web browser)               │
│  • Mobile Admin Apps (future, via responsive UI)    │
└─────────────────────────────────────────────────────┘
```

### Peer Services (We Don't Directly Interact)
```
❌ turnkey-events      (ingestion service)
❌ turnkey-booking     (reservation engine)
❌ turnkey-property    (property management)
❌ turnkey-payment     (payment processing)
❌ BigQuery            (analytics store - accessed via Analytics API)
❌ Firestore           (operational store - accessed via Admin API)
```

---

## 🔄 Data Flow Architecture

### Read Patterns

#### Real-time Data (< 1 minute old)
```
Admin WebSocket ──JWT auth──> Admin Dashboard ──display──> UI Component
  (Session JWT)                           │
                                          └──cache──> React Query Store
```

#### Recent Data (1 minute - 24 hours)
```
UI Request ──> React Query ──> Analytics API ──> Redis/Firestore ──> Response
                    │                              ▲
                    └──────cache hit───────────────┘
```

#### Historical Data (> 24 hours)
```
UI Request ──> React Query ──> Analytics API ──> BigQuery ──> Response
                    │                                 ▲
                    └──────cache hit─────────────────┘
```

### Cache Strategy
- **Real-time Events**: No cache, immediate display
- **Operational Data**: 30-second cache with background refresh
- **Analytics Data**: 5-minute cache with manual refresh option
- **Static Data**: 1-hour cache (property details, user profiles)

---

## 🔌 Integration Points

### API Endpoints We Consume

#### Admin API (`/api/v1/admin/*`)
- `GET /dashboard/summary` - Overall metrics summary
- `GET /properties/{id}/status` - Property operational status
- `GET /sessions/active` - Current user sessions
- `GET /alerts` - System alerts and notifications

#### Analytics API (`/api/v1/analytics/*`) - PRIMARY DATA SOURCE
- `GET /metrics/overview` - Aggregated KPIs and totals
- `GET /metrics/funnel` - Funnel stage counts and conversion rates
- `GET /metrics/heatmap` - 2D heatmap data (destination × arrival date)
- `GET /metrics/top` - Top destinations, hotels, search terms
- `GET /metrics/trends` - Time-series data for charts
- All endpoints return **shaped JSON ready for visualization**

#### Admin WebSocket Events We Subscribe To (ADR-002)
```javascript
// Admin WebSocket subscriptions via JWT authentication
adminWS.subscribe('session.updated')
adminWS.subscribe('analytics.metrics.updated')
adminWS.subscribe('event.received')
adminWS.subscribe('analytics.funnel.updated')
```

---

## 🏗️ Technical Architecture

### Technology Stack
```yaml
Frontend:
  - Framework: React 18.2+
  - Language: TypeScript 5.0+ (strict mode)
  - State Management: React Query v4
  - WebSocket: Admin WebSocket with JWT authentication
  - Styling: Tailwind CSS / CSS Modules
  - Charts: Recharts / D3.js
  - Testing: Jest + React Testing Library

Build & Deploy:
  - Bundler: Vite / Webpack 5
  - Container: Docker (nginx for static hosting)
  - CDN: CloudFlare / Cloud CDN
  - Monitoring: Sentry / Google Analytics
```

### Module Structure
```
src/
├── features/           # Feature-based modules
│   ├── analytics/      # Analytics widgets
│   ├── monitoring/     # Real-time monitoring
│   ├── revenue/        # Revenue management
│   └── alerts/         # Alert management
├── shared/            # Shared utilities
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API service layers
│   ├── components/    # Reusable UI components
│   └── utils/         # Helper functions
└── core/              # Core infrastructure
    ├── auth/          # Auth integration
    ├── websocket/     # Admin WebSocket management
    └── cache/         # Cache configuration
```

---

## ⚡ Performance Requirements

### Latency Targets
- **Admin WebSocket Events**: < 100ms from event to UI update
- **API Responses**: < 500ms for operational data
- **Analytics Queries**: < 2s for complex reports
- **Initial Load**: < 3s for dashboard shell
- **Full Load**: < 5s for complete dashboard with data

### Scalability Targets
- **Concurrent Users**: 100+ administrators
- **Admin WebSocket Connections**: 500+ simultaneous
- **Cache Hit Rate**: > 80% for repeated queries
- **Update Frequency**: 1Hz for real-time metrics

---

## 🔒 Security Boundaries

### Authentication & Authorization
```
User ──> Firebase Auth ──> Token ──> Admin Dashboard
                                           │
                                           ▼
                                    Validate Token
                                           │
                                           ▼
                                    Check Admin Role
                                           │
                                           ▼
                                    Allow/Deny Access
```

### Data Access Rules
- **Read-Only Access**: No write operations to any backend
- **Role-Based Views**: Content filtered by user role
- **Property Isolation**: Users see only their properties
- **Audit Logging**: All data access is logged
- **Token Refresh**: Automatic token renewal before expiry

---

## 🚨 Anti-Patterns to Avoid

### ❌ NEVER DO THIS
1. **Direct Database Access**: Always use APIs, never connect to Firestore/BigQuery directly
2. **Write Operations**: This dashboard is read-only, use other services for modifications
3. **Event Processing**: Don't process events, only display them
4. **Auth Management**: Don't implement auth, only validate existing tokens
5. **Data Computation**: Don't calculate analytics, request pre-computed results
6. **Cross-Service Calls**: Don't call peer services directly, use gateway routes
7. **Synchronous Polling**: Use Admin WebSocket subscriptions, not polling loops
8. **Global State**: Keep state modular per feature, avoid global stores

### ✅ ALWAYS DO THIS
1. **Use Service Layers**: UI → Hook → Service → API
2. **Handle Errors Gracefully**: Implement error boundaries
3. **Cache Intelligently**: Use React Query for all API calls
4. **Maintain Type Safety**: TypeScript strict mode everywhere
5. **Test Components**: Unit and integration tests required
6. **Monitor Performance**: Track Core Web Vitals
7. **Document Changes**: Update this scope document
8. **Follow Conventions**: Check existing patterns first

---

## 📋 Implementation Checklist

### Phase 1: Foundation
- [ ] React app scaffold with TypeScript
- [ ] Admin WebSocket connection manager with JWT authentication
- [ ] React Query configuration
- [ ] Firebase Auth integration
- [ ] Error boundary implementation

### Phase 2: Core Features
- [ ] Dashboard layout shell
- [ ] Real-time metrics widgets
- [ ] Analytics chart components
- [ ] Alert notification system
- [ ] Property status monitor

### Phase 3: Advanced Features
- [ ] Historical report generation
- [ ] Revenue forecasting views
- [ ] Occupancy heat maps
- [ ] Custom dashboard builder
- [ ] Export functionality

### Phase 4: Optimization
- [ ] Performance monitoring
- [ ] Bundle size optimization
- [ ] Lazy loading implementation
- [ ] PWA capabilities
- [ ] Offline support

---

## 🔗 Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Architecture guidelines and principles
- [Admin API Spec](https://api.turnkeyhms.com/docs/admin) - API documentation
- [Admin WebSocket Events](https://api.turnkeyhms.com/docs/admin-ws) - Admin event catalog
- [Firebase Auth Guide](https://firebase.google.com/docs/auth) - Authentication reference

---

## 🎭 Module Mapping (What Goes Where)

| Module | Source of Truth | Served By | Rendered In |
|--------|----------------|-----------|-------------|
| **KPI tiles** (totals, conversion) | Analytics (BigQuery + RT cache) | Analytics API | Admin UI or Grafana |
| **Top Destinations/Hotels** | Analytics (grouped metrics) | Analytics API | Admin UI or Grafana |
| **2D Heatmap** | Analytics (server-computed) | Analytics API | Admin UI or Grafana |
| **Funnel Stats** | Analytics (stage counts) | Analytics API | Admin UI or Grafana |
| **Live Session List** | Admin WebSocket | Admin WebSocket | Admin UI (custom) |
| **Real-time Counters** | Admin WebSocket events | Admin WebSocket | Admin UI (custom) |

---

## 🔄 Decision Framework: Custom UI vs Grafana

### Use Grafana When:
- Historical/aggregate data from BigQuery
- Can be expressed as SQL query/view
- Standard visualization types (charts, tables, maps)
- Refresh-on-load semantics acceptable
- Examples: 2D heatmap, top lists, long-range trends, funnels

### Use Custom Admin UI When:
- Real-time data via Admin WebSocket (live tables, instant counters)
- Requires tight coupling to admin actions
- Unique interaction patterns needed
- Must match brand/UX exactly
- Sub-second update requirements
- Examples: Live session list, active user count, real-time alerts

---

## 📊 RACI Matrix

| Capability | Responsible | Accountable | Consulted | Informed |
|------------|------------|-------------|-----------|----------|
| **Session lifecycle & event processing** | Session/Events | Session/Events | Analytics | Admin |
| **Event → BigQuery pipeline** | Session/Events | Session/Events | Analytics | Admin |
| **Admin WebSocket with JWT authentication** | Admin Dashboard | Admin Dashboard | Session | - |
| **Metrics computation (KPI/funnel/heatmap)** | Analytics | Analytics | Session/Events | Admin |
| **Historical dashboard visuals** | Grafana | Admin | Analytics | Session/Events |
| **Real-time visuals (live sessions)** | Admin UI | Admin | Admin WebSocket | Analytics |
| **UI/UX design & implementation** | Admin Dashboard | Admin | - | Analytics |
| **Admin-specific operations** | Admin Dashboard | Admin | - | - |

---

## 🚀 Implementation Phases

### Phase A - Lock Boundaries (Week 1)
- [x] Freeze DB ownership: Only Session/Events writes to Firestore
- [ ] Analytics reads via Pub/Sub (RT) and BigQuery (historical)
- [ ] Admin UI never queries databases directly
- [ ] Stand up Analytics API endpoints: `/metrics/overview`, `/metrics/funnel`, `/metrics/heatmap`
- [ ] Create BigQuery views for Grafana consumption

### Phase B - Wire Grafana (Week 2)
- [ ] Embed Grafana under `/admin/analytics/*` route
- [ ] Configure SSO with Admin UI authentication
- [ ] Point Grafana at BigQuery views for historical panels
- [x] Keep live session table in custom Admin UI via Admin WebSocket (ADR-002)
- [ ] Ensure metrics match between Grafana and custom UI

### Phase C - Harden & Scale (Week 3+)
- [ ] Implement Redis cache in Analytics service for recent windows
- [ ] Add unit tests for funnel and heatmap logic
- [ ] Configure API Gateway routes: `/api/v1/admin/*`, `/api/v1/analytics/*`
- [ ] Set up monitoring dashboards for service health
- [ ] Document OpenAPI contracts centrally

---

## 📝 Governance

### Document Owner
- Service: turnkey-admin-dashboard
- Team: Platform Team
- Last Updated: 2025-01-14
- Review Cycle: Monthly

### Change Process
1. Propose changes via PR to this document
2. Review with platform team
3. Update implementation to match
4. Communicate to all stakeholders

---

## 🎯 Success Metrics

### Service Health
- **Uptime**: 99.9% availability
- **Error Rate**: < 0.1% of requests
- **Cache Hit Rate**: > 80%
- **Admin WebSocket Stability**: < 1% connection drops

### User Experience
- **Time to First Byte**: < 200ms
- **Time to Interactive**: < 3s
- **Core Web Vitals**: All green
- **User Satisfaction**: > 4.5/5.0

---

*This document defines the authoritative scope and boundaries for the TurnkeyHMS Admin Dashboard microservice. Any functionality outside these boundaries requires architectural review and may belong in a different service.*