const express = require('express');
const router = express.Router();
// Añadimos verifyOTP a la destructuración de controladores
const { register, login, getPublicKey, getCarreras, verifyOTP } = require('../controllers/authController');

// router.post('/register', register);
router.post('/login', login);
// --- NUEVA RUTA PARA LA VERIFICACIÓN DE LA NEURONA ---
router.post('/verify-otp', verifyOTP); 

router.get('/public-key', getPublicKey);
router.get('/carreras', getCarreras);

module.exports = router;
