const express = require('express');
const router = express.Router();
const { getHomeData } = require('../controllers/homeController');
const verificarToken = require('../middlewares/authMiddleware');

router.get('/', verificarToken, getHomeData);

module.exports = router;