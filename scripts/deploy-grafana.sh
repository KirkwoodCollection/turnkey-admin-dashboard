#!/bin/bash

# Complete Grafana deployment script
# Usage: ./scripts/deploy-grafana.sh [environment]

set -e

ENVIRONMENT=${1:-production}
PROJECT_ID=${GCP_PROJECT_ID}

echo "🚀 Deploying Grafana to ${ENVIRONMENT}"
echo "Project: ${PROJECT_ID}"

# Step 1: Build and push Docker image
echo "Step 1: Building Docker image..."
./scripts/build-grafana.sh ${ENVIRONMENT}

# Step 2: Deploy with Terraform
echo "Step 2: Deploying with Terraform..."
cd terraform

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
  echo "Initializing Terraform..."
  terraform init
fi

# Plan deployment
echo "Planning Terraform deployment..."
terraform plan \
  -var="environment=${ENVIRONMENT}" \
  -var="project_id=${PROJECT_ID}" \
  -var="grafana_image=gcr.io/${PROJECT_ID}/grafana:latest" \
  -out=tfplan

# Apply deployment
echo "Applying Terraform configuration..."
terraform apply tfplan

# Get outputs
GRAFANA_URL=$(terraform output -raw grafana_url)

# Step 3: Update API Gateway
echo "Step 3: Updating API Gateway..."
cd ../deployment/api-gateway
export GRAFANA_CLOUD_RUN_URL=${GRAFANA_URL}
./deploy-gateway.sh ${ENVIRONMENT}

echo "✅ Grafana deployment complete!"
echo ""
echo "Grafana URL: ${GRAFANA_URL}"
echo "Access via: https://admin.turnkeyhms.com/analytics/grafana/"
echo ""
echo "Next steps:"
echo "1. Verify Grafana is accessible"
echo "2. Check dashboard loads correctly"
echo "3. Test authentication flow"
echo "4. Verify data sources are connected"