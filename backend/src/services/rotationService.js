// ============================================================================
// rotationService.js — Rotación por cuatrimestre y limpieza de registros
//
// Cuatrimestre 1: ene–abr | Cuatrimestre 2: sep–dic
// Meses 5–8 (vacaciones): pertenecen al cuatrimestre 2 del mismo año.
//
// Todas las funciones son idempotentes y seguras de re-ejecutar.
// ============================================================================

const db = require('../config/db');

// Retenciones configurables (días)
const RETENTION = {
    accessLogs: parseInt(process.env.ACCESS_LOG_RETENTION_DAYS || '365', 10),   // 12 meses
    notifications: parseInt(process.env.NOTIF_RETENTION_DAYS || '180', 10),      // 6 meses
    iotCommands: parseInt(process.env.IOT_CMD_RETENTION_DAYS || '1', 10),       // 1 día
    requestGrace: parseInt(process.env.REQUEST_GRACE_DAYS || '30', 10),         // 30 días
};

// Los valores históricos de status en producción son 'activa' y 'finalizado';
// se incluyen variantes por seguridad.
const ACTIVOS = "('activa','activo','active')";

// Lock advisory único para serializar operaciones de rotación
const LOCK_ID = 7301;

/**
 * Cuatrimestre actual: 1 = ene–abr, 2 = may–dic (may–ago = vacaciones,
 * cuenta para el periodo 2 que está por comenzar).
 */
function cuatrimestreActual(fecha = new Date()) {
    const mes = fecha.getMonth() + 1;
    return { n: mes >= 5 ? 2 : 1, anio: fecha.getFullYear() };
}

/**
 * Fin del cuatrimestre como timestamp (23:59:59).
 * Se devuelve como string 'YYYY-MM-DD 23:59:59' para que PostgreSQL lo
 * interprete en su zona (timestamp without time zone), sin ambiguedad UTC/local.
 */
function finDeCuatrimestre(n, anio) {
    return `${anio}-${n === 1 ? '04-30' : '12-31'} 23:59:59`;
}

/**
 * Vigencia correcta para una asignación que inicia en `fechaInicio`.
 * Meses 1–4 → 31-mar del año. Meses 5–12 → 31-dic del año.
 */
function vigenciaPara(fechaInicio) {
    const mes = fechaInicio.getMonth() + 1;
    return finDeCuatrimestre(mes >= 5 ? 2 : 1, fechaInicio.getFullYear());
}

/**
 * Estado guardado de la rotación (supervive reinicios).
 */
async function getEstadoRotacion() {
    const { rows } = await db.query(
        'SELECT cuatrimestre, anio, cerrado_el FROM gestion.rotation_state WHERE id = 1'
    );
    return rows[0] || null;
}

/**
 * Inicializa el estado con el periodo actual SIN cerrar nada.
 */
async function marcarEstado({ n, anio }) {
    await db.query(
        `INSERT INTO gestion.rotation_state (id, cuatrimestre, anio, cerrado_el, actualizado_el)
         VALUES (1, $1, $2, NULL, NOW())
         ON CONFLICT (id) DO UPDATE
         SET cuatrimestre = EXCLUDED.cuatrimestre,
             anio = EXCLUDED.anio,
             actualizado_el = NOW()`,
        [n, anio]
    );
}

/**
 * Cierra un periodo: finaliza sus asignaciones activas, rechaza sus
 * solicitudes pendientes/aprobadas y libera los casilleros sin uso activo.
 * Idempotente.
 */
async function cerrarPeriodo(periodoCerrado) {
    const actual = cuatrimestreActual();
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);

        // 1. Finalizar asignaciones activas del periodo cerrado
        const fin = await client.query(
            `UPDATE gestion.assignments
             SET status = 'finalizado'
             WHERE cuatrimestre = $1
               AND anio_cuatrimestre = $2
               AND status IN ${ACTIVOS}`,
            [periodoCerrado.n, periodoCerrado.anio]
        );

        // 2. Rechazar solicitudes del periodo cerrado que quedaron sin atender
        const sol = await client.query(
            `UPDATE gestion.locker_requests
             SET status = 'rejected'
             WHERE status IN ('pending', 'approved')
               AND (CASE WHEN EXTRACT(MONTH FROM created_at) >= 5 THEN 2 ELSE 1 END) = $1
               AND EXTRACT(YEAR FROM created_at) = $2`,
            [periodoCerrado.n, periodoCerrado.anio]
        );

        // 3. Liberar casilleros sin asignaciones activas (ocupado/proceso)
        const lib = await client.query(
            `UPDATE gestion.lockers l
             SET estado = 'disponible', updated_at = NOW()
             WHERE l.estado IN ('ocupado', 'proceso')
               AND NOT EXISTS (
                   SELECT 1 FROM gestion.assignments a
                   WHERE a.locker_id = l.id AND a.status IN ${ACTIVOS}
               )`
        );

        // 4. Actualizar estado: el periodo vigente pasa a ser el actual
        await client.query(
            `INSERT INTO gestion.rotation_state (id, cuatrimestre, anio, cerrado_el, actualizado_el)
             VALUES (1, $1, $2, NOW(), NOW())
             ON CONFLICT (id) DO UPDATE
             SET cuatrimestre = EXCLUDED.cuatrimestre,
                 anio = EXCLUDED.anio,
                 cerrado_el = NOW(),
                 actualizado_el = NOW()`,
            [actual.n, actual.anio]
        );

        await client.query('COMMIT');
        return {
            periodoCerrado: `${periodoCerrado.anio}-${periodoCerrado.n}`,
            asignacionesFinalizadas: fin.rowCount,
            solicitudesRechazadas: sol.rowCount,
            casillerosLibrados: lib.rowCount,
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

/**
 * Finaliza asignaciones cuya fecha_vencimiento ya pasó y libera los
 * casilleros que queden sin uso activo. Idempotente.
 */
async function finalizarVencidas() {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);

        const r = await client.query(
            `UPDATE gestion.assignments
             SET status = 'finalizado'
             WHERE status IN ${ACTIVOS}
               AND fecha_vencimiento < NOW()
             RETURNING locker_id`
        );

        const lockers = [...new Set(r.rows.map((x) => x.locker_id))];
        if (lockers.length > 0) {
            await client.query(
                `UPDATE gestion.lockers l
                 SET estado = 'disponible', updated_at = NOW()
                 WHERE l.id = ANY($1)
                   AND l.estado IN ('ocupado', 'proceso')
                   AND NOT EXISTS (
                       SELECT 1 FROM gestion.assignments a
                       WHERE a.locker_id = l.id AND a.status IN ${ACTIVOS}
                   )`,
                [lockers]
            );
        }

        await client.query('COMMIT');
        return r.rowCount;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

/**
 * Limpieza diaria de registros obsoletos. Retornos en `resumen`.
 */
async function limpiezaDiaria() {
    const resumen = {
        asignacionesFinalizadas: 0,
        solicitudesRechazadas: 0,
        tokensEliminados: 0,
        sesionesEliminadas: 0,
        iotComandosEliminados: 0,
        notificacionesEliminadas: 0,
        logsEliminados: 0,
        periodoCerrado: null,
    };

    // 1. Asignaciones vencidas
    resumen.asignacionesFinalizadas = await finalizarVencidas();

    // 2. Solicitudes pendientes con periodo de gracia agotado
    const sol = await db.query(
        `UPDATE gestion.locker_requests
         SET status = 'rejected'
         WHERE status = 'pending'
           AND created_at < NOW() - ($1 || ' days')::interval
         RETURNING locker_id`,
        [RETENTION.requestGrace]
    );
    resumen.solicitudesRechazadas = sol.rowCount;
    const lockersSol = [...new Set(sol.rows.map((x) => x.locker_id))];
    if (lockersSol.length > 0) {
        await db.query(
            `UPDATE gestion.lockers l
             SET estado = 'disponible', updated_at = NOW()
             WHERE l.id = ANY($1)
               AND l.estado = 'proceso'
               AND NOT EXISTS (
                   SELECT 1 FROM gestion.locker_requests lr
                   WHERE lr.locker_id = l.id AND lr.status = 'pending'
               )
               AND NOT EXISTS (
                   SELECT 1 FROM gestion.assignments a
                   WHERE a.locker_id = l.id AND a.status IN ${ACTIVOS}
               )`,
            [lockersSol]
        );
    }

    // 3. Tokens vencidos
    const pin = await db.query(
        'DELETE FROM iot.pin_tokens WHERE expires_at IS NOT NULL AND expires_at < NOW()'
    );
    const qr = await db.query(
        'DELETE FROM iot.qr_tokens WHERE expires_at < NOW()'
    );
    resumen.tokensEliminados = pin.rowCount + qr.rowCount;

    // 4. Sesiones de usuario expiradas
    const ses = await db.query(
        'DELETE FROM gestion.user_sessions WHERE expires_at < NOW()'
    );
    resumen.sesionesEliminadas = ses.rowCount;

    // 5. Comandos IoT viejos (cola operativa del ESP32)
    const iot = await db.query(
        'DELETE FROM iot.iot_commands WHERE creado_en < NOW() - ($1 || \' days\')::interval',
        [RETENTION.iotCommands]
    );
    resumen.iotComandosEliminados = iot.rowCount;

    // 6. Notificaciones viejas
    const not = await db.query(
        'DELETE FROM gestion.notifications WHERE created_at < NOW() - ($1 || \' days\')::interval',
        [RETENTION.notifications]
    );
    resumen.notificacionesEliminadas = not.rowCount;

    // 7. Logs de acceso (auditoría: retención larga)
    const logs = await db.query(
        'DELETE FROM iot.access_logs WHERE fecha_hora < NOW() - ($1 || \' days\')::interval',
        [RETENTION.accessLogs]
    );
    resumen.logsEliminados = logs.rowCount;

    // 8. Detección de cambio de cuatrimestre
    const estado = await getEstadoRotacion();
    const actual = cuatrimestreActual();
    if (!estado) {
        // Primera ejecución: solo registrar el periodo vigente, no cerrar nada
        await marcarEstado(actual);
    } else if (estado.cuatrimestre !== actual.n || estado.anio !== actual.anio) {
        const r = await cerrarPeriodo({ n: estado.cuatrimestre, anio: estado.anio });
        resumen.periodoCerrado = r.periodoCerrado;
    }

    return resumen;
}

module.exports = {
    cuatrimestreActual,
    finDeCuatrimestre,
    vigenciaPara,
    getEstadoRotacion,
    marcarEstado,
    cerrarPeriodo,
    finalizarVencidas,
    limpiezaDiaria,
    RETENTION,
};
