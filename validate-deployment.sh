#!/bin/bash

# GreenMatrix Deployment Validation Script
# This script validates that all components are working correctly

set -e

echo "🔍 GreenMatrix Deployment Validation"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Test Docker services
test_docker_services() {
    print_step "Testing Docker services..."
    
    run_test "Docker Compose services" "docker-compose ps | grep -q 'Up'"
    
    local services=(
        "greenmatrix-postgres"
        "greenmatrix-timescaledb"
        "greenmatrix-redis"
        "greenmatrix-backend"
        "greenmatrix-frontend"
        "greenmatrix-data-collector"
        "greenmatrix-airflow-webserver"
        "greenmatrix-airflow-scheduler"
    )
    
    for service in "${services[@]}"; do
        run_test "$service container" "docker-compose ps $service | grep -q 'Up'"
    done
}

# Test database connectivity
test_databases() {
    print_step "Testing database connectivity..."
    
    run_test "Main PostgreSQL database" "docker-compose exec -T postgres pg_isready -U postgres"
    run_test "TimescaleDB database" "docker-compose exec -T timescaledb pg_isready -U postgres"
    run_test "Airflow database" "docker-compose exec -T airflow-postgres pg_isready -U airflow"
    run_test "Redis connectivity" "docker-compose exec -T redis redis-cli ping | grep -q PONG"
}

# Test API endpoints
test_api_endpoints() {
    print_step "Testing API endpoints..."
    
    # Wait for services to be ready
    sleep 10
    
    run_test "Backend health endpoint" "curl -f http://localhost:8000/health"
    run_test "Backend API docs" "curl -f http://localhost:8000/docs"
    run_test "Frontend accessibility" "curl -f http://localhost:3000"
    run_test "Airflow UI" "curl -f http://localhost:8080/health"
}

# Test database tables and schema
test_database_schema() {
    print_step "Testing database schema..."
    
    # Test main database tables
    run_test "hardware_monitoring_table exists" \
        "docker-compose exec -T postgres psql -U postgres -d greenmatrix -c \"\\dt hardware_monitoring_table\" | grep -q hardware_monitoring_table"
    
    run_test "host_process_metrics table exists" \
        "docker-compose exec -T postgres psql -U postgres -d Metrics_db -c \"\\dt host_process_metrics\" | grep -q host_process_metrics"
    
    # Test TimescaleDB setup
    run_test "TimescaleDB extension enabled" \
        "docker-compose exec -T timescaledb psql -U postgres -d vm_metrics_ts -c \"SELECT 1 FROM pg_extension WHERE extname='timescaledb'\" | grep -q 1"
    
    run_test "vm_process_metrics hypertable exists" \
        "docker-compose exec -T timescaledb psql -U postgres -d vm_metrics_ts -c \"\\dt vm_process_metrics\" | grep -q vm_process_metrics"
    
    run_test "vm_process_metrics is hypertable" \
        "docker-compose exec -T timescaledb psql -U postgres -d vm_metrics_ts -c \"SELECT 1 FROM _timescaledb_catalog.hypertable WHERE table_name='vm_process_metrics'\" | grep -q 1"
}

# Test data collection
test_data_collection() {
    print_step "Testing data collection..."
    
    run_test "Data collector service running" \
        "docker-compose logs data-collector | grep -q 'Starting data collection'"
    
    run_test "Hardware specs collection" \
        "docker-compose exec -T postgres psql -U postgres -d greenmatrix -c \"SELECT COUNT(*) FROM hardware_specifications\" | grep -v COUNT | grep -q '[1-9]'"
    
    # Wait for data collection and test
    echo "Waiting for data collection cycle..."
    sleep 60
    
    run_test "Recent process metrics data" \
        "docker-compose exec -T postgres psql -U postgres -d Metrics_db -c \"SELECT COUNT(*) FROM host_process_metrics WHERE timestamp > NOW() - INTERVAL '10 minutes'\" | grep -v COUNT | grep -q '[1-9]'"
}

# Test Airflow monitoring
test_airflow_monitoring() {
    print_step "Testing Airflow monitoring..."
    
    run_test "Airflow DAGs loaded" \
        "docker-compose exec -T airflow-webserver airflow dags list | grep -q greenmatrix"
    
    run_test "Data pipeline monitoring DAG" \
        "docker-compose exec -T airflow-webserver airflow dags list | grep -q data_pipeline_monitoring"
    
    run_test "Database health monitoring DAG" \
        "docker-compose exec -T airflow-webserver airflow dags list | grep -q database_health_monitoring"
    
    run_test "API health monitoring DAG" \
        "docker-compose exec -T airflow-webserver airflow dags list | grep -q api_health_monitoring"
}

# Test model endpoints
test_model_endpoints() {
    print_step "Testing ML model endpoints..."
    
    run_test "Available models endpoint" "curl -f http://localhost:8000/api/available-models"
    run_test "Hardware specifications endpoint" "curl -f http://localhost:8000/api/hardware-specs"
    run_test "Recommendations endpoint" "curl -f http://localhost:8000/api/recommendations/cross-region?time_range_days=1"
}

# Test VM metrics (if any VMs are connected)
test_vm_metrics() {
    print_step "Testing VM metrics (if available)..."
    
    local vm_count=$(docker-compose exec -T timescaledb psql -U postgres -d vm_metrics_ts -c "SELECT COUNT(DISTINCT vm_name) FROM vm_process_metrics WHERE timestamp > NOW() - INTERVAL '1 hour'" -t | tr -d ' ')
    
    if [[ "$vm_count" -gt 0 ]]; then
        run_test "VM metrics data present" "echo '$vm_count' | grep -q '[1-9]'"
        run_test "VM health status function" \
            "docker-compose exec -T timescaledb psql -U postgres -d vm_metrics_ts -c \"SELECT get_vm_health_status('test')\" | grep -q 'vm_name'"
    else
        print_warning "No VM metrics found - this is expected if no VMs are connected yet"
    fi
}

# Test log collection
test_logs() {
    print_step "Testing log collection..."
    
    run_test "Backend logs present" "docker-compose logs backend | grep -q 'Application startup complete'"
    run_test "Data collector logs present" "docker-compose logs data-collector | grep -q 'collection'"
    run_test "Airflow scheduler logs present" "docker-compose logs airflow-scheduler | grep -q 'Scheduler'"
}

# Performance test
test_performance() {
    print_step "Testing system performance..."
    
    # Test API response time
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8000/health)
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        echo -e "Testing API response time... ${GREEN}✅ PASSED${NC} (${response_time}s)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "Testing API response time... ${RED}❌ FAILED${NC} (${response_time}s)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Generate test report
generate_report() {
    echo ""
    echo "📊 Validation Results"
    echo "===================="
    echo ""
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    echo ""
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo "Success Rate: $success_rate%"
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}🎉 All tests passed! GreenMatrix is fully operational.${NC}"
    elif [[ $success_rate -ge 80 ]]; then
        echo -e "${YELLOW}⚠️ Most tests passed, but some issues detected.${NC}"
        echo "Please check the failed tests above."
    else
        echo -e "${RED}❌ Multiple failures detected. Please review the setup.${NC}"
    fi
    
    echo ""
    echo "📋 Next Steps:"
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo "✅ Deploy VM agents to start collecting VM metrics"
        echo "✅ Access the dashboard at http://localhost:3000"
        echo "✅ Monitor Airflow at http://localhost:8080"
        echo "✅ Check API documentation at http://localhost:8000/docs"
    else
        echo "🔧 Review failed tests and check Docker logs"
        echo "🔧 Ensure all prerequisites are met"
        echo "🔧 Check firewall and network connectivity"
        echo "🔧 Run: docker-compose logs [service-name] for specific issues"
    fi
    
    echo ""
}

# Main execution
main() {
    echo "Starting comprehensive validation..."
    echo ""
    
    test_docker_services
    test_databases  
    test_api_endpoints
    test_database_schema
    test_data_collection
    test_airflow_monitoring
    test_model_endpoints
    test_vm_metrics
    test_logs
    test_performance
    
    generate_report
}

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available"
    exit 1
fi

# Check if services are running
if ! docker-compose ps | grep -q "Up"; then
    print_error "GreenMatrix services are not running"
    echo "Please run: docker-compose up -d"
    exit 1
fi

# Run main function
main "$@"