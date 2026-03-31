const db = require("../config/db");
const crypto = require("crypto");
const { analyzeAccess } = require('../utils/securityNeuron');

/**
 * GENERAR QR: Crea un token temporal para el alumno.
 */
const generateQRToken = async (req, res) => {
    const userId = req.user.id;
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
        );

        if (assignmentResult.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No tienes un casillero asignado o tu acceso ha expirado."
            });
        }

        const { assignment_id, locker_id, locker_numero } = assignmentResult.rows[0];

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        const expiresAt = new Date(Date.now() + 60 * 1000); // 60 segundos

        await db.query("BEGIN");
        transactionStarted = true;

        // Limpiar tokens previos
        await db.query(
            "DELETE FROM qr_tokens WHERE assignment_id = $1",
            [assignment_id]
        );

        // Insertar nuevo token
        await db.query(
            `INSERT INTO qr_tokens (assignment_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            [assignment_id, tokenHash, expiresAt]
        );

        await db.query("COMMIT");

        res.json({
            token: rawToken,
            expiresAt: expiresAt.toISOString(),
            lockerInfo: {
                id: locker_id,
                numero: locker_numero
            }
        });

    } catch (error) {
        if (transactionStarted) await db.query("ROLLBACK");
        console.error("Error al generar QR:", error);
        res.status(500).json({
            mensaje: "Error interno al generar el código de acceso"
        });
    }
};

/**
 * VALIDAR QR: El hardware envía el código y la neurona evalúa el riesgo.
 */
const validarQRToken = async (req, res) => {
    const { codigo } = req.body;

    console.log("BODY RECIBIDO:", req.body);

    try {
        if (!codigo) {
            return res.json({
                acceso: false,
                mensaje: "Código no recibido"
            });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(codigo)
            .digest("hex");

        const result = await db.query(`
            SELECT 
                qt.assignment_id,
                qt.expires_at,
                l.id AS locker_id,
                l.identificador AS locker_numero
            FROM qr_tokens qt
            JOIN assignments a ON qt.assignment_id = a.id
            JOIN lockers l ON a.locker_id = l.id
            WHERE qt.token_hash = $1
            LIMIT 1
        `, [tokenHash]);

        if (result.rows.length === 0) {
            return res.json({
                acceso: false,
                mensaje: "Token inválido"
            });
        }

        const token = result.rows[0];

        // Verificar expiración
        if (new Date(token.expires_at) < new Date()) {
            return res.json({
                acceso: false,
                mensaje: "Token expirado"
            });
        }

        // --- INICIO DE ANÁLISIS DE NEURONA (PRE-PROCESO) ---
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();

        const inputs = {
            x1: (hour >= 7 && hour <= 15) ? 1 : 0,  // H1: Matutino
            x2: (hour >= 17 && hour <= 22) ? 1 : 0, // H2: Vespertino
            x3: (day === 0 || day === 6) ? 1 : 0,   // Fin de Semana
            x4: 0, // Festivo (Manual o DB)
            x5: 0  // Ráfaga (Detección de repetición)
        };

        const resultadoIA = analyzeAccess(inputs);

        // Si la IA detecta que el acceso es SOSPECHOSO (Seguridad < 0.5)
        if (!resultadoIA.esSeguro) {
            const alertaMsg = `⚠️ Acceso Sospechoso: La IA detectó riesgo (Seguridad: ${(resultadoIA.confianza * 100).toFixed(2)}%)`;
            
            await db.query(
                "INSERT INTO notifications (mensaje, tipo, es_global, created_at) VALUES ($1, $2, $3, NOW())",
                [alertaMsg, 'warning', true]
            );
        }
        // --- FIN DE ANÁLISIS DE NEURONA ---

        // Registrar acceso exitoso en tabla de auditoría
        await db.query(
            "INSERT INTO accesos (locker_id, accion, fecha) VALUES ($1, $2, NOW())",
            [token.locker_id, 'Apertura vía QR']
        );

        // Eliminar token (uso único)
        await db.query(
            "DELETE FROM qr_tokens WHERE assignment_id = $1",
            [token.assignment_id]
        );

        return res.json({
            acceso: true,
            locker: token.locker_numero
        });

    } catch (error) {
        console.error("Error al validar QR:", error);
        res.status(500).json({
            acceso: false
        });
    }
};

module.exports = { generateQRToken, validarQRToken };