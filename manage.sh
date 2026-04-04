#!/bin/zsh

# WealthTrack - Command Center (macOS Edition)
# ------------------------------------------

# 1. Configuration
VERSION_ID=$(date +%Y%m%d%H%M)
ZIP_NAME="MSV_Snapshot_${VERSION_ID}.zip"
INDEX_HTML="index.html"
SW_JS="sw.js"
PORT=8000
LOG_FILE="server_log.txt"

# 2. Main Menu
show_menu() {
    clear
    echo "=========================================="
    echo "   MSV - WEALTHTRACK (macOS)"
    echo "=========================================="
    echo "1) Subir a GitHub (Versioning + Push)"
    echo "2) Hacer Backup ZIP (Snapshot)"
    echo "3) Servidor INTERACTIVO (Ctrl+C para parar)"
    echo "4) Servidor DESATENDIDO (Corre en el fondo)"
    echo "5) Detener Servidor (Cierra el puerto $PORT)"
    echo "6) Todo en uno (Backup + GitHub + Servidor BG)"
    echo "q) Salir"
    echo "------------------------------------------"
    # Check if server is running
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
        echo "ESTADO: [ACTIVO] en http://localhost:$PORT"
    else
        echo "ESTADO: [APAGADO]"
    fi
    echo "------------------------------------------"
    echo -n "Selecciona una opción: "
}

# 3. Task Implementations
do_versioning() {
    echo "[*] Generando Versión: $VERSION_ID"
    perl -i -pe "s/v\d{8,14}/v$VERSION_ID/g" "$INDEX_HTML"
    perl -i -pe "s/\?v=\d{8,14}/?v=$VERSION_ID/g" "$INDEX_HTML"
    perl -i -pe "s/APP_VERSION = '\d{8,14}'/APP_VERSION = '$VERSION_ID'/g" "$INDEX_HTML"
    
    perl -i -pe "s/msv-wealthtrack-v\d{8,14}/msv-wealthtrack-v$VERSION_ID/g" "$SW_JS"
    perl -i -pe "s/\?v=\d{8,14}/?v=$VERSION_ID/g" "$SW_JS"
    echo "[OK] Versión actualizada."
}

do_push() {
    do_versioning
    echo "[*] Preparando subida a GitHub..."
    git add .
    echo -n "Mensaje del commit (Enter para Auto): "
    read COMMIT_MSG
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="Actualización $VERSION_ID"
    fi
    git commit -m "$COMMIT_MSG"
    git push
    if [ $? -eq 0 ]; then
        echo "[OK] Subida completada."
    else
        echo "[ERROR] Falló la subida."
    fi
}

do_backup() {
    echo "[*] Creando copia de seguridad..."
    zip -r "$ZIP_NAME" . -i "*.js" "*.html" "*.css" "*.json" "*.sh" "*.py" "*.yml" "*.txt" ".gitignore" -x "*.zip" "$LOG_FILE" ".git/*" ".DS_Store"
    echo "[OK] Backup: $ZIP_NAME"
}

do_server_interactive() {
    echo "[*] Servidor Interactivo en http://localhost:$PORT"
    open "http://localhost:$PORT"
    python3 -c "import http.server, socketserver
socketserver.TCPServer(('0.0.0.0', $PORT), http.server.SimpleHTTPRequestHandler).serve_forever()"
}

do_server_background() {
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
        echo "[!] El servidor YA está corriendo en el puerto $PORT."
    else
        echo "[*] Iniciando servidor desatendido en el fondo..."
        nohup python3 -c "import http.server, socketserver
socketserver.TCPServer(('0.0.0.0', $PORT), http.server.SimpleHTTPRequestHandler).serve_forever()" > "$LOG_FILE" 2>&1 &
        sleep 1
        open "http://localhost:$PORT"
        echo "[OK] Servidor iniciado. Log en $LOG_FILE"
    fi
}

do_stop_server() {
    PID=$(lsof -ti :$PORT)
    if [ -n "$PID" ]; then
        echo "[*] Deteniendo servidor (PID: $PID)..."
        kill -9 $PID
        echo "[OK] Servidor detenido."
    else
        echo "[!] No se encontró ningún servidor activo en el puerto $PORT."
    fi
}

# 4. Program Loop
while true; do
    show_menu
    read choice
    case $choice in
        1) do_push ;;
        2) do_backup ;;
        3) do_server_interactive ;;
        4) do_server_background ;;
        5) do_stop_server ;;
        6) do_backup; do_push; do_server_background ;;
        q) exit 0 ;;
        *) echo "Opción no válida." ;;
    esac
    echo -n "\nPresiona [Enter] para continuar..."
    read
done
