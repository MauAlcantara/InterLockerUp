-- ============================================================
-- 003_backups.sql
-- Tablas para el sistema de gestion de respaldos
-- Ejecutar en PostgreSQL: psql -f scripts/003_backups.sql
-- ============================================================

-- Metadatos de cada respaldo generado
CREATE TABLE IF NOT EXISTS gestion.backup_jobs (
    id              SERIAL PRIMARY KEY,
    filename        TEXT NOT NULL,
    tipo            TEXT NOT NULL DEFAULT 'full',
    origen          TEXT NOT NULL DEFAULT 'manual',      -- manual | programado | pre_restauracion
    size_bytes      BIGINT,
    checksum_sha256 TEXT,
    estado          TEXT NOT NULL DEFAULT 'en_proceso',  -- en_proceso | ok | fallo
    notas           TEXT,
    creado_el       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Programacion de respaldos automaticos
CREATE TABLE IF NOT EXISTS gestion.backup_schedules (
    id               SERIAL PRIMARY KEY,
    frecuencia       TEXT NOT NULL DEFAULT 'diaria',     -- diaria | semanal
    hora             TEXT NOT NULL DEFAULT '03:00',      -- HH:MM (hora del servidor)
    dia_semana       SMALLINT,                           -- 0=domingo ... 6=sabado (solo semanal)
    dias_retencion   INT NOT NULL DEFAULT 14,            -- respaldos a conservar
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    cron_expr        TEXT NOT NULL,                      -- expresion cron derivada
    ultimo_ejecutado TIMESTAMPTZ,
    creado_el        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE gestion.backup_jobs IS 'Historial de respaldos de la base de datos';
COMMENT ON TABLE gestion.backup_schedules IS 'Programacion de respaldos automaticos';
