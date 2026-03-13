const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importamos la conexión a la base de datos
const db = require('./config/db');

const app = express();

// Middlewares (Configuraciones base)
app.use(cors()); // Permite que los dos frontends se conecten sin error de CORS
app.use(express.json()); // Permite recibir datos en formato JSON (como formularios)

// Ruta de prueba
app.get('/api/status', (req, res) => {
    res.json({ 
        mensaje: 'Backend de InterLockerUp funcionando al 100% 🚀',
        status: 'OK'
    });
});

// Levantar el servidor
const PORT = process.env.PORT || 3000;
app.listen(3000, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}` )
});

//administradores
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const lockerRoutes = require('./routes/lockerRoutes');
const accessRoutes = require('./routes/accessRoutes');
const incidentsRoutes = require('./routes/incidentsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditoriasRoutes = require('./routes/auditsRoutes');
const homeRoutes = require('./routes/homeRoutes');
const adminRoutes = require('./routes/adminRoutes');

//alumnos
const registerUserRoutes = require('./routes/registerUserRoutes')
const historyRoutes = require('./routes/historyRoutes');
const qrRoutes = require('./routes/qrRoutes');
const lockerRequestRoutes = require('./routes/lockerRequestRoutes');
const perfilRoutes = require('./routes/perfilRoutes');
const notificationRoutes = require('./routes/notifications');

// Middlewares
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

// Rutas
app.use('/api/auth', authRoutes); 
app.use('/api/users', userRoutes);
app.use('/api/lockers', lockerRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audits', auditoriasRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/admin', adminRoutes);
//alumnos
app.use('/api/users', registerUserRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/locker-requests', lockerRequestRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/notifications', notificationRoutes);