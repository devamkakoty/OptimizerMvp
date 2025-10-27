@echo off
REM GreenMatrix VM Agent Deployment Script for Windows
REM This script sets up VM monitoring agents inside Windows VM instances

echo.
echo ============================================
echo 🚀 GreenMatrix VM Agent Deployment (Windows)
echo ============================================
echo.

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

REM Get default gateway (host VM IP)
for /f "tokens=2" %%i in ('ipconfig ^| findstr /i "Default Gateway" ^| findstr /v "::"') do set HOST_IP=%%i
set HOST_IP=%HOST_IP: =%

if "%HOST_IP%"=="" (
    echo %RED%[ERROR]%NC% Could not auto-detect host VM IP
    set /p HOST_IP="Please enter the host VM IP address: "
)

echo %GREEN%[INFO]%NC% Using host VM IP: %HOST_IP%

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
echo backend_url = http://%HOST_IP%:8000
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

echo %GREEN%[INFO]%NC% ✅ VM agent configured
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

echo %BLUE%[STEP]%NC% Testing connectivity to host...

REM Test API connectivity using PowerShell
powershell -Command "try { Invoke-WebRequest -Uri 'http://%HOST_IP%:8000/health' -TimeoutSec 10 -UseBasicParsing | Out-Null; Write-Host '✅ Successfully connected to GreenMatrix backend' -ForegroundColor Green } catch { Write-Host '❌ Failed to connect to GreenMatrix backend' -ForegroundColor Red; Write-Host 'Please check:' -ForegroundColor Red; Write-Host '  1. Host VM IP address is correct' -ForegroundColor Red; Write-Host '  2. GreenMatrix backend is running on host' -ForegroundColor Red; Write-Host '  3. Windows Firewall allows connections on port 8000' -ForegroundColor Red; exit 1 }"

if errorlevel 1 (
    echo %RED%[ERROR]%NC% Connectivity test failed
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
echo   Test connectivity:    curl http://%HOST_IP%:8000/health
echo   Edit configuration:   notepad "%AGENT_DIR%\vm_agent.ini"
echo.
echo 📊 To verify data collection, check the GreenMatrix dashboard:
echo   Dashboard URL:        http://%HOST_IP%:3000
echo   Look for VM '%VM_NAME%' in the VM instances section
echo.
echo %GREEN%[INFO]%NC% 🎉 Deployment completed successfully!
echo.
pause