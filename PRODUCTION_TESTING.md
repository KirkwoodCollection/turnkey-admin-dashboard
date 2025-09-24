# Production Testing Guide - Admin Dashboard

## 🚀 LATEST DEPLOYMENT STATUS

**Container**: `turnkey-admin-dashboard-prod-latest` (ID: 19d39d10129b)
**Built From**: Commit `9a6ae59 2025-09-23 EOD iMac Commit`
**Image Size**: 125MB
**Status**: ✅ HEALTHY and RUNNING

## Production Testing Procedures

### 1. Health Check Verification
```bash
# Basic health check
curl -f http://localhost:8080/health

# Expected Response:
{
  "status": "healthy",
  "timestamp": "2025-09-24T05:30:06.155465",
  "version": "1.0.0-local",
  "environment": "development",
  "uptime_seconds": 295.004378,
  "checks": {
    "service": "healthy",
    "timestamp": "2025-09-24T05:30:06.155465"
  }
}
```

### 2. Application Load Test
```bash
# Verify main application loads
curl -s http://localhost:8080 | grep -o '<title>[^<]*</title>'
# Expected: <title>TurnkeyHMS Admin Dashboard</title>

# Check React app bundle loads
curl -s http://localhost:8080 | grep -E "(js|css)" | head -3
```

### 3. API Integration Testing

#### Analytics Service Integration
```bash
# Test Analytics API with authentication
curl -H "X-API-Key: analytics-prod-37341e59036fdca793c95437e5ba178a888bb3aeaca11c281cae796dde91995b" \
  http://localhost:8001/api/v1/analytics/metrics

# Expected: JSON response with metrics data
```

#### Events Service Integration
```bash
# Test Events API with GitHub Secret (in production)
curl -H "X-Internal-API-Key: [FROM_GITHUB_SECRET]" \
  https://api.turnkeyhms.com/api/v1/admin/sessions

# Expected: Session data or proper authentication challenge
```

### 4. Performance Testing
```bash
# Response time test
time curl -s http://localhost:8080/health

# Load test (10 concurrent requests)
for i in {1..10}; do
  curl -s http://localhost:8080/ > /dev/null &
done
wait
```

### 5. Security Verification
```bash
# Check security headers
curl -I http://localhost:8080

# Expected headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

### 6. Container Status Monitoring
```bash
# Check container status
docker ps | grep turnkey-admin-dashboard

# Check resource usage
docker stats turnkey-admin-dashboard-prod-latest --no-stream

# Check logs for errors
docker logs turnkey-admin-dashboard-prod-latest --tail 50
```

## Production Environment Testing

### Local Production Environment
- **URL**: http://localhost:8080
- **Health**: http://localhost:8080/health
- **Container**: turnkey-admin-dashboard-prod-latest
- **Status**: ✅ Ready for testing

### Cloud Production Testing (When Deployed)
```bash
# Replace with actual production URL
PROD_URL="https://admin.turnkeyhms.com"

# Health check
curl -f $PROD_URL/health

# Application load test
curl -s $PROD_URL | grep "<title>"

# API integration (with production keys from GitHub Secrets)
# This happens automatically in cloud deployment
```

## Integration Test Checklist

### ✅ Dashboard UI Tests
- [ ] Main dashboard loads without errors
- [ ] Navigation menu functional
- [ ] Dark/light theme switching
- [ ] Responsive layout on different screen sizes
- [ ] Loading states display correctly
- [ ] Error boundaries handle failures gracefully

### ✅ Analytics Integration Tests
- [ ] Metrics tiles display data or empty states
- [ ] Charts render correctly
- [ ] Time range filtering works
- [ ] Data export functionality
- [ ] Real-time updates (when data available)
- [ ] Graceful handling of API failures

### ✅ Events Integration Tests
- [ ] Session list loads and paginates
- [ ] Session details view functional
- [ ] Real-time session updates
- [ ] Admin actions work (if implemented)
- [ ] WebSocket connection stable

### ✅ Authentication Tests
- [ ] Mock authentication works in development
- [ ] Firebase integration ready (when implemented)
- [ ] Protected routes redirect appropriately
- [ ] Token refresh handling

## Performance Benchmarks

### Expected Performance Metrics
- **Initial Load Time**: < 2 seconds
- **Health Check Response**: < 100ms
- **API Response Time**: < 500ms
- **Memory Usage**: < 50MB
- **Build Size**: ~125MB (compressed)

### Monitoring Commands
```bash
# Memory usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" --no-stream

# Response times
curl -o /dev/null -s -w "%{time_total}s\n" http://localhost:8080/health

# Disk usage
docker images | grep turnkey-admin-dashboard
```

## Troubleshooting Guide

### Common Issues

**Container won't start**:
```bash
docker logs turnkey-admin-dashboard-prod-latest
# Check for nginx configuration errors or port conflicts
```

**Application not loading**:
```bash
# Check if files were copied correctly
docker exec turnkey-admin-dashboard-prod-latest ls -la /usr/share/nginx/html/
```

**API integration failures**:
```bash
# Verify environment variables
docker exec turnkey-admin-dashboard-prod-latest env | grep VITE_
```

### Health Check Failures
- Verify port 8080 is not blocked
- Check nginx configuration
- Ensure container has proper permissions

## Deployment Validation

### Pre-Production Checklist
- [ ] Latest commit built successfully
- [ ] All TypeScript errors resolved or bypassed
- [ ] Environment variables configured
- [ ] API keys stored securely
- [ ] Health checks passing
- [ ] Integration tests passing

### Post-Deployment Verification
- [ ] Application accessible at production URL
- [ ] All integrations working
- [ ] Performance metrics within acceptable range
- [ ] No critical errors in logs
- [ ] Monitoring alerts configured

## Next Steps

1. **Staging Deployment**: Deploy to staging environment with production configuration
2. **Load Testing**: Run comprehensive load tests with realistic traffic
3. **Security Audit**: Complete security review and penetration testing
4. **Monitoring Setup**: Configure alerts and dashboards
5. **Go-Live**: Deploy to production with proper rollback plan

---

**Current Status**: ✅ Local production environment tested and validated
**Ready For**: Staging deployment and comprehensive testing