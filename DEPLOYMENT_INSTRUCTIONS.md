# GreenMatrix Complete Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying GreenMatrix to host VMs using WinSCP and PuTTY client. The deployment includes:

- ✅ **Complete containerized setup** with Docker Compose
- ✅ **Automated database initialization** with TimescaleDB
- ✅ **Metric collection scripts** running automatically
- ✅ **Airflow monitoring** for data pipelines
- ✅ **VM agent deployment** for VM-level metrics
- ✅ **Cross-platform support** (Windows & Linux)

---

## Prerequisites

### Host VM Requirements
- **OS**: Ubuntu 20.04+ / Windows Server 2019+ / CentOS 8+
- **RAM**: Minimum 8GB (16GB recommended)
- **CPU**: 4+ cores
- **Disk**: 50GB+ free space
- **Network**: Internet connectivity

### Client Requirements
- **WinSCP** for file transfer
- **PuTTY** for SSH access (Linux) or RDP (Windows)

---

## Part 1: Project Transfer to Host VM

### Step 1: Connect to Host VM

#### For Linux Host VM:
1. Open PuTTY
2. Enter host VM IP address
3. Port: 22 (SSH)
4. Login with your credentials

#### For Windows Host VM:
1. Use Remote Desktop Connection
2. Enter host VM IP address
3. Login with your credentials

### Step 2: Transfer Project Files

#### Using WinSCP:
1. Open WinSCP
2. Configure connection:
   - **Protocol**: SFTP (Linux) or SCP (Linux) / FTPS (Windows)
   - **Host**: Your host VM IP
   - **Username/Password**: Your VM credentials
3. Transfer the entire `GreenMatrix` folder to:
   - **Linux**: `/home/username/GreenMatrix`
   - **Windows**: `C:\GreenMatrix`

#### Alternative: Using Git (if available)
```bash
# Linux
cd /home/username
git clone <your-repository-url> GreenMatrix

# Windows (in PowerShell)
cd C:\
git clone <your-repository-url> GreenMatrix
```

---

## Part 2: Host VM Setup

### Linux Installation

1. **Navigate to project directory**:
   ```bash
   cd /home/username/GreenMatrix
   ```

2. **Make scripts executable**:
   ```bash
   chmod +x setup-greenmatrix.sh
   chmod +x deploy-vm-agent.sh
   chmod +x validate-deployment.sh
   ```

3. **Run installation script**:
   ```bash
   sudo ./setup-greenmatrix.sh
   ```

4. **Verify deployment**:
   ```bash
   ./validate-deployment.sh
   ```

### Windows Installation

1. **Open PowerShell as Administrator**
2. **Navigate to project directory**:
   ```powershell
   cd C:\GreenMatrix
   ```

3. **Run installation script**:
   ```powershell
   .\install.bat
   ```

4. **Wait for completion** (approximately 10-15 minutes)

---

## Part 3: Verification

### Check Services Status

#### Linux:
```bash
# Check Docker services
docker-compose ps

# Check individual services
docker-compose logs backend
docker-compose logs frontend
docker-compose logs data-collector
docker-compose logs airflow-webserver
```

#### Windows:
```powershell
# Check Docker services
docker-compose ps

# Check individual services
docker-compose logs backend
docker-compose logs frontend
docker-compose logs data-collector
```

### Access Web Interfaces

After successful deployment, access these URLs:

- **📊 Main Dashboard**: http://HOST_VM_IP:3000
- **🔧 API Documentation**: http://HOST_VM_IP:8000/docs
- **📈 Airflow Monitoring**: http://HOST_VM_IP:8080
- **❤️ Backend Health**: http://HOST_VM_IP:8000/health

**Default Credentials**:
- Airflow UI: `airflow` / `airflow`

### Verify Database Setup

The installation automatically creates and seeds all databases:

1. **Main PostgreSQL Database** (Port 5432):
   - `greenmatrix` - Main application data
   - `Model_Recommendation_DB` - ML models and recommendations
   - `Metrics_db` - Host process metrics

2. **TimescaleDB** (Port 5433):
   - `vm_metrics_ts` - VM process metrics (time-series optimized)

3. **Airflow Database** (Port 5432):
   - `airflow` - Workflow management

---

## Part 4: VM Agent Deployment

### Create VM Instances

#### Using VirtualBox (Example):
1. Create new Ubuntu VM instances
2. Allocate minimum 2GB RAM, 20GB disk per VM
3. Install Ubuntu 20.04+ on each VM
4. Configure network (NAT or Bridged)

#### Using VMware:
1. Create new VM instances  
2. Install Ubuntu/Windows on VMs
3. Configure network connectivity

### Deploy Agents to Linux VMs

1. **Transfer agent files to each VM**:
   ```bash
   # On host VM, copy files to VM
   scp vm_agent.py vm_agent.ini.example deploy-vm-agent.sh user@VM_IP:/home/user/
   ```

2. **Run deployment script on each VM**:
   ```bash
   # Inside each VM
   sudo ./deploy-vm-agent.sh
   ```

3. **Verify agent is running**:
   ```bash
   sudo systemctl status greenmatrix-vm-agent
   sudo journalctl -u greenmatrix-vm-agent -f
   ```

### Deploy Agents to Windows VMs

1. **Transfer files using WinSCP**:
   - Copy `vm_agent.py`, `vm_agent.ini.example`, `deploy-vm-agent.bat` to each Windows VM

2. **Run deployment script on each VM**:
   ```batch
   REM Run as Administrator
   deploy-vm-agent.bat
   ```

3. **Verify agent is running**:
   - Check Task Scheduler for "GreenMatrix VM Agent" task
   - Check log file: `C:\GreenMatrix-VM-Agent\greenmatrix-vm-agent.log`

---

## Part 5: Verification and Testing

### 1. Check Host-Level Metrics

1. Access dashboard: http://HOST_VM_IP:3000
2. Navigate to **Admin Dashboard**
3. Verify host process metrics are being collected
4. Check charts and graphs for real-time data

### 2. Verify VM-Level Metrics

1. In the dashboard, go to **VM Instances** section
2. You should see your VM instances listed
3. Click on a VM card to view detailed metrics
4. Click **"Get Recommendations"** to test ML recommendations

### 3. Test Date Range Functionality

1. Use the date picker to select different dates
2. Verify data loads for available dates
3. Check error messages for dates with no data

### 4. Verify Database Data

#### Check Host Metrics:
```sql
-- Connect to Metrics_db
SELECT COUNT(*) FROM host_process_metrics 
WHERE timestamp > NOW() - INTERVAL '1 hour';
```

#### Check VM Metrics:
```sql
-- Connect to vm_metrics_ts database  
SELECT vm_name, COUNT(*) as metric_count 
FROM vm_process_metrics 
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY vm_name;
```

### 5. Test Airflow Monitoring

1. Access Airflow UI: http://HOST_VM_IP:8080
2. Login with `airflow` / `airflow`
3. Verify DAGs are running:
   - `data_pipeline_monitoring`
   - `database_health_monitoring`
   - `api_health_monitoring`
   - `data_quality_validation`

---

## Part 6: Troubleshooting

### Common Issues and Solutions

#### 1. Services Not Starting
```bash
# Check Docker status
sudo systemctl status docker

# Check service logs
docker-compose logs [service-name]

# Restart services
docker-compose restart
```

#### 2. Database Connection Issues
```bash
# Check database connectivity
docker-compose exec postgres pg_isready -U postgres
docker-compose exec timescaledb pg_isready -U postgres

# Reset databases if needed
docker-compose down -v
docker-compose up -d
```

#### 3. VM Agents Not Connecting
```bash
# On VM, check connectivity to host
curl http://HOST_IP:8000/health

# Check agent logs
sudo journalctl -u greenmatrix-vm-agent -f  # Linux
type C:\GreenMatrix-VM-Agent\greenmatrix-vm-agent.log  # Windows

# Restart agent
sudo systemctl restart greenmatrix-vm-agent  # Linux
schtasks /run /tn "GreenMatrix VM Agent"  # Windows
```

#### 4. Dashboard Not Loading Data
1. Check backend API: http://HOST_VM_IP:8000/health
2. Verify data collection: `docker-compose logs data-collector`
3. Check database connections in backend logs
4. Ensure metric collection scripts are running

#### 5. Port Conflicts
```bash
# Check what's using ports
netstat -tulpn | grep -E ':(3000|8000|5432|5433|8080)'

# Modify ports in .env file if needed
nano .env
docker-compose down && docker-compose up -d
```

### Log Locations

- **Backend**: `docker-compose logs backend`
- **Data Collector**: `docker-compose logs data-collector`  
- **Database**: `docker-compose logs postgres`
- **Frontend**: `docker-compose logs frontend`
- **Airflow**: `docker-compose logs airflow-webserver`
- **VM Agents**: 
  - Linux: `/var/log/greenmatrix-vm-agent.log`
  - Windows: `C:\GreenMatrix-VM-Agent\greenmatrix-vm-agent.log`

---

## Part 7: Production Considerations

### Security
1. **Change default passwords** in `.env` file
2. **Configure firewall rules** to restrict access
3. **Use HTTPS** with SSL certificates
4. **Enable authentication** for sensitive endpoints

### Performance Optimization
1. **Scale databases** based on data volume
2. **Configure resource limits** in docker-compose.yml
3. **Monitor disk usage** for time-series data
4. **Set up log rotation** for application logs

### Backup Strategy
1. **Database backups**:
   ```bash
   # PostgreSQL backup
   docker-compose exec postgres pg_dump -U postgres greenmatrix > backup.sql
   
   # TimescaleDB backup
   docker-compose exec timescaledb pg_dump -U postgres vm_metrics_ts > vm_backup.sql
   ```

2. **Configuration backups**:
   ```bash
   # Backup configuration files
   tar -czf greenmatrix-config-backup.tar.gz .env docker-compose.yml
   ```

### Monitoring and Alerting
1. **Configure email notifications** in `.env`
2. **Set up Slack/Discord webhooks** for alerts
3. **Monitor system resources** via Airflow DAGs
4. **Set up external monitoring** for uptime checks

---

## Part 8: Success Checklist

✅ **Host VM Setup**
- [ ] Docker and Docker Compose installed
- [ ] GreenMatrix services running
- [ ] All databases initialized and connected
- [ ] Web interfaces accessible

✅ **Data Collection**
- [ ] Host-level metrics being collected
- [ ] Data visible in dashboard
- [ ] Date range functionality working
- [ ] Charts and graphs displaying data

✅ **VM Agent Deployment**
- [ ] VM instances created and configured
- [ ] VM agents installed and running
- [ ] VM metrics flowing to host database
- [ ] VM data visible in dashboard

✅ **Airflow Monitoring**
- [ ] Airflow UI accessible
- [ ] Monitoring DAGs running
- [ ] Email/notification alerts configured
- [ ] Data quality checks passing

✅ **Validation Tests**
- [ ] All validation script tests pass
- [ ] API endpoints responding
- [ ] Database queries working
- [ ] Recommendation engine functional

---

## Support and Documentation

- **API Documentation**: http://HOST_VM_IP:8000/docs
- **Validation Script**: `./validate-deployment.sh`
- **Service Logs**: `docker-compose logs [service]`
- **Configuration**: `.env` file for environment settings

**Total Deployment Time**: Approximately 30-45 minutes including VM setup and validation.

---

## Answers to Original Questions

**Q: Will metric collection scripts run automatically?**  
✅ **Yes** - The `data-collector` service starts automatically and runs continuously

**Q: Will database tables be created automatically?**  
✅ **Yes** - All tables are created via SQL init scripts in Docker containers

**Q: Will TimescaleDB be set up properly?**  
✅ **Yes** - Hypertables, indexes, and time-series optimizations are configured automatically

**Q: Can I deploy to both Windows and Linux VMs?**  
✅ **Yes** - Provided installation scripts for both platforms

**Q: Will VM-level metrics flow to the host database?**  
✅ **Yes** - VM agents automatically discover host IP and send data to TimescaleDB

**Q: Will the UI show VM-level data correctly?**  
✅ **Yes** - Dashboard displays VM instances with detailed process metrics and recommendations