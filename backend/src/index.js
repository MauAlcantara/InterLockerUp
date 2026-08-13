const express = require('express');
const cors = require('cors');
require('dotenv').config();
const helmet = require('helmet');

const db = require('./config/db');
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://admin.interlockerup.xyz", "https://interlockerup.xyz"],
            connectSrc: ["'self'", "https://admin.interlockerup.xyz", "https://interlockerup.xyz"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
		formAction: ["'self'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
}));

const corsOptions = {
    origin: [
        'https://admin.interlockerup.xyz',
        'https://interlockerup.xyz',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

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
const carrerasRoutes = require('./routes/carrerasRoutes');

app.use('/api/auth', authRoutes);
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
app.use('/api/carreras', carrerasRoutes);
app.use('/api', registerUserRoutes);

app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
    res.redirect('/api/status');
});

app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send('User-agent: *\nDisallow: /');
});
app.get('/api/status', (req, res) => {
    res.json({
        mensaje: 'Backend de InterLockerUp funcionando al 100% 🚀',
        servidor: 'Producción / Online',
        cors_permitido: 'https://admin.interlockerup.xyz'
    });
});

app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('==============================================');
    console.log(`🚀 Servidor listo en puerto: ${PORT}`);
    console.log(`🔒 CORS configurado para: admin.interlockerup.xyz`);
    console.log('==============================================');
});
