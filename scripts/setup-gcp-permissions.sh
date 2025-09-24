#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check for required environment variable or argument
PROJECT_ID="${1:-${GCP_PROJECT_ID:-}}"

if [ -z "$PROJECT_ID" ]; then
    print_error "Please provide GCP project ID as argument or set GCP_PROJECT_ID environment variable"
    echo "Usage: $0 <project-id>"
    echo "   or: export GCP_PROJECT_ID=<project-id> && $0"
    exit 1
fi

print_info "Setting up IAM permissions for project: $PROJECT_ID"

# Service account names
GITHUB_SA="github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
ADMIN_DASHBOARD_SA="admin-dashboard-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Set the project
print_info "Setting active project to: $PROJECT_ID"
gcloud config set project "$PROJECT_ID" 2>/dev/null || {
    print_error "Failed to set project. Make sure you have access to project: $PROJECT_ID"
    exit 1
}

# Check if service accounts exist
print_info "Checking if service accounts exist..."

if ! gcloud iam service-accounts describe "$GITHUB_SA" --project="$PROJECT_ID" &>/dev/null; then
    print_error "GitHub Actions service account does not exist: $GITHUB_SA"
    print_info "Please create it first or check the account name"
    exit 1
fi

if ! gcloud iam service-accounts describe "$ADMIN_DASHBOARD_SA" --project="$PROJECT_ID" &>/dev/null; then
    print_error "Admin Dashboard service account does not exist: $ADMIN_DASHBOARD_SA"
    print_info "Please run setup-gcp-infrastructure.sh first to create this account"
    exit 1
fi

print_info "Both service accounts exist ✓"

# Grant Service Account User role
print_info "Granting Service Account User role to GitHub Actions deployer..."
print_info "This allows $GITHUB_SA to act as $ADMIN_DASHBOARD_SA"

gcloud iam service-accounts add-iam-policy-binding \
    "$ADMIN_DASHBOARD_SA" \
    --member="serviceAccount:$GITHUB_SA" \
    --role="roles/iam.serviceAccountUser" \
    --project="$PROJECT_ID" \
    --condition=None

if [ $? -eq 0 ]; then
    print_info "Successfully granted Service Account User role ✓"
else
    print_error "Failed to grant Service Account User role"
    exit 1
fi

# Verify the permission was granted
print_info "Verifying IAM permissions..."
POLICY=$(gcloud iam service-accounts get-iam-policy "$ADMIN_DASHBOARD_SA" --project="$PROJECT_ID" --format=json)

if echo "$POLICY" | grep -q "$GITHUB_SA"; then
    print_info "Permission verified successfully ✓"
    echo ""
    print_info "IAM setup complete! The GitHub Actions deployer can now:"
    print_info "  - Act as the admin-dashboard-sa service account"
    print_info "  - Deploy the Admin Dashboard to Cloud Run"
    echo ""
    print_info "Current IAM bindings for $ADMIN_DASHBOARD_SA:"
    gcloud iam service-accounts get-iam-policy "$ADMIN_DASHBOARD_SA" \
        --project="$PROJECT_ID" \
        --format="table(bindings.role,bindings.members)" \
        --flatten="bindings[].members"
else
    print_error "Permission verification failed"
    print_warn "The permission might have been granted but verification failed"
    print_warn "Please check manually with:"
    echo "gcloud iam service-accounts get-iam-policy $ADMIN_DASHBOARD_SA --project=$PROJECT_ID"
    exit 1
fi

echo ""
print_info "Next steps:"
print_info "1. Commit this script to your repository"
print_info "2. Re-run the GitHub Actions deployment workflow"
print_info "3. The deployment should now succeed without IAM permission errors"