const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { generateQRToken, validarQRToken} = require('../controllers/qrController');

// Genera el token
router.post('/generate', verificarToken, generateQRToken);

// // Valida el token
router.post('/validar', validarQRToken);


module.exports = router;
