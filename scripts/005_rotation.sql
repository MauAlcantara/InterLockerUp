-- ============================================================================
-- 005_rotation.sql — Rotación por cuatrimestre
-- Dependencias: estructura.sql
--
-- Cuatrimestre 1: ene–abr   |   Cuatrimestre 2: sep–dic
-- Meses 5–8 (vacaciones): la solicitud/uso pertenece al cuatrimestre 2
-- del mismo año (el que está por venir).
-- ============================================================================

-- 1. Registrar el cuatrimestre de cada asignación
ALTER TABLE gestion.assignments
    ADD COLUMN IF NOT EXISTS cuatrimestre SMALLINT,
    ADD COLUMN IF NOT EXISTS anio_cuatrimestre INTEGER;

-- 2. Backfill según fecha_inicio (meses 1–4 → 1, meses 5–12 → 2)
UPDATE gestion.assignments
SET
    cuatrimestre      = CASE WHEN EXTRACT(MONTH FROM fecha_inicio) BETWEEN 1 AND 4 THEN 1 ELSE 2 END,
    anio_cuatrimestre = EXTRACT(YEAR FROM fecha_inicio)
WHERE cuatrimestre IS NULL OR anio_cuatrimestre IS NULL;

-- 3. Estado de la rotación (una sola fila, upsert)
CREATE TABLE IF NOT EXISTS gestion.rotation_state (
    id             SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    cuatrimestre   SMALLINT NOT NULL,
    anio           INTEGER  NOT NULL,
    cerrado_el     TIMESTAMP,
    actualizado_el TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Índices para las consultas de rotación
CREATE INDEX IF NOT EXISTS idx_assignments_vencimiento
    ON gestion.assignments (fecha_vencimiento)
    WHERE status IN ('activa', 'activo', 'active');

CREATE INDEX IF NOT EXISTS idx_assignments_cuatrimestre
    ON gestion.assignments (cuatrimestre, anio_cuatrimestre);

CREATE INDEX IF NOT EXISTS idx_locker_requests_status
    ON gestion.locker_requests (status, created_at);

CREATE INDEX IF NOT EXISTS idx_access_logs_fecha
    ON iot.access_logs (fecha_hora);

CREATE INDEX IF NOT EXISTS idx_notifications_created
    ON gestion.notifications (created_at);
