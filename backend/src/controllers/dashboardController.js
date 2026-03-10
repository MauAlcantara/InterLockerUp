const db = require('../config/db');

const getDashboardStats = async (req, res) => {
    try {
        // 1. Consultas simultáneas para máxima velocidad
        const kpisReq = db.query(`
            SELECT
                (SELECT COUNT(*) FROM lockers WHERE estado = 'ocupado') as lockers_ocupados,
                (SELECT COUNT(*) FROM lockers) as total_lockers,
                (SELECT COUNT(*) FROM lockers WHERE estado = 'disponible') as lockers_disponibles,
                (SELECT COUNT(*) FROM access_logs WHERE DATE(fecha_hora) = CURRENT_DATE) as accesos_hoy
        `);

        const actividadReq = db.query(`
            SELECT a.accion, a.fecha_hora, u.nombre_completo, l.identificador as locker
            FROM access_logs a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN assignments asg ON a.assignment_id = asg.id
            LEFT JOIN lockers l ON asg.locker_id = l.id
            ORDER BY a.fecha_hora DESC
            LIMIT 4
        `);

        const alertasReq = db.query(`
            SELECT i.folio, i.categoria, i.created_at, l.identificador as locker
            FROM incidents i
            LEFT JOIN lockers l ON i.locker_id = l.id
            WHERE i.estado = 'pendiente'
            ORDER BY i.created_at DESC
            LIMIT 3
        `);

        const [kpisRes, actividadRes, alertasRes] = await Promise.all([kpisReq, actividadReq, alertasReq]);
        const kpis = kpisRes.rows[0];

        // 2. Matemáticas para los KPIs
        const total = parseInt(kpis.total_lockers) || 1;
        const tasaOcupacion = Math.round((parseInt(kpis.lockers_ocupados) / total) * 100);
        const disponibilidad = Math.round((parseInt(kpis.lockers_disponibles) / total) * 100);

        // 3. Empaqueta y envia a React
        res.json({
            kpis: {
                tasaOcupacion: tasaOcupacion,
                accesosHoy: parseInt(kpis.accesos_hoy),
                tiempoPromedio: 4.2,
                disponibilidad: disponibilidad
            },
            actividadReciente: actividadRes.rows,
            alertas: alertasRes.rows
        });

    } catch (error) {
        console.error("Error en Dashboard:", error);
        res.status(500).json({ mensaje: "Error al cargar estadísticas del dashboard" });
    }
};

module.exports = { getDashboardStats };