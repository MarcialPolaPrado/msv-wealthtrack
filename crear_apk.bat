@echo off
setlocal enabledelayedexpansion

echo #################################################
echo # MSV - Generador de APK (Bubblewrap)           #
echo #################################################
echo.

echo [1/5] Comprobando Node.js...
node -v
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] No se encuentra 'node'. 
    echo Asegurate de que Node.js esta instalado y que has REINICIADO la consola.
    pause
    exit /b 1
)

echo [2/5] Comprobando si Bubblewrap esta instalado...
where bubblewrap >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Bubblewrap no detectado en el PATH. Buscando en npm global...
    call npm list -g @bubblewrap/cli --depth=0 >nul 2>&1
    if !errorlevel! neq 0 (
        echo [INFO] Instalando Bubblewrap CLI globalmente - esto puede tardar unos minutos
        call npm install -g @bubblewrap/cli
    )
)
echo [OK] Bubblewrap detectado o instalado.

echo.
echo [3/5] Configuracion de licencias (Doctor)
echo Si tienes errores de "Terms and Conditions", pulsa 'D'.
echo Si ya lo has hecho, pulsa cualquier otra tecla para continuar.
set /p CHOICE="Seleccion (D/Continuar): "
if /i "%CHOICE%"=="D" (
    echo Ejecutando bubblewrap doctor...
    call bubblewrap doctor
    echo.
    echo Doctor finalizado.
)

echo.
echo [4/5] Preparando URL de la PWA
echo Bubblewrap necesita descargar los iconos de una URL publica.
set /p PWA_URL="Introduce la URL de tu PWA (ej: https://tusitio.com): "

if "%PWA_URL%"=="" (
    echo [ERROR] Se necesita una URL para continuar.
    pause
    exit /b 1
)

if not exist android_project (
    mkdir android_project
)

cd android_project

echo.
echo [5/5] Inicializando el proyecto Android...
echo Esto puede tardar un poco la primera vez.
call bubblewrap init --manifest=%PWA_URL%/manifest_v4.json

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] No se pudo inicializar. Verifica que la URL sea correcta y accesible.
    pause
    exit /b 1
)

echo.
echo Construyendo el APK...
call bubblewrap build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Error durante la construccion (build).
    pause
    exit /b 1
)

echo.
echo #################################################
echo # ¡EXITO! APK generado en android_project/
echo #################################################
echo.
pause
