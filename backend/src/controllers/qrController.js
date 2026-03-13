const db = require("../config/db")
const crypto = require("crypto")

const generateQRToken = async (req, res) => {
    const userId = req.user.id
    let transactionStarted = false; // Flag para control de rollback

    try {
        // Buscar asignación activa

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

        // generar token aleatorio (Criptográficamente seguro)
        const rawToken = crypto.randomBytes(32).toString("hex")

        // hash del token para almacenamiento seguro
        const tokenHash = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex")

        // expiración (60 segundos)
        const expiresAt = new Date(Date.now() + 60 * 1000)

        // INICIO DE TRANSACCIÓN
        await db.query("BEGIN")
        transactionStarted = true;

        // limpiar tokens viejos de ESTA asignación (Evita basura en la DB)
        await db.query(
            "DELETE FROM qr_tokens WHERE assignment_id = $1",
            [assignment_id]
        )

        // insertar token nuevo con su hash
        await db.query(
            `INSERT INTO qr_tokens (assignment_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            [assignment_id, tokenHash, expiresAt]
        )

        await db.query("COMMIT")

        // respuesta exitosa
        res.json({
            token: rawToken, // Solo el usuario recibe el token real
            expiresAt: expiresAt.toISOString(), // Enviamos en formato ISO para el frontend
            lockerInfo: {
                id: locker_id,
                numero: locker_numero
            }
        })

    } catch (error) {
        if (transactionStarted) {
            await db.query("ROLLBACK")
        }

        console.error("Error al generar QR:", error)
        res.status(500).json({
            mensaje: "Error interno al generar el código de acceso"
        })
    }
}

module.exports = { generateQRToken }