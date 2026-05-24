const { Pool } = require('pg');
require('dotenv').config();

// Validar variables de entorno obligatorias
if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_NAME) {
    console.error('❌ Faltan variables de entorno para la base de datos. Revisa tu archivo .env');
    process.exit(1);
}

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    max: 10, // Número máximo de clientes en el pool
    idleTimeoutMillis: 30000, // Cerrar clientes inactivos después de 30s
    connectionTimeoutMillis: 2000 // Retornar error si no se puede conectar en 2s
});

// Manejo de eventos del pool
pool.on('error', (err, client) => {
    console.error('❌ Error inesperado en el cliente de la base de datos:', err);
    process.exit(1); // Salir si hay un error crítico en el pool
});

pool.on('connect', (client) => {
    console.log('🔌 Nuevo cliente conectado a la base de datos.');
});

pool.on('remove', (client) => {
    console.log('🔌 Cliente removido de la base de datos.');
});

// Verificación de conexión al iniciar
(async () => {
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Conexión a la base de datos establecida correctamente.');
    } catch (err) {
        console.error('❌ Error al conectar con la base de datos:', err.message);
        console.error('   Verifica las credenciales en .env y que el servidor PostgreSQL esté corriendo.');
    }
})();

module.exports = pool;
