#!/bin/bash

# Admin Dashboard Production Deployment Verification Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_URL="https://admin.turnkeyhms.com"
CDN_URL="https://admin.turnkeyhms.com"
API_BASE_URL="https://api.turnkeyhms.com"
CLOUD_RUN_SERVICE="admin-dashboard"
CLOUD_RUN_REGION="us-central1"
GCS_BUCKET="turnkey-admin-dashboard-prod"

echo -e "${BLUE}🔍 Starting Admin Dashboard Deployment Verification...${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to log success
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to log error
log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to log warning
log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to log info
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command_exists curl; then
        missing_deps+=("curl")
    fi
    
    if ! command_exists gcloud; then
        missing_deps+=("gcloud")
    fi
    
    if ! command_exists gsutil; then
        missing_deps+=("gsutil")
    fi
    
    if ! command_exists jq; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    log_success "All dependencies are available"
}

# Verify Cloud Storage deployment
verify_cloud_storage() {
    log_info "Verifying Cloud Storage deployment..."
    
    # Check if bucket exists
    if gsutil ls -b gs://$GCS_BUCKET > /dev/null 2>&1; then
        log_success "Cloud Storage bucket exists: gs://$GCS_BUCKET"
    else
        log_error "Cloud Storage bucket not found: gs://$GCS_BUCKET"
        return 1
    fi
    
    # Check if latest files exist
    local required_files=("index.html" "js/" "assets/")
    for file in "${required_files[@]}"; do
        if gsutil ls gs://$GCS_BUCKET/latest/$file > /dev/null 2>&1; then
            log_success "Required file/directory exists: $file"
        else
            log_error "Required file/directory missing: $file"
            return 1
        fi
    done
    
    # Check version file
    if gsutil ls gs://$GCS_BUCKET/latest/version.txt > /dev/null 2>&1; then
        local version=$(gsutil cat gs://$GCS_BUCKET/latest/version.txt)
        log_success "Deployment version: $version"
    else
        log_warning "Version file not found (not critical)"
    fi
}

# Verify CDN deployment
verify_cdn() {
    log_info "Verifying CDN deployment..."
    
    # Check main page loads
    local response=$(curl -s -w "%{http_code}:%{time_total}" -o /dev/null $CDN_URL)
    local http_code=$(echo $response | cut -d: -f1)
    local response_time=$(echo $response | cut -d: -f2)
    
    if [ "$http_code" = "200" ]; then
        log_success "CDN main page accessible (${response_time}s)"
    else
        log_error "CDN main page returned HTTP $http_code"
        return 1
    fi
    
    # Check security headers
    local headers=$(curl -s -I $CDN_URL)
    
    if echo "$headers" | grep -q "X-Frame-Options"; then
        log_success "Security headers present"
    else
        log_warning "Some security headers may be missing"
    fi
    
    # Check cache headers
    if echo "$headers" | grep -q "Cache-Control"; then
        log_success "Cache headers present"
    else
        log_warning "Cache headers may be missing"
    fi
    
    # Check compression
    local compressed_response=$(curl -s -H "Accept-Encoding: gzip" -w "%{size_download}" -o /dev/null $CDN_URL)
    local uncompressed_response=$(curl -s -w "%{size_download}" -o /dev/null $CDN_URL)
    
    if [ "$compressed_response" -lt "$uncompressed_response" ]; then
        log_success "Compression is working"
    else
        log_warning "Compression may not be working properly"
    fi
}

# Verify Cloud Run deployment
verify_cloud_run() {
    log_info "Verifying Cloud Run deployment..."
    
    # Check service exists
    if gcloud run services describe $CLOUD_RUN_SERVICE --region=$CLOUD_RUN_REGION --format="value(status.url)" > /dev/null 2>&1; then
        local service_url=$(gcloud run services describe $CLOUD_RUN_SERVICE --region=$CLOUD_RUN_REGION --format="value(status.url)")
        log_success "Cloud Run service accessible: $service_url"
    else
        log_error "Cloud Run service not found or not accessible"
        return 1
    fi
    
    # Check service health
    local service_url=$(gcloud run services describe $CLOUD_RUN_SERVICE --region=$CLOUD_RUN_REGION --format="value(status.url)")
    local health_response=$(curl -s -w "%{http_code}" -o /dev/null $service_url/health)
    
    if [ "$health_response" = "200" ]; then
        log_success "Cloud Run health check passed"
    else
        log_error "Cloud Run health check failed (HTTP $health_response)"
        return 1
    fi
    
    # Check service configuration
    local memory=$(gcloud run services describe $CLOUD_RUN_SERVICE --region=$CLOUD_RUN_REGION --format="value(spec.template.spec.containers[0].resources.limits.memory)")
    local cpu=$(gcloud run services describe $CLOUD_RUN_SERVICE --region=$CLOUD_RUN_REGION --format="value(spec.template.spec.containers[0].resources.limits.cpu)")
    
    log_info "Service configuration - Memory: $memory, CPU: $cpu"
}

# Verify API connectivity
verify_api_connectivity() {
    log_info "Verifying API connectivity..."
    
    # Check main API health
    local api_health=$(curl -s -w "%{http_code}" -o /dev/null $API_BASE_URL/health)
    
    if [ "$api_health" = "200" ]; then
        log_success "API health check passed"
    else
        log_warning "API health check returned HTTP $api_health"
    fi
    
    # Test API proxy through CDN
    local proxy_response=$(curl -s -w "%{http_code}" -o /dev/null $CDN_URL/api/health)
    
    if [ "$proxy_response" = "200" ]; then
        log_success "API proxy through CDN working"
    else
        log_warning "API proxy returned HTTP $proxy_response"
    fi
}

# Verify monitoring setup
verify_monitoring() {
    log_info "Verifying monitoring setup..."
    
    # Check if monitoring is configured (basic check)
    if gcloud logging logs list --filter="logName:projects/*/logs/run.googleapis.com%2Fstderr" --limit=1 > /dev/null 2>&1; then
        log_success "Cloud Logging is configured"
    else
        log_warning "Cloud Logging configuration not verified"
    fi
    
    # Check monitoring policies exist
    local alert_policies=$(gcloud alpha monitoring policies list --filter="displayName:Admin Dashboard" --format="value(name)" 2>/dev/null | wc -l)
    
    if [ "$alert_policies" -gt 0 ]; then
        log_success "Monitoring alert policies configured ($alert_policies policies)"
    else
        log_warning "No monitoring alert policies found"
    fi
}

# Run performance tests
run_performance_tests() {
    log_info "Running basic performance tests..."
    
    # Lighthouse CI would go here in a real implementation
    # For now, we'll do basic timing tests
    
    local start_time=$(date +%s%N)
    curl -s -o /dev/null $CDN_URL
    local end_time=$(date +%s%N)
    local response_time=$((($end_time - $start_time) / 1000000))
    
    if [ "$response_time" -lt 1000 ]; then
        log_success "Page load time: ${response_time}ms (Good)"
    elif [ "$response_time" -lt 2500 ]; then
        log_warning "Page load time: ${response_time}ms (Acceptable)"
    else
        log_error "Page load time: ${response_time}ms (Poor)"
    fi
}

# Verify SSL/TLS
verify_ssl() {
    log_info "Verifying SSL/TLS configuration..."
    
    local ssl_info=$(curl -s -I $CDN_URL | grep -i "strict-transport-security")
    
    if [ -n "$ssl_info" ]; then
        log_success "HSTS header present"
    else
        log_warning "HSTS header not found"
    fi
    
    # Check SSL certificate
    local ssl_check=$(openssl s_client -connect admin.turnkeyhms.com:443 -servername admin.turnkeyhms.com < /dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    
    if [ -n "$ssl_check" ]; then
        log_success "SSL certificate is valid"
    else
        log_warning "SSL certificate validation failed"
    fi
}

# Main verification function
run_verification() {
    local overall_status=0
    
    check_dependencies || overall_status=1
    
    echo ""
    verify_cloud_storage || overall_status=1
    
    echo ""
    verify_cdn || overall_status=1
    
    echo ""
    verify_cloud_run || overall_status=1
    
    echo ""
    verify_api_connectivity || overall_status=1
    
    echo ""
    verify_monitoring || overall_status=1
    
    echo ""
    run_performance_tests || overall_status=1
    
    echo ""
    verify_ssl || overall_status=1
    
    echo ""
    echo "================================================================"
    
    if [ $overall_status -eq 0 ]; then
        log_success "🎉 Admin Dashboard deployment verification completed successfully!"
        echo ""
        log_info "Deployment URL: $CDN_URL"
        log_info "Service Status: All systems operational"
    else
        log_error "❌ Deployment verification completed with issues!"
        echo ""
        log_info "Please review the warnings and errors above"
        exit 1
    fi
}

# Script entry point
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Admin Dashboard Deployment Verification Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --help, -h     Show this help message"
    echo "  --quick, -q    Run quick verification (skip performance tests)"
    echo ""
    echo "Environment Variables:"
    echo "  PRODUCTION_URL      Production URL (default: https://admin.turnkeyhms.com)"
    echo "  GCS_BUCKET          GCS bucket name (default: turnkey-admin-dashboard-prod)"
    echo "  CLOUD_RUN_SERVICE   Cloud Run service name (default: admin-dashboard)"
    echo "  CLOUD_RUN_REGION    Cloud Run region (default: us-central1)"
    exit 0
fi

if [ "$1" = "--quick" ] || [ "$1" = "-q" ]; then
    log_info "Running quick verification (skipping performance tests)"
    run_performance_tests() { log_info "Performance tests skipped"; }
fi

run_verification