const db = require('../config/db');

const getCarreras = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT carrera FROM gestion.users WHERE carrera IS NOT NULL ORDER BY carrera`
    );
    const carreras = result.rows.map(row => row.carrera);
    res.json(carreras);
  } catch (error) {
    console.error('Error al obtener carreras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { getCarreras };
