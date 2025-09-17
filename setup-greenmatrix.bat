@echo off
REM GreenMatrix Windows Setup Script
REM This script sets up the complete GreenMatrix application with Airflow monitoring

setlocal enabledelayedexpansion

echo.
echo ================================================
echo GreenMatrix Setup with Airflow Monitoring
echo ================================================
echo.

REM Set color codes for Windows
set "ESC="
set "RED=%ESC%[91m"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "BLUE=%ESC%[94m"
set "NC=%ESC%[0m"

REM Function to print colored output
call :print_status "Checking prerequisites..."

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not installed. Please install Docker Desktop first."
    echo Visit: https://docs.docker.com/desktop/install/windows/
    pause
    exit /b 1
)

REM Check Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        call :print_error "Docker Compose is not available. Please ensure Docker Desktop is properly installed."
        pause
        exit /b 1
    )
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not running. Please start Docker Desktop first."
    pause
    exit /b 1
)

call :print_status "Prerequisites check passed"

REM Setup environment
call :print_step "Setting up environment configuration..."

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        call :print_status "Created .env file from .env.example"
        call :print_warning "Please review and update the .env file with your specific configuration"
    ) else (
        call :print_error ".env.example file not found"
        pause
        exit /b 1
    )
) else (
    call :print_status "Using existing .env file"
)

REM Set appropriate permissions for Airflow
set AIRFLOW_UID=50000
echo AIRFLOW_UID=%AIRFLOW_UID% >> .env

call :print_status "Environment setup completed"

REM Create necessary directories
call :print_step "Creating necessary directories..."

REM Create Airflow directories
if not exist "airflow\logs" mkdir "airflow\logs"
if not exist "airflow\plugins" mkdir "airflow\plugins"
if not exist "airflow\config" mkdir "airflow\config"

REM Create data directories
if not exist "data\postgres" mkdir "data\postgres"
if not exist "data\redis" mkdir "data\redis"
if not exist "logs\backend" mkdir "logs\backend"
if not exist "logs\collector" mkdir "logs\collector"

call :print_status "Directories created"

REM Build and start services
call :print_step "Building and starting GreenMatrix services..."

REM Start core services first
call :print_status "Starting database and core services..."
docker-compose up -d postgres redis

REM Wait for database to be ready
call :print_status "Waiting for database to be ready..."
:wait_db
docker-compose exec -T postgres pg_isready -U postgres >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_db
)

REM Start Airflow database
call :print_status "Starting Airflow database..."
docker-compose up -d airflow-postgres

REM Wait for Airflow database to be ready
call :print_status "Waiting for Airflow database to be ready..."
:wait_airflow_db
docker-compose exec -T airflow-postgres pg_isready -U airflow >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_airflow_db
)

REM Initialize Airflow
call :print_status "Initializing Airflow..."
docker-compose up airflow-init

REM Start all services
call :print_status "Starting all services..."
docker-compose up -d

call :print_status "Services started"

REM Setup databases
call :print_step "Setting up databases..."

REM Wait for db-setup service to complete
call :print_status "Running database setup..."
docker-compose logs -f db-setup

call :print_status "Database setup completed"

REM Setup host metrics collection
call :print_step "Setting up host metrics collection service..."

REM Check if running as administrator (needed for service setup)
net session >nul 2>&1
if errorlevel 1 (
    call :print_warning "Host metrics collection requires administrator access for service setup"
    call :print_status "You can set this up later by running: setup-host-metrics.bat as Administrator"
) else (
    call :setup_host_metrics
)

REM Final verification
call :print_step "Performing final verification..."

REM Wait for services to be ready
timeout /t 60 /nobreak >nul

call :print_status "Docker services status:"
docker-compose ps

echo.
echo ================================================
echo GreenMatrix Setup Complete
echo ================================================
echo.
echo Application URLs:
echo   Frontend Dashboard:    http://localhost:3000
echo   Backend API:          http://localhost:8000
echo   API Documentation:    http://localhost:8000/docs
echo   Airflow UI:           http://localhost:8080
echo.
echo Default Credentials:
echo   Airflow UI:           airflow / airflow
echo.
echo Management Commands:
echo   View logs:            docker-compose logs -f [service]
echo   Stop services:        docker-compose down
echo   Restart services:     docker-compose restart
echo   Update services:      docker-compose pull ^&^& docker-compose up -d
echo.
echo For more information, check the documentation files
echo.
call :print_status "Setup completed successfully!"
echo.
pause
exit /b 0

:setup_host_metrics
REM Install Python dependencies for host metrics collection
call :print_status "Installing Python dependencies for host metrics..."
python -m pip install psutil requests python-dateutil configparser

REM Install NVIDIA monitoring if GPU present
wmic path win32_VideoController get name | findstr /i nvidia >nul 2>&1
if not errorlevel 1 (
    call :print_status "NVIDIA GPU detected, installing pynvml..."
    python -m pip install pynvml
)

REM Create GreenMatrix directory for host services
if not exist "C:\opt\greenmatrix" mkdir "C:\opt\greenmatrix"

REM Copy metrics collection script to system location
copy "collect_all_metrics.py" "C:\opt\greenmatrix\"
copy "config.ini" "C:\opt\greenmatrix\"

REM Update config.ini with correct backend URL
powershell -Command "(Get-Content 'C:\opt\greenmatrix\config.ini') -replace 'backend_api_url = .*', 'backend_api_url = http://localhost:8000' | Set-Content 'C:\opt\greenmatrix\config.ini'"

REM Create Windows service for host metrics collection
sc create "GreenMatrix-Host-Metrics" binPath= "C:\opt\greenmatrix\collect_all_metrics.py" start= auto
sc description "GreenMatrix-Host-Metrics" "GreenMatrix Host Metrics Collection Service"

call :print_status "Host metrics collection service created"
goto :eof

:print_status
echo %GREEN%[INFO]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

:print_step
echo %BLUE%[STEP]%NC% %~1
goto :eof
