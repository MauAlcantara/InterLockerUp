const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { 
    createLockerRequest, 
    getUserLockerRequests, 
    getAvailableLockers, 
    cancelLockerRequest,
    getPendingRequests,     // <-- nuevo
    acceptLockerRequest,    // <-- nuevo
    rejectLockerRequest     // <-- nuevo
} = require('../controllers/lockerRequestController');

// Rutas existentes
router.post('/', verificarToken, createLockerRequest);
router.get('/my-requests', verificarToken, getUserLockerRequests);
router.get('/available', verificarToken, getAvailableLockers);
router.delete('/cancel-request/:requestId', verificarToken, cancelLockerRequest);

// Rutas nuevas — solo admin debería llamarlas (puedes agregar middleware de rol si tienes)

router.get('/pending', getPendingRequests)
router.post('/:id/accept', acceptLockerRequest);
router.post('/:id/reject', rejectLockerRequest);

module.exports = router;
