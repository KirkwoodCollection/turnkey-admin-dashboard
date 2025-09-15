resource "google_service_account" "grafana" {
  account_id   = "grafana-sa-${var.environment}"
  display_name = "Grafana Service Account (${var.environment})"
  description  = "Service account for Grafana to access BigQuery and Analytics API"
  project      = var.project_id
}

# Grant BigQuery Data Viewer role
resource "google_project_iam_member" "grafana_bigquery_viewer" {
  project = var.project_id
  role    = "roles/bigquery.dataViewer"
  member  = "serviceAccount:${google_service_account.grafana.email}"
}

# Grant BigQuery Job User role
resource "google_project_iam_member" "grafana_bigquery_job_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.grafana.email}"
}

# Cloud Run service for Grafana
resource "google_cloud_run_service" "grafana" {
  name     = "analytics-grafana-${var.environment}"
  location = var.region
  project  = var.project_id

  template {
    spec {
      service_account_name = google_service_account.grafana.email

      containers {
        image = var.grafana_image

        # Grafana configuration via environment variables
        env {
          name  = "GF_SECURITY_ADMIN_PASSWORD"
          value = var.grafana_admin_password
        }

        env {
          name  = "GF_SECURITY_ADMIN_USER"
          value = "admin"
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

        # Google OAuth Configuration
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

        env {
          name  = "GF_AUTH_GOOGLE_ALLOW_SIGN_UP"
          value = "true"
        }

        # Server Configuration
        env {
          name  = "GF_SERVER_ROOT_URL"
          value = "https://admin.turnkeyhms.com/analytics/grafana/"
        }

        env {
          name  = "GF_SERVER_SERVE_FROM_SUB_PATH"
          value = "true"
        }

        env {
          name  = "GF_SERVER_DOMAIN"
          value = "admin.turnkeyhms.com"
        }

        # Security Configuration
        env {
          name  = "GF_SECURITY_COOKIE_SECURE"
          value = "true"
        }

        env {
          name  = "GF_SECURITY_COOKIE_SAMESITE"
          value = "lax"
        }

        # Analytics Configuration
        env {
          name  = "GF_ANALYTICS_REPORTING_ENABLED"
          value = "false"
        }

        env {
          name  = "GF_ANALYTICS_CHECK_FOR_UPDATES"
          value = "false"
        }

        # Data Source Configuration
        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }

        env {
          name  = "ANALYTICS_API_URL"
          value = var.analytics_api_url
        }

        # Logging
        env {
          name  = "GF_LOG_MODE"
          value = "console"
        }

        env {
          name  = "GF_LOG_LEVEL"
          value = "info"
        }

        ports {
          container_port = 3000
        }

        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }

        # Health check
        liveness_probe {
          http_get {
            path = "/api/health"
            port = 3000
          }
          initial_delay_seconds = 30
          period_seconds        = 10
          timeout_seconds       = 5
          failure_threshold     = 3
        }

        readiness_probe {
          http_get {
            path = "/api/health"
            port = 3000
          }
          initial_delay_seconds = 10
          period_seconds        = 5
          timeout_seconds       = 3
          failure_threshold     = 3
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale"     = tostring(var.min_instances)
        "autoscaling.knative.dev/maxScale"     = tostring(var.max_instances)
        "run.googleapis.com/startup-cpu-boost" = "true"
      }
      labels = {
        "environment" = var.environment
        "service"     = "grafana"
        "component"   = "analytics"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  lifecycle {
    ignore_changes = [
      template[0].metadata[0].annotations["run.googleapis.com/client-name"],
      template[0].metadata[0].annotations["run.googleapis.com/client-version"]
    ]
  }
}

# Allow API Gateway to invoke Grafana
resource "google_cloud_run_service_iam_member" "grafana_invoker" {
  service  = google_cloud_run_service.grafana.name
  location = google_cloud_run_service.grafana.location
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.api_gateway_service_account}"
  project  = var.project_id
}

# Allow authenticated users to invoke Grafana (for debugging)
resource "google_cloud_run_service_iam_member" "grafana_users" {
  service  = google_cloud_run_service.grafana.name
  location = google_cloud_run_service.grafana.location
  role     = "roles/run.invoker"
  member   = "allAuthenticatedUsers"
  project  = var.project_id
}