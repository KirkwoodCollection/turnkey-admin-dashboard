variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run deployment"
  type        = string
  default     = "us-central1"
}

variable "grafana_image" {
  description = "Docker image for Grafana"
  type        = string
}

variable "grafana_admin_password" {
  description = "Admin password for Grafana"
  type        = string
  sensitive   = true
}

variable "google_oauth_client_id" {
  description = "Google OAuth client ID for Grafana"
  type        = string
}

variable "google_oauth_client_secret" {
  description = "Google OAuth client secret for Grafana"
  type        = string
  sensitive   = true
}

variable "allowed_domains" {
  description = "Allowed email domains for Google OAuth"
  type        = string
  default     = ""
}

variable "api_gateway_service_account" {
  description = "Service account email for API Gateway"
  type        = string
}

variable "analytics_api_url" {
  description = "URL for Analytics API service"
  type        = string
  default     = "https://api.turnkeyhms.com/v1/analytics"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 1
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10
}

variable "cpu" {
  description = "CPU allocation for Cloud Run"
  type        = string
  default     = "2"
}

variable "memory" {
  description = "Memory allocation for Cloud Run"
  type        = string
  default     = "2Gi"
}