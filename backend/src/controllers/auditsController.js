const db = require('../config/db');

const getAuditorias = async (req, res) => {
    try {
        // 1. Historial de Accesos (Aperturas de casilleros)
        const accessReq = db.query(`
            SELECT al.id, l.identificador as locker, u.nombre_completo as user, u.matricula, 
                   al.accion as action, TO_CHAR(al.fecha_hora, 'YYYY-MM-DD HH24:MI:SS') as date, 
                   'app movil' as method
            FROM access_logs al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN assignments a ON al.assignment_id = a.id
            LEFT JOIN lockers l ON a.locker_id = l.id
            ORDER BY al.fecha_hora DESC LIMIT 100
        `);

        // 2. Historial de Asignaciones y Liberaciones
        const assignmentsReq = db.query(`
            SELECT a.id, l.identificador as locker, u.nombre_completo as user, u.matricula, 
                   CASE WHEN a.status = 'activa' THEN 'asignacion' ELSE 'liberacion' END as action, 
                   'Admin UTEQ' as "performedBy", 
                   TO_CHAR(a.created_at, 'YYYY-MM-DD HH24:MI:SS') as date
            FROM assignments a
            LEFT JOIN assignment_users au ON a.id = au.assignment_id
            LEFT JOIN users u ON au.user_id = u.id
            LEFT JOIN lockers l ON a.locker_id = l.id
            ORDER BY a.created_at DESC LIMIT 100
        `);

        // 3. Resumen de Incidencias
        const incidentsReq = db.query(`
            SELECT i.id, l.identificador as locker, i.descripcion as description, 
                   CASE 
                        WHEN i.estado::text = 'en proceso' THEN 'en_proceso' 
                        WHEN i.estado::text = 'resuelta' THEN 'resuelto'
                        ELSE i.estado::text 
                   END as status, 
                   u.nombre_completo as "reportedBy", 
                   TO_CHAR(i.created_at, 'YYYY-MM-DD HH24:MI') as "reportedAt"
            FROM incidents i
            LEFT JOIN users u ON i.user_id = u.id
            LEFT JOIN lockers l ON i.locker_id = l.id
            ORDER BY i.created_at DESC LIMIT 100
        `);

        const [accessRes, assignmentsRes, incidentsRes] = await Promise.all([accessReq, assignmentsReq, incidentsReq]);

        res.json({
            accessLogs: accessRes.rows,
            assignmentLogs: assignmentsRes.rows,
            incidentLogs: incidentsRes.rows
        });

    } catch (error) {
        console.error("Error obteniendo auditorías:", error);
        res.status(500).json({ mensaje: "Error al cargar el historial de auditorías" });
    }
};

module.exports = { getAuditorias };