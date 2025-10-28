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

REM Check if essential files exist
if not exist "docker-compose.yml" (
    call :print_error "docker-compose.yml not found! Are you in the GreenMatrix root directory?"
    pause
    exit /b 1
)

if not exist ".env.example" (
    call :print_error ".env.example not found! Repository may be incomplete."
    echo Try: git fetch --all && git pull
    pause
    exit /b 1
)

REM Check for port conflicts
call :print_status "Checking for port conflicts..."
call :check_port_conflicts

REM Check system resources
call :print_status "Checking system resources..."
call :check_system_resources

call :print_status "All prerequisite checks passed"

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

    REM Check if .env was recently modified (within last 5 minutes)
    powershell -Command "$file = Get-Item '.env'; $modified = (Get-Date) - $file.LastWriteTime; if ($modified.TotalMinutes -lt 5) { exit 0 } else { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        call :print_warning ".env file was recently modified"
        echo Note: If you changed ports, containers will be recreated with new ports
    )
)

REM Set appropriate permissions for Airflow
set AIRFLOW_UID=50000

REM Only add AIRFLOW_UID if not already in .env
findstr /C:"AIRFLOW_UID=" .env >nul 2>&1
if errorlevel 1 (
    echo AIRFLOW_UID=%AIRFLOW_UID% >> .env
)

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

REM Clean up any existing GreenMatrix containers and networks FIRST
call :print_status "Checking for existing GreenMatrix containers and networks..."

REM Stop and remove all GreenMatrix containers
docker ps -a --format "{{.Names}}" | findstr /C:"greenmatrix-" >nul 2>&1
if not errorlevel 1 (
    call :print_warning "Stopping and removing existing GreenMatrix containers..."
    docker-compose down --remove-orphans 2>nul
    timeout /t 2 /nobreak >nul
)

REM Remove networks with all possible name variations
for %%n in (green-matrix_greenmatrix-network greenmatrix_greenmatrix-network greenmatrix-network) do (
    docker network ls --format "{{.Name}}" | findstr /X "%%n" >nul 2>&1
    if not errorlevel 1 (
        call :print_warning "Removing existing network: %%n"
        docker network rm "%%n" 2>nul
    )
)

REM Prune unused networks to ensure clean slate
call :print_status "Pruning unused Docker networks..."
docker network prune -f >nul 2>&1

REM Wait for Docker to fully clean up
timeout /t 2 /nobreak >nul
call :print_status "Cleanup complete, starting fresh deployment"

REM Start core services first with --force-recreate to apply .env changes
call :print_status "Starting database and core services..."
docker-compose up -d --force-recreate postgres timescaledb redis

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
docker-compose up -d --force-recreate airflow-postgres

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

REM Start all services with --force-recreate to apply .env port changes
call :print_status "Starting all services..."
docker-compose up -d --force-recreate

call :print_status "Services started"

REM Setup databases
call :print_step "Setting up databases..."

REM Wait for db-setup service to complete
call :print_status "Running database setup..."
docker-compose logs -f db-setup

call :print_status "Database setup completed"

REM Setup host metrics collection
call :print_step "Setting up host metrics collection service..."

REM Call the dedicated setup-host-metrics.bat script (it will auto-elevate if needed)
if exist "setup-host-metrics.bat" (
    call :print_status "Running setup-host-metrics.bat (will request admin privileges if needed)..."
    call setup-host-metrics.bat
    if errorlevel 1 (
        call :print_warning "Host metrics setup encountered issues. You can retry later with: setup-host-metrics.bat"
    ) else (
        call :print_status "✅ Host metrics collection setup completed successfully!"
    )
) else (
    call :print_warning "setup-host-metrics.bat not found. Skipping host metrics setup."
    call :print_status "You can set this up later by running: setup-host-metrics.bat"
)

REM VM Monitoring Agent Information
call :print_step "VM Monitoring Agent Information"

if exist "vm-agent" (
    echo.
    echo 📡 VM Monitoring Setup Instructions:
    echo    GreenMatrix can monitor VMs and containers running your applications
    echo.
    echo    To monitor a VM/container:
    echo    1. Copy the 'vm-agent' folder to your target VM/container
    echo    2. Run the appropriate deployment script:
    echo       • Windows:  cd vm-agent ^&^& deploy-vm-agent.bat http://YOUR_HOST_IP:8000
    echo       • Linux:    cd vm-agent ^&^& ./deploy-vm-agent.sh http://YOUR_HOST_IP:8000
    echo.
    echo    The agent will automatically:
    echo    - Install required dependencies
    echo    - Configure the backend URL
    echo    - Set up metric collection service
    echo    - Start sending metrics to GreenMatrix
    echo.
    echo    📚 See vm-agent\README.md for detailed instructions
    echo    🚀 See vm-agent\QUICK_START.txt for quick deployment guide
    echo.
    call :print_status "✅ VM monitoring information displayed"
) else (
    call :print_warning "vm-agent folder not found. VM monitoring agents are optional."
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

:check_port_conflicts
REM Check if ports are in use
set "PORTS=3000 5432 5433 6379 8000 8080"
set "PORT_NAMES=Frontend:Dashboard PostgreSQL TimescaleDB Redis Backend:API Airflow:UI"
set CONFLICTS=0

echo Checking ports: %PORTS%

for %%p in (%PORTS%) do (
    netstat -ano | findstr ":%%p " | findstr "LISTENING" >nul 2>&1
    if not errorlevel 1 (
        set CONFLICTS=1
        echo   Port %%p is in use
    )
)

if %CONFLICTS%==1 (
    echo.
    call :print_warning "Some ports are already in use!"
    echo.
    echo Solutions:
    echo   1. Stop Docker containers using these ports (script can do this)
    echo   2. Change ports in .env file:
    echo      FRONTEND_PORT=3000 -^> FRONTEND_PORT=3001
    echo      BACKEND_PORT=8000 -^> BACKEND_PORT=8001
    echo      POSTGRES_PORT=5432 -^> POSTGRES_PORT=5434
    echo      TIMESCALEDB_PORT=5433 -^> TIMESCALEDB_PORT=5435
    echo      REDIS_PORT=6379 -^> REDIS_PORT=6380
    echo      AIRFLOW_WEBSERVER_PORT=8080 -^> AIRFLOW_WEBSERVER_PORT=8081
    echo.

    set /p STOP_CONTAINERS="Stop all Docker containers on these ports? (y/N): "
    if /i "%STOP_CONTAINERS%"=="y" (
        call :print_status "Stopping Docker containers on conflicting ports..."
        for %%p in (%PORTS%) do (
            for /f "tokens=*" %%i in ('docker ps --format "{{.ID}}" --filter "publish=%%p" 2^>nul') do (
                docker stop %%i 2>nul
            )
        )
        timeout /t 2 /nobreak >nul
        call :print_status "Conflicting containers stopped"
    ) else (
        set /p CONTINUE="Continue anyway? (y/N): "
        if /i not "%CONTINUE%"=="y" (
            call :print_error "Installation cancelled"
            pause
            exit /b 1
        )
    )
)
goto :eof

:check_system_resources
REM Check available disk space (in GB)
for /f "tokens=3" %%a in ('dir /-c ^| findstr /C:"bytes free"') do set FREE_BYTES=%%a
set /a FREE_GB=%FREE_BYTES:~0,-9%

if %FREE_GB% LSS 10 (
    call :print_warning "Less than 10GB disk space available (%FREE_GB%GB free)"
    echo GreenMatrix requires at least 10GB for Docker volumes and logs
)

REM Check total RAM (in MB)
for /f "tokens=2 delims==" %%a in ('wmic OS get TotalVisibleMemorySize /value ^| findstr "="') do set TOTAL_RAM_KB=%%a
set /a TOTAL_RAM_MB=%TOTAL_RAM_KB% / 1024

if %TOTAL_RAM_MB% LSS 4096 (
    call :print_warning "Only %TOTAL_RAM_MB%MB RAM detected. 4GB+ recommended"
    echo Limited RAM may cause services to crash or perform poorly
)

REM Check CPU cores
for /f "tokens=2 delims==" %%a in ('wmic CPU get NumberOfLogicalProcessors /value ^| findstr "="') do set CPU_CORES=%%a

if %CPU_CORES% LSS 2 (
    call :print_warning "Only %CPU_CORES% CPU core(s) detected. 2+ cores recommended"
)

call :print_status "System resources: %FREE_GB%GB disk, %TOTAL_RAM_MB%MB RAM, %CPU_CORES% CPU cores"
goto :eof
