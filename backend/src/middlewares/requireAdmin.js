// Exige que el token verificado pertenezca a un administrador
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.rol === 'admin') {
        return next();
    }
    return res.status(403).json({ mensaje: 'Acceso denegado. Se requiere rol de administrador.' });
};

module.exports = requireAdmin;
