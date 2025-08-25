# Fix VM Metrics Connection Issues

## The Problem
The error indicates that TimescaleDB (running on port 5433) is not accessible. VM process metrics require this database to function.

## Quick Fix Steps

### Option 1: Use the Troubleshooting Script
```batch
# Run the automated troubleshooting script
troubleshoot-vm-metrics.bat
```

### Option 2: Manual Steps

1. **Start Docker Desktop**
   - Make sure Docker Desktop is installed and running
   - Look for Docker icon in system tray (should be green/running)

2. **Stop and restart all containers**
   ```bash
   cd C:\Users\vabhinav\Desktop\GreenMatrix
   docker-compose down
   docker-compose up -d
   ```

3. **Wait for initialization (important!)**
   ```bash
   # Wait 60-90 seconds for all databases to initialize
   # TimescaleDB takes longer to start than regular PostgreSQL
   ```

4. **Check container status**
   ```bash
   docker-compose ps
   # All containers should show "Up" status
   ```

5. **Check TimescaleDB logs**
   ```bash
   docker-compose logs timescaledb
   # Look for "database system is ready to accept connections"
   ```

6. **Insert demo data**
   ```bash
   python scripts/insert_demo_vm_data.py
   ```

7. **Test the application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8000/docs
   - VM API: http://localhost:8000/api/v1/metrics/vms/active

## Common Issues & Solutions

### Issue 1: Docker Not Running
**Error**: `The system cannot find the file specified`
**Solution**: 
- Install Docker Desktop for Windows
- Start Docker Desktop application
- Wait for it to fully initialize

### Issue 2: Port Already in Use
**Error**: `Port 5433 is already allocated`
**Solution**:
```bash
# Stop any existing containers
docker-compose down
# Or if that doesn't work:
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
# Then restart
docker-compose up -d
```

### Issue 3: TimescaleDB Taking Too Long to Start
**Error**: Connection refused to port 5433
**Solution**:
- Wait longer (up to 2 minutes)
- Check logs: `docker-compose logs timescaledb`
- Look for "ready to accept connections" message

### Issue 4: Database Not Initialized
**Error**: No VM data or empty responses
**Solution**:
```bash
# Re-run the demo data insertion
python scripts/insert_demo_vm_data.py
```

## Verification Commands

```bash
# Check all containers are running
docker-compose ps

# Test database connections
docker exec -it greenmatrix-timescaledb pg_isready -U postgres

# Test API endpoints
curl http://localhost:8000/api/v1/metrics/vms/active
curl http://localhost:8000/health

# Check for demo data
docker exec -it greenmatrix-timescaledb psql -U postgres -d vm_metrics_ts -c "SELECT COUNT(*) FROM vm_process_metrics;"
```

## Expected Results

When working correctly, you should see:
1. **5 containers running**: postgres, timescaledb, backend, frontend, data-collector
2. **VM API returns data**: `{"success": true, "vms": ["production-web-01", ...]}`
3. **Dashboard shows VMs**: VM instances visible with expand/collapse functionality
4. **Real-time updates**: Process metrics update every 1 second when expanded

## If Still Not Working

1. **Check Windows firewall**: Ensure ports 5432, 5433, 8000, 3000 are not blocked
2. **Check antivirus**: Some antivirus software blocks Docker containers
3. **Try different ports**: Edit `docker-compose.yml` if ports are conflicting
4. **Clean restart**: 
   ```bash
   docker-compose down -v  # Removes volumes too
   docker-compose up -d
   # Wait 2 minutes then run the demo data script
   ```

## Alternative: Use PostgreSQL Only

If TimescaleDB continues to have issues, you can temporarily use the regular PostgreSQL database for VM metrics by modifying the backend configuration (though this loses the time-series optimization benefits).