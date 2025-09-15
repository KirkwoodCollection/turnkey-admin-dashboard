#!/bin/bash

# Deploy API Gateway configuration for Grafana integration
# Usage: ./deploy-gateway.sh [environment]

set -e

ENVIRONMENT=${1:-production}
PROJECT_ID=${GCP_PROJECT_ID}
GRAFANA_URL=${GRAFANA_CLOUD_RUN_URL}
API_NAME="turnkey-admin-api"
API_CONFIG_NAME="grafana-config-${ENVIRONMENT}"
GATEWAY_NAME="turnkey-admin-gateway"
REGION="us-central1"

echo "🚀 Deploying API Gateway configuration for Grafana"
echo "Environment: ${ENVIRONMENT}"
echo "Project: ${PROJECT_ID}"
echo "Grafana URL: ${GRAFANA_URL}"

# Substitute variables in OpenAPI spec
echo "📝 Preparing OpenAPI specification..."
sed -e "s|\${PROJECT_ID}|${PROJECT_ID}|g" \
    -e "s|\${GRAFANA_CLOUD_RUN_URL}|${GRAFANA_URL}|g" \
    openapi-grafana.yaml > /tmp/openapi-grafana-processed.yaml

# Create or update API config
echo "🔧 Creating API configuration..."
gcloud api-gateway api-configs create ${API_CONFIG_NAME} \
  --api=${API_NAME} \
  --openapi-spec=/tmp/openapi-grafana-processed.yaml \
  --project=${PROJECT_ID} \
  --backend-auth-service-account=${API_GATEWAY_SERVICE_ACCOUNT} \
  || echo "Config already exists, updating..."

# Update gateway to use new config
echo "🌐 Updating API Gateway..."
gcloud api-gateway gateways update ${GATEWAY_NAME} \
  --api=${API_NAME} \
  --api-config=${API_CONFIG_NAME} \
  --location=${REGION} \
  --project=${PROJECT_ID}

# Get gateway URL
GATEWAY_URL=$(gcloud api-gateway gateways describe ${GATEWAY_NAME} \
  --location=${REGION} \
  --project=${PROJECT_ID} \
  --format="value(defaultHostname)")

echo "✅ API Gateway deployed successfully!"
echo "Gateway URL: https://${GATEWAY_URL}"
echo "Grafana accessible at: https://${GATEWAY_URL}/analytics/grafana/"

# Cleanup
rm -f /tmp/openapi-grafana-processed.yaml