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
            SELECT a.accion, a.fecha_hora, u.nombre_completo, a.locker_numero as locker
            FROM access_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.fecha_hora DESC
            LIMIT 4
        `);

        const alertasReq = db.query(`
            SELECT i.folio, i.categoria, i.created_at, l.identificador as locker_identificador
            FROM incidents i
            LEFT JOIN lockers l ON i.locker_id = l.id
            WHERE i.estado = 'pendiente'
            ORDER BY i.created_at DESC
            LIMIT 3
        `);

        const solicitudesReq = db.query(`
            SELECT 
                lr.id, 
                u.nombre_completo, 
                l.identificador as locker_identificador 
            FROM locker_requests lr
            JOIN users u ON lr.user_id = u.id
            JOIN lockers l ON lr.locker_id = l.id
            WHERE lr.status = 'pending'
            ORDER BY lr.created_at DESC
            LIMIT 5
        `);

        // --- NUEVA CONSULTA: Uso Semanal para la Gráfica ---
        const usoSemanalReq = db.query(`
            SELECT 
                to_char(fecha_hora, 'Dy') as day, 
                COUNT(*) as accesos
            FROM access_logs
            WHERE fecha_hora > CURRENT_DATE - INTERVAL '7 days'
            GROUP BY day, date_trunc('day', fecha_hora)
            ORDER BY date_trunc('day', fecha_hora)
        `);

        // Esperamos a que TODAS las consultas terminen
        const [kpisRes, actividadRes, alertasRes, solicitudesRes, usoSemanalRes] = await Promise.all([
            kpisReq, 
            actividadReq, 
            alertasRes, 
            solicitudesReq,
            usoSemanalReq
        ]);
        
        const kpis = kpisRes.rows[0];

        // 2. Matemáticas para los KPIs
        const total = parseInt(kpis.total_lockers) || 1;
        const tasaOcupacion = Math.round((parseInt(kpis.lockers_ocupados) / total) * 100);
        const disponibilidad = Math.round((parseInt(kpis.lockers_disponibles) / total) * 100);

        // Mapeo opcional de días a español para el Frontend
        const daysMap = { 'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mie', 'Thu': 'Jue', 'Fri': 'Vie', 'Sat': 'Sab', 'Sun': 'Dom' };
        const usoFormateado = usoSemanalRes.rows.map(row => ({
            day: daysMap[row.day] || row.day,
            accesos: parseInt(row.accesos)
        }));

        // 3. Empaquetamos y enviamos a React
        res.json({
            kpis: {
                tasaOcupacion: tasaOcupacion,
                accesosHoy: parseInt(kpis.accesos_hoy),
                tiempoPromedio: 4.2, 
                disponibilidad: disponibilidad
            },
            actividadReciente: actividadRes.rows,
            alertas: alertasRes.rows,
            solicitudesPendientes: solicitudesRes.rows,
            usoSemanal: usoFormateado // <-- Datos para tu AreaChart
        });

    } catch (error) {
        console.error("Error en Dashboard:", error);
        res.status(500).json({ mensaje: "Error al cargar estadísticas del dashboard" });
    }
};

module.exports = { getDashboardStats };