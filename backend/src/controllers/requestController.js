const db = require('../config/db');

const processLockerRequest = async (req, res) => {
    const { requestId } = req.params;
    const { status } = req.body; // 'approved' o 'rejected'

    try {
        await db.query('BEGIN');

        // 1. Obtener datos de la solicitud y BLOQUEAR la fila para evitar condiciones de carrera
        // Usamos FOR UPDATE para que nadie más toque esta solicitud mientras decidimos
        const requestRes = await db.query(
            'SELECT * FROM locker_requests WHERE id = $1 FOR UPDATE', 
            [requestId]
        );
        
        if (requestRes.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ mensaje: "Solicitud no encontrada" });
        }

        const solicitud = requestRes.rows[0];

        // Evitar procesar algo que ya no es 'pending'
        if (solicitud.status !== 'pending') {
            await db.query('ROLLBACK');
            return res.status(400).json({ mensaje: "Esta solicitud ya fue procesada anteriormente" });
        }

        if (status === 'approved') {
            // 2. Verificar si el locker sigue disponible (Seguridad extra)
            const lockerCheck = await db.query(
                "SELECT estado FROM lockers WHERE id = $1 FOR UPDATE",
                [solicitud.locker_id]
            );

            if (lockerCheck.rows[0].estado !== 'disponible') {
                await db.query('ROLLBACK');
                return res.status(400).json({ mensaje: "El locker ya no está disponible" });
            }

            // 3. Crear la asignación
            // Ajustamos la fecha de vencimiento a 6 meses
            const fechaFin = new Date();
            fechaFin.setMonth(fechaFin.getMonth() + 6);

            const newAssignment = await db.query(
                `INSERT INTO assignments (locker_id, fecha_vencimiento, status, es_compartido) 
                 VALUES ($1, $2, 'activa', $3) RETURNING id`,
                [solicitud.locker_id, fechaFin, solicitud.shared]
            );

            const assignmentId = newAssignment.rows[0].id;

            // 4. Vincular al usuario principal
            await db.query(
                'INSERT INTO assignment_users (assignment_id, user_id) VALUES ($1, $2)',
                [assignmentId, solicitud.user_id]
            );

            // 5. Vincular a los compañeros (partners) si existen
            // Según tu esquema, están en request_partners y en la columna companions
            if (solicitud.shared) {
                const partners = await db.query(
                    'SELECT user_id FROM request_partners WHERE request_id = $1',
                    [requestId]
                );

                for (const partner of partners.rows) {
                    await db.query(
                        'INSERT INTO assignment_users (assignment_id, user_id) VALUES ($1, $2)',
                        [assignmentId, partner.user_id]
                    );
                }
            }

            // 6. Actualizar estado del locker
            await db.query(
                "UPDATE lockers SET estado = 'ocupado' WHERE id = $1",
                [solicitud.locker_id]
            );

            // 7. Notificar al usuario (Opcional, pero recomendado según tu tabla notifications)
            await db.query(
                "INSERT INTO notifications (user_id, mensaje, tipo) VALUES ($1, $2, 'success')",
                [solicitud.user_id, `Tu solicitud de locker ha sido aprobada.`]
            );
        }

        // 8. Actualizar estado final de la solicitud
        await db.query(
            'UPDATE locker_requests SET status = $1 WHERE id = $2',
            [status, requestId]
        );

        await db.query('COMMIT');
        res.json({ 
            success: true, 
            mensaje: `Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} con éxito` 
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error("Error en processLockerRequest:", error);
        res.status(500).json({ mensaje: "Error interno del servidor" });
    }
};

module.exports = { processLockerRequest };