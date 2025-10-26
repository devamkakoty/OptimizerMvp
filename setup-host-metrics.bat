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
call :print_status "Checking administrator privileges..."
net session >nul 2>&1
if errorlevel 1 (
    echo.
    call :print_error "This script requires administrator privileges to create Windows services."
    echo.
    echo Please do one of the following:
    echo   1. Close this window
    echo   2. Right-click on setup-host-metrics.bat
    echo   3. Select "Run as Administrator"
    echo.
    pause
    exit /b 1
)
call :print_status "Running with administrator privileges - OK"

REM Check if Python is installed
call :print_status "Checking for Python installation..."
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    call :print_error "Python is not installed. Please install Python 3.8 or higher first."
    echo Visit: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)
python --version
call :print_status "Python is installed - OK"

REM Check if GreenMatrix is running (optional - continue even if not detected)
call :print_status "Checking for GreenMatrix backend service..."
docker-compose ps 2>nul | findstr "greenmatrix-backend" >nul 2>&1
if errorlevel 1 (
    echo.
    call :print_warning "GreenMatrix backend service is not detected locally."
    echo This is OK if GreenMatrix is running on another machine.
    echo.
    echo If running on THIS machine, please start GreenMatrix first:
    echo   setup-greenmatrix.bat  OR  docker-compose up -d
    echo.
    choice /C YN /M "Continue with host metrics setup anyway"
    if errorlevel 2 (
        echo.
        echo Setup cancelled by user.
        pause
        exit /b 1
    )
    echo.
) else (
    call :print_status "GreenMatrix backend detected - OK"
)

REM Install Python dependencies for host metrics collection
echo.
call :print_step "Installing Python dependencies for host metrics..."
echo Installing: pip (upgrade)
python -m pip install --upgrade pip --quiet
echo Installing: psutil, requests, python-dateutil, py-cpuinfo
python -m pip install psutil requests python-dateutil py-cpuinfo --quiet
call :print_status "Core dependencies installed"

REM Install Windows-specific dependencies
call :print_status "Installing Windows-specific dependencies (WMI)..."
python -m pip install wmi --quiet
call :print_status "WMI installed"

REM Install NVIDIA monitoring if GPU present
wmic path win32_VideoController get name 2>nul | findstr /i nvidia >nul 2>&1
if not errorlevel 1 (
    call :print_status "NVIDIA GPU detected, installing pynvml..."
    python -m pip install pynvml --quiet
    call :print_status "pynvml installed"
) else (
    call :print_status "No NVIDIA GPU detected (skipping pynvml)"
)

REM Create GreenMatrix directory for host services
REM Use %PROGRAMDATA% for better Windows compatibility
echo.
call :print_step "Setting up GreenMatrix directory..."
set GREENMATRIX_DIR=%PROGRAMDATA%\GreenMatrix
if not exist "%GREENMATRIX_DIR%" (
    mkdir "%GREENMATRIX_DIR%"
    call :print_status "Created directory: %GREENMATRIX_DIR%"
) else (
    call :print_status "Directory already exists: %GREENMATRIX_DIR%"
)

REM Copy metrics collection scripts to system location
echo.
call :print_step "Copying metrics collection scripts..."
if not exist "collect_all_metrics.py" (
    call :print_error "collect_all_metrics.py not found in current directory!"
    echo Please run this script from the GreenMatrix root directory.
    pause
    exit /b 1
)
copy "collect_all_metrics.py" "%GREENMATRIX_DIR%\" >nul
call :print_status "Copied: collect_all_metrics.py"

copy "collect_hardware_specs.py" "%GREENMATRIX_DIR%\" >nul
call :print_status "Copied: collect_hardware_specs.py"

if exist "config.ini" (
    copy "config.ini" "%GREENMATRIX_DIR%\" >nul
    call :print_status "Copied: config.ini"
) else (
    call :print_warning "config.ini not found (will use default settings)"
)

REM Get backend URL
set BACKEND_URL=http://localhost:8000

REM Try to detect actual backend port from docker-compose
docker-compose port backend 8000 >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%i in ('docker-compose port backend 8000 2^>nul') do set BACKEND_PORT=%%i
    if defined BACKEND_PORT (
        set BACKEND_URL=http://localhost:8000
    )
)

echo.
echo Backend URL Configuration:
echo Current setting: %BACKEND_URL%
echo.
echo If GreenMatrix is running on a different machine, enter its URL now.
echo Otherwise, press Enter to use: %BACKEND_URL%
echo.
set /p CUSTOM_URL="Backend URL (or press Enter for default): "
if not "%CUSTOM_URL%"=="" set BACKEND_URL=%CUSTOM_URL%

REM Update config.ini with correct backend URL
if exist "%GREENMATRIX_DIR%\config.ini" (
    powershell -Command "(Get-Content '%GREENMATRIX_DIR%\config.ini') -replace 'backend_api_url = .*', 'backend_api_url = %BACKEND_URL%' | Set-Content '%GREENMATRIX_DIR%\config.ini'"
)

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

REM Get Python executable path
for /f "tokens=*" %%i in ('where python') do set PYTHON_PATH=%%i

REM Create the host metrics service
call :print_status "Creating host metrics service..."
sc create "GreenMatrix-Host-Metrics" binPath= "\"%PYTHON_PATH%\" \"%GREENMATRIX_DIR%\collect_all_metrics.py\"" start= auto
if errorlevel 1 (
    call :print_error "Failed to create host metrics Windows service"
    pause
    exit /b 1
)

REM Create the hardware specs service
call :print_status "Creating hardware specs service..."
sc create "GreenMatrix-Hardware-Specs" binPath= "\"%PYTHON_PATH%\" \"%GREENMATRIX_DIR%\collect_hardware_specs.py\"" start= auto
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
schtasks /create /tn "GreenMatrix-Host-Metrics" /tr "\"%PYTHON_PATH%\" \"%GREENMATRIX_DIR%\collect_all_metrics.py\"" /sc onstart /ru "SYSTEM" /f >nul 2>&1
schtasks /create /tn "GreenMatrix-Hardware-Specs" /tr "\"%PYTHON_PATH%\" \"%GREENMATRIX_DIR%\collect_hardware_specs.py\"" /sc onstart /ru "SYSTEM" /f >nul 2>&1

echo.
echo ================================================
echo Host Metrics and Hardware Specs Setup Complete
echo ================================================
echo.
echo Service Information:
echo   Host Metrics Service:    GreenMatrix-Host-Metrics (Running)
echo   Hardware Specs Service:  GreenMatrix-Hardware-Specs (Running)
echo   Scripts Location:        %GREENMATRIX_DIR%\collect_all_metrics.py
echo                           %GREENMATRIX_DIR%\collect_hardware_specs.py
echo   Configuration:           %GREENMATRIX_DIR%\config.ini
echo   Backend URL:             %BACKEND_URL%
echo   Python Path:             %PYTHON_PATH%
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
