@echo off
setlocal enabledelayedexpansion

echo #################################################
echo # MSV - Actualizar Todo (Web + APK)             #
echo #################################################
echo.

echo [1/2] Subiendo cambios a GitHub Pages...
echo ----------------------------------------
call subir_a_github.bat

echo.
echo [2/2] ¿Quieres generar un nuevo archivo APK?
echo (Solo es necesario si has cambiado iconos, el nombre de la app o el manifiesto)
echo Si solo has cambiado el codigo JS/HTML, la App se actualizara sola en el movil.
echo.
set /p REBUILD="¿Generar nuevo APK? (S/N): "

if /i "%REBUILD%"=="S" (
    call crear_apk.bat
)

echo.
echo #################################################
echo # Proceso finalizado.                           #
echo #################################################
echo.
pause
