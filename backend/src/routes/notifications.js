const express = require('express');
const router = express.Router();

const {
    getNotifications,
    markAsRead,
    createNotification
} = require('../controllers/notificationController');

const authMiddleware = require('../middlewares/authMiddleware');


/* obtener notificaciones */
router.get('/', authMiddleware, getNotifications);


/* marcar como leida */
router.put('/:id/read', authMiddleware, markAsRead);


/* crear notificacion */
router.post('/', authMiddleware, createNotification);


module.exports = router;