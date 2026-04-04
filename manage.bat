@echo off
setlocal enabledelayedexpansion

:: WealthTrack - Windows Unified Command Center
:: ------------------------------------------

:: 1. Global Configuration
set "VERSION_FILE=index.html"
set "SW_FILE=sw.js"
set "PORT=8000"
set "LOG_FILE=server_log.txt"
set "TASK_NAME=WealthTrackServer"
set "ROOT_REPO=c:\Users\marci\OneDrive\marcialpolaprado.github.io"
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

:main_menu
cls
echo ==========================================
echo    MSV - WEALTHTRACK (Windows)
echo ==========================================
echo 1) Subir a GitHub (Versioning + Push)
echo 2) Hacer Backup ZIP (Snapshot)
echo 3) Servidor INTERACTIVO (Ctrl+C para parar)
echo 4) Servidor DESATENDIDO (Fondo/Log)
echo 5) DETENER Servidor (Cierra puerto %PORT%)
echo 6) --- GESTION DE SERVICIO (ADMIN) ---
echo 7) Sincronizar Digital Asset Links (Raiz)
echo 8) Todo en uno (Backup + Git + Servidor BG)
echo q) Salir
echo ------------------------------------------
:: Check if port is in use
netstat -ano | findstr :%PORT% | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo ESTADO: [ACTIVO] en http://localhost:%PORT%
) else (
    echo ESTADO: [APAGADO]
)
echo ------------------------------------------
set /p opt="Selecciona una opcion: "

if "%opt%"=="1" goto do_push
if "%opt%"=="2" goto do_backup
if "%opt%"=="3" goto do_interactive
if "%opt%"=="4" goto do_background
if "%opt%"=="5" goto do_stop
if "%opt%"=="6" goto service_menu
if "%opt%"=="7" goto do_root_sync
if "%opt%"=="8" goto do_all_in_one
if /i "%opt%"=="q" exit /b 0
goto main_menu

:do_push
call :sub_versioning
call :sub_push
pause
goto main_menu

:do_backup
call :sub_backup
pause
goto main_menu

:do_interactive
echo [*] Iniciando servidor interactivo en http://localhost:%PORT%
start http://localhost:%PORT%
python -m http.server %PORT% --bind 0.0.0.0
pause
goto main_menu

:do_background
call :sub_background
pause
goto main_menu

:do_stop
call :sub_stop
pause
goto main_menu

:do_root_sync
echo [*] Sincronizando Digital Asset Links con servidor raiz...
if not exist "%ROOT_REPO%" (
    echo [ERROR] No se encuentra la carpeta: %ROOT_REPO%
    pause
    goto main_menu
)
if not exist "%ROOT_REPO%\.well-known" mkdir "%ROOT_REPO%\.well-known"
copy /y ".well-known\assetlinks.json" "%ROOT_REPO%\.well-known\" >nul
copy /y "_config.yml" "%ROOT_REPO%\" >nul
pushd "%ROOT_REPO%"
git add .
git commit -m "Auto-update Digital Asset Links via WealthTrack manage.bat"
git push
popd
echo [OK] Servidor raiz actualizado.
pause
goto main_menu

:do_all_in_one
call :sub_backup
call :sub_versioning
call :sub_push
call :sub_background
echo [OK] Tareas completadas.
pause
goto main_menu

:service_menu
cls
echo ==========================================
echo    GESTION DEL SERVICIO (ADMIN REQ)
echo ==========================================
echo 1) Instalar arranque automatico (Logon)
echo 2) Eliminar arranque automatico
echo 3) Volver al menu principal
echo ------------------------------------------
set /p sopt="Selecciona una opcion: "

if "%sopt%"=="1" goto service_install
if "%sopt%"=="2" goto service_uninstall
goto main_menu

:service_install
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Se requieren permisos de ADMINISTRADOR.
    pause
    goto service_menu
)
echo [*] Creando tarea programada...
schtasks /create /tn "%TASK_NAME%" /tr "wscript.exe \"%APP_DIR%\run_invisible.vbs\"" /sc onlogon /ru "%USERNAME%" /rl HIGHEST /f
if %errorlevel% equ 0 (
    echo [OK] Servicio instalado. Se iniciará al iniciar sesión.
    schtasks /run /tn "%TASK_NAME%"
)
pause
goto service_menu

:service_uninstall
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Se requieren permisos de ADMINISTRADOR.
    pause
    goto service_menu
)
echo [*] Eliminando servicio...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1
call :sub_stop
echo [OK] Servicio eliminado.
pause
goto service_menu

:: --- SUB-ROUTINES (Repaso de logica compartida) ---

:sub_versioning
echo [*] Generando nueva version...
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyyMMddHHmm'"') do set V=%%i
echo [*] Version: %V%
powershell -Command "$i=gc %VERSION_FILE%; $i=$i -replace 'v\d{8,14}','v%V%' -replace '\?v=\d{8,14}','?v=%V%' -replace 'APP_VERSION = ''\d{8,14}''','APP_VERSION = ''%V%'''; sc %VERSION_FILE% $i"
powershell -Command "$s=gc %SW_FILE%; $s=$s -replace 'msv-wealthtrack-v\d{8,14}','msv-wealthtrack-v%V%' -replace '\?v=\d{8,14}','?v=%V%'; sc %SW_FILE% $s"
goto :eof

:sub_push
echo [*] Preparando subida a GitHub...
git add .
set /p M="Mensaje del commit (Enter para Auto): "
if "!M!"=="" set M=Actualización %V%
git commit -m "!M!"
git push
if %errorlevel% neq 0 (
    echo [ERROR] Falló la subida.
) else (
    echo [OK] WealthTrack actualizado correctamente.
)
goto :eof

:sub_backup
echo [*] Creando snapshot del código fuente...
powershell -Command ^
    "$timestamp = Get-Date -Format 'yyyyMMdd_HHmm';" ^
    "$backupName = 'MSV_Snapshot_' + $timestamp + '.zip';" ^
    "$dest = Join-Path (Get-Location) $backupName;" ^
    "Write-Host 'Creando ZIP: ' $backupName -ForegroundColor Cyan;" ^
    "$include = @('.js', '.html', '.css', '.json', '.bat', '.vbs', '.py', '.yml', '.txt', '.gitignore', '.well-known');" ^
    "$items = Get-ChildItem -Path '.' -File | Where-Object { $ext = [System.IO.Path]::GetExtension($_.Name); $include -contains $ext } | Where-Object { $_.Name -notlike '*.zip' -and $_.Name -ne '%LOG_FILE%' };" ^
    "if ($items) {" ^
    "    Compress-Archive -Path $items -DestinationPath $dest -Force;" ^
    "    Write-Host '[OK] Backup completado.' -ForegroundColor Green" ^
    "} else { Write-Host '[ERROR] No se encontraron archivos.' -ForegroundColor Red }"
goto :eof

:sub_background
echo [*] Iniciando servidor en segundo plano...
netstat -ano | findstr :%PORT% | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [!] El puerto %PORT% ya está ocupado.
    goto :eof
)
echo [%DATE% %TIME%] Inicio de servidor >> %LOG_FILE%
echo [INFO] Log en %LOG_FILE%
start /b python -m http.server %PORT% --bind 0.0.0.0 >> %LOG_FILE% 2>&1
timeout /t 2 >nul
start http://localhost:%PORT%
goto :eof

:sub_stop
echo [*] Deteniendo servidor en puerto %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT% ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)
schtasks /end /tn "%TASK_NAME%" >nul 2>&1
goto :eof
