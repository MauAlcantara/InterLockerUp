
const express = require('express');
const router = express.Router();
const perfilController = require('../controllers/perfilController');
const authMiddleware = require('../middlewares/authMiddleware');

// Evita que Cloudflare/navegador cachee respuestas de la API
const noCache = (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
};

router.get('/me', authMiddleware, perfilController.getPerfil);
router.put('/update', authMiddleware, perfilController.editarDatos);
router.post('/desalojar', authMiddleware, perfilController.desalojarCasillero);
router.get('/my-locker', authMiddleware, perfilController.getLockerActivo);
module.exports = router;
