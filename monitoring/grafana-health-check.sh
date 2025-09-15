#!/bin/bash

# Grafana Health Check Script
# Monitors Grafana service health and data source connectivity

set -e

# Configuration
GRAFANA_URL=${GRAFANA_URL:-"https://admin.turnkeyhms.com/analytics/grafana"}
GRAFANA_API_KEY=${GRAFANA_API_KEY}
SLACK_WEBHOOK=${SLACK_WEBHOOK}
CHECK_INTERVAL=${CHECK_INTERVAL:-60}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Health check function
check_health() {
    local endpoint=$1
    local description=$2

    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
        "${GRAFANA_URL}${endpoint}")

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓${NC} ${description}: Healthy"
        return 0
    else
        echo -e "${RED}✗${NC} ${description}: Failed (HTTP ${response})"
        return 1
    fi
}

# Data source check function
check_datasource() {
    local datasource_uid=$1
    local datasource_name=$2

    response=$(curl -s -X GET \
        -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
        "${GRAFANA_URL}/api/datasources/uid/${datasource_uid}/health")

    status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "error")

    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✓${NC} Data Source '${datasource_name}': Connected"
        return 0
    else
        echo -e "${RED}✗${NC} Data Source '${datasource_name}': ${status}"
        return 1
    fi
}

# Send Slack notification
send_slack_notification() {
    local message=$1
    local color=$2

    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"${color}\",
                    \"title\": \"Grafana Health Check Alert\",
                    \"text\": \"${message}\",
                    \"footer\": \"Grafana Monitor\",
                    \"ts\": $(date +%s)
                }]
            }" \
            "$SLACK_WEBHOOK" 2>/dev/null
    fi
}

# Main health check loop
main() {
    echo "Starting Grafana Health Monitor"
    echo "================================"
    echo "Grafana URL: ${GRAFANA_URL}"
    echo "Check Interval: ${CHECK_INTERVAL}s"
    echo ""

    while true; do
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Running health checks..."

        failed_checks=0

        # Check Grafana API health
        if ! check_health "/api/health" "Grafana API"; then
            ((failed_checks++))
        fi

        # Check dashboard endpoint
        if ! check_health "/api/dashboards/uid/turnkey-main" "Main Dashboard"; then
            ((failed_checks++))
        fi

        # Check data sources
        if ! check_datasource "bigquery-analytics" "BigQuery"; then
            ((failed_checks++))
        fi

        if ! check_datasource "analytics-api" "Analytics API"; then
            ((failed_checks++))
        fi

        # Check authentication
        auth_response=$(curl -s -o /dev/null -w "%{http_code}" \
            "${GRAFANA_URL}/api/auth/verify")

        if [ "$auth_response" = "200" ] || [ "$auth_response" = "401" ]; then
            echo -e "${GREEN}✓${NC} Authentication Endpoint: Operational"
        else
            echo -e "${RED}✗${NC} Authentication Endpoint: Failed"
            ((failed_checks++))
        fi

        # Report status
        echo ""
        if [ $failed_checks -eq 0 ]; then
            echo -e "${GREEN}All health checks passed!${NC}"
        else
            echo -e "${RED}${failed_checks} health check(s) failed!${NC}"
            send_slack_notification \
                "⚠️ Grafana health check detected ${failed_checks} failure(s). Check logs for details." \
                "warning"
        fi

        echo "---"
        echo ""

        sleep $CHECK_INTERVAL
    done
}

# Trap to handle script termination
trap 'echo "Health monitor stopped."; exit 0' SIGINT SIGTERM

# Run main function
main