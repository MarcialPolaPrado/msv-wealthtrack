@echo off
setlocal enabledelayedexpansion

echo #################################################
echo # MSV - Generador de APK (Bubblewrap)           #
echo #################################################
echo.

:: URL Hardcodeada para conveniencia
set PWA_URL=https://marcialpolaprado.github.io/msv-wealthtrack/

echo [1/5] Comprobando Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encuentra 'node'.
    pause
    exit /b 1
)

echo [2/5] Comprobando Bubblewrap...
where bubblewrap >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Instalando Bubblewrap...
    call npm install -g @bubblewrap/cli
)
echo [OK] Bubblewrap listo.

:: Opción de Doctor - REFORZADA para licencias
echo.
echo #################################################
echo # SI HAS TENIDO ERRORES DE "LICENCES" (LICENCIAS) #
echo # DEBES PULSAR 'D' AHORA Y ACEPTAR TODO (Y/Enter) #
echo #################################################
echo.
echo Presiona 'D' para ejecutar 'bubblewrap doctor'
echo o cualquier otra tecla para continuar si ya lo has hecho.
set /p CHOICE="Seleccion (D/Continuar): "
if /i "%CHOICE%"=="D" (
    echo Ejecutando bubblewrap doctor...
    echo (RECUERDA: Si te pregunta "Do you accept...", escribe 'y' y pulsa Enter)
    call bubblewrap doctor
)

if not exist android_project (
    mkdir android_project
    cd android_project
    echo.
    echo [Paso 5] Inicializando el proyecto Android por primera vez...
    call bubblewrap init --manifest=%PWA_URL%manifest_v4.json
) else (
    cd android_project
    echo.
    echo [Paso 5] Proyecto ya inicializado. 
    echo Si has cambiado algo en la web ultimamente, pulsa 'S'.
    set /p UPDATE_MANIFEST="¿Actualizar datos de la web? (S/N): "
    if /i "!UPDATE_MANIFEST!"=="S" (
        call bubblewrap update
    )
)

echo.
echo [FINAL] Construyendo el APK...
echo (Este paso puede tardar unos minutos)
call bubblewrap build

if %errorlevel% neq 0 (
    echo.
    echo #################################################
    echo # [ERROR] La construccion ha fallado.           #
    echo # Si el error menciona "licences not accepted", #
    echo # vuelve a lanzar este .bat y PULSA 'D'.        #
    echo #################################################
    pause
    exit /b 1
)

echo.
echo #################################################
echo # ¡EXITO! APK generado en android_project/      #
echo # Archivo: app-release-signed.apk               #
echo #################################################
echo.
pause
