# Staging Terraform Variables for Grafana
# This file should be encrypted or stored in a secure location

# GCP Configuration
project_id = "turnkey-hms-staging"
region     = "us-central1"
environment = "staging"

# Grafana Image
grafana_image = "gcr.io/turnkey-hms-staging/grafana:latest"

# Resource Configuration (lower than production)
min_instances = 1
max_instances = 5
cpu          = "2"
memory       = "2Gi"

# Analytics API (staging endpoint)
analytics_api_url = "https://api-staging.turnkeyhms.com/v1/analytics"

# API Gateway Service Account
api_gateway_service_account = "api-gateway-sa@turnkey-hms-staging.iam.gserviceaccount.com"

# OAuth Configuration (staging domain)
allowed_domains = "staging.turnkeyhms.com"

# Note: Sensitive values should be provided via environment variables or secret manager:
# - grafana_admin_password
# - google_oauth_client_id
# - google_oauth_client_secret