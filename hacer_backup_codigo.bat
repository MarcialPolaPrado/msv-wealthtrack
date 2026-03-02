@echo off
setlocal

echo ==========================================
echo   MSV - COPIA DE SEGURIDAD
echo ==========================================
echo.

:: La copia se guardara en la misma carpeta donde este el script
powershell -Command ^
    "$timestamp = Get-Date -Format 'yyyyMMdd_HHmm';" ^
    "$backupName = 'MSV_Snapshot_' + $timestamp + '.zip';" ^
    "$dest = Join-Path (Get-Location) $backupName;" ^
    "Write-Host 'Creando copia en la carpeta actual: ' $backupName;" ^
    "$items = Get-ChildItem -Path '.' -Exclude '*.zip', '.git', '.gemini', 'server_log.txt';" ^
    "Compress-Archive -Path $items -DestinationPath $dest -Force;" ^
    "if ($?) { Write-Host '------------------------------------------'; Write-Host ' EXITO: Copia guardada en esta carpeta.'; Write-Host '------------------------------------------' } else { Write-Host ' ERROR: No se pudo crear el backup.' }"

echo.
pause
