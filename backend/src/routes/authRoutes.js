const express = require('express');
const router = express.Router();
const { register, login, getPublicKey, getCarreras, verifyOTP, logout } = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { authLimiter } = require('../middlewares/rateLimiter');
const { validateLogin } = require('../middlewares/inputValidator');

router.post('/login', authLimiter, validateLogin, login);
router.post('/verify-otp', authLimiter, verifyOTP);
router.get('/public-key', getPublicKey);
router.get('/carreras', getCarreras);
router.post('/logout', verificarToken, logout);

module.exports = router;
