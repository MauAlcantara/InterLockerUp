const db = require('../config/db');

/* ======================================
   Obtener notificaciones del usuario
   (propias + globales)
====================================== */
const getNotifications = async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            select id, user_id, mensaje, tipo, es_global, leida, created_at
            from notifications
            where user_id = $1
            or es_global = true
            order by created_at desc
        `;
        const { rows } = await db.query(query, [userId]);
        res.json(rows);
    } catch (error) {
        console.error("error obteniendo notificaciones:", error);
        res.status(500).json({
            mensaje: "error al obtener notificaciones"
        });
    }
};



/* ======================================
   Marcar notificación como leída
====================================== */
const markAsRead = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(
            `update notifications
            set leida = true
            where id = $1
            `,
            [id]
        );
        res.json({
            mensaje: "notificacion marcada como leida"
        });
    } catch (error) {
        console.error("error marcando notificacion:", error);
        res.status(500).json({
            mensaje: "error al actualizar notificacion"
        });
    }
};


/* ======================================
   Crear notificación (admin o sistema)
====================================== */
const createNotification = async (req, res) => {
    const { mensaje, tipo, user_id, es_global } = req.body;
    try {
        const query = `
            insert into notifications
            (mensaje, tipo, user_id, es_global)
            values ($1,$2,$3,$4)
        `;
        await db.query(query, [
            mensaje,
            tipo || 'info',
            user_id || null,
            es_global || false
        ]);
        res.json({
            mensaje: "notificacion creada"
        });
    } catch (error) {
        console.error("error creando notificacion:", error);
        res.status(500).json({
            mensaje: "error creando notificacion"
        });
    }
};



module.exports = {
    getNotifications,
    markAsRead,
    createNotification
};