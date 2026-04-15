const db = require("../config/db")
const { evaluarAcceso } = require("../neurona/neuronaSeguridad")

const VENTANA_MS = 60 * 1000

async function neuralSecurity(req, res, next) {
    const userId = req.user?.id
    if (!userId) return next(); // Si no hay usuario, saltamos el middleware

    try {
        // CORRECCIÓN: Usamos created_at en lugar de fecha_hora
        const desde = new Date(Date.now() - VENTANA_MS).toISOString()
        const { rows } = await db.query(
            `SELECT COUNT(*) AS total FROM access_logs
             WHERE user_id = $1 AND created_at >= $2`,
            [userId, desde]
        )
        const peticionesRecientes = parseInt(rows[0]?.total ?? 0, 10)

        const ahora     = new Date()
        const hora      = ahora.getHours()
        const diaSemana = ahora.getDay()
        const fechaISO  = ahora.toISOString().slice(0, 10)

        const { esSospechoso, score, inputs } = evaluarAcceso(
            hora, diaSemana, fechaISO, peticionesRecientes
        )

        // El INSERT está bien, pero asegúrate de que estas columnas existan en tu tabla
        await db.query(
            `INSERT INTO access_logs
                (user_id, hora, dia_semana, fecha, peticiones_recientes,
                 score_neurona, es_sospechoso, accion, resultado)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [userId, hora, diaSemana, fechaISO, peticionesRecientes,
             score, esSospechoso,
             'check_security', // Cambiado a algo más genérico
             esSospechoso ? 'denegado' : 'permitido']
        )

        if (esSospechoso) {
            console.warn(`[NEURONA] BLOQUEADO user:${userId} score:${score}`)
            return res.status(403).json({
                mensaje: "Acceso denegado por política de seguridad inteligente.",
                detalle: {
                    score,
                    razon: inputs.x5 ? "Ráfaga de peticiones detectada"
                         : inputs.x3 ? "Acceso en fin de semana"
                         : "Horario no habitual",
                },
            })
        }

        req.neurona = { score, inputs }
        console.info(`[NEURONA] PERMITIDO user:${userId} score:${score}`)
        next()
    } catch (error) {
        console.error("[NEURONA] Error crítico:", error)
        next() // En caso de error de la neurona, dejamos pasar para no bloquear al usuario
    }
}

module.exports = neuralSecurity
