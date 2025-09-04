# API Service Layer

## Purpose
RESTful API integration for initial data loads and non-real-time operations.

## Service Architecture
- Axios-based HTTP client
- Request/response interceptors
- Automatic retry logic
- Response caching

## Endpoint Organization
```typescript
const endpoints = {
  analytics: {
    sessions: '/api/v1/analytics/sessions',
    events: '/api/v1/analytics/events',
    metrics: '/api/v1/analytics/metrics',
    funnel: '/api/v1/analytics/funnel'
  },
  revenue: {
    forecasts: '/api/v1/revenue/forecasts',
    optimization: '/api/v1/revenue/optimization'
  },
  ai: {
    insights: '/api/v1/ai/insights',
    predictions: '/api/v1/ai/predictions'
  }
};
```

### Request Patterns
- Always use service methods, never direct axios calls
- Include proper error handling
- Transform responses at service level
- Cache responses appropriately

### Caching Strategy
- Session data: 5 minutes
- Metrics: 1 minute
- Historical data: 1 hour
- AI insights: 10 minutes

### Error Handling
- Network errors: Retry 3 times
- 401: Redirect to login
- 403: Show permission error
- 500+: Show system error with retry