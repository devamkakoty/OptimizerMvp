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

REM Fix line endings for shell scripts (critical for Docker containers)
call :print_status "Ensuring shell scripts have correct line endings for Docker..."

REM Use PowerShell to convert CRLF to LF for shell scripts
powershell -Command "$files = Get-ChildItem -Path 'scripts\*.sh' -File; foreach ($file in $files) { try { $content = [System.IO.File]::ReadAllText($file.FullName); $content = $content -replace \"`r`n\", \"`n\"; [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.UTF8Encoding]::new($false)); Write-Host \"Fixed: $($file.Name)\" } catch { Write-Host \"Warning: Could not process $($file.Name)\" } }" 2>nul

if errorlevel 1 (
    call :print_warning "Could not automatically fix line endings. If deployment fails, run: dos2unix scripts/*.sh"
) else (
    call :print_status "Shell script line endings fixed successfully"
)

REM Also configure Git for future operations (optional, won't break if Git not available)
git config core.autocrlf input >nul 2>&1

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
docker-compose up -d postgres timescaledb redis

REM Wait for databases to be ready
call :print_status "Waiting for PostgreSQL to be ready..."
:wait_db
docker-compose exec -T postgres pg_isready -U postgres >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_db
)

call :print_status "Waiting for TimescaleDB to be ready..."
:wait_timescaledb
docker-compose exec -T timescaledb pg_isready -U postgres >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_timescaledb
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

REM Initialize Airflow (commented out due to image compatibility issues - not critical)
REM call :print_status "Initializing Airflow..."
REM docker-compose up airflow-init

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
    REM Call the dedicated setup-host-metrics.bat script
    call :print_status "Running setup-host-metrics.bat..."
    if exist "setup-host-metrics.bat" (
        call setup-host-metrics.bat
        if errorlevel 1 (
            call :print_warning "Host metrics setup encountered issues. You can retry later with: setup-host-metrics.bat"
        ) else (
            call :print_status "✅ Host metrics collection setup completed successfully!"
        )
    ) else (
        call :print_warning "setup-host-metrics.bat not found. Skipping host metrics setup."
    )
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
echo Host Metrics Collection:
echo   If running with admin rights, host metrics collection is automatically set up
echo   Both collect_all_metrics.py and collect_hardware_specs.py services are installed
echo   Manual setup:         Run setup-host-metrics.bat as Administrator
echo   Service management:   sc query "GreenMatrix-Host-Metrics"
echo                        sc query "GreenMatrix-Hardware-Specs"
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
