// backend/tests/iot-alerts.test.js
// Pruebas de la visualización y resolución de alertas IoT (solo admin).
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
         VALUES ('TEST-ADMIN-ALERTAS', 'Admin Alertas', 'admin-alertas-test@example.com', 'hash-falso', 'admin', 'activo')
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
});

afterAll(async () => {
    await db.end();
});

describe('Alertas IoT', () => {
    test('sin token responde 401', async () => {
        const res = await request(app).get('/api/iot/alerts');
        expect(res.status).toBe(401);
    });

    test('un usuario no admin recibe 403', async () => {
        const alumno = await db.query(
            `INSERT INTO gestion.users (matricula, nombre_completo, email, password_hash, rol, status)
             VALUES ('TEST-ALUMNO-ALERTAS', 'Alumno Alertas', 'alumno-alertas-test@example.com', 'hash-falso', 'alumno', 'activo')
             ON CONFLICT (email) DO UPDATE SET rol = 'alumno'
             RETURNING id`,
            []
        );
        const token = jwt.sign({ id: alumno.rows[0].id, rol: 'alumno' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const res = await request(app).get('/api/iot/alerts').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    test('la telemetría fuera de umbral genera una alerta visible', async () => {
        await request(app).post('/api/iot/telemetry').send(cuerpoFirmado({
            locker_id: LOCKER_ID,
            device_id: 'ESP32-T001',
            sensors: [{ sensor: 'temperatura', valor: 45.2, unidad: 'C' }],
            battery: 80,
            firmware: '1.2.0'
        }, 'nonce-a1'));

        const res = await request(app).get('/api/iot/alerts').set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.resumen.total).toBe(1);
        expect(res.body.resumen.pendientes).toBe(1);
        expect(res.body.resumen.criticas).toBe(1);
        const alerta = res.body.alertas[0];
        expect(alerta.tipo).toBe('temperatura');
        expect(alerta.severidad).toBe('critical');
        expect(alerta.resuelta).toBe(false);
        expect(alerta.identificador).toBe('T-001');
    });

    test('resolver una alerta la marca como resuelta y evita duplicados', async () => {
        await request(app).post('/api/iot/telemetry').send(cuerpoFirmado({
            locker_id: LOCKER_ID,
            device_id: 'ESP32-T001',
            sensors: [{ sensor: 'vibracion', valor: 900, unidad: 'mg/s2' }],
            battery: 80,
            firmware: '1.2.0'
        }, 'nonce-a2'));

        const lista = await request(app).get('/api/iot/alerts').set('Authorization', `Bearer ${adminToken}`);
        const alertaId = lista.body.alertas[0].id;

        const res = await request(app)
            .post(`/api/iot/alerts/${alertaId}/resolve`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.resuelta).toBe(true);

        // Ahora no aparece en el filtro de pendientes
        const pendientes = await request(app).get('/api/iot/alerts?resueltas=false').set('Authorization', `Bearer ${adminToken}`);
        expect(pendientes.body.alertas.length).toBe(0);

        // Sí aparece en el filtro de resueltas
        const resueltas = await request(app).get('/api/iot/alerts?resueltas=true').set('Authorization', `Bearer ${adminToken}`);
        expect(resueltas.body.alertas.length).toBe(1);
        expect(resueltas.body.alertas[0].id).toBe(alertaId);
    });

    test('resolver una alerta inexistente o ya resuelta responde 404', async () => {
        const res = await request(app)
            .post('/api/iot/alerts/999999/resolve')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(404);
    });
});
