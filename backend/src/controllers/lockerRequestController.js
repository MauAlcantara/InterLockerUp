const db = require('../config/db');


const createLockerRequest = async (req, res) => {
    const { lockerId, isShared, partners } = req.body; 
    const userId = req.user.id; 

    try {
        await db.query('BEGIN');

        // 1. Insertar en locker_requests (Estado inicial: pending)
        const queryText = `
            INSERT INTO locker_requests (user_id, locker_id, shared, companions, status) 
            VALUES ($1, $2, $3, $4, 'pending') 
            RETURNING id
        `;

        const values = [
            userId,
            lockerId,
            isShared ? true : false,
            partners || []
        ];

        const result = await db.query(queryText, values);
        const requestId = result.rows[0].id;

        // 2. Insertar en la tabla relacional request_partners
        if (isShared && partners && partners.length > 0) {
            for (const partnerId of partners) {
                await db.query(
                    'INSERT INTO request_partners (request_id, user_id) VALUES ($1, $2)',
                    [requestId, partnerId]
                );
            }
        }

        await db.query(
            'UPDATE lockers SET estado = $1 WHERE id = $2', 
            ['proceso', lockerId] 
        );

        await db.query('COMMIT');

        console.log(`Solicitud #${requestId} registrada. Locker #${lockerId} puesto en espera.`);

        res.status(201).json({ 
            mensaje: "Solicitud enviada correctamente", 
            requestId 
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error("ERROR AL CREAR SOLICITUD:", error.message);
        res.status(500).json({ 
            mensaje: "No se pudo procesar la solicitud",
            error: error.message 
        });
    }
};

const getUserLockerRequests = async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await db.query(
            `SELECT 
                lr.id, 
                lr.locker_id, 
                lr.shared, 
                lr.status, 
                lr.created_at,
                l.identificador AS locker_identificador,
                l.floor AS locker_floor,
                l.ubicacion_detallada,
                b.name AS building_name,
                -- Subconsulta usando la tabla request_partners para filtrar acceso
                (SELECT json_agg(
                    json_build_object(
                        'name', u.nombre_completo, 
                        'matricula', u.matricula
                    )
                 )
                 FROM request_partners rp
                 JOIN users u ON rp.user_id = u.id
                 WHERE rp.request_id = lr.id) AS partners_details
             FROM locker_requests lr
             LEFT JOIN lockers l ON lr.locker_id = l.id
             LEFT JOIN buildings b ON l.building_id = b.id
             WHERE lr.user_id = $1
             ORDER BY lr.created_at DESC`, 
            [userId]
        );

        res.json({ solicitudes: result.rows });

    } catch (error) {
        console.error("Error al obtener solicitudes del usuario:", error.message);
        res.status(500).json({ mensaje: 'Error al obtener las solicitudes de locker.' });
    }
};

const getAvailableLockers = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Obtenemos primero la carrera del usuario
    const userResult = await db.query('SELECT carrera FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }
    const carreraUsuario = userResult.rows[0].carrera;

    // 2. Traemos TODOS los lockers de los edificios que tengan esa carrera
    // CORRECCIÓN: Cambiamos LOWER(TRIM(l.estado)) por l.estado::text para no romper el ENUM
    const result = await db.query(
      `SELECT 
        l.id, 
        l.identificador, 
        l.floor, 
        l.ubicacion_detallada,
        b.name AS edificio, 
        l.estado::text AS estado 
       FROM lockers l
       INNER JOIN buildings b ON l.building_id = b.id
       WHERE b.career = $1
       ORDER BY l.identificador ASC`, 
      [carreraUsuario]
    );

    res.json({ lockers: result.rows });

  } catch (error) {
    console.error("Error al obtener mapa de lockers:", error.message);
    res.status(500).json({ mensaje: "Error al cargar los casilleros." });
  }
};

const cancelLockerRequest = async (req, res) => {
    const userId = req.user.id;
    const { requestId } = req.params;

    try {
        await db.query('BEGIN');

        // 1. Buscamos la solicitud para saber qué locker liberar ANTES de borrarla
        const findRequest = await db.query(
            'SELECT locker_id FROM locker_requests WHERE id = $1 AND user_id = $2 AND status = $3',
            [requestId, userId, 'pending']
        );

        if (findRequest.rowCount === 0) {
            await db.query('ROLLBACK');
            return res.status(400).json({ 
                mensaje: "No se encontró la solicitud o ya no se puede cancelar." 
            });
        }

        const lockerId = findRequest.rows[0].locker_id;

        // 2. Borramos la solicitud (cascada borrará partners si configuraste FK)
        await db.query('DELETE FROM locker_requests WHERE id = $1', [requestId]);

        // 3. ¡IMPORTANTE! Liberamos el locker
        await db.query(
            'UPDATE lockers SET estado = $1 WHERE id = $2', 
            ['disponible', lockerId]
        );

        await db.query('COMMIT');
        res.json({ mensaje: "Solicitud cancelada y locker liberado." });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error("Error al cancelar solicitud:", error.message);
        res.status(500).json({ mensaje: "Error interno al cancelar." });
    }
};

module.exports = { createLockerRequest, getUserLockerRequests, getAvailableLockers, cancelLockerRequest};