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

# Fix line endings for shell scripts (critical for Docker containers)
fix_line_endings() {
    print_step "Ensuring shell scripts have correct line endings for Docker..."

    # Convert any CRLF to LF in shell scripts
    if command -v dos2unix &> /dev/null; then
        # Use dos2unix if available (most reliable)
        find scripts -name "*.sh" -type f -exec dos2unix {} \; 2>/dev/null
        print_status "Line endings fixed using dos2unix"
    elif command -v sed &> /dev/null; then
        # Fallback to sed (available on all Unix systems)
        find scripts -name "*.sh" -type f -exec sed -i 's/\r$//' {} \; 2>/dev/null
        print_status "Line endings fixed using sed"
    else
        # Last resort: use tr
        for file in scripts/*.sh; do
            if [ -f "$file" ]; then
                tr -d '\r' < "$file" > "$file.tmp" && mv "$file.tmp" "$file"
            fi
        done
        print_status "Line endings fixed using tr"
    fi

    # Make all shell scripts executable
    chmod +x scripts/*.sh 2>/dev/null

    # Also configure Git for future operations (optional)
    git config core.autocrlf input 2>/dev/null
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."

    # Check if essential files exist
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found! Are you in the GreenMatrix root directory?"
        exit 1
    fi

    if [ ! -f ".env.example" ]; then
        print_error ".env.example not found! Repository may be incomplete."
        print_status "Try: git fetch --unshallow && git pull"
        exit 1
    fi

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

    # Check system resources
    check_system_resources

    # Check port conflicts
    check_port_conflicts

    # Check Python (optional - used for host metrics collection)
    if ! command -v python3 &> /dev/null; then
        print_warning "Python3 not found - will install during host metrics setup"
    fi

    # Check for existing GreenMatrix containers that might cause conflicts
    if docker ps -a --format '{{.Names}}' | grep -q "greenmatrix-"; then
        print_warning "Found existing GreenMatrix containers from previous installation"
        print_status "These will be cleaned up automatically to prevent conflicts"
    fi

    print_status "✅ Prerequisites check passed"
}

# Check port availability
check_port_conflicts() {
    local ports_services=(
        "3000:Frontend Dashboard"
        "5432:PostgreSQL"
        "5433:TimescaleDB"
        "6379:Redis"
        "8000:Backend API"
        "8080:Airflow Web UI"
    )
    local conflicts=false
    local conflicting_ports=()

    for port_info in "${ports_services[@]}"; do
        local port=$(echo "$port_info" | cut -d: -f1)
        local service=$(echo "$port_info" | cut -d: -f2-)

        # Check if port is in use (works on both Linux and macOS)
        if netstat -tuln 2>/dev/null | grep -q ":$port " || lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || ss -tuln 2>/dev/null | grep -q ":$port "; then
            conflicting_ports+=("$port ($service)")
            conflicts=true
        fi
    done

    if [ "$conflicts" = true ]; then
        print_warning "The following ports are already in use:"
        for port in "${conflicting_ports[@]}"; do
            print_status "  - $port"
        done
        print_status ""
        print_status "Solutions:"
        print_status "  1. Stop services using these ports"
        print_status "  2. Or change ports in .env file (e.g., FRONTEND_PORT=3001)"
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Installation cancelled"
            exit 1
        fi
    fi
}

# Check system resources
check_system_resources() {
    # Check available disk space
    local available_gb=$(df -BG . 2>/dev/null | tail -1 | awk '{print $4}' | sed 's/G//' || echo "100")
    if [ "$available_gb" -lt 10 ]; then
        print_warning "Less than 10GB disk space available ($available_gb GB free)"
        print_status "GreenMatrix requires at least 10GB for Docker volumes and logs"
    fi

    # Check CPU cores
    local cpus=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "2")
    if [ "$cpus" -lt 2 ]; then
        print_warning "Only $cpus CPU core(s) detected. 2+ cores recommended for optimal performance"
    fi

    # Check total RAM
    local total_ram_mb=0
    if [ -f /proc/meminfo ]; then
        total_ram_mb=$(grep MemTotal /proc/meminfo | awk '{print int($2/1024)}')
    elif command -v sysctl &>/dev/null; then
        total_ram_mb=$(sysctl -n hw.memsize 2>/dev/null | awk '{print int($1/1024/1024)}' || echo "8192")
    fi

    if [ "$total_ram_mb" -gt 0 ] && [ "$total_ram_mb" -lt 4096 ]; then
        print_warning "Only ${total_ram_mb}MB RAM detected. 4GB+ recommended"
        print_status "Limited RAM may cause services to crash or perform poorly"
    fi

    # Check if running in WSL
    if grep -qi microsoft /proc/version 2>/dev/null; then
        print_status "WSL environment detected"
        if ! docker info &>/dev/null; then
            print_error "Cannot connect to Docker in WSL!"
            print_status "1. Start Docker Desktop on Windows"
            print_status "2. Settings → Resources → WSL Integration → Enable integration"
            exit 1
        fi
    fi
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

    # Clean up any existing networks to prevent configuration conflicts
    print_status "Checking for existing Docker networks..."
    if docker network ls | grep -q "greenmatrix-network"; then
        print_warning "Removing existing greenmatrix-network to prevent configuration conflicts..."
        docker-compose down --remove-orphans 2>/dev/null || true
        docker network rm green-matrix_greenmatrix-network 2>/dev/null || true
    fi

    # Start core services first
    print_status "Starting database and core services..."
    docker-compose up -d postgres timescaledb redis

    # Wait for databases to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    while ! docker-compose exec -T postgres pg_isready -U postgres; do
        sleep 2
    done

    print_status "Waiting for TimescaleDB to be ready..."
    while ! docker-compose exec -T timescaledb pg_isready -U postgres; do
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

    # Start core GreenMatrix services (backend, frontend, db-setup)
    # Note: Airflow services are optional and will start if configured correctly
    print_status "Starting all services..."
    if ! docker-compose up -d; then
        print_warning "Some services failed to start (this may include optional Airflow services)"
        print_status "Checking if core services are running..."

        # Check if critical services are up
        if docker-compose ps | grep -q "greenmatrix-backend.*Up" && \
           docker-compose ps | grep -q "greenmatrix-frontend.*Up"; then
            print_status "✅ Core services (backend, frontend) started successfully"
            print_warning "⚠️  Airflow services may not be running - monitoring features will be limited"
            print_status "   You can check Airflow logs with: docker-compose logs airflow-init"
        else
            print_error "Critical services failed to start!"
            return 1
        fi
    else
        print_status "✅ All services started successfully"
    fi
}

# Setup databases
setup_databases() {
    print_step "Setting up databases..."
    
    # Wait for db-setup service to complete
    print_status "Running database setup..."
    docker-compose logs -f db-setup
    
    print_status "✅ Database setup completed"
}

# Setup host metrics collection
setup_host_metrics_collection() {
    print_step "Setting up host metrics collection service..."

    # Call the dedicated setup-host-metrics.sh script
    if [ -f "./setup-host-metrics.sh" ]; then
        print_status "Running setup-host-metrics.sh (will request sudo if needed)..."

        # Make script executable
        chmod +x ./setup-host-metrics.sh

        # Run with sudo if not already root
        if [ "$EUID" -ne 0 ]; then
            print_status "Requesting sudo privileges for host metrics setup..."
            if sudo bash ./setup-host-metrics.sh; then
                print_status "✅ Host metrics collection setup completed successfully!"
            else
                print_warning "Host metrics setup encountered issues. You can retry later with: sudo ./setup-host-metrics.sh"
            fi
        else
            # Already root, run directly
            if bash ./setup-host-metrics.sh; then
                print_status "✅ Host metrics collection setup completed successfully!"
            else
                print_warning "Host metrics setup encountered issues. You can retry later with: sudo ./setup-host-metrics.sh"
            fi
        fi
    else
        print_warning "setup-host-metrics.sh not found. Skipping host metrics setup."
        print_status "You can set this up later by running: sudo ./setup-host-metrics.sh"
    fi
}

# Inform about VM monitoring setup
setup_vm_agents() {
    print_step "VM Monitoring Agent Information"

    # Detect current host IP that containers can reach for user convenience
    HOST_IP=$(docker network inspect greenmatrix_greenmatrix-network 2>/dev/null | grep -E "Gateway.*[0-9]" | grep -o -E '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -n1)
    if [ -z "$HOST_IP" ]; then
        HOST_IP=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K[0-9.]+' | head -n1)
    fi
    if [ -z "$HOST_IP" ]; then
        HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi

    BACKEND_URL="http://${HOST_IP}:8000"

    # Verify vm-agent folder exists
    if [ ! -d "vm-agent" ]; then
        print_warning "⚠️  vm-agent folder not found in repository"
        print_status "VM monitoring agents are optional and can be set up separately"
        return 0
    fi

    # Test if backend is reachable
    print_status "Checking backend connectivity..."
    if curl -s --connect-timeout 5 "$BACKEND_URL/health" > /dev/null 2>&1; then
        print_status "✅ Backend is reachable at $BACKEND_URL"
    else
        print_warning "⚠️  Backend not reachable at $BACKEND_URL (this is normal during setup)"
        BACKEND_URL="http://localhost:8000"
    fi

    echo ""
    print_status "📡 VM Monitoring Setup Instructions:"
    print_status "   GreenMatrix can monitor VMs and containers running your applications"
    print_status ""
    print_status "   To monitor a VM/container:"
    print_status "   1. Copy the 'vm-agent/' folder to your target VM/container"
    print_status "   2. Run the appropriate deployment script:"
    print_status "      • Linux/Mac:   cd vm-agent && ./deploy-vm-agent.sh $BACKEND_URL"
    print_status "      • Windows:     cd vm-agent && deploy-vm-agent.bat $BACKEND_URL"
    print_status ""
    print_status "   The agent will automatically:"
    print_status "   - Install required dependencies"
    print_status "   - Configure the backend URL"
    print_status "   - Set up metric collection service"
    print_status "   - Start sending metrics to GreenMatrix"
    print_status ""
    print_status "   📚 See vm-agent/README.md for detailed instructions"
    print_status "   🚀 See vm-agent/QUICK_START.txt for quick deployment guide"
    echo ""

    print_status "✅ VM monitoring information displayed"
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

    print_status "Waiting for services to be ready (60 seconds)..."
    sleep 60

    local services=(
        "http://localhost:3000:Frontend Dashboard"
        "http://localhost:8000/health:Backend API"
        "http://localhost:8080:Airflow UI"
    )

    echo ""
    for service in "${services[@]}"; do
        local url=$(echo $service | cut -d: -f1-3)
        local name=$(echo $service | cut -d: -f4-)

        if curl -f -s --connect-timeout 10 "$url" > /dev/null 2>&1; then
            print_status "✅ $name is healthy"
        else
            print_warning "⚠️  $name may not be ready yet (will be available shortly)"
        fi
    done
    echo ""

    # Check Docker services
    print_status "Docker services status:"
    docker-compose ps
    echo ""
}

# Display information
display_info() {
    echo ""
    echo "================================================"
    echo "🎉 GreenMatrix Setup Complete!"
    echo "================================================"
    echo ""
    echo "📊 Application URLs:"
    echo "  Frontend Dashboard:    http://localhost:3000"
    echo "  Backend API:           http://localhost:8000"
    echo "  API Documentation:     http://localhost:8000/docs"
    echo "  Airflow UI:            http://localhost:8080"
    echo ""
    echo "🔐 Default Credentials:"
    echo "  Airflow UI:            airflow / airflow"
    echo ""
    echo "📈 Host Metrics Collection:"
    echo "  If running with sudo, host metrics are automatically set up"
    echo "  Services: greenmatrix-host-metrics, greenmatrix-hardware-specs"
    echo "  Manual setup:          sudo ./setup-host-metrics.sh"
    echo "  Service status:        systemctl status greenmatrix-host-metrics"
    echo "  View logs:             journalctl -u greenmatrix-host-metrics -f"
    echo ""
    echo "📈 Monitoring Features:"
    echo "  ✅ Host Metrics Collection (continuous, systemd service)"
    echo "  ✅ Data Pipeline Monitoring (every 15 minutes)"
    echo "  ✅ Database Health Monitoring (every hour)"
    echo "  ✅ API Health Monitoring (every 10 minutes)"
    echo "  ✅ Data Quality Validation (every 6 hours)"
    echo "  ✅ Maintenance and Cleanup (daily at 2 AM)"
    echo "  ✅ Comprehensive Alerting System"
    echo "  ✅ VM Agent Auto-Discovery and Configuration"
    echo ""
    echo "📁 Important Directories:"
    echo "  Configuration:        .env"
    echo "  Airflow DAGs:         airflow/dags/"
    echo "  Airflow Logs:         airflow/logs/"
    echo "  Application Logs:     logs/"
    echo "  VM Agent Folder:      vm-agent/"
    echo ""
    echo "🛠️ Management Commands:"
    echo "  View logs:            docker-compose logs -f [service]"
    echo "  Stop services:        docker-compose down"
    echo "  Restart services:     docker-compose restart"
    echo "  Update services:      docker-compose pull && docker-compose up -d"
    echo "  Deploy VM agents:     Copy vm-agent/ to target VM and run deploy script"
    echo "  Host metrics logs:    journalctl -u greenmatrix-host-metrics -f"
    echo "  Host metrics status:  systemctl status greenmatrix-host-metrics"
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

# Cleanup function - only cleanup on critical failures
cleanup() {
    local exit_code=$?

    # Only cleanup if there was a critical failure AND core services didn't start
    if [ $exit_code -ne 0 ]; then
        # Check if core services are actually running
        if docker-compose ps 2>/dev/null | grep -q "greenmatrix-backend.*Up" && \
           docker-compose ps 2>/dev/null | grep -q "greenmatrix-frontend.*Up"; then
            # Core services are running, don't cleanup
            print_warning "Setup completed with warnings - core services are running"
            print_status "Note: Some optional services (like Airflow) may not be running"
            exit 0
        else
            # Core services failed, do cleanup
            print_error "Critical failure detected. Cleaning up..."
            docker-compose down 2>/dev/null
            exit $exit_code
        fi
    fi
}

# Set trap for cleanup (only on critical failures)
trap cleanup EXIT

# Main execution
main() {
    echo "Starting GreenMatrix setup process..."
    echo ""

    fix_line_endings
    check_prerequisites
    setup_environment
    create_directories
    start_services
    setup_databases
    setup_host_metrics_collection
    setup_vm_agents
    configure_airflow
    health_check
    display_info

    echo ""
    echo "================================================"
    print_status "🎉 Setup completed successfully!"
    echo "================================================"
    echo ""
    echo "👉 Open your browser and navigate to:"
    echo "   http://localhost:3000"
    echo ""
}

# Run main function
main "$@"