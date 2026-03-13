const db = require('../config/db');
const bcrypt = require('bcrypt');

// 1. Obtener todos los usuarios
const getUsuarios = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, nombre_completo as name, email, matricula, 
                   rol as role, status, TO_CHAR(created_at, 'YYYY-MM-DD') as "createdAt"
            FROM users ORDER BY id DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener usuarios" });
    }
};

// 2. Crear usuario desde el panel admin
const crearUsuario = async (req, res) => {
    const { name, email, matricula, role } = req.body;
    try {
        // Le asignamos una contraseña por defecto (ej. Uteq2026!) para que puedan entrar
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('Uteq2026!', salt);

        const newUser = await db.query(
            `INSERT INTO users (nombre_completo, email, matricula, rol, password_hash, status) 
             VALUES ($1, $2, $3, $4, $5, 'activo') RETURNING id, nombre_completo as name, email, matricula, rol as role, status, TO_CHAR(created_at, 'YYYY-MM-DD') as "createdAt"`,
            [name, email, matricula, role, passwordHash]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al crear usuario (Revisa que la matrícula/correo no estén repetidos)" });
    }
};

// 3. Editar usuario
const editarUsuario = async (req, res) => {
    const { id } = req.params;
    const { name, email, matricula, role } = req.body;
    try {
        const updatedUser = await db.query(
            `UPDATE users SET nombre_completo = $1, email = $2, matricula = $3, rol = $4 
             WHERE id = $5 RETURNING id, nombre_completo as name, email, matricula, rol as role, status, TO_CHAR(created_at, 'YYYY-MM-DD') as "createdAt"`,
            [name, email, matricula, role, id]
        );
        res.json(updatedUser.rows[0]);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al editar usuario" });
    }
};

// 4. Activar/Desactivar usuario
const cambiarEstado = async (req, res) => {
    const { id } = req.params;
    try {
        // Primero vemos qué estado tiene actualmente
        const user = await db.query("SELECT status FROM users WHERE id = $1", [id]);
        const nuevoEstado = user.rows[0].status === 'activo' ? 'inactivo' : 'activo';

        await db.query("UPDATE users SET status = $1 WHERE id = $2", [nuevoEstado, id]);
        res.json({ id, status: nuevoEstado });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al cambiar estado" });
    }
};
// Buscar compañeros por nombre o matrícula (Filtrado por carrera)
const buscarCompañeros = async (req, res) => {
    const { q } = req.query; // Lo que el usuario escribe
    const userId = req.user.id; // El ID del usuario que busca

    try {
        // 1. Primero obtenemos la carrera del usuario que está buscando
        const userQuery = await db.query('SELECT carrera FROM users WHERE id = $1', [userId]);
        const miCarrera = userQuery.rows[0].carrera;

        // 2. Buscamos otros usuarios de la misma carrera que coincidan con la búsqueda
        const result = await db.query(`
            SELECT id, nombre_completo as name, matricula 
            FROM users 
            WHERE carrera = $1 
            AND id != $2 
            AND (nombre_completo ILIKE $3 OR matricula ILIKE $3)
            LIMIT 5
        `, [miCarrera, userId, `%${q}%`]);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al buscar compañeros" });
    }
};


module.exports = { getUsuarios, crearUsuario, editarUsuario, cambiarEstado, buscarCompañeros };