// backend/tests/iot-sensors.test.js
// Pruebas del monitoreo de sensores y actuadores: lecturas recientes,
// historial por locker y comandos de actuadores (solo admin).
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'interlockerup_test';
process.env.IOT_SECRET_KEY = 'test-iot-secret';
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
         VALUES ('TEST-ADMIN-SENSORS', 'Admin Sensores', 'admin-sensores-test@example.com', 'hash-falso', 'admin', 'activo')
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
    await db.query('DELETE FROM iot.sensor_readings WHERE locker_id = $1', [LOCKER_ID]);
    await db.query('DELETE FROM iot.iot_commands WHERE locker_id = $1', [LOCKER_ID]);
});

afterAll(async () => {
    await db.end();
});

describe('Monitoreo de sensores y actuadores', () => {
    test('sin token responde 401', async () => {
        const res = await request(app).get('/api/iot/sensors/latest');
        expect(res.status).toBe(401);
    });

    test('un usuario no admin recibe 403', async () => {
        const alumno = await db.query(
            `INSERT INTO gestion.users (matricula, nombre_completo, email, password_hash, rol, status)
             VALUES ('TEST-ALUMNO-SENSORS', 'Alumno Sensores', 'alumno-sensores-test@example.com', 'hash-falso', 'alumno', 'activo')
             ON CONFLICT (email) DO UPDATE SET rol = 'alumno'
             RETURNING id`,
            []
        );
        const token = jwt.sign({ id: alumno.rows[0].id, rol: 'alumno' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const res = await request(app).get('/api/iot/sensors/latest').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    test('sensors/latest devuelve la lectura más reciente por sensor', async () => {
        // Primera lectura
        await request(app).post('/api/iot/telemetry').send(cuerpoFirmado({
            locker_id: LOCKER_ID,
            device_id: 'ESP32-T001',
            sensors: [
                { sensor: 'temperatura', valor: 21.0, unidad: 'C' },
                { sensor: 'vibracion', valor: 100, unidad: 'mg/s2' }
            ],
            battery: 90,
            firmware: '1.2.0'
        }, 'nonce-s1'));

        // Segunda lectura con valores diferentes
        await request(app).post('/api/iot/telemetry').send(cuerpoFirmado({
            locker_id: LOCKER_ID,
            device_id: 'ESP32-T001',
            sensors: [
                { sensor: 'temperatura', valor: 23.5, unidad: 'C' }
            ],
            battery: 89,
            firmware: '1.2.0'
        }, 'nonce-s2'));

        const res = await request(app).get('/api/iot/sensors/latest').set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);

        const lecturas = res.body.lecturas;
        const temp = lecturas.find(l => l.sensor === 'temperatura');
        const vib = lecturas.find(l => l.sensor === 'vibracion');
        expect(temp).toBeDefined();
        expect(Number(temp.valor)).toBe(23.5); // la más reciente
        expect(vib).toBeDefined();
        expect(Number(vib.valor)).toBe(100);
    });

    test('historial de sensores respeta el límite y el orden descendente', async () => {
        for (let i = 1; i <= 5; i++) {
            await request(app).post('/api/iot/telemetry').send(cuerpoFirmado({
                locker_id: LOCKER_ID,
                device_id: 'ESP32-T001',
                sensors: [{ sensor: 'temperatura', valor: 20 + i, unidad: 'C' }],
                battery: 90,
                firmware: '1.2.0'
            }, `nonce-h${i}`));
        }

        const res = await request(app)
            .get(`/api/iot/sensors/${LOCKER_ID}?limit=3`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.lecturas.length).toBe(3);
        const valores = res.body.lecturas.map(l => Number(l.valor));
        expect(valores).toEqual([25, 24, 23]);
    });

    test('comandos de actuadores: pendiente y confirmación', async () => {
        // Comando pendiente insertado directamente (como lo haría el backend al desbloquear)
        await db.query(
            `INSERT INTO iot.iot_commands (locker_id, accion, ejecutado) VALUES ($1, 'abrir', FALSE)`,
            [LOCKER_ID]
        );

        const res = await request(app).get(`/api/iot/commands/${LOCKER_ID}`).set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.resumen.pendientes).toBe(1);
        expect(res.body.resumen.ejecutados).toBe(0);
        expect(res.body.comandos.length).toBe(1);

        // El ESP32 confirma la ejecución
        const comandoId = res.body.comandos[0].id;
        const confirm = await request(app)
            .post(`/api/iot/commands/${LOCKER_ID}/abrir/confirm`)
            .send(cuerpoFirmado({ locker_id: LOCKER_ID, device_id: 'ESP32-T001' }, 'nonce-c1'));
        expect(confirm.status).toBe(200);

        const res2 = await request(app).get(`/api/iot/commands/${LOCKER_ID}`).set('Authorization', `Bearer ${adminToken}`);
        expect(res2.body.resumen.pendientes).toBe(0);
        expect(res2.body.resumen.ejecutados).toBe(1);
        expect(res2.body.comandos.find(c => c.id === comandoId).ejecutado).toBe(true);
    });
});
