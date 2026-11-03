// backend/tests/locker-status.test.js
// Pruebas de GET /api/lockers/admin/status — estado de lockers (solo admin).
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'interlockerup_test';
process.env.JWT_SECRET = 'test-jwt-secret';
// lockerController carga rotationService -> mailer (Resend); clave dummy para tests
process.env.RESEND_API_KEY = 're_test_dummy';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../src/config/db');
const lockerRoutes = require('../src/routes/lockerRoutes');

const app = express();
app.use(express.json());
app.use('/api/lockers', lockerRoutes);

const LOCKER_ID = 46; // locker existente en la base de pruebas

let adminToken = null;

beforeAll(async () => {
    const jti = crypto.randomUUID();
    const r = await db.query(
        `INSERT INTO gestion.users (matricula, nombre_completo, email, password_hash, rol, status)
         VALUES ('TEST-ADMIN-LOCKER', 'Admin Locker Test', 'admin-locker-test@example.com', 'hash-falso', 'admin', 'activo')
         ON CONFLICT (email) DO UPDATE SET rol = 'admin'
         RETURNING id`,
        []
    );
    const adminId = r.rows[0].id;

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

describe('Lockers: estado (GET /api/lockers/admin/status)', () => {
    test('sin token responde 401', async () => {
        const res = await request(app).get('/api/lockers/admin/status');
        expect(res.status).toBe(401);
    });

    test('un usuario no admin recibe 403', async () => {
        const alumno = await db.query(
            `INSERT INTO gestion.users (matricula, nombre_completo, email, password_hash, rol, status)
             VALUES ('TEST-ALUMNO-LOCKER', 'Alumno Locker', 'alumno-locker-test@example.com', 'hash-falso', 'alumno', 'activo')
             ON CONFLICT (email) DO UPDATE SET rol = 'alumno'
             RETURNING id`,
            []
        );
        const token = jwt.sign({ id: alumno.rows[0].id, rol: 'alumno' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const res = await request(app).get('/api/lockers/admin/status').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    test('el admin recibe el estado de todos los lockers con resumen', async () => {
        const res = await request(app).get('/api/lockers/admin/status').set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);

        expect(Array.isArray(res.body.lockers)).toBe(true);
        expect(res.body.lockers.length).toBeGreaterThan(0);
        const total = res.body.lockers.reduce((s, l) => s + (res.body.resumen[l.estado] || 0), 0);
        expect(total).toBe(res.body.lockers.length);
    });

    test('un locker asignado muestra al usuario activo', async () => {
        const alumno = await db.query(
            `INSERT INTO gestion.users (matricula, nombre_completo, email, password_hash, rol, status)
             VALUES ('TEST-ASIGNADO-LOCKER', 'Alumno Asignado', 'asignado-locker-test@example.com', 'hash-falso', 'alumno', 'activo')
             ON CONFLICT (email) DO UPDATE SET rol = 'alumno'
             RETURNING id, matricula`,
            []
        );
        const alumnoId = alumno.rows[0].id;

        // Asignación activa del alumno al locker de pruebas
        const asignacion = await db.query(
            `INSERT INTO gestion.assignments (locker_id, fecha_vencimiento, status)
             VALUES ($1, NOW() + INTERVAL '1 month', 'activa')
             RETURNING id`,
            [LOCKER_ID]
        );
        await db.query(
            `INSERT INTO gestion.assignment_users (assignment_id, user_id) VALUES ($1, $2)`,
            [asignacion.rows[0].id, alumnoId]
        );
        await db.query(`UPDATE gestion.lockers SET estado = 'ocupado' WHERE id = $1`, [LOCKER_ID]);

        try {
            const res = await request(app).get('/api/lockers/admin/status').set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);

            const locker = res.body.lockers.find(l => l.id === LOCKER_ID);
            expect(locker).toBeDefined();
            expect(locker.estado).toBe('ocupado');
            expect(locker.usuario).toBe('Alumno Asignado');
        } finally {
            await db.query('DELETE FROM gestion.assignment_users WHERE assignment_id = $1', [asignacion.rows[0].id]);
            await db.query('DELETE FROM gestion.assignments WHERE id = $1', [asignacion.rows[0].id]);
        }
    });
});
