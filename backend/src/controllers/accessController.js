const db = require('../config/db');
const crypto = require('crypto');

const generateQRToken = async (req, res) => {
    const userId = req.user.id;

    try {
        // 1. Buscar la asignación activa del usuario
        const assignment = await db.query(
            `SELECT a.id FROM assignments a 
             INNER JOIN assignment_users au ON a.id = au.assignment_id 
             WHERE au.user_id = $1 AND a.status = 'activa' LIMIT 1`,
            [userId]
        );

        if (assignment.rows.length === 0) {
            return res.status(404).json({ mensaje: 'No tienes un casillero asignado actualmente.' });
        }

        const assignmentId = assignment.rows[0].id;

        // 2. Generar un token único y aleatorio
        const token = crypto.randomBytes(32).toString('hex');
        
        // 3. Definir expiración
        const expiresAt = new Date(Date.now() + 60 * 1000); 

        // 4. Guardar en qr_tokens
        await db.query('DELETE FROM qr_tokens WHERE assignment_id = $1', [assignmentId]);
        await db.query(
            'INSERT INTO qr_tokens (assignment_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [assignmentId, token, expiresAt]
        );

        // 5. Enviamos el token al frontend
        res.json({ 
            token, 
            expiresIn: 60,
            lockerInfo: 'A-12' 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al generar el código de acceso.' });
    }
};

module.exports = { generateQRToken };