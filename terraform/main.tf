terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "turnkey-terraform-state"
    prefix = "admin-dashboard/grafana"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Grafana deployment module
module "grafana" {
  source = "./modules/grafana"

  project_id                  = var.project_id
  region                      = var.region
  environment                 = var.environment
  grafana_image              = var.grafana_image
  grafana_admin_password     = var.grafana_admin_password
  google_oauth_client_id     = var.google_oauth_client_id
  google_oauth_client_secret = var.google_oauth_client_secret
  allowed_domains            = var.allowed_domains
  api_gateway_service_account = var.api_gateway_service_account
  analytics_api_url          = var.analytics_api_url
  min_instances              = var.min_instances
  max_instances              = var.max_instances
  cpu                        = var.cpu
  memory                     = var.memory
}