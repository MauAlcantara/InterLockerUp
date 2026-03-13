const express = require('express');
const router = express.Router();
const { register, login, getPublicKey } = require('../controllers/authController');
const verificarToken = require('../middlewares/authMiddleware');
router.post('/register', register);
router.post('/login', login);
router.get('/public-key', getPublicKey);
router.get('/me', verificarToken, getMyProfile);
module.exports = router;