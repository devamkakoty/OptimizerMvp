@echo off
REM Line Ending Fix Script for Windows
REM Converts CRLF to LF in shell scripts for Docker compatibility

echo.
echo ================================================
echo GreenMatrix Line Ending Fix Utility
echo ================================================
echo.

echo [INFO] Converting shell scripts to Unix line endings (LF)...
echo.

REM Use PowerShell to convert line endings
powershell -Command "$scriptFiles = @(); $scriptFiles += Get-ChildItem -Path 'scripts' -Filter '*.sh' -File -ErrorAction SilentlyContinue; $scriptFiles += Get-ChildItem -Path '.' -Filter '*.sh' -File -ErrorAction SilentlyContinue; $fixed = 0; $failed = 0; foreach ($file in $scriptFiles) { try { $content = [System.IO.File]::ReadAllText($file.FullName); $originalLength = $content.Length; $content = $content -replace \"`r`n\", \"`n\"; $content = $content -replace \"`r\", \"`n\"; [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.UTF8Encoding]::new($false)); $newLength = $content.Length; if ($originalLength -ne $newLength) { Write-Host \"[FIXED] $($file.Name) - Removed $($originalLength - $newLength) carriage returns\" -ForegroundColor Green; $fixed++ } else { Write-Host \"[OK] $($file.Name) - Already correct\" -ForegroundColor Gray; } } catch { Write-Host \"[ERROR] Could not process $($file.Name): $($_.Exception.Message)\" -ForegroundColor Red; $failed++ } } Write-Host \"`n\" -NoNewline; Write-Host \"Summary: $fixed file(s) fixed, $failed error(s)\" -ForegroundColor Cyan"

echo.
echo ================================================
echo Fix Complete!
echo ================================================
echo.
echo You can now run: setup-greenmatrix.bat
echo.
pause
