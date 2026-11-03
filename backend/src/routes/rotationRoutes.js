const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const rotationService = require('../services/rotationService');

// Estado de la rotación cuatrimestral para el frontend de estudiantes
// (banner informativo sobre el cierre del periodo vigente).
router.get('/status', verificarToken, (req, res) => {
    rotationService.getResumenRotacion()
        .then((estado) => res.json(estado))
        .catch((err) => {
            console.error('Error en /rotation/status:', err);
            res.status(500).json({ mensaje: 'Error interno del servidor' });
        });
});

module.exports = router;
