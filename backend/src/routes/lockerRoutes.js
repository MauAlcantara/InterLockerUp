const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { getAvailableLockers, assignLocker, getAllLockersAdmin, assignLockerAdmin, releaseLockerAdmin, changeLockerStatusAdmin, approveLockerRequestAdmin} = require('../controllers/lockerController');

// GET /api/lockers/available
router.get('/available', verificarToken, getAvailableLockers);
router.post('/assign', verificarToken, assignLocker);


// --- RUTAS PARA EL ADMINISTRADOR ---
router.get('/admin', verificarToken, getAllLockersAdmin);
router.post('/admin/assign', verificarToken, assignLockerAdmin);
router.post('/admin/:id/release', verificarToken, releaseLockerAdmin);
router.patch('/admin/:id/status', verificarToken, changeLockerStatusAdmin);
router.post('/admin/:requestId/approve', verificarToken, approveLockerRequestAdmin)


module.exports = router;