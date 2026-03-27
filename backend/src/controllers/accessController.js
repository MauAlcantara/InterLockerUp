const db = require('../config/db');
const crypto = require('crypto');

const generateQRToken = async (req, res) => {
    const userId = req.user.id;
    const lockerNum = 'A-12'; // Lo ideal sería obtener esto de la DB en el paso 1

    try {
        // 1. Buscar la asignación activa del usuario
        const assignment = await db.query(
            `SELECT a.id, l.identificador 
             FROM assignments a 
             INNER JOIN assignment_users au ON a.id = au.assignment_id 
             INNER JOIN lockers l ON a.locker_id = l.id
             WHERE au.user_id = $1 AND a.status = 'activa' LIMIT 1`,
            [userId]
        );

        if (assignment.rows.length === 0) {
            // REGISTRO DE ACCESO DENEGADO (No tiene asignación)
            await db.query(
                `INSERT INTO access_logs (user_id, accion, resultado, motivo) 
                 VALUES ($1, $2, $3, $4)`,
                [userId, 'GENERAR_QR', 'denegado', 'Usuario sin asignación activa']
            );
            return res.status(404).json({ mensaje: 'No tienes un casillero asignado actualmente.' });
        }

        const assignmentId = assignment.rows[0].id;
        const currentLocker = assignment.rows[0].identificador;

        // 2. Generar un token único y aleatorio
        const token = crypto.randomBytes(32).toString('hex');
        
        // 3. Definir expiración (1 minuto)
        const expiresAt = new Date(Date.now() + 60 * 1000); 

        // 4. Guardar en qr_tokens (Limpiar anteriores e insertar nuevo)
        await db.query('DELETE FROM qr_tokens WHERE assignment_id = $1', [assignmentId]);
        await db.query(
            'INSERT INTO qr_tokens (assignment_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [assignmentId, token, expiresAt]
        );

        // 5. REGISTRO DE LOG EXITOSO (Uso de las nuevas columnas)
        await db.query(
            `INSERT INTO access_logs (user_id, assignment_id, accion, locker_numero, resultado, motivo, codigo_usado) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, assignmentId, 'GENERAR_QR', currentLocker, 'exitoso', 'Token generado correctamente', token.substring(0, 8) + '...']
        );

        // 6. Enviamos el token al frontend
        res.json({ 
            token, 
            expiresIn: 60,
            lockerInfo: currentLocker 
        });

    } catch (error) {
        console.error("Error en generateQRToken:", error);
        res.status(500).json({ mensaje: 'Error al generar el código de acceso.' });
    }
};

module.exports = { generateQRToken };