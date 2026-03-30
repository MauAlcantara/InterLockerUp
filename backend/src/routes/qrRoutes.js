const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { generateQRToken, validarQRToken } = require('../controllers/qrController');

/**
 * @route   POST /api/qr/generate
 * @desc    El alumno genera un token QR (válido por 60s)
 * @access  Privado (Token JWT de alumno)
 */
router.post('/generate', verificarToken, generateQRToken);

/**
 * @route   POST /api/qr/validar
 * @desc    El hardware (ESP32) envía el código escaneado para abrir el locker
 * @access  Público (Se valida por el hash del token en la DB)
 */
router.post('/validar', validarQRToken);

module.exports = router;