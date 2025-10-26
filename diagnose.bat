@echo off
echo Starting diagnostics...
echo.

echo Step 1: Check setlocal
setlocal enabledelayedexpansion
echo Setlocal OK
echo.

echo Step 2: Check variables
set "GREEN=[92m"
set "NC=[0m"
echo Variables OK
echo.

echo Step 3: Check function call
call :test_function "Test message"
echo Function call OK
echo.

echo Step 4: Check admin
net session >nul 2>&1
if errorlevel 1 (
    echo NOT RUNNING AS ADMINISTRATOR
    echo This is the problem!
) else (
    echo Running as administrator - OK
)
echo.

echo Step 5: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Python NOT FOUND
) else (
    python --version
    echo Python OK
)
echo.

echo Step 6: Check files
if exist "collect_all_metrics.py" (
    echo collect_all_metrics.py - FOUND
) else (
    echo collect_all_metrics.py - NOT FOUND
)
echo.

echo Diagnostics complete!
pause
exit /b 0

:test_function
echo %GREEN%[TEST]%NC% %~1
goto :eof
