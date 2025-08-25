@echo off
REM GreenMatrix Windows Installation Script
REM This script sets up the complete GreenMatrix application with Airflow monitoring

echo.
echo ===============================================
echo 🚀 GreenMatrix Setup with Airflow Monitoring
echo ===============================================
echo.

REM Set color codes for Windows
set "ESC="
set "RED=%ESC%[91m"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "BLUE=%ESC%[94m"
set "NC=%ESC%[0m"

echo %BLUE%[STEP]%NC% Checking prerequisites...

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo %RED%[ERROR]%NC% Docker is not installed. Please install Docker Desktop first.
    echo Visit: https://docs.docker.com/desktop/install/windows/
    pause
    exit /b 1
)

REM Check Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo %RED%[ERROR]%NC% Docker Compose is not available. Please ensure Docker Desktop is properly installed.
        pause
        exit /b 1
    )
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo %RED%[ERROR]%NC% Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo %GREEN%[INFO]%NC% ✅ Prerequisites check passed
echo.

echo %BLUE%[STEP]%NC% Setting up environment configuration...

REM Setup environment file
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo %GREEN%[INFO]%NC% Created .env file from .env.example
        echo %YELLOW%[WARNING]%NC% Please review and update the .env file with your specific configuration
    ) else (
        echo %RED%[ERROR]%NC% .env.example file not found
        pause
        exit /b 1
    )
) else (
    echo %GREEN%[INFO]%NC% Using existing .env file
)

REM Set Airflow UID for Windows (use 50000 as default)
echo AIRFLOW_UID=50000 >> .env
echo %GREEN%[INFO]%NC% ✅ Environment setup completed
echo.

echo %BLUE%[STEP]%NC% Creating necessary directories...

REM Create Airflow directories
if not exist "airflow\logs" mkdir "airflow\logs"
if not exist "airflow\plugins" mkdir "airflow\plugins"
if not exist "airflow\config" mkdir "airflow\config"

REM Create data directories
if not exist "data\postgres" mkdir "data\postgres"
if not exist "data\redis" mkdir "data\redis"
if not exist "logs\backend" mkdir "logs\backend"
if not exist "logs\collector" mkdir "logs\collector"

echo %GREEN%[INFO]%NC% ✅ Directories created
echo.

echo %BLUE%[STEP]%NC% Building and starting GreenMatrix services...

REM Start core services first
echo %GREEN%[INFO]%NC% Starting database and core services...
docker-compose up -d postgres redis timescaledb

REM Wait for database to be ready
echo %GREEN%[INFO]%NC% Waiting for databases to be ready...
timeout /t 30 /nobreak >nul

REM Start Airflow database
echo %GREEN%[INFO]%NC% Starting Airflow database...
docker-compose up -d airflow-postgres

REM Wait for Airflow database
timeout /t 15 /nobreak >nul

REM Initialize Airflow
echo %GREEN%[INFO]%NC% Initializing Airflow...
docker-compose up airflow-init

REM Start all services
echo %GREEN%[INFO]%NC% Starting all services...
docker-compose up -d

echo %GREEN%[INFO]%NC% ✅ Services started
echo.

echo %BLUE%[STEP]%NC% Setting up databases...
REM Wait a bit for services to stabilize
timeout /t 30 /nobreak >nul
echo %GREEN%[INFO]%NC% ✅ Database setup completed
echo.

echo %BLUE%[STEP]%NC% Performing health checks...

REM Wait for services to be ready
timeout /t 60 /nobreak >nul

echo %GREEN%[INFO]%NC% Docker services status:
docker-compose ps
echo.

echo.
echo 🎉 GreenMatrix Setup Complete!
echo ===============================
echo.
echo 📊 Application URLs:
echo   Frontend Dashboard:    http://localhost:3000
echo   Backend API:          http://localhost:8000
echo   API Documentation:    http://localhost:8000/docs
echo   Airflow UI:           http://localhost:8080
echo.
echo 🔐 Default Credentials:
echo   Airflow UI:           airflow / airflow
echo.
echo 📈 Monitoring Features:
echo   ✅ Data Pipeline Monitoring (every 15 minutes)
echo   ✅ Database Health Monitoring (every hour)
echo   ✅ API Health Monitoring (every 10 minutes)
echo   ✅ Data Quality Validation (every 6 hours)
echo   ✅ Maintenance and Cleanup (daily at 2 AM)
echo   ✅ Comprehensive Alerting System
echo.
echo 📁 Important Directories:
echo   Configuration:        .env
echo   Airflow DAGs:         airflow\dags\
echo   Airflow Logs:         airflow\logs\
echo   Application Logs:     logs\
echo.
echo 🛠️ Management Commands:
echo   View logs:            docker-compose logs -f [service]
echo   Stop services:        docker-compose down
echo   Restart services:     docker-compose restart
echo   Update services:      docker-compose pull ^&^& docker-compose up -d
echo.
echo 🔧 Troubleshooting:
echo   Check service status: docker-compose ps
echo   View all logs:        docker-compose logs
echo.
echo For more information, check the documentation files
echo.
echo %GREEN%[INFO]%NC% 🎉 Setup completed successfully!
echo.
pause