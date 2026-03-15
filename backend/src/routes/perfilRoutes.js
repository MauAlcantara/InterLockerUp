
const express = require('express');
const router = express.Router();
const perfilController = require('../controllers/perfilController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/me', authMiddleware, perfilController.getPerfil);
router.put('/update', authMiddleware, perfilController.editarDatos);
router.post('/desalojar', authMiddleware, perfilController.desalojarCasillero);
router.get('/my-locker', authMiddleware, perfilController.getLockerActivo);
module.exports = router;