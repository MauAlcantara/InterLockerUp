#!/usr/bin/env bash
# ============================================================
# deploy.sh — Despliegue rápido de InterLockerUp en el servidor
#
# Uso:
#   ./deploy.sh                -> pull + build frontends + deps backend + restart pm2
#   ./deploy.sh --migrations   -> lo anterior + aplica scripts/*.sql a la BD (si hay DATABASE_URL)
#
# Ejecutar desde la raíz del repo como el usuario que corre pm2 (root):
#   cd ~/InterLockerUp && ./deploy.sh
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PM2_APPS=("interlocker-frontend" "interlocker-backend" "interlocker-admin")

echo "==> [1/5] Descargando últimos cambios (git pull)..."
git -C "$ROOT" pull --ff-only

# --- Migraciones opcionales ---
if [[ "${1:-}" == "--migrations" ]]; then
    echo "==> Aplicando migraciones de base de datos..."
    # Cargar DATABASE_URL del backend si existe
    if [[ -f "$ROOT/backend/.env" ]]; then
        set -a
        source "$ROOT/backend/.env"
        set +a
    fi
    if [[ -z "${DATABASE_URL:-}" ]]; then
        echo "    AVISO: no hay DATABASE_URL definido; se omiten migraciones."
    elif ! command -v psql >/dev/null 2>&1; then
        echo "    AVISO: psql no está instalado; se omiten migraciones."
    else
        for f in "$ROOT"/scripts/*.sql; do
            echo "    Aplicando: $(basename "$f")"
            psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f" || {
                echo "    ERROR en $(basename "$f") — revisa si ya fue aplicado."
            }
        done
    fi
fi

echo "==> [2/5] Construyendo frontend (app estudiantes)..."
cd "$ROOT/frontend"
npm ci --no-audit --loglevel=error
npm run build

echo "==> [3/5] Construyendo panel admin..."
cd "$ROOT/interlockerup-admin"
npm ci --no-audit --loglevel=error
npm run build

echo "==> [4/5] Actualizando dependencias del backend..."
cd "$ROOT/backend"
npm ci --no-audit --loglevel=error

echo "==> [5/5] Reiniciando procesos de pm2..."
for app in "${PM2_APPS[@]}"; do
    pm2 restart "$app"
done

echo ""
pm2 list

# Si algo quedó caído, muestra las últimas líneas de su log para diagnosticar
for app in "${PM2_APPS[@]}"; do
    if ! pm2 describe "$app" 2>/dev/null | grep -Ei 'status' | grep -qi 'online'; then
        echo "!! $app no está online — últimos logs:"
        pm2 logs "$app" --nostream --lines 15
    fi
done

echo ""
echo "Despliegue completado."
