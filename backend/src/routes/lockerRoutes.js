const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');
const { getAvailableLockers, assignLocker, getAllLockersAdmin, assignLockerAdmin, releaseLockerAdmin, changeLockerStatusAdmin, approveLockerRequestAdmin, getPendingRequestsAdmin, rejectLockerRequestAdmin, getEstadoLockers } = require('../controllers/lockerController');

// GET /api/lockers/available
router.get('/available', verificarToken, getAvailableLockers);
router.post('/assign', verificarToken, assignLocker);


// --- RUTAS PARA EL ADMINISTRADOR ---
router.get('/admin', verificarToken, getAllLockersAdmin);

// GET /api/lockers/admin/status
// Estado actual de todos los lockers con resumen por estado (solo admin)
router.get('/admin/status', verificarToken, requireAdmin, getEstadoLockers);
router.post('/admin/assign', verificarToken, assignLockerAdmin);
router.post('/admin/:id/release', verificarToken, releaseLockerAdmin);
router.patch('/admin/:id/status', verificarToken, changeLockerStatusAdmin);

// --- RUTAS DE SOLICITUDES (Para el Modal de la tabla) ---
router.get('/requests/pending', verificarToken, getPendingRequestsAdmin);
router.post('/requests/:requestId/approve', verificarToken, approveLockerRequestAdmin);
router.post('/requests/:requestId/reject', verificarToken, rejectLockerRequestAdmin);


module.exports = router;