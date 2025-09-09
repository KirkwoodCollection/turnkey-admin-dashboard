# System Health Monitoring Implementation

## Overview
The Admin Dashboard now includes comprehensive system health monitoring capabilities that consume health data from the Gateway service and provide real-time visualization of the TurnkeyHMS system status.

## Architecture

### Data Flow
```
[All 12 Services] → [Gateway Health Aggregator] → [Admin Dashboard Visualization]
```

### Components Structure
```
src/
├── api/
│   └── systemHealth.ts          # Gateway health API client
├── components/health/
│   ├── ServiceHealthCard.tsx    # Individual service status card
│   ├── ServiceHealthGrid.tsx    # Grid view of all services  
│   ├── DependencyGraph.tsx      # Service dependency visualization
│   ├── HealthMetricsChart.tsx   # Time-series health metrics
│   └── IntegrationTestRunner.tsx # Integration test execution UI
├── contexts/
│   └── HealthContext.tsx        # System health state management
├── hooks/
│   └── useSystemHealth.ts       # Health data management hook
└── pages/
    └── SystemHealth.tsx         # Main health dashboard page
```

## Features Implemented

### 1. Real-Time Health Monitoring
- **WebSocket Integration**: Receives live health updates from Gateway
- **Service Status Cards**: Visual indicators for each service (healthy/degraded/unhealthy)
- **System Overview**: Aggregate health metrics and summary statistics
- **Auto-Refresh**: Configurable automatic data refresh intervals

### 2. Service Dependency Visualization  
- **Dependency Graph**: Interactive SVG-based visualization of service relationships
- **Critical Path Highlighting**: Visual emphasis on critical service dependencies
- **Clickable Nodes**: Navigate to specific service details
- **Zoom Controls**: Zoom in/out and center the dependency graph

### 3. Historical Health Metrics
- **Time-Series Charts**: Recharts-based visualization of health metrics over time
- **Multiple Chart Types**: Response time, error rate, uptime percentage, service status
- **Time Range Selection**: 1H, 6H, 24H, 7D views
- **Service Filtering**: View metrics for all services or specific services

### 4. Integration Testing
- **Test Execution**: Run integration tests across all services
- **Test Results**: Detailed pass/fail status with error messages  
- **Test History**: Track test execution over time
- **Real-Time Progress**: Live updates during test execution

### 5. Alert System
- **Smart Alerts**: Automatic alert generation based on service health
- **Alert Categories**: Critical, warning, and info level alerts
- **Alert History**: Track and resolve alerts over time
- **Header Integration**: Alert count badge in navigation

## API Integration

### Health Endpoints Consumed
- `GET /api/v1/system/health` - Current system health status
- `GET /api/v1/system/health/services/{id}` - Specific service health
- `GET /api/v1/system/health/history` - Historical health data
- `GET /api/v1/system/health/dependencies` - Service dependencies
- `GET /api/v1/system/health/metrics` - Aggregated metrics
- `POST /api/v1/system/health/integration-test` - Run integration tests

### WebSocket Events
- `HEALTH_UPDATE` - Real-time health status changes

## Navigation Integration

### Header Elements
- **System Health Tab**: Quick access to health dashboard
- **Health Status Chip**: Shows overall system health in header
- **Alert Badge**: Displays unread alert count
- **Connection Status**: WebSocket connection indicator

### Pages
- `/overview` - Analytics dashboard (existing)
- `/system-health` - System health monitoring dashboard (new)

## Configuration

### Nginx Proxy Setup
The nginx configuration includes:
- `/api/v1/system/*` - Routes to Gateway service
- `/ws/health` - WebSocket proxy for health updates
- CORS headers for health endpoints
- Optimized timeouts for health checks

### Environment Variables
The health monitoring uses the existing API base URL configuration:
- `VITE_API_BASE_URL` - Points to Gateway service
- `VITE_WS_URL` - WebSocket endpoint for real-time updates

### React Query Configuration
Health data is cached and managed through React Query with:
- 30-second refresh intervals for live data
- Intelligent cache invalidation
- Background refetching on window focus
- Error retry logic

## Usage

### Accessing Health Dashboard
1. Navigate to the Admin Dashboard
2. Click "System Health" tab in the header
3. View real-time system status and metrics

### Key Features
- **Service Grid**: Overview of all service statuses
- **Dependency Graph**: Visual service relationships
- **Metrics Charts**: Historical performance data
- **Integration Tests**: Manual test execution
- **Alert Management**: Review and manage system alerts

### Real-Time Updates
- Health status updates automatically via WebSocket
- Visual indicators change color based on service health
- Alert notifications appear immediately
- Charts update with new data points

## Error Handling
- Graceful degradation when WebSocket disconnects
- Retry logic for failed API requests
- Error boundaries around health components
- User-friendly error messages and recovery options

## Performance Considerations
- Efficient React Query caching
- Memoized expensive computations
- Virtual scrolling for large service lists
- Optimized WebSocket message handling
- Lazy loading of chart data

## Future Enhancements
- Custom alert rules configuration
- Health metric dashboards
- Service detail drill-down views
- Export health reports
- Mobile-responsive health monitoring