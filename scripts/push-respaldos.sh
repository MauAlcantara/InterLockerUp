#!/bin/bash
# Push de respaldos PostgreSQL al servidor casero (vía Tailscale, SFTP-only).
#
# Ubicación en producción: /usr/local/bin/push-respaldos.sh (droplet)
# Cron en el droplet: 10 min después del respaldo del panel, p.ej.:
#   10 3 * * * /usr/local/bin/push-respaldos.sh >> /var/log/push-respaldos.log 2>&1
#
# Retención remota: el servidor casero se limpia solo con su propio cron
# (el sshd casero está en modo SFTP-only, por eso la limpieza no se hace desde el droplet):
#   0 4 * * * find /home/respaldos/postgres -maxdepth 1 -name 'backup_*.dump' -mtime +30 -delete
#
# Ajustar según el despliegue:
#   - SRC_DIR: carpeta de respaldos del droplet (process.env.BACKUP_DIR o backend/backups por defecto)
#   - DEST_HOST: usuario respaldos + IP Tailscale del servidor casero
set -e

KEY=/root/.ssh/id_respaldo
DEST_HOST=respaldos@100.98.152.123
DEST_DIR=/home/respaldos/postgres
SRC_DIR=/root/InterLockerUp/backend/backups
OPTS="-i $KEY -o StrictHostKeyChecking=accept-new -o BatchMode=yes"

# Solo dumps creados en las últimas 2 horas
mapfile -t NUEVOS < <(find "$SRC_DIR" -maxdepth 1 -name 'backup_*.dump' -mmin -120)
if [ ${#NUEVOS[@]} -eq 0 ]; then
    echo "$(date '+%F %T') sin nuevos respaldos"
    exit 0
fi

scp $OPTS "${NUEVOS[@]}" "$DEST_HOST:$DEST_DIR/"
echo "$(date '+%F %T') push OK: ${NUEVOS[*]}"
