const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { getAvailableLockers, assignLocker } = require('../controllers/lockerController');

// GET /api/lockers/available
router.get('/available', verificarToken, getAvailableLockers);
router.post('/assign', verificarToken, assignLocker);


module.exports = router;