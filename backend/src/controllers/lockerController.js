const db = require('../config/db');

const getAvailableLockers = async (req, res) => {
    try {
        // Buscamos solo los que tienen estado 'disponible'
        const result = await db.query(
            'SELECT * FROM lockers WHERE estado = $1 ORDER BY identificador ASC', 
            ['disponible']
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'No pudimos obtener la lista de casilleros.' });
    }
};

const assignLocker = async (req, res) => {
    const { locker_id, es_compartido, partner_id, fecha_vencimiento } = req.body;
    const userId = req.user.id; // Obtenido del token

    const client = await db.connect(); // Iniciamos conexión para la transacción

    try {
        await client.query('BEGIN'); // Inicio de la transacción

        // 1. Verificar si el casillero sigue disponible
        const lockerCheck = await client.query(
            'SELECT estado FROM lockers WHERE id = $1 FOR UPDATE', // BLOQUEA la fila para evitar colisiones
            [locker_id]
        );

        if (lockerCheck.rows[0].estado !== 'disponible') {
            throw new Error('El casillero ya no está disponible.');
        }

        // 2. Crear la cabecera de la asignación
        const assignmentResult = await client.query(
            'INSERT INTO assignments (locker_id, fecha_vencimiento, es_compartido) VALUES ($1, $2, $3) RETURNING id',
            [locker_id, fecha_vencimiento, es_compartido]
        );
        const assignmentId = assignmentResult.rows[0].id;

        // 3. Vincular al alumno que solicita
        await client.query(
            'INSERT INTO assignment_users (assignment_id, user_id) VALUES ($1, $2)',
            [assignmentId, userId]
        );

        // 4. Si es compartido, vincular al compañero
        if (es_compartido && partner_id) {
            await client.query(
                'INSERT INTO assignment_users (assignment_id, user_id) VALUES ($1, $2)',
                [assignmentId, partner_id]
            );
        }

        // 5. Actualizar el estado del casillero a 'ocupado'
        await client.query(
            "UPDATE lockers SET estado = 'ocupado' WHERE id = $1",
            [locker_id]
        );

        await client.query('COMMIT'); // Guardamos todos los cambios
        res.status(201).json({ mensaje: '¡Casillero asignado con éxito!', assignmentId });

    } catch (error) {
        await client.query('ROLLBACK'); // Si algo falla, deshacemos todo
        res.status(400).json({ mensaje: error.message || 'Error al procesar la asignación.' });
    } finally {
        client.release();
    }
};

const getAllLockersAdmin = async (req, res) => {
    try {
        // Hacemos un JOIN con buildings para traer el nombre del edificio
        // Transformamos l.estado::text para evitar conflictos con el ENUM
        const result = await db.query(`
            SELECT 
                l.id, 
                l.identificador, 
                l.estado::text AS estado, 
                l.ubicacion_detallada, 
                l.floor,
                b.name AS edificio
            FROM lockers l
            LEFT JOIN buildings b ON l.building_id = b.id
            ORDER BY l.identificador ASC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener inventario de casilleros:", error);
        res.status(500).json({ mensaje: 'Error interno al cargar los casilleros.' });
    }
};

// --- FUNCIONES EXCLUSIVAS DEL ADMINISTRADOR ---

// Asignar un locker a un alumno por su matrícula
const assignLockerAdmin = async (req, res) => {
    const { locker_id, matricula_usuario } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Obtener el ID del usuario a partir de su matrícula
        const userResult = await client.query('SELECT id FROM users WHERE matricula = $1', [matricula_usuario]);
        if (userResult.rows.length === 0) {
            throw new Error('Alumno no encontrado en la base de datos.');
        }
        const alumnoId = userResult.rows[0].id;

        // 2. Verificar que el locker siga disponible
        const lockerCheck = await client.query('SELECT estado FROM lockers WHERE id = $1 FOR UPDATE', [locker_id]);
        if (lockerCheck.rows[0].estado !== 'disponible') {
            throw new Error('El casillero ya no está disponible.');
        }

        // 3. Crear asignación (Por defecto, le damos 6 meses de vigencia)
        const fecha_vencimiento = new Date();
        fecha_vencimiento.setMonth(fecha_vencimiento.getMonth() + 6);

        const assignmentResult = await client.query(
            "INSERT INTO assignments (locker_id, fecha_vencimiento, es_compartido, status) VALUES ($1, $2, false, 'activa') RETURNING id",
            [locker_id, fecha_vencimiento]
        );
        const assignmentId = assignmentResult.rows[0].id;

        // 4. Vincular al alumno
        await client.query(
            'INSERT INTO assignment_users (assignment_id, user_id) VALUES ($1, $2)',
            [assignmentId, alumnoId]
        );

        // 5. Actualizar estado del casillero
        await client.query("UPDATE lockers SET estado = 'ocupado' WHERE id = $1", [locker_id]);

        await client.query('COMMIT');
        res.status(201).json({ mensaje: 'Casillero asignado correctamente por el administrador.' });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ mensaje: error.message });
    } finally {
        client.release();
    }
};

// Liberar un locker ocupado
const releaseLockerAdmin = async (req, res) => {
    const { id } = req.params; // ID del casillero
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Marcar cualquier asignación activa como finalizada
        await client.query(
            "UPDATE assignments SET status = 'finalizado' WHERE locker_id = $1 AND status = 'activa'",
            [id]
        );

        // 2. Liberar el casillero
        await client.query("UPDATE lockers SET estado = 'disponible' WHERE id = $1", [id]);

        await client.query('COMMIT');
        res.json({ mensaje: 'Casillero liberado correctamente.' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ mensaje: 'Error al liberar el casillero.' });
    } finally {
        client.release();
    }
};

// Cambiar el estado manualmente (Mantenimiento, Disponible, etc.)
const changeLockerStatusAdmin = async (req, res) => {
    const { id } = req.params;
    const { nuevo_estado } = req.body;
    try {
        await db.query("UPDATE lockers SET estado = $1 WHERE id = $2", [nuevo_estado, id]);
        res.json({ mensaje: `Estado actualizado a ${nuevo_estado}` });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar el estado.' });
    }
};

// --- FUNCIÓN EXCLUSIVA DEL ADMINISTRADOR ---
const approveLockerRequestAdmin = async (req, res) => {
    const { requestId } = req.params;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Buscamos la solicitud en estado 'pending'
        const requestQuery = await client.query(
            'SELECT * FROM locker_requests WHERE id = $1 AND status = $2', 
            [requestId, 'pending']
        );
        
        if(requestQuery.rows.length === 0) {
            throw new Error('La solicitud no existe o ya fue procesada.');
        }
        const solicitud = requestQuery.rows[0];

        // 2. Creamos la asignación oficial (Vigencia de 6 meses)
        const fecha_vencimiento = new Date();
        fecha_vencimiento.setMonth(fecha_vencimiento.getMonth() + 6);

        const assignmentResult = await client.query(
            "INSERT INTO assignments (locker_id, fecha_vencimiento, es_compartido, status) VALUES ($1, $2, $3, 'activa') RETURNING id",
            [solicitud.locker_id, fecha_vencimiento, solicitud.shared]
        );
        const assignmentId = assignmentResult.rows[0].id;

        // 3. Vinculamos al alumno titular
        await client.query(
            'INSERT INTO assignment_users (assignment_id, user_id) VALUES ($1, $2)', 
            [assignmentId, solicitud.user_id]
        );

        // 4. CORRECCIÓN: Vinculamos a los compañeros usando el arreglo correcto 'companions' de la BD
        if (solicitud.shared && solicitud.companions && solicitud.companions.length > 0) {
            for(const partnerId of solicitud.companions) {
                await client.query(
                    'INSERT INTO assignment_users (assignment_id, user_id) VALUES ($1, $2)', 
                    [assignmentId, partnerId]
                );
            }
        }

        // 5. Actualizamos los estados
        await client.query("UPDATE locker_requests SET status = 'approved' WHERE id = $1", [requestId]);
        await client.query("UPDATE lockers SET estado = 'ocupado' WHERE id = $1", [solicitud.locker_id]);

        // 6. Rechazamos otras solicitudes pendientes para este casillero
        await client.query("UPDATE locker_requests SET status = 'rejected' WHERE locker_id = $1 AND status = 'pending'", [solicitud.locker_id]);

        // 7. NOTIFICACIÓN AUTOMÁTICA AL ALUMNO
        await client.query(
            "INSERT INTO notifications (user_id, mensaje, tipo) VALUES ($1, $2, $3)",
            [solicitud.user_id, `¡Felicidades! Tu solicitud ha sido aprobada. Puedes empezar a usar tu casillero.`, "success"]
        );

        await client.query('COMMIT');
        res.json({ mensaje: '¡Solicitud aprobada y casillero asignado oficialmente!' });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ mensaje: error.message });
    } finally {
        client.release();
    }
};

// --- Traer todas las solicitudes pendientes ---
const getPendingRequestsAdmin = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                lr.id,
                lr.locker_id,
                lr.shared,
                lr.status,
                lr.created_at,
                l.identificador AS locker_identificador,
                u.nombre_completo AS usuario_nombre,
                u.matricula AS usuario_matricula
            FROM locker_requests lr
            JOIN lockers l ON lr.locker_id = l.id
            JOIN users u ON lr.user_id = u.id
            WHERE lr.status = 'pending'
            ORDER BY lr.created_at ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener solicitudes pendientes:", error);
        res.status(500).json({ mensaje: "Error al cargar solicitudes" });
    }
};

// --- Rechazar solicitud y notificar al alumno ---
const rejectLockerRequestAdmin = async (req, res) => {
    const { requestId } = req.params;
    try {
        // 1. Buscamos de quién es la solicitud
        const reqData = await db.query("SELECT locker_id, user_id FROM locker_requests WHERE id = $1", [requestId]);
        if (reqData.rows.length === 0) return res.status(404).json({ mensaje: "Solicitud no encontrada" });

        const { locker_id, user_id } = reqData.rows[0];

        // 2. Rechazar
        await db.query("UPDATE locker_requests SET status = 'rejected' WHERE id = $1", [requestId]);

        // 3. Liberar el locker para que otro lo pueda pedir
        await db.query("UPDATE lockers SET estado = 'disponible' WHERE id = $1", [locker_id]);

        // 4. NOTIFICACIÓN AL ALUMNO
        await db.query(
            "INSERT INTO notifications (user_id, mensaje, tipo) VALUES ($1, $2, $3)",
            [user_id, "Tu solicitud de casillero ha sido rechazada. Pasa a administración para más detalles.", "error"]
        );

        res.json({ mensaje: "Solicitud rechazada" });
    } catch (error) {
        console.error("Error al rechazar solicitud:", error);
        res.status(500).json({ mensaje: "Error interno" });
    }
};

module.exports = { getAvailableLockers, assignLocker, getAllLockersAdmin, changeLockerStatusAdmin, releaseLockerAdmin, assignLockerAdmin, approveLockerRequestAdmin, getPendingRequestsAdmin, rejectLockerRequestAdmin};