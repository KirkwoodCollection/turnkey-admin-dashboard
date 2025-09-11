#!/bin/bash

# GCP Infrastructure Setup Script for Admin Dashboard

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ID=${GCP_PROJECT:-"turnkey-hms-prod"}
REGION=${GCP_REGION:-"us-central1"}
BUCKET_NAME=${GCS_BUCKET:-"turnkey-admin-dashboard-prod"}
SERVICE_NAME=${CLOUD_RUN_SERVICE:-"admin-dashboard"}

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo -e "${BLUE}🚀 Setting up GCP infrastructure for Admin Dashboard...${NC}"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Bucket: $BUCKET_NAME"
echo ""

# Check if gcloud is configured
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 > /dev/null; then
    log_error "No active gcloud authentication found. Please run: gcloud auth login"
    exit 1
fi

# Set the project
log_info "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID
log_success "Project set successfully"

# Enable required APIs
log_info "Enabling required APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    storage.googleapis.com \
    cdn.googleapis.com \
    compute.googleapis.com \
    monitoring.googleapis.com \
    logging.googleapis.com \
    cloudtrace.googleapis.com

log_success "Required APIs enabled"

# Create Cloud Storage bucket
log_info "Creating Cloud Storage bucket..."
if ! gsutil ls -b gs://$BUCKET_NAME > /dev/null 2>&1; then
    gsutil mb -p $PROJECT_ID -c STANDARD -l US -b on gs://$BUCKET_NAME/
    log_success "Cloud Storage bucket created: gs://$BUCKET_NAME"
else
    log_info "Cloud Storage bucket already exists: gs://$BUCKET_NAME"
fi

# Enable versioning
log_info "Enabling bucket versioning..."
gsutil versioning set on gs://$BUCKET_NAME/

# Set up lifecycle rules
log_info "Setting up lifecycle rules..."
cat > /tmp/lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 30,
          "isLive": false
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set /tmp/lifecycle.json gs://$BUCKET_NAME/
rm /tmp/lifecycle.json
log_success "Lifecycle rules configured"

# Configure CORS
log_info "Configuring CORS..."
cat > /tmp/cors.json << EOF
[
  {
    "origin": ["https://admin.turnkeyhms.com"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["*"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set /tmp/cors.json gs://$BUCKET_NAME/
rm /tmp/cors.json
log_success "CORS configured"

# Create backend bucket for CDN
log_info "Creating backend bucket for CDN..."
if ! gcloud compute backend-buckets describe turnkey-admin-backend > /dev/null 2>&1; then
    gcloud compute backend-buckets create turnkey-admin-backend \
        --gcs-bucket-name=$BUCKET_NAME \
        --enable-cdn \
        --cache-mode=CACHE_ALL_STATIC \
        --default-ttl=3600 \
        --max-ttl=86400
    log_success "Backend bucket created"
else
    log_info "Backend bucket already exists"
fi

# Create URL map
log_info "Creating URL map..."
if ! gcloud compute url-maps describe turnkey-admin-cdn > /dev/null 2>&1; then
    gcloud compute url-maps create turnkey-admin-cdn \
        --default-backend-bucket=turnkey-admin-backend
    log_success "URL map created"
else
    log_info "URL map already exists"
fi

# Create service account
log_info "Creating service account..."
if ! gcloud iam service-accounts describe admin-dashboard-sa@$PROJECT_ID.iam.gserviceaccount.com > /dev/null 2>&1; then
    gcloud iam service-accounts create admin-dashboard-sa \
        --display-name="Admin Dashboard Service Account"
    log_success "Service account created"
else
    log_info "Service account already exists"
fi

# Grant necessary permissions
log_info "Granting IAM permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:admin-dashboard-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer" --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:admin-dashboard-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudtrace.agent" --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:admin-dashboard-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/monitoring.metricWriter" --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:admin-dashboard-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/logging.logWriter" --quiet

log_success "IAM permissions granted"

# Create Artifact Registry repository
log_info "Creating Artifact Registry repository..."
if ! gcloud artifacts repositories describe turnkey-services --location=$REGION > /dev/null 2>&1; then
    gcloud artifacts repositories create turnkey-services \
        --repository-format=docker \
        --location=$REGION \
        --description="TurnkeyHMS service images"
    log_success "Artifact Registry repository created"
else
    log_info "Artifact Registry repository already exists"
fi

# Create monitoring alert notification channel (Slack webhook example)
log_info "Setting up monitoring notification channel..."
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    cat > /tmp/notification-channel.json << EOF
{
  "type": "slack",
  "displayName": "Admin Dashboard Alerts",
  "description": "Slack notifications for Admin Dashboard",
  "labels": {
    "url": "$SLACK_WEBHOOK_URL"
  },
  "enabled": true
}
EOF

    gcloud alpha monitoring channels create --channel-content-from-file=/tmp/notification-channel.json
    rm /tmp/notification-channel.json
    log_success "Notification channel created"
else
    log_warning "SLACK_WEBHOOK_URL not set, skipping notification channel creation"
fi

echo ""
echo "================================================================"
log_success "🎉 GCP infrastructure setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure your DNS to point admin.turnkeyhms.com to the load balancer"
echo "2. Set up SSL certificate for HTTPS"
echo "3. Run the deployment pipeline"
echo "4. Verify deployment with: ./scripts/verify-deployment.sh"
echo ""
echo "Resources created:"
echo "- Cloud Storage bucket: gs://$BUCKET_NAME"
echo "- Backend bucket: turnkey-admin-backend"
echo "- URL map: turnkey-admin-cdn"
echo "- Service account: admin-dashboard-sa@$PROJECT_ID.iam.gserviceaccount.com"
echo "- Artifact Registry: $REGION/turnkey-services"