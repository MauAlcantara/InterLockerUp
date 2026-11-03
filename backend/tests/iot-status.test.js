/**
 * Tests de GET /api/iot/status — estado de conectividad IoT (solo admin).
 *
 * Requiere PostgreSQL en ejecución (DB_NAME en backend/.env).
 */
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'interlockerup_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.IOT_SECRET_KEY = 'test-iot-secret';
process.env.IOT_OFFLINE_MINUTES = '10';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../src/config/db');
const iotRoutes = require('../src/routes/iotRoutes');

// App mínima: solo las rutas IoT (evita cargar el servidor completo)
const app = express();
app.use(express.json());
app.use('/api/iot', iotRoutes);

const LOCKER_ID = 46; // locker existente en la base de pruebas

let adminId = null;
let adminToken = null;

beforeAll(async () => {
    // Crea un administrador de prueba y su sesión activa (jti)
    const jti = crypto.randomUUID();
    const r = await db.query(
        `INSERT INTO gestion.users (matricula, nombre_completo, email, password_hash, rol, status)
         VALUES ('TEST-ADMIN-IOT', 'Admin IoT Test', 'admin-iot-test@example.com', 'hash-falso', 'admin', 'activo')
         ON CONFLICT (email) DO UPDATE SET rol = 'admin'
         RETURNING id`,
        []
    );
    adminId = r.rows[0].id;

    await db.query(
        `INSERT INTO gestion.user_sessions (user_id, token_jti, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 hour')
         ON CONFLICT (user_id) DO UPDATE SET token_jti = EXCLUDED.token_jti, expires_at = NOW() + INTERVAL '1 hour'`,
        [adminId, jti]
    );

    adminToken = jwt.sign({ id: adminId, rol: 'admin', jti }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
    await db.end();
});

describe('IoT: estado de conectividad (GET /api/iot/status)', () => {
    test('sin token responde 401', async () => {
        const res = await request(app).get('/api/iot/status');
        expect(res.status).toBe(401);
    });

    test('un usuario no admin recibe 403', async () => {
        const alumno = await db.query(
            `INSERT INTO gestion.users (matricula, nombre_completo, email, password_hash, rol, status)
             VALUES ('TEST-ALUMNO-IOT', 'Alumno IoT', 'alumno-iot-test@example.com', 'hash-falso', 'alumno', 'activo')
             ON CONFLICT (email) DO UPDATE SET rol = 'alumno'
             RETURNING id`,
            []
        );
        const token = jwt.sign({ id: alumno.rows[0].id, rol: 'alumno' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const res = await request(app).get('/api/iot/status').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    test('el admin ve el estado de los dispositivos con resumen', async () => {
        // Dispositivo online con señal reciente
        await db.query(
            `INSERT INTO iot.iot_devices (locker_id, device_id, estado, last_seen, battery, firmware)
             VALUES ($1, 'ESP32-T001', 'online', NOW(), 80, '1.2.0')
             ON CONFLICT (locker_id) DO UPDATE SET estado = 'online', last_seen = NOW()`,
            [LOCKER_ID]
        );

        const res = await request(app).get('/api/iot/status').set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);

        expect(res.body.resumen.online).toBeGreaterThanOrEqual(1);
        const dev = res.body.dispositivos.find(d => d.locker_id === LOCKER_ID);
        expect(dev).toBeDefined();
        expect(dev.device_id).toBe('ESP32-T001');
        expect(dev.online).toBe(true);
    });

    test('un dispositivo sin señal reciente se reporta como offline', async () => {
        await db.query(
            `UPDATE iot.iot_devices SET estado = 'online', last_seen = NOW() - INTERVAL '30 minutes' WHERE locker_id = $1`,
            [LOCKER_ID]
        );

        const res = await request(app).get('/api/iot/status').set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);

        const dev = res.body.dispositivos.find(d => d.locker_id === LOCKER_ID);
        expect(dev.online).toBe(false);
        expect(res.body.resumen.offline).toBeGreaterThanOrEqual(1);
    });

    test('un locker sin dispositivo aparece como sin_dispositivo', async () => {
        const nuevo = await db.query(
            `INSERT INTO gestion.lockers (identificador, estado) VALUES ('T-IOT-TEST', 'disponible') RETURNING id`
        );
        const lockerId = nuevo.rows[0].id;

        const res = await request(app).get('/api/iot/status').set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);

        const dev = res.body.dispositivos.find(d => d.locker_id === lockerId);
        expect(dev).toBeDefined();
        expect(dev.device_id).toBeNull();
        expect(dev.online).toBe(false);
        expect(res.body.resumen.sin_dispositivo).toBeGreaterThanOrEqual(1);

        // Limpieza
        await db.query('DELETE FROM gestion.lockers WHERE id = $1', [lockerId]);
    });
});
