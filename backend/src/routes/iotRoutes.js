const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { iotAntiReplay } = require('../middlewares/iotAntiReplay');
const verificarToken = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');
const {
    registrarTelemetria,
    confirmarAccion,
    estadoConectividad,
    sensoresMasRecientes,
    historialSensores,
    comandosActuadores,
    SENSORES_VALIDOS
} = require('../controllers/iotController');

const router = express.Router();

// ── POST /api/iot/telemetry ────────────────────────────────────────────────
// Telemetría del ESP32 (protegida por firma HMAC + anti-replay).
router.post('/telemetry',
    iotAntiReplay,
    body('locker_id').isInt({ min: 1 }),
    body('device_id').isString().trim().isLength({ min: 1, max: 50 }),
    body('sensors').isArray(),
    body('sensors.*.sensor').isString().isIn(SENSORES_VALIDOS),
    body('sensors.*.valor').isNumeric(),
    body('battery').optional().isNumeric(),
    body('firmware').optional().isString().trim().isLength({ max: 50 }),
    (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ error: errores.array().map(e => e.msg).join('; ') });
    }
    next();
}, registrarTelemetria);

// ── POST /api/iot/commands/:locker_id/:accion/confirm ──────────────────────
// El ESP32 confirma la ejecución de un actuador (abrir/cerrar).
router.post('/commands/:locker_id/:accion/confirm',
    iotAntiReplay,
    param('locker_id').isInt({ min: 1 }),
    param('accion').isIn(['abrir', 'cerrar']),
    (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ error: errores.array().map(e => e.msg).join('; ') });
    }
    next();
}, confirmarAccion);

// ── GET /api/iot/status ───────────────────────────────────────────────────
// Estado de conectividad de los dispositivos IoT por locker (solo admin).
router.get('/status', verificarToken, requireAdmin, estadoConectividad);

// ── GET /api/iot/sensors/latest ───────────────────────────────────────────
// Lectura más reciente de cada sensor de cada locker (solo admin).
router.get('/sensors/latest', verificarToken, requireAdmin, sensoresMasRecientes);

// ── GET /api/iot/sensors/:locker_id ───────────────────────────────────────
// Historial de lecturas de sensores de un locker (solo admin).
router.get('/sensors/:locker_id',
    verificarToken,
    requireAdmin,
    param('locker_id').isInt({ min: 1 }),
    (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ error: errores.array().map(e => e.msg).join('; ') });
    }
    next();
}, historialSensores);

// ── GET /api/iot/commands/:locker_id ──────────────────────────────────────
// Comandos de actuadores (abrir/cerrar) de un locker con resumen (solo admin).
router.get('/commands/:locker_id',
    verificarToken,
    requireAdmin,
    param('locker_id').isInt({ min: 1 }),
    (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ error: errores.array().map(e => e.msg).join('; ') });
    }
    next();
}, comandosActuadores);

module.exports = router;
