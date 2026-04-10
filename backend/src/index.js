const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Conexión a DB
const db = require('./config/db');

const app = express();

// --- CONFIGURACIÓN DE SEGURIDAD CORS ---
const corsOptions = {
    origin: [
        'https://admin.vigilia.world', // Tu dominio en producción
        'http://localhost:5173',
        'http://localhost:5174', // Desarrollo local con Vite
        'http://localhost:3000'        // Otros entornos locales
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,                 // Permite el paso de headers de autenticación
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json()); // Middleware para leer JSON

// Importación de todas las rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const lockerRoutes = require('./routes/lockerRoutes');
const accessRoutes = require('./routes/accessRoutes');
const incidentsRoutes = require('./routes/incidentsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditoriasRoutes = require('./routes/auditsRoutes');
const homeRoutes = require('./routes/homeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const perfilRoutes = require('./routes/perfilRoutes');
const notificationsRoutes = require('./routes/notifications');
const qrRoutes = require('./routes/qrRoutes');
const lockerRequestRoutes = require('./routes/lockerRequestRoutes');
const historyRoutes = require('./routes/historyRoutes');
const registerUserRoutes = require('./routes/registerUserRoutes');

// Definición de Endpoints
app.use('/api/auth', authRoutes); 
app.use('/api/me', perfilRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lockers', lockerRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audits', auditoriasRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/locker-requests', lockerRequestRoutes);
app.use('/api/history', historyRoutes);
app.use('/api', registerUserRoutes);

// Servir archivos estáticos (imágenes de evidencia)
app.use('/uploads', express.static('uploads'));

// Ruta de estado para verificar que el servidor vive
app.get('/api/status', (req, res) => {
    res.json({ 
        mensaje: 'Backend de InterLockerUp funcionando al 100% 🚀',
        servidor: 'Producción / Online',
        cors_permitido: 'https://admin.vigilia.world'
    });
});

// Inicio del Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('==============================================');
    console.log(`🚀 Servidor listo en puerto: ${PORT}`);
    console.log(`🔒 CORS configurado para: admin.vigilia.world`);
    console.log('==============================================');
});