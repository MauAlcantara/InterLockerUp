const db = require("../config/db")
const crypto = require("crypto")

const generateQRToken = async (req, res) => {
    const userId = req.user.id
    let transactionStarted = false;

    try {
        const assignmentResult = await db.query(
            `SELECT a.id as assignment_id, l.id as locker_id, l.identificador as locker_numero
            FROM assignment_users au
            JOIN assignments a ON au.assignment_id = a.id
            JOIN lockers l ON a.locker_id = l.id
            WHERE au.user_id = $1 AND a.status IN ('activo', 'activa', 'active') AND a.fecha_vencimiento > NOW()
            LIMIT 1`, [userId]
        )

        if (assignmentResult.rows.length === 0) {
            return res.status(404).json({ mensaje: "No tienes un casillero asignado o tu acceso ha expirado." })
        }

        const { assignment_id, locker_id, locker_numero } = assignmentResult.rows[0]

        // --- LÓGICA EXCLUSIVA DE QR (1 minuto) ---
        const rawToken = crypto.randomBytes(32).toString("hex")
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
        const qrExpiresAt = new Date(Date.now() + 60 * 1000)

        await db.query("BEGIN")
        transactionStarted = true;

        await db.query("DELETE FROM qr_tokens WHERE assignment_id = $1", [assignment_id])
        await db.query(
            `INSERT INTO qr_tokens (assignment_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
            [assignment_id, tokenHash, qrExpiresAt]
        )

        await db.query("COMMIT")

        res.json({
            token: rawToken,
            expiresAt: qrExpiresAt.toISOString(),
            lockerInfo: { id: locker_id, numero: locker_numero }
        })

    } catch (error) {
        if (transactionStarted) await db.query("ROLLBACK")
        console.error("Error al generar QR:", error)
        res.status(500).json({ mensaje: "Error interno al generar el código QR" })
    }
}

/**
 * VALIDAR QR (para ESP32)
 * Recibe el código escaneado y valida acceso
 */
const validarQRToken = async (req, res) => {
    const { codigo } = req.body

    try {
        if (!codigo) {
            return res.json({ acceso: false })
        }

        // Convertir a hash
        const tokenHash = crypto
            .createHash("sha256")
            .update(codigo)
            .digest("hex")

        const result = await db.query(`
            SELECT 
                qt.assignment_id,
                qt.expires_at,
                l.identificador AS locker_numero
            FROM qr_tokens qt
            JOIN assignments a ON qt.assignment_id = a.id
            JOIN lockers l ON a.locker_id = l.id
            WHERE qt.token_hash = $1
            LIMIT 1
        `, [tokenHash])

        // Token no encontrado
        if (result.rows.length === 0) {
            return res.json({ acceso: false })
        }

        const token = result.rows[0]

        // Token expirado
        if (new Date(token.expires_at) < new Date()) {
            return res.json({ acceso: false })
        }

        // Eliminar token (uso único)
        await db.query(
            "DELETE FROM qr_tokens WHERE assignment_id = $1",
            [token.assignment_id]
        )

        return res.json({
            acceso: true,
            locker: token.locker_numero
        })

    } catch (error) {
        console.error("Error al validar QR:", error)

        res.status(500).json({ acceso: false })
    }
}


module.exports = { generateQRToken, validarQRToken }
