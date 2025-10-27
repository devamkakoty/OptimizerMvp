#!/bin/bash

# GreenMatrix VM Agent Deployment Script
# This script sets up VM monitoring agents inside VM instances

set -e

echo "🚀 GreenMatrix VM Agent Deployment"
echo "==================================="

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
            sudo apt-get update
            sudo apt-get install -y python3 python3-pip python3-venv curl wget
        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            sudo yum update -y
            sudo yum install -y python3 python3-pip curl wget
        elif command -v dnf &> /dev/null; then
            # Fedora
            sudo dnf update -y
            sudo dnf install -y python3 python3-pip curl wget
        else
            print_error "Unsupported Linux distribution"
            exit 1
        fi
    else
        print_error "This script currently supports Linux only"
        print_error "For Windows VMs, please use the deploy-vm-agent.bat script"
        exit 1
    fi
    
    print_status "✅ Dependencies installed"
}

# Setup VM agent environment
setup_vm_agent() {
    print_step "Setting up VM agent environment..."
    
    # Create agent directory
    local agent_dir="/opt/greenmatrix-vm-agent"
    sudo mkdir -p "$agent_dir"
    
    # Create virtual environment
    sudo python3 -m venv "$agent_dir/venv"
    
    # Install Python dependencies
    sudo "$agent_dir/venv/bin/pip" install --upgrade pip
    sudo "$agent_dir/venv/bin/pip" install psutil>=5.9.0 requests>=2.28.0 netifaces>=0.11.0
    
    # Copy VM agent files
    sudo cp simple_vm_agent.py "$agent_dir/"
    
    # Set permissions
    sudo chown -R root:root "$agent_dir"
    sudo chmod +x "$agent_dir/simple_vm_agent.py"
    
    print_status "✅ VM agent environment set up"
}

# Configure VM agent
configure_vm_agent() {
    print_step "Configuring VM agent..."
    
    local agent_dir="/opt/greenmatrix-vm-agent"
    local config_file="$agent_dir/vm_agent.ini"
    
    # Auto-detect host VM IP (typically the default gateway)
    local host_ip=$(ip route | grep default | awk '{print $3}' | head -n1)
    
    if [[ -z "$host_ip" ]]; then
        print_error "Could not auto-detect host VM IP"
        read -p "Please enter the host VM IP address: " host_ip
    fi
    
    print_status "Using host VM IP: $host_ip"
    
    # Get VM name (hostname)
    local vm_name=$(hostname)
    print_status "VM Name: $vm_name"
    
    # Update configuration
    sudo tee "$config_file" > /dev/null << EOF
[DEFAULT]
# VM Agent Configuration for GreenMatrix

[api]
# Backend API Configuration
backend_url = http://${host_ip}:8000
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

    print_status "✅ VM agent configured"
}

# Create systemd service
create_systemd_service() {
    print_step "Creating systemd service..."
    
    local agent_dir="/opt/greenmatrix-vm-agent"
    
    # Create systemd service file
    sudo tee /etc/systemd/system/greenmatrix-vm-agent.service > /dev/null << EOF
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
    sudo systemctl daemon-reload
    sudo systemctl enable greenmatrix-vm-agent.service
    
    print_status "✅ Systemd service created and enabled"
}

# Start VM agent service
start_vm_agent() {
    print_step "Starting VM agent service..."
    
    # Create log file with proper permissions
    sudo touch /var/log/greenmatrix-vm-agent.log
    sudo chmod 644 /var/log/greenmatrix-vm-agent.log
    
    # Start the service
    sudo systemctl start greenmatrix-vm-agent.service
    
    # Check service status
    sleep 5
    if sudo systemctl is-active --quiet greenmatrix-vm-agent.service; then
        print_status "✅ VM agent service started successfully"
    else
        print_error "VM agent service failed to start"
        sudo systemctl status greenmatrix-vm-agent.service
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