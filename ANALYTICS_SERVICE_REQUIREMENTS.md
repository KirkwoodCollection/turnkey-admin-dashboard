# Analytics Service Requirements for Grafana Integration

## Overview

This document specifies what the Analytics microservice must provide to support the Admin Dashboard's Grafana deployment. The Analytics service is responsible for all metric computation and data aggregation, while Grafana (owned by Admin Dashboard) handles visualization only.

## Service Responsibilities

### Analytics Service MUST Provide

1. **BigQuery Views and Tables**
2. **REST API Endpoints**
3. **Data Freshness Guarantees**
4. **Service Account Permissions**

### Analytics Service MUST NOT

- Deploy or configure Grafana (Admin Dashboard owns this)
- Provide UI components (Admin Dashboard owns all UI)
- Store credentials for Grafana (managed by Admin Dashboard)

---

## 1. Required BigQuery Infrastructure

### Dataset Structure
```
project.analytics/
├── booking_funnel           # Funnel stage progression
├── booking_heatmap          # 2D heatmap data
├── property_metrics         # Property-level KPIs
├── top_performers           # Ranked lists
├── time_series             # Time-based metrics
└── session_aggregates      # Session summaries
```

### Table Schemas

#### `analytics.booking_funnel`
```sql
CREATE OR REPLACE VIEW analytics.booking_funnel AS
SELECT
  timestamp TIMESTAMP,
  property_id STRING,
  session_id STRING,
  stage_name STRING,        -- 'search', 'property_view', 'room_selection', etc.
  stage_order INT64,        -- 1-8 for ordering
  user_id STRING NULLABLE,
  conversion_time_seconds INT64
FROM processed_funnel_events
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY);

-- Required indexes
CREATE INDEX idx_funnel_timestamp ON booking_funnel(timestamp);
CREATE INDEX idx_funnel_property ON booking_funnel(property_id);
```

#### `analytics.booking_heatmap`
```sql
CREATE OR REPLACE MATERIALIZED VIEW analytics.booking_heatmap AS
SELECT
  DATE(timestamp) as date,
  destination STRING,
  days_until_arrival INT64,  -- 0-365
  hour_of_day INT64,         -- 0-23
  COUNT(*) as booking_count,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(conversion_rate) as avg_conversion_rate
FROM booking_events
GROUP BY date, destination, days_until_arrival, hour_of_day
WITH DATA REFRESH INTERVAL 1 HOUR;
```

#### `analytics.property_metrics`
```sql
CREATE OR REPLACE VIEW analytics.property_metrics AS
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) as hour_timestamp,
  property_id,
  property_name,
  AVG(occupancy_rate) as occupancy_rate,
  AVG(adr) as average_daily_rate,
  AVG(revpar) as revenue_per_available_room,
  SUM(bookings) as total_bookings,
  SUM(revenue) as total_revenue
FROM property_performance
GROUP BY hour_timestamp, property_id, property_name;
```

### Required Permissions

Grant the Grafana service account (`grafana-sa@project.iam.gserviceaccount.com`):

```bash
# BigQuery permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:grafana-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:grafana-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

# Grant access to specific dataset
bq update --dataset \
  --description "Analytics dataset for Grafana" \
  --access_control="grafana-sa@PROJECT_ID.iam.gserviceaccount.com:READER" \
  PROJECT_ID:analytics
```

---

## 2. Required REST API Endpoints

Base URL: `https://api.turnkeyhms.com/v1/analytics`

### Authentication
- Accept requests from Grafana service account
- Support Bearer token authentication
- No additional auth required for internal service calls

### Endpoints

#### `GET /metrics/realtime`
Real-time metrics updated every 5-10 seconds.

**Request:**
```http
GET /metrics/realtime?property_id={property_id}
Authorization: Bearer {service_account_token}
```

**Response (200 OK):**
```json
{
  "timestamp": "2025-01-14T10:00:00Z",
  "active_sessions": 142,
  "sessions_last_hour": 523,
  "conversions_last_hour": 12,
  "revenue_last_hour": 4567.89,
  "average_session_duration": 245,
  "system_health_score": 95,
  "cache_age_seconds": 5
}
```

#### `GET /metrics/overview`
Aggregated KPIs with configurable time period.

**Request:**
```http
GET /metrics/overview?property_id={property_id}&period={1h|24h|7d|30d}
```

**Response (200 OK):**
```json
{
  "period": "24h",
  "property_id": "prop_123",
  "kpis": {
    "total_sessions": 12345,
    "unique_users": 8901,
    "conversion_rate": 0.023,
    "average_booking_value": 234.56,
    "total_revenue": 45678.90,
    "occupancy_rate": 0.78,
    "revpar": 89.12
  },
  "comparison": {
    "previous_period_change": 0.12,
    "year_over_year_change": 0.23
  },
  "timestamp": "2025-01-14T10:00:00Z",
  "cache_age_seconds": 60
}
```

#### `GET /metrics/funnel`
Funnel progression analysis.

**Request:**
```http
GET /metrics/funnel?property_id={property_id}&period={period}
```

**Response (200 OK):**
```json
{
  "funnel_id": "booking_funnel",
  "period": "24h",
  "stages": [
    {
      "name": "Search",
      "stage_order": 1,
      "count": 10000,
      "rate": 1.0
    },
    {
      "name": "Property View",
      "stage_order": 2,
      "count": 4500,
      "rate": 0.45
    }
  ],
  "drop_off_analysis": {
    "biggest_drop": {
      "from": "Property View",
      "to": "Room Selection",
      "loss_rate": 0.556
    }
  },
  "timestamp": "2025-01-14T10:00:00Z",
  "cache_age_seconds": 300
}
```

#### `GET /metrics/heatmap`
2D heatmap data for visualization.

**Request:**
```http
GET /metrics/heatmap?dimension_x={destination|hour}&dimension_y={days_until_arrival|property}&period={period}
```

**Response (200 OK):**
```json
{
  "dimensions": {
    "x": "destination",
    "y": "days_until_arrival"
  },
  "data": [
    {"x": "Paris", "y": 7, "value": 45},
    {"x": "London", "y": 14, "value": 32}
  ],
  "metadata": {
    "total_points": 168,
    "max_value": 120,
    "min_value": 0
  },
  "timestamp": "2025-01-14T10:00:00Z",
  "cache_age_seconds": 600
}
```

#### `GET /metrics/top`
Top performing entities.

**Request:**
```http
GET /metrics/top?category={destinations|properties|room_types}&metric={bookings|revenue}&limit={10}&period={period}
```

**Response (200 OK):**
```json
{
  "category": "destinations",
  "metric": "bookings",
  "items": [
    {
      "rank": 1,
      "name": "Paris",
      "value": 234,
      "percentage_of_total": 0.15,
      "trend": "up"
    }
  ],
  "total_value": 1560,
  "timestamp": "2025-01-14T10:00:00Z",
  "cache_age_seconds": 900
}
```

---

## 3. Performance & Reliability Requirements

### Response Time SLAs
| Endpoint | P50 | P95 | P99 | Max |
|----------|-----|-----|-----|-----|
| `/metrics/realtime` | 50ms | 100ms | 200ms | 500ms |
| `/metrics/overview` | 200ms | 500ms | 1s | 2s |
| `/metrics/funnel` | 300ms | 800ms | 1.5s | 3s |
| `/metrics/heatmap` | 400ms | 1s | 2s | 5s |
| `/metrics/top` | 200ms | 500ms | 1s | 2s |

### Availability
- **API Uptime**: 99.9% (43.2 minutes downtime/month max)
- **BigQuery Availability**: 99.9%
- **Data Freshness**:
  - Real-time: < 1 minute lag
  - Analytics: < 5 minute lag
  - Historical: < 1 hour lag

### Rate Limiting
- Grafana service account: 1000 requests/minute
- Per endpoint: 100 requests/minute
- Burst allowance: 2x normal rate for 30 seconds

---

## 4. Caching Strategy

### Cache Layers

1. **Application Cache (Redis)**
   - Real-time metrics: 5-10 second TTL
   - Overview KPIs: 60 second TTL
   - Funnel data: 5 minute TTL
   - Heatmap data: 10 minute TTL
   - Top lists: 15 minute TTL

2. **CDN Cache (Optional)**
   - Static aggregates: 5 minute TTL
   - Cache key includes: property_id, period, timestamp

3. **BigQuery Materialized Views**
   - Refresh interval: 1 hour for aggregates
   - Partition by date for efficient queries

### Cache Invalidation
- Event-driven invalidation for critical changes
- Time-based expiry for regular updates
- Manual cache clear endpoint for emergencies

---

## 5. Error Handling

### Standard Error Response Format
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Property 'prop_xyz' does not exist",
    "details": {
      "property_id": "prop_xyz",
      "timestamp": "2025-01-14T10:00:00Z"
    }
  },
  "request_id": "req_abc123xyz"
}
```

### Error Codes
| HTTP Status | Error Code | Description |
|------------|------------|-------------|
| 400 | INVALID_PARAMETER | Invalid request parameters |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | RESOURCE_NOT_FOUND | Requested resource doesn't exist |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Temporary unavailability |

---

## 6. Monitoring & Alerting

### Required Metrics (exposed to Grafana)
```prometheus
# Request rate
analytics_api_requests_total{endpoint, status, method}

# Response time
analytics_api_request_duration_seconds{endpoint, quantile}

# Cache performance
analytics_cache_hits_total{cache_type}
analytics_cache_misses_total{cache_type}

# BigQuery performance
analytics_bigquery_query_duration_seconds{query_type}
analytics_bigquery_bytes_processed_total{query_type}

# Error rate
analytics_api_errors_total{endpoint, error_type}
```

### Health Check Endpoint
```http
GET /health

Response:
{
  "status": "healthy",
  "checks": {
    "bigquery": "ok",
    "redis": "ok",
    "api": "ok"
  },
  "timestamp": "2025-01-14T10:00:00Z"
}
```

---

## 7. Development & Testing

### Test Data Requirements
- Provide test property IDs that always return predictable data
- Support time-frozen test mode for consistent testing
- Include sample data generator for local development

### Test Endpoints
```http
# Test mode endpoint
GET /metrics/overview?property_id=test_property_001&test_mode=true

# Always returns fixed data for testing
{
  "kpis": {
    "total_sessions": 1000,
    "conversion_rate": 0.025
  }
}
```

### Local Development Support
```yaml
# docker-compose.yml for Analytics service
version: '3.8'
services:
  analytics-api:
    image: analytics-api:latest
    ports:
      - "8080:8080"
    environment:
      - MODE=development
      - MOCK_DATA=true
```

---

## 8. Migration & Rollout Plan

### Phase 1: Infrastructure (Week 1)
- [ ] Create BigQuery dataset and tables
- [ ] Set up service account permissions
- [ ] Deploy base Analytics API

### Phase 2: Core Endpoints (Week 2)
- [ ] Implement `/metrics/overview`
- [ ] Implement `/metrics/realtime`
- [ ] Add Redis caching layer

### Phase 3: Advanced Features (Week 3)
- [ ] Implement `/metrics/funnel`
- [ ] Implement `/metrics/heatmap`
- [ ] Implement `/metrics/top`

### Phase 4: Production Readiness (Week 4)
- [ ] Load testing & optimization
- [ ] Monitoring setup
- [ ] Documentation completion
- [ ] Grafana integration testing

---

## 9. Communication & Support

### Contacts
- **Analytics Team**: analytics-team@turnkeyhms.com
- **Slack Channel**: #analytics-service
- **On-Call**: PagerDuty analytics-oncall

### SLA Response Times
- **Critical Issues**: 15 minutes
- **High Priority**: 1 hour
- **Normal**: 4 hours
- **Low Priority**: 24 hours

### Change Management
- API changes require 2 week notice
- Breaking changes require 30 day migration period
- All changes documented in changelog
- Version headers supported for backward compatibility

---

## Appendix: Example Grafana Queries

### BigQuery Queries Used by Grafana

```sql
-- Funnel progression query
WITH funnel_stages AS (
  SELECT
    stage_name,
    stage_order,
    COUNT(DISTINCT session_id) as sessions
  FROM `project.analytics.booking_funnel`
  WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
    AND property_id = @property_id
  GROUP BY stage_name, stage_order
)
SELECT
  stage_name,
  sessions,
  sessions / FIRST_VALUE(sessions) OVER (ORDER BY stage_order) as conversion_rate
FROM funnel_stages
ORDER BY stage_order;

-- Heatmap query
SELECT
  destination,
  days_until_arrival,
  SUM(booking_count) as bookings
FROM `project.analytics.booking_heatmap`
WHERE date >= CURRENT_DATE() - 7
GROUP BY destination, days_until_arrival
ORDER BY bookings DESC;

-- Time series query
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) as hour,
  COUNT(DISTINCT session_id) as sessions,
  SUM(CASE WHEN booked THEN 1 ELSE 0 END) as bookings
FROM `project.analytics.session_aggregates`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY hour
ORDER BY hour;
```

---

*This document defines the contract between the Analytics service (data provider) and Admin Dashboard's Grafana deployment (data consumer). The Analytics team owns implementation of these requirements.*