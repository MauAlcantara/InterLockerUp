const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { getUserHistory } = require('../controllers/historyController');

// GET /api/history -> historial del usuario logueado
router.get('/', verificarToken, getUserHistory);

module.exports = router;