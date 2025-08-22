# GreenMatrix VM Host Deployment Guide

This comprehensive guide covers deploying the complete GreenMatrix system on a VM host machine with full monitoring capabilities.

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-deployment Setup](#pre-deployment-setup)
3. [Environment Configuration](#environment-configuration)
4. [Service Deployment](#service-deployment)
5. [Airflow Monitoring Setup](#airflow-monitoring-setup)
6. [VM Agent Deployment](#vm-agent-deployment)
7. [Production Configuration](#production-configuration)
8. [Troubleshooting](#troubleshooting)

## 🔧 System Requirements

### Hardware Requirements

**Minimum Configuration:**
- **CPU**: 8 cores (Intel Xeon or AMD EPYC recommended)
- **RAM**: 32 GB
- **Storage**: 500 GB SSD
- **Network**: 1 Gbps Ethernet

**Recommended for Production:**
- **CPU**: 16+ cores with virtualization support (Intel VT-x/AMD-V)
- **RAM**: 64+ GB
- **Storage**: 1 TB NVMe SSD + 2 TB data storage
- **Network**: 10 Gbps Ethernet
- **GPU**: NVIDIA GPU for ML workloads (optional)

### Software Requirements

- **Operating System**: Ubuntu 22.04 LTS or CentOS 8/RHEL 8
- **Hypervisor**: KVM/QEMU, VMware vSphere, or Hyper-V
- **Container Runtime**: Docker 24.0+ and Docker Compose 2.0+
- **Network**: Static IP address and DNS resolution

## ⚙️ Pre-deployment Setup

### 1. System Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip htop iotop nethogs tree

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply Docker group membership
```

### 2. Create Deployment Directory

```bash
# Create deployment directory
sudo mkdir -p /opt/greenmatrix
sudo chown $USER:$USER /opt/greenmatrix
cd /opt/greenmatrix

# Clone or copy GreenMatrix files
git clone <your-repository> .
# OR
# Copy files from your development machine
```

### 3. Network Configuration

```bash
# Configure firewall rules
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 8000/tcp    # Backend API
sudo ufw allow 3000/tcp    # Frontend
sudo ufw allow 8080/tcp    # Airflow Web UI
sudo ufw allow 5432/tcp    # PostgreSQL (if external access needed)
sudo ufw allow 5433/tcp    # TimescaleDB (if external access needed)
sudo ufw enable

# Set up hostname resolution (if needed)
echo "127.0.0.1 greenmatrix-host" | sudo tee -a /etc/hosts
```

## 🌍 Environment Configuration

### 1. Create Environment File

```bash
# Create .env file with production settings
cat > .env << 'EOF'
# Database Configuration
POSTGRES_USER=greenmatrix_user
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=greenmatrix
POSTGRES_PORT=5432
TIMESCALEDB_PORT=5433

# Service Ports
BACKEND_PORT=8000
FRONTEND_PORT=3000
REDIS_PORT=6379

# Airflow Configuration
AIRFLOW_UID=50000
AIRFLOW_FERNET_KEY=YlCImzjge_TeZc5FUOUuTFCN3mRBWZr3SaVXSTKXnKQ=
_AIRFLOW_WWW_USER_USERNAME=admin
_AIRFLOW_WWW_USER_PASSWORD=your_airflow_password

# Monitoring Configuration
MONITORING_EMAIL=admin@your-domain.com
COLLECTION_INTERVAL_MINUTES=5
HARDWARE_SPEC_INTERVAL_DAYS=1

# Cost Analysis
COST_PER_KWH=0.12
CURRENCY_SYMBOL=$$
CPU_TDP_WATTS=125
CURRENT_REGION=US

# Security (generate these with openssl rand -hex 32)
SECRET_KEY=your_secret_key_here
JWT_SECRET=your_jwt_secret_here

# Environment
ENVIRONMENT=production
API_REQUEST_TIMEOUT=30
EOF
```

### 2. Secure the Environment File

```bash
# Set proper permissions
chmod 600 .env
sudo chown root:docker .env
```

### 3. Create Production Configuration

```bash
# Create production config for the VM agent
cat > config.ini << 'EOF'
[Settings]
backend_api_url = http://localhost:8000
api_request_timeout = 30
collection_interval_minutes = 5
hardware_spec_interval_days = 1
cost_per_kwh = 0.12
currency_symbol = $$
cpu_tdp_watts = 125
current_region = US
EOF
```

## 🚢 Service Deployment

### 1. Pre-deployment Checks

```bash
# Check Docker installation
docker --version
docker-compose --version

# Verify system resources
free -h
df -h
lscpu
```

### 2. Build and Deploy Services

```bash
# Create necessary directories
mkdir -p logs/{backend,collector,airflow}
mkdir -p data/{postgres,timescaledb,redis}

# Set proper permissions
sudo chown -R $USER:docker logs/
sudo chown -R $USER:docker data/

# Pull and build services
docker-compose pull
docker-compose build

# Start the infrastructure services first
docker-compose up -d postgres timescaledb redis

# Wait for databases to be ready
echo "Waiting for databases to start..."
sleep 30

# Verify database connections
docker-compose exec postgres pg_isready -U greenmatrix_user
docker-compose exec timescaledb pg_isready -U greenmatrix_user

# Start remaining services
docker-compose up -d backend frontend

# Start Airflow services
docker-compose up -d airflow-init
sleep 60
docker-compose up -d airflow-webserver airflow-scheduler airflow-triggerer

# Start data collection services
docker-compose up -d data-collector db-setup
```

### 3. Verify Deployment

```bash
# Check service status
docker-compose ps

# Check service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs airflow-webserver

# Test API endpoints
curl -f http://localhost:8000/health
curl -f http://localhost:3000
curl -f http://localhost:8080  # Airflow UI
```

## 📊 Airflow Monitoring Setup

### 1. Access Airflow Web UI

```bash
# Default credentials (change in production):
# Username: admin
# Password: your_airflow_password (from .env)

# Open browser to: http://your-host-ip:8080
```

### 2. Configure Airflow Connections

In Airflow Web UI, go to **Admin > Connections** and add:

**Connection 1: greenmatrix_db**
- Connection ID: `greenmatrix_db`
- Connection Type: `Postgres`
- Host: `postgres`
- Schema: `greenmatrix`
- Login: `greenmatrix_user`
- Password: `your_secure_password_here`
- Port: `5432`

**Connection 2: metrics_db**
- Connection ID: `metrics_db`
- Connection Type: `Postgres`
- Host: `postgres`
- Schema: `Metrics_db`
- Login: `greenmatrix_user`
- Password: `your_secure_password_here`
- Port: `5432`

**Connection 3: timescaledb**
- Connection ID: `timescaledb`
- Connection Type: `Postgres`
- Host: `timescaledb`
- Schema: `vm_metrics_ts`
- Login: `greenmatrix_user`
- Password: `your_secure_password_here`
- Port: `5432`

### 3. Configure Airflow Variables

In Airflow Web UI, go to **Admin > Variables** and add:

```
GREENMATRIX_API_BASE_URL: http://backend:8000
MONITORING_EMAIL: admin@your-domain.com
```

### 4. Enable and Monitor DAGs

1. **greenmatrix_system_monitoring**: Monitors every 5 minutes
   - Backend health checks
   - Database connectivity
   - VM agent monitoring
   - Log analysis
   - System resource monitoring

2. **greenmatrix_performance_analytics**: Runs daily at 2 AM
   - Performance trend analysis
   - Anomaly detection
   - Capacity planning insights

### 5. Set Up Email Notifications

Configure SMTP in Airflow:

```bash
# Edit airflow.cfg or set environment variables
docker-compose exec airflow-webserver airflow config set smtp smtp_host smtp.your-domain.com
docker-compose exec airflow-webserver airflow config set smtp smtp_port 587
docker-compose exec airflow-webserver airflow config set smtp smtp_user your-email@domain.com
docker-compose exec airflow-webserver airflow config set smtp smtp_password your-email-password
docker-compose exec airflow-webserver airflow config set smtp smtp_mail_from greenmatrix@your-domain.com
```

## 🖥️ VM Agent Deployment

### 1. Build VM Agent Package

```bash
# On the host machine, build the VM agent
cd /opt/greenmatrix
python vm_agent/build_package.py

# This creates vm_agent_linux.tar.gz or vm_agent_windows.zip
```

### 2. Deploy to VM Instances

**For Linux VMs:**
```bash
# Copy agent to VM
scp vm_agent_linux.tar.gz user@vm-ip:/tmp/

# On the VM:
cd /opt
sudo tar -xzf /tmp/vm_agent_linux.tar.gz
cd vm_agent_linux
sudo ./install.sh

# Configure if needed
sudo nano vm_agent.ini

# Start the agent
sudo ./vm_agent

# Or set up as a service (see systemd service section below)
```

**For Windows VMs:**
```cmd
REM Copy agent to VM
copy vm_agent_windows.zip \\vm-ip\c$\temp\

REM On the VM:
cd C:\Program Files
7z x C:\temp\vm_agent_windows.zip
cd vm_agent_windows
install.bat

REM Configure if needed
notepad vm_agent.ini

REM Start the agent
vm_agent.exe

REM Or set up as a Windows service (see service section below)
```

### 3. Verify VM Agent Connectivity

```bash
# Check active VMs from the host
curl "http://localhost:8000/api/v1/metrics/vms/active"

# Check specific VM health
curl "http://localhost:8000/api/v1/metrics/vm/your-vm-name/health"

# Monitor in Airflow UI - check the greenmatrix_system_monitoring DAG
```

## 🔒 Production Configuration

### 1. Security Hardening

```bash
# Create SSL certificates (use Let's Encrypt for production)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# Update nginx configuration for SSL
# Copy certificates to appropriate locations

# Secure database connections
# Update connection strings to use SSL

# Set up fail2ban for additional security
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 2. Backup Configuration

```bash
# Create backup script
cat > /opt/greenmatrix/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/greenmatrix"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup databases
docker-compose exec -T postgres pg_dump -U greenmatrix_user greenmatrix > $BACKUP_DIR/greenmatrix_$DATE.sql
docker-compose exec -T postgres pg_dump -U greenmatrix_user Metrics_db > $BACKUP_DIR/metrics_$DATE.sql
docker-compose exec -T timescaledb pg_dump -U greenmatrix_user vm_metrics_ts > $BACKUP_DIR/vm_metrics_$DATE.sql

# Backup configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz .env config.ini docker-compose.yml

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/greenmatrix/backup.sh

# Set up daily backups
echo "0 2 * * * /opt/greenmatrix/backup.sh" | crontab -
```

### 3. Service Management Scripts

Create systemd services for proper service management:

```bash
# Create systemd service for GreenMatrix
sudo cat > /etc/systemd/system/greenmatrix.service << 'EOF'
[Unit]
Description=GreenMatrix Monitoring System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/greenmatrix
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable greenmatrix
sudo systemctl start greenmatrix
```

### 4. Log Management

```bash
# Set up log rotation
sudo cat > /etc/logrotate.d/greenmatrix << 'EOF'
/opt/greenmatrix/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose exec backend kill -USR1 1
    endscript
}
EOF

# Configure Docker log rotation
sudo cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
EOF

sudo systemctl restart docker
```

## 🔍 Monitoring and Alerting

### 1. System Monitoring

The deployed Airflow DAGs provide comprehensive monitoring:

- **Health Checks**: Every 5 minutes
- **Performance Analysis**: Daily
- **Resource Monitoring**: Continuous
- **Alert Generation**: Automatic

### 2. Key Metrics to Monitor

**System Level:**
- CPU utilization < 80%
- Memory usage < 85%
- Disk usage < 85%
- Network latency < 100ms

**Application Level:**
- API response time < 2s
- Database connection count
- Failed request rate < 1%
- Queue depth (if applicable)

**VM Agent Level:**
- VM connectivity status
- Data collection frequency
- Agent health status
- Network connectivity

### 3. Alert Configuration

Configure alerts in Airflow for:
- Service downtime
- High resource usage
- Database connection failures
- VM agent disconnections
- Performance anomalies

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Errors**
```bash
# Check database status
docker-compose ps postgres timescaledb

# Check logs
docker-compose logs postgres
docker-compose logs timescaledb

# Restart databases
docker-compose restart postgres timescaledb
```

**2. Backend API Not Responding**
```bash
# Check backend logs
docker-compose logs backend

# Check backend health
curl http://localhost:8000/health

# Restart backend
docker-compose restart backend
```

**3. VM Agents Not Connecting**
```bash
# Check firewall rules
sudo ufw status

# Test connectivity from VM
telnet host-ip 8000

# Check VM agent logs
./vm_agent --test
```

**4. Airflow Tasks Failing**
```bash
# Check Airflow logs
docker-compose logs airflow-scheduler
docker-compose logs airflow-webserver

# Check task logs in Airflow UI
# Go to DAGs > Task Instance > View Log
```

### Performance Optimization

**1. Database Optimization**
```sql
-- Run on PostgreSQL
VACUUM ANALYZE;
REINDEX DATABASE greenmatrix;

-- Run on TimescaleDB  
SELECT add_compression_policy('vm_process_metrics', INTERVAL '7 days');
```

**2. System Optimization**
```bash
# Increase file descriptor limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize kernel parameters
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
echo "net.core.somaxconn=65536" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Log Locations

- **Application Logs**: `/opt/greenmatrix/logs/`
- **Docker Logs**: `docker-compose logs <service_name>`
- **System Logs**: `/var/log/syslog`
- **Airflow Logs**: Airflow UI > DAGs > Task Logs

### Support Resources

- **Health Check**: `http://your-host:8000/health`
- **API Status**: `http://your-host:8000/api/status`
- **Airflow UI**: `http://your-host:8080`
- **Frontend**: `http://your-host:3000`

---

## 📈 Next Steps

After deployment:

1. **Monitor System Health**: Check Airflow dashboards daily
2. **Deploy VM Agents**: Roll out to all target VMs
3. **Configure Alerting**: Set up email/Slack notifications
4. **Performance Tuning**: Optimize based on actual usage
5. **Scale as Needed**: Add resources based on monitoring data

This deployment provides a robust, production-ready GreenMatrix system with comprehensive monitoring and alerting capabilities.