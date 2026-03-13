const express = require('express');
const router = express.Router();
const { getNotificaciones } = require('../controllers/adminController');
const verificarToken = require('../middlewares/authMiddleware');


// Ruta para las notificaciones de la campanita
router.get('/notificaciones', verificarToken, getNotificaciones);

module.exports = router;