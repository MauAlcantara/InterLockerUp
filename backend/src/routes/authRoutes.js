const express = require('express');
const router = express.Router();
const { register, login, getPublicKey, getCarreras, verifyOTP } = require('../controllers/authController');
const { authLimiter } = require('../middlewares/rateLimiter');
const { validateLogin } = require('../middlewares/inputValidator');

router.post('/login', authLimiter, validateLogin, login);
router.post('/verify-otp', authLimiter, verifyOTP);
router.get('/public-key', getPublicKey);
router.get('/carreras', getCarreras);

module.exports = router;
