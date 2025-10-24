# GreenMatrix Remote Monitoring - Quick Start Guide

**Purpose:** Deploy data collection agents on remote servers/VMs to monitor them from GreenMatrix
**Time Required:** 10-15 minutes per system
**Target Audience:** System administrators, DevOps engineers

---

## 📌 Quick Reference

**What you're deploying:** Two Python scripts that collect metrics and send to Green Matrix backend
**Where they go:** Remote servers, VMs, workstations you want to monitor
**What they need:** Python 3.7+, network access to GreenMatrix server

---

## Step 1: Find Your GreenMatrix Backend URL

**On the GreenMatrix server**, get its IP address:

```bash
# Linux
hostname -I | awk '{print $1}'

# Windows
ipconfig | findstr IPv4
```

**Example:** If IP is `192.168.1.100`, your backend URL is:
```
http://192.168.1.100:8000
```

**Test it works:**
```bash
curl http://192.168.1.100:8000/health
# Should return: {"status":"ok"}
```

⚠️ **Firewall Check:** Ensure port 8000 is open on GreenMatrix server!

---

## Step 2: Choose Your Installation Method

### Option A: Quick Install (Linux - Recommended)

```bash
# On remote Linux system:

# 1. Install dependencies
sudo apt-get update && sudo apt-get install -y python3 python3-pip
pip3 install psutil requests

# 2. Create agent directory
sudo mkdir -p /opt/greenmatrix-agent && cd /opt/greenmatrix-agent

# 3. Download scripts (replace with YOUR GreenMatrix server IP)
BACKEND="http://192.168.1.100:8000"  # ← CHANGE THIS!

# Option A: Download from GreenMatrix server (if you set up file sharing)
scp user@192.168.1.100:/path/to/GreenMatrix/collect_all_metrics.py .
scp user@192.168.1.100:/path/to/GreenMatrix/config.ini .

# Option B: Copy files manually using your preferred method

# 4. Configure backend URL
cat > config.ini << EOF
[Settings]
backend_api_url = $BACKEND
collection_interval_minutes = 0.016667
api_request_timeout = 30
EOF

# 5. Test it works
python3 collect_all_metrics.py &
sleep 5
# Check GreenMatrix dashboard - you should see this system!

# 6. Make it permanent (auto-start on boot)
sudo tee /etc/systemd/system/greenmatrix-agent.service << EOF
[Unit]
Description=GreenMatrix Monitoring Agent
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/greenmatrix-agent
ExecStart=/usr/bin/python3 /opt/greenmatrix-agent/collect_all_metrics.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable greenmatrix-agent
sudo systemctl start greenmatrix-agent

# 7. Verify
sudo systemctl status greenmatrix-agent
sudo journalctl -u greenmatrix-agent -f
```

---

### Option B: Windows Installation

```powershell
# On remote Windows system (PowerShell as Administrator):

# 1. Install Python from python.org if needed, then:
pip install psutil requests

# 2. Create directory
New-Item -Path "C:\GreenMatrix" -ItemType Directory -Force
cd C:\GreenMatrix

# 3. Copy files here:
# - collect_all_metrics.py
# - config.ini
# (Use WinSCP, shared folder, or USB drive)

# 4. Edit config.ini
notepad config.ini
# Change: backend_api_url = http://192.168.1.100:8000  ← YOUR server IP!

# 5. Test
Start-Process pythonw -ArgumentList "collect_all_metrics.py" -NoNewWindow

# Check GreenMatrix dashboard for this system

# 6. Create scheduled task for auto-start
$Action = New-ScheduledTaskAction -Execute "pythonw.exe" -Argument "C:\GreenMatrix\collect_all_metrics.py" -WorkingDirectory "C:\GreenMatrix"
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "GreenMatrix Agent" -Action $Action -Trigger $Trigger -Principal $Principal

# 7. Start it
Start-ScheduledTask -TaskName "GreenMatrix Agent"

# 8. Verify
Get-ScheduledTask -TaskName "GreenMatrix Agent"
```

---

## Step 3: Verify Data Collection

### Check GreenMatrix Dashboard
1. Open http://your-greenmatrix-server:3000
2. Go to "Process Metrics" or "Dashboard"
3. Look for your remote system's hostname
4. You should see real-time process data!

### Check Backend API
```bash
# List all systems sending data
curl http://192.168.1.100:8000/api/v1/metrics/systems

# See recent metrics
curl http://192.168.1.100:8000/api/v1/metrics/host-processes?limit=5
```

### Check Database
```bash
# On GreenMatrix server:
docker-compose exec timescaledb psql -U postgres -d vm_metrics_ts -c \
  "SELECT vm_name, COUNT(*) FROM vm_process_metrics WHERE timestamp > NOW() - INTERVAL '5 minutes' GROUP BY vm_name;"
```

---

## 🔧 Troubleshooting

### Problem: Can't reach backend

```bash
# Error: Connection refused

# Fix:
# 1. Check GreenMatrix backend is running
docker-compose ps backend  # Should show "Up"

# 2. Check firewall on GreenMatrix server
sudo ufw allow 8000/tcp

# 3. Test from remote system
curl http://192.168.1.100:8000/health
```

### Problem: No data in dashboard

```bash
# Check config.ini has correct URL (NOT localhost!)
cat /opt/greenmatrix-agent/config.ini | grep backend_api_url
# Should show: http://192.168.1.100:8000  ← Your server IP

# Check agent is running
# Linux:
sudo systemctl status greenmatrix-agent
sudo journalctl -u greenmatrix-agent -f

# Windows:
Get-ScheduledTask -TaskName "GreenMatrix Agent"
# Check Task Scheduler history
```

### Problem: Python errors

```bash
# ModuleNotFoundError: No module named 'psutil'
pip3 install psutil requests

# Permission denied
# Run with sudo (Linux) or as Administrator (Windows)
```

---

## 📦 Deploy to Multiple Systems

For 10+ systems, create a deployment package:

```bash
# On GreenMatrix server, create package:
mkdir greenmatrix-agent-package
cp collect_all_metrics.py greenmatrix-agent-package/
cp config.ini greenmatrix-agent-package/

# Edit config.ini with YOUR server IP
nano greenmatrix-agent-package/config.ini
# Set: backend_api_url = http://192.168.1.100:8000

# Create auto-installer
cat > greenmatrix-agent-package/install.sh << 'EOF'
#!/bin/bash
set -e
echo "Installing GreenMatrix Agent..."
pip3 install psutil requests
sudo mkdir -p /opt/greenmatrix-agent
sudo cp *.py config.ini /opt/greenmatrix-agent/

# Create systemd service
sudo tee /etc/systemd/system/greenmatrix-agent.service << 'SERVICE'
[Unit]
Description=GreenMatrix Agent
After=network.target
[Service]
Type=simple
WorkingDirectory=/opt/greenmatrix-agent
ExecStart=/usr/bin/python3 /opt/greenmatrix-agent/collect_all_metrics.py
Restart=always
[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable greenmatrix-agent
sudo systemctl start greenmatrix-agent
echo "✅ Installed! Check: systemctl status greenmatrix-agent"
EOF

chmod +x greenmatrix-agent-package/install.sh
tar -czf greenmatrix-agent.tar.gz greenmatrix-agent-package/
```

**Deploy to each system:**
```bash
# Copy package to remote system, then:
tar -xzf greenmatrix-agent.tar.gz
cd greenmatrix-agent-package
sudo ./install.sh
```

---

## ⚙️ Configuration Reference

### config.ini Settings

```ini
[Settings]
# REQUIRED: Your GreenMatrix backend URL
backend_api_url = http://192.168.1.100:8000  # ← Change this!

# How often to collect metrics (in minutes)
collection_interval_minutes = 0.016667  # ~1 second (real-time)
# Increase for less frequent collection:
# 0.5 = every 30 seconds
# 1 = every minute
# 5 = every 5 minutes

# How often to send hardware specs (in days)
hardware_spec_interval_days = 0.25  # Every 6 hours

# API timeout
api_request_timeout = 30

# Optional: Energy cost settings
cost_per_kwh = 0.12
cpu_tdp_watts = 125
current_region = US
```

---

## 🎯 What Gets Collected

### Process Metrics (collect_all_metrics.py)
- Process name, PID, username
- CPU usage per process
- Memory usage (RAM)
- GPU usage (if NVIDIA GPU present)
- I/O stats
- Network stats

**Sent to:** `POST {backend}/api/metrics/snapshot`
**Frequency:** Every ~1 second (configurable)

### Hardware Specs (collect_hardware_specs.py)
- CPU model, cores, architecture
- Total RAM
- GPU model, VRAM, CUDA cores (NVIDIA)
- Storage devices
- OS version

**Sent to:** `POST {backend}/api/hardware-specs`
**Frequency:** Every 6 hours (configurable)

---

## ❓ FAQ

**Q: Do I need to install both scripts?**
A: `collect_all_metrics.py` is the main one (real-time monitoring). `collect_hardware_specs.py` runs periodically to update hardware info. Both recommended.

**Q: Will this slow down my system?**
A: Minimal impact - uses <1% CPU, <50MB RAM typically.

**Q: Can I monitor Windows and Linux from same GreenMatrix?**
A: Yes! Install agents on both types of systems.

**Q: How do I uninstall?**
```bash
# Linux:
sudo systemctl stop greenmatrix-agent
sudo systemctl disable greenmatrix-agent
sudo rm /etc/systemd/system/greenmatrix-agent.service
sudo rm -rf /opt/greenmatrix-agent

# Windows:
Unregister-ScheduledTask -TaskName "GreenMatrix Agent"
Remove-Item -Recurse "C:\GreenMatrix"
```

**Q: Can I use HTTPS instead of HTTP?**
A: Yes, if you configure SSL on GreenMatrix backend, just change `http://` to `https://` in config.ini.

---

## 📚 Next Steps

After deploying agents:
1. View metrics in GreenMatrix dashboard
2. Set up alerts for high resource usage
3. Generate system insights and recommendations
4. Monitor trends over time

For advanced configuration, see the full [GreenMatrix Deployment Guide](GreenMatrix_Deployment_Guide.md).

---

**Last Updated:** 2025-10-22
**Version:** 1.0
**Support:** Check GreenMatrix documentation or GitHub issues
