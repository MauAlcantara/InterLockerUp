const db = require("../config/db");
const crypto = require("node:crypto");

// ==========================================
// GENERAR CÓDIGO QR
// ==========================================
const generateQRToken = async (req, res) => {
    const userId = req.user.id;
    let transactionStarted = false;

    try {
        const assignmentResult = await db.query(
            `SELECT
                a.id AS assignment_id,
                l.id AS locker_id,
                l.identificador AS locker_numero
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

        const {
            assignment_id,
            locker_id,
            locker_numero
        } = assignmentResult.rows[0];

        // Generar QR válido durante 1 minuto
        const rawToken = crypto.randomBytes(32).toString("hex");

        const tokenHash = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        const qrExpiresAt = new Date(Date.now() + 60 * 1000);

        await db.query("BEGIN");
        transactionStarted = true;

        await db.query(
            "DELETE FROM qr_tokens WHERE assignment_id = $1",
            [assignment_id]
        );

        await db.query(
            `INSERT INTO qr_tokens
                (assignment_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            [assignment_id, tokenHash, qrExpiresAt]
        );

        await db.query("COMMIT");
        transactionStarted = false;

        return res.json({
            token: rawToken,
            expiresAt: qrExpiresAt.toISOString(),
            lockerInfo: {
                id: locker_id,
                numero: locker_numero
            }
        });

    } catch (error) {
        if (transactionStarted) {
            await db.query("ROLLBACK");
        }

        console.error("Error al generar QR:", error);

        return res.status(500).json({
            mensaje: "Error interno al generar el código QR"
        });
    }
};


// ==========================================
// REGISTRAR ACTIVIDAD QR
// ==========================================
// Guarda el evento sin almacenar el código QR.
// Un error de registro no cambia la autorización.

const registrarActividadQR = async ({
    assignmentId = null,
    lockerId = null,
    accion
}) => {
    try {
        await db.query(
            `INSERT INTO iot.access_logs
                (assignment_id, user_id, locker_id, accion)
             VALUES ($1, NULL, $2, $3)`,
            [assignmentId, lockerId, accion]
        );

        console.log("Actividad IoT registrada:", accion);

    } catch (error) {
        console.error(
            "No fue posible registrar actividad QR:",
            error
        );
    }
};


// ==========================================
// VALIDAR CÓDIGO QR DESDE ESP32
// ==========================================
const validarQRToken = async (req, res) => {
    const { codigo } = req.body || {};

    try {
        // Verificar que el código sea válido
        if (
            typeof codigo !== "string" ||
            codigo.length === 0
        ) {
            await registrarActividadQR({
                accion: "qr_denegado"
            });

            return res.json({
                acceso: false
            });
        }

        // Generar hash del código recibido
        const tokenHash = crypto
            .createHash("sha256")
            .update(codigo)
            .digest("hex");

        // Buscar QR en PostgreSQL
        const result = await db.query(
            `SELECT
                qt.assignment_id,
                qt.expires_at,
                l.id AS locker_id,
                l.identificador AS locker_numero
            FROM qr_tokens qt
            JOIN assignments a
                ON qt.assignment_id = a.id
            JOIN lockers l
                ON a.locker_id = l.id
            WHERE qt.token_hash = $1
            LIMIT 1`,
            [tokenHash]
        );

        // QR inexistente o inválido
        if (result.rows.length === 0) {
            await registrarActividadQR({
                accion: "qr_denegado"
            });

            return res.json({
                acceso: false
            });
        }

        const token = result.rows[0];

        // QR expirado
        if (new Date(token.expires_at) < new Date()) {

            await registrarActividadQR({
                assignmentId: token.assignment_id,
                lockerId: token.locker_id,
                accion: "qr_expirado"
            });

            return res.json({
                acceso: false
            });
        }

        // Eliminar QR después de utilizarlo
        await db.query(
            "DELETE FROM qr_tokens WHERE assignment_id = $1",
            [token.assignment_id]
        );

        // Registrar acceso autorizado
        await registrarActividadQR({
            assignmentId: token.assignment_id,
            lockerId: token.locker_id,
            accion: "qr_autorizado"
        });

        console.log(
            "Acceso QR autorizado:",
            token.locker_numero
        );

        return res.json({
            acceso: true,
            locker: token.locker_numero
        });

    } catch (error) {
        console.error("Error al validar QR:", error);

        return res.status(500).json({
            acceso: false
        });
    }
};


// ==========================================
// EXPORTAR FUNCIONES
// ==========================================
module.exports = {
    generateQRToken,
    validarQRToken
};
