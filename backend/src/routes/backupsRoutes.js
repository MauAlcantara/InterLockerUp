const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');
const {
    getBackups,
    getBackup,
    createBackup,
    downloadBackup,
    verifyBackup,
    restoreBackup,
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
} = require('../controllers/backupsController');

// Todas las rutas de respaldos exigen token + rol de administrador
router.use(verificarToken, requireAdmin);

// Programacion (antes de /:id para que 'schedules' no se interprete como id)
router.get('/schedules', getSchedules);
router.post('/schedules', createSchedule);
router.put('/schedules/:id', updateSchedule);
router.delete('/schedules/:id', deleteSchedule);

// Historial y gestion de respaldos
router.get('/', getBackups);
router.get('/:id', getBackup);
router.post('/', createBackup);
router.get('/:id/download', downloadBackup);
router.post('/:id/verificar', verifyBackup);
router.post('/:id/restaurar', restoreBackup);

module.exports = router;
