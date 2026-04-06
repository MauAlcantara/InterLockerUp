const express = require('express');
const router = express.Router();
const { getNotificaciones, marcarIncidenciaLeida } = require('../controllers/adminController');
const verificarToken = require('../middlewares/authMiddleware');


// Ruta para las notificaciones de la campanita
router.get('/notificaciones', verificarToken, getNotificaciones);
router.patch('/notificaciones/:id/read', verificarToken, marcarIncidenciaLeida);

module.exports = router;