@echo off
REM GreenMatrix Host Metrics Setup Script for Windows
REM This script sets up host metrics collection service

setlocal enabledelayedexpansion

echo.
echo ================================================
echo GreenMatrix Host Metrics Setup
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
call :print_status "Setting up host metrics collection service..."

REM Check if running as administrator (needed for service setup)
net session >nul 2>&1
if errorlevel 1 (
    call :print_error "This script requires administrator privileges to create Windows services."
    echo Please run this script as Administrator (Right-click and select "Run as Administrator")
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Python is not installed. Please install Python 3.8 or higher first."
    echo Visit: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check if GreenMatrix is running
docker-compose ps | findstr "greenmatrix-backend" >nul 2>&1
if errorlevel 1 (
    call :print_warning "GreenMatrix backend service is not running."
    echo Please start GreenMatrix first using setup-greenmatrix.bat or docker-compose up -d
    pause
    exit /b 1
)

REM Install Python dependencies for host metrics collection
call :print_step "Installing Python dependencies for host metrics..."
python -m pip install --upgrade pip
python -m pip install psutil requests python-dateutil configparser

REM Install NVIDIA monitoring if GPU present
wmic path win32_VideoController get name | findstr /i nvidia >nul 2>&1
if not errorlevel 1 (
    call :print_status "NVIDIA GPU detected, installing pynvml..."
    python -m pip install pynvml
)

REM Create GreenMatrix directory for host services
if not exist "C:\opt\greenmatrix" mkdir "C:\opt\greenmatrix"

REM Copy metrics collection scripts to system location
copy "collect_all_metrics.py" "C:\opt\greenmatrix\"
copy "collect_hardware_specs.py" "C:\opt\greenmatrix\"
copy "config.ini" "C:\opt\greenmatrix\"

REM Get backend URL from docker-compose
for /f "tokens=*" %%i in ('docker-compose port backend 8000') do set BACKEND_PORT=%%i
set BACKEND_URL=http://localhost:8000

REM Update config.ini with correct backend URL
powershell -Command "(Get-Content 'C:\opt\greenmatrix\config.ini') -replace 'backend_api_url = .*', 'backend_api_url = %BACKEND_URL%' | Set-Content 'C:\opt\greenmatrix\config.ini'"

call :print_status "Configuration updated with backend URL: %BACKEND_URL%"

REM Create Windows services for host metrics and hardware specs collection
call :print_step "Creating Windows services for host metrics and hardware specs collection..."

REM Check if host metrics service already exists
sc query "GreenMatrix-Host-Metrics" >nul 2>&1
if not errorlevel 1 (
    call :print_warning "Host metrics service already exists. Stopping and removing existing service..."
    sc stop "GreenMatrix-Host-Metrics" >nul 2>&1
    sc delete "GreenMatrix-Host-Metrics" >nul 2>&1
    timeout /t 3 /nobreak >nul
)

REM Check if hardware specs service already exists
sc query "GreenMatrix-Hardware-Specs" >nul 2>&1
if not errorlevel 1 (
    call :print_warning "Hardware specs service already exists. Stopping and removing existing service..."
    sc stop "GreenMatrix-Hardware-Specs" >nul 2>&1
    sc delete "GreenMatrix-Hardware-Specs" >nul 2>&1
    timeout /t 3 /nobreak >nul
)

REM Create the host metrics service
call :print_status "Creating host metrics service..."
sc create "GreenMatrix-Host-Metrics" binPath= "python C:\opt\greenmatrix\collect_all_metrics.py" start= auto
if errorlevel 1 (
    call :print_error "Failed to create host metrics Windows service"
    pause
    exit /b 1
)

REM Create the hardware specs service
call :print_status "Creating hardware specs service..."
sc create "GreenMatrix-Hardware-Specs" binPath= "python C:\opt\greenmatrix\collect_hardware_specs.py" start= auto
if errorlevel 1 (
    call :print_error "Failed to create hardware specs Windows service"
    pause
    exit /b 1
)

REM Set service descriptions
sc description "GreenMatrix-Host-Metrics" "GreenMatrix Host Metrics Collection Service"
sc description "GreenMatrix-Hardware-Specs" "GreenMatrix Hardware Specifications Collection Service"

REM Start both services
call :print_status "Starting host metrics collection service..."
sc start "GreenMatrix-Host-Metrics"
if errorlevel 1 (
    call :print_warning "Failed to start host metrics service automatically. You may need to start it manually."
) else (
    call :print_status "Host metrics service started successfully"
)

call :print_status "Starting hardware specs collection service..."
sc start "GreenMatrix-Hardware-Specs"
if errorlevel 1 (
    call :print_warning "Failed to start hardware specs service automatically. You may need to start it manually."
) else (
    call :print_status "Hardware specs service started successfully"
)

REM Verify services are running
timeout /t 5 /nobreak >nul
sc query "GreenMatrix-Host-Metrics" | findstr "RUNNING" >nul 2>&1
if not errorlevel 1 (
    call :print_status "Host metrics collection service is running successfully"
) else (
    call :print_warning "Host metrics service may not be running. Check service status manually."
)

sc query "GreenMatrix-Hardware-Specs" | findstr "RUNNING" >nul 2>&1
if not errorlevel 1 (
    call :print_status "Hardware specs collection service is running successfully"
) else (
    call :print_warning "Hardware specs service may not be running. Check service status manually."
)

REM Create scheduled tasks for automatic restart (alternative to Windows service)
call :print_step "Creating scheduled tasks for automatic restart..."
schtasks /create /tn "GreenMatrix-Host-Metrics" /tr "python C:\opt\greenmatrix\collect_all_metrics.py" /sc onstart /ru "SYSTEM" /f >nul 2>&1
schtasks /create /tn "GreenMatrix-Hardware-Specs" /tr "python C:\opt\greenmatrix\collect_hardware_specs.py" /sc onstart /ru "SYSTEM" /f >nul 2>&1

echo.
echo ================================================
echo Host Metrics and Hardware Specs Setup Complete
echo ================================================
echo.
echo Service Information:
echo   Host Metrics Service:    GreenMatrix-Host-Metrics (Running)
echo   Hardware Specs Service:  GreenMatrix-Hardware-Specs (Running)
echo   Scripts Location:        C:\opt\greenmatrix\collect_all_metrics.py
echo                           C:\opt\greenmatrix\collect_hardware_specs.py
echo   Configuration:           C:\opt\greenmatrix\config.ini
echo   Backend URL:             %BACKEND_URL%
echo.
echo Management Commands:
echo   Start Services:      sc start "GreenMatrix-Host-Metrics" ^&^& sc start "GreenMatrix-Hardware-Specs"
echo   Stop Services:       sc stop "GreenMatrix-Host-Metrics" ^&^& sc stop "GreenMatrix-Hardware-Specs"
echo   View Service Status: sc query "GreenMatrix-Host-Metrics" ^&^& sc query "GreenMatrix-Hardware-Specs"
echo   View Service Logs:   Get-EventLog -LogName Application -Source "GreenMatrix-Host-Metrics"
echo                       Get-EventLog -LogName Application -Source "GreenMatrix-Hardware-Specs"
echo.
echo Troubleshooting:
echo   If the service fails to start, check the Windows Event Viewer
echo   Ensure Python is in the system PATH
echo   Verify the backend URL is accessible
echo.
call :print_status "Host metrics setup completed successfully!"
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
