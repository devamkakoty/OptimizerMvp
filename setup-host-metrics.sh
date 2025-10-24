#!/bin/bash

# GreenMatrix Host Metrics Collection Setup
# This script sets up the host metrics collection service on the VM running GreenMatrix

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo "🔧 GreenMatrix Host Metrics Collection Setup"
echo "============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root: sudo $0"
    exit 1
fi

# Check if GreenMatrix is running
print_step "Checking if GreenMatrix is running..."
if ! docker ps | grep -q greenmatrix-backend; then
    print_error "GreenMatrix backend container is not running!"
    print_error "Please start GreenMatrix first with: docker-compose up -d"
    exit 1
fi

print_status "✅ GreenMatrix containers are running"

# Install Python dependencies
print_step "Installing Python dependencies..."
if command -v apt >/dev/null 2>&1; then
    print_status "Using apt package manager..."
    apt update && apt install -y python3 python3-pip pciutils
    pip3 install --upgrade pip
    pip3 install psutil requests python-dateutil py-cpuinfo

    # Install NVIDIA monitoring if GPU present
    if lspci | grep -i nvidia >/dev/null 2>&1; then
        print_status "NVIDIA GPU detected, installing pynvml..."
        pip3 install pynvml
    else
        print_status "No NVIDIA GPU detected, skipping GPU monitoring setup"
    fi
elif command -v yum >/dev/null 2>&1; then
    print_status "Using yum package manager..."
    yum install -y python3 python3-pip pciutils
    pip3 install --upgrade pip
    pip3 install psutil requests python-dateutil py-cpuinfo

    if lspci | grep -i nvidia >/dev/null 2>&1; then
        print_status "NVIDIA GPU detected, installing pynvml..."
        pip3 install pynvml
    else
        print_status "No NVIDIA GPU detected, skipping GPU monitoring setup"
    fi
elif command -v apk >/dev/null 2>&1; then
    print_status "Using apk package manager (Alpine)..."
    apk add --no-cache python3 py3-pip pciutils gcc musl-dev python3-dev
    pip3 install --upgrade pip
    pip3 install psutil requests python-dateutil py-cpuinfo

    if lspci | grep -i nvidia >/dev/null 2>&1; then
        print_status "NVIDIA GPU detected, installing pynvml..."
        pip3 install pynvml
    else
        print_status "No NVIDIA GPU detected, skipping GPU monitoring setup"
    fi
else
    print_error "Unsupported package manager. Please install python3, pip3, and pciutils manually."
    exit 1
fi

print_status "✅ Python dependencies installed"

# Create GreenMatrix directory
print_step "Setting up GreenMatrix host services..."
mkdir -p /opt/greenmatrix

# Check if files exist
if [ ! -f "collect_all_metrics.py" ]; then
    print_error "collect_all_metrics.py not found in current directory!"
    print_error "Please run this script from the GreenMatrix project directory."
    exit 1
fi

if [ ! -f "collect_hardware_specs.py" ]; then
    print_error "collect_hardware_specs.py not found in current directory!"
    print_error "Please run this script from the GreenMatrix project directory."
    exit 1
fi

if [ ! -f "config.ini" ]; then
    print_error "config.ini not found in current directory!"
    print_error "Please run this script from the GreenMatrix project directory."
    exit 1
fi

# Copy metrics collection files
print_status "Copying metrics collection scripts..."
cp collect_all_metrics.py /opt/greenmatrix/
cp collect_hardware_specs.py /opt/greenmatrix/
cp config.ini /opt/greenmatrix/
chmod +x /opt/greenmatrix/collect_all_metrics.py
chmod +x /opt/greenmatrix/collect_hardware_specs.py

print_status "✅ Scripts copied to /opt/greenmatrix/"

# Detect backend URL
print_step "Configuring backend connection..."
BACKEND_URL="http://localhost:8000"

# Test if backend is accessible
if curl -s --connect-timeout 5 "$BACKEND_URL/health" > /dev/null; then
    print_status "✅ Backend accessible at $BACKEND_URL"
else
    print_warning "Backend not accessible at localhost, trying to detect container IP..."
    
    # Try to get the backend container IP
    BACKEND_IP=$(docker inspect greenmatrix-backend --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null | head -1)
    if [ -n "$BACKEND_IP" ]; then
        BACKEND_URL="http://${BACKEND_IP}:8000"
        print_status "Using backend URL: $BACKEND_URL"
    else
        print_warning "Could not detect backend IP, using localhost:8000"
        BACKEND_URL="http://localhost:8000"
    fi
fi

# Update config.ini with correct backend URL
sed -i "s|backend_api_url = .*|backend_api_url = $BACKEND_URL|g" /opt/greenmatrix/config.ini

print_status "✅ Backend URL configured: $BACKEND_URL"

# Create systemd service
print_step "Creating systemd service..."
cat > /etc/systemd/system/greenmatrix-host-metrics.service << EOF
[Unit]
Description=GreenMatrix Host Metrics Collection Service
After=network.target docker.service
Wants=network-online.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=root
WorkingDirectory=/opt/greenmatrix
Environment=PYTHONUNBUFFERED=1
ExecStart=/usr/bin/python3 /opt/greenmatrix/collect_all_metrics.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create hardware specs collection service
print_step "Creating hardware specs collection service..."
cat > /etc/systemd/system/greenmatrix-hardware-specs.service << EOF
[Unit]
Description=GreenMatrix Hardware Specs Collection Service
After=network.target docker.service
Wants=network-online.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=root
WorkingDirectory=/opt/greenmatrix
Environment=PYTHONUNBUFFERED=1
ExecStart=/usr/bin/python3 /opt/greenmatrix/collect_hardware_specs.py
Restart=always
RestartSec=60
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start both services
systemctl daemon-reload
systemctl enable greenmatrix-host-metrics
systemctl enable greenmatrix-hardware-specs

print_status "✅ Systemd services created and enabled"

# Start both services
print_step "Starting host metrics collection services..."
systemctl start greenmatrix-host-metrics
systemctl start greenmatrix-hardware-specs

# Wait a moment and check status
sleep 3

if systemctl is-active --quiet greenmatrix-host-metrics; then
    print_status "✅ Host metrics collection service is running!"
else
    print_error "Host metrics service failed to start. Checking logs..."
    systemctl status greenmatrix-host-metrics
    exit 1
fi

if systemctl is-active --quiet greenmatrix-hardware-specs; then
    print_status "✅ Hardware specs collection service is running!"
else
    print_error "Hardware specs service failed to start. Checking logs..."
    systemctl status greenmatrix-hardware-specs
    exit 1
fi

echo ""
echo "🎉 Host Metrics Collection Setup Complete!"
echo "=========================================="
echo ""
echo "📊 Service Information:"
echo "  Host Metrics Service: greenmatrix-host-metrics ($(systemctl is-active greenmatrix-host-metrics))"
echo "  Hardware Specs Service: greenmatrix-hardware-specs ($(systemctl is-active greenmatrix-hardware-specs))"
echo "  Backend URL:          $BACKEND_URL"
echo "  Collection Scripts:   /opt/greenmatrix/collect_all_metrics.py"
echo "                        /opt/greenmatrix/collect_hardware_specs.py"
echo "  Configuration:        /opt/greenmatrix/config.ini"
echo ""
echo "🔧 Management Commands:"
echo "  View metrics logs:    journalctl -u greenmatrix-host-metrics -f"
echo "  View hardware logs:   journalctl -u greenmatrix-hardware-specs -f"
echo "  Service status:       systemctl status greenmatrix-host-metrics"
echo "                        systemctl status greenmatrix-hardware-specs"
echo "  Stop services:        systemctl stop greenmatrix-host-metrics greenmatrix-hardware-specs"
echo "  Start services:       systemctl start greenmatrix-host-metrics greenmatrix-hardware-specs"
echo "  Restart services:     systemctl restart greenmatrix-host-metrics greenmatrix-hardware-specs"
echo ""
echo "📈 The service will now continuously collect:"
echo "  ✅ Process-level metrics (CPU, memory, I/O)"
echo "  ✅ Overall host metrics (CPU, RAM, GPU utilization)"
echo "  ✅ GPU metrics (if NVIDIA GPU detected)"
echo "  ✅ Power consumption estimates"
echo ""

# Show first few log lines from both services
print_status "Recent host metrics log entries:"
journalctl -u greenmatrix-host-metrics --no-pager -n 3

print_status "Recent hardware specs log entries:"
journalctl -u greenmatrix-hardware-specs --no-pager -n 3

echo ""
print_status "🎯 Setup completed successfully! Host metrics are now being collected."