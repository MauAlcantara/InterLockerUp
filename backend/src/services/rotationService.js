// ============================================================================
// rotationService.js — Rotación por cuatrimestre y limpieza de registros
//
// Cuatrimestre 1: ene–abr | Cuatrimestre 2: sep–dic
// Meses 5–8 (vacaciones): pertenecen al cuatrimestre 2 del mismo año.
//
// Todas las funciones son idempotentes y seguras de re-ejecutar.
// ============================================================================

const db = require('../config/db');
const { sendEmail } = require('../config/mailer');

// Retenciones configurables (días)
const RETENTION = {
    accessLogs: parseInt(process.env.ACCESS_LOG_RETENTION_DAYS || '365', 10),   // 12 meses
    notifications: parseInt(process.env.NOTIF_RETENTION_DAYS || '180', 10),      // 6 meses
    iotCommands: parseInt(process.env.IOT_CMD_RETENTION_DAYS || '1', 10),       // 1 día
    requestGrace: parseInt(process.env.REQUEST_GRACE_DAYS || '30', 10),         // 30 días
    requestsDone: parseInt(process.env.REQUESTS_DONE_RETENTION_DAYS || '180', 10),  // 6 meses
    securityLogs: parseInt(process.env.SECURITY_LOG_RETENTION_DAYS || '365', 10), // 12 meses
    incidentsDone: parseInt(process.env.INCIDENTS_DONE_RETENTION_DAYS || '720', 10), // 2 años
    userDevicesIdle: parseInt(process.env.USER_DEVICES_IDLE_DAYS || '365', 10),   // 1 año
    noticeDays: parseInt(process.env.ROTATION_NOTICE_DAYS || '30', 10),           // 30 días de anticipación
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
        `SELECT cuatrimestre, anio, cerrado_el,
                notificado_el, notificado_cuatrimestre, notificado_anio
         FROM gestion.rotation_state WHERE id = 1`
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

    // 8. Solicitudes ya resueltas (obsoletas por la rotación)
    const solicitudesObsoletas = await db.query(
        `DELETE FROM gestion.locker_requests
         WHERE status IN ('rejected', 'cancelled', 'accepted')
           AND created_at < NOW() - ($1 || ' days')::interval
         RETURNING 1`,
        [RETENTION.requestsDone]
    );
    resumen.solicitudesObsoletasEliminadas = solicitudesObsoletas.rowCount;

    // 9. Logs de seguridad obsoletos
    const securityLogs = await db.query(
        'DELETE FROM iot.security_logs WHERE created_at < NOW() - ($1 || \' days\')::interval RETURNING 1',
        [RETENTION.securityLogs]
    );
    resumen.securityLogsEliminados = securityLogs.rowCount;

    // 10. Incidentes resueltos (histórico/auditoría)
    const incidentes = await db.query(
        `DELETE FROM gestion.incidents
         WHERE estado = 'resuelta'
           AND created_at < NOW() - ($1 || ' days')::interval
         RETURNING 1`,
        [RETENTION.incidentsDone]
    );
    resumen.incidentesEliminados = incidentes.rowCount;

    // 11. Dispositivos huérfanos (sin sesión activa y sin uso reciente)
    const dispositivos = await db.query(
        `DELETE FROM gestion.user_devices ud
         WHERE ud.fecha_registro < NOW() - ($1 || ' days')::interval
           AND NOT EXISTS (SELECT 1 FROM gestion.user_sessions s WHERE s.user_id = ud.user_id)
         RETURNING 1`,
        [RETENTION.userDevicesIdle]
    );
    resumen.dispositivosEliminados = dispositivos.rowCount;

    // 12. Detección de cambio de cuatrimestre
    const estado = await getEstadoRotacion();
    const actual = cuatrimestreActual();
    if (!estado) {
        // Primera ejecución: solo registrar el periodo vigente, no cerrar nada
        await marcarEstado(actual);
    } else if (estado.cuatrimestre !== actual.n || estado.anio !== actual.anio) {
        const r = await cerrarPeriodo({ n: estado.cuatrimestre, anio: estado.anio });
        resumen.periodoCerrado = r.periodoCerrado;
    }

    // 13. Persistir la corrida en el historial (rotation_runs)
    await db.query(
        `INSERT INTO gestion.rotation_runs (
            periodo_vigente_cuatrimestre, periodo_vigente_anio, periodo_cerrado,
            asignaciones_finalizadas, solicitudes_rechazadas, tokens_eliminados,
            sesiones_eliminadas, iot_comandos_eliminados, notificaciones_eliminadas,
            logs_eliminados, solicitudes_obsoletas_eliminadas, security_logs_eliminados,
            incidentes_eliminados, dispositivos_eliminados
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [actual.n, actual.anio, resumen.periodoCerrado,
         resumen.asignacionesFinalizadas, resumen.solicitudesRechazadas, resumen.tokensEliminados,
         resumen.sesionesEliminadas, resumen.iotComandosEliminados, resumen.notificacionesEliminadas,
         resumen.logsEliminados, resumen.solicitudesObsoletasEliminadas, resumen.securityLogsEliminados,
         resumen.incidentesEliminados, resumen.dispositivosEliminados]
    ).catch(err => console.error('⚠️ No se pudo registrar rotation_runs:', err.message));

    return resumen;
}

/* ============================================================================
   NOTIFICACIÓN ANTICIPADA DE ROTACIÓN
   - Se ejecuta una sola vez por cuatrimestre, cuando faltan <= noticeDays días
     para el fin del periodo.
   - Inserta una notificación global (campanita del frontend/admin) y envía
     email a cada usuario con asignación activa del periodo vigente.
   - Idempotente: guarda notificado_el/notificado_cuatrimestre/notificado_anio
     en rotation_state.
   ========================================================================= */
async function notificarRotacion() {
    const actual = cuatrimestreActual();
    const fin = finDeCuatrimestre(actual.n, actual.anio);
    const diasRestantes = Math.floor((new Date(fin) - Date.now()) / 86400000);

    if (diasRestantes > RETENTION.noticeDays) {
        return { enviada: false, motivo: 'fuera de la ventana de anticipación', diasRestantes };
    }

    const estado = await getEstadoRotacion();
    if (estado && estado.notificado_el
        && estado.notificado_cuatrimestre === actual.n
        && estado.notificado_anio === actual.anio) {
        return { enviada: false, motivo: 'ya notificada en este periodo', diasRestantes };
    }

    // Usuarios con casillero activo en el periodo vigente
    const { rows: afectados } = await db.query(
        `SELECT u.id, u.email, u.nombre_completo, l.identificador
         FROM gestion.assignments a
         JOIN gestion.assignment_users au ON au.assignment_id = a.id
         JOIN gestion.users u ON u.id = au.user_id
         LEFT JOIN gestion.lockers l ON l.id = a.locker_id
         WHERE a.status IN ${ACTIVOS}
           AND a.cuatrimestre = $1
           AND a.anio_cuatrimestre = $2`,
        [actual.n, actual.anio]
    );

    const fechaCierre = new Date(fin).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    const mensaje = `🔄 Rotación de lockers: el periodo ${actual.anio}-${actual.n} cierra el ${fechaCierre}. Tu casillero se liberará esa fecha; renueva tu solicitud antes de entonces para no perder tu lugar.`;

    // Notificación global (campanita del frontend y del admin)
    await db.query(
        `INSERT INTO gestion.notifications (user_id, mensaje, es_global, tipo)
         VALUES (NULL, $1, TRUE, 'rotacion')`,
        [mensaje]
    );

    // Emails individuales (usa el helper de mailer; en dev solo loguea)
    const appUrl = process.env.APP_URL || '';
    let enviados = 0, errores = 0;
    for (const u of afectados) {
        if (!u.email) { errores++; continue; }
        try {
            const html = `
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
                  <h2 style="color:#111827">🔄 Rotación de casilleros</h2>
                  <p style="color:#374151">Hola <strong>${u.nombre_completo || 'estudiante'}</strong>:</p>
                  <p style="color:#374151">El periodo <strong>${actual.anio}-${actual.n}</strong> cierra el <strong>${fechaCierre}</strong>.</p>
                  <p style="color:#374151">Tu casillero <strong>${u.identificador || 'asignado'}</strong> se liberará esa fecha. <strong>Renueva tu solicitud</strong> antes de entonces para conservar tu lugar.</p>
                  ${appUrl ? `<p><a href="${appUrl}" style="color:#2563eb">Abrir InterLockerUp</a></p>` : ''}
                  <p style="color:#9ca3af;font-size:12px">InterLockerUp — Sistema de gestión de casilleros</p>
                </div>`;
            await sendEmail({ to: u.email, subject: `🔄 Rotación de lockers: cierre el ${fechaCierre}`, html });
            enviados++;
        } catch (err) {
            errores++;
            console.error(`⚠️ Email fallido para ${u.email}:`, err.message);
        }
    }

    // Marcar como notificada este periodo (idempotencia; upsert por si no existe la fila)
    await db.query(
        `INSERT INTO gestion.rotation_state
             (id, cuatrimestre, anio, notificado_el, notificado_cuatrimestre, notificado_anio, actualizado_el)
         VALUES (1, $1, $2, NOW(), $1, $2, NOW())
         ON CONFLICT (id) DO UPDATE
         SET notificado_el = NOW(),
             notificado_cuatrimestre = EXCLUDED.notificado_cuatrimestre,
             notificado_anio = EXCLUDED.notificado_anio,
             actualizado_el = NOW()`,
        [actual.n, actual.anio]
    );

    return {
        enviada: true,
        periodo: `${actual.anio}-${actual.n}`,
        diasRestantes,
        afectados: afectados.length,
        emailsEnviados: enviados,
        emailsFallidos: errores,
    };
}

/* ============================================================================
   DASHBOARD DE ROTACIÓN (panel de administrador)
   Un solo payload con el estado del periodo vigente, casilleros,
   solicitudes, notificación anticipada y el historial de limpiezas.
   ========================================================================= */
async function getDashboardRotacion() {
    const actual = cuatrimestreActual();
    const fin = finDeCuatrimestre(actual.n, actual.anio);
    const diasRestantes = Math.max(0, Math.floor((new Date(fin) - Date.now()) / 86400000));

    const [estado, asig, casilleros, solPendientes, solResueltas, usuarios, ultimaRun, ultimoCierre] = await Promise.all([
        getEstadoRotacion(),
        db.query(`SELECT COUNT(*) AS total FROM gestion.assignments WHERE status IN ${ACTIVOS}`),
        db.query(`SELECT estado, COUNT(*) AS total FROM gestion.lockers GROUP BY estado`),
        db.query(`SELECT COUNT(*) AS total FROM gestion.locker_requests WHERE status = 'pending'`),
        db.query(`SELECT COUNT(*) AS total FROM gestion.locker_requests WHERE status IN ('rejected', 'cancelled', 'accepted')`),
        db.query(`SELECT COUNT(DISTINCT au.user_id) AS total
                  FROM gestion.assignments a
                  JOIN gestion.assignment_users au ON au.assignment_id = a.id
                  WHERE a.status IN ${ACTIVOS}`),
        db.query(`SELECT * FROM gestion.rotation_runs ORDER BY id DESC LIMIT 1`),
        db.query(`SELECT * FROM gestion.rotation_runs WHERE periodo_cerrado IS NOT NULL ORDER BY id DESC LIMIT 1`),
    ]);

    return {
        periodoVigente: {
            cuatrimestre: actual.n,
            anio: actual.anio,
            cierra_el: fin,
            diasRestantes,
        },
        asignacionesActivas: asig.rows[0].total,
        usuariosConCasillero: usuarios.rows[0].total,
        casilleros: Object.fromEntries(casilleros.rows.map(r => [r.estado, r.total])),
        solicitudesPendientes: solPendientes.rows[0].total,
        solicitudesResueltas: solResueltas.rows[0].total,
        notificacionAnticipada: estado && estado.notificado_el
            ? {
                enviada: true,
                enviada_el: estado.notificado_el,
                periodo: `${estado.notificado_anio}-${estado.notificado_cuatrimestre}`,
            }
            : { enviada: false },
        ultimaLimpieza: ultimaRun.rows[0] || null,
        ultimoPeriodoCerrado: ultimoCierre.rows[0] || null,
        estadoRotacion: estado,
    };
}

/**
 * Resumen ligero de la rotación para el frontend de estudiantes
 * (banner informativo en la pantalla de solicitud).
 */
async function getResumenRotacion() {
    const actual = cuatrimestreActual();
    const fin = finDeCuatrimestre(actual.n, actual.anio);
    const diasRestantes = Math.max(0, Math.floor((new Date(fin) - Date.now()) / 86400000));
    const estado = await getEstadoRotacion();
    return {
        periodo: {
            cuatrimestre: actual.n,
            anio: actual.anio,
            cierra_el: fin,
            diasRestantes,
        },
        notificacionEnviada: !!(estado && estado.notificado_el),
    };
}

module.exports = {
    cuatrimestreActual,
    finDeCuatrimestre,
    vigenciaPara,
    getEstadoRotacion,
    getResumenRotacion,
    marcarEstado,
    cerrarPeriodo,
    finalizarVencidas,
    limpiezaDiaria,
    notificarRotacion,
    getDashboardRotacion,
    RETENTION,
};
