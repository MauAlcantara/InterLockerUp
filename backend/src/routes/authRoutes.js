const express = require('express');
const router = express.Router();
const { register, login, getPublicKey, getCarreras } = require('../controllers/authController');

// router.post('/register', register);
router.post('/login', login);
router.get('/public-key', getPublicKey);
router.get('/carreras', getCarreras);

module.exports = router;