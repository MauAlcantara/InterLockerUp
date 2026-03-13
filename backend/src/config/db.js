const { Pool } = require('pg');
require('dotenv').config();


console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
     client_encoding: "utf8"
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error conectando a PostgreSQL:', err.stack);
    }
    console.log('Conexión exitosa a la base de datos InterLockerUp');
    release();
});

module.exports = pool;