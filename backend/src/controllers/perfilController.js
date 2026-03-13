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

/**
 * Proceso complejo para finalizar la ocupación de un casillero.
 * Maneja transacciones SQL para asegurar la integridad entre asignaciones, usuarios y solicitudes.
 */
const desalojarCasillero = async (req, res) => {

    try {
        // Inicia una transacción para asegurar que todos los cambios se apliquen o ninguno.
        await db.query('begin');

        /**
         * Busca una asignación que esté actualmente activa y no haya vencido para el usuario.
         * Verifica la relación en la tabla intermedia assignment_users.
         */
        const findQuery = `
            select au.assignment_id, a.es_compartido, a.locker_id
            from assignment_users au
            join assignments a on au.assignment_id = a.id
            where au.user_id = $1
            and a.status = 'activo'
            and a.fecha_vencimiento > now()
            limit 1
        `;

        const { rows } = await db.query(findQuery, [req.user.id]);

        // Si no se encuentra una asignación válida, se revierte el inicio de la transacción.
        if (rows.length === 0) {
            await db.query('rollback');
            return res.status(404).json({
                error: "no tienes asignaciones activas"
            });
        }

        const { assignment_id, es_compartido, locker_id } = rows[0];

        /**
         * Busca si existe una solicitud de casillero (locker_request) aprobada 
         * vinculada físicamente a este casillero.
         */
        const requestResult = await db.query(
            `
            select id, user_id, companions, shared
            from locker_requests
            where locker_id = $1
            and status = 'approved'
            limit 1
            `,
            [locker_id]
        );

        const request = requestResult.rows[0];

        /* ===============================
           CASO COMPARTIDO: El usuario es uno de varios ocupantes.
        =============================== */
        if (es_compartido) {
            // Elimina únicamente el vínculo de este usuario con la asignación actual.
            await db.query(
                `
                delete from assignment_users
                where user_id = $1
                and assignment_id = $2
                `,
                [req.user.id, assignment_id]
            );

            // Verifica si aún quedan otros usuarios vinculados a esa misma asignación.
            const checkOthers = await db.query(
                `
                select 1
                from assignment_users
                where assignment_id = $1
                `,
                [assignment_id]
            );

            // Si ya no quedan ocupantes, se libera el casillero y se finaliza la asignación.
            if (checkOthers.rows.length === 0) {
                await db.query(
                    `
                    update assignments
                    set status = 'finalizado'
                    where id = $1
                    `,
                    [assignment_id]
                );

                await db.query(
                    `
                    update lockers
                    set estado = 'disponible',
                        updated_at = now()
                    where id = $1
                    `,
                    [locker_id]
                );
            }
        } 
        /* ===============================
           CASO INDIVIDUAL: El usuario es el único ocupante.
        =============================== */
        else {
            // Finaliza la asignación y marca el casillero como disponible directamente.
            await db.query(
                `
                update assignments
                set status = 'finalizado'
                where id = $1
                `,
                [assignment_id]
            );

            await db.query(
                `
                update lockers
                set estado = 'disponible',
                    updated_at = now()
                where id = $1
                `,
                [locker_id]
            );
        }

        /* ===============================
           LIMPIEZA DE SOLICITUDES (LOCKER REQUESTS)
           Ajusta o elimina la solicitud original según quién abandona.
        =============================== */
        if (request) {
            if (!request.shared) {
                // Si la solicitud era individual, se elimina por completo.
                await db.query(
                    `delete from locker_requests where id = $1`,
                    [request.id]
                );
            } else {
                if (request.user_id === req.user.id) {
                    /**
                     * Si el titular de la solicitud compartida es quien abandona:
                     * Se intenta transferir la titularidad al primer compañero en la lista.
                     */
                    const nuevoUsuario = request.companions[0];
                    if (nuevoUsuario) {
                        await db.query(
                            `
                            update locker_requests
                            set user_id = $1,
                                shared = false,
                                companions = '{}'
                            where id = $2
                            `,
                            [nuevoUsuario, request.id]
                        );
                    } else {
                        // Sin compañeros restantes, se borra la solicitud.
                        await db.query(
                            `delete from locker_requests where id = $1`,
                            [request.id]
                        );
                    }
                } else {
                    /**
                     * Si quien abandona es un compañero (no el titular):
                     * Se remueve su ID del arreglo de compañeros en la solicitud.
                     */
                    await db.query(
                        `
                        update locker_requests
                        set companions = array_remove(companions, $1)
                        where id = $2
                        `,
                        [req.user.id, request.id]
                    );
                }
            }
        }
        
        // Confirma todos los cambios en la base de datos.
        await db.query('commit');
        res.json({ message: "casillero desalojado correctamente" });

    } catch (error) {
        // En caso de fallo, revierte cualquier cambio realizado durante la transacción.
        await db.query('rollback');
        console.error(error);
        res.status(500).json({ error: "error al desalojar casillero" });
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
            and (a.status = 'active' or a.status = 'activo')
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