-- ============================================================================
-- 007_retention.sql — Retención de registros obsoletos + dashboard de rotación
-- Dependencias: 005_rotation.sql, 001_security_logs.sql
--
-- 1. Índices para las purgas de retención
-- 2. Historial de ejecuciones diarias de rotación/limpieza (rotation_runs)
-- 3. Flags de notificación anticipada en rotation_state
-- ============================================================================

BEGIN;

-- 1. Índices para las purgas
CREATE INDEX IF NOT EXISTS idx_incidents_estado_fecha
    ON gestion.incidents (estado, created_at);

CREATE INDEX IF NOT EXISTS idx_user_devices_fecha
    ON gestion.user_devices (fecha_registro);

CREATE INDEX IF NOT EXISTS idx_security_logs_created
    ON iot.security_logs (created_at);

-- 2. Historial de ejecuciones (una fila por corrida diaria de limpiezaDiaria)
CREATE TABLE IF NOT EXISTS gestion.rotation_runs (
    id SERIAL PRIMARY KEY,
    ejecutado_el TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    periodo_vigente_cuatrimestre SMALLINT,
    periodo_vigente_anio INTEGER,
    periodo_cerrado TEXT,
    asignaciones_finalizadas INTEGER DEFAULT 0,
    solicitudes_rechazadas INTEGER DEFAULT 0,
    tokens_eliminados INTEGER DEFAULT 0,
    sesiones_eliminadas INTEGER DEFAULT 0,
    iot_comandos_eliminados INTEGER DEFAULT 0,
    notificaciones_eliminadas INTEGER DEFAULT 0,
    logs_eliminados INTEGER DEFAULT 0,
    solicitudes_obsoletas_eliminadas INTEGER DEFAULT 0,
    security_logs_eliminados INTEGER DEFAULT 0,
    incidentes_eliminados INTEGER DEFAULT 0,
    dispositivos_eliminados INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rotation_runs_ejecutado
    ON gestion.rotation_runs (ejecutado_el DESC);

-- 3. Flags de notificación anticipada de rotación (idempotencia por periodo)
ALTER TABLE gestion.rotation_state
    ADD COLUMN IF NOT EXISTS notificado_el TIMESTAMP,
    ADD COLUMN IF NOT EXISTS notificado_cuatrimestre SMALLINT,
    ADD COLUMN IF NOT EXISTS notificado_anio INTEGER;

COMMIT;
