const db = require("../config/db")
const crypto = require("crypto")

const generateQRToken = async (req, res) => {
    const userId = req.user.id
    let transactionStarted = false;

    try {
        // 1. Buscar asignación activa
        const assignmentResult = await db.query(
            `SELECT 
                a.id as assignment_id, 
                l.id as locker_id, 
                l.identificador as locker_numero
            FROM assignment_users au
            JOIN assignments a ON au.assignment_id = a.id
            JOIN lockers l ON a.locker_id = l.id
            WHERE au.user_id = $1 
              AND a.status IN ('activo', 'activa', 'active') 
              AND a.fecha_vencimiento > NOW()
            LIMIT 1`,
            [userId]
        )

        if (assignmentResult.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No tienes un casillero asignado o tu acceso ha expirado."
            })
        }

        const { assignment_id, locker_id, locker_numero } = assignmentResult.rows[0]

        // --- LÓGICA DE QR (1 minuto) ---
        const rawToken = crypto.randomBytes(32).toString("hex")
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
        const qrExpiresAt = new Date(Date.now() + 60 * 1000)

        // --- LÓGICA DE PIN (5 minutos) ---
        const rawPin = Math.floor(100000 + Math.random() * 900000).toString();
        const pinHash = crypto.createHash("sha256").update(rawPin).digest("hex")
        const pinExpiresAt = new Date(Date.now() + 5 * 60 * 1000)

        // INICIO DE TRANSACCIÓN
        await db.query("BEGIN")
        transactionStarted = true;

        // Limpiar registros previos de esta asignación específica
        await db.query("DELETE FROM qr_tokens WHERE assignment_id = $1", [assignment_id])
        await db.query("DELETE FROM pin_tokens WHERE assignment_id = $1", [assignment_id])

        // Insertar QR
        await db.query(
            `INSERT INTO qr_tokens (assignment_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
            [assignment_id, tokenHash, qrExpiresAt]
        )

        // Insertar PIN
        await db.query(
            `INSERT INTO pin_tokens (assignment_id, pin_hash, expires_at) VALUES ($1, $2, $3)`,
            [assignment_id, pinHash, pinExpiresAt]
        )

        await db.query("COMMIT")

        // Respuesta compatible con el frontend existente + nuevos datos del PIN
        res.json({
            token: rawToken, // Mantenemos 'token' para no romper el QR actual
            expiresAt: qrExpiresAt.toISOString(),
            pin: {
                code: rawPin,
                expiresAt: pinExpiresAt.toISOString()
            },
            lockerInfo: {
                id: locker_id,
                numero: locker_numero
            }
        })

    } catch (error) {
        if (transactionStarted) await db.query("ROLLBACK")
        console.error("Error al generar tokens de acceso:", error)
        res.status(500).json({ mensaje: "Error interno al generar el código de acceso" })
    }
}

module.exports = { generateQRToken }