output "grafana_url" {
  description = "URL of the Grafana Cloud Run service"
  value       = module.grafana.grafana_url
}

output "grafana_service_name" {
  description = "Name of the Grafana Cloud Run service"
  value       = module.grafana.grafana_service_name
}

output "grafana_service_account_email" {
  description = "Email of the Grafana service account"
  value       = module.grafana.grafana_service_account_email
}

output "grafana_service_location" {
  description = "Location of the Grafana Cloud Run service"
  value       = module.grafana.grafana_service_location
}