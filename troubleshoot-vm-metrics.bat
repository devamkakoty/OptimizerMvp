@echo off
echo =========================================
echo GreenMatrix VM Metrics Troubleshooting
echo =========================================
echo.

echo Step 1: Checking Docker Status...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running or not installed.
    echo Please:
    echo 1. Install Docker Desktop for Windows if not installed
    echo 2. Start Docker Desktop
    echo 3. Wait for Docker to be ready (green icon in system tray)
    echo 4. Run this script again
    pause
    exit /b 1
)
echo [OK] Docker is running.

echo.
echo Step 2: Checking existing containers...
docker-compose ps

echo.
echo Step 3: Starting/Restarting containers...
echo This may take a few minutes...
docker-compose down
docker-compose up -d

echo.
echo Step 4: Waiting for containers to be ready...
echo Waiting 30 seconds for database initialization...
timeout /t 30 >nul

echo.
echo Step 5: Checking container health...
docker-compose ps

echo.
echo Step 6: Checking TimescaleDB specifically...
docker-compose logs timescaledb --tail=10

echo.
echo Step 7: Testing database connections...
echo Testing PostgreSQL (port 5432)...
docker exec -it greenmatrix-postgres pg_isready -U postgres -h localhost -p 5432

echo Testing TimescaleDB (port 5433)...
docker exec -it greenmatrix-timescaledb pg_isready -U postgres -h localhost -p 5432

echo.
echo Step 8: Inserting demo VM data...
python scripts/insert_demo_vm_data.py

echo.
echo Step 9: Testing API endpoints...
echo Testing VM active endpoint...
curl -s http://localhost:8000/api/v1/metrics/vms/active | head -c 200

echo.
echo =========================================
echo If all steps completed successfully:
echo 1. Open http://localhost:5173 in your browser
echo 2. Navigate to Dashboard -> Dashboard
echo 3. Scroll to "Current VM Instances" section
echo 4. Click on any VM to expand process details
echo =========================================
pause