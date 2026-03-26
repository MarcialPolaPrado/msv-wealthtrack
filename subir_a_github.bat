@echo off
:: WealthTrack - GitHub Push Lite
setlocal enabledelayedexpansion

:: 1. Generate Version (YYYYMMDDHHMM)
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyyMMddHHmm'"') do set V=%%i

echo [*] Versioning: %V%
:: 2. Update Files (Regex improved for dotless and dotted formats)
powershell -Command "$i=gc index.html; $i=$i -replace 'v\d{8,14}','v%V%' -replace '\?v=\d{8,14}','?v=%V%' -replace 'APP_VERSION = ''\d{8,14}''','APP_VERSION = ''%V%'''; sc index.html $i"
powershell -Command "$s=gc sw.js; $s=$s -replace 'msv-wealthtrack-v\d{8,14}','msv-wealthtrack-v%V%' -replace '\?v=\d{8,14}','?v=%V%'; sc sw.js $s"

:: 3. Git Workflow
echo [*] Pushing to GitHub...
git add .
set /p M="Commit msg (Enter for Auto): "
if "!M!"=="" set M=Actualización %V%

git commit -m "!M!"
git push

if %errorlevel% neq 0 (
    echo [ERROR] Push failed.
    pause
    exit /b 1
)

echo [OK] WealthTrack updated successfully!
timeout /t 3
