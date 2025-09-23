# Grafana Deployment Guide

## Quick Start

### Local Development

1. **Start Grafana locally with Docker Compose:**
   ```bash
   npm run grafana:dev
   ```
   Access at: http://localhost:3000 (admin/admin)

2. **Start the React app:**
   ```bash
   npm run dev
   ```
   Navigate to Analytics from the main dashboard

### Production Deployment

1. **Set environment variables:**
   ```bash
   export GCP_PROJECT_ID=your-project-id
   export GRAFANA_ADMIN_PASSWORD=strong-password
   export GOOGLE_OAUTH_CLIENT_ID=your-client-id
   export GOOGLE_OAUTH_CLIENT_SECRET=your-secret
   ```

2. **Deploy everything:**
   ```bash
   npm run grafana:deploy
   ```

   This will:
   - Build and push Docker image
   - Deploy with Terraform
   - Update API Gateway

## Architecture Overview

```
┌─────────────────┐     ┌──────────────┐     ┌────────────┐
│  Admin Dashboard│────>│  API Gateway │────>│  Grafana   │
│   (React App)   │     │   (Proxy)    │     │ (Cloud Run)│
└─────────────────┘     └──────────────┘     └────────────┘
                                                    │
                                                    ▼
                                           ┌─────────────────┐
                                           │  Analytics API  │
                                           │    BigQuery     │
                                           └─────────────────┘
```

## File Structure

```
turnkey-admin-dashboard/
├── docker/grafana/              # Grafana Docker configuration
│   ├── Dockerfile
│   ├── provisioning/            # Data sources and dashboard config
│   └── dashboards/              # Dashboard JSON templates
├── terraform/                   # Infrastructure as Code
│   ├── modules/grafana/         # Grafana Cloud Run module
│   └── main.tf                  # Main Terraform configuration
├── deployment/api-gateway/      # API Gateway configuration
│   └── openapi-grafana.yaml     # OpenAPI spec for routing
├── src/components/              # React components
│   └── GrafanaRedirect.tsx      # Redirect component
└── scripts/                     # Deployment scripts
    ├── build-grafana.sh
    └── deploy-grafana.sh
```

## Configuration Details

### Authentication Flow

1. User logs into Admin Dashboard (Firebase Auth)
2. User clicks "Analytics" button
3. React app gets Firebase ID token
4. Browser redirects to `/analytics/grafana/`
5. API Gateway validates Firebase token
6. Gateway forwards token as `X-JWT-Assertion` to Grafana
7. Grafana validates JWT and creates/updates user
8. User sees Grafana dashboard with their role permissions

### Data Sources

#### BigQuery (Historical Data)
- Uses Cloud Run service account
- Requires `bigquery.dataViewer` and `bigquery.jobUser` roles
- Queries analytics dataset directly

#### Analytics API (Real-time)
- REST API for current metrics
- JSON API datasource plugin
- 5-60 second cache depending on metric

### Dashboard Structure

- **KPI Tiles**: Active sessions, conversion rate, revenue, occupancy
- **Funnel Chart**: Booking conversion funnel stages
- **Heatmap**: Destination × Days until arrival
- **Time Series**: Sessions over time
- **Top Lists**: Top destinations, properties
- **System Health**: Health score gauge

## Troubleshooting

### Common Issues

#### JWT Authentication Fails
- Check JWKS URL is correct
- Verify role claim exists in Firebase token
- Ensure X-JWT-Assertion header is forwarded

#### BigQuery Connection Errors
- Verify service account permissions
- Check project ID in datasource config
- Ensure BigQuery API is enabled

#### Dashboard Not Loading
- Check Analytics API is responding
- Verify datasource UIDs match dashboard config
- Review browser console for errors

### Debugging Commands

```bash
# View Grafana logs
gcloud run services logs read analytics-grafana --limit=50

# Test Analytics API
curl https://api.turnkeyhms.com/v1/analytics/metrics/overview

# Check service account permissions
gcloud projects get-iam-policy $GCP_PROJECT_ID \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:grafana-sa"
```

## Security Notes

- Grafana never writes to databases (read-only)
- All access requires valid Firebase JWT
- Service account has minimal permissions
- No credentials stored in code
- All connections over HTTPS

## Maintenance

### Update Dashboards
1. Edit in Grafana UI
2. Export as JSON
3. Save to `docker/grafana/dashboards/`
4. Rebuild and redeploy image

### Update Data Sources
1. Edit `provisioning/datasources/datasources.yaml`
2. Rebuild and redeploy image

### Roll Back
```bash
# List Cloud Run revisions
gcloud run revisions list --service=analytics-grafana

# Route traffic to previous revision
gcloud run services update-traffic analytics-grafana \
  --to-revisions=REVISION_NAME=100
```

## Related Documentation

- [GRAFANA_IMPLEMENTATION.md](./GRAFANA_IMPLEMENTATION.md) - Detailed implementation guide
- [GRAFANA_DATA_PROVIDER_NOTES.md](./GRAFANA_DATA_PROVIDER_NOTES.md) - Analytics API requirements
- [SERVICE_BOUNDARIES.md](./SERVICE_BOUNDARIES.md) - Service separation details