@echo off
set "TASK_NAME=WealthTrackServer"
set "APP_DIR=c:\Users\marci\OneDrive\MSV"

echo ==========================================
echo   INSTALANDO SERVICIO WEALTHTRACK
echo ==========================================
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Se requieren permisos de administrador.
    echo Por favor, haz clic derecho en este archivo y selecciona "Ejecutar como administrador".
    pause
    exit /b
)

echo Creando tarea programada (arranque invisible al iniciar sesion)...
schtasks /create /tn "%TASK_NAME%" /tr "wscript.exe \"%APP_DIR%\run_invisible.vbs\"" /sc onlogon /ru "%USERNAME%" /rl HIGHEST /f

if %errorLevel% equ 0 (
    echo.
    echo [OK] Tarea instalada con exito.
    echo El servidor se iniciara automaticamente cada vez que inicies sesion.
    echo Iniciando tarea ahora...
    schtasks /run /tn "%TASK_NAME%"
) else (
    echo.
    echo [ERROR] Hubo un problema al crear la tarea.
)

echo.
pause
