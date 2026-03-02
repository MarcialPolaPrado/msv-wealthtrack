@echo off
set "TASK_NAME=WealthTrackServer"

echo ==========================================
echo   ELIMINANDO SERVICIO WEALTHTRACK
echo ==========================================
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Se requieren permisos de administrador.
    pause
    exit /b
)

echo Deteniendo procesos activos...
schtasks /end /tn "%TASK_NAME%" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo Eliminando tarea programada (si existe)...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

echo.
echo [INFO] Se ha desactivado el arranque automatico.
echo Los archivos del servidor se han mantenido para permitir el uso manual.

echo.
echo [OK] El arranque automatico ha sido eliminado.
echo.
pause
