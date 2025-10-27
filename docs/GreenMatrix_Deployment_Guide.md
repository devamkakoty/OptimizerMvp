# GreenMatrix Deployment and Installation Guide

**Document Version:** 1.0  
**Publication Date:** December 2024  
**Document Classification:** Public  
**Target Audience:** System Administrators, DevOps Engineers, IT Operations

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Pre-Installation Requirements](#pre-installation-requirements)
3. [System Architecture Overview](#system-architecture-overview)
4. [Installation Planning](#installation-planning)
5. [Prerequisites Installation](#prerequisites-installation)
6. [Database Configuration](#database-configuration)
7. [Backend Service Deployment](#backend-service-deployment)
8. [Frontend Application Setup](#frontend-application-setup)
9. [Host Monitoring Configuration](#host-monitoring-configuration)
10. [Virtual Machine Monitoring Setup](#virtual-machine-monitoring-setup)
11. [Docker-based Deployment](#docker-based-deployment)
12. [Configuration Management](#configuration-management)
13. [System Verification and Testing](#system-verification-and-testing)
14. [Security Configuration](#security-configuration)
15. [Performance Optimization](#performance-optimization)
16. [Troubleshooting](#troubleshooting)
17. [Appendices](#appendices)

---

## Executive Summary

This deployment guide provides comprehensive instructions for installing and configuring the GreenMatrix monitoring and optimization platform. The guide covers both traditional installation methods and containerized deployment options, ensuring successful implementation across various infrastructure environments.

GreenMatrix supports deployment on Ubuntu Linux systems with provisions for both host-level and virtual machine monitoring capabilities. The platform architecture consists of multiple components including a React-based frontend, FastAPI backend services, PostgreSQL/TimescaleDB databases, and distributed monitoring agents.

### Deployment Options

This guide covers three primary deployment approaches:
- **Manual Installation:** Step-by-step component installation for maximum control and customization
- **Docker Deployment:** Containerized deployment for simplified management and scalability
- **Hybrid Deployment:** Combination approach for specific infrastructure requirements

### Estimated Deployment Time

- **Manual Installation:** 45-60 minutes for complete setup
- **Docker Deployment:** 15-20 minutes for container-based setup
- **Configuration and Testing:** Additional 15-20 minutes for verification

---

## Pre-Installation Requirements

### System Requirements

#### Minimum Hardware Requirements
- **CPU:** 2 cores, 2.0 GHz processor
- **Memory:** 4 GB RAM
- **Storage:** 20 GB available disk space
- **Network:** 10 Mbps internet connection

#### Recommended Hardware Specifications
- **CPU:** 4 cores, 2.5 GHz or higher processor
- **Memory:** 16 GB RAM
- **Storage:** 50 GB SSD storage with high IOPS capability
- **Network:** 100 Mbps internet connection with low latency

#### Operating System Requirements

**Supported Operating Systems:**

**Linux:**
- Ubuntu 20.04 LTS (Focal Fossa)
- Ubuntu 22.04 LTS (Jammy Jellyfish)
- Ubuntu 18.04 LTS (Bionic Beaver) - Limited support
- Other Debian-based distributions (with manual configuration)

**Windows:**
- Windows 10 (Version 1809 or later)
- Windows 11
- Windows Server 2019
- Windows Server 2022

**Additional Requirements:**
- Root or sudo access privileges (Linux) / Administrator privileges (Windows)
- Internet connectivity for package downloads
- Firewall configuration permissions
- Database administration capabilities (for manual setup)
- Docker Desktop (Windows) or Docker Engine (Linux) for containerized deployment

### Network Requirements

#### Port Configuration
The following network ports must be accessible:

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Web Dashboard | 80, 443 | HTTP/HTTPS | Frontend application access |
| Backend API | 8000 | HTTP | REST API services |
| PostgreSQL | 5432 | TCP | Primary database connection |
| TimescaleDB | 5433 | TCP | Time-series database connection |
| Monitoring Agents | 9090 | HTTP | Agent communication |

#### Firewall Configuration
Configure firewall rules to allow inbound connections on required ports:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 5432/tcp
sudo ufw allow 5433/tcp
sudo ufw allow 9090/tcp
```

---

## System Architecture Overview

### Component Architecture

GreenMatrix employs a multi-tier architecture consisting of the following primary components:

#### Presentation Layer
- **Web Dashboard:** React-based single-page application providing user interface
- **API Gateway:** Nginx reverse proxy for load balancing and SSL termination
- **Static Asset Serving:** Optimized delivery of frontend resources

#### Application Layer
- **Backend Services:** FastAPI-based REST API services
- **Authentication Service:** User authentication and authorization management
- **Data Processing Engine:** Real-time metrics processing and analysis
- **Recommendation Engine:** AI-powered optimization recommendation system

#### Data Layer
- **PostgreSQL Database:** Metadata, configuration, and user data storage
- **TimescaleDB:** High-performance time-series metrics storage
- **Redis Cache:** Session management and performance optimization
- **File Storage:** Log files, backups, and temporary data

#### Monitoring Layer
- **Host Agents:** Process monitoring on host systems
- **VM Agents:** Container and virtual machine monitoring
- **Data Collectors:** Metrics aggregation and forwarding services
- **Health Monitoring:** System component health tracking

### Data Flow Architecture

#### Metrics Collection Flow
1. **Data Source:** Host processes and VM instances generate performance metrics
2. **Collection Agents:** Monitoring agents collect and buffer metrics data
3. **Data Transmission:** Agents transmit data to backend services via HTTP/HTTPS
4. **Data Processing:** Backend services validate, process, and store metrics
5. **Database Storage:** Processed data stored in appropriate database tables
6. **User Interface:** Dashboard retrieves and displays processed data

#### Recommendation Generation Flow
1. **Data Analysis:** Recommendation engine analyzes historical metrics data
2. **Pattern Recognition:** Machine learning algorithms identify optimization opportunities
3. **Recommendation Generation:** System generates prioritized recommendations
4. **Storage and Caching:** Recommendations stored and cached for performance
5. **User Presentation:** Dashboard displays recommendations with context and priorities

---

## Installation Planning

### Pre-Installation Checklist

#### System Preparation
- [ ] Verify system meets minimum hardware requirements
- [ ] Confirm operating system compatibility and version
- [ ] Ensure administrative access privileges
- [ ] Validate network connectivity and bandwidth
- [ ] Plan storage allocation for databases and logs
- [ ] Document current system configuration

#### Security Planning
- [ ] Review security policies and compliance requirements
- [ ] Plan SSL certificate deployment strategy
- [ ] Configure firewall rules and network access controls
- [ ] Establish backup and disaster recovery procedures
- [ ] Define user access roles and permissions

#### Deployment Strategy Selection
- [ ] Choose deployment method (manual, Docker, or hybrid)
- [ ] Plan component placement and resource allocation
- [ ] Schedule deployment window and maintenance procedures
- [ ] Prepare rollback procedures for unsuccessful deployments

### Resource Planning

#### Storage Requirements
- **Database Storage:** 5-10 GB initial allocation, growing at 1-2 GB per month per monitored system
- **Application Storage:** 2-3 GB for application binaries and static assets
- **Log Storage:** 1-2 GB per month for system and application logs
- **Backup Storage:** 2x database storage for backup retention

#### Memory Allocation
- **PostgreSQL:** 2-4 GB RAM allocation for optimal performance
- **Backend Services:** 1-2 GB RAM for API services and processing
- **Frontend Services:** 512 MB - 1 GB RAM for web server and caching
- **Operating System:** 1-2 GB RAM reservation for system operations

---

## Quick Start: Automated Deployment

### Automated Setup Scripts (Recommended)

GreenMatrix provides automated setup scripts that handle installation, configuration, and deployment in a single command. This is the **recommended method** for most users.

#### Windows Automated Deployment

**Prerequisites:**
- Administrator privileges
- Internet connection
- Git for Windows (optional, for cloning repository)

**Installation Steps:**

```batch
# 1. Clone or download GreenMatrix repository
git clone https://github.com/your-org/greenmatrix.git
cd greenmatrix

# 2. Run automated setup script
setup-greenmatrix.bat
```

The script will automatically:
- Check and install Docker Desktop if needed
- Configure Git line endings for Docker compatibility
- Build and start all Docker containers (PostgreSQL, TimescaleDB, Backend, Frontend, Airflow)
- Initialize databases with required schemas
- Set up monitoring services
- Configure host metrics collection

**Host Metrics Setup (Optional but Recommended):**

```batch
# Run in administrator command prompt
setup-host-metrics.bat
```

This will:
- Auto-detect and install Python 3.11+ if needed
- Install required Python packages (psutil, requests, etc.)
- Create VBScript wrappers for background execution
- Configure Windows scheduled tasks to run at startup
- Set proper permissions for SYSTEM account
- Start metrics collection immediately

#### Linux Automated Deployment

**Prerequisites:**
- sudo access
- Internet connection

**Installation Steps:**

```bash
# 1. Clone repository
git clone https://github.com/your-org/greenmatrix.git
cd greenmatrix

# 2. Make scripts executable
chmod +x setup-greenmatrix.sh
chmod +x setup-host-metrics.sh

# 3. Run automated setup
./setup-greenmatrix.sh
```

The script will automatically:
- Install Docker and Docker Compose if needed
- Fix shell script line endings
- Build and start all containers
- Initialize databases
- Configure Airflow monitoring

**Host Metrics Setup:**

```bash
# Run with sudo
sudo ./setup-host-metrics.sh
```

This will:
- Install Python dependencies
- Create systemd services for metrics collection
- Configure proper permissions
- Start metrics collection services

#### Post-Installation Verification

After running the automated setup scripts:

```bash
# Check Docker containers
docker-compose ps

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Airflow: http://localhost:8080

# Verify host metrics collection
# Windows: tasklist /fi "imagename eq python.exe"
# Linux: systemctl status greenmatrix-host-metrics
```

#### Troubleshooting Automated Setup

**Windows Issues:**

- **Docker not starting:** Enable Hyper-V and WSL2 in Windows Features
- **Permission errors:** Run Command Prompt as Administrator
- **Python not found:** Script will auto-install via winget (Windows 10 1809+)
- **Service Error 1053:** Check Windows Event Viewer for details

**Linux Issues:**

- **Docker permission denied:** Logout and login after installation
- **Port conflicts:** Stop services using ports 3000, 8000, 5432, 5433
- **systemd service fails:** Check logs with `journalctl -u greenmatrix-host-metrics -f`

---

## Prerequisites Installation (Manual Method)

### System Updates and Basic Tools

#### System Package Updates
Begin installation by updating the system package repository and installing essential tools:

```bash
# Update package repository
sudo apt update

# Upgrade existing packages
sudo apt upgrade -y

# Install essential development and networking tools
sudo apt install -y curl wget git unzip software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release build-essential
```

#### Development Tools Installation
Install compilation tools and development libraries:

```bash
# Install build tools
sudo apt install -y gcc g++ make cmake

# Install development libraries
sudo apt install -y libssl-dev libffi-dev libbz2-dev libreadline-dev \
    libsqlite3-dev libncurses5-dev libncursesw5-dev xz-utils tk-dev
```

### Python Environment Setup

#### Python Installation and Configuration
Install Python 3.9 or later with development packages:

```bash
# Install Python 3 and related packages
sudo apt install -y python3 python3-pip python3-venv python3-dev

# Verify Python installation
python3 --version
pip3 --version

# Install Python build dependencies
sudo apt install -y python3-setuptools python3-wheel
```

#### Virtual Environment Creation
Create isolated Python environment for GreenMatrix:

```bash
# Create application directory
sudo mkdir -p /opt/greenmatrix
sudo chown $USER:$USER /opt/greenmatrix
cd /opt/greenmatrix

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip and install basic packages
pip install --upgrade pip setuptools wheel
```

### Node.js and NPM Installation

#### Node.js Repository Configuration
Add official Node.js repository and install Node.js 16.x or later:

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

#### NPM Configuration and Global Packages
Configure npm and install required global packages:

```bash
# Configure npm for better performance
npm config set registry https://registry.npmjs.org/
npm config set progress false

# Install global packages for development
sudo npm install -g pm2 forever nodemon
```

### Docker Installation (Optional)

#### Docker Engine Installation
Install Docker Engine for containerized deployment option:

```bash
# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index and install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Add current user to docker group
sudo usermod -aG docker $USER

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

#### Docker Compose Installation
Install Docker Compose for multi-container orchestration:

```bash
# Download Docker Compose binary
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

---

## Database Configuration

### PostgreSQL Installation and Setup

#### PostgreSQL Installation
Install PostgreSQL 14 or later with required extensions:

```bash
# Install PostgreSQL and contrib packages
sudo apt install -y postgresql postgresql-contrib postgresql-client

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify service status
sudo systemctl status postgresql
```

#### Database User and Schema Creation
Configure PostgreSQL with required databases and user accounts:

```bash
# Switch to PostgreSQL user
sudo -u postgres psql

# Execute the following commands in PostgreSQL shell:
```

```sql
-- Create databases
CREATE DATABASE greenmatrix;           -- Main application database
CREATE DATABASE greenmatrix_timescale; -- TimescaleDB for all metrics
CREATE DATABASE airflow;                -- Airflow metadata database

-- Create application user
CREATE USER greenmatrix WITH PASSWORD 'secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE greenmatrix TO greenmatrix;
GRANT ALL PRIVILEGES ON DATABASE greenmatrix_timescale TO greenmatrix;
GRANT ALL PRIVILEGES ON DATABASE airflow TO greenmatrix;

-- Grant additional permissions
ALTER USER greenmatrix CREATEDB;
ALTER USER greenmatrix WITH SUPERUSER; -- Required for TimescaleDB extension

-- Exit PostgreSQL shell
\q
```

#### PostgreSQL Configuration Optimization
Optimize PostgreSQL configuration for better performance:

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Add or modify the following configuration parameters:

```ini
# Memory configuration
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection configuration
max_connections = 100

# Performance optimization
checkpoint_completion_target = 0.7
wal_buffers = 16MB
default_statistics_target = 100

# Logging configuration
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_min_messages = warning
log_min_error_statement = error
```

Restart PostgreSQL to apply configuration changes:

```bash
sudo systemctl restart postgresql
```

### TimescaleDB Installation (Recommended)

#### TimescaleDB Repository Setup
Add TimescaleDB repository for time-series database capabilities:

```bash
# Add TimescaleDB repository
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | sudo apt-key add -
echo "deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $(lsb_release -c -s) main" | sudo tee /etc/apt/sources.list.d/timescaledb.list

# Update package index
sudo apt update
```

#### TimescaleDB Installation and Configuration
Install TimescaleDB extension for PostgreSQL:

```bash
# Install TimescaleDB
sudo apt install -y timescaledb-2-postgresql-14

# Run TimescaleDB configuration tuning
sudo timescaledb-tune --quiet --yes

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### TimescaleDB Extension Activation
Enable TimescaleDB extension in the time-series database:

```bash
# Connect to greenmatrix_timescale database
sudo -u postgres psql -d greenmatrix_timescale
```

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Verify extension installation
SELECT * FROM pg_extension WHERE extname = 'timescaledb';

-- Create hypertables for time-series data (automated by application)
-- The application will automatically convert these tables to hypertables:
-- - host_process_metrics
-- - host_overall_metrics
-- - vm_process_metrics
-- - hardware_specs

-- Exit
\q
```

**Note:** The automated setup scripts handle TimescaleDB configuration automatically. Manual setup is only required for custom deployments.

---

## Backend Service Deployment

### Application Code Deployment

#### Source Code Setup
Deploy GreenMatrix backend application code:

```bash
# Navigate to application directory
cd /opt/greenmatrix

# Activate virtual environment
source venv/bin/activate

# Clone or copy application source code
# Note: Replace with actual repository URL or copy local files
# git clone https://github.com/your-org/greenmatrix.git .
# OR
# Copy source files to /opt/greenmatrix/

# Install Python dependencies
pip install -r requirements.txt
```

#### Python Dependencies Installation
Install required Python packages for backend services:

```bash
# Install core dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv
pip install pandas numpy psutil python-multipart requests
pip install passlib bcrypt python-jose cryptography

# Install TimescaleDB support
pip install timescaledb

# Install machine learning libraries (optional)
pip install scikit-learn torch transformers

# Freeze dependencies for reproducibility
pip freeze > requirements.txt
```

### Environment Configuration

#### Environment Variables Setup
Create environment configuration file:

```bash
# Create .env file
nano /opt/greenmatrix/.env
```

Configure environment variables:

```ini
# Database Configuration
MODEL_DB_URL=postgresql://greenmatrix:secure_password_here@localhost:5432/Model_Recommendation_DB
METRICS_DB_URL=postgresql://greenmatrix:secure_password_here@localhost:5432/Metrics_db
TIMESCALEDB_URL=postgresql://greenmatrix:secure_password_here@localhost:5432/vm_metrics_ts

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=false
LOG_LEVEL=INFO

# Security Configuration
SECRET_KEY=your_secret_key_change_this_in_production
ALLOWED_HOSTS=localhost,127.0.0.1,your_server_ip
CORS_ORIGINS=http://localhost:3000,https://your_domain.com

# Application Configuration
MODEL_PATH=/opt/greenmatrix/models
DATA_RETENTION_DAYS=30
COLLECTION_INTERVAL_SECONDS=2

# Feature Flags
ENABLE_GPU=false
ENABLE_VM_MONITORING=true
ENABLE_COST_ANALYSIS=true
ENABLE_RECOMMENDATIONS=true
```

#### Database Schema Initialization
Initialize database tables and schema:

```bash
# Navigate to application directory
cd /opt/greenmatrix

# Activate virtual environment
source venv/bin/activate

# Initialize database schema
python -c "from backend.app.database import init_db; init_db()"
```

### Service Configuration

#### Systemd Service Creation
Create systemd service for backend application:

```bash
# Create service file
sudo nano /etc/systemd/system/greenmatrix-backend.service
```

Configure service definition:

```ini
[Unit]
Description=GreenMatrix Backend API Service
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=greenmatrix
Group=greenmatrix
WorkingDirectory=/opt/greenmatrix
Environment=PATH=/opt/greenmatrix/venv/bin
ExecStart=/opt/greenmatrix/venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

#### Service User Creation
Create dedicated service user for security:

```bash
# Create service user
sudo useradd --system --home /opt/greenmatrix --shell /bin/false greenmatrix

# Set ownership
sudo chown -R greenmatrix:greenmatrix /opt/greenmatrix

# Set permissions
sudo chmod 750 /opt/greenmatrix
sudo chmod 640 /opt/greenmatrix/.env
```

#### Service Activation
Enable and start backend service:

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable greenmatrix-backend

# Start service
sudo systemctl start greenmatrix-backend

# Check service status
sudo systemctl status greenmatrix-backend
```

---

## Frontend Application Setup

### Frontend Dependencies Installation

#### Node.js Dependencies
Install frontend application dependencies:

```bash
# Navigate to frontend directory
cd /opt/greenmatrix/frontend

# Install npm dependencies
npm install

# Install additional production dependencies
npm install --production
```

#### Build Configuration
Configure build environment for production:

```bash
# Create environment configuration
nano /opt/greenmatrix/frontend/.env
```

Configure frontend environment variables:

```ini
# API Configuration
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_TIMEOUT=10000

# Application Configuration
REACT_APP_APP_NAME=GreenMatrix
REACT_APP_VERSION=1.0.0
REACT_APP_POLLING_INTERVAL=2000

# Feature Configuration
REACT_APP_ENABLE_VM_MONITORING=true
REACT_APP_ENABLE_COST_ANALYSIS=true
REACT_APP_ENABLE_DEBUG=false

# Performance Configuration
REACT_APP_CHART_MAX_POINTS=100
REACT_APP_CACHE_TIMEOUT=300000
```

#### Production Build
Build frontend application for production deployment:

```bash
# Build production assets
npm run build

# Verify build output
ls -la build/

# Set appropriate permissions
sudo chown -R www-data:www-data build/
```

### Web Server Configuration

#### Nginx Installation and Setup
Install and configure Nginx web server:

```bash
# Install Nginx
sudo apt install -y nginx

# Remove default configuration
sudo rm /etc/nginx/sites-enabled/default

# Create GreenMatrix site configuration
sudo nano /etc/nginx/sites-available/greenmatrix
```

Configure Nginx virtual host:

```nginx
server {
    listen 80;
    server_name localhost your_domain.com;
    
    # Frontend static files
    location / {
        root /opt/greenmatrix/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout configuration
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer configuration
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # WebSocket support for real-time updates
    location /ws/ {
        proxy_pass http://localhost:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

#### SSL Configuration (Recommended)
Configure SSL certificate for secure connections:

```bash
# Install Certbot for Let's Encrypt certificates
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your_domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

#### Nginx Service Management
Enable and configure Nginx service:

```bash
# Enable site configuration
sudo ln -s /etc/nginx/sites-available/greenmatrix /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx configuration
sudo systemctl reload nginx

# Enable Nginx service
sudo systemctl enable nginx

# Start Nginx service
sudo systemctl start nginx
```

---

## Host Monitoring Configuration

### Overview

GreenMatrix collects host-level metrics using platform-specific monitoring agents. The setup process differs between Windows and Linux systems.

### Windows Host Monitoring Setup

#### Automated Setup (Recommended)

Use the automated setup script for Windows:

```batch
# Run as Administrator
setup-host-metrics.bat
```

The script automatically:
1. Detects or installs Python 3.11+
2. Installs required packages (psutil, requests, WMI)
3. Creates `C:\ProgramData\GreenMatrix` directory
4. Grants SYSTEM account permissions
5. Copies monitoring scripts
6. Creates VBScript wrappers for background execution
7. Configures Windows Scheduled Tasks
8. Starts metrics collection immediately

#### Manual Windows Setup

If manual setup is required:

```batch
# 1. Install Python 3.11+ from python.org or via winget
winget install -e --id Python.Python.3.11

# 2. Install required packages
pip install psutil requests python-dateutil py-cpuinfo WMI

# 3. Create installation directory
mkdir C:\ProgramData\GreenMatrix

# 4. Grant SYSTEM account permissions
icacls "C:\ProgramData\GreenMatrix" /grant "SYSTEM:(OI)(CI)F" /T

# 5. Copy monitoring scripts
copy collect_all_metrics.py C:\ProgramData\GreenMatrix\
copy collect_hardware_specs.py C:\ProgramData\GreenMatrix\
copy config.ini C:\ProgramData\GreenMatrix\

# 6. Create VBScript wrapper for invisible execution
echo Set objShell = CreateObject("WScript.Shell") > C:\ProgramData\GreenMatrix\run_metrics.vbs
echo objShell.Run """C:\Python311\python.exe"" ""C:\ProgramData\GreenMatrix\collect_all_metrics.py""", 0, False >> C:\ProgramData\GreenMatrix\run_metrics.vbs

# 7. Create scheduled task
schtasks /create /tn "GreenMatrix-Host-Metrics" /tr "wscript.exe C:\ProgramData\GreenMatrix\run_metrics.vbs" /sc onstart /ru SYSTEM /rl HIGHEST /f

# 8. Start task immediately
wscript.exe C:\ProgramData\GreenMatrix\run_metrics.vbs
```

#### Windows Configuration File

Edit `C:\ProgramData\GreenMatrix\config.ini`:

```ini
[backend]
backend_api_url = http://localhost:8000

[collection]
interval_seconds = 1
batch_size = 100

[logging]
log_level = INFO
log_file = C:\ProgramData\GreenMatrix\metrics.log
```

#### Windows Troubleshooting

**Common Issues:**

1. **Service Error 1053 (Timeout):**
   - Run script manually to check for errors: `python C:\ProgramData\GreenMatrix\collect_all_metrics.py`
   - Check for missing Python packages
   - Verify backend API is accessible

2. **Permission Denied Errors:**
   - Run Command Prompt as Administrator
   - Grant SYSTEM account permissions: `icacls "C:\ProgramData\GreenMatrix" /grant "SYSTEM:(OI)(CI)F" /T`

3. **Python Not Found:**
   - Ensure Python is in PATH or use full path in VBScript
   - Use `py -c "import sys; print(sys.executable)"` to find Python path

4. **Task Not Running:**
   - Check task status: `schtasks /query /tn "GreenMatrix-Host-Metrics" /v`
   - View task history in Task Scheduler (taskschd.msc)
   - Manually run: `wscript.exe C:\ProgramData\GreenMatrix\run_metrics.vbs`

### Linux Host Monitoring Setup

#### Automated Setup (Recommended)

Use the automated setup script for Linux:

```bash
# Run with sudo
sudo ./setup-host-metrics.sh
```

#### Manual Linux Setup

Configure host-level process monitoring:

```bash
# Create monitoring agent directory
sudo mkdir -p /opt/greenmatrix/agents

# Copy monitoring agent script
sudo cp /opt/greenmatrix/collect_all_metrics.py /opt/greenmatrix/agents/host_monitor.py

# Set permissions
sudo chown greenmatrix:greenmatrix /opt/greenmatrix/agents/host_monitor.py
sudo chmod 750 /opt/greenmatrix/agents/host_monitor.py
```

#### Monitoring Agent Configuration
Configure monitoring agent parameters:

```bash
# Create agent configuration file
sudo nano /opt/greenmatrix/agents/host_monitor.conf
```

```ini
[monitoring]
# Collection interval in seconds
collection_interval = 2

# Backend API endpoint
api_endpoint = http://localhost:8000/api/v1/metrics/host-snapshot

# Authentication
api_key = your_api_key_here

# Data retention
buffer_size = 1000
batch_size = 100

# Performance settings
enable_gpu_monitoring = false
enable_detailed_io = true
enable_network_stats = true

[logging]
log_level = INFO
log_file = /var/log/greenmatrix/host_monitor.log
max_log_size = 10MB
backup_count = 5
```

#### Systemd Service for Host Monitoring
Create systemd service for host monitoring agent:

```bash
# Create service file
sudo nano /etc/systemd/system/greenmatrix-host-monitor.service
```

```ini
[Unit]
Description=GreenMatrix Host Monitoring Agent
After=network.target greenmatrix-backend.service
Wants=greenmatrix-backend.service

[Service]
Type=simple
User=greenmatrix
Group=greenmatrix
WorkingDirectory=/opt/greenmatrix/agents
Environment=PATH=/opt/greenmatrix/venv/bin
ExecStart=/opt/greenmatrix/venv/bin/python host_monitor.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/greenmatrix

[Install]
WantedBy=multi-user.target
```

#### Hardware Specification Collection
Configure hardware specification collection service:

```bash
# Copy hardware collection script
sudo cp /opt/greenmatrix/collect_hardware_specs.py /opt/greenmatrix/agents/hardware_collector.py

# Create one-time service for hardware collection
sudo nano /etc/systemd/system/greenmatrix-hardware-collector.service
```

```ini
[Unit]
Description=GreenMatrix Hardware Specifications Collector
After=network.target greenmatrix-backend.service
Wants=greenmatrix-backend.service

[Service]
Type=oneshot
User=greenmatrix
Group=greenmatrix
WorkingDirectory=/opt/greenmatrix/agents
Environment=PATH=/opt/greenmatrix/venv/bin
ExecStart=/opt/greenmatrix/venv/bin/python hardware_collector.py

[Install]
WantedBy=multi-user.target
```

#### Service Activation and Management
Enable and start monitoring services:

```bash
# Create log directory
sudo mkdir -p /var/log/greenmatrix
sudo chown greenmatrix:greenmatrix /var/log/greenmatrix

# Reload systemd
sudo systemctl daemon-reload

# Enable and start host monitoring
sudo systemctl enable greenmatrix-host-monitor
sudo systemctl start greenmatrix-host-monitor

# Run hardware collection
sudo systemctl start greenmatrix-hardware-collector

# Verify service status
sudo systemctl status greenmatrix-host-monitor
sudo systemctl status greenmatrix-hardware-collector
```

---

## Virtual Machine Monitoring Setup

### Overview

GreenMatrix supports monitoring of virtual machines, containers, and cloud instances using a lightweight Python agent (`simple_vm_agent.py`). The agent runs **inside each VM/container** to collect process-level metrics and send them to the GreenMatrix backend.

**📦 Quick Start Package:** All VM monitoring files are organized in the **`vm-agent/`** folder in the root directory.

**To deploy VM monitoring:**
1. Copy the `vm-agent/` folder to your VM
2. Run the installer (`deploy-vm-agent.bat` for Windows, `deploy-vm-agent.sh` for Linux)
3. Done! Monitoring is active in 3-7 minutes

**📖 For complete installation instructions, see: [`vm-agent/README.md`](../vm-agent/README.md)**

**Key Features:**
- ✅ Process-level monitoring (CPU, RAM, GPU, I/O per process)
- ✅ VM-level metrics (total resource usage and availability)
- ✅ Cross-platform support (Windows and Linux VMs)
- ✅ GPU monitoring (NVIDIA via pynvml/nvidia-smi, AMD via rocm-smi)
- ✅ Lightweight (<5% CPU, <50MB RAM overhead)
- ✅ Automatic recovery and reconnection on failures
- ✅ Automated deployment with Python auto-install
- ✅ Auto-detects backend URL (no manual configuration)

### VM Agent Architecture

The VM monitoring agent (`simple_vm_agent.py`) is a standalone Python script that:
- **Runs inside each VM/container** (not on the hypervisor/host)
- Collects metrics from all processes in the VM
- Sends JSON payloads to backend API: `POST /api/v1/metrics/vm-snapshot`
- Uses configuration-based setup (no hardcoded values)
- Runs as a system service (systemd on Linux, Scheduled Task on Windows)

**Data Flow:**
```
VM Agent → GreenMatrix Backend API → TimescaleDB → Dashboard
```

### Critical Network Requirement

**⚠️ IMPORTANT:** VMs **cannot** use `http://localhost:8000` - they must use the **host machine's IP address**.

The deployment scripts automatically detect the correct IP (default gateway), but you should understand:
- VMs on same host → Use host's network IP (e.g., `10.25.41.86:8000`)
- LXD containers → Use LXD bridge IP (e.g., `10.0.3.1:8000`)
- Remote VMs → Use GreenMatrix server's public IP

**📖 For detailed network architecture and scenarios, see:** [`vm-agent/README.md` - Network Configuration section](../vm-agent/README.md#network-configuration)

### Deployment Steps

**📖 For complete installation instructions, see:** [**`vm-agent/README.md`**](../vm-agent/README.md)

**Quick summary:**
1. Copy the `vm-agent/` folder to your VM
2. Run the installer:
   - **Windows:** `deploy-vm-agent.bat` (as Administrator)
   - **Linux:** `sudo bash deploy-vm-agent.sh`
3. Verify installation (agent starts automatically)

**What the automated installer does:**
- Auto-installs Python if missing (requires internet; see Prerequisites)
- Installs dependencies (`psutil`, `requests`, `pynvml`)
- Auto-detects host IP via default gateway
- Creates configuration file
- Sets up automatic startup (Windows Task / Linux systemd)
- Tests connectivity

### Configuration

**Default config file locations:**
- **Windows:** `C:\GreenMatrix-VM-Agent\vm_agent.ini`
- **Linux:** `/opt/greenmatrix-vm-agent/vm_agent.ini`

**Common configuration tasks:**
- **Change collection interval:** Edit `interval_seconds` in config
- **Change backend URL:** Edit `backend_url` in config (use host IP, not localhost)
- **Enable/disable GPU monitoring:** Edit `collect_gpu_metrics` in config

**📖 For detailed configuration options and examples, see:** [**`vm-agent/README.md`**](../vm-agent/README.md#-configuration-options)

### Management Commands

**Windows:**
```batch
schtasks /query /tn "GreenMatrix VM Agent"  # Check status
type C:\GreenMatrix-VM-Agent\greenmatrix-vm-agent.log  # View logs
```

**Linux:**
```bash
sudo systemctl status greenmatrix-vm-agent  # Check status
sudo journalctl -u greenmatrix-vm-agent -f  # View logs
```

**📖 For complete management commands, see:** [**`vm-agent/README.md`**](../vm-agent/README.md#-managing-the-agent)

### Verification

1. Check agent logs for successful startup
2. Test backend connectivity: `curl http://<HOST_IP>:8000/health`
3. Verify metrics in GreenMatrix Dashboard → VM Instances section

**📖 For detailed verification steps, see:** [**`vm-agent/README.md`**](../vm-agent/README.md#-verification)

### Troubleshooting

**Common issues:**
- **Connection Refused:** Check backend URL in config, verify firewall allows port 8000
- **Agent Not Starting:** Check Python installation, review agent logs
- **GPU Metrics Missing:** Verify GPU drivers installed, check `collect_gpu_metrics = true` in config

**📖 For complete troubleshooting guide with solutions, see:** [**`vm-agent/README.md`**](../vm-agent/README.md#-troubleshooting)

### Bulk Deployment

For deploying to multiple VMs at scale, use automation tools:
- **VMware vSphere:** PowerCLI
- **Hyper-V:** PowerShell Direct
- **Cloud (AWS/Azure/GCP):** cloud-init, Ansible, Terraform

**📖 For bulk deployment examples and scripts, see:** [**`vm-agent/README.md`**](../vm-agent/README.md#-bulk-deployment)

---

## Docker-based Deployment

### Docker Compose Configuration

#### Docker Compose File Creation
Create comprehensive Docker Compose configuration:

```bash
# Create Docker Compose file
nano /opt/greenmatrix/docker-compose.yml
```

```yaml
version: '3.8'

services:
  # Database services
  postgres:
    image: timescale/timescaledb:latest-pg14
    container_name: greenmatrix-postgres
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: greenmatrix
      POSTGRES_PASSWORD: secure_password_change_this
      TIMESCALEDB_TELEMETRY: off
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    networks:
      - greenmatrix-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U greenmatrix"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis cache service
  redis:
    image: redis:7-alpine
    container_name: greenmatrix-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - greenmatrix-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backend API service
  backend:
    build: 
      context: .
      dockerfile: Dockerfile.backend
    container_name: greenmatrix-backend
    environment:
      MODEL_DB_URL: postgresql://greenmatrix:secure_password_change_this@postgres:5432/Model_Recommendation_DB
      METRICS_DB_URL: postgresql://greenmatrix:secure_password_change_this@postgres:5432/Metrics_db
      TIMESCALEDB_URL: postgresql://greenmatrix:secure_password_change_this@postgres:5432/vm_metrics_ts
      REDIS_URL: redis://redis:6379/0
      API_HOST: 0.0.0.0
      API_PORT: 8000
      DEBUG: "false"
      LOG_LEVEL: INFO
      SECRET_KEY: change_this_secret_key_in_production
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
      - ./models:/app/models
    networks:
      - greenmatrix-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: greenmatrix-frontend
    environment:
      REACT_APP_API_URL: http://localhost:8000
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - greenmatrix-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    container_name: greenmatrix-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - frontend
      - backend
    networks:
      - greenmatrix-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Host monitoring agent
  host-monitor:
    build:
      context: .
      dockerfile: Dockerfile.agent
    container_name: greenmatrix-host-monitor
    environment:
      BACKEND_URL: http://backend:8000
      COLLECTION_INTERVAL: 2
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /dev:/host/dev:ro
    network_mode: host
    privileged: true
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  greenmatrix-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

#### Database Initialization Scripts
Create database initialization scripts:

```bash
# Create init scripts directory
mkdir -p /opt/greenmatrix/init-scripts

# Create database initialization script
nano /opt/greenmatrix/init-scripts/01-init-databases.sql
```

```sql
-- Create databases
CREATE DATABASE "Model_Recommendation_DB";
CREATE DATABASE "Metrics_db";
CREATE DATABASE "vm_metrics_ts";

-- Connect to vm_metrics_ts and enable TimescaleDB
\c vm_metrics_ts;
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
```

#### Docker Build Configuration
Create Dockerfiles for custom images:

```bash
# Backend Dockerfile
nano /opt/greenmatrix/Dockerfile.backend
```

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./backend/
COPY config.ini .
COPY models/ ./models/

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start application
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

```bash
# Agent Dockerfile
nano /opt/greenmatrix/Dockerfile.agent
```

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir psutil requests python-dateutil

# Copy monitoring agent
COPY collect_all_metrics.py host_monitor.py

# Start monitoring agent
CMD ["python", "host_monitor.py"]
```

### Docker Deployment Execution

#### Environment Preparation
Prepare environment for Docker deployment:

```bash
# Create necessary directories
mkdir -p /opt/greenmatrix/{logs,models,nginx/ssl}

# Create nginx configuration
nano /opt/greenmatrix/nginx/nginx.conf
```

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name localhost;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

#### Deployment Execution
Deploy GreenMatrix using Docker Compose:

```bash
# Navigate to project directory
cd /opt/greenmatrix

# Build and start services
docker-compose up -d --build

# View deployment status
docker-compose ps

# View service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Scale backend services if needed
docker-compose up -d --scale backend=3
```

#### Docker Management Commands
Common Docker management commands:

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (data loss!)
docker-compose down -v

# Update and restart services
docker-compose pull
docker-compose up -d --force-recreate

# View resource usage
docker stats

# Access container shell
docker exec -it greenmatrix-backend bash

# View container logs
docker logs greenmatrix-backend -f
```

---

## System Verification and Testing

### Component Testing

#### Database Connectivity Testing
Verify database connections and schema:

```bash
# Test PostgreSQL connectivity
psql -h localhost -U greenmatrix -d Model_Recommendation_DB -c "SELECT version();"
psql -h localhost -U greenmatrix -d Metrics_db -c "SELECT version();"
psql -h localhost -U greenmatrix -d vm_metrics_ts -c "SELECT version();"

# Test TimescaleDB extension
psql -h localhost -U greenmatrix -d vm_metrics_ts -c "SELECT * FROM pg_extension WHERE extname = 'timescaledb';"

# Verify table creation
psql -h localhost -U greenmatrix -d Metrics_db -c "\dt"
```

#### Backend Service Testing
Test backend API endpoints:

```bash
# Test health endpoint
curl -X GET http://localhost:8000/api/health

# Test host metrics endpoint
curl -X GET http://localhost:8000/api/v1/metrics/host-processes

# Test VM metrics endpoint
curl -X GET http://localhost:8000/api/v1/metrics/vm-metrics

# Test hardware specifications endpoint
curl -X GET http://localhost:8000/api/hardware/specs

# Test recommendations endpoint
curl -X GET http://localhost:8000/api/recommendations/host-processes
```

#### Frontend Application Testing
Verify frontend application functionality:

```bash
# Test frontend availability
curl -I http://localhost/

# Test API proxy functionality
curl http://localhost/api/health

# Check static asset serving
curl -I http://localhost/static/css/main.css 2>/dev/null || echo "CSS assets loading"
curl -I http://localhost/static/js/main.js 2>/dev/null || echo "JS assets loading"
```

### Monitoring Agent Testing

#### Host Monitoring Agent Verification
Verify host monitoring agent operation:

```bash
# Check host monitor service status
sudo systemctl status greenmatrix-host-monitor

# View host monitor logs
sudo journalctl -u greenmatrix-host-monitor -f

# Test manual execution
cd /opt/greenmatrix/agents
sudo -u greenmatrix /opt/greenmatrix/venv/bin/python host_monitor.py --test

# Verify data collection in database
psql -h localhost -U greenmatrix -d Metrics_db -c "SELECT COUNT(*) FROM host_process_metrics WHERE timestamp > NOW() - INTERVAL '1 hour';"
```

#### VM Monitoring Agent Verification
Test VM monitoring functionality:

```bash
# Check VM instances status
lxc list

# Test VM agent status in each instance
for i in {1..3}; do
    echo "=== Testing vm-instance-$i ==="
    lxc exec vm-instance-$i -- systemctl status vm-agent
    lxc exec vm-instance-$i -- python3 /root/simple_vm_agent.py --test 2>/dev/null || echo "Agent test completed"
done

# Verify VM data in TimescaleDB
psql -h localhost -U greenmatrix -d vm_metrics_ts -c "SELECT vm_name, COUNT(*) FROM vm_process_metrics WHERE timestamp > NOW() - INTERVAL '1 hour' GROUP BY vm_name;"
```

### Performance Testing

#### System Load Testing
Test system performance under load:

```bash
# Install testing tools
sudo apt install -y apache2-utils wrk

# Test API endpoint performance
ab -n 1000 -c 10 http://localhost:8000/api/health

# Test concurrent requests
wrk -t12 -c400 -d30s http://localhost:8000/api/v1/metrics/host-processes

# Monitor system resources during testing
htop
iotop
```

#### Database Performance Testing
Verify database performance:

```bash
# Test database connection pool
psql -h localhost -U greenmatrix -d Metrics_db -c "SELECT * FROM pg_stat_activity;"

# Test query performance
psql -h localhost -U greenmatrix -d Metrics_db -c "EXPLAIN ANALYZE SELECT * FROM host_process_metrics WHERE timestamp > NOW() - INTERVAL '1 hour';"

# Check database size and statistics
psql -h localhost -U greenmatrix -d Metrics_db -c "SELECT pg_size_pretty(pg_database_size('Metrics_db'));"
```

### Integration Testing

#### End-to-End Testing
Perform comprehensive system testing:

```bash
# Create test script
nano /opt/greenmatrix/test_integration.sh
```

```bash
#!/bin/bash
set -e

echo "Starting GreenMatrix integration tests..."

# Test database connectivity
echo "Testing database connectivity..."
psql -h localhost -U greenmatrix -d Model_Recommendation_DB -c "SELECT 1;" > /dev/null
psql -h localhost -U greenmatrix -d Metrics_db -c "SELECT 1;" > /dev/null
psql -h localhost -U greenmatrix -d vm_metrics_ts -c "SELECT 1;" > /dev/null
echo "✓ Database connectivity OK"

# Test backend API
echo "Testing backend API..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health)
if [ "$response" = "200" ]; then
    echo "✓ Backend API OK"
else
    echo "✗ Backend API failed (HTTP $response)"
    exit 1
fi

# Test frontend
echo "Testing frontend..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
if [ "$response" = "200" ]; then
    echo "✓ Frontend OK"
else
    echo "✗ Frontend failed (HTTP $response)"
    exit 1
fi

# Test monitoring agents
echo "Testing monitoring agents..."
if systemctl is-active --quiet greenmatrix-host-monitor; then
    echo "✓ Host monitor OK"
else
    echo "✗ Host monitor not running"
    exit 1
fi

# Test VM instances
echo "Testing VM instances..."
vm_count=$(lxc list -c n --format csv | wc -l)
if [ "$vm_count" -gt 0 ]; then
    echo "✓ VM instances OK ($vm_count instances)"
else
    echo "⚠ No VM instances found"
fi

echo "All integration tests passed!"
```

```bash
# Make test script executable and run
chmod +x /opt/greenmatrix/test_integration.sh
./test_integration.sh
```

---

## Appendices

### Appendix A: Configuration Reference

#### Environment Variables Reference
Complete list of supported environment variables:

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| MODEL_DB_URL | Model database connection string | - | Yes |
| METRICS_DB_URL | Metrics database connection string | - | Yes |
| TIMESCALEDB_URL | TimescaleDB connection string | - | Yes |
| API_HOST | Backend API host binding | 0.0.0.0 | No |
| API_PORT | Backend API port | 8000 | No |
| DEBUG | Enable debug mode | false | No |
| LOG_LEVEL | Logging level | INFO | No |
| SECRET_KEY | Application secret key | - | Yes |
| ALLOWED_HOSTS | Allowed host headers | localhost | No |
| CORS_ORIGINS | CORS allowed origins | - | No |
| DATA_RETENTION_DAYS | Data retention period | 30 | No |
| COLLECTION_INTERVAL | Metrics collection interval | 2 | No |
| ENABLE_GPU | Enable GPU monitoring | false | No |
| ENABLE_VM_MONITORING | Enable VM monitoring | true | No |

### Appendix B: Port Reference

#### Required Network Ports
| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Frontend | 80 | HTTP | Web dashboard access |
| Frontend | 443 | HTTPS | Secure web dashboard |
| Backend API | 8000 | HTTP | REST API services |
| PostgreSQL | 5432 | TCP | Database connection |
| TimescaleDB | 5433 | TCP | Time-series database |
| Redis | 6379 | TCP | Cache and session storage |
| Monitoring | 9090 | HTTP | Agent communication |

### Appendix C: File System Layout

#### Directory Structure
```
/opt/greenmatrix/
├── backend/                # Backend application code
├── frontend/               # Frontend application code
├── agents/                 # Monitoring agents
├── models/                 # ML models and data
├── logs/                   # Application logs
├── config/                 # Configuration files
├── scripts/                # Utility scripts
├── docs/                   # Documentation
├── venv/                   # Python virtual environment
├── .env                    # Environment configuration
├── requirements.txt        # Python dependencies
├── docker-compose.yml      # Docker deployment config
└── README.md              # Project documentation
```

### Appendix D: Troubleshooting Reference

#### Common Issues and Solutions

**Issue: Docker container fails to start (Linux)**
- **Symptom:** Shell script execution error: "cannot execute: required file not found"
- **Cause:** Shell scripts have Windows line endings (CRLF) instead of Unix line endings (LF)
- **Solution:**
  ```bash
  # Fix line endings
  find scripts -name "*.sh" -type f -exec dos2unix {} \;
  # Or use setup script which auto-fixes
  ./setup-greenmatrix.sh

  # Prevent future issues
  git config core.autocrlf input
  ```

**Issue: Windows Service Error 1053 (Service Timeout)**
- **Symptom:** Host metrics service won't start, Error 1053 in Event Viewer
- **Causes:**
  1. Python script crashes immediately (missing packages)
  2. Microsoft Store Python (WindowsApps wrapper) being used
  3. Missing pynvml module on non-NVIDIA systems
- **Solutions:**
  ```batch
  # Test script manually
  python C:\ProgramData\GreenMatrix\collect_all_metrics.py

  # Reinstall with proper Python
  winget install -e --id Python.Python.3.11

  # Re-run setup
  setup-host-metrics.bat
  ```

**Issue: Windows Service Error 1920 (File Access Denied)**
- **Symptom:** Service fails with "file cannot be accessed by the system"
- **Cause:** Using Microsoft Store Python which is an app execution alias
- **Solution:**
  ```batch
  # Find real Python path
  py -c "import sys; print(sys.executable)"

  # Re-run setup which will detect correct Python
  setup-host-metrics.bat
  ```

**Issue: PID File Permission Denied (Windows)**
- **Symptom:** "Permission denied: C:\ProgramData\GreenMatrix\metrics_collector.pid"
- **Cause:** SYSTEM account doesn't have write permissions
- **Solution:**
  ```batch
  # Grant SYSTEM account permissions
  icacls "C:\ProgramData\GreenMatrix" /grant "SYSTEM:(OI)(CI)F" /T

  # Or delete and re-run setup
  rmdir /s /q "C:\ProgramData\GreenMatrix"
  setup-host-metrics.bat
  ```

**Issue: Scheduled Task Shows "Queued" but Never Runs (Windows)**
- **Symptom:** Task status shows "Queued" indefinitely
- **Cause:** Task trigger is "onstart" which only runs at boot, not manually
- **Solution:**
  ```batch
  # Run VBScript wrapper directly
  wscript.exe C:\ProgramData\GreenMatrix\run_metrics.vbs

  # Or reboot system to trigger onstart tasks
  ```

**Issue: Database connection failed**
- Check PostgreSQL service status: `sudo systemctl status postgresql` (Linux) / `sc query postgresql` (Windows)
- Verify connection parameters in `.env` file
- Test manual connection: `psql -h localhost -U greenmatrix -l`
- Check TimescaleDB database: `psql -h localhost -U greenmatrix -d greenmatrix_timescale -c "SELECT version();"`

**Issue: Backend API not responding**
- Check service status: `sudo systemctl status greenmatrix-backend` (Linux)
- Check Docker container: `docker-compose ps backend`
- Review logs: `docker-compose logs backend -f`
- Verify port availability: `netstat -ano | findstr 8000` (Windows) / `sudo netstat -tulpn | grep 8000` (Linux)

**Issue: Frontend not loading**
- Check Nginx/frontend container: `docker-compose ps frontend`
- Verify build files in container: `docker exec greenmatrix-frontend ls -la /usr/share/nginx/html/`
- Test API proxy: `curl http://localhost:3000/api/health`
- Check browser console for CORS errors

**Issue: VM agent not sending data**
- Verify backend URL in agent config
- Test connectivity: `curl http://backend-host:8000/api/health`
- Check agent logs for errors
- Verify Python packages: `pip list | grep psutil`
- Ensure agent runs with root/SYSTEM privileges

**Issue: Dashboard shows no data**
- Verify host metrics collection is running:
  - Windows: `tasklist /fi "imagename eq python.exe"`
  - Linux: `systemctl status greenmatrix-host-metrics`
- Check database for recent data:
  ```sql
  psql -h localhost -U greenmatrix -d greenmatrix_timescale -c "SELECT COUNT(*) FROM host_process_metrics WHERE timestamp > NOW() - INTERVAL '5 minutes';"
  ```
- Verify backend API returns data: `curl http://localhost:8000/api/dashboard/top-processes?limit=5`

**Issue: Hyper-V VM metrics query timeout**
- **Symptom:** Metrics collection hangs on Windows when querying Hyper-V VMs
- **Cause:** PowerShell Get-VM command hangs without Hyper-V permissions
- **Solution:** Already handled in code with 5-second timeout, metrics collection continues without VM data

### Appendix E: Security Best Practices

#### Security Configuration Checklist
- [ ] Change default passwords and API keys
- [ ] Configure SSL certificates for HTTPS
- [ ] Set up firewall rules and access controls
- [ ] Enable database connection encryption
- [ ] Configure secure session management
- [ ] Implement user authentication and authorization
- [ ] Regular security updates and patches
- [ ] Monitor security logs and events
- [ ] Backup encryption and secure storage
- [ ] Network segmentation and access controls

---

**Document Information**

**Document Title:** GreenMatrix Deployment and Installation Guide  
**Version:** 1.0  
**Last Updated:** December 2024  
**Document Owner:** GreenMatrix Engineering Team  
**Classification:** Public Documentation  

**Revision History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Engineering Team | Initial release |

**Copyright Notice**

Copyright © 2024 GreenMatrix Corporation. All rights reserved. This document contains confidential and proprietary information of GreenMatrix Corporation and is protected by copyright and other intellectual property laws.