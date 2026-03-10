const db = require('../config/db');

const getAvailableLockers = async (req, res) => {
    try {
        // Consulta para obtener los lockers
        const result = await db.query(
            'SELECT id, identificador, ubicacion_detallada, estado FROM lockers ORDER BY identificador ASC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'No pudimos obtener la lista de casilleros.' });
    }
};

const assignLocker = async (req, res) => {
    const { locker_id, es_compartido, partner_matricula, fecha_vencimiento } = req.body;
    const userId = req.user.id; 

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Verifica si el casillero sigue disponible
        const lockerCheck = await client.query('SELECT estado FROM lockers WHERE id = $1 FOR UPDATE', [locker_id]);
        if (lockerCheck.rows[0].estado !== 'disponible') {
            throw new Error('El casillero ya no está disponible.');
        }

        // 2. Hace la asignación
        const assignmentResult = await client.query(
            'INSERT INTO assignments (locker_id, fecha_vencimiento, es_compartido) VALUES ($1, $2, $3) RETURNING id',
            [locker_id, fecha_vencimiento, es_compartido]
        );
        const assignmentId = assignmentResult.rows[0].id;

        // 3. Vincula el casillero con el alumno
        await client.query('INSERT INTO assignment_users (assignment_id, user_id) VALUES ($1, $2)', [assignmentId, userId]);

        // 4. Funcion para los lockers compartidos
        if (es_compartido && partner_matricula) {
            const partnerRes = await client.query('SELECT id FROM users WHERE matricula = $1', [partner_matricula]);
            if (partnerRes.rows.length === 0) {
                throw new Error('No se encontró a ningún compañero con esa matrícula.');
            }
            await client.query('INSERT INTO assignment_users (assignment_id, user_id) VALUES ($1, $2)', [assignmentId, partnerRes.rows[0].id]);
        }

        // 5. Funcion para ocupar un casillero
        await client.query("UPDATE lockers SET estado = 'ocupado' WHERE id = $1", [locker_id]);

        await client.query('COMMIT');
        res.status(201).json({ mensaje: '¡Casillero asignado con éxito!', assignmentId });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ mensaje: error.message || 'Error al procesar la asignación.' });
    } finally {
        client.release();
    }
};

const getMyLockers = async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await db.query(`
            SELECT l.id, l.identificador, l.ubicacion_detallada 
            FROM lockers l
            JOIN assignments a ON l.id = a.locker_id
            JOIN assignment_users au ON a.id = au.assignment_id
            WHERE au.user_id = $1 AND a.status = 'activa'
        `, [userId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener mis lockers:", error);
        res.status(500).json({ mensaje: 'Error al obtener tus casilleros.' });
    }
};


// --- FUNCIONES PARA EL ADMINISTRADOR ---

// 1. Obtener TODOS los lockers con su usuario asignado
const getAdminLockers = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                l.id as locker_id, l.identificador, l.ubicacion_detallada, l.estado,
                u.id as user_id, u.nombre_completo, u.matricula
            FROM lockers l
            LEFT JOIN assignments a ON l.id = a.locker_id AND a.status = 'activa'
            LEFT JOIN assignment_users au ON a.id = au.assignment_id
            LEFT JOIN users u ON au.user_id = u.id
            ORDER BY l.identificador ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al cargar los lockers para el admin.' });
    }
};

// 2. Cambiar estado del locker
const adminUpdateStatus = async (req, res) => {
    const { id } = req.params;
    const { nuevo_estado } = req.body;
    try {
        await db.query("UPDATE lockers SET estado = $1 WHERE id = $2", [nuevo_estado, id]);
        res.json({ mensaje: "Estado actualizado correctamente" });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al actualizar estado" });
    }
};

// 3. Forzar liberación de casillero
const adminReleaseLocker = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('BEGIN');
        await db.query("UPDATE assignments SET status = 'finalizada' WHERE locker_id = $1 AND status = 'activa'", [id]);
        await db.query("UPDATE lockers SET estado = 'disponible' WHERE id = $1", [id]);
        await db.query('COMMIT');
        res.json({ mensaje: "Locker liberado correctamente" });
    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ mensaje: "Error al liberar locker" });
    }
};

// 4. Asignación manual del locker
const adminManualAssign = async (req, res) => {
    const { locker_id, matricula_usuario } = req.body;
    try {
        await db.query('BEGIN');
        const userRes = await db.query("SELECT id FROM users WHERE matricula = $1", [matricula_usuario]);
        if(userRes.rows.length === 0) throw new Error("Usuario no encontrado");
        const userId = userRes.rows[0].id;

        const fecha_vencimiento = new Date();
        fecha_vencimiento.setMonth(fecha_vencimiento.getMonth() + 4);

        // Crea la asignación
        const assignRes = await db.query(
            "INSERT INTO assignments (locker_id, fecha_vencimiento) VALUES ($1, $2) RETURNING id",
            [locker_id, fecha_vencimiento]
        );
        const assignId = assignRes.rows[0].id;

        // Vincula al usuario
        await db.query("INSERT INTO assignment_users (assignment_id, user_id) VALUES ($1, $2)", [assignId, userId]);
        
        // Ocupa el locker
        await db.query("UPDATE lockers SET estado = 'ocupado' WHERE id = $1", [locker_id]);
        
        await db.query('COMMIT');
        res.json({ mensaje: "Asignación manual exitosa" });
    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ mensaje: error.message || "Error en la asignación manual" });
    }
};

module.exports = { 
    getAvailableLockers, 
    assignLocker, 
    getAdminLockers, 
    adminUpdateStatus, 
    adminReleaseLocker, 
    adminManualAssign,
    getMyLockers
};