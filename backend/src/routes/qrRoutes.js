const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { generateQRToken } = require('../controllers/qrController');

/**
 * @route   POST /api/qr/generate
 * @desc    Genera un token dinámico y único para abrir el casillero
 * @access  Privado (Requiere token de alumno)
 */
router.post('/generate', verificarToken, generateQRToken);

// Ejemplo de ruta futura para el hardware del locker:
// router.post('/validate', verificarHardwareToken, validateQRToken);

module.exports = router;