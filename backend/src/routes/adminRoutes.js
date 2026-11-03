const express = require('express');
const router = express.Router();
const { getNotificaciones, marcarIncidenciaLeida } = require('../controllers/adminController');
const verificarToken = require('../middlewares/authMiddleware');
const rotationService = require('../services/rotationService');


// Ruta para las notificaciones de la campanita
router.get('/notificaciones', verificarToken, getNotificaciones);
router.patch('/notificaciones/:id/read', verificarToken, marcarIncidenciaLeida);

// Rotación por cuatrimestre
router.get('/rotation/status', verificarToken, async (req, res) => {
    try {
        const estado = await rotationService.getEstadoRotacion();
        res.json(estado);
    } catch (error) {
        console.error('Error al obtener estado de rotación:', error.message);
        res.status(500).json({ mensaje: 'Error interno al obtener el estado de rotación.' });
    }
});

router.post('/rotation/close-period', verificarToken, async (req, res) => {
    try {
        const resultado = await rotationService.cerrarPeriodo();
        res.json({ success: true, ...resultado });
    } catch (error) {
        console.error('Error al cerrar el periodo:', error.message);
        res.status(500).json({ mensaje: 'Error interno al cerrar el periodo.' });
    }
});

module.exports = router;