const db = require("../config/db")
const crypto = require("crypto")
const fetch = require("node-fetch") // necesitan instalar: npm install node-fetch

//Config ESP32
const ESP32_URL = ""

// GENERAR QR 
const generateQRToken = async (req, res) => {
    const userId = req.user.id
    let transactionStarted = false;

    try {
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

        const rawToken = crypto.randomBytes(32).toString("hex")

        const tokenHash = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex")

        const expiresAt = new Date(Date.now() + 60 * 1000)

        await db.query("BEGIN")
        transactionStarted = true;

        await db.query(
            "DELETE FROM qr_tokens WHERE assignment_id = $1",
            [assignment_id]
        )

        await db.query(
            `INSERT INTO qr_tokens (assignment_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            [assignment_id, tokenHash, expiresAt]
        )

        await db.query("COMMIT")

        res.json({
            token: rawToken,
            expiresAt: expiresAt.toISOString(),
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
// VALIDAR QR (NUEVO)
const validarQRToken = async (req, res) => {
    const { codigo } = req.body

    try {
        // convertir a hash (igual que cuando se guardó)
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

        //Token invalido
        if (result.rows.length === 0) {

            await db.query(`
                INSERT INTO access_logs
                (codigo_usado,resultado,motivo)
                Values ($1, 'denegado', 'token_invalido')
                `,[codigo])
    
            return res.json({ acceso: false })
        }

        const token = result.rows[0]

        // Token expirado
        if (new Date(token.expires_at) < new Date()) {

            await db.query(`
               INSERT INTO access_logs 
               (assignment_id, locker_numero, codigo_usado, resultado, motivo)
               VALUES ($1, $2, $3, 'denegado', 'expirado')
            `, [token.assignment_id, token.locker_numero, codigo])

            return res.json({ acceso: false, motivo: "espirado"})
        }

        // registrar acceso lo cambiamos para que coincida con el cambio que hice en la bd
        await db.query(`
            INSERT INTO access_logs 
            (assignment_id, locker_numero, codigo_usado, resultado)
            VALUES ($1, $2, $3, 'permitido')
        `, [token.assignment_id, token.locker_numero, codigo])

        // eliminar token (uso único)
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

// EXPORTS
module.exports = { generateQRToken, validarQRToken }