const jwt = require('jsonwebtoken');
const db = require('../config/db');

const verificarToken = async (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ mensaje: 'Acceso denegado. No hay un token activo.' });
    }

    try {
        const verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
        req.user = verified;

        // --- SESIÓN ÚNICA: validar que el token corresponde a la sesión activa del usuario ---
        // (solo aplica a administradores para no afectar la experiencia de estudiantes)
        if (verified.rol === 'admin' && verified.jti) {
            const session = await db.query(
                'SELECT token_jti FROM user_sessions WHERE user_id = $1',
                [verified.id]
            );

            if (session.rows.length === 0 || session.rows[0].token_jti !== verified.jti) {
                return res.status(401).json({
                    mensaje: 'Sesión invalidada: esta cuenta inició sesión en otro dispositivo.'
                });
            }
        }

        next();

    } catch (error) {
        console.warn('Error de validación de token:', error.message);
        res.status(400).json({ mensaje: 'Token no válido o expirado.' });
    }
};

module.exports = verificarToken;
