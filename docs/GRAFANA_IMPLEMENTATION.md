# Grafana Implementation Guide - Admin Dashboard Microservice

## Overview

This document provides complete instructions for deploying and integrating Grafana into the TurnkeyHMS Admin Dashboard. **The Admin Dashboard microservice OWNS Grafana deployment** - it is deployed, configured, and maintained as part of this service. Grafana serves as our historical analytics visualization layer, consuming pre-computed metrics from the Analytics service.

## Service Boundaries

### What Admin Dashboard OWNS (This Service)
- ✅ Grafana deployment on Cloud Run
- ✅ Grafana configuration and provisioning
- ✅ Authentication integration (Firebase JWT + Google OAuth)
- ✅ Dashboard templates and version control
- ✅ React app integration and routing
- ✅ API Gateway configuration for Grafana routes

### What Admin Dashboard CONSUMES
- 📊 Pre-computed metrics from Analytics API
- 📊 BigQuery views maintained by Analytics service
- 📊 Real-time metrics endpoints from Analytics service

### What Admin Dashboard DOES NOT DO
- ❌ Compute any metrics (all computation in Analytics service)
- ❌ Query raw event data directly
- ❌ Manage BigQuery schemas (Analytics service owns these)
- ❌ Process WebSocket events in Grafana (custom UI only)

---

## 1. Grafana Container Setup

### Docker Image Configuration

Create `docker/grafana/Dockerfile`:

```dockerfile
FROM grafana/grafana:10.2.0

# Install required plugins
ENV GF_INSTALL_PLUGINS=grafana-bigquery-datasource,marcusolsson-json-datasource

# Copy provisioning files
COPY provisioning/ /etc/grafana/provisioning/

# Copy custom dashboards
COPY dashboards/ /var/lib/grafana/dashboards/

# Set permissions
USER root
RUN chown -R grafana:grafana /var/lib/grafana/dashboards
USER grafana
```

### Provisioning Configuration

Create `docker/grafana/provisioning/datasources/datasources.yaml`:

```yaml
apiVersion: 1

datasources:
  # BigQuery for historical analytics
  - name: BigQuery Analytics
    type: grafana-bigquery-datasource
    access: proxy
    isDefault: true
    editable: false
    jsonData:
      authenticationType: gce  # Use Cloud Run service account
      defaultProject: "${GCP_PROJECT_ID}"
    uid: bigquery-analytics

  # Analytics API for real-time metrics
  - name: Analytics API
    type: marcusolsson-json-datasource
    access: proxy
    url: "https://api.turnkeyhms.com/v1/analytics"
    editable: false
    jsonData:
      # Analytics API is internal, accessed via service account
      authenticationType: none
    uid: analytics-api
```

Create `docker/grafana/provisioning/dashboards/dashboards.yaml`:

```yaml
apiVersion: 1

providers:
  - name: TurnkeyHMS Dashboards
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 600
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
```

### Build and Push Image

```bash
# Build the custom Grafana image
docker build -t gcr.io/${GCP_PROJECT_ID}/grafana:latest docker/grafana/

# Push to Container Registry
docker push gcr.io/${GCP_PROJECT_ID}/grafana:latest
```

---

## 2. Terraform Deployment

### Cloud Run Service Configuration

Create `terraform/modules/grafana/main.tf`:

```hcl
resource "google_service_account" "grafana" {
  account_id   = "grafana-sa"
  display_name = "Grafana Service Account"
  description  = "Service account for Grafana to access BigQuery and Analytics API"
}

# Grant BigQuery access
resource "google_project_iam_member" "grafana_bigquery_viewer" {
  project = var.project_id
  role    = "roles/bigquery.dataViewer"
  member  = "serviceAccount:${google_service_account.grafana.email}"
}

resource "google_project_iam_member" "grafana_bigquery_job_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.grafana.email}"
}

resource "google_cloud_run_service" "grafana" {
  name     = "analytics-grafana"
  location = var.region

  template {
    spec {
      service_account_name = google_service_account.grafana.email

      containers {
        image = "gcr.io/${var.project_id}/grafana:latest"

        env {
          name  = "GF_SECURITY_ADMIN_PASSWORD"
          value = var.grafana_admin_password
        }

        # Firebase JWT Authentication
        env {
          name  = "GF_AUTH_JWT_ENABLED"
          value = "true"
        }
        env {
          name  = "GF_AUTH_JWT_HEADER_NAME"
          value = "X-JWT-Assertion"
        }
        env {
          name  = "GF_AUTH_JWT_EMAIL_CLAIM"
          value = "email"
        }
        env {
          name  = "GF_AUTH_JWT_USERNAME_CLAIM"
          value = "email"
        }
        env {
          name  = "GF_AUTH_JWT_JWK_SET_URL"
          value = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
        }
        env {
          name  = "GF_AUTH_JWT_AUTO_SIGN_UP"
          value = "true"
        }
        env {
          name  = "GF_AUTH_JWT_ROLE_ATTRIBUTE_PATH"
          value = "role"
        }

        # Google OAuth (backup auth)
        env {
          name  = "GF_AUTH_GOOGLE_ENABLED"
          value = "true"
        }
        env {
          name  = "GF_AUTH_GOOGLE_CLIENT_ID"
          value = var.google_oauth_client_id
        }
        env {
          name  = "GF_AUTH_GOOGLE_CLIENT_SECRET"
          value = var.google_oauth_client_secret
        }
        env {
          name  = "GF_AUTH_GOOGLE_ALLOWED_DOMAINS"
          value = var.allowed_domains
        }

        # Server configuration
        env {
          name  = "GF_SERVER_ROOT_URL"
          value = "https://admin.turnkeyhms.com/analytics/grafana/"
        }
        env {
          name  = "GF_SERVER_SERVE_FROM_SUB_PATH"
          value = "true"
        }

        # Project ID for BigQuery
        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }

        resources {
          limits = {
            cpu    = "2"
            memory = "2Gi"
          }
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "10"
        "autoscaling.knative.dev/minScale" = "1"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Allow API Gateway to invoke Grafana
resource "google_cloud_run_service_iam_member" "grafana_invoker" {
  service  = google_cloud_run_service.grafana.name
  location = google_cloud_run_service.grafana.location
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.api_gateway_service_account}"
}

output "grafana_url" {
  value = google_cloud_run_service.grafana.status[0].url
}
```

### API Gateway Configuration

Update your API Gateway OpenAPI spec to include Grafana routing:

```yaml
paths:
  /analytics/grafana/{proxy+}:
    get:
      summary: Grafana Analytics Dashboard
      operationId: grafanaProxy
      security:
        - firebase: []  # Require Firebase Auth
      parameters:
        - name: proxy
          in: path
          required: true
          schema:
            type: string
      x-google-backend:
        address: ${GRAFANA_CLOUD_RUN_URL}
        path_translation: APPEND_PATH_TO_ADDRESS
        jwt_audience: ${GRAFANA_CLOUD_RUN_URL}
      x-google-endpoints:
        - name: "X-JWT-Assertion"
          in: header
          value_prefix: "Bearer "
          value_source: "Authorization"
```

---

## 3. Dashboard Templates

### Main Analytics Dashboard

Create `docker/grafana/dashboards/main-analytics.json`:

```json
{
  "dashboard": {
    "title": "TurnkeyHMS Analytics",
    "uid": "turnkey-main",
    "panels": [
      {
        "id": 1,
        "type": "stat",
        "title": "Active Sessions",
        "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0},
        "targets": [
          {
            "datasource": "Analytics API",
            "refId": "A",
            "path": "/metrics/realtime",
            "fields": [
              {
                "jsonPath": "$.active_sessions",
                "name": "Active Sessions"
              }
            ]
          }
        ],
        "interval": "5s"
      },
      {
        "id": 2,
        "type": "stat",
        "title": "Conversion Rate",
        "gridPos": {"h": 4, "w": 6, "x": 6, "y": 0},
        "targets": [
          {
            "datasource": "Analytics API",
            "refId": "A",
            "path": "/metrics/overview",
            "fields": [
              {
                "jsonPath": "$.kpis.conversion_rate",
                "name": "Conversion Rate"
              }
            ]
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "decimals": 2
          }
        }
      },
      {
        "id": 3,
        "type": "heatmap",
        "title": "Bookings Heatmap (Destination × Days Until Arrival)",
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8},
        "targets": [
          {
            "datasource": "BigQuery Analytics",
            "refId": "A",
            "rawSql": "SELECT destination, days_until_arrival, COUNT(*) as bookings FROM `${project}.analytics.booking_heatmap` WHERE date >= CURRENT_DATE() - 7 GROUP BY 1, 2",
            "format": "time_series"
          }
        ]
      },
      {
        "id": 4,
        "type": "bargauge",
        "title": "Booking Funnel",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16},
        "targets": [
          {
            "datasource": "Analytics API",
            "refId": "A",
            "path": "/metrics/funnel",
            "fields": [
              {
                "jsonPath": "$.stages[*]",
                "name": ""
              }
            ]
          }
        ]
      }
    ],
    "refresh": "10s",
    "time": {
      "from": "now-24h",
      "to": "now"
    }
  }
}
```

---

## 4. React Application Integration

### Router Configuration

Update `src/App.tsx`:

```typescript
import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Component to handle Grafana redirect
const GrafanaRedirect: React.FC = () => {
  const { getIdToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const redirectToGrafana = async () => {
      try {
        // Get Firebase ID token
        const token = await getIdToken();

        // Store token in session storage for gateway to pick up
        sessionStorage.setItem('firebaseToken', token);

        // Redirect to Grafana (same origin via API Gateway)
        window.location.href = '/analytics/grafana/d/turnkey-main';
      } catch (error) {
        console.error('Failed to redirect to Grafana:', error);
        navigate('/dashboard');
      }
    };

    redirectToGrafana();
  }, [getIdToken, navigate]);

  return (
    <div>Loading analytics dashboard...</div>
  );
};

// Main app routes
export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/analytics/grafana/*" element={<GrafanaRedirect />} />
      <Route path="/realtime" element={<RealtimeDashboard />} />
      {/* Other routes */}
    </Routes>
  );
};
```

### Navigation Menu Integration

Update navigation to include Grafana:

```typescript
// src/components/Navigation.tsx
export const Navigation: React.FC = () => {
  return (
    <nav>
      <Link to="/dashboard">Overview</Link>
      <Link to="/realtime">Live Sessions</Link>
      <Link to="/analytics/grafana">Historical Analytics</Link>
    </nav>
  );
};
```

---

## 5. Authentication Flow

### Firebase JWT → Grafana

1. User logs into Admin Dashboard with Firebase Auth
2. React app obtains Firebase ID token with role claim
3. When accessing `/analytics/grafana/*`:
   - API Gateway validates Firebase token
   - Gateway forwards token as `X-JWT-Assertion` header
   - Grafana validates JWT against Google's JWKS
   - Grafana creates/updates user with appropriate role

### Role Mapping

| Firebase Role | Grafana Role | Permissions |
|--------------|--------------|-------------|
| admin | Admin | Full access, can edit dashboards |
| editor | Editor | Can create/edit dashboards |
| viewer | Viewer | Read-only access |

---

## 6. Deployment Steps

### Initial Deployment

```bash
# 1. Build and push Grafana image
docker build -t gcr.io/${GCP_PROJECT_ID}/grafana:latest docker/grafana/
docker push gcr.io/${GCP_PROJECT_ID}/grafana:latest

# 2. Deploy with Terraform
cd terraform
terraform init
terraform plan -var-file=production.tfvars
terraform apply -var-file=production.tfvars

# 3. Update API Gateway with new OpenAPI spec
gcloud api-gateway api-configs create grafana-config \
  --api=turnkey-api \
  --openapi-spec=openapi.yaml \
  --project=${GCP_PROJECT_ID}

# 4. Deploy React app with Grafana routes
npm run build
gcloud app deploy
```

### Verification Checklist

- [ ] Grafana Cloud Run service is running
- [ ] API Gateway routes `/analytics/grafana/*` correctly
- [ ] Firebase JWT authentication works
- [ ] BigQuery datasource connects successfully
- [ ] Analytics API datasource returns data
- [ ] Dashboards load with correct metrics
- [ ] Role-based access control enforced
- [ ] React app redirects to Grafana seamlessly

---

## 7. Custom Dashboard Development

### Creating New Dashboards

1. Design dashboard in Grafana UI (access via `/analytics/grafana`)
2. Export dashboard as JSON
3. Add to `docker/grafana/dashboards/`
4. Rebuild and redeploy image

### Query Examples

#### BigQuery Query for Top Destinations
```sql
SELECT
  destination,
  COUNT(*) as booking_count,
  SUM(revenue) as total_revenue
FROM `project.analytics.bookings`
WHERE date >= CURRENT_DATE() - 30
GROUP BY destination
ORDER BY booking_count DESC
LIMIT 10
```

#### Analytics API Query for Real-time Metrics
```json
{
  "path": "/metrics/realtime",
  "method": "GET",
  "params": {
    "property_id": "${property_id}",
    "interval": "1m"
  }
}
```

---

## 8. Monitoring & Maintenance

### Health Checks

- Cloud Run health endpoint: `/`
- Grafana API health: `/analytics/grafana/api/health`
- Dashboard data freshness alerts

### Log Monitoring

```bash
# View Grafana logs
gcloud run services logs read analytics-grafana --limit=50

# Check for authentication errors
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.msg=~'JWT'" --limit=20
```

### Dashboard Version Control

All dashboard JSON files in `docker/grafana/dashboards/` should be:
- Committed to git
- Tagged with version numbers
- Documented with change descriptions

---

## 9. Troubleshooting

### Common Issues

#### JWT Authentication Fails
- Verify JWKS URL is correct
- Check role claim exists in Firebase token
- Ensure X-JWT-Assertion header is forwarded

#### BigQuery Connection Errors
- Verify service account has BigQuery permissions
- Check project ID in datasource config
- Ensure BigQuery API is enabled

#### Dashboard Not Loading
- Check Analytics API endpoints are responding
- Verify refresh intervals aren't too aggressive
- Review browser console for CORS errors

---

## 10. Security Considerations

### Access Control
- All access requires valid Firebase JWT
- Grafana enforces role-based permissions
- No direct public access to Grafana

### Data Security
- BigQuery access via service account only
- No credentials stored in code
- All connections over HTTPS

### Audit Logging
- All dashboard access logged
- Query history retained in BigQuery
- User actions tracked in Cloud Logging

---

## Related Documentation

- [SERVICE_BOUNDARIES.md](./SERVICE_BOUNDARIES.md) - Service separation details
- [GRAFANA_DATA_PROVIDER_NOTES.md](./GRAFANA_DATA_PROVIDER_NOTES.md) - Analytics API requirements
- [Grafana Documentation](https://grafana.com/docs/) - Official Grafana docs
- [BigQuery Plugin Docs](https://grafana.com/grafana/plugins/grafana-bigquery-datasource/) - BigQuery datasource guide

---

*This document is maintained by the Admin Dashboard team. For questions about data sources or metrics calculations, consult the Analytics service team.*