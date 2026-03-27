const express = require('express');
const router = express.Router();

// 1. Importamos tus controladores actuales y los nuevos
const { getNotificaciones } = require('../controllers/adminController'); // El que ya tenías
const dashboardCtrl = require('../controllers/dashboardController');    // Para los KPIs y gráficas
const requestCtrl = require('../controllers/requestController');        // Para aprobar/rechazar

// 2. Importamos el middleware de seguridad que ya usas
const verificarToken = require('../middlewares/authMiddleware');

// --- RUTAS EXISTENTES ---
// Ruta para las notificaciones de la campanita
router.get('/notificaciones', verificarToken, getNotificaciones);


// --- NUEVAS RUTAS PARA EL HUB PRINCIPAL ---

// Obtener estadísticas, alertas y solicitudes pendientes
// URL completa: GET /api/admin/dashboard/stats
router.get('/dashboard/stats', verificarToken, dashboardCtrl.getDashboardStats);

// Procesar (Aprobar/Rechazar) una solicitud de locker
// URL completa: PATCH /api/admin/requests/:requestId
router.patch('/requests/:requestId', verificarToken, requestCtrl.processLockerRequest);

module.exports = router;