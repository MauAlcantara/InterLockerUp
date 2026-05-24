const { Pool } = require('pg');
require('dotenv').config();

// Validar variables de entorno obligatorias
const requeridas = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME'];
const faltantes = requeridas.filter((v) => !process.env[v]);
if (faltantes.length > 0) {
    console.error(`❌ Faltan variables de entorno para la base de datos: ${faltantes.join(', ')}. Revisa tu archivo .env`);
    process.exit(1);
}

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    options: '-c search_path=gestion,iot,public',
    max: 10,                        // Máximo de clientes en el pool
    idleTimeoutMillis: 30000,       // Cierra clientes inactivos tras 30s
    connectionTimeoutMillis: 5000   // Error si no conecta en 5s
});

// Un error en un cliente inactivo no debe tumbar el servidor
pool.on('error', (err) => {
    console.error('❌ Error inesperado en un cliente de la base de datos:', err.message);
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
