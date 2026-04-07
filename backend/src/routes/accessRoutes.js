const express = require('express');
const router = express.Router();

// Importamos el middleware para verificar que el alumno tiene sesión iniciada
const verificarToken = require('../middlewares/authMiddleware');

// Importamos las dos nuevas funciones que creamos en el controlador
const { 
    solicitarPinCorreo, 
    abrirLockerRemoto 
} = require('../controllers/accessController');

// 1. Ruta para que el frontend solicite el PIN por correo
// Endpoint final: POST /api/access/request-pin
router.post('/request-pin', verificarToken, solicitarPinCorreo);

// 2. Ruta para que el frontend envíe el PIN que el usuario tecleó para abrir
// Endpoint final: POST /api/access/remote-unlock
router.post('/remote-unlock', verificarToken, abrirLockerRemoto);

module.exports = router;