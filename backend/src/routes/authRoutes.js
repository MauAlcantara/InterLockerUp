const express = require('express');
const router = express.Router();
const { register, login, getPublicKey } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/public-key', getPublicKey);

module.exports = router;