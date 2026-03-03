@echo off
setlocal

echo #################################################
echo # MSV - Actualizar Servidor Raiz (Digital Links) #
echo #################################################
echo.

set ROOT_REPO=c:\Users\marci\OneDrive\marcialpolaprado.github.io
set APP_REPO=%~dp0

if not exist "%ROOT_REPO%" (
    echo [ERROR] No se encuentra la carpeta del servidor raiz:
    echo %ROOT_REPO%
    pause
    exit /b 1
)

echo [1/3] Sincronizando archivos de verificacion...
if not exist "%ROOT_REPO%\.well-known" mkdir "%ROOT_REPO%\.well-known"
copy /y "%APP_REPO%\.well-known\assetlinks.json" "%ROOT_REPO%\.well-known\" >nul
copy /y "%APP_REPO%\_config.yml" "%ROOT_REPO%\" >nul

echo [2/3] Entrando en el repositorio raiz...
cd /d "%ROOT_REPO%"

echo [3/3] Subiendo cambios a GitHub...
git add .
git commit -m "Actualizacion automatica de Digital Asset Links"
git push origin main

echo.
echo #################################################
echo # ¡EXITO! Servidor raiz actualizado.            #
echo #################################################
echo.
pause
