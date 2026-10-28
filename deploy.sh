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
    # Cargar el .env del backend (puede estar en backend/.env o backend/src/.env)
    ENV_FILE=""
    for candidate in "$ROOT/backend/.env" "$ROOT/backend/src/.env"; do
        if [[ -f "$candidate" ]]; then ENV_FILE="$candidate"; break; fi
    done
    if [[ -n "$ENV_FILE" ]]; then
        set -a
        source "$ENV_FILE"
        set +a
    fi
    # Construir la cadena de conexión: DATABASE_URL directo o variables DB_*
    DB_CONN="${DATABASE_URL:-}"
    if [[ -z "$DB_CONN" ]] && [[ -n "${DB_USER:-}" && -n "${DB_PASSWORD:-}" && -n "${DB_NAME:-}" ]]; then
        DB_HOST_EFECTIVO="${DB_HOST:-localhost}"
        DB_PORT_EFECTIVO="${DB_PORT:-5432}"
        DB_CONN="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST_EFECTIVO}:${DB_PORT_EFECTIVO}/${DB_NAME}"
    fi
    if [[ -z "$DB_CONN" ]]; then
        echo "    AVISO: no hay DATABASE_URL ni variables DB_*; se omiten migraciones."
    elif ! command -v psql >/dev/null 2>&1; then
        echo "    AVISO: psql no está instalado; se omiten migraciones."
    else
        for f in "$ROOT"/scripts/*.sql; do
            echo "    Aplicando: $(basename "$f")"
            psql "$DB_CONN" -v ON_ERROR_STOP=1 -f "$f" || {
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
