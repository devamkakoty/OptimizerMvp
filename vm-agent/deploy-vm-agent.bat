@echo off
REM GreenMatrix VM Agent Deployment Script for Windows
REM This script sets up VM monitoring agents inside Windows VM instances
REM
REM Usage:
REM   deploy-vm-agent.bat [BACKEND_URL]
REM   Example: deploy-vm-agent.bat http://192.168.1.100:8000

setlocal enabledelayedexpansion

REM CRITICAL: Change to script's directory (fixes "Run as Administrator" issue)
cd /d "%~dp0"

echo.
echo ============================================
echo 🚀 GreenMatrix VM Agent Deployment (Windows)
echo ============================================
echo.

REM Get backend URL from parameter
set "BACKEND_URL=%~1"

REM Check for help flag
if "%~1"=="--help" goto :show_help
if "%~1"=="-h" goto :show_help
if "%~1"=="/?" goto :show_help

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Set color codes
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Validate required files exist
call :validate_files
if errorlevel 1 exit /b 1

REM Check for existing installation
call :check_existing_installation
if errorlevel 1 exit /b 1

echo %BLUE%[STEP]%NC% Checking environment...

REM Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%[WARNING]%NC% Python is not installed
    echo %GREEN%[INFO]%NC% Downloading and installing Python 3.11...

    REM Create temp directory
    if not exist "%TEMP%\greenmatrix" mkdir "%TEMP%\greenmatrix"

    REM Download Python installer
    echo %GREEN%[INFO]%NC% Downloading Python installer...
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe' -OutFile '%TEMP%\greenmatrix\python-installer.exe'}"

    if errorlevel 1 (
        echo %RED%[ERROR]%NC% Failed to download Python installer
        echo Please manually install Python 3.8+ from https://python.org
        pause
        exit /b 1
    )

    REM Install Python silently
    echo %GREEN%[INFO]%NC% Installing Python (this may take a few minutes)...
    "%TEMP%\greenmatrix\python-installer.exe" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0

    REM Wait for installation to complete
    timeout /t 10 /nobreak >nul

    REM Refresh PATH by reloading environment variables
    for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SystemPath=%%b"
    for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "UserPath=%%b"
    set "PATH=%SystemPath%;%UserPath%"

    REM Verify Python installation
    python --version >nul 2>&1
    if errorlevel 1 (
        echo %RED%[ERROR]%NC% Python installation failed
        echo Please manually install Python 3.8+ from https://python.org and re-run this script
        pause
        exit /b 1
    )

    echo %GREEN%[INFO]%NC% ✅ Python installed successfully

    REM Clean up installer
    del "%TEMP%\greenmatrix\python-installer.exe"
) else (
    echo %GREEN%[INFO]%NC% ✅ Python found
)

echo.

echo %BLUE%[STEP]%NC% Setting up VM agent environment...

REM Create agent directory
set "AGENT_DIR=C:\GreenMatrix-VM-Agent"
if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"

REM Create Python virtual environment
python -m venv "%AGENT_DIR%\venv"

REM Install Python dependencies
echo %GREEN%[INFO]%NC% Installing Python dependencies...
"%AGENT_DIR%\venv\Scripts\pip.exe" install --upgrade pip
"%AGENT_DIR%\venv\Scripts\pip.exe" install psutil>=5.9.0 requests>=2.28.0 netifaces>=0.11.0 pynvml>=11.4.1

REM Copy VM agent files
copy "simple_vm_agent.py" "%AGENT_DIR%\"

echo %GREEN%[INFO]%NC% ✅ VM agent environment set up
echo.

echo %BLUE%[STEP]%NC% Configuring VM agent...

REM If backend URL not provided as parameter, try to detect or prompt
if "%BACKEND_URL%"=="" (
    echo %GREEN%[INFO]%NC% Backend URL not provided, attempting auto-detection...

    REM Get default gateway (may or may not be the GreenMatrix host)
    for /f "tokens=2" %%i in ('ipconfig ^| findstr /i "Default Gateway" ^| findstr /v "::"') do set GATEWAY_IP=%%i
    set GATEWAY_IP=!GATEWAY_IP: =!

    if not "!GATEWAY_IP!"=="" (
        REM Test if GreenMatrix is at gateway
        echo %GREEN%[INFO]%NC% Testing if GreenMatrix is at gateway: !GATEWAY_IP!
        powershell -Command "try { Invoke-WebRequest -Uri 'http://!GATEWAY_IP!:8000/health' -TimeoutSec 5 -UseBasicParsing | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
        if not errorlevel 1 (
            set "BACKEND_URL=http://!GATEWAY_IP!:8000"
            echo %GREEN%[INFO]%NC% ✅ Auto-detected GreenMatrix at gateway: !BACKEND_URL!
        ) else (
            echo %YELLOW%[WARNING]%NC% Gateway ^(!GATEWAY_IP!^) is not the GreenMatrix host
        )
    )

    REM If still not found, prompt user
    if "!BACKEND_URL!"=="" (
        echo %YELLOW%[WARNING]%NC% Could not auto-detect GreenMatrix backend
        echo.
        echo Please enter the GreenMatrix backend URL
        echo Example: http://192.168.1.100:8000
        set /p BACKEND_URL="Backend URL: "

        if "!BACKEND_URL!"=="" (
            echo %RED%[ERROR]%NC% Backend URL is required!
            pause
            exit /b 1
        )
    )
)

REM Normalize backend URL
REM Remove trailing slash
set "LAST_CHAR=!BACKEND_URL:~-1!"
if "!LAST_CHAR!"=="/" set "BACKEND_URL=!BACKEND_URL:~0,-1!"

REM Add http:// if no protocol specified
echo !BACKEND_URL! | findstr /R "^https*://" >nul
if errorlevel 1 (
    set "BACKEND_URL=http://!BACKEND_URL!"
)

REM Add port if not specified
echo !BACKEND_URL! | findstr /R ":[0-9][0-9]*$" >nul
if errorlevel 1 (
    set "BACKEND_URL=!BACKEND_URL!:8000"
)

echo %GREEN%[INFO]%NC% Using backend URL: !BACKEND_URL!

REM Get VM name (computer name)
set VM_NAME=%COMPUTERNAME%
echo %GREEN%[INFO]%NC% VM Name: %VM_NAME%

REM Create configuration file
(
echo [DEFAULT]
echo # VM Agent Configuration for GreenMatrix
echo.
echo [api]
echo # Backend API Configuration
echo backend_url = !BACKEND_URL!
echo api_timeout = 30
echo retry_attempts = 3
echo retry_delay = 5
echo.
echo [collection]
echo # Data Collection Configuration
echo interval_seconds = 60
echo vm_name = %VM_NAME%
echo collect_gpu_metrics = true
echo collect_disk_metrics = true
echo.
echo [logging]
echo # Logging Configuration
echo log_level = INFO
echo log_file = %AGENT_DIR%\greenmatrix-vm-agent.log
echo log_max_size = 10485760
echo log_backup_count = 5
echo.
echo [security]
echo # Security Configuration (Optional^)
echo api_key =
echo verify_ssl = false
) > "%AGENT_DIR%\vm_agent.ini"

echo %GREEN%[INFO]%NC% ✅ VM agent configured with backend: !BACKEND_URL!
echo.

echo %BLUE%[STEP]%NC% Creating Windows service...

REM Create service wrapper script
(
echo @echo off
echo cd /d "%AGENT_DIR%"
echo "%AGENT_DIR%\venv\Scripts\python.exe" "%AGENT_DIR%\simple_vm_agent.py"
) > "%AGENT_DIR%\run_agent.bat"

REM Create service installation script
(
echo @echo off
echo REM Install GreenMatrix VM Agent as Windows Service
echo echo Installing GreenMatrix VM Agent service...
echo.
echo REM Using NSSM (Non-Sucking Service Manager^) - lightweight service wrapper
echo REM Download from: https://nssm.cc/download
echo.
echo REM Alternative: Use Task Scheduler for automatic startup
echo schtasks /create /tn "GreenMatrix VM Agent" /tr "%AGENT_DIR%\run_agent.bat" /sc onstart /ru SYSTEM /rl HIGHEST /f
echo.
echo echo Service installation completed.
echo echo The agent will start automatically on system boot.
echo pause
) > "%AGENT_DIR%\install_service.bat"

REM Install as scheduled task for automatic startup
echo %GREEN%[INFO]%NC% Installing as scheduled task for automatic startup...
schtasks /create /tn "GreenMatrix VM Agent" /tr "%AGENT_DIR%\run_agent.bat" /sc onstart /ru SYSTEM /rl HIGHEST /f >nul 2>&1

echo %GREEN%[INFO]%NC% ✅ Service installation completed
echo.

echo %BLUE%[STEP]%NC% Starting VM agent...

REM Start the agent
echo %GREEN%[INFO]%NC% Starting VM agent in background...
start /b "" "%AGENT_DIR%\run_agent.bat"

REM Wait a moment for startup
timeout /t 5 /nobreak >nul

echo %GREEN%[INFO]%NC% ✅ VM agent started
echo.

echo %BLUE%[STEP]%NC% Testing connectivity to backend...

REM Test API connectivity using PowerShell
powershell -Command "try { Invoke-WebRequest -Uri '!BACKEND_URL!/health' -TimeoutSec 10 -UseBasicParsing | Out-Null; Write-Host '✅ Successfully connected to GreenMatrix backend at !BACKEND_URL!' -ForegroundColor Green } catch { Write-Host '❌ Failed to connect to GreenMatrix backend at !BACKEND_URL!' -ForegroundColor Red; Write-Host 'Please check:' -ForegroundColor Red; Write-Host '  1. Backend URL is correct' -ForegroundColor Red; Write-Host '  2. GreenMatrix backend is running' -ForegroundColor Red; Write-Host '  3. Windows Firewall allows connections' -ForegroundColor Red; exit 1 }"

if errorlevel 1 (
    echo %RED%[ERROR]%NC% Connectivity test failed
    echo Check backend URL: !BACKEND_URL!
    pause
    exit /b 1
)

echo.
echo 🎉 GreenMatrix VM Agent Deployment Complete!
echo =============================================
echo.
echo 📊 Agent Information:
echo   VM Name:              %VM_NAME%
echo   Agent Directory:      %AGENT_DIR%
echo   Configuration:        %AGENT_DIR%\vm_agent.ini
echo   Log File:            %AGENT_DIR%\greenmatrix-vm-agent.log
echo.
echo 🔧 Service Management:
echo   View logs:           type "%AGENT_DIR%\greenmatrix-vm-agent.log"
echo   Restart service:     schtasks /run /tn "GreenMatrix VM Agent"
echo   Stop service:        taskkill /f /im python.exe
echo.
echo 📈 Monitoring:
echo   ✅ Process-level metrics collection enabled
echo   ✅ CPU, Memory, Disk, and GPU monitoring
echo   ✅ Data collection interval: 60 seconds
echo   ✅ Automatic startup on system boot
echo.
echo 🔧 Troubleshooting:
echo   View service logs:    type "%AGENT_DIR%\greenmatrix-vm-agent.log"
echo   Test connectivity:    powershell -Command "Invoke-WebRequest -Uri '!BACKEND_URL!/health'"
echo   Edit configuration:   notepad "%AGENT_DIR%\vm_agent.ini"
echo.
echo 📊 To verify data collection, check the GreenMatrix dashboard:
echo   Dashboard URL:        !BACKEND_URL:/8000=/3000!
echo   Look for VM '%VM_NAME%' in the VM instances section
echo.
echo %GREEN%[INFO]%NC% 🎉 Deployment completed successfully!
echo.
pause
exit /b 0

REM ====================================================================
REM Helper Functions
REM ====================================================================

:show_help
echo Usage: deploy-vm-agent.bat [BACKEND_URL]
echo.
echo Arguments:
echo   BACKEND_URL    GreenMatrix backend URL (optional, will auto-detect if not provided)
echo                  Example: http://192.168.1.100:8000
echo.
echo Examples:
echo   deploy-vm-agent.bat http://192.168.1.100:8000
echo   deploy-vm-agent.bat 192.168.1.100:8000
echo   deploy-vm-agent.bat 192.168.1.100
echo   deploy-vm-agent.bat    (Will attempt auto-detection)
echo.
pause
exit /b 0

:validate_files
echo %BLUE%[STEP]%NC% Validating required files...

if not exist "simple_vm_agent.py" (
    echo %RED%[ERROR]%NC% simple_vm_agent.py not found in current directory!
    echo Make sure you're running this script from the vm-agent folder
    pause
    exit /b 1
)

if not exist "vm_agent_config.ini.template" (
    echo %YELLOW%[WARNING]%NC% vm_agent_config.ini.template not found (optional)
)

echo %GREEN%[INFO]%NC% ✅ Required files validated
goto :eof

:check_existing_installation
echo %BLUE%[STEP]%NC% Checking for existing installation...

if exist "C:\GreenMatrix-VM-Agent" (
    echo %YELLOW%[WARNING]%NC% Existing installation found at C:\GreenMatrix-VM-Agent
    set /p REINSTALL="Remove existing installation and reinstall? (y/N): "

    if /i "!REINSTALL!"=="y" (
        echo %GREEN%[INFO]%NC% Removing existing installation...

        REM Stop scheduled task
        schtasks /end /tn "GreenMatrix VM Agent" >nul 2>&1
        schtasks /delete /tn "GreenMatrix VM Agent" /f >nul 2>&1

        REM Kill any running python processes for the agent
        for /f "tokens=2" %%p in ('tasklist /FI "IMAGENAME eq python.exe" /FO LIST ^| findstr "PID:"') do (
            taskkill /PID %%p /F >nul 2>&1
        )

        REM Remove directory
        timeout /t 2 /nobreak >nul
        rmdir /s /q "C:\GreenMatrix-VM-Agent" 2>nul

        echo %GREEN%[INFO]%NC% ✅ Existing installation removed
    ) else (
        echo %RED%[ERROR]%NC% Installation cancelled
        pause
        exit /b 1
    )
)
goto :eof