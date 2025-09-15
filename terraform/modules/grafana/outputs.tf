output "grafana_url" {
  description = "URL of the Grafana Cloud Run service"
  value       = google_cloud_run_service.grafana.status[0].url
}

output "grafana_service_name" {
  description = "Name of the Grafana Cloud Run service"
  value       = google_cloud_run_service.grafana.name
}

output "grafana_service_account_email" {
  description = "Email of the Grafana service account"
  value       = google_service_account.grafana.email
}

output "grafana_service_location" {
  description = "Location of the Grafana Cloud Run service"
  value       = google_cloud_run_service.grafana.location
}