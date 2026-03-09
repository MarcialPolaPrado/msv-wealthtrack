@echo off
setlocal enabledelayedexpansion

echo #################################################
echo # MSV - Subir codigo a GitHub                   #
echo #################################################
echo.

:: Verificar si Git está instalado
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git no esta instalado. Por favor, instalo desde https://git-scm.com/
    pause
    exit /b 1
)

:: Verificar configuracion de identidad (Nombre y Email)
git config user.email >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Git no sabe quien eres. Por favor, introduce tu identidad para los commits:
    set /p GIT_EMAIL="Introduce tu email de GitHub: "
    set /p GIT_NAME="Introduce tu nombre de usuario de GitHub: "
    if "!GIT_EMAIL!"=="" set GIT_EMAIL=usuario@ejemplo.com
    if "!GIT_NAME!"=="" set GIT_NAME=Usuario
    git config --global user.email "!GIT_EMAIL!"
    git config --global user.name "!GIT_NAME!"
    echo [OK] Identidad configurada.
)

:: Inicializar git si no existe la carpeta .git
if not exist .git (
    echo [INFO] Inicializando repositorio Git...
    git init
    git branch -M main
)

:: Comprobar si ya tiene un remote origin
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo No se ha detectado ningun repositorio remoto vinculado.
    set /p REPO_URL="Pega la URL de tu repositorio de GitHub (ej: https://github.com/tu_usuario/msv-wealthtrack.git): "
    if "!REPO_URL!"=="" (
        echo [ERROR] Se necesita la URL del repositorio para continuar.
        pause
        exit /b 1
    )
    git remote add origin !REPO_URL!
)
:: Actualizar versionado automáticamente (vYYYYMMDDHHMM para reventar siempre la cahe)
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyyMMddHHmm'"') do set NEW_VERSION=%%i

echo [0/3] Actualizando cache y version a %NEW_VERSION% en index.html y sw.js...
powershell -Command "$c = Get-Content index.html; $c = $c -replace 'v\d{4}\.\d{2}\.\d{2}\.\d{2,4}', 'v%NEW_VERSION%'; $c = $c -replace 'styles\.css\?v=\d{10,14}', 'styles.css?v=%NEW_VERSION%'; $c = $c -replace 'Versión: \d{10,14}', 'Versión: %NEW_VERSION%'; $c = $c -replace 'app\.js\?v=\d{10,14}', 'app.js?v=%NEW_VERSION%'; $c = $c -replace ""APP_VERSION = '\d{10,14}'"", ""APP_VERSION = '%NEW_VERSION%'""; Set-Content index.html $c"
powershell -Command "$c = Get-Content sw.js; $c = $c -replace 'msv-wealthtrack-v\d{10,14}', 'msv-wealthtrack-v%NEW_VERSION%'; $c = $c -replace 'app\.js\?v=\d{10,14}', 'app.js?v=%NEW_VERSION%'; Set-Content sw.js $c"

echo.
echo [1/3] Añadiendo archivos...
git add .

echo [2/3] Guardando cambios (Commit)...
set /p COMMIT_MSG="Introduce un mensaje para el commit (o pulsa Enter para 'Actualizacion automatica'): "
if "!COMMIT_MSG!"=="" set COMMIT_MSG=Actualizacion automatica
git commit -m "!COMMIT_MSG!"

echo [3/3] Subiendo a GitHub (Push)...
echo (Es posible que se abra una ventana para que te identifiques en GitHub)
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Algo ha fallado al subir los archivos. 
    echo Intenta ejecutar este comando manualmente en la consola para ver el error:
    echo git push -u origin main
    pause
    exit /b 1
)

echo.
echo #################################################
echo # ¡EXITO! Codigo subido correctamente.          #
echo #################################################
echo.
pause
