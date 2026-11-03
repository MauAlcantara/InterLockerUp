// backend/tests/iot-monitoring.test.js
// Pruebas del panel de monitoreo unificado (solo admin): combina conectividad,
// estado del locker, lecturas de sensores y alertas pendientes.
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
process.env.JWT_SECRET = 'test-jwt-secret';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../src/config/db');
const iotRoutes = require('../src/routes/iotRoutes');

const app = express();
app.use(express.json());
app.use('/api/iot', iotRoutes);

const LOCKER_ID = 46; // locker existente en la BD de pruebas (T-001)

let adminToken = null;

// Firma HMAC para el endpoint de telemetría (anti-replay)
function cuerpoFirmado(cuerpo, nonce, signatureOverride = null) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signatureOverride ?? crypto
        .createHmac('sha256', process.env.IOT_SECRET_KEY)
        .update(`${timestamp}:${nonce}`)
        .digest('hex');
    return { ...cuerpo, timestamp, nonce, signature };
}

beforeAll(async () => {
    const r = await db.query(
        `INSERT INTO gestion.users (matricula, nombre_completo, email, password_hash, rol, status)
         VALUES ('TEST-ADMIN-MONITORING', 'Admin Monitoring', 'admin-monitoring-test@example.com', 'hash-falso', 'admin', 'activo')
         ON CONFLICT (email) DO UPDATE SET rol = 'admin'
         RETURNING id`,
        []
    );
    const adminId = r.rows[0].id;
    const jti = crypto.randomUUID();
    await db.query(
        `INSERT INTO gestion.user_sessions (user_id, token_jti, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 hour')
         ON CONFLICT (user_id) DO UPDATE SET token_jti = EXCLUDED.token_jti, expires_at = NOW() + INTERVAL '1 hour'`,
        [adminId, jti]
    );
    adminToken = jwt.sign({ id: adminId, rol: 'admin', jti }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

afterEach(async () => {
    await db.query('DELETE FROM iot.iot_alerts WHERE locker_id = $1', [LOCKER_ID]);
    await db.query('DELETE FROM iot.sensor_readings WHERE locker_id = $1', [LOCKER_ID]);
    await db.query('UPDATE iot.iot_devices SET last_seen = NOW() WHERE locker_id = $1', [LOCKER_ID]);
});

afterAll(async () => {
    await db.end();
});

describe('Panel de monitoreo unificado', () => {
    test('sin token responde 401', async () => {
        const res = await request(app).get('/api/iot/monitoring');
        expect(res.status).toBe(401);
    });

    test('un usuario no admin recibe 403', async () => {
        const alumno = await db.query(
            `INSERT INTO gestion.users (matricula, nombre_completo, email, password_hash, rol, status)
             VALUES ('TEST-ALUMNO-MONITORING', 'Alumno Monitoring', 'alumno-monitoring-test@example.com', 'hash-falso', 'alumno', 'activo')
             ON CONFLICT (email) DO UPDATE SET rol = 'alumno'
             RETURNING id`,
            []
        );
        const token = jwt.sign({ id: alumno.rows[0].id, rol: 'alumno' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const res = await request(app).get('/api/iot/monitoring').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    test('combina conectividad, sensores y alertas por locker', async () => {
        // Telemetría con temperatura fuera de umbral (genera alerta crítica)
        await request(app).post('/api/iot/telemetry').send(cuerpoFirmado({
            locker_id: LOCKER_ID,
            device_id: 'ESP32-T001',
            sensors: [
                { sensor: 'temperatura', valor: 42.0, unidad: 'C' },
                { sensor: 'vibracion', valor: 120, unidad: 'mg/s2' }
            ],
            battery: 76.5,
            firmware: '1.2.0'
        }, 'nonce-m1'));

        const res = await request(app).get('/api/iot/monitoring').set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);

        const locker = res.body.lockers.find(l => l.id === LOCKER_ID);
        expect(locker).toBeDefined();
        expect(locker.online).toBe(true);
        expect(locker.device_id).toBe('ESP32-T001');
        expect(locker.sensores.temperatura).toBeDefined();
        expect(Number(locker.sensores.temperatura.valor)).toBe(42.0);
        expect(locker.alertas.pendientes).toBe(1);
        expect(locker.alertas.criticas).toBe(1);

        expect(res.body.resumen.alertas_pendientes).toBe(1);
        expect(res.body.resumen.alertas_criticas).toBe(1);
        expect(res.body.resumen.online).toBeGreaterThanOrEqual(1);
    });

    test('un dispositivo con last_seen antigua aparece como offline', async () => {
        await db.query(
            `UPDATE iot.iot_devices SET last_seen = NOW() - INTERVAL '30 minutes' WHERE locker_id = $1`,
            [LOCKER_ID]
        );

        const res = await request(app).get('/api/iot/monitoring').set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);

        const locker = res.body.lockers.find(l => l.id === LOCKER_ID);
        expect(locker.online).toBe(false);
        expect(res.body.resumen.offline).toBeGreaterThanOrEqual(1);
    });
});
