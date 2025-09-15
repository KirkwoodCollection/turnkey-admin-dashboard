#!/bin/bash

# Build and push Grafana Docker image to Google Container Registry
# Usage: ./scripts/build-grafana.sh [environment]

set -e

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_ID=${GCP_PROJECT_ID:-your-project-id}
IMAGE_NAME="grafana"
TAG="latest"
FULL_IMAGE="gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${TAG}"

echo "🐳 Building Grafana Docker image"
echo "Environment: ${ENVIRONMENT}"
echo "Project ID: ${PROJECT_ID}"
echo "Image: ${FULL_IMAGE}"

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Build the Docker image
echo "📦 Building Docker image..."
docker build \
  --platform linux/amd64 \
  -t ${FULL_IMAGE} \
  -f docker/grafana/Dockerfile \
  docker/grafana/

# Tag for environment
if [ "${ENVIRONMENT}" != "production" ]; then
  ENVIRONMENT_TAG="gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${ENVIRONMENT}"
  docker tag ${FULL_IMAGE} ${ENVIRONMENT_TAG}
  echo "Tagged as: ${ENVIRONMENT_TAG}"
fi

# Push to Container Registry
echo "🚀 Pushing image to Container Registry..."
docker push ${FULL_IMAGE}

if [ "${ENVIRONMENT}" != "production" ]; then
  docker push ${ENVIRONMENT_TAG}
fi

echo "✅ Grafana image built and pushed successfully!"
echo ""
echo "To deploy with Terraform:"
echo "  cd terraform"
echo "  terraform apply -var=\"grafana_image=${FULL_IMAGE}\""