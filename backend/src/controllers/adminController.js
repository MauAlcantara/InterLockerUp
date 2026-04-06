const db = require('../config/db');

// 1. Obtener las incidencias disfrazadas de notificaciones para la campanita
const getNotificaciones = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                i.id,
                'Alerta de Incidencia' as titulo,
                'Locker ' || l.identificador || ' - ' || i.categoria as mensaje,
                i.created_at as fecha,
                i.estado
            FROM incidents i
            JOIN lockers l ON i.locker_id = l.id
            ORDER BY i.created_at DESC
            LIMIT 10
        `);

        const notificaciones = result.rows.map(row => {
            const fechaReporte = new Date(row.fecha);
            const ahora = new Date();
            const diffMs = Math.max(0, ahora - fechaReporte);
            const diffMins = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHrs / 24);

            let tiempoStr = 'Hace un momento';
            if (diffMins > 0 && diffMins < 60) tiempoStr = `Hace ${diffMins} min`;
            else if (diffHrs >= 1 && diffHrs < 24) tiempoStr = `Hace ${diffHrs} horas`;
            else if (diffDays >= 1) tiempoStr = `Hace ${diffDays} días`;

            return {
                id: row.id, 
                titulo: row.titulo,
                mensaje: row.mensaje,
                tiempo: tiempoStr,
                // Si el estado es 'pendiente', React pondrá el punto rojo (leida: false)
                leida: row.estado !== 'pendiente' 
            };
        });

        res.json(notificaciones);
    } catch (error) {
        console.error("Error al obtener incidencias para el admin:", error);
        res.status(500).json({ mensaje: "Error interno del servidor" });
    }
};

// 2. Marcar incidencia como leída (Cambiar estado a 'en revisión')
const marcarIncidenciaLeida = async (req, res) => {
    const { id } = req.params;
    try {
        // Al darle clic, pasamos el estado de 'pendiente' a 'en revisión'
        await db.query(
            "UPDATE incidents SET estado = 'en revisión' WHERE id = $1 AND estado = 'pendiente'", 
            [id]
        );
        res.json({ mensaje: "Incidencia en revisión" });
    } catch (error) {
        console.error("Error al actualizar estado de la incidencia:", error);
        res.status(500).json({ mensaje: "Error al actualizar la incidencia" });
    }
};

module.exports = { getNotificaciones, marcarIncidenciaLeida };