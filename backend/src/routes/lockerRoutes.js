const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { getAvailableLockers, assignLocker, getAdminLockers, adminUpdateStatus, adminReleaseLocker, adminManualAssign, getMyLockers } = require('../controllers/lockerController');

router.get('/available', verificarToken, getAvailableLockers);
router.post('/assign', verificarToken, assignLocker);
router.get('/my-lockers', verificarToken, getMyLockers);

// Rutas Admin
router.get('/admin', getAdminLockers);
router.patch('/admin/:id/status', adminUpdateStatus);
router.post('/admin/:id/release', adminReleaseLocker);
router.post('/admin/assign', adminManualAssign);


module.exports = router;