#!/bin/bash

echo "=== Recreating GreenMatrix Hardware Specs Service ==="
echo

# 1. Stop and delete the existing service
echo "1. Stopping and removing existing service..."
sudo systemctl stop greenmatrix-hardware-specs 2>/dev/null || true
sudo systemctl disable greenmatrix-hardware-specs 2>/dev/null || true
sudo rm -f /etc/systemd/system/greenmatrix-hardware-specs.service

# 2. Clean up any remaining PID files
echo "2. Cleaning up PID files..."
sudo rm -f /opt/greenmatrix/hardware_collector.pid
sudo rm -f /home/reddypet/GreenMatrix/hardware_collector.pid
sudo rm -f ./hardware_collector.pid

# 3. Copy the updated script and config
echo "3. Copying updated files..."
sudo cp collect_hardware_specs.py /opt/greenmatrix/
sudo cp config.ini /opt/greenmatrix/

# 4. Create the service file
echo "4. Creating new service file..."
sudo bash -c 'cat > /etc/systemd/system/greenmatrix-hardware-specs.service << EOF
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
EOF'

# 5. Enable and start the new service
echo "5. Enabling and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable greenmatrix-hardware-specs
sudo systemctl start greenmatrix-hardware-specs

# 6. Wait a moment and check status
echo "6. Checking service status..."
sleep 3
sudo systemctl status greenmatrix-hardware-specs --no-pager -l

echo
echo "=== Service Recreation Complete ==="
echo
echo "To monitor logs: sudo journalctl -u greenmatrix-hardware-specs -f"
echo "To check status: sudo systemctl status greenmatrix-hardware-specs"