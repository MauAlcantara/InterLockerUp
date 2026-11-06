const db = require('../config/db');

// ── Umbrales configurables vía .env (con valores por defecto) ──────────────
const TEMP_MIN = Number.parseFloat(process.env.IOT_TEMP_MIN || '10');      // °C
const TEMP_MAX = Number.parseFloat(process.env.IOT_TEMP_MAX || '40');      // °C
const VIBRACION_MAX = Number.parseFloat(process.env.IOT_VIBRACION_MAX || '500'); // mg/s²
const OFFLINE_MINUTES = Number.parseInt(process.env.IOT_OFFLINE_MINUTES || '10');

const SENSORES_VALIDOS = ['temperatura', 'vibracion', 'puerta_abierta', 'humedad', 'iluminacion'];

// Inserta una alerta solo si no existe una alerta pendiente del mismo tipo
// para el mismo locker (evita duplicados mientras siga la condición).
async function crearAlerta(client, locker_id, tipo, severidad, mensaje) {
    const existe = await client.query(
        `SELECT 1 FROM iot.iot_alerts
         WHERE locker_id = $1 AND tipo = $2 AND resuelta = FALSE`,
        [locker_id, tipo]
    );
    if (existe.rowCount > 0) return 0;

    await client.query(
        `INSERT INTO iot.iot_alerts (locker_id, tipo, severidad, mensaje)
         VALUES ($1, $2, $3, $4)`,
        [locker_id, tipo, severidad, mensaje]
    );
    return 1;
}

// Evalúa los umbrales de los sensores recibidos y genera alertas.
// Devuelve la lista de alertas generadas en esta telemetría.
async function evaluarSensores(client, locker_id, sensors) {
    const alertas = [];

    for (const s of sensors) {
        if (s.sensor === 'temperatura') {
            if (Number(s.valor) > TEMP_MAX) {
                if (await crearAlerta(client, locker_id, 'temperatura', 'critical',
                    `Temperatura elevada en el locker: ${s.valor}${s.unidad || '°C'} (máx. ${TEMP_MAX}°C)`)) {
                    alertas.push({ tipo: 'temperatura', severidad: 'critical' });
                }
            } else if (Number(s.valor) < TEMP_MIN) {
                if (await crearAlerta(client, locker_id, 'temperatura', 'warning',
                    `Temperatura baja en el locker: ${s.valor}${s.unidad || '°C'} (mín. ${TEMP_MIN}°C)`)) {
                    alertas.push({ tipo: 'temperatura', severidad: 'warning' });
                }
            }
        } else if (s.sensor === 'vibracion') {
            if (Number(s.valor) > VIBRACION_MAX) {
                if (await crearAlerta(client, locker_id, 'vibracion', 'critical',
                    `Vibración anómala en el locker: ${s.valor}${s.unidad || ''} (umbral ${VIBRACION_MAX})`)) {
                    alertas.push({ tipo: 'vibracion', severidad: 'critical' });
                }
            }
        } else if (s.sensor === 'puerta_abierta') {
            if (Number(s.valor) > 0) {
                if (await crearAlerta(client, locker_id, 'puerta_abierta', 'warning',
                    'Sensor reporta la puerta del locker abierta sin acceso registrado')) {
                    alertas.push({ tipo: 'puerta_abierta', severidad: 'warning' });
                }
            }
        }
    }

    return alertas;
}

// ── POST /api/iot/telemetry ────────────────────────────────────────────────
// El ESP32 envía: { locker_id, device_id, sensors: [{sensor, valor, unidad}], battery, firmware }
// Registra el dispositivo (upsert), guarda las lecturas y genera alertas por
// umbral. Protegida por iotAntiReplay (firma HMAC + anti-replay).
async function registrarTelemetria(req, res) {
    const { locker_id, device_id, sensors = [], battery, firmware } = req.body;

    const invalidos = sensors.filter(s => !SENSORES_VALIDOS.includes(s.sensor));
    if (invalidos.length > 0) {
        return res.status(400).json({ error: `Sensores no válidos: ${invalidos.map(s => s.sensor).join(', ')}` });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1) Registrar/actualizar el dispositivo (queda "online")
        await client.query(
            `INSERT INTO iot.iot_devices (locker_id, device_id, estado, last_seen, battery, firmware)
             VALUES ($1, $2, 'online', NOW(), $3, $4)
             ON CONFLICT (locker_id) DO UPDATE
             SET device_id = EXCLUDED.device_id,
                 estado = 'online',
                 last_seen = NOW(),
                 battery = COALESCE(EXCLUDED.battery, iot.iot_devices.battery),
                 firmware = COALESCE(EXCLUDED.firmware, iot.iot_devices.firmware)`,
            [locker_id, device_id, battery ?? null, firmware ?? null]
        );

        // 2) Guardar las lecturas de sensores
        for (const s of sensors) {
            await client.query(
                `INSERT INTO iot.sensor_readings (locker_id, device_id, sensor, valor, unidad)
                 VALUES ($1, $2, $3, $4, $5)`,
                [locker_id, device_id, s.sensor, s.valor, s.unidad ?? null]
            );
        }

        // 3) El dispositivo volvió a reportar: resolver alertas de conexión
        await resolverAlertasFueraLinea(client, locker_id);

        // 4) Evaluar umbrales y generar alertas
        const alertas = await evaluarSensores(client, locker_id, sensors);

        await client.query('COMMIT');

        res.status(201).json({
            mensaje: 'Telemetría registrada correctamente',
            locker_id,
            lecturas: sensors.length,
            alertas_generadas: alertas
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error registrando telemetría:', err.message);
        res.status(500).json({ error: 'No se pudo registrar la telemetría' });
    } finally {
        client.release();
    }
}

// ── POST /api/iot/commands/:locker_id/:accion/confirm ──────────────────────
// El ESP32 confirma la ejecución de un actuador (apertura/cierre) tras
// ejecutar una orden pendiente de iot_commands.
async function confirmarAccion(req, res) {
    const { locker_id, accion } = req.params;

    const client = await db.connect();
    try {
        const r = await client.query(
            `UPDATE iot.iot_commands
             SET ejecutado = TRUE
             WHERE locker_id = $1 AND accion = $2 AND ejecutado = FALSE
             RETURNING id`,
            [locker_id, accion]
        );

        if (r.rowCount === 0) {
            return res.status(404).json({ error: 'No hay una orden pendiente para confirmar' });
        }

        res.json({ mensaje: 'Orden de actuador confirmada', command_id: r.rows[0].id });
    } catch (err) {
        console.error('Error confirmando orden de actuador:', err.message);
        res.status(500).json({ error: 'No se pudo confirmar la orden' });
    } finally {
        client.release();
    }
}

// ── Detección de dispositivos fuera de línea ───────────────────────────────
// Marca como offline a los dispositivos cuyo last_seen es anterior a
// OFFLINE_MINUTES y genera una alerta "fuera_linea" si no existe una pendiente.
// Pensado para ejecutarse por cron (node-cron) en el servidor.
async function evaluarOffline() {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const r = await client.query(
            `UPDATE iot.iot_devices
             SET estado = 'offline'
             WHERE estado = 'online'
               AND last_seen < NOW() - (INTERVAL '1 minute' * $1)`,
            [OFFLINE_MINUTES]
        );

        const alertas = await client.query(
            `INSERT INTO iot.iot_alerts (locker_id, tipo, severidad, mensaje)
             SELECT d.locker_id, 'fuera_linea', 'critical',
                    'El dispositivo IoT del locker dejó de reportar telemetría'
               FROM iot.iot_devices d
              WHERE d.estado = 'offline'
                AND NOT EXISTS (
                    SELECT 1 FROM iot.iot_alerts a
                    WHERE a.locker_id = d.locker_id AND a.tipo = 'fuera_linea' AND a.resuelta = FALSE
                )`
        );

        await client.query('COMMIT');
        return { dispositivos_offline: r.rowCount, alertas_generadas: alertas.rowCount };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error evaluando dispositivos offline:', err.message);
        return { error: err.message };
    } finally {
        client.release();
    }
}

// Cuando un dispositivo vuelve a reportar, se resuelven sus alertas
// "fuera_linea" pendientes.
// Funciona tanto con una transacción (client) como con el pool.
async function resolverAlertasFueraLinea(client, locker_id) {
    return client.query(
        `UPDATE iot.iot_alerts
         SET resuelta = TRUE
         WHERE locker_id = $1 AND tipo = 'fuera_linea' AND resuelta = FALSE`,
        [locker_id]
    );
}

// ── GET /api/iot/status ───────────────────────────────────────────────────
// Estado de conectividad de los dispositivos IoT por locker (solo admin).
// Un dispositivo se considera "online" si está marcado online y su última
// señal es reciente (menor a OFFLINE_MINUTES).
async function estadoConectividad(req, res) {
    try {
        const r = await db.query(
            `SELECT l.id AS locker_id,
                    l.identificador,
                    d.device_id,
                    d.estado,
                    d.last_seen,
                    d.battery,
                    d.firmware
             FROM gestion.lockers l
             LEFT JOIN iot.iot_devices d ON d.locker_id = l.id
             ORDER BY l.identificador`
        );

        const ahora = Date.now();
        const dispositivos = r.rows.map(d => {
            const sinSenalReciente = d.last_seen
                ? ahora - new Date(d.last_seen).getTime() > OFFLINE_MINUTES * 60000
                : false;
            return {
                ...d,
                online: d.estado === 'online' && !sinSenalReciente
            };
        });

        const resumen = {
            total_lockers: dispositivos.length,
            con_dispositivo: dispositivos.filter(d => d.device_id).length,
            online: dispositivos.filter(d => d.online).length,
            offline: dispositivos.filter(d => d.device_id && !d.online).length,
            sin_dispositivo: dispositivos.filter(d => !d.device_id).length
        };

        res.json({ resumen, dispositivos });
    } catch (err) {
        console.error('Error consultando estado IoT:', err.message);
        res.status(500).json({ error: 'No se pudo consultar el estado IoT' });
    }
}

// ── Monitoreo de sensores y actuadores (solo admin) ──────────────────────

// Lectura más reciente de cada sensor de cada locker.
const sensoresMasRecientes = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT DISTINCT ON (s.locker_id, s.sensor)
                   s.locker_id,
                   l.identificador,
                   s.sensor,
                   s.valor,
                   s.unidad,
                   s.created_at
            FROM iot.sensor_readings s
            LEFT JOIN gestion.lockers l ON l.id = s.locker_id
            ORDER BY s.locker_id, s.sensor, s.created_at DESC
        `);
        res.json({ lecturas: result.rows });
    } catch (err) {
        console.error('Error consultando sensores recientes:', err.message);
        res.status(500).json({ error: 'No se pudo consultar las lecturas de sensores' });
    }
};

// Historial de lecturas de un locker (más recientes primero).
const historialSensores = async (req, res) => {
    try {
        const { locker_id } = req.params;
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit) || 100, 1), 500);
        const result = await db.query(
            `SELECT sensor, valor, unidad, created_at
             FROM iot.sensor_readings
             WHERE locker_id = $1
             ORDER BY created_at DESC, id DESC
             LIMIT $2`,
            [locker_id, limit]
        );
        res.json({ locker_id: Number(locker_id), lecturas: result.rows });
    } catch (err) {
        console.error('Error consultando historial de sensores:', err.message);
        res.status(500).json({ error: 'No se pudo consultar el historial de sensores' });
    }
};

// Comandos de actuadores (desbloqueo/bloqueo) de un locker con resumen.
const comandosActuadores = async (req, res) => {
    try {
        const { locker_id } = req.params;
        const result = await db.query(
            `SELECT id, accion, ejecutado, creado_en
             FROM iot.iot_commands
             WHERE locker_id = $1
             ORDER BY creado_en DESC, id DESC
             LIMIT 50`,
            [locker_id]
        );
        const pendientes = result.rows.filter(c => !c.ejecutado).length;
        const ejecutados = result.rows.length - pendientes;
        res.json({
            locker_id: Number(locker_id),
            resumen: { pendientes, ejecutados },
            comandos: result.rows
        });
    } catch (err) {
        console.error('Error consultando comandos de actuadores:', err.message);
        res.status(500).json({ error: 'No se pudo consultar los comandos de actuadores' });
    }
};

// ── Panel de monitoreo unificado (solo admin) ────────────────────────────

// Combina conectividad, estado del locker, lecturas recientes de sensores y
// alertas pendientes en una sola vista por locker.
const panelMonitoreo = async (req, res) => {
    try {
        const lockers = await db.query(`
            SELECT l.id, l.identificador, l.estado::text AS estado, l.ubicacion_detallada, l.floor,
                   b.name AS edificio,
                   d.device_id, d.estado AS dispositivo_estado, d.last_seen, d.battery
            FROM gestion.lockers l
            LEFT JOIN gestion.buildings b ON l.building_id = b.id
            LEFT JOIN iot.iot_devices d ON d.locker_id = l.id
            ORDER BY l.identificador ASC
        `);

        const sensores = await db.query(`
            SELECT DISTINCT ON (s.locker_id, s.sensor)
                   s.locker_id, s.sensor, s.valor, s.unidad, s.created_at
            FROM iot.sensor_readings s
            ORDER BY s.locker_id, s.sensor, s.created_at DESC
        `);

        const alertas = await db.query(`
            SELECT locker_id,
                   COUNT(*) FILTER (WHERE resuelta = FALSE) AS pendientes,
                   COUNT(*) FILTER (WHERE resuelta = FALSE AND severidad = 'critical') AS criticas
            FROM iot.iot_alerts
            GROUP BY locker_id
        `);

        const sensoresPorLocker = {};
        for (const s of sensores.rows) {
            (sensoresPorLocker[s.locker_id] ??= {})[s.sensor] = s;
        }
        const alertasPorLocker = {};
        for (const a of alertas.rows) {
            alertasPorLocker[a.locker_id] = { pendientes: Number(a.pendientes), criticas: Number(a.criticas) };
        }

        const ahora = Date.now();
        const limiteOffline = OFFLINE_MINUTES * 60 * 1000;

        const filas = lockers.rows.map(l => {
            const online = l.dispositivo_estado === 'online' &&
                l.last_seen !== null && (ahora - new Date(l.last_seen).getTime()) <= limiteOffline;
            return {
                id: l.id,
                identificador: l.identificador,
                estado: l.estado,
                edificio: l.edificio,
                piso: l.floor,
                ubicacion: l.ubicacion_detallada,
                device_id: l.device_id,
                online,
                last_seen: l.last_seen,
                battery: l.battery,
                sensores: sensoresPorLocker[l.id] ?? {},
                alertas: alertasPorLocker[l.id] ?? { pendientes: 0, criticas: 0 }
            };
        });

        const online = filas.filter(f => f.online).length;
        const sinDispositivo = filas.filter(f => !f.device_id).length;
        const offline = filas.length - online - sinDispositivo;

        res.json({
            resumen: {
                total_lockers: filas.length,
                online,
                offline,
                sin_dispositivo: sinDispositivo,
                alertas_pendientes: filas.reduce((acc, f) => acc + f.alertas.pendientes, 0),
                alertas_criticas: filas.reduce((acc, f) => acc + f.alertas.criticas, 0)
            },
            lockers: filas
        });
    } catch (err) {
        console.error('Error consultando panel de monitoreo:', err.message);
        res.status(500).json({ error: 'No se pudo consultar el panel de monitoreo' });
    }
};

// ── Alertas IoT (solo admin) ──────────────────────────────────────────────

// Lista de alertas con filtro por estado de resolución y resumen.
const alertasIoT = async (req, res) => {
    try {
        // resueltas: 'false' (pendientes, por defecto), 'true' o 'all'
        const filtro = req.query.resueltas;
        const soloPendientes = filtro === 'false';
        const soloResueltas = filtro === 'true';

        const result = await db.query(
            `SELECT a.id, a.locker_id, l.identificador, a.tipo, a.severidad,
                    a.mensaje, a.resuelta, a.created_at
             FROM iot.iot_alerts a
             LEFT JOIN gestion.lockers l ON l.id = a.locker_id
             WHERE ($1::boolean IS NULL OR a.resuelta = $1::boolean)
             ORDER BY a.created_at DESC, a.id DESC
             LIMIT 200`,
            [soloPendientes ? false : soloResueltas ? true : null]
        );

        const resueltas = result.rows.filter(a => a.resuelta).length;
        const criticas = result.rows.filter(a => a.severidad === 'critical').length;
        res.json({
            resumen: {
                total: result.rows.length,
                resueltas,
                pendientes: result.rows.length - resueltas,
                criticas
            },
            alertas: result.rows
        });
    } catch (err) {
        console.error('Error consultando alertas IoT:', err.message);
        res.status(500).json({ error: 'No se pudo consultar las alertas IoT' });
    }
};

// Marca una alerta como resuelta.
const resolverAlerta = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `UPDATE iot.iot_alerts SET resuelta = TRUE
             WHERE id = $1 AND resuelta = FALSE`,
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Alerta no encontrada o ya resuelta' });
        }
        res.json({ id: Number(id), resuelta: true });
    } catch (err) {
        console.error('Error resolviendo alerta:', err.message);
        res.status(500).json({ error: 'No se pudo resolver la alerta' });
    }
};

module.exports = {
    registrarTelemetria,
    confirmarAccion,
    evaluarOffline,
    resolverAlertasFueraLinea,
    estadoConectividad,
    sensoresMasRecientes,
    historialSensores,
    comandosActuadores,
    alertasIoT,
    resolverAlerta,
    panelMonitoreo,
    SENSORES_VALIDOS,
    OFFLINE_MINUTES
};
