const db = require("../config/db");
const crypto = require("crypto");

/**
 * Genera un token QR único y temporal para el alumno
 */
const generateQRToken = async (req, res) => {
    const userId = req.user.id; // Extraído del middleware de auth
    let transactionStarted = false;

    try {
        // 1. Buscar asignación activa en interlockerup_db
        const assignmentResult = await db.query(
            `SELECT a.id as assignment_id, l.id as locker_id, l.identificador as locker_numero
             FROM assignment_users au
             JOIN assignments a ON au.assignment_id = a.id
             JOIN lockers l ON a.locker_id = l.id
             WHERE au.user_id = $1 
               AND a.status IN ('activo', 'activa', 'active') 
               AND a.fecha_vencimiento > NOW()
             LIMIT 1`,
            [userId]
        );

        if (assignmentResult.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No tienes un casillero asignado o tu acceso ha expirado."
            });
        }

        const { assignment_id, locker_id, locker_numero } = assignmentResult.rows[0];

        // 2. Generar token criptográfico (32 bytes -> 64 chars hex)
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 60 * 1000); // 60 segundos de vida

        // 3. Transacción SQL para asegurar integridad
        await db.query("BEGIN");
        transactionStarted = true;

        // Limpiar tokens previos de esta asignación
        await db.query("DELETE FROM qr_tokens WHERE assignment_id = $1", [assignment_id]);

        // Insertar nuevo token
        await db.query(
            `INSERT INTO qr_tokens (assignment_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            [assignment_id, tokenHash, expiresAt]
        );

        await db.query("COMMIT");

        res.json({
            token: rawToken, // Se envía al frontend para el QR
            expiresAt: expiresAt.toISOString(),
            lockerInfo: { id: locker_id, numero: locker_numero }
        });

    } catch (error) {
        if (transactionStarted) await db.query("ROLLBACK");
        console.error("Error al generar QR:", error);
        res.status(500).json({ mensaje: "Error interno al generar código de acceso" });
    }
};

/**
 * Valida el token escaneado por el hardware (ESP32)
 */
const validarQRToken = async (req, res) => {
    const { token } = req.body;

    if (!token) return res.status(400).json({ valido: false, mensaje: "Token ausente" });

    try {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        // Buscar token válido y no expirado
        const result = await db.query(
            `SELECT qr.assignment_id, l.id as locker_id, l.identificador as locker_numero
             FROM qr_tokens qr
             JOIN assignments a ON qr.assignment_id = a.id
             JOIN lockers l ON a.locker_id = l.id
             WHERE qr.token_hash = $1 AND qr.expires_at > NOW()`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ valido: false, mensaje: "Token inválido o expirado" });
        }

        const data = result.rows[0];

        // Auditoría: Registrar la apertura en el Dashboard
        await db.query(
            `INSERT INTO accesos (locker_id, accion, fecha) VALUES ($1, $2, NOW())`,
            [data.locker_id, 'Apertura vía QR']
        );

        // Seguridad: El token solo sirve una vez (One-Time Use)
        await db.query("DELETE FROM qr_tokens WHERE token_hash = $1", [tokenHash]);

        res.json({
            valido: true,
            mensaje: "Acceso autorizado",
            locker: data.locker_numero
        });

    } catch (error) {
        console.error("Error al validar QR:", error);
        res.status(500).json({ valido: false, mensaje: "Error de servidor" });
    }
};

module.exports = { generateQRToken, validarQRToken };