const express = require('express');
const router = express.Router();
const { getAuditorias } = require('../controllers/auditsController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, getAuditorias);

module.exports = router;
