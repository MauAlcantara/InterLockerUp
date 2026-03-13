const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/authMiddleware');
const { getUsuarios, crearUsuario, editarUsuario, cambiarEstado, buscarCompañeros } = require('../controllers/usersController');

// Ruta protegida para obtener datos del alumno logueado
router.get('/profile', verificarToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, matricula, nombre_completo, carrera, rol FROM users WHERE id = $1', 
            [req.user.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener el perfil.' });
    }
});

router.get('/', getUsuarios);
router.post('/', crearUsuario);
router.put('/:id', editarUsuario);
router.patch('/:id/status', cambiarEstado);
router.get('/search', verificarToken, buscarCompañeros);
module.exports = router;