const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error conectando a PostgreSQL:', err.stack);
    }
    console.log('Conexión exitosa a la base de datos InterLockerUp');
    release();
});

module.exports = pool;