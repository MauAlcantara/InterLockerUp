const db = require('../config/db')

/**
 * Controlador para obtener el historial completo de un usuario.
 * Recupera solicitudes, asignaciones y registros de acceso desde la base de datos.
 */
const getUserHistory = async (req, res) => {

    // Extrae el ID del usuario del objeto de solicitud, establecido previamente por el middleware de autenticación.
    const userId = req.user.id

    try {

        /**
         * Consulta las solicitudes de casilleros realizadas por el usuario.
         * Selecciona detalles de la tabla locker_requests filtrando por el ID del usuario.
         * Los resultados se ordenan de la solicitud más reciente a la más antigua.
         */
        const requestsResult = await db.query(
            `select lr.id, lr.locker_id, lr.shared, lr.companions, lr.status, lr.created_at
             from locker_requests lr
             where lr.user_id = $1
             order by lr.created_at desc`,
            [userId]
        )

        /**
         * Consulta los casilleros que han sido asignados al usuario.
         * Utiliza un JOIN con assignment_users para encontrar todas las asignaciones vinculadas a este usuario específico.
         * Retorna información sobre la vigencia, el estado y si el casillero es compartido.
         */
        const assignmentsResult = await db.query(
            `select a.id, a.locker_id, a.fecha_inicio, a.fecha_vencimiento, a.es_compartido, a.status
             from assignments a
             join assignment_users au on a.id = au.assignment_id
             where au.user_id = $1
             order by a.fecha_inicio desc`,
            [userId]
        )

        /**
         * Consulta los registros de actividad o bitácora de acceso del usuario.
         * Recupera qué acciones realizó (abrir, cerrar, etc.) y en qué momento exacto ocurrieron.
         * Ordena los resultados cronológicamente de forma descendente.
         */
        const accessLogsResult = await db.query(
            `select
                al.id,
                al.assignment_id,
                al.user_id,
                al.accion,
                al.fecha_hora
             from access_logs al
             where al.user_id = $1
             order by al.fecha_hora desc`,
            [userId]
        )

        /**
         * Envía una respuesta exitosa al cliente.
         * Consolida los resultados de las tres consultas anteriores en un solo objeto JSON.
         */
        res.json({
            requests: requestsResult.rows,
            assignments: assignmentsResult.rows,
            access_logs: accessLogsResult.rows
        })

    } catch (error) {

        // Registra el error en la consola para depuración técnica del lado del servidor.
        console.error("error al obtener historial:", error)

        // Responde con un código de estado 500 indicando un fallo interno en el servidor.
        res.status(500).json({
            message: "error al obtener historial"
        })
    }
}

// Exporta la función para que pueda ser utilizada en las rutas de la aplicación.
module.exports = { getUserHistory }