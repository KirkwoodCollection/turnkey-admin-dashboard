# Admin Dashboard - Production Deployment Guide

This document provides complete instructions for deploying the TurnkeyHMS Admin Dashboard to production on Google Cloud Platform (GCP).

## 🏗️ Architecture Overview

The production deployment uses a globally distributed architecture:

- **Frontend**: React SPA deployed to Cloud Storage + Cloud CDN (200+ edge locations)
- **Backend Service**: Cloud Run for server-side rendering and health checks
- **API Proxy**: Nginx reverse proxy for API calls and WebSocket connections
- **Monitoring**: Cloud Ops for metrics, logging, and alerting
- **CI/CD**: GitHub Actions for automated deployment

## 📋 Prerequisites

### Required Tools
- `gcloud` CLI (latest version)
- `docker` (for local testing)
- `node.js` 18+ and `npm`
- `curl` and `jq` for verification scripts

### Required Permissions
- Cloud Storage Admin
- Cloud Run Admin
- Compute Admin (for CDN)
- Monitoring Admin
- IAM Admin (for service accounts)

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Clone and navigate to the project
cd turnkey-admin-dashboard

# Install dependencies
npm ci

# Set up GCP infrastructure
./scripts/setup-gcp-infrastructure.sh

# Configure environment variables
cp .env.production .env.local
# Edit .env.local with your actual values
```

### 2. Configure Secrets

Set the following GitHub secrets for the CI/CD pipeline:

```
GCP_SA_KEY              # Service account key JSON
GCP_PROJECT             # Your GCP project ID
FIREBASE_PROJECT_ID     # Firebase project ID
GA_MEASUREMENT_ID       # Google Analytics measurement ID
SLACK_WEBHOOK           # Slack webhook for notifications (optional)
```

### 3. Deploy

```bash
# Trigger deployment via GitHub Actions
git push origin main

# Or build and deploy manually
npm run build:production
./scripts/deploy-manual.sh
```

### 4. Verify

```bash
# Run comprehensive verification
./scripts/verify-deployment.sh

# Quick health check
curl -I https://admin.turnkeyhms.com/health
```

## 🗂️ File Structure

```
.
├── .github/workflows/
│   └── deploy-admin-dashboard-production.yml  # CI/CD pipeline
├── scripts/
│   ├── setup-gcp-infrastructure.sh            # Infrastructure setup
│   └── verify-deployment.sh                   # Deployment verification
├── monitoring/
│   ├── admin-dashboard.yaml                   # Cloud Ops dashboard
│   └── alerts.yaml                            # Alert policies
├── vite.config.production.ts                  # Production build config
├── Dockerfile.production                      # Production Docker image
├── nginx.prod.conf                           # Production Nginx config
└── .env.production                           # Production environment template
```

## 🔧 Configuration Details

### Build Configuration (`vite.config.production.ts`)

- **Minification**: Terser with console removal
- **Compression**: Gzip and Brotli
- **Code Splitting**: Vendor, UI, and utility chunks
- **Bundle Analysis**: Visual bundle analyzer
- **Source Maps**: Disabled for security

### Docker Configuration (`Dockerfile.production`)

- **Multi-stage build**: Optimized for size and security
- **Base Image**: `nginx:alpine` for production
- **Security**: Non-root user, signal handling with tini
- **Health Checks**: Built-in health endpoint

### Nginx Configuration (`nginx.prod.conf`)

- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Compression**: Gzip and Brotli for all assets
- **Caching**: Aggressive caching for static assets
- **API Proxy**: Circuit breaker and timeouts
- **WebSocket Support**: Proper upgrade headers

## 📊 Monitoring & Alerting

### Dashboards

The production deployment includes comprehensive monitoring:

- Request latency (P50, P95, P99)
- Error rates and HTTP status codes
- CDN cache hit rates
- Active user connections
- Web Vitals (CLS, LCP, FID)
- Memory and CPU utilization

### Alerts

Automatic alerts for:

- Error rate > 1% for 5 minutes
- P95 latency > 1000ms for 5 minutes
- Cache hit rate < 80% for 10 minutes
- Memory usage > 85% for 5 minutes
- Poor Web Vitals metrics

### Accessing Dashboards

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Monitoring > Dashboards**
3. Select **Admin Dashboard Production**

## 🔄 CI/CD Pipeline

The GitHub Actions workflow includes:

### Test Stage
- Dependency installation
- TypeScript type checking
- ESLint code quality checks
- Unit and integration tests
- Test coverage reporting

### Build Stage
- Production build with optimization
- Version tagging
- Build artifact upload
- Docker image creation

### Deploy Stage
- Parallel deployment to CDN and Cloud Run
- Cache invalidation
- Health checks
- Integration tests

### Rollback Stage
- Automatic rollback on failure
- Slack notifications
- Error reporting

## 🏃‍♂️ Performance Optimizations

### Code Splitting
- **Vendor chunks**: React, MUI, routing libraries
- **Feature chunks**: Lazy-loaded dashboard sections
- **Utility chunks**: Helper functions and APIs

### Caching Strategy
- **Static Assets**: 1 year cache with immutable flag
- **HTML**: 5 minute cache with revalidation
- **API Responses**: Based on endpoint characteristics

### CDN Distribution
- **Global Edge Locations**: 200+ locations worldwide
- **HTTP/2**: Enabled for multiplexing
- **Brotli Compression**: Better than gzip for text assets

## 🔒 Security Features

### Content Security Policy
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
connect-src 'self' https://api.turnkeyhms.com wss://api.turnkeyhms.com;
```

### Additional Headers
- **HSTS**: Enforce HTTPS for 1 year
- **X-Frame-Options**: Prevent clickjacking
- **X-Content-Type-Options**: Prevent MIME sniffing
- **Referrer-Policy**: Limit referrer information

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check dependencies
npm ci
npm run type-check
npm run lint

# Verify build locally
npm run build:production
```

#### Deployment Failures
```bash
# Check GCP authentication
gcloud auth list

# Verify service account permissions
gcloud projects get-iam-policy PROJECT_ID

# Check Cloud Run logs
gcloud run logs read admin-dashboard --region=us-central1
```

#### Performance Issues
```bash
# Analyze bundle size
npm run analyze:bundle

# Check Web Vitals
# Open browser dev tools > Performance > Web Vitals
```

### Health Checks

#### Service Health
```bash
curl https://admin.turnkeyhms.com/health
# Expected: 200 OK with "healthy" response
```

#### API Connectivity
```bash
curl https://admin.turnkeyhms.com/api/health
# Expected: 200 OK from backend API
```

#### CDN Cache
```bash
curl -I https://admin.turnkeyhms.com/
# Check for X-Cache-Status header
```

## 📈 Scaling Considerations

### Auto Scaling
- **Min Instances**: 2 (for availability)
- **Max Instances**: 100 (can be adjusted)
- **Concurrency**: 1000 requests per instance
- **CPU Limit**: 1 vCPU per instance
- **Memory Limit**: 512Mi per instance

### Database Connections
- Connection pooling handled by backend services
- Admin Dashboard only reads through APIs
- No direct database connections

### CDN Scaling
- Automatic scaling via Google's edge network
- No manual intervention required
- Monitors usage and adds capacity automatically

## 🔄 Rollback Procedures

### Automatic Rollback
The CI/CD pipeline automatically rolls back on:
- Failed health checks
- Integration test failures
- Service deployment errors

### Manual Rollback
```bash
# List recent revisions
gcloud run revisions list --service=admin-dashboard --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic admin-dashboard \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=us-central1

# Or rollback CDN deployment
gsutil -m rsync -r -d gs://turnkey-admin-dashboard-prod/v/PREVIOUS_VERSION/ \
  gs://turnkey-admin-dashboard-prod/latest/
```

## 📞 Support

### Monitoring
- **Dashboards**: [Cloud Monitoring Console](https://console.cloud.google.com/monitoring)
- **Logs**: [Cloud Logging Console](https://console.cloud.google.com/logs)
- **Alerts**: Configured to notify via Slack

### Documentation
- **API Docs**: Available at `/api/docs` endpoint
- **Architecture**: See `docs/architecture/` directory
- **Runbooks**: See `docs/runbooks/` directory

### Emergency Contacts
- **DevOps Team**: devops@turnkeyhms.com
- **On-call**: See PagerDuty escalation policy

---

## 📝 Changelog

### Version 1.0.0 (Initial Release)
- Complete production deployment configuration
- Comprehensive monitoring and alerting
- Performance optimizations and security hardening
- CI/CD pipeline with automatic rollback
- Documentation and runbooks