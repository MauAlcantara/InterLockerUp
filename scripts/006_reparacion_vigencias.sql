-- ============================================================================
-- 006_reparacion_vigencias.sql — Reparación de fecha_vencimiento erróneas
-- Causas:
--   a) setMonth(+6)  → vigencia de 6 meses en vez del fin del cuatrimestre
--   b) '2025-12-31'  → fecha hardcodeada como fallback
--
-- Solo toca asignaciones ACTIVAS cuya fecha_vencimiento coincide con el
-- patrón del bug (fecha_inicio + 6 meses). No toca fechas customizadas
-- conscientemente ni asignaciones ya finalizadas. Idempotente.
-- ============================================================================

BEGIN;

-- a) Patrón setMonth(+6): fecha_vencimiento ≈ fecha_inicio + 6 meses
--    (comparación a nivel de fecha: los segundos fraccionarios del timestamp
--     original hacen fallar una igualdad exacta)
UPDATE gestion.assignments
SET fecha_vencimiento = CASE
        WHEN EXTRACT(MONTH FROM fecha_inicio) BETWEEN 1 AND 4
            THEN (EXTRACT(YEAR FROM fecha_inicio) || '-04-30 23:59:59')::timestamp
        ELSE
            (EXTRACT(YEAR FROM fecha_inicio) || '-12-31 23:59:59')::timestamp
    END
WHERE status IN ('activa', 'activo', 'active')
  AND fecha_vencimiento::date = (fecha_inicio + interval '6 months')::date;

-- b) Patrón hardcodeado: fecha_vencimiento = 2025-12-31 (fallback del bug)
UPDATE gestion.assignments
SET fecha_vencimiento = CASE
        WHEN EXTRACT(MONTH FROM fecha_inicio) BETWEEN 1 AND 4
            THEN (EXTRACT(YEAR FROM fecha_inicio) || '-04-30 23:59:59')::timestamp
        ELSE
            (EXTRACT(YEAR FROM fecha_inicio) || '-12-31 23:59:59')::timestamp
    END
WHERE status IN ('activa', 'activo', 'active')
  AND fecha_vencimiento::date = '2025-12-31';

COMMIT;

-- Verificación: no debe quedar ninguna activa con el patrón +6 meses
-- ni con la fecha hardcodeada
SELECT id, locker_id, fecha_inicio, fecha_vencimiento, status
FROM gestion.assignments
WHERE status IN ('activa', 'activo', 'active')
  AND (fecha_vencimiento::date = (fecha_inicio + interval '6 months')::date
       OR fecha_vencimiento::date = '2025-12-31');
