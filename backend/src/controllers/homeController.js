const db = require('../config/db');

const getHomeData = async (req, res) => {
    const userId = req.user.id;

    try {
        // 1. Busca el Casillero Activo y calcula el tiempo restante
        const lockerReq = await db.query(`
            SELECT 
                l.identificador as number, 
                l.ubicacion_detallada as building, 
                a.fecha_vencimiento
            FROM lockers l
            JOIN assignments a ON l.id = a.locker_id
            JOIN assignment_users au ON a.id = au.assignment_id
            WHERE au.user_id = $1 AND a.status = 'activa'
            LIMIT 1
        `, [userId]);

        let lockerData = null;
        let recordatorioData = null;

        if (lockerReq.rows.length > 0) {
            const row = lockerReq.rows[0];
            const vencimiento = new Date(row.fecha_vencimiento);
            const ahora = new Date();
            
            // Calculo minutos restantes
            const diffMs = vencimiento - ahora;
            const timeLeft = Math.max(0, Math.floor(diffMs / 1000 / 60)); // Mínimo 0
            
            // Calculo totalTime
            const totalTime = timeLeft > 120 ? timeLeft : 120;

            lockerData = {
                number: row.number,
                building: row.building,
                floor: 'Planta Baja',
                timeLeft: timeLeft,
                totalTime: totalTime,
                status: 'active'
            };

            if (timeLeft < 1440) { 
                recordatorioData = {
                    titulo: "Renovación Próxima",
                    mensaje: "Tu asignación está por vencer. Acude a servicios escolares."
                };
            }
        }

        // 2. Busca Actividad Reciente del usuario
        const activityReq = await db.query(`
            SELECT id, accion as action, TO_CHAR(fecha_hora, 'YYYY-MM-DD HH24:MI') as time 
            FROM access_logs
            WHERE user_id = $1
            ORDER BY fecha_hora DESC
            LIMIT 3
        `, [userId]);

        // Mapea los tipos para los íconos de React
        const actividadesFormateadas = activityReq.rows.map(act => {
            let type = 'info';
            if (act.action.includes('check')) type = 'checkin';
            if (act.action.includes('abierto') || act.action.includes('acceso')) type = 'open';
            
            return {
                id: act.id,
                action: act.action,
                time: act.time,
                type: type
            };
        });

        res.json({
            locker: lockerData,
            recordatorio: recordatorioData,
            actividades: actividadesFormateadas
        });

    } catch (error) {
        console.error("Error en Home:", error);
        res.status(500).json({ mensaje: "Error al cargar la pantalla de inicio." });
    }
};

module.exports = { getHomeData };