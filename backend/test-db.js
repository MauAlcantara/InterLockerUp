require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function testConnection() {
  try {
    const res = await pool.query('SELECT nombre_completo, email FROM users WHERE matricula = $1', ['ADMIN001']);
    if (res.rows.length > 0) {
      console.log('✅ CONEXIÓN EXITOSA');
      console.log('👤 Usuario encontrado:', res.rows[0].nombre_completo);
      console.log('📧 Email:', res.rows[0].email);
    } else {
      console.log('⚠️ Conectado, pero no se encontró al ADMIN001.');
    }
  } catch (err) {
    console.error('❌ ERROR DE CONEXIÓN:', err.message);
  } finally {
    await pool.end();
  }
}

testConnection();