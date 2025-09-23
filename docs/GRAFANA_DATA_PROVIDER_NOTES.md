# Grafana Data Provider Requirements - Analytics Service Interface

## Purpose

This document defines what the Admin Dashboard's Grafana deployment expects from the Analytics service. **The Analytics service is the data provider** - it maintains BigQuery views and REST APIs that Grafana consumes. This document serves as a contract between the Admin Dashboard and Analytics teams.

## Service Boundaries Reminder

### Analytics Service Responsibilities
- ✅ Maintains all BigQuery views and tables
- ✅ Provides REST API endpoints for real-time metrics
- ✅ Computes all aggregations and metrics
- ✅ Ensures data freshness and accuracy
- ✅ Manages caching for performance

### Analytics Service Does NOT
- ❌ Deploy or configure Grafana (Admin Dashboard owns this)
- ❌ Create Grafana dashboards (Admin Dashboard owns this)
- ❌ Manage Grafana authentication (Admin Dashboard owns this)

---

## Required BigQuery Views

The Analytics service must maintain these BigQuery views/tables for Grafana to query:

### 1. Booking Funnel View
**Location**: `project.analytics.booking_funnel`

```sql
-- Expected schema
CREATE OR REPLACE VIEW analytics.booking_funnel AS
SELECT
  timestamp,
  property_id,
  session_id,
  stage_name,
  stage_order,
  user_id
FROM processed_events
WHERE event_type = 'funnel_stage';

-- Columns:
-- timestamp: TIMESTAMP - When the stage was reached
-- property_id: STRING - Property identifier
-- session_id: STRING - Session identifier
-- stage_name: STRING - Name of funnel stage
-- stage_order: INT64 - Order in funnel (1-8)
-- user_id: STRING - Optional user identifier
```

### 2. Booking Heatmap View
**Location**: `project.analytics.booking_heatmap`

```sql
-- Expected schema
CREATE OR REPLACE VIEW analytics.booking_heatmap AS
SELECT
  date,
  destination,
  days_until_arrival,
  hour_of_day,
  booking_count,
  search_count,
  conversion_rate
FROM aggregated_metrics;

-- Columns:
-- date: DATE - Date of the metric
-- destination: STRING - Destination name
-- days_until_arrival: INT64 - Days between search and arrival
-- hour_of_day: INT64 - Hour (0-23)
-- booking_count: INT64 - Number of bookings
-- search_count: INT64 - Number of searches
-- conversion_rate: FLOAT64 - Conversion percentage
```

### 3. Property Metrics View
**Location**: `project.analytics.property_metrics`

```sql
-- Expected schema
CREATE OR REPLACE VIEW analytics.property_metrics AS
SELECT
  timestamp,
  property_id,
  property_name,
  occupancy_rate,
  adr,  -- Average Daily Rate
  revpar,  -- Revenue Per Available Room
  total_bookings,
  total_revenue
FROM property_aggregates;

-- Columns:
-- timestamp: TIMESTAMP - Metric timestamp
-- property_id: STRING - Property identifier
-- property_name: STRING - Display name
-- occupancy_rate: FLOAT64 - Percentage occupied
-- adr: FLOAT64 - Average daily rate
-- revpar: FLOAT64 - Revenue per available room
-- total_bookings: INT64 - Booking count
-- total_revenue: FLOAT64 - Revenue amount
```

### 4. Top Lists View
**Location**: `project.analytics.top_performers`

```sql
-- Expected schema
CREATE OR REPLACE VIEW analytics.top_performers AS
SELECT
  date,
  category,  -- 'destination', 'property', 'room_type'
  name,
  rank,
  metric_value,
  metric_type  -- 'bookings', 'revenue', 'searches'
FROM ranked_metrics;

-- Columns:
-- date: DATE - Date of ranking
-- category: STRING - Type of entity
-- name: STRING - Entity name
-- rank: INT64 - Rank position
-- metric_value: FLOAT64 - Metric value
-- metric_type: STRING - What's being measured
```

### 5. Time Series Metrics View
**Location**: `project.analytics.time_series`

```sql
-- Expected schema
CREATE OR REPLACE VIEW analytics.time_series AS
SELECT
  timestamp,
  metric_name,
  metric_value,
  property_id,
  dimensions  -- JSON field for flexible dimensions
FROM time_series_data;

-- Columns:
-- timestamp: TIMESTAMP - Time point
-- metric_name: STRING - Name of metric
-- metric_value: FLOAT64 - Metric value
-- property_id: STRING - Optional property filter
-- dimensions: JSON - Additional dimensions
```

---

## Required REST API Endpoints

The Analytics service must expose these endpoints at `https://api.turnkeyhms.com/v1/analytics`:

### 1. Real-time Metrics Endpoint
**GET** `/metrics/realtime`

```typescript
// Request
GET /metrics/realtime?property_id={property_id}

// Response (200 OK)
{
  "timestamp": "2025-01-14T10:00:00Z",
  "active_sessions": 142,
  "sessions_last_hour": 523,
  "conversions_last_hour": 12,
  "revenue_last_hour": 4567.89,
  "average_session_duration": 245,  // seconds
  "cache_age_seconds": 5
}
```

### 2. Overview KPIs Endpoint
**GET** `/metrics/overview`

```typescript
// Request
GET /metrics/overview?property_id={property_id}&period={period}
// period: "1h", "24h", "7d", "30d"

// Response (200 OK)
{
  "period": "24h",
  "property_id": "prop_123",
  "kpis": {
    "total_sessions": 12345,
    "unique_users": 8901,
    "conversion_rate": 0.023,  // 2.3%
    "average_booking_value": 234.56,
    "total_revenue": 45678.90,
    "occupancy_rate": 0.78,  // 78%
    "revpar": 89.12
  },
  "comparison": {
    "previous_period_change": 0.12,  // +12%
    "year_over_year_change": 0.23  // +23%
  },
  "timestamp": "2025-01-14T10:00:00Z",
  "cache_age_seconds": 60
}
```

### 3. Funnel Analysis Endpoint
**GET** `/metrics/funnel`

```typescript
// Request
GET /metrics/funnel?property_id={property_id}&period={period}

// Response (200 OK)
{
  "funnel_id": "booking_funnel",
  "period": "24h",
  "stages": [
    {
      "name": "Search",
      "stage_order": 1,
      "count": 10000,
      "rate": 1.0  // 100%
    },
    {
      "name": "Property View",
      "stage_order": 2,
      "count": 4500,
      "rate": 0.45  // 45%
    },
    {
      "name": "Room Selection",
      "stage_order": 3,
      "count": 2000,
      "rate": 0.20  // 20%
    },
    {
      "name": "Guest Details",
      "stage_order": 4,
      "count": 1500,
      "rate": 0.15  // 15%
    },
    {
      "name": "Payment",
      "stage_order": 5,
      "count": 900,
      "rate": 0.09  // 9%
    },
    {
      "name": "Confirmation",
      "stage_order": 6,
      "count": 234,
      "rate": 0.023  // 2.3%
    }
  ],
  "drop_off_points": [
    {
      "from_stage": "Property View",
      "to_stage": "Room Selection",
      "loss_rate": 0.556  // 55.6% drop
    }
  ],
  "timestamp": "2025-01-14T10:00:00Z",
  "cache_age_seconds": 300
}
```

### 4. Heatmap Data Endpoint
**GET** `/metrics/heatmap`

```typescript
// Request
GET /metrics/heatmap?dimension_x={dim_x}&dimension_y={dim_y}&period={period}
// dimension_x: "hour", "day_of_week", "destination"
// dimension_y: "days_until_arrival", "property", "room_type"

// Response (200 OK)
{
  "dimensions": {
    "x": "destination",
    "y": "days_until_arrival"
  },
  "period": "7d",
  "data": [
    {
      "x": "Paris",
      "y": 7,
      "value": 45,
      "label": "45 bookings"
    },
    {
      "x": "London",
      "y": 14,
      "value": 32,
      "label": "32 bookings"
    },
    // ... more data points
  ],
  "summary": {
    "total_points": 168,
    "max_value": 120,
    "min_value": 0,
    "average_value": 23.5
  },
  "timestamp": "2025-01-14T10:00:00Z",
  "cache_age_seconds": 600
}
```

### 5. Top Lists Endpoint
**GET** `/metrics/top`

```typescript
// Request
GET /metrics/top?category={category}&metric={metric}&limit={limit}&period={period}
// category: "destinations", "properties", "room_types"
// metric: "bookings", "revenue", "searches"

// Response (200 OK)
{
  "category": "destinations",
  "metric": "bookings",
  "period": "7d",
  "items": [
    {
      "rank": 1,
      "name": "Paris",
      "value": 234,
      "percentage_of_total": 0.15,  // 15%
      "change_from_previous": 0.12  // +12%
    },
    {
      "rank": 2,
      "name": "London",
      "value": 198,
      "percentage_of_total": 0.13,  // 13%
      "change_from_previous": -0.05  // -5%
    },
    // ... up to limit
  ],
  "total_value": 1560,
  "timestamp": "2025-01-14T10:00:00Z",
  "cache_age_seconds": 900
}
```

---

## Performance Requirements

### Response Times
- Real-time endpoints (`/metrics/realtime`): < 100ms
- Overview endpoints (`/metrics/overview`): < 500ms
- Analytical endpoints (funnel, heatmap): < 2s
- BigQuery views: < 3s for complex queries

### Caching Strategy
- Real-time metrics: 5-10 second cache
- Overview KPIs: 1 minute cache
- Funnel analysis: 5 minute cache
- Heatmap data: 10 minute cache
- Top lists: 15 minute cache

### Data Freshness
- Real-time metrics: < 1 minute delay
- Overview metrics: < 5 minute delay
- Historical analytics: < 1 hour delay

---

## Authentication & Authorization

### Service Account Access
The Grafana service account (`grafana-sa@project.iam.gserviceaccount.com`) needs:

#### BigQuery Permissions
```yaml
roles:
  - roles/bigquery.dataViewer  # Read tables/views
  - roles/bigquery.jobUser     # Run queries

resources:
  - dataset: analytics        # Access to analytics dataset
  - dataset: processed_data   # Access to processed data
```

#### API Access
- Analytics API endpoints should accept requests from Grafana's service account
- No additional authentication required for internal service-to-service calls
- Rate limiting: 1000 requests/minute per endpoint

---

## Error Handling

### Expected Error Responses

```typescript
// 400 Bad Request
{
  "error": "invalid_parameter",
  "message": "Period must be one of: 1h, 24h, 7d, 30d",
  "timestamp": "2025-01-14T10:00:00Z"
}

// 404 Not Found
{
  "error": "property_not_found",
  "message": "Property 'prop_xyz' does not exist",
  "timestamp": "2025-01-14T10:00:00Z"
}

// 429 Too Many Requests
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Retry after 60 seconds",
  "retry_after": 60,
  "timestamp": "2025-01-14T10:00:00Z"
}

// 500 Internal Server Error
{
  "error": "internal_error",
  "message": "Failed to process request",
  "request_id": "req_abc123",
  "timestamp": "2025-01-14T10:00:00Z"
}
```

---

## Monitoring & SLAs

### Service Level Agreements
- API Availability: 99.9% uptime
- BigQuery View Availability: 99.9% uptime
- Data Accuracy: 99.99% correctness
- Cache Hit Rate: > 80%

### Monitoring Metrics
Analytics service should expose:
- Request rate per endpoint
- Response time percentiles (p50, p95, p99)
- Error rate by type
- Cache hit/miss ratios
- BigQuery query costs

---

## Schema Evolution

### Backward Compatibility
- New fields can be added to responses (Grafana will ignore unknown fields)
- Existing fields must not be removed without deprecation notice
- Field types must not change
- New optional query parameters are allowed

### Deprecation Policy
1. Announce deprecation with 30-day notice
2. Support both old and new versions for 30 days
3. Remove deprecated features after migration period
4. Document all changes in changelog

---

## Testing Requirements

### Integration Testing
Analytics service should provide:
- Test environment with sample data
- API endpoint for health checks: `GET /health`
- Test property IDs that always return predictable data
- Rate limit exemption for Grafana test instance

### Sample Test Data
```typescript
// Test property that always returns fixed data
GET /metrics/overview?property_id=test_property_001

// Always returns:
{
  "kpis": {
    "total_sessions": 1000,
    "conversion_rate": 0.025,
    // ... predictable values
  }
}
```

---

## Communication Protocol

### Change Notifications
Analytics team must notify Admin Dashboard team of:
- API endpoint changes (minimum 2 weeks notice)
- BigQuery schema changes (minimum 1 week notice)
- Planned maintenance windows (minimum 48 hours notice)
- Performance degradation or outages (immediate)

### Contact Points
- Analytics Team Slack: #analytics-team
- Admin Dashboard Team Slack: #admin-dashboard-team
- Escalation: platform-oncall@turnkeyhms.com

---

## Implementation Checklist for Analytics Team

### Phase 1: Core Infrastructure
- [ ] Create BigQuery dataset `analytics`
- [ ] Implement booking_funnel view
- [ ] Implement booking_heatmap view
- [ ] Implement property_metrics view
- [ ] Grant Grafana service account permissions

### Phase 2: REST API
- [ ] Deploy Analytics API service
- [ ] Implement `/metrics/realtime` endpoint
- [ ] Implement `/metrics/overview` endpoint
- [ ] Implement `/metrics/funnel` endpoint
- [ ] Implement `/metrics/heatmap` endpoint
- [ ] Implement `/metrics/top` endpoint

### Phase 3: Performance & Monitoring
- [ ] Set up Redis cache layer
- [ ] Implement cache warming strategies
- [ ] Configure monitoring dashboards
- [ ] Set up alerting rules
- [ ] Document runbooks

### Phase 4: Testing & Validation
- [ ] Create test datasets
- [ ] Implement health check endpoints
- [ ] Performance load testing
- [ ] End-to-end integration testing with Grafana
- [ ] Security audit

---

## Appendix: Sample Grafana Queries

### BigQuery Query Examples

```sql
-- Funnel analysis query
SELECT
  stage_name,
  COUNT(DISTINCT session_id) as session_count
FROM `project.analytics.booking_funnel`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND property_id = '$property_id'
GROUP BY stage_name, stage_order
ORDER BY stage_order;

-- Heatmap query
SELECT
  destination,
  days_until_arrival,
  SUM(booking_count) as total_bookings
FROM `project.analytics.booking_heatmap`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY destination, days_until_arrival
ORDER BY destination, days_until_arrival;

-- Top destinations query
SELECT
  name as destination,
  metric_value as bookings
FROM `project.analytics.top_performers`
WHERE date = CURRENT_DATE()
  AND category = 'destination'
  AND metric_type = 'bookings'
ORDER BY rank
LIMIT 10;
```

### JSON API Query Configuration

```json
{
  "path": "/metrics/realtime",
  "method": "GET",
  "params": {
    "property_id": "${property_id}"
  },
  "headers": {
    "Accept": "application/json"
  },
  "cache": {
    "enabled": true,
    "ttl": 5
  }
}
```

---

*This document defines the data contract between Admin Dashboard (Grafana consumer) and Analytics service (data provider). For Grafana deployment details, see GRAFANA_IMPLEMENTATION.md.*