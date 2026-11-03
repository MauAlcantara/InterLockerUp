const db = require('../config/db');

// ── Umbrales configurables vía .env (con valores por defecto) ──────────────
const TEMP_MIN = parseFloat(process.env.IOT_TEMP_MIN || '10');      // °C
const TEMP_MAX = parseFloat(process.env.IOT_TEMP_MAX || '40');      // °C
const VIBRACION_MAX = parseFloat(process.env.IOT_VIBRACION_MAX || '500'); // mg/s²
const OFFLINE_MINUTES = parseInt(process.env.IOT_OFFLINE_MINUTES || '10');

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

module.exports = {
    registrarTelemetria,
    confirmarAccion,
    evaluarOffline,
    resolverAlertasFueraLinea,
    SENSORES_VALIDOS,
    OFFLINE_MINUTES
};
