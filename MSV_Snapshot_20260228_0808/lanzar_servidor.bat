@echo off
echo ==========================================
echo   STOCK PORTFOLIO - SERVIDOR LOCAL
echo ==========================================
echo.
echo Iniciando servidor en http://localhost:8000
echo Abrira el navegador automaticamente...
echo.
echo (Para detener el servidor, cierra esta ventana)
echo.

:: Abrir el navegador
start http://localhost:8000

:: Iniciar el servidor de Python
python -m http.server 8000

pause
