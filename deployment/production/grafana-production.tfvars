# Production Terraform Variables for Grafana
# This file should be encrypted or stored in a secure location

# GCP Configuration
project_id = "turnkey-hms-production"
region     = "us-central1"
environment = "production"

# Grafana Image
grafana_image = "gcr.io/turnkey-hms-production/grafana:latest"

# Resource Configuration
min_instances = 2  # Higher minimum for production
max_instances = 20
cpu          = "4"    # More CPU for production load
memory       = "4Gi"  # More memory for production

# Analytics API
analytics_api_url = "https://api.turnkeyhms.com/v1/analytics"

# API Gateway Service Account
api_gateway_service_account = "api-gateway-sa@turnkey-hms-production.iam.gserviceaccount.com"

# OAuth Configuration (non-sensitive)
allowed_domains = "turnkeyhms.com"

# Note: Sensitive values should be provided via environment variables or secret manager:
# - grafana_admin_password
# - google_oauth_client_id
# - google_oauth_client_secret