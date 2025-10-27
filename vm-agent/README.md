# GreenMatrix VM Agent - Quick Start Package

**Version**: 2.0.0
**Last Updated**: 2025-10-27

---

## 📦 What's in This Folder?

This folder contains **everything you need** to set up VM monitoring on Windows and Linux virtual machines.

### **Files Included:**

| File | Purpose | Platform |
|------|---------|----------|
| `simple_vm_agent.py` | Main monitoring agent | Windows & Linux |
| `deploy-vm-agent.bat` | **Automated installer** | **Windows** |
| `deploy-vm-agent.sh` | **Automated installer** | **Linux** |
| `vm_agent_config.ini.template` | Configuration template | Both |
| `README.md` | This quick-start guide | Documentation |
| `requirements.txt` | Python dependencies | Both |

---

## 🚀 Quick Start (3 Steps)

### **For Windows VMs:**

1. **Copy this entire `vm-agent` folder to the VM**
   ```batch
   # Via network share
   xcopy \\greenmatrix-host\share\vm-agent C:\Temp\vm-agent /E /I

   # Or via USB drive
   xcopy E:\vm-agent C:\Temp\vm-agent /E /I
   ```

2. **Run the installer as Administrator**
   ```batch
   cd C:\Temp\vm-agent
   deploy-vm-agent.bat
   ```

3. **Done!** The script will:
   - ✅ Install Python if not present
   - ✅ Detect host IP automatically
   - ✅ Install and start the agent
   - ✅ Verify connectivity

**Time**: 5-7 minutes (with Python installation)

---

### **For Linux VMs:**

1. **Copy this entire `vm-agent` folder to the VM**
   ```bash
   # Via SCP
   scp -r vm-agent user@vm-ip:/tmp/

   # Via SFTP
   sftp user@vm-ip
   put -r vm-agent
   ```

2. **Run the installer with sudo**
   ```bash
   cd /tmp/vm-agent
   sudo bash deploy-vm-agent.sh
   ```

3. **Done!** The script will:
   - ✅ Install Python if not present
   - ✅ Detect host IP automatically
   - ✅ Install and start the agent
   - ✅ Verify connectivity

**Time**: 3-5 minutes (with Python installation)

---

## 📋 Prerequisites

### **What You Need:**

✅ **Already Handled by Scripts:**
- Python 3.8+ (auto-installed if internet available)
- Required packages (auto-installed)
- Configuration (auto-generated)
- Service/scheduled task (auto-created)

✅ **You Must Have:**
- **Administrator/root access** on the VM
- **Network connectivity** to GreenMatrix host
- **Internet connection** (optional; only needed if Python not installed)

### **Special Cases:**

| Scenario | Action Required |
|----------|----------------|
| **Air-gapped VM (no internet)** | Pre-install Python 3.8+ before running script |
| **Proxy environment** | Configure proxy before running (see Advanced Configuration) |
| **Custom backend port** | Edit config file after installation |
| **Multiple NICs** | Verify auto-detected IP is correct (script shows detected IP) |

---

## 🔍 What the Scripts Do (Step-by-Step)

### **Windows (deploy-vm-agent.bat):**

1. ✅ Checks if Python installed → Downloads/installs if missing
2. ✅ Creates virtual environment in `C:\GreenMatrix-VM-Agent\`
3. ✅ Installs packages: `psutil`, `requests`, `pynvml`
4. ✅ Detects host IP via `ipconfig` (default gateway)
5. ✅ Creates config file with auto-detected IP
6. ✅ Sets up Windows scheduled task (runs at startup)
7. ✅ Starts the agent
8. ✅ Tests connectivity to backend: `http://<HOST_IP>:8000/health`

**Output Example:**
```
[STEP] Checking environment...
[INFO] ✅ Python found
[STEP] Setting up VM agent environment...
[INFO] ✅ VM agent environment set up
[STEP] Configuring VM agent...
[INFO] Using host VM IP: 10.25.41.86
[INFO] VM Name: WEBSERVER-01
[INFO] ✅ VM agent configured
[STEP] Creating Windows service...
[INFO] ✅ Service installation completed
[STEP] Starting VM agent...
[INFO] ✅ VM agent started
[STEP] Testing connectivity to host...
✅ Successfully connected to GreenMatrix backend
🎉 GreenMatrix VM Agent Deployment Complete!
```

### **Linux (deploy-vm-agent.sh):**

1. ✅ Checks VM environment (VMware, KVM, etc.)
2. ✅ Installs Python3 + pip + venv (via apt/yum/dnf)
3. ✅ Creates virtual environment in `/opt/greenmatrix-vm-agent/`
4. ✅ Installs packages: `psutil`, `requests`, `pynvml`
5. ✅ Detects host IP via `ip route` (default gateway)
6. ✅ Creates config file with auto-detected IP
7. ✅ Creates systemd service
8. ✅ Enables service for auto-start at boot
9. ✅ Starts the agent
10. ✅ Tests connectivity to backend

**Output Example:**
```
[STEP] Checking VM environment...
[INFO] ✅ Running inside a virtual machine (detected: vmware)
[STEP] Installing dependencies...
[INFO] ✅ Dependencies installed
[STEP] Setting up VM agent environment...
[INFO] ✅ VM agent environment set up
[STEP] Configuring VM agent...
[INFO] Using host VM IP: 10.25.41.86
[INFO] VM Name: webserver-01
[INFO] ✅ VM agent configured
[STEP] Creating systemd service...
[INFO] ✅ Systemd service created and enabled
[STEP] Starting VM agent service...
[INFO] ✅ VM agent service started successfully
[STEP] Testing connectivity to host...
[INFO] ✅ Successfully connected to GreenMatrix backend
🎉 GreenMatrix VM Agent Deployment Complete!
```

---

## ✅ Verification

### **Check if Agent is Running:**

**Windows:**
```batch
# Check scheduled task
schtasks /query /tn "GreenMatrix VM Agent"

# View logs
type C:\GreenMatrix-VM-Agent\greenmatrix-vm-agent.log
```

**Linux:**
```bash
# Check service status
sudo systemctl status greenmatrix-vm-agent

# View logs
sudo journalctl -u greenmatrix-vm-agent -n 50
```

### **Expected Log Output:**
```
GreenMatrix VM Agent - Starting
============================================================
VM Name: webserver-01-Linux
Backend URL: http://10.25.41.86:8000
Collection Interval: 60 seconds
GPU Monitoring: Enabled
============================================================
Initializing CPU monitoring...
VM RAM: 16.0GB total, 8.5GB used (53.12%)
VM VRAM: 24.0GB total, 12.3GB used (51.25%)
Sending 143 processes...
Response: 200
✅ Successfully sent VM snapshot!
```

### **Check in Dashboard:**

1. Open GreenMatrix Dashboard: `http://<GREENMATRIX_HOST>:3000`
2. Navigate to **VM Instances** section
3. Look for your VM name (e.g., `webserver-01-Linux`)
4. Verify metrics are updating every 60 seconds

---

## 🔧 Troubleshooting

### **Issue 1: Script Can't Find Python**

**Symptom:**
```
[ERROR] Failed to download Python installer
Please manually install Python 3.8+ from https://python.org
```

**Solution (Air-gapped VM):**
1. Download Python installer on a connected machine:
   - Windows: https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe
   - Linux: Pre-installed via package manager
2. Transfer installer to VM via USB/network share
3. Install manually:
   ```batch
   # Windows
   python-3.11.9-amd64.exe /quiet InstallAllUsers=1 PrependPath=1

   # Linux
   sudo apt-get install python3 python3-pip python3-venv
   ```
4. Re-run the deployment script

---

### **Issue 2: Connection Refused Error**

**Symptom:**
```
❌ Connection error: ConnectionRefusedError: [Errno 111] Connection refused
   Backend URL: http://10.25.41.86:8000
```

**Solution:**
1. **Verify backend is running** on GreenMatrix host:
   ```bash
   docker ps | grep greenmatrix-backend
   ```

2. **Test connectivity from VM:**
   ```bash
   # Test ping
   ping 10.25.41.86

   # Test HTTP
   curl http://10.25.41.86:8000/health
   ```

3. **Check firewall on GreenMatrix host:**
   ```bash
   # Windows
   netsh advfirewall firewall add rule name="GreenMatrix Backend" dir=in action=allow protocol=TCP localport=8000

   # Linux
   sudo ufw allow 8000/tcp
   ```

4. **For LXD containers**, add iptables forwarding:
   ```bash
   sudo iptables -A FORWARD -i lxdbr0 -o docker0 -j ACCEPT
   sudo iptables -A FORWARD -i docker0 -o lxdbr0 -m state --state RELATED,ESTABLISHED -j ACCEPT
   ```

---

### **Issue 3: Wrong Host IP Detected**

**Symptom:**
```
[INFO] Using host VM IP: 172.16.0.1
# But the correct IP should be 10.25.41.86
```

**Solution:**
1. **Stop the installer** (Ctrl+C)
2. **Manually edit config file** after installation:
   ```bash
   # Windows
   notepad C:\GreenMatrix-VM-Agent\vm_agent.ini

   # Linux
   sudo nano /opt/greenmatrix-vm-agent/vm_agent.ini
   ```
3. **Change backend_url**:
   ```ini
   [api]
   backend_url = http://10.25.41.86:8000  # ← Correct IP
   ```
4. **Restart agent**:
   ```bash
   # Windows
   schtasks /run /tn "GreenMatrix VM Agent"

   # Linux
   sudo systemctl restart greenmatrix-vm-agent
   ```

---

### **Issue 4: GPU Metrics Not Showing**

**Symptom:** GPU columns show 0.00 or N/A in dashboard

**Solution:**
1. **Verify GPU is available:**
   ```bash
   # Windows/Linux
   nvidia-smi
   ```

2. **Install GPU drivers** if missing:
   - NVIDIA: https://www.nvidia.com/drivers
   - AMD: https://www.amd.com/en/support

3. **Verify config has GPU enabled:**
   ```ini
   [collection]
   collect_gpu_metrics = true
   ```

4. **Restart agent** after driver installation

---

## 📚 Advanced Configuration

### **Change Collection Interval:**

Edit config file:
```ini
[collection]
interval_seconds = 300  # Collect every 5 minutes (instead of 60 seconds)
```

Then restart agent.

### **Configure for Proxy Environment:**

**Before running deployment script:**

**Windows:**
```batch
set HTTP_PROXY=http://proxy.company.com:8080
set HTTPS_PROXY=http://proxy.company.com:8080
deploy-vm-agent.bat
```

**Linux:**
```bash
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
sudo -E bash deploy-vm-agent.sh
```

### **Custom VM Name:**

Edit config file after installation:
```ini
[collection]
vm_name = prod-database-server-01  # Custom name instead of hostname
```

### **Disable GPU Monitoring (Save Resources):**

Edit config file:
```ini
[collection]
collect_gpu_metrics = false
```

---

## 🗑️ Uninstall

### **Windows:**
```batch
# Stop and remove scheduled task
schtasks /delete /tn "GreenMatrix VM Agent" /f

# Remove installation
rd /s /q C:\GreenMatrix-VM-Agent
```

### **Linux:**
```bash
# Stop and disable service
sudo systemctl stop greenmatrix-vm-agent
sudo systemctl disable greenmatrix-vm-agent
sudo rm /etc/systemd/system/greenmatrix-vm-agent.service
sudo systemctl daemon-reload

# Remove installation
sudo rm -rf /opt/greenmatrix-vm-agent
sudo rm /var/log/greenmatrix-vm-agent.log
```

---

## 📖 Additional Documentation

For detailed information:
- **Network Architecture**: See `docs/VM_Monitoring_Setup_Guide.md` (Section: Network Architecture)
- **Infrastructure-Specific Deployment**: See `docs/VM_Monitoring_Setup_Guide.md` (Section: Infrastructure-Specific Deployment)
- **Full Deployment Guide**: See `docs/GreenMatrix_Deployment_Guide.md` (Section: Virtual Machine Monitoring Setup)

---

## 💡 Tips for Bulk Deployment

### **Deploy to 100+ VMs:**

**Use Ansible:**
```yaml
- hosts: all_vms
  tasks:
    - name: Copy VM agent files
      copy: src=vm-agent dest=/tmp/

    - name: Run deployment
      command: bash /tmp/vm-agent/deploy-vm-agent.sh
      become: yes
```

**Use PowerCLI (VMware):**
```powershell
$vms = Get-VM -Name "web-*"
foreach ($vm in $vms) {
    Copy-VMGuestFile -Source "vm-agent" -Destination "C:\Temp\" -VM $vm
    Invoke-VMScript -ScriptText "C:\Temp\vm-agent\deploy-vm-agent.bat" -VM $vm
}
```

**Use cloud-init (AWS/Azure/GCP):**
```yaml
#cloud-config
runcmd:
  - curl -o /tmp/vm-agent.tar.gz https://greenmatrix-host/vm-agent.tar.gz
  - tar -xzf /tmp/vm-agent.tar.gz -C /tmp/
  - bash /tmp/vm-agent/deploy-vm-agent.sh
```

---

## 🆘 Support

**Need Help?**
- Check logs: `C:\GreenMatrix-VM-Agent\greenmatrix-vm-agent.log` (Windows) or `/var/log/greenmatrix-vm-agent.log` (Linux)
- Review troubleshooting guide above
- See full documentation: `docs/VM_Monitoring_Setup_Guide.md`
- GitHub Issues: [github.com/greenmatrix/greenmatrix/issues](https://github.com/greenmatrix/greenmatrix/issues)
- HPE Confluence: [GreenMatrix Documentation Portal](https://hpe.atlassian.net/wiki/spaces/PSGCC/folder/3800040400)

---

**Version History:**
- **v2.0.0** (2025-10-27): Config-based agent, auto Python install, comprehensive documentation
- **v1.0.0** (2025-06-15): Initial release

---

**That's it! Copy this folder to any VM and run the installer - monitoring will be active in minutes.** 🚀
