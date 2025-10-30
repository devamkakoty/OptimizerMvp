#!/bin/bash

# GreenMatrix VM Agent Deployment Script
# This script sets up VM monitoring agents inside VM instances
#
# Usage:
#   sudo ./deploy-vm-agent.sh [BACKEND_URL]
#   Example: sudo ./deploy-vm-agent.sh http://192.168.1.100:8000

# Don't use set -e - handle errors gracefully
set -u  # Exit on undefined variable

# CRITICAL: Change to script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 GreenMatrix VM Agent Deployment"
echo "==================================="

# Get backend URL from parameter
BACKEND_URL="${1:-}"

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

# Validate required files exist
validate_files() {
    print_step "Validating required files..."

    if [ ! -f "simple_vm_agent.py" ]; then
        print_error "simple_vm_agent.py not found in current directory!"
        print_error "Make sure you're running this script from the vm-agent folder"
        exit 1
    fi

    if [ ! -f "vm_agent_config.ini.template" ]; then
        print_warning "vm_agent_config.ini.template not found (optional)"
    fi

    print_status "✅ Required files validated"
}

# Check if agent is already installed
check_existing_installation() {
    print_step "Checking for existing installation..."

    if [ -d "/opt/greenmatrix-vm-agent" ]; then
        print_warning "⚠️ Existing installation found at /opt/greenmatrix-vm-agent"
        read -p "Remove existing installation and reinstall? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Removing existing installation..."
            systemctl stop greenmatrix-vm-agent.service 2>/dev/null || true
            systemctl disable greenmatrix-vm-agent.service 2>/dev/null || true
            rm -rf /opt/greenmatrix-vm-agent
            rm -f /etc/systemd/system/greenmatrix-vm-agent.service
            systemctl daemon-reload
            print_status "✅ Existing installation removed"
        else
            print_error "Installation cancelled"
            exit 1
        fi
    fi
}

# Check if running inside a VM
check_vm_environment() {
    print_step "Checking VM environment..."
    
    # Check if we're in a virtual machine
    if command -v dmidecode &> /dev/null; then
        local vendor=$(sudo dmidecode -s system-manufacturer 2>/dev/null | tr '[:upper:]' '[:lower:]')
        if [[ "$vendor" == *"vmware"* ]] || [[ "$vendor" == *"virtualbox"* ]] || [[ "$vendor" == *"qemu"* ]] || [[ "$vendor" == *"kvm"* ]]; then
            print_status "✅ Running inside a virtual machine"
            return 0
        fi
    fi
    
    # Alternative check using systemd-detect-virt
    if command -v systemd-detect-virt &> /dev/null; then
        local virt_type=$(systemd-detect-virt)
        if [[ "$virt_type" != "none" ]]; then
            print_status "✅ Running inside a virtual machine (detected: $virt_type)"
            return 0
        fi
    fi
    
    print_warning "⚠️ VM environment not detected, continuing anyway..."
    return 0
}

# Install dependencies
install_dependencies() {
    print_step "Installing dependencies..."

    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            # Ubuntu/Debian
            print_status "Updating package list..."
            apt-get update || {
                print_warning "apt-get update failed, continuing anyway..."
            }

            print_status "Installing system packages..."
            apt-get install -y python3 python3-pip python3-venv curl wget || {
                print_error "Failed to install required packages"
                exit 1
            }

            # Try to install Python packages from system repos (avoids PEP 668 issues)
            print_status "Attempting to install Python packages from system repositories..."
            apt-get install -y python3-psutil python3-requests python3-netifaces 2>/dev/null || {
                print_warning "Could not install all Python packages from system repos, will use pip in venv"
            }

        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            print_status "Installing packages via yum..."
            yum update -y
            yum install -y python3 python3-pip curl wget
        elif command -v dnf &> /dev/null; then
            # Fedora
            print_status "Installing packages via dnf..."
            dnf update -y
            dnf install -y python3 python3-pip curl wget
        else
            print_error "Unsupported Linux distribution"
            print_error "Please install python3, python3-pip, python3-venv, curl, and wget manually"
            exit 1
        fi
    else
        print_error "This script currently supports Linux only"
        print_error "For Windows VMs, please use the deploy-vm-agent.bat script"
        exit 1
    fi

    # Verify Python installation
    if ! command -v python3 &> /dev/null; then
        print_error "Python3 installation failed"
        exit 1
    fi

    print_status "✅ Dependencies installed"
}

# Setup VM agent environment
setup_vm_agent() {
    print_step "Setting up VM agent environment..."

    # Create agent directory
    local agent_dir="/opt/greenmatrix-vm-agent"
    mkdir -p "$agent_dir"

    # Create virtual environment (as root, no sudo needed since we're already root)
    print_status "Creating Python virtual environment..."
    python3 -m venv "$agent_dir/venv" || {
        print_error "Failed to create virtual environment"
        print_error "Make sure python3-venv is installed"
        exit 1
    }

    # Install Python dependencies in venv (no PEP 668 issues in venv)
    print_status "Installing Python packages in virtual environment..."
    "$agent_dir/venv/bin/pip" install --upgrade pip --quiet || {
        print_warning "Failed to upgrade pip, continuing anyway..."
    }

    "$agent_dir/venv/bin/pip" install psutil>=5.9.0 requests>=2.28.0 netifaces>=0.11.0 --quiet || {
        print_error "Failed to install Python packages"
        print_error "Ensure internet connectivity and try again"
        exit 1
    }

    # Copy VM agent files
    print_status "Copying VM agent files..."
    cp simple_vm_agent.py "$agent_dir/" || {
        print_error "Failed to copy simple_vm_agent.py"
        exit 1
    }

    # Set permissions
    chown -R root:root "$agent_dir"
    chmod +x "$agent_dir/simple_vm_agent.py"

    print_status "✅ VM agent environment set up"
}

# Configure VM agent
configure_vm_agent() {
    print_step "Configuring VM agent..."

    local agent_dir="/opt/greenmatrix-vm-agent"
    local config_file="$agent_dir/vm_agent.ini"
    local backend_url="$BACKEND_URL"

    # If backend URL not provided as parameter, try to detect or prompt
    if [[ -z "$backend_url" ]]; then
        print_status "Backend URL not provided, attempting auto-detection..."

        # Try to detect gateway (may or may not be the GreenMatrix host)
        local gateway_ip=$(ip route | grep default | awk '{print $3}' | head -n1)

        if [[ -n "$gateway_ip" ]]; then
            # Test if GreenMatrix is at gateway
            if curl -f --connect-timeout 5 "http://${gateway_ip}:8000/health" > /dev/null 2>&1; then
                backend_url="http://${gateway_ip}:8000"
                print_status "✅ Auto-detected GreenMatrix at gateway: $backend_url"
            else
                print_warning "Gateway ($gateway_ip) is not the GreenMatrix host"
            fi
        fi

        # If still not found, prompt user
        if [[ -z "$backend_url" ]]; then
            print_warning "Could not auto-detect GreenMatrix backend"
            echo ""
            echo "Please enter the GreenMatrix backend URL"
            echo "Example: http://192.168.1.100:8000"
            read -p "Backend URL: " backend_url

            if [[ -z "$backend_url" ]]; then
                print_error "Backend URL is required!"
                exit 1
            fi
        fi
    fi

    # Validate and normalize backend URL
    # Remove trailing slash if present
    backend_url="${backend_url%/}"

    # Add http:// if no protocol specified
    if [[ ! "$backend_url" =~ ^https?:// ]]; then
        backend_url="http://${backend_url}"
    fi

    # Add port if not specified
    if [[ ! "$backend_url" =~ :[0-9]+$ ]]; then
        backend_url="${backend_url}:8000"
    fi

    print_status "Using backend URL: $backend_url"

    # Get VM name (hostname)
    local vm_name=$(hostname)
    print_status "VM Name: $vm_name"

    # Update configuration
    tee "$config_file" > /dev/null << EOF
[DEFAULT]
# VM Agent Configuration for GreenMatrix

[api]
# Backend API Configuration
backend_url = ${backend_url}
api_timeout = 30
retry_attempts = 3
retry_delay = 5

[collection]
# Data Collection Configuration
interval_seconds = 60
vm_name = ${vm_name}
collect_gpu_metrics = true
collect_disk_metrics = true

[logging]
# Logging Configuration
log_level = INFO
log_file = /var/log/greenmatrix-vm-agent.log
log_max_size = 10485760
log_backup_count = 5

[security]
# Security Configuration (Optional)
api_key =
verify_ssl = false
EOF

    print_status "✅ VM agent configured with backend: $backend_url"

    # Store backend URL for later use
    CONFIGURED_BACKEND_URL="$backend_url"
}

# Create systemd service
create_systemd_service() {
    print_step "Creating systemd service..."

    local agent_dir="/opt/greenmatrix-vm-agent"

    # Create systemd service file (already running as root, no sudo needed)
    tee /etc/systemd/system/greenmatrix-vm-agent.service > /dev/null << EOF
[Unit]
Description=GreenMatrix VM Monitoring Agent
Documentation=https://github.com/greenmatrix/vm-agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=${agent_dir}
ExecStart=${agent_dir}/venv/bin/python ${agent_dir}/simple_vm_agent.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=greenmatrix-vm-agent

# Resource limits
MemoryMax=128M
CPUQuota=10%

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=${agent_dir} /var/log
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable greenmatrix-vm-agent.service

    print_status "✅ Systemd service created and enabled"
}

# Start VM agent service
start_vm_agent() {
    print_step "Starting VM agent service..."

    # Create log file with proper permissions
    touch /var/log/greenmatrix-vm-agent.log
    chmod 644 /var/log/greenmatrix-vm-agent.log

    # Start the service
    systemctl start greenmatrix-vm-agent.service

    # Check service status
    sleep 5
    if systemctl is-active --quiet greenmatrix-vm-agent.service; then
        print_status "✅ VM agent service started successfully"
    else
        print_error "VM agent service failed to start"
        print_error "Checking service logs:"
        journalctl -u greenmatrix-vm-agent.service -n 20 --no-pager
        exit 1
    fi
}

# Test connectivity to host
test_connectivity() {
    print_step "Testing connectivity to host..."
    
    local agent_dir="/opt/greenmatrix-vm-agent"
    local config_file="$agent_dir/vm_agent.ini"
    
    # Extract backend URL from config
    local backend_url=$(grep "backend_url" "$config_file" | cut -d'=' -f2 | tr -d ' ')
    
    # Test API connectivity
    if curl -f --connect-timeout 10 "${backend_url}/health" > /dev/null 2>&1; then
        print_status "✅ Successfully connected to GreenMatrix backend"
    else
        print_error "❌ Failed to connect to GreenMatrix backend at $backend_url"
        print_error "Please check:"
        print_error "  1. Host VM IP address is correct"
        print_error "  2. GreenMatrix backend is running on host"
        print_error "  3. Firewall allows connections on port 8000"
        exit 1
    fi
}

# Display status and information
display_info() {
    echo ""
    echo "🎉 GreenMatrix VM Agent Deployment Complete!"
    echo "============================================="
    echo ""
    echo "📊 Agent Information:"
    echo "  VM Name:              $(hostname)"
    echo "  Agent Directory:      /opt/greenmatrix-vm-agent"
    echo "  Configuration:        /opt/greenmatrix-vm-agent/vm_agent.ini"
    echo "  Log File:            /var/log/greenmatrix-vm-agent.log"
    echo ""
    echo "🔧 Service Management:"
    echo "  Check status:         sudo systemctl status greenmatrix-vm-agent"
    echo "  View logs:           sudo journalctl -u greenmatrix-vm-agent -f"
    echo "  Restart service:     sudo systemctl restart greenmatrix-vm-agent"
    echo "  Stop service:        sudo systemctl stop greenmatrix-vm-agent"
    echo ""
    echo "📈 Monitoring:"
    echo "  ✅ Process-level metrics collection enabled"
    echo "  ✅ CPU, Memory, Disk, and GPU monitoring"
    echo "  ✅ Data collection interval: 60 seconds"
    echo "  ✅ Automatic reconnection on failures"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "  View service logs:    sudo journalctl -u greenmatrix-vm-agent -n 50"
    echo "  Test connectivity:    curl http://HOST_IP:8000/health"
    echo "  Edit configuration:   sudo nano /opt/greenmatrix-vm-agent/vm_agent.ini"
    echo ""
    echo "📊 To verify data collection, check the GreenMatrix dashboard:"
    echo "  Dashboard URL:        http://HOST_IP:3000"
    echo "  Look for VM '$(hostname)' in the VM instances section"
    echo ""
}

# Main execution
main() {
    echo "Starting GreenMatrix VM agent deployment..."
    echo ""

    # Print usage if --help
    if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
        echo "Usage: sudo ./deploy-vm-agent.sh [BACKEND_URL]"
        echo ""
        echo "Arguments:"
        echo "  BACKEND_URL    GreenMatrix backend URL (optional, will auto-detect if not provided)"
        echo "                 Example: http://192.168.1.100:8000"
        echo ""
        echo "Examples:"
        echo "  sudo ./deploy-vm-agent.sh http://192.168.1.100:8000"
        echo "  sudo ./deploy-vm-agent.sh 192.168.1.100:8000"
        echo "  sudo ./deploy-vm-agent.sh 192.168.1.100"
        echo "  sudo ./deploy-vm-agent.sh    # Will attempt auto-detection"
        echo ""
        exit 0
    fi

    validate_files
    check_existing_installation
    check_vm_environment
    install_dependencies
    setup_vm_agent
    configure_vm_agent
    create_systemd_service
    start_vm_agent
    test_connectivity
    display_info

    print_status "🎉 Deployment completed successfully!"
}

# Check if script is run with sudo
if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root (use sudo)"
    exit 1
fi

# Run main function
main "$@"