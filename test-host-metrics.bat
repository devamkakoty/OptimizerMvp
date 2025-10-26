@echo off
REM Test script to diagnose setup-host-metrics.bat issues

echo.
echo ================================================
echo Testing Host Metrics Setup Prerequisites
echo ================================================
echo.

REM Test 1: Python
echo [TEST 1] Checking Python...
python --version 2>nul
if errorlevel 1 (
    echo [FAIL] Python not found
    goto :end
) else (
    echo [PASS] Python is installed
)
echo.

REM Test 2: Administrator privileges
echo [TEST 2] Checking administrator privileges...
net session >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Not running as administrator
    echo Please run as Administrator
    goto :end
) else (
    echo [PASS] Running with administrator privileges
)
echo.

REM Test 3: Required files
echo [TEST 3] Checking required files...
if exist "collect_all_metrics.py" (
    echo [PASS] collect_all_metrics.py found
) else (
    echo [FAIL] collect_all_metrics.py NOT found
    goto :end
)

if exist "collect_hardware_specs.py" (
    echo [PASS] collect_hardware_specs.py found
) else (
    echo [FAIL] collect_hardware_specs.py NOT found
    goto :end
)

if exist "config.ini" (
    echo [PASS] config.ini found
) else (
    echo [WARN] config.ini NOT found (optional)
)
echo.

REM Test 4: Docker
echo [TEST 4] Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [WARN] Docker not installed or not running (optional)
) else (
    docker --version
    echo [PASS] Docker is available
)
echo.

REM Test 5: Backend running
echo [TEST 5] Checking for GreenMatrix backend...
docker-compose ps 2>nul | findstr "greenmatrix-backend" >nul 2>&1
if errorlevel 1 (
    echo [WARN] GreenMatrix backend not detected (optional)
) else (
    echo [PASS] GreenMatrix backend is running
)
echo.

REM Test 6: ProgramData directory
echo [TEST 6] Checking target directory...
set GREENMATRIX_DIR=%PROGRAMDATA%\GreenMatrix
echo Target: %GREENMATRIX_DIR%
if exist "%GREENMATRIX_DIR%" (
    echo [INFO] Directory already exists
    dir "%GREENMATRIX_DIR%"
) else (
    echo [INFO] Directory will be created
)
echo.

echo ================================================
echo All prerequisite checks complete!
echo ================================================
echo.
echo If all tests passed, setup-host-metrics.bat should work.
echo.

:end
pause
