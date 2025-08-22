#!/bin/bash
# GreenMatrix Service Management Script
# Provides convenient commands for managing the GreenMatrix deployment

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
ENV_FILE="$PROJECT_DIR/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root (for some operations)
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if user is in docker group
    if ! groups $USER | grep -q docker; then
        warning "User $USER is not in the docker group. You may need to use sudo."
    fi
    
    # Check if project files exist
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "docker-compose.yml not found in $PROJECT_DIR"
        exit 1
    fi
    
    if [[ ! -f "$ENV_FILE" ]]; then
        warning ".env file not found. Using defaults."
    fi
    
    log "Prerequisites check passed ✓"
}

# Function to run docker-compose commands
run_compose() {
    cd "$PROJECT_DIR"
    docker-compose "$@"
}

# Start all services
start_all() {
    log "Starting GreenMatrix services..."
    
    # Start infrastructure services first
    info "Starting infrastructure services (databases, cache)..."
    run_compose up -d postgres timescaledb redis
    
    # Wait for databases to be ready
    info "Waiting for databases to start..."
    sleep 30
    
    # Check database connectivity
    if ! run_compose exec postgres pg_isready -U ${POSTGRES_USER:-postgres} >/dev/null 2>&1; then
        error "PostgreSQL is not ready"
        exit 1
    fi
    
    if ! run_compose exec timescaledb pg_isready -U ${POSTGRES_USER:-postgres} >/dev/null 2>&1; then
        error "TimescaleDB is not ready"
        exit 1
    fi
    
    log "Databases are ready ✓"
    
    # Start application services
    info "Starting application services..."
    run_compose up -d backend frontend
    
    # Initialize Airflow
    info "Initializing Airflow..."
    run_compose up -d airflow-init
    sleep 60
    
    # Start Airflow services
    info "Starting Airflow services..."
    run_compose up -d airflow-webserver airflow-scheduler airflow-triggerer
    
    # Start data collection services
    info "Starting data collection services..."
    run_compose up -d data-collector db-setup
    
    log "All services started successfully ✓"
    
    # Show status
    show_status
}

# Stop all services
stop_all() {
    log "Stopping GreenMatrix services..."
    cd "$PROJECT_DIR"
    docker-compose down
    log "All services stopped ✓"
}

# Restart all services
restart_all() {
    log "Restarting GreenMatrix services..."
    stop_all
    sleep 5
    start_all
}

# Show service status
show_status() {
    log "GreenMatrix Service Status:"
    echo
    run_compose ps
    echo
    
    # Check service health
    info "Health Checks:"
    
    # Backend health
    if curl -f -s http://localhost:${BACKEND_PORT:-8000}/health >/dev/null 2>&1; then
        echo -e "  Backend API: ${GREEN}✓ Healthy${NC}"
    else
        echo -e "  Backend API: ${RED}✗ Unhealthy${NC}"
    fi
    
    # Frontend health
    if curl -f -s http://localhost:${FRONTEND_PORT:-3000} >/dev/null 2>&1; then
        echo -e "  Frontend: ${GREEN}✓ Healthy${NC}"
    else
        echo -e "  Frontend: ${RED}✗ Unhealthy${NC}"
    fi
    
    # Airflow health
    if curl -f -s http://localhost:8080/health >/dev/null 2>&1; then
        echo -e "  Airflow: ${GREEN}✓ Healthy${NC}"
    else
        echo -e "  Airflow: ${RED}✗ Unhealthy${NC}"
    fi
    
    echo
}

# Show logs for a specific service
show_logs() {
    local service="$1"
    local lines="${2:-100}"
    
    if [[ -z "$service" ]]; then
        error "Please specify a service name"
        echo "Available services: backend, frontend, postgres, timescaledb, redis, airflow-webserver, airflow-scheduler, data-collector"
        exit 1
    fi
    
    log "Showing last $lines lines of logs for $service..."
    run_compose logs --tail="$lines" -f "$service"
}

# Follow logs for all services
follow_logs() {
    log "Following logs for all services (Ctrl+C to stop)..."
    run_compose logs -f
}

# Update services (pull latest images and restart)
update_services() {
    log "Updating GreenMatrix services..."
    
    cd "$PROJECT_DIR"
    
    # Pull latest images
    info "Pulling latest images..."
    docker-compose pull
    
    # Rebuild services with local changes
    info "Building services..."
    docker-compose build
    
    # Restart services
    info "Restarting services..."
    docker-compose up -d
    
    log "Services updated successfully ✓"
    show_status
}

# Backup databases
backup_data() {
    local backup_dir="/opt/backups/greenmatrix"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    log "Creating backup..."
    
    # Create backup directory
    sudo mkdir -p "$backup_dir"
    
    # Backup PostgreSQL databases
    info "Backing up PostgreSQL databases..."
    run_compose exec -T postgres pg_dump -U ${POSTGRES_USER:-postgres} greenmatrix > "$backup_dir/greenmatrix_$timestamp.sql"
    run_compose exec -T postgres pg_dump -U ${POSTGRES_USER:-postgres} Metrics_db > "$backup_dir/metrics_$timestamp.sql"
    
    # Backup TimescaleDB
    info "Backing up TimescaleDB..."
    run_compose exec -T timescaledb pg_dump -U ${POSTGRES_USER:-postgres} vm_metrics_ts > "$backup_dir/vm_metrics_$timestamp.sql"
    
    # Backup configuration
    info "Backing up configuration..."
    tar -czf "$backup_dir/config_$timestamp.tar.gz" -C "$PROJECT_DIR" .env config.ini docker-compose.yml
    
    log "Backup completed: $backup_dir/*_$timestamp.*"
}

# Restore from backup
restore_data() {
    local backup_file="$1"
    
    if [[ -z "$backup_file" ]]; then
        error "Please specify a backup file"
        exit 1
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi
    
    warning "This will restore data from backup and may overwrite existing data!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Restore cancelled"
        exit 0
    fi
    
    log "Restoring from backup: $backup_file"
    
    # Determine database based on filename
    if [[ "$backup_file" == *"greenmatrix"* ]]; then
        run_compose exec -T postgres psql -U ${POSTGRES_USER:-postgres} -d greenmatrix < "$backup_file"
    elif [[ "$backup_file" == *"metrics"* ]]; then
        run_compose exec -T postgres psql -U ${POSTGRES_USER:-postgres} -d Metrics_db < "$backup_file"
    elif [[ "$backup_file" == *"vm_metrics"* ]]; then
        run_compose exec -T timescaledb psql -U ${POSTGRES_USER:-postgres} -d vm_metrics_ts < "$backup_file"
    else
        error "Cannot determine database from filename"
        exit 1
    fi
    
    log "Restore completed ✓"
}

# Clean up old containers and images
cleanup() {
    log "Cleaning up Docker resources..."
    
    # Remove stopped containers
    info "Removing stopped containers..."
    docker container prune -f
    
    # Remove unused images
    info "Removing unused images..."
    docker image prune -f
    
    # Remove unused volumes (be careful!)
    read -p "Remove unused volumes? This may delete data! (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume prune -f
    fi
    
    # Remove unused networks
    info "Removing unused networks..."
    docker network prune -f
    
    log "Cleanup completed ✓"
}

# Show system resource usage
show_resources() {
    log "System Resource Usage:"
    echo
    
    # CPU usage
    info "CPU Usage:"
    top -bn1 | grep "Cpu(s)" | awk '{print "  " $2 " " $3 " " $4 " " $5}'
    
    # Memory usage
    info "Memory Usage:"
    free -h | grep -E "Mem|Swap" | awk '{print "  " $1 " " $3 "/" $2 " (" $3 "/" $2 * 100 "%)"}'
    
    # Disk usage
    info "Disk Usage:"
    df -h | grep -E "/$|/opt" | awk '{print "  " $6 ": " $3 "/" $2 " (" $5 ")"}'
    
    # Docker resource usage
    info "Docker Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    
    echo
}

# Install/update VM agent on remote VMs
deploy_vm_agent() {
    local vm_host="$1"
    local vm_user="${2:-root}"
    
    if [[ -z "$vm_host" ]]; then
        error "Please specify VM hostname or IP address"
        echo "Usage: $0 deploy-agent <vm-host> [vm-user]"
        exit 1
    fi
    
    log "Deploying VM agent to $vm_host..."
    
    # Check if agent package exists
    local agent_package="$PROJECT_DIR/vm_agent_linux.tar.gz"
    if [[ ! -f "$agent_package" ]]; then
        error "VM agent package not found. Please build it first with: python vm_agent/build_package.py"
        exit 1
    fi
    
    # Copy agent to VM
    info "Copying agent package to VM..."
    scp "$agent_package" "$vm_user@$vm_host:/tmp/"
    
    # Install on VM
    info "Installing agent on VM..."
    ssh "$vm_user@$vm_host" << 'EOF'
cd /opt
sudo tar -xzf /tmp/vm_agent_linux.tar.gz
cd vm_agent_linux
sudo ./install.sh

# Set up systemd service
sudo tee /etc/systemd/system/greenmatrix-agent.service > /dev/null << 'SERVICE'
[Unit]
Description=GreenMatrix VM Monitoring Agent
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/vm_agent_linux
ExecStart=/opt/vm_agent_linux/vm_agent
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable greenmatrix-agent
sudo systemctl start greenmatrix-agent
EOF
    
    log "VM agent deployed and started on $vm_host ✓"
}

# Show help
show_help() {
    echo "GreenMatrix Service Management Script"
    echo
    echo "Usage: $0 <command> [options]"
    echo
    echo "Commands:"
    echo "  start           Start all GreenMatrix services"
    echo "  stop            Stop all GreenMatrix services"
    echo "  restart         Restart all GreenMatrix services"
    echo "  status          Show service status and health"
    echo "  logs <service>  Show logs for a specific service"
    echo "  logs-all        Follow logs for all services"
    echo "  update          Update services (pull latest images)"
    echo "  backup          Create database backup"
    echo "  restore <file>  Restore from backup file"
    echo "  cleanup         Clean up unused Docker resources"
    echo "  resources       Show system resource usage"
    echo "  deploy-agent    Deploy VM agent to remote VM"
    echo "  help            Show this help message"
    echo
    echo "Examples:"
    echo "  $0 start                                    # Start all services"
    echo "  $0 logs backend                             # Show backend logs"
    echo "  $0 backup                                   # Create backup"
    echo "  $0 deploy-agent 192.168.1.100 ubuntu       # Deploy agent to VM"
    echo
}

# Main command handling
main() {
    case "$1" in
        start)
            check_prerequisites
            start_all
            ;;
        stop)
            stop_all
            ;;
        restart)
            check_prerequisites
            restart_all
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2" "$3"
            ;;
        logs-all)
            follow_logs
            ;;
        update)
            check_prerequisites
            update_services
            ;;
        backup)
            backup_data
            ;;
        restore)
            restore_data "$2"
            ;;
        cleanup)
            cleanup
            ;;
        resources)
            show_resources
            ;;
        deploy-agent)
            deploy_vm_agent "$2" "$3"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $1"
            echo
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"