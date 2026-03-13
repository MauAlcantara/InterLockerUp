const db = require('../config/db');

const getAvailableLockers = async (req, res) => {
    try {
        // Buscamos solo los que tienen estado 'disponible'
        const result = await db.query(
            'SELECT * FROM lockers WHERE estado = $1 ORDER BY identificador ASC', 
            ['disponible']
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'No pudimos obtener la lista de casilleros.' });
    }
};

const assignLocker = async (req, res) => {
    const { locker_id, es_compartido, partner_id, fecha_vencimiento } = req.body;
    const userId = req.user.id; // Obtenido del token

    const client = await db.connect(); // Iniciamos conexión para la transacción

    try {
        await client.query('BEGIN'); // Inicio de la transacción

        // 1. Verificar si el casillero sigue disponible
        const lockerCheck = await client.query(
            'SELECT estado FROM lockers WHERE id = $1 FOR UPDATE', // BLOQUEA la fila para evitar colisiones
            [locker_id]
        );

        if (lockerCheck.rows[0].estado !== 'disponible') {
            throw new Error('El casillero ya no está disponible.');
        }

        // 2. Crear la cabecera de la asignación
        const assignmentResult = await client.query(
            'INSERT INTO assignments (locker_id, fecha_vencimiento, es_compartido) VALUES ($1, $2, $3) RETURNING id',
            [locker_id, fecha_vencimiento, es_compartido]
        );
        const assignmentId = assignmentResult.rows[0].id;

        // 3. Vincular al alumno que solicita
        await client.query(
            'INSERT INTO assignment_users (assignment_id, user_id) VALUES ($1, $2)',
            [assignmentId, userId]
        );

        // 4. Si es compartido, vincular al compañero
        if (es_compartido && partner_id) {
            await client.query(
                'INSERT INTO assignment_users (assignment_id, user_id) VALUES ($1, $2)',
                [assignmentId, partner_id]
            );
        }

        // 5. Actualizar el estado del casillero a 'ocupado'
        await client.query(
            "UPDATE lockers SET estado = 'ocupado' WHERE id = $1",
            [locker_id]
        );

        await client.query('COMMIT'); // Guardamos todos los cambios
        res.status(201).json({ mensaje: '¡Casillero asignado con éxito!', assignmentId });

    } catch (error) {
        await client.query('ROLLBACK'); // Si algo falla, deshacemos todo
        res.status(400).json({ mensaje: error.message || 'Error al procesar la asignación.' });
    } finally {
        client.release();
    }
};

module.exports = { getAvailableLockers };
module.exports = { getAvailableLockers, assignLocker };