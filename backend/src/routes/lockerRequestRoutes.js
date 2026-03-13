const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { createLockerRequest, getUserLockerRequests, getAvailableLockers, cancelLockerRequest } = require('../controllers/lockerRequestController');

// POST -> crear nueva solicitud
router.post('/', verificarToken, createLockerRequest);

// GET -> obtener todas las solicitudes del usuario logueado
router.get('/my-requests', verificarToken, getUserLockerRequests);
// GET -> obtener los lockers del edificio
router.get("/available", verificarToken, getAvailableLockers);
// GET -> cancelar solicitud de locker
router.delete('/cancel-request/:requestId', verificarToken, cancelLockerRequest);
module.exports = router;