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

// Dashboard completo de rotación para el panel de administrador
router.get('/rotation/dashboard', verificarToken, async (req, res) => {
    try {
        const dashboard = await rotationService.getDashboardRotacion();
        res.json(dashboard);
    } catch (error) {
        console.error('Error al obtener dashboard de rotación:', error.message);
        res.status(500).json({ mensaje: 'Error interno al obtener el dashboard de rotación.' });
    }
});

// Historial de limpiezas/rotaciones para el panel de administrador
router.get('/rotation/runs', verificarToken, async (req, res) => {
    try {
        const runs = await rotationService.getHistorialRotacion();
        res.json(runs);
    } catch (error) {
        console.error('Error al obtener historial de rotación:', error.message);
        res.status(500).json({ mensaje: 'Error interno al obtener el historial de rotación.' });
    }
});

// Disparo manual de la notificación anticipada (idempotente por periodo)
router.post('/rotation/notify', verificarToken, async (req, res) => {
    try {
        const resultado = await rotationService.notificarRotacion();
        res.json(resultado);
    } catch (error) {
        console.error('Error al notificar rotación:', error.message);
        res.status(500).json({ mensaje: 'Error interno al enviar la notificación de rotación.' });
    }
});

router.post('/rotation/close-period', verificarToken, async (req, res) => {
    try {
        const estado = await rotationService.getEstadoRotacion();
        if (!estado) {
            res.status(400).json({ mensaje: 'No hay periodo registrado para cerrar.' });
            return;
        }
        const resultado = await rotationService.cerrarPeriodo({ n: estado.cuatrimestre, anio: estado.anio });
        res.json({
            success: true,
            mensaje: `Periodo ${estado.anio}-${estado.cuatrimestre} cerrado.`,
            ...resultado,
        });
    } catch (error) {
        console.error('Error al cerrar el periodo:', error.message);
        res.status(500).json({ mensaje: 'Error interno al cerrar el periodo.' });
    }
});

module.exports = router;