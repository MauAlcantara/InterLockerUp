// backend/tests/security-de.test.js
const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');

const AUDITS_ROUTE_PATH = path.join(__dirname, '../src/routes/auditsRoutes.js');
const INCIDENTS_ROUTE_PATH = path.join(__dirname, '../src/routes/incidentsRoutes.js');
const ACCESS_ROUTE_PATH = path.join(__dirname, '../src/routes/accessRoutes.js');
const AUTH_CONTROLLER_PATH = path.join(__dirname, '../src/controllers/authController.js');
const ACCESS_CONTROLLER_PATH = path.join(__dirname, '../src/controllers/accessController.js');

function buildApp(router, basePath) {
  const app = express();
  app.use(express.json());
  app.use(basePath, router);
  return app;
}

describe('SEC-01: Control de acceso en rutas administrativas (auditsRoutes / incidentsRoutes)', () => {
  test('auditsRoutes.js e incidentsRoutes.js se cargan sin lanzar error de import roto', () => {
    expect(() => {
      jest.resetModules();
      require('../src/routes/auditsRoutes');
      require('../src/routes/incidentsRoutes');
    }).not.toThrow();
  });

  test('GET /api/audits sin token de autenticación responde 401 (caso negativo)', async () => {
    jest.resetModules();
    const auditsRoutes = require('../src/routes/auditsRoutes');
    const app = buildApp(auditsRoutes, '/api/audits');
    const res = await request(app).get('/api/audits');
    expect(res.status).toBe(401);
  });

  test('GET /api/incidents/admin sin token de autenticación responde 401 (caso negativo)', async () => {
    jest.resetModules();
    const incidentsRoutes = require('../src/routes/incidentsRoutes');
    const app = buildApp(incidentsRoutes, '/api/incidents');
    const res = await request(app).get('/api/incidents/admin');
    expect(res.status).toBe(401);
  });
});

describe('SEC-02: Path Traversal en carga de evidencias (incidentsRoutes.js)', () => {
  test('la función filename ya no usa file.originalname directamente para nombrar el archivo', () => {
    const source = fs.readFileSync(INCIDENTS_ROUTE_PATH, 'utf8');
    expect(source).not.toMatch(/cb\(\s*null\s*,\s*.*file\.originalname\s*\)/);
  });

  test('la función filename genera el nombre con crypto.randomUUID()', () => {
    const source = fs.readFileSync(INCIDENTS_ROUTE_PATH, 'utf8');
    expect(source).toMatch(/crypto\.randomUUID\(\)/);
  });
});

describe('SEC-03: PRNG débil en generación de OTP/PIN (authController.js / accessController.js)', () => {
  test('authController.js ya no usa Math.random para generar el código OTP', () => {
    const source = fs.readFileSync(AUTH_CONTROLLER_PATH, 'utf8');
    expect(source).not.toMatch(/Math\.random/);
    expect(source).toMatch(/crypto\.randomInt/);
  });

  test('accessController.js ya no usa Math.random para generar el PIN', () => {
    const source = fs.readFileSync(ACCESS_CONTROLLER_PATH, 'utf8');
    expect(source).not.toMatch(/Math\.random/);
    expect(source).toMatch(/crypto\.randomInt/);
  });

  test('accessRoutes.js aplica generalLimiter en la ruta /remote-unlock', () => {
    const source = fs.readFileSync(ACCESS_ROUTE_PATH, 'utf8');
    const remoteUnlockLine = source.split('\n').find((l) => l.includes("'/remote-unlock'"));
    expect(remoteUnlockLine).toBeDefined();
    expect(remoteUnlockLine).toMatch(/generalLimiter/);
  });
});
