const express        = require('express');
const router         = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const neuralSecurity = require('../middlewares/neuralSecurityMiddleware');
const { generateQRToken, validarQRToken } = require('../controllers/qrController');

// Genera el token — pipeline: JWT válido → Neurona aprueba → Generar QR
router.post('/generate', verificarToken, neuralSecurity, generateQRToken);

// Valida el token (llamado por el ESP32, sin JWT ni neurona)
router.post('/validar', validarQRToken);

module.exports = router;
