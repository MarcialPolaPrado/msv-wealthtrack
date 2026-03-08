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
    "Write-Host 'Creando copia de seguridad (solo fuentes) en: ' $backupName;" ^
    "$include = @('.js', '.html', '.css', '.json', '.bat', '.vbs', '.py', '.yml', '.txt', '.gitignore');" ^
    "$items = Get-ChildItem -Path '.' -File | Where-Object { $ext = [System.IO.Path]::GetExtension($_.Name); ($include -contains $ext) -or ($_.Name -eq '.gitignore') } | Where-Object { $_.Name -ne 'server_log.txt' -and $_.Name -notlike '*.zip' };" ^
    "if ($items) {" ^
    "    Compress-Archive -Path $items -DestinationPath $dest -Force;" ^
    "    if ($?) { Write-Host '------------------------------------------'; Write-Host ' EXITO: Copia de fuentes guardada.'; Write-Host '------------------------------------------' } else { Write-Host ' ERROR: No se pudo crear el backup.' }" ^
    "} else { Write-Host ' ERROR: No se encontraron archivos de fuente para copiar.' }"

echo.
pause
