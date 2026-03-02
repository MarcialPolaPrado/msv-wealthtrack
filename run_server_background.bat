@echo off
cd /d "c:\Users\marci\OneDrive\MSV"
echo [%DATE% %TIME%] Iniciando servidor de fondo... > server_log.txt

:: Verificar si el puerto 8000 ya esta en uso
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorLevel% equ 0 (
    echo [%DATE% %TIME%] El puerto 8000 ya esta en uso. No se inicia otra instancia. >> server_log.txt
    exit /b
)

:: Iniciar el servidor de Python (Prueba 'python' y luego 'py' para maxima compatibilidad)
where python >nul 2>&1
if %errorLevel% equ 0 (
    python -m http.server 8000 >> server_log.txt 2>&1
) else (
    where py >nul 2>&1
    if %errorLevel% equ 0 (
        py -m http.server 8000 >> server_log.txt 2>&1
    ) else (
        echo [%DATE% %TIME%] ERROR: No se encontro Python ni el lanzador 'py' en el sistema. >> server_log.txt
    )
)
