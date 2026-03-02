@echo off
set "TASK_NAME=WealthTrackServer"

echo ==========================================
echo   DETENIENDO SERVICIO WEALTHTRACK
echo ==========================================
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Se requieren permisos de administrador.
    pause
    exit /b
)

echo Deteniendo tarea programada...
schtasks /end /tn "%TASK_NAME%" >nul 2>&1

echo Cerrando procesos de servidor (Python port 8000)...
:: Esto buscara el proceso que escucha en el puerto 8000 (Python) y lo cerrara
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo.
echo [OK] Servicio detenido.
echo.
pause
