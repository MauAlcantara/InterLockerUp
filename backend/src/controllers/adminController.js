const db = require('../config/db');

const getNotificaciones = async (req, res) => {
    try {
        // 1. Busca las últimas 5 incidencias reportadas
        const result = await db.query(`
            SELECT 
                i.id,
                'Nueva incidencia reportada' as titulo,
                'Locker ' || l.identificador || ' - ' || i.categoria as mensaje,
                i.created_at as fecha,
                i.estado
            FROM incidents i
            JOIN lockers l ON i.locker_id = l.id
            ORDER BY i.created_at DESC
            LIMIT 5
        `);

        // 2. Formatea los datos para que React los entienda a la perfección
        const notificaciones = result.rows.map(row => {
            // Calcula el tiempo transcurrido
            const fechaReporte = new Date(row.fecha);
            const ahora = new Date();
            const diffMs = ahora - fechaReporte;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHrs / 24);

            let tiempoStr = 'Hace un momento';
            if (diffMins > 0 && diffMins < 60) tiempoStr = `Hace ${diffMins} min`;
            else if (diffHrs >= 1 && diffHrs < 24) tiempoStr = `Hace ${diffHrs} horas`;
            else if (diffDays >= 1) tiempoStr = `Hace ${diffDays} días`;

            return {
                id: row.id, // Usamos el ID de la incidencia
                titulo: row.titulo,
                mensaje: row.mensaje,
                tiempo: tiempoStr,
                leida: row.estado !== 'pendiente' 
            };
        });

        res.json(notificaciones);
    } catch (error) {
        console.error("Error al obtener notificaciones:", error);
        res.status(500).json({ mensaje: "Error interno del servidor" });
    }
};

module.exports = { getNotificaciones };