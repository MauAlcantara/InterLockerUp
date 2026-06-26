const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ mensaje: 'Acceso denegado. No hay un token activo.' });
    }

    try {
        const verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
        req.user = verified;
        next();

    } catch (error) {
        console.warn('Error de validación de token:', error.message); 
        res.status(400).json({ mensaje: 'Token no válido o expirado.' });
    }
};

module.exports = verificarToken;