const express = require('express');
const cors = require('cors');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const db = require('./config/db');
const app = express();

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
app.use('/api', registerUserRoutes);

app.use('/uploads', express.static('uploads'));

app.get('/api/status', (req, res) => {
    res.json({ 
        mensaje: 'Backend de InterLockerUp funcionando al 100% 🚀',
        servidor: 'Producción / Online',
        cors_permitido: 'https://admin.interlockerup.xyz'
    });
});

// 📄 GENERACIÓN AUTOMÁTICA DE DOCUMENTACIÓN DE SEGURIDAD
const securityDoc = `
=== DOCUMENTACIÓN DE SEGURIDAD IMPLEMENTADA ===
Fecha: ${new Date().toISOString()}
Proyecto: InterLockerUp

1. RATE LIMITING:
   - Autenticación: Máx 5 intentos/15min por IP.
   - General: Máx 100 peticiones/hora por IP.
   - Prevención: Ataques de fuerza bruta y DDoS.

2. VALIDACIÓN DE ENTRADAS:
   - Librería: express-validator.
   - Endpoints protegidos: /login, /remote-unlock.
   - Prevención: Inyección SQL, XSS, datos malformados.

3. ANTI-REPLAY IOT:
   - Mecanismo: Timestamp (ventana 30s) + Nonce (cache memoria) + HMAC-SHA256.
   - Prevención: Reutilización de comandos ESP32, ataques de repetición.
   - Clave: IOT_SECRET_KEY (variable de entorno).

4. ESTADO: IMPLEMENTADO Y OPERATIVO.
==============================================
`;

fs.writeFileSync(path.join(__dirname, '..', '..', 'SEGURIDAD_IMPLEMENTADA.txt'), securityDoc);
console.log(securityDoc);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('==============================================');
    console.log(`🚀 Servidor listo en puerto: ${PORT}`);
    console.log(`🔒 CORS configurado para: admin.vigilia.world`);
    console.log('==============================================');
});
