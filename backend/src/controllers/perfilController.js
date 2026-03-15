const db = require('../config/db'); // Tu pool de PostgreSQL

/**
 * Controlador para obtener la información del perfil del usuario logueado.
 * Retorna datos básicos y la carrera académica asociada.
 */
const getPerfil = async (req, res) => {
    try {
        // Ejecuta consulta para obtener campos específicos del usuario mediante su ID de sesión.
        const query = 'SELECT id, matricula, nombre_completo, email, carrera FROM users WHERE id = $1';
        const { rows } = await db.query(query, [req.user.id]);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener perfil" });
    }
};

/**
 * Permite al usuario actualizar su nombre completo y carrera.
 */
const editarDatos = async (req, res) => {
    const { nombre_completo, carrera } = req.body;
    try {
        // Actualiza los registros en la tabla users basándose en el ID del usuario autenticado.
        await db.query('UPDATE users SET nombre_completo = $1, carrera = $2 WHERE id = $3', 
            [nombre_completo, carrera, req.user.id]);
        res.json({ message: "Datos actualizados" });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar" });
    }
};

const desalojarCasillero = async (req, res) => {
    try {
        // Idea de tu compañera: Normalización segura del ID
        const usuarioId = req.user?.id || req.user?.user?.id;

        if (!usuarioId) {
            return res.status(401).json({ error: "No se pudo identificar al usuario del token" });
        }

        // ¡SÚPER IMPORTANTE! Pedimos una conexión exclusiva para que no choquen los alumnos
        const client = await db.connect();

        try {
            await client.query('BEGIN'); // Ahora el BEGIN es seguro

            // FIX 1: Cambiamos 'active' por la lista con 'activa'
            const findQuery = `
                SELECT au.assignment_id, a.es_compartido, a.locker_id
                FROM assignment_users au
                JOIN assignments a ON au.assignment_id = a.id
                WHERE au.user_id = $1
                AND a.status IN ('activa', 'activo', 'active') 
                AND a.fecha_vencimiento > now()
                LIMIT 1
            `;

            const { rows } = await client.query(findQuery, [usuarioId]);

            if (rows.length === 0) {
                await client.query('ROLLBACK');
                client.release(); // Liberamos la conexión
                return res.status(404).json({ error: "No tienes asignaciones activas para desalojar" });
            }

            const { assignment_id, es_compartido, locker_id } = rows[0];

            const requestResult = await client.query(
                `SELECT id, user_id, companions, shared
                 FROM locker_requests
                 WHERE locker_id = $1 AND status = 'approved' LIMIT 1`,
                [locker_id]
            );

            const request = requestResult.rows[0];

            if (es_compartido) {
                await client.query(`DELETE FROM assignment_users WHERE user_id = $1 AND assignment_id = $2`, [usuarioId, assignment_id]);

                const checkOthers = await client.query(`SELECT 1 FROM assignment_users WHERE assignment_id = $1`, [assignment_id]);

                if (checkOthers.rows.length === 0) {
                    await client.query(`UPDATE assignments SET status = 'finalizado' WHERE id = $1`, [assignment_id]);
                    await client.query(`UPDATE lockers SET estado = 'disponible', updated_at = now() WHERE id = $1`, [locker_id]);
                }
            } else {
                await client.query(`UPDATE assignments SET status = 'finalizado' WHERE id = $1`, [assignment_id]);
                await client.query(`UPDATE lockers SET estado = 'disponible', updated_at = now() WHERE id = $1`, [locker_id]);
            }

            if (request) {
                if (!request.shared) {
                    await client.query(`DELETE FROM locker_requests WHERE id = $1`, [request.id]);
                } else {
                    if (request.user_id === usuarioId) {
                        const nuevoUsuario = request.companions[0];
                        if (nuevoUsuario) {
                            await client.query(`UPDATE locker_requests SET user_id = $1, shared = false, companions = '{}' WHERE id = $2`, [nuevoUsuario, request.id]);
                        } else {
                            await client.query(`DELETE FROM locker_requests WHERE id = $1`, [request.id]);
                        }
                    } else {
                        await client.query(`UPDATE locker_requests SET companions = array_remove(companions, $1) WHERE id = $2`, [usuarioId, request.id]);
                    }
                }
            }

            await client.query('COMMIT');
            client.release(); // Éxito: Guardamos y liberamos conexión
            res.json({ message: "Casillero desalojado correctamente" });

        } catch (innerError) {
            await client.query('ROLLBACK');
            client.release(); // Error: Deshacemos todo y liberamos conexión
            throw innerError; // Mandamos el error al catch principal
        }

    } catch (error) {
        console.error("Error en desalojarCasillero:", error);
        res.status(500).json({ error: "Error al desalojar casillero", detalle: error.message });
    }
};
/**
 * Obtiene los detalles del casillero que el usuario tiene actualmente en uso.
 * Calcula también el tiempo restante antes del vencimiento.
 */
const getLockerActivo = async (req, res) => {
    try {
        const query = `
            select 
                l.id as id,
                l.identificador as numero,
                l.floor as piso,
                b.name as edificio,
                a.fecha_vencimiento
            from assignment_users au
            join assignments a on au.assignment_id = a.id
            join lockers l on a.locker_id = l.id
            join buildings b on l.building_id = b.id
            where au.user_id = $1
            -- CORRECCIÓN: Agregamos 'activa' a la lista de estados válidos
            and a.status IN ('activa', 'activo', 'active') 
            and a.fecha_vencimiento > now()
            limit 1
        `;
        
        const { rows } = await db.query(query, [req.user.id]);
        
        if (rows.length === 0) {
            return res.json(null);
        }

        // Cálculo de la diferencia de tiempo entre el momento actual y el vencimiento.
        const ahora = new Date();
        const vencimiento = new Date(rows[0].fecha_vencimiento);
        const diffMs = vencimiento - ahora;
        const diffMin = Math.max(0, Math.floor(diffMs / 60000)); // Conversión a minutos.

        res.json({
            ...rows[0],
            timeLeft: diffMin
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener casillero" });
    }
};

module.exports = { getPerfil, editarDatos, desalojarCasillero, getLockerActivo };