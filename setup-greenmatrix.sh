#!/bin/bash

# GreenMatrix Setup Script
# This script sets up the complete GreenMatrix application with Airflow monitoring

set -e

echo "🚀 GreenMatrix Setup with Airflow Monitoring"
echo "=============================================="

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

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    print_status "✅ Prerequisites check passed"
}

# Setup environment
setup_environment() {
    print_step "Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_status "Created .env file from .env.example"
            print_warning "Please review and update the .env file with your specific configuration"
        else
            print_error ".env.example file not found"
            exit 1
        fi
    else
        print_status "Using existing .env file"
    fi
    
    # Set appropriate permissions for Airflow
    export AIRFLOW_UID=$(id -u)
    echo "AIRFLOW_UID=$AIRFLOW_UID" >> .env
    
    print_status "✅ Environment setup completed"
}

# Create necessary directories
create_directories() {
    print_step "Creating necessary directories..."
    
    # Create Airflow directories
    mkdir -p airflow/logs
    mkdir -p airflow/plugins
    mkdir -p airflow/config
    
    # Create data directories
    mkdir -p data/postgres
    mkdir -p data/redis
    mkdir -p logs/backend
    mkdir -p logs/collector
    
    # Set permissions for Airflow directories
    sudo chown -R ${AIRFLOW_UID:-50000}:0 airflow/logs
    sudo chown -R ${AIRFLOW_UID:-50000}:0 airflow/plugins
    
    print_status "✅ Directories created"
}

# Build and start services
start_services() {
    print_step "Building and starting GreenMatrix services..."
    
    # Start core services first
    print_status "Starting database and core services..."
    docker-compose up -d postgres redis
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    while ! docker-compose exec -T postgres pg_isready -U postgres; do
        sleep 2
    done
    
    # Start Airflow database
    print_status "Starting Airflow database..."
    docker-compose up -d airflow-postgres
    
    # Wait for Airflow database to be ready
    print_status "Waiting for Airflow database to be ready..."
    while ! docker-compose exec -T airflow-postgres pg_isready -U airflow; do
        sleep 2
    done
    
    # Initialize Airflow
    print_status "Initializing Airflow..."
    docker-compose up airflow-init
    
    # Start all services
    print_status "Starting all services..."
    docker-compose up -d
    
    print_status "✅ Services started"
}

# Setup databases
setup_databases() {
    print_step "Setting up databases..."
    
    # Wait for db-setup service to complete
    print_status "Running database setup..."
    docker-compose logs -f db-setup
    
    print_status "✅ Database setup completed"
}

# Configure Airflow
configure_airflow() {
    print_step "Configuring Airflow connections and variables..."
    
    # Wait for Airflow webserver to be ready
    print_status "Waiting for Airflow webserver to be ready..."
    while ! curl -f http://localhost:8080/health &> /dev/null; do
        sleep 5
        print_status "Still waiting for Airflow..."
    done
    
    # Run Airflow initialization script
    if [ -f "airflow/init-airflow.sh" ]; then
        print_status "Running Airflow initialization script..."
        docker-compose exec airflow-webserver bash /opt/airflow/init-airflow.sh
    fi
    
    print_status "✅ Airflow configuration completed"
}

# Health check
health_check() {
    print_step "Performing health checks..."
    
    local services=(
        "http://localhost:3000:Frontend"
        "http://localhost:8000/health:Backend API"
        "http://localhost:8080:Airflow UI"
    )
    
    for service in "${services[@]}"; do
        local url=$(echo $service | cut -d: -f1)
        local name=$(echo $service | cut -d: -f2)
        
        if curl -f $url &> /dev/null; then
            print_status "✅ $name is healthy"
        else
            print_warning "⚠️ $name may not be ready yet"
        fi
    done
    
    # Check Docker services
    print_status "Docker services status:"
    docker-compose ps
}

# Display information
display_info() {
    echo ""
    echo "🎉 GreenMatrix Setup Complete!"
    echo "==============================="
    echo ""
    echo "📊 Application URLs:"
    echo "  Frontend Dashboard:    http://localhost:3000"
    echo "  Backend API:          http://localhost:8000"
    echo "  API Documentation:    http://localhost:8000/docs"
    echo "  Airflow UI:           http://localhost:8080"
    echo ""
    echo "🔐 Default Credentials:"
    echo "  Airflow UI:           airflow / airflow"
    echo ""
    echo "📈 Monitoring Features:"
    echo "  ✅ Data Pipeline Monitoring (every 15 minutes)"
    echo "  ✅ Database Health Monitoring (every hour)"
    echo "  ✅ API Health Monitoring (every 10 minutes)"
    echo "  ✅ Data Quality Validation (every 6 hours)"
    echo "  ✅ Maintenance and Cleanup (daily at 2 AM)"
    echo "  ✅ Comprehensive Alerting System"
    echo ""
    echo "📁 Important Directories:"
    echo "  Configuration:        .env"
    echo "  Airflow DAGs:         airflow/dags/"
    echo "  Airflow Logs:         airflow/logs/"
    echo "  Application Logs:     logs/"
    echo ""
    echo "🛠️ Management Commands:"
    echo "  View logs:            docker-compose logs -f [service]"
    echo "  Stop services:        docker-compose down"
    echo "  Restart services:     docker-compose restart"
    echo "  Update services:      docker-compose pull && docker-compose up -d"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "  Check service status: docker-compose ps"
    echo "  View all logs:        docker-compose logs"
    echo "  Reset Airflow:        docker-compose down && docker volume rm greenmatrix_airflow_postgres_data"
    echo ""
    echo "📧 Alert Configuration:"
    echo "  Update monitoring emails in .env file (MONITORING_EMAIL, ALERT_EMAILS)"
    echo "  Configure Slack/Discord webhooks in .env file"
    echo "  Set alert thresholds in .env file"
    echo ""
    echo "For more information, check the documentation in the airflow/README.md file"
    echo ""
}

# Cleanup function
cleanup() {
    if [ $? -ne 0 ]; then
        print_error "Setup failed. Cleaning up..."
        docker-compose down
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    echo "Starting GreenMatrix setup process..."
    echo ""
    
    check_prerequisites
    setup_environment
    create_directories
    start_services
    setup_databases
    configure_airflow
    health_check
    display_info
    
    print_status "🎉 Setup completed successfully!"
}

# Run main function
main "$@"