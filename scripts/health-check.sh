#!/bin/bash
# GreenMatrix Health Check Script
# Comprehensive health monitoring for all components

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Service endpoints
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Health check results
HEALTH_RESULTS=()
CRITICAL_ISSUES=0
WARNING_ISSUES=0

# Logging functions
log_success() {
    echo -e "${GREEN}✓${NC} $1"
    HEALTH_RESULTS+=("SUCCESS: $1")
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    HEALTH_RESULTS+=("WARNING: $1")
    ((WARNING_ISSUES++))
}

log_error() {
    echo -e "${RED}✗${NC} $1"
    HEALTH_RESULTS+=("ERROR: $1")
    ((CRITICAL_ISSUES++))
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if a service is running
check_service_running() {
    local service_name="$1"
    local container_name="$2"
    
    if docker ps --format "table {{.Names}}" | grep -q "^$container_name$"; then
        log_success "$service_name is running"
        return 0
    else
        log_error "$service_name is not running"
        return 1
    fi
}

# Check HTTP endpoint
check_http_endpoint() {
    local service_name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local timeout="${4:-10}"
    
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null || echo "000")
    
    if [[ "$response_code" == "$expected_status" ]]; then
        log_success "$service_name endpoint is responding (HTTP $response_code)"
        return 0
    else
        log_error "$service_name endpoint is not responding (HTTP $response_code)"
        return 1
    fi
}

# Check database connectivity
check_database() {
    local db_name="$1"
    local container_name="$2"
    local db_user="${3:-postgres}"
    
    if docker-compose -f "$PROJECT_DIR/docker-compose.yml" exec -T "$container_name" pg_isready -U "$db_user" >/dev/null 2>&1; then
        log_success "$db_name database is accessible"
        return 0
    else
        log_error "$db_name database is not accessible"
        return 1
    fi
}

# Check database connection count
check_database_connections() {
    local db_name="$1"
    local container_name="$2"
    local db_user="${3:-postgres}"
    local max_connections="${4:-100}"
    
    local connection_count
    connection_count=$(docker-compose -f "$PROJECT_DIR/docker-compose.yml" exec -T "$container_name" \
        psql -U "$db_user" -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
    
    if [[ "$connection_count" =~ ^[0-9]+$ ]]; then
        if [[ "$connection_count" -lt "$max_connections" ]]; then
            log_success "$db_name has $connection_count active connections"
        else
            log_warning "$db_name has high connection count: $connection_count"
        fi
    else
        log_error "Could not retrieve $db_name connection count"
    fi
}

# Check disk space
check_disk_space() {
    local path="$1"
    local threshold="${2:-85}"
    
    local usage
    usage=$(df "$path" | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [[ "$usage" -lt "$threshold" ]]; then
        log_success "Disk usage for $path: ${usage}%"
    elif [[ "$usage" -lt 95 ]]; then
        log_warning "High disk usage for $path: ${usage}%"
    else
        log_error "Critical disk usage for $path: ${usage}%"
    fi
}

# Check memory usage
check_memory_usage() {
    local threshold="${1:-85}"
    
    local memory_usage
    memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    
    if [[ "$memory_usage" -lt "$threshold" ]]; then
        log_success "Memory usage: ${memory_usage}%"
    elif [[ "$memory_usage" -lt 95 ]]; then
        log_warning "High memory usage: ${memory_usage}%"
    else
        log_error "Critical memory usage: ${memory_usage}%"
    fi
}

# Check CPU load
check_cpu_load() {
    local threshold="${1:-80}"
    
    local cpu_usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    
    if (( $(echo "$cpu_usage < $threshold" | bc -l) )); then
        log_success "CPU usage: ${cpu_usage}%"
    elif (( $(echo "$cpu_usage < 95" | bc -l) )); then
        log_warning "High CPU usage: ${cpu_usage}%"
    else
        log_error "Critical CPU usage: ${cpu_usage}%"
    fi
}

# Check Docker resource usage
check_docker_resources() {
    log_info "Checking Docker container resources..."
    
    # Get container stats
    local stats_output
    stats_output=$(docker stats --no-stream --format "{{.Container}}\t{{.CPUPerc}}\t{{.MemPerc}}" 2>/dev/null)
    
    if [[ -n "$stats_output" ]]; then
        while IFS=$'\t' read -r container cpu_perc mem_perc; do
            # Remove % sign and check values
            cpu_val=$(echo "$cpu_perc" | sed 's/%//')
            mem_val=$(echo "$mem_perc" | sed 's/%//')
            
            if [[ "$cpu_val" =~ ^[0-9]+\.?[0-9]*$ ]] && [[ "$mem_val" =~ ^[0-9]+\.?[0-9]*$ ]]; then
                if (( $(echo "$cpu_val > 80" | bc -l) )) || (( $(echo "$mem_val > 80" | bc -l) )); then
                    log_warning "$container: High resource usage (CPU: ${cpu_perc}, Memory: ${mem_perc})"
                else
                    log_success "$container: Normal resource usage (CPU: ${cpu_perc}, Memory: ${mem_perc})"
                fi
            fi
        done <<< "$stats_output"
    else
        log_warning "Could not retrieve Docker container stats"
    fi
}

# Check VM agent connectivity
check_vm_agents() {
    log_info "Checking VM agent connectivity..."
    
    local api_response
    api_response=$(curl -s "$BACKEND_URL/api/v1/metrics/vms/active" 2>/dev/null)
    
    if [[ $? -eq 0 ]] && [[ -n "$api_response" ]]; then
        local active_count
        active_count=$(echo "$api_response" | jq -r '.count // 0' 2>/dev/null)
        
        if [[ "$active_count" =~ ^[0-9]+$ ]]; then
            if [[ "$active_count" -gt 0 ]]; then
                log_success "$active_count VM agents are active"
                
                # Check for stale agents
                local stale_agents
                stale_agents=$(echo "$api_response" | jq -r '.active_vms[] | select((now - (.last_seen | fromdateiso8601)) > 600) | .vm_name' 2>/dev/null)
                
                if [[ -n "$stale_agents" ]]; then
                    log_warning "Some VM agents have stale data: $stale_agents"
                fi
            else
                log_warning "No active VM agents found"
            fi
        else
            log_error "Could not parse VM agent count"
        fi
    else
        log_error "Could not check VM agent status"
    fi
}

# Check log file sizes
check_log_files() {
    log_info "Checking log file sizes..."
    
    local log_dir="$PROJECT_DIR/logs"
    
    if [[ -d "$log_dir" ]]; then
        find "$log_dir" -name "*.log" -type f | while read -r log_file; do
            local size_mb
            size_mb=$(du -m "$log_file" | cut -f1)
            
            if [[ "$size_mb" -gt 1000 ]]; then
                log_warning "Large log file: $(basename "$log_file") (${size_mb}MB)"
            elif [[ "$size_mb" -gt 100 ]]; then
                log_info "Log file: $(basename "$log_file") (${size_mb}MB)"
            fi
        done
    fi
}

# Check Airflow DAG status
check_airflow_dags() {
    log_info "Checking Airflow DAG status..."
    
    # Try to get DAG status from Airflow API
    local dag_status
    dag_status=$(curl -s "$AIRFLOW_URL/api/v1/dags" \
        -H "Content-Type: application/json" 2>/dev/null)
    
    if [[ $? -eq 0 ]] && [[ -n "$dag_status" ]]; then
        # Check if we can parse DAGs
        local dag_count
        dag_count=$(echo "$dag_status" | jq -r '.dags | length' 2>/dev/null)
        
        if [[ "$dag_count" =~ ^[0-9]+$ ]] && [[ "$dag_count" -gt 0 ]]; then
            log_success "Airflow has $dag_count DAGs configured"
        else
            log_warning "Could not retrieve Airflow DAG information"
        fi
    else
        log_warning "Airflow API is not accessible for DAG status check"
    fi
}

# Check network connectivity
check_network_connectivity() {
    log_info "Checking network connectivity..."
    
    # Check internal Docker network
    if docker network ls | grep -q greenmatrix-network; then
        log_success "Docker network 'greenmatrix-network' exists"
    else
        log_error "Docker network 'greenmatrix-network' not found"
    fi
    
    # Check external connectivity (optional)
    if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        log_success "External network connectivity available"
    else
        log_warning "External network connectivity issues"
    fi
}

# Generate health report
generate_health_report() {
    echo
    echo "================================================================"
    echo "             GreenMatrix Health Check Report"
    echo "================================================================"
    echo "Timestamp: $TIMESTAMP"
    echo "Critical Issues: $CRITICAL_ISSUES"
    echo "Warnings: $WARNING_ISSUES"
    echo
    
    if [[ $CRITICAL_ISSUES -eq 0 && $WARNING_ISSUES -eq 0 ]]; then
        echo -e "${GREEN}✓ System Status: HEALTHY${NC}"
    elif [[ $CRITICAL_ISSUES -eq 0 ]]; then
        echo -e "${YELLOW}⚠ System Status: WARNING (${WARNING_ISSUES} issues)${NC}"
    else
        echo -e "${RED}✗ System Status: CRITICAL (${CRITICAL_ISSUES} critical, ${WARNING_ISSUES} warnings)${NC}"
    fi
    
    echo
    echo "Detailed Results:"
    echo "----------------------------------------------------------------"
    
    for result in "${HEALTH_RESULTS[@]}"; do
        echo "$result"
    done
    
    echo "================================================================"
}

# Save health report to file
save_health_report() {
    local report_dir="$PROJECT_DIR/logs"
    local report_file="$report_dir/health-check-$(date +%Y%m%d).log"
    
    mkdir -p "$report_dir"
    
    {
        echo "[$TIMESTAMP] Health Check Results"
        echo "Critical Issues: $CRITICAL_ISSUES, Warnings: $WARNING_ISSUES"
        for result in "${HEALTH_RESULTS[@]}"; do
            echo "[$TIMESTAMP] $result"
        done
        echo
    } >> "$report_file"
}

# Main health check function
main() {
    echo "================================================================"
    echo "           GreenMatrix System Health Check"
    echo "================================================================"
    echo "Starting health check at: $TIMESTAMP"
    echo
    
    # Change to project directory
    cd "$PROJECT_DIR"
    
    # System Resource Checks
    log_info "=== System Resources ==="
    check_disk_space "/" 85
    check_disk_space "/opt" 85
    check_memory_usage 85
    check_cpu_load 80
    
    echo
    
    # Container Status Checks
    log_info "=== Container Status ==="
    check_service_running "PostgreSQL" "greenmatrix-postgres"
    check_service_running "TimescaleDB" "greenmatrix-timescaledb"
    check_service_running "Redis" "greenmatrix-redis"
    check_service_running "Backend" "greenmatrix-backend"
    check_service_running "Frontend" "greenmatrix-frontend"
    check_service_running "Airflow Webserver" "greenmatrix-airflow-webserver"
    check_service_running "Airflow Scheduler" "greenmatrix-airflow-scheduler"
    check_service_running "Data Collector" "greenmatrix-data-collector"
    
    echo
    
    # Database Connectivity Checks
    log_info "=== Database Connectivity ==="
    check_database "PostgreSQL" "postgres" "postgres"
    check_database "TimescaleDB" "timescaledb" "postgres"
    check_database_connections "PostgreSQL" "postgres" "postgres" 100
    check_database_connections "TimescaleDB" "timescaledb" "postgres" 100
    
    echo
    
    # Service Endpoint Checks
    log_info "=== Service Endpoints ==="
    check_http_endpoint "Backend API" "$BACKEND_URL/health"
    check_http_endpoint "Backend Status" "$BACKEND_URL/api/status"
    check_http_endpoint "Frontend" "$FRONTEND_URL"
    check_http_endpoint "Airflow" "$AIRFLOW_URL/health"
    
    echo
    
    # Application-Specific Checks
    log_info "=== Application Status ==="
    check_vm_agents
    check_airflow_dags
    check_docker_resources
    check_network_connectivity
    check_log_files
    
    # Generate and display report
    generate_health_report
    
    # Save report to file
    save_health_report
    
    # Exit with appropriate code
    if [[ $CRITICAL_ISSUES -gt 0 ]]; then
        exit 2  # Critical issues
    elif [[ $WARNING_ISSUES -gt 0 ]]; then
        exit 1  # Warnings
    else
        exit 0  # All good
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "GreenMatrix Health Check Script"
        echo
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo "  --quiet, -q   Suppress output (only show errors)"
        echo "  --verbose, -v Show detailed information"
        echo
        echo "Exit codes:"
        echo "  0  All checks passed"
        echo "  1  Warnings found"
        echo "  2  Critical issues found"
        exit 0
        ;;
    --quiet|-q)
        # Redirect stdout to /dev/null, keep stderr
        exec 1>/dev/null
        ;;
    --verbose|-v)
        # Enable verbose mode
        set -x
        ;;
esac

# Run main function
main "$@"