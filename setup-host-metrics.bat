@echo off
REM GreenMatrix Host Metrics Setup Script for Windows
REM This script sets up host metrics collection service

REM Auto-elevate to administrator if not already running as admin
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting administrator privileges...
    goto :UACPrompt
) else (
    goto :gotAdmin
)

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"

setlocal enabledelayedexpansion

REM Store script's directory for later use (must be done before any other CD commands)
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

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
call :print_status "Running with administrator privileges - OK"

REM Check if Python is installed and find it
call :print_status "Searching for Python installation..."
set PYTHON_PATH=
set PYTHON_CMD=

REM Try standard python command first (but exclude Microsoft Store wrapper)
python --version >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%i in ('where python 2^>nul') do (
        REM Skip Microsoft Store Python wrapper (doesn't work with Windows services)
        echo %%i | findstr /i "WindowsApps" >nul
        if errorlevel 1 (
            set PYTHON_CMD=python
            set PYTHON_PATH=%%i
            goto :python_found
        )
    )
)

REM Try py launcher (and get actual Python path, not just py.exe)
py --version >nul 2>&1
if not errorlevel 1 (
    REM Get the actual Python executable path from py launcher
    for /f "tokens=*" %%i in ('py -c "import sys; print(sys.executable)" 2^>nul') do (
        set PYTHON_PATH=%%i
        set PYTHON_CMD=%%i
        REM Verify it's not WindowsApps
        echo %%i | findstr /i "WindowsApps" >nul
        if errorlevel 1 (
            goto :python_found
        )
    )
)

REM Check if we only found WindowsApps Python
where python 2>nul | findstr /i "WindowsApps" >nul
if not errorlevel 1 (
    call :print_warning "Found Microsoft Store Python, which cannot be used for Windows services."
    call :print_warning "Searching for regular Python installation..."
)

REM Search common Python installation locations
call :print_status "Python not in PATH, searching system..."
for %%d in (
    "%LOCALAPPDATA%\Programs\Python\Python*"
    "C:\Python*"
    "%PROGRAMFILES%\Python*"
    "%PROGRAMFILES(X86)%\Python*"
    "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python*"
) do (
    for /d %%p in (%%d) do (
        if exist "%%p\python.exe" (
            set PYTHON_PATH=%%p\python.exe
            set PYTHON_CMD=%%p\python.exe
            goto :python_found
        )
    )
)

REM Python not found anywhere - try to install automatically
echo.
call :print_warning "Python not found. Attempting automatic installation..."
echo.

REM Check if winget is available (Windows 10 1809+ / Windows 11)
winget --version >nul 2>&1
if not errorlevel 1 (
    call :print_status "Installing Python 3.11 using winget..."
    echo This may take a few minutes...
    winget install -e --id Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements

    if not errorlevel 1 (
        call :print_status "Python installed successfully!"
        echo.
        call :print_status "Searching for newly installed Python..."

        REM Wait a moment for installation to complete
        timeout /t 3 /nobreak >nul

        REM Search again for Python
        for %%d in (
            "%LOCALAPPDATA%\Programs\Python\Python311"
            "%LOCALAPPDATA%\Programs\Python\Python*"
            "C:\Program Files\Python311"
            "C:\Program Files\Python*"
        ) do (
            for /d %%p in (%%d) do (
                if exist "%%p\python.exe" (
                    set PYTHON_PATH=%%p\python.exe
                    set PYTHON_CMD=%%p\python.exe
                    call :print_status "Found installed Python: %%p\python.exe"
                    goto :python_found
                )
            )
        )

        call :print_warning "Python was installed but couldn't be found immediately."
        echo Please close this window and run the script again.
        pause
        exit /b 1
    ) else (
        call :print_error "Automatic Python installation failed."
        goto :python_manual_install
    )
) else (
    call :print_warning "winget not available. Cannot auto-install Python."
    goto :python_manual_install
)

:python_manual_install
echo.
call :print_error "Please install Python manually:"
echo.
echo Option 1: Download from https://www.python.org/downloads/
echo   - Download Python 3.8 or higher
echo   - During installation, CHECK "Add Python to PATH"
echo.
echo Option 2: Use winget (if available):
echo   winget install Python.Python.3.11
echo.
echo Option 3: Use Chocolatey:
echo   choco install python
echo.
echo After installing Python, run this script again.
echo.
pause
exit /b 1

:python_found
%PYTHON_CMD% --version
call :print_status "Python found: %PYTHON_PATH%"

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
%PYTHON_CMD% -m pip install --upgrade pip --quiet
echo Installing: psutil, requests, python-dateutil, py-cpuinfo
%PYTHON_CMD% -m pip install psutil requests python-dateutil py-cpuinfo --quiet
call :print_status "Core dependencies installed"

REM Install Windows-specific dependencies
call :print_status "Installing Windows-specific dependencies (WMI)..."
%PYTHON_CMD% -m pip install wmi --quiet
call :print_status "WMI installed"

REM Install NVIDIA monitoring if GPU present
wmic path win32_VideoController get name 2>nul | findstr /i nvidia >nul 2>&1
if not errorlevel 1 (
    call :print_status "NVIDIA GPU detected, installing pynvml..."
    %PYTHON_CMD% -m pip install pynvml --quiet
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

REM Grant SYSTEM account full permissions to GreenMatrix directory (required for Windows services)
call :print_status "Setting directory permissions for Windows service (SYSTEM account)..."
icacls "%GREENMATRIX_DIR%" /grant "SYSTEM:(OI)(CI)F" /T >nul 2>&1
if not errorlevel 1 (
    call :print_status "Permissions granted to SYSTEM account"
) else (
    call :print_warning "Could not set permissions (may cause PID file issues)"
)

REM Find and copy metrics collection scripts
echo.
call :print_step "Locating metrics collection scripts..."

REM Use SCRIPT_DIR that was set at the beginning (line 29)
set "SOURCE_DIR=%SCRIPT_DIR%"

call :print_status "Script directory: %SCRIPT_DIR%"
call :print_status "Searching for: %SOURCE_DIR%\collect_all_metrics.py"

REM Verify files exist in script directory
if not exist "%SOURCE_DIR%\collect_all_metrics.py" (
    call :print_error "collect_all_metrics.py not found in %SOURCE_DIR%"
    echo.
    echo Current directory: %CD%
    echo Script directory: %SCRIPT_DIR%
    echo.
    echo This script must be in the GreenMatrix repository root directory
    echo containing collect_all_metrics.py and collect_hardware_specs.py
    echo.
    pause
    exit /b 1
)

call :print_status "Found scripts in: %SOURCE_DIR%"

REM Copy scripts to system location
call :print_step "Copying metrics collection scripts..."
copy "%SOURCE_DIR%\collect_all_metrics.py" "%GREENMATRIX_DIR%\" >nul
if errorlevel 1 (
    call :print_error "Failed to copy collect_all_metrics.py"
    pause
    exit /b 1
)
call :print_status "Copied: collect_all_metrics.py"

copy "%SOURCE_DIR%\collect_hardware_specs.py" "%GREENMATRIX_DIR%\" >nul
if errorlevel 1 (
    call :print_error "Failed to copy collect_hardware_specs.py"
    pause
    exit /b 1
)
call :print_status "Copied: collect_hardware_specs.py"

if exist "%SOURCE_DIR%\config.ini" (
    copy "%SOURCE_DIR%\config.ini" "%GREENMATRIX_DIR%\" >nul
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

REM Clean up stale PID files before creating services
call :print_step "Cleaning up any stale PID files..."
if exist "%GREENMATRIX_DIR%\metrics_collector.pid" (
    call :print_status "Removing stale PID file: metrics_collector.pid"
    del /f /q "%GREENMATRIX_DIR%\metrics_collector.pid" >nul 2>&1
)
if exist "%GREENMATRIX_DIR%\hardware_collector.pid" (
    call :print_status "Removing stale PID file: hardware_collector.pid"
    del /f /q "%GREENMATRIX_DIR%\hardware_collector.pid" >nul 2>&1
)

REM Stop any orphaned Python processes running the collector scripts
call :print_status "Checking for orphaned collector processes..."
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq python.exe" /fo list ^| findstr "PID:"') do (
    set PID=%%i
    wmic process where "ProcessId=!PID!" get CommandLine 2>nul | findstr /i "collect_all_metrics.py collect_hardware_specs.py" >nul 2>&1
    if not errorlevel 1 (
        call :print_status "Terminating orphaned collector process: !PID!"
        taskkill /f /pid !PID! >nul 2>&1
    )
)

REM Clean up any old Windows services (they don't work with Python scripts)
call :print_step "Cleaning up old Windows services (if any)..."
sc query "GreenMatrix-Host-Metrics" >nul 2>&1
if not errorlevel 1 (
    call :print_status "Removing old Windows service: GreenMatrix-Host-Metrics"
    sc stop "GreenMatrix-Host-Metrics" >nul 2>&1
    sc delete "GreenMatrix-Host-Metrics" >nul 2>&1
)

sc query "GreenMatrix-Hardware-Specs" >nul 2>&1
if not errorlevel 1 (
    call :print_status "Removing old Windows service: GreenMatrix-Hardware-Specs"
    sc stop "GreenMatrix-Hardware-Specs" >nul 2>&1
    sc delete "GreenMatrix-Hardware-Specs" >nul 2>&1
)

REM Windows services don't work with Python scripts - use scheduled tasks instead
call :print_step "Creating scheduled tasks to run metrics collectors..."

REM Create VBS scripts to run Python processes invisibly (no console window)
echo Set objShell = CreateObject("WScript.Shell") > "%GREENMATRIX_DIR%\run_metrics.vbs"
echo objShell.Run """%PYTHON_PATH%"" ""%GREENMATRIX_DIR%\collect_all_metrics.py""", 0, False >> "%GREENMATRIX_DIR%\run_metrics.vbs"

echo Set objShell = CreateObject("WScript.Shell") > "%GREENMATRIX_DIR%\run_hardware.vbs"
echo objShell.Run """%PYTHON_PATH%"" ""%GREENMATRIX_DIR%\collect_hardware_specs.py""", 0, False >> "%GREENMATRIX_DIR%\run_hardware.vbs"

REM Create scheduled tasks that run at startup using VBS wrappers (invisible execution)
schtasks /create /tn "GreenMatrix-Host-Metrics" /tr "wscript.exe \"%GREENMATRIX_DIR%\run_metrics.vbs\"" /sc onstart /ru "SYSTEM" /rl HIGHEST /f >nul 2>&1
schtasks /create /tn "GreenMatrix-Hardware-Specs" /tr "wscript.exe \"%GREENMATRIX_DIR%\run_hardware.vbs\"" /sc onstart /ru "SYSTEM" /rl HIGHEST /f >nul 2>&1

call :print_status "Scheduled tasks created successfully"

REM Start the collectors immediately using VBS wrappers (invisible - no console window)
call :print_status "Starting metrics collectors in background..."
wscript.exe "%GREENMATRIX_DIR%\run_metrics.vbs"
wscript.exe "%GREENMATRIX_DIR%\run_hardware.vbs"

REM Wait for processes to start
timeout /t 3 /nobreak >nul

REM Verify Python processes are running
call :print_status "Verifying collectors are running..."
tasklist /fi "imagename eq python.exe" | findstr /i "python.exe" >nul 2>&1
if not errorlevel 1 (
    call :print_status "Metrics collectors started successfully"
) else (
    call :print_warning "Collectors may take a few seconds to start"
    call :print_status "You can verify by running: tasklist /fi \"imagename eq python.exe\""
)

echo.
echo ================================================
echo Host Metrics and Hardware Specs Setup Complete
echo ================================================
echo.
echo Task Information:
echo   Host Metrics Task:      GreenMatrix-Host-Metrics (Scheduled)
echo   Hardware Specs Task:    GreenMatrix-Hardware-Specs (Scheduled)
echo   Scripts Location:       %GREENMATRIX_DIR%\collect_all_metrics.py
echo                           %GREENMATRIX_DIR%\collect_hardware_specs.py
echo   Configuration:          %GREENMATRIX_DIR%\config.ini
echo   Backend URL:            %BACKEND_URL%
echo   Python Path:            %PYTHON_PATH%
echo.
echo Management Commands:
echo   Start Tasks:        schtasks /run /tn "GreenMatrix-Host-Metrics"
echo                       schtasks /run /tn "GreenMatrix-Hardware-Specs"
echo   View Task Status:   schtasks /query /tn "GreenMatrix-Host-Metrics" /fo LIST
echo                       schtasks /query /tn "GreenMatrix-Hardware-Specs" /fo LIST
echo   View Running:       tasklist /fi "imagename eq python.exe" /v
echo   Stop Tasks:         Stop via Task Scheduler (taskschd.msc)
echo.
echo Troubleshooting:
echo   Run manually to test: "%PYTHON_PATH%" "%GREENMATRIX_DIR%\collect_all_metrics.py"
echo   Check backend: curl %BACKEND_URL%/health
echo   View task history: Task Scheduler (taskschd.msc) -^> GreenMatrix tasks
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
