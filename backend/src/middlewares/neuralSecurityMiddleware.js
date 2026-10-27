const db = require("../config/db")
const { evaluarAcceso } = require("../neurona/neuronaSeguridad")

const DIAS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// Hora, día de la semana y fecha en zona horaria de México (el servidor está en UTC)
function ahoraMexico() {
    const p = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Mexico_City',
            hourCycle: 'h23',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', weekday: 'short',
        }).formatToParts(new Date()).map(x => [x.type, x.value])
    )
    return {
        hora: parseInt(p.hour, 10),
        diaSemana: DIAS[p.weekday],
        fechaISO: `${p.year}-${p.month}-${p.day}`,
    }
}

async function neuralSecurity(req, res, next) {
    const userId = req.user?.id
    if (!userId) return next()

    try {
        const { rows } = await db.query(
            `SELECT COUNT(*) AS total FROM iot.security_logs
             WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '60 seconds'`,
            [userId]
        )
        const peticionesRecientes = parseInt(rows[0]?.total ?? 0, 10)

        const { hora, diaSemana, fechaISO } = ahoraMexico()

        const { esSospechoso, score, inputs } = evaluarAcceso(
            hora, diaSemana, fechaISO, peticionesRecientes
        )

        await db.query(
            `INSERT INTO iot.security_logs
                (user_id, hora, dia_semana, fecha, peticiones_recientes,
                 score_neurona, es_sospechoso, accion, resultado)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [userId, hora, diaSemana, fechaISO, peticionesRecientes,
             score, esSospechoso, 'generate_qr',
             esSospechoso ? 'denegado' : 'permitido']
        )

        if (esSospechoso) {
            console.warn(`[NEURONA] BLOQUEADO user:${userId} score:${score}`)
            return res.status(403).json({
                mensaje: "Acceso denegado por política de seguridad inteligente.",
                detalle: {
                    razon: inputs.x5 ? "Ráfaga de peticiones detectada"
                         : inputs.x3 ? "Acceso en fin de semana"
                         : "Horario no habitual",
                },
            })
        }

        req.neurona = { score, inputs }
        next()
    } catch (error) {
        console.error("[NEURONA] Error:", error.message)
        next() // falla abierta
    }
}

module.exports = neuralSecurity
