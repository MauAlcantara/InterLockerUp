// backend/tests/iot-telemetry.test.js
// Pruebas de la integración IoT: telemetría del ESP32, umbrales, alertas,
// confirmación de actuadores y detección de dispositivos fuera de línea.
const crypto = require('crypto');

// ── Variables de entorno ANTES de cargar el módulo de BD ───────────────────
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'interlockerup_test';
process.env.IOT_SECRET_KEY = 'test-iot-secret';
process.env.IOT_TEMP_MIN = '10';
process.env.IOT_TEMP_MAX = '40';
process.env.IOT_VIBRACION_MAX = '500';
process.env.IOT_OFFLINE_MINUTES = '10';

const express = require('express');
const request = require('supertest');
const db = require('../src/config/db');

const LOCKER_ID = 46; // locker existente en la BD de pruebas (T-001)

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/iot', require('../src/routes/iotRoutes'));
    return app;
}

// El middleware iotAntiReplay lee timestamp/nonce/signature del body y firma
// solo el payload `${timestamp}:${nonce}` con HMAC-SHA256.
function cuerpoFirmado(cuerpo, nonce, signatureOverride = null) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signatureOverride ?? crypto
        .createHmac('sha256', process.env.IOT_SECRET_KEY)
        .update(`${timestamp}:${nonce}`)
        .digest('hex');
    return { ...cuerpo, timestamp, nonce, signature };
}

const cuerpoBase = {
    locker_id: LOCKER_ID,
    device_id: 'ESP32-T001',
    sensors: [{ sensor: 'temperatura', valor: 22.5, unidad: 'C' }],
    battery: 87.4,
    firmware: '1.2.0'
};

// Limpieza entre pruebas para que cada caso sea independiente
afterEach(async () => {
    await db.query('DELETE FROM iot.iot_alerts WHERE locker_id = $1', [LOCKER_ID]);
    await db.query('DELETE FROM iot.sensor_readings WHERE locker_id = $1', [LOCKER_ID]);
    await db.query('DELETE FROM iot.iot_devices WHERE locker_id = $1', [LOCKER_ID]);
    await db.query('DELETE FROM iot.iot_commands WHERE locker_id = $1', [LOCKER_ID]);
});

afterAll(async () => {
    await db.end();
});

describe('IoT: registro de telemetría (POST /api/iot/telemetry)', () => {
    const app = buildApp();

    test('telemetría válida registra el dispositivo como online y guarda lecturas', async () => {
        const res = await request(app)
            .post('/api/iot/telemetry')
            .send(cuerpoFirmado(cuerpoBase, `n1-${Date.now()}`));

        expect(res.status).toBe(201);
        expect(res.body.lecturas).toBe(1);

        const dev = await db.query('SELECT * FROM iot.iot_devices WHERE locker_id = $1', [LOCKER_ID]);
        expect(dev.rows.length).toBe(1);
        expect(dev.rows[0].estado).toBe('online');
        expect(dev.rows[0].device_id).toBe('ESP32-T001');
        expect(Number(dev.rows[0].battery)).toBe(87.4);

        const lecturas = await db.query(
            'SELECT * FROM iot.sensor_readings WHERE locker_id = $1', [LOCKER_ID]);
        expect(lecturas.rows.length).toBe(1);
        expect(lecturas.rows[0].sensor).toBe('temperatura');
        expect(Number(lecturas.rows[0].valor)).toBe(22.5);
    });

    test('firma inválida es rechazada con 403', async () => {
        const res = await request(app)
            .post('/api/iot/telemetry')
            .send(cuerpoFirmado(cuerpoBase, `n2-${Date.now()}`, 'falso'));

        expect(res.status).toBe(403);
        const dev = await db.query('SELECT * FROM iot.iot_devices WHERE locker_id = $1', [LOCKER_ID]);
        expect(dev.rows.length).toBe(0);
    });

    test('replay del mismo nonce es rechazado con 403', async () => {
        const nonce = `n3-${Date.now()}`;
        const firmado = cuerpoFirmado(cuerpoBase, nonce);

        const primera = await request(app).post('/api/iot/telemetry').send(firmado);
        expect(primera.status).toBe(201);

        const replay = await request(app).post('/api/iot/telemetry').send(firmado);
        expect(replay.status).toBe(403);
    });

    test('sensor no válido devuelve 400', async () => {
        const cuerpo = { ...cuerpoBase, sensors: [{ sensor: 'inexistente', valor: 1 }] };
        const res = await request(app)
            .post('/api/iot/telemetry')
            .send(cuerpoFirmado(cuerpo, `n4-${Date.now()}`));

        expect(res.status).toBe(400);
    });
});

describe('IoT: alertas por umbrales de sensores', () => {
    const app = buildApp();

    test('temperatura por encima del umbral genera alerta crítica', async () => {
        const cuerpo = {
            ...cuerpoBase,
            sensors: [{ sensor: 'temperatura', valor: 45, unidad: 'C' }]
        };
        const res = await request(app)
            .post('/api/iot/telemetry')
            .send(cuerpoFirmado(cuerpo, `n5-${Date.now()}`));

        expect(res.status).toBe(201);
        expect(res.body.alertas_generadas).toEqual(
            expect.arrayContaining([{ tipo: 'temperatura', severidad: 'critical' }])
        );

        const alertas = await db.query(
            "SELECT * FROM iot.iot_alerts WHERE locker_id = $1 AND tipo = 'temperatura'", [LOCKER_ID]);
        expect(alertas.rows.length).toBe(1);
        expect(alertas.rows[0].severidad).toBe('critical');
    });

    test('no genera alertas duplicadas mientras la anterior sigue pendiente', async () => {
        const cuerpo = {
            ...cuerpoBase,
            sensors: [{ sensor: 'vibracion', valor: 900 }]
        };
        const c1 = cuerpoFirmado(cuerpo, `n6a-${Date.now()}`);
        await request(app).post('/api/iot/telemetry').send(c1);

        const c2 = cuerpoFirmado(cuerpo, `n6b-${Date.now()}`);
        await request(app).post('/api/iot/telemetry').send(c2);

        const alertas = await db.query(
            "SELECT * FROM iot.iot_alerts WHERE locker_id = $1 AND tipo = 'vibracion'", [LOCKER_ID]);
        expect(alertas.rows.length).toBe(1);
    });

    test('puerta abierta sin acceso registrado genera alerta', async () => {
        const cuerpo = {
            ...cuerpoBase,
            sensors: [{ sensor: 'puerta_abierta', valor: 1 }]
        };
        const res = await request(app)
            .post('/api/iot/telemetry')
            .send(cuerpoFirmado(cuerpo, `n7-${Date.now()}`));

        expect(res.status).toBe(201);
        const alertas = await db.query(
            "SELECT * FROM iot.iot_alerts WHERE locker_id = $1 AND tipo = 'puerta_abierta'", [LOCKER_ID]);
        expect(alertas.rows.length).toBe(1);
        expect(alertas.rows[0].severidad).toBe('warning');
    });
});

describe('IoT: confirmación de actuadores (POST /api/iot/commands/:locker_id/:accion/confirm)', () => {
    const app = buildApp();

    test('confirma una orden pendiente y la marca como ejecutada', async () => {
        await db.query(
            'INSERT INTO iot.iot_commands (locker_id, accion, ejecutado) VALUES ($1, $2, FALSE)',
            [LOCKER_ID, 'abrir']
        );

        const res = await request(app)
            .post(`/api/iot/commands/${LOCKER_ID}/abrir/confirm`)
            .send(cuerpoFirmado({}, `n8-${Date.now()}`));

        expect(res.status).toBe(200);

        const cmd = await db.query(
            'SELECT * FROM iot.iot_commands WHERE locker_id = $1', [LOCKER_ID]);
        expect(cmd.rows[0].ejecutado).toBe(true);
    });

    test('sin orden pendiente devuelve 404', async () => {
        const res = await request(app)
            .post(`/api/iot/commands/${LOCKER_ID}/abrir/confirm`)
            .send(cuerpoFirmado({}, `n9-${Date.now()}`));

        expect(res.status).toBe(404);
    });

    test('acción no válida devuelve 400', async () => {
        const res = await request(app)
            .post(`/api/iot/commands/${LOCKER_ID}/abrirrr/confirm`)
            .send(cuerpoFirmado({}, `n10-${Date.now()}`));

        expect(res.status).toBe(400);
    });
});

describe('IoT: detección de dispositivos fuera de línea', () => {
    const { evaluarOffline, resolverAlertasFueraLinea } = require('../src/controllers/iotController');

    test('evaluarOffline marca offline a los dispositivos que no reportan y genera alerta', async () => {
        await db.query(
            `INSERT INTO iot.iot_devices (locker_id, device_id, estado, last_seen)
             VALUES ($1, 'ESP32-T001', 'online', NOW() - INTERVAL '1 hour')`,
            [LOCKER_ID]
        );

        const resultado = await evaluarOffline();
        expect(resultado.dispositivos_offline).toBe(1);
        expect(resultado.alertas_generadas).toBe(1);

        const dev = await db.query('SELECT estado FROM iot.iot_devices WHERE locker_id = $1', [LOCKER_ID]);
        expect(dev.rows[0].estado).toBe('offline');

        const alertas = await db.query(
            "SELECT * FROM iot.iot_alerts WHERE locker_id = $1 AND tipo = 'fuera_linea'", [LOCKER_ID]);
        expect(alertas.rows.length).toBe(1);
        expect(alertas.rows[0].severidad).toBe('critical');
    });

    test('evaluarOffline no duplica la alerta de conexión', async () => {
        await db.query(
            `INSERT INTO iot.iot_devices (locker_id, device_id, estado, last_seen)
             VALUES ($1, 'ESP32-T001', 'online', NOW() - INTERVAL '2 hours')`,
            [LOCKER_ID]
        );

        await evaluarOffline();
        const segunda = await evaluarOffline();
        expect(segunda.alertas_generadas).toBe(0);

        const alertas = await db.query(
            "SELECT * FROM iot.iot_alerts WHERE locker_id = $1 AND tipo = 'fuera_linea'", [LOCKER_ID]);
        expect(alertas.rows.length).toBe(1);
    });

    test('la telemetría resuelve la alerta de conexión cuando el dispositivo vuelve', async () => {
        const app = buildApp();
        await db.query(
            `INSERT INTO iot.iot_devices (locker_id, device_id, estado, last_seen)
             VALUES ($1, 'ESP32-T001', 'offline', NOW() - INTERVAL '1 hour')`,
            [LOCKER_ID]
        );
        await db.query(
            `INSERT INTO iot.iot_alerts (locker_id, tipo, severidad, mensaje)
             VALUES ($1, 'fuera_linea', 'critical', 'Test')`,
            [LOCKER_ID]
        );

        const res = await request(app)
            .post('/api/iot/telemetry')
            .send(cuerpoFirmado(cuerpoBase, `n11-${Date.now()}`));

        expect(res.status).toBe(201);

        const dev = await db.query('SELECT estado FROM iot.iot_devices WHERE locker_id = $1', [LOCKER_ID]);
        expect(dev.rows[0].estado).toBe('online');

        const alertas = await db.query(
            "SELECT * FROM iot.iot_alerts WHERE locker_id = $1 AND tipo = 'fuera_linea'", [LOCKER_ID]);
        expect(alertas.rows[0].resuelta).toBe(true);
    });

    test('resolverAlertasFueraLinea marca resueltas las alertas de conexión', async () => {
        await db.query(
            `INSERT INTO iot.iot_alerts (locker_id, tipo, severidad, mensaje)
             VALUES ($1, 'fuera_linea', 'critical', 'Test')`,
            [LOCKER_ID]
        );
        const r = await resolverAlertasFueraLinea(db, LOCKER_ID);
        expect(r.rowCount).toBe(1);
    });
});
