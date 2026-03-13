const express = require('express');
const router = express.Router();
const { generateQRToken } = require('../controllers/accessController');
const verificarToken = require('../middlewares/authMiddleware');

// POST /api/access/generate-qr
router.post('/generate-qr', verificarToken, generateQRToken);

module.exports = router;