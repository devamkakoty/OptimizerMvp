# VM Process Metrics Dashboard Demo

## Quick Start

The recharts package has been installed and the VM Process Metrics dashboard is ready to test.

### Option 1: One-click Demo
```bash
./test-vm-dashboard.sh
```

### Option 2: Manual Steps

1. **Start the containers:**
   ```bash
   docker-compose up -d
   ```

2. **Wait for services (60 seconds):**
   ```bash
   # Wait for databases to initialize
   sleep 60
   ```

3. **Add demo VM data:**
   ```bash
   python scripts/insert_demo_vm_data.py
   ```

4. **Start the frontend:**
   ```bash
   cd vite-project
   npm run dev
   ```

5. **Access the dashboard:**
   - Open http://localhost:5173 (or the URL shown by npm)
   - Navigate to **Dashboard** → **Dashboard** (main dashboard page)
   - Scroll down to the "Current VM Instances" section

## Demo Features

### 🔄 Real-time Updates
- **Process metrics**: Refreshed every 1 second
- **VM list**: Refreshed every 10 seconds
- **Visual indicators**: Live status and timestamp updates

### 📊 5 Demo VMs Available

1. **production-web-01** - Web server
   - nginx (high CPU usage)
   - php-fpm (moderate CPU)
   - mysql (high memory usage)

2. **ml-training-gpu-01** - ML training
   - python3 (high CPU + GPU usage)
   - tensorboard (low CPU)
   - jupyter-lab (moderate CPU)

3. **analytics-db-01** - Database server
   - postgres (high memory usage)
   - pgbouncer (low CPU)
   - redis-server (moderate CPU)

4. **dev-environment-01** - Development
   - vscode-server (moderate CPU)
   - node (variable CPU)
   - docker (moderate CPU + memory)

5. **monitoring-01** - Monitoring stack
   - prometheus (high memory usage)
   - grafana-server (low CPU)
   - elasticsearch (very high memory)

### 🎯 What to Test

1. **VM List**: View all active VMs in the "Current VM Instances" section
2. **Expand VM Details**: Click on any VM row to expand and see process details  
3. **Real-time Updates**: Watch VM metrics update every 10 seconds
4. **Process Details**: Expanded VMs show process-level metrics updating every 1 second
5. **Visual Indicators**: CPU progress bars with color coding (green/yellow/red)
6. **Live Status**: See live indicators and timestamps throughout the interface

### 🎨 UI Features

- **Responsive design**: Works on desktop and mobile
- **Dark mode support**: Follows system preferences
- **Interactive charts**: Hover for detailed tooltips
- **Color-coded metrics**: Green/Yellow/Red based on usage levels
- **Real-time status**: Visual indicators for data freshness

## Troubleshooting

### If recharts import fails:
The system will automatically fall back to Chart.js version. If you see any recharts errors, you can manually switch to the Chart.js version by updating `AdminPage.jsx`:

Replace:
```jsx
{activeAdminTab === 'vm-metrics' && (
  <VMProcessMetrics />
)}
```

With:
```jsx
{activeAdminTab === 'vm-metrics' && (
  <VMProcessMetricsChartJS />
)}
```

### If no VMs are showing:
1. Ensure Docker containers are running: `docker-compose ps`
2. Check if demo data was inserted: `python scripts/insert_demo_vm_data.py`
3. Verify TimescaleDB is accessible: `docker-compose logs timescaledb`

### If data isn't updating:
1. Check backend API: http://localhost:8000/docs
2. Test VM endpoint: http://localhost:8000/api/v1/metrics/vms/active
3. Check browser console for JavaScript errors

## Expected Demo Flow

1. **Initial Load**: Dashboard shows "Loading..." spinner
2. **VM Detection**: Dropdown populates with 5 demo VMs
3. **Data Display**: Metrics appear for selected VM
4. **Live Updates**: Numbers and charts update every second
5. **Interaction**: Switch between VMs to see different process patterns

The dashboard demonstrates a realistic VM monitoring scenario with varied workloads and real-time metrics updates, perfect for showcasing the system's capabilities.

## Stop Demo
```bash
# Stop frontend (Ctrl+C in terminal)
# Stop containers
docker-compose down
```