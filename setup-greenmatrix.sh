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

# Auto-configure VM agents
setup_vm_agents() {
    print_step "Setting up VM monitoring agents with auto-discovery..."
    
    # Detect current host IP that containers can reach
    HOST_IP=$(docker network inspect greenmatrix_greenmatrix-network 2>/dev/null | grep -E "Gateway.*[0-9]" | grep -o -E '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -n1)
    if [ -z "$HOST_IP" ]; then
        HOST_IP=$(ip route get 8.8.8.8 | grep -oP 'src \K[0-9.]+' | head -n1)
    fi
    if [ -z "$HOST_IP" ]; then
        HOST_IP=$(hostname -I | awk '{print $1}')
    fi
    
    BACKEND_URL="http://${HOST_IP}:8000"
    print_status "Detected backend URL: $BACKEND_URL"
    
    # Test if backend is reachable
    if curl -s --connect-timeout 5 "$BACKEND_URL/health" > /dev/null; then
        print_status "✅ Backend connectivity confirmed"
    else
        print_warning "⚠️  Backend not reachable at $BACKEND_URL"
        print_status "Will configure agents to auto-discover backend URL"
        BACKEND_URL=""
    fi
    
    # Create VM agent auto-configuration script
    print_status "Creating auto-configuring VM agent..."
    
    # Copy the auto-config VM agent script
    if [ -f "vm_agent_auto_config.py" ]; then
        cp vm_agent_auto_config.py vm_agent.py
    else
        print_error "vm_agent_auto_config.py not found! Using simple VM agent..."
        if [ -f "simple_vm_agent.py" ]; then
            cp simple_vm_agent.py vm_agent.py
            # Update the backend URL in simple script if detected
            if [ -n "$BACKEND_URL" ]; then
                sed -i "s|http://10.25.41.86:8000|$BACKEND_URL|g" vm_agent.py
            fi
        else
            print_error "No VM agent script found!"
            return 1
        fi
    fi
    
    # Create VM agent configuration file
    cat > vm_agent_config.json << EOF
{
  "backend_url": "$BACKEND_URL",
  "auto_discovery": true,
  "collection_interval": 2,
  "api_timeout": 30,
  "environment": "auto_setup"
}
EOF
    
    # Create VM agent deployment script for end users
    cat > deploy-vm-agent.sh << 'EOF'
#!/bin/bash

# GreenMatrix VM Agent Deployment Script
# This script can be run on any VM/container to set up GreenMatrix monitoring

print_status() {
    echo "[INFO] $1"
}

print_error() {
    echo "[ERROR] $1"
}

# Function to auto-discover backend URL
discover_backend() {
    echo "Auto-discovering GreenMatrix backend..."
    
    # Try environment variable first
    if [ -n "$GREENMATRIX_BACKEND_URL" ]; then
        echo "$GREENMATRIX_BACKEND_URL"
        return
    fi
    
    # Try configuration file
    if [ -f "/etc/greenmatrix/config.json" ]; then
        backend_url=$(cat /etc/greenmatrix/config.json 2>/dev/null | grep '"backend_url"' | cut -d'"' -f4)
        if [ -n "$backend_url" ] && [ "$backend_url" != "" ]; then
            echo "$backend_url"
            return
        fi
    fi
    
    # Auto-discover through network
    GATEWAY_IP=$(ip route | grep default | awk '{print $3}' | head -n1)
    LOCAL_IP=$(ip route get 8.8.8.8 | grep -oP 'src \K[0-9.]+' | head -n1)
    
    # Test potential backends
    for ip in "$GATEWAY_IP" "$LOCAL_IP" "172.17.0.1" "172.20.0.1" "10.0.0.1"; do
        if [ -n "$ip" ]; then
            backend_url="http://$ip:8000"
            if curl -s --connect-timeout 3 "$backend_url/health" > /dev/null 2>&1; then
                echo "Found backend at: $backend_url" >&2
                echo "$backend_url"
                return
            fi
        fi
    done
    
    echo ""
}

# Main deployment
main() {
    print_status "Starting GreenMatrix VM Agent deployment..."
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "Please run as root: sudo $0"
        exit 1
    fi
    
    # Discover backend
    BACKEND_URL=$(discover_backend)
    if [ -z "$BACKEND_URL" ]; then
        echo -n "Please enter GreenMatrix backend URL (e.g., http://192.168.1.100:8000): "
        read BACKEND_URL
        
        if [ -z "$BACKEND_URL" ]; then
            print_error "Backend URL is required!"
            exit 1
        fi
    fi
    
    print_status "Using backend URL: $BACKEND_URL"
    
    # Install dependencies
    print_status "Installing dependencies..."
    if command -v apt >/dev/null 2>&1; then
        apt update && apt install -y python3 python3-pip curl pciutils
        # Handle PEP 668 externally-managed environment (Ubuntu 24.04+)
        # Try system packages first, fallback to pip with --break-system-packages
        if ! dpkg -l | grep -q python3-psutil; then
            apt install -y python3-psutil python3-requests python3-dateutil 2>/dev/null || \
            pip3 install --break-system-packages psutil requests python-dateutil
        fi
    elif command -v yum >/dev/null 2>&1; then
        yum install -y python3 python3-pip curl pciutils
        pip3 install psutil requests python-dateutil
    else
        print_error "Package manager not supported. Please install python3, pip3, and curl manually."
        exit 1
    fi
    
    # Create directories
    mkdir -p /opt/greenmatrix /etc/greenmatrix
    
    # Create configuration
    cat > /etc/greenmatrix/config.json << INNER_EOF
{
  "backend_url": "$BACKEND_URL",
  "collection_interval": 2,
  "api_timeout": 30,
  "auto_discovery": true,
  "setup_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
INNER_EOF
    
    # Set environment variables
    echo "GREENMATRIX_BACKEND_URL=$BACKEND_URL" >> /etc/environment
    echo "GREENMATRIX_CONFIG_FILE=/etc/greenmatrix/config.json" >> /etc/environment
    
    # Download and install VM agent (this would be the auto-config script)
    # For now, we'll create a basic version
    cat > /opt/greenmatrix/vm_agent.py << 'INNER_EOF'
import os, sys, time, json, socket, datetime, platform, requests, psutil, subprocess, re

class AutoConfig:
    def __init__(self):
        self.vm_name = socket.gethostname() + "-Linux"
        self.backend_url = self._discover_backend_url()
        self.collection_interval = 2
        self.api_timeout = 30
        
    def _discover_backend_url(self):
        # Environment variable
        backend_url = os.getenv('GREENMATRIX_BACKEND_URL')
        if backend_url:
            return backend_url
            
        # Config file
        try:
            with open('/etc/greenmatrix/config.json', 'r') as f:
                config = json.load(f)
                if 'backend_url' in config and config['backend_url']:
                    return config['backend_url']
        except:
            pass
            
        # Auto-discovery
        try:
            gateway = subprocess.check_output(['ip', 'route', 'show', 'default'], text=True)
            gateway_ip = re.search(r'via\s+(\d+\.\d+\.\d+\.\d+)', gateway)
            if gateway_ip:
                backend_url = f"http://{gateway_ip.group(1)}:8000"
                if self._test_backend(backend_url):
                    return backend_url
        except:
            pass
            
        # Fallback
        return "http://localhost:8000"
        
    def _test_backend(self, url):
        try:
            response = requests.get(f"{url}/health", timeout=3)
            return response.status_code == 200
        except:
            return False

config = AutoConfig()
print(f"VM Agent starting for {config.vm_name}")
print(f"Backend URL: {config.backend_url}")

# Main monitoring loop (simplified version)
while True:
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_info']):
            try:
                info = proc.info
                processes.append({
                    'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    'process_name': info['name'],
                    'process_id': info['pid'],
                    'username': info.get('username', 'unknown'),
                    'cpu_usage_percent': float(info.get('cpu_percent', 0) or 0),
                    'memory_usage_mb': round((info.get('memory_info', {}).get('rss', 0) or 0) / 1024 / 1024, 2),
                    'memory_usage_percent': 0.0,  # Will be calculated by backend
                    'vm_name': config.vm_name
                })
            except:
                continue
        
        payload = {
            'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'vm_name': config.vm_name,
            'process_metrics': processes,
            'agent_version': '2.0.0',
            'platform': platform.system(),
            'metrics_count': len(processes)
        }
        
        response = requests.post(f"{config.backend_url}/api/v1/metrics/vm-snapshot", json=payload, timeout=config.api_timeout)
        print(f"Sent {len(processes)} processes - Response: {response.status_code}")
        
    except Exception as e:
        print(f"Error: {e}")
    
    time.sleep(config.collection_interval)
INNER_EOF
    
    # Create systemd service
    cat > /etc/systemd/system/greenmatrix-vm-agent.service << INNER_EOF
[Unit]
Description=GreenMatrix VM Monitoring Agent
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=root
WorkingDirectory=/opt/greenmatrix
Environment=GREENMATRIX_BACKEND_URL=$BACKEND_URL
Environment=PYTHONUNBUFFERED=1
ExecStart=/usr/bin/python3 /opt/greenmatrix/vm_agent.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
INNER_EOF
    
    # Enable and start service
    systemctl daemon-reload
    systemctl enable greenmatrix-vm-agent
    systemctl start greenmatrix-vm-agent
    
    print_status "✅ GreenMatrix VM Agent installed and started!"
    print_status "View logs with: journalctl -u greenmatrix-vm-agent -f"
    print_status "Service status: systemctl status greenmatrix-vm-agent"
}

main "$@"
EOF
    
    chmod +x deploy-vm-agent.sh
    
    print_status "✅ VM agent deployment script created: deploy-vm-agent.sh"
    print_status "📋 To deploy on any VM/container, run: sudo ./deploy-vm-agent.sh"
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
    echo "  VM Agent Script:      deploy-vm-agent.sh"
    echo "  VM Agent Config:      vm_agent_config.json"
    echo ""
    echo "🛠️ Management Commands:"
    echo "  View logs:            docker-compose logs -f [service]"
    echo "  Stop services:        docker-compose down"
    echo "  Restart services:     docker-compose restart"
    echo "  Update services:      docker-compose pull && docker-compose up -d"
    echo "  Deploy VM agents:     sudo ./deploy-vm-agent.sh (on any VM/container)"
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