const db = require('../config/db');
const crypto = require('crypto');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// 1. SOLICITAR PIN POR CORREO
const solicitarPinCorreo = async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await db.query(
            `SELECT a.id as assignment_id, u.email, u.nombre_completo
             FROM assignment_users au
             JOIN assignments a ON au.assignment_id = a.id
             JOIN users u ON au.user_id = u.id
             WHERE au.user_id = $1 AND a.status IN ('activo', 'activa', 'active')
             LIMIT 1`, [userId]
        );

        if (result.rows.length === 0) return res.status(404).json({ mensaje: 'Sin casillero activo.' });

        const { assignment_id, email, nombre_completo } = result.rows[0];
        const rawPin = Math.floor(100000 + Math.random() * 900000).toString();
        const pinHash = crypto.createHash("sha256").update(rawPin).digest("hex");
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await db.query("DELETE FROM pin_tokens WHERE assignment_id = $1", [assignment_id]);
        await db.query("INSERT INTO pin_tokens (assignment_id, pin_hash, expires_at) VALUES ($1, $2, $3)", 
            [assignment_id, pinHash, expiresAt]);

        // ENVIAR EMAIL CON EL NUEVO ESTILO
        await resend.emails.send({
            from: process.env.RESEND_FROM,
            to: email,
            subject: '🔒 PIN de Acceso Remoto - InterLockerUp',
            html: `
            <div style="font-family: Arial, sans-serif; background-color: #0f172a; padding: 40px; color: white; text-align: center;">
              <div style="max-width: 500px; margin: auto; background: #1e293b; border-radius: 12px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
                <h1 style="margin-bottom: 10px; color: #ffffff;">InterLockerUp</h1>
                <p style="color: #cbd5f5; font-size: 14px; text-align: left;">
                  Hola <strong>${nombre_completo}</strong>,<br><br>
                  Hemos detectado una solicitud de acceso remoto a tu casillero. 
                  Para garantizar tu seguridad, utiliza el siguiente código para la apertura:
                </p>
                <div style="
                  margin: 25px 0;
                  padding: 20px;
                  font-size: 32px;
                  letter-spacing: 10px;
                  font-weight: bold;
                  background: #0f172a;
                  color: #38bdf8;
                  border-radius: 10px;
                  border: 1px solid #334155;
                ">
                  ${rawPin}
                </div>
                <p style="font-size: 13px; color: #94a3b8;">
                  Este código es válido por 5 minutos y es de un solo uso.
                </p>
                <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;">
                <p style="font-size: 12px; color: #64748b; text-align: center;">
                  Si no solicitaste este acceso, puedes ignorar este mensaje de forma segura.<br><br>
                  © 2026 InterLockerUp - Universidad Tecnológica de Querétaro
                </p>
              </div>
            </div>
            `
        });

        console.log("✅ PIN con estilo enviado a:", email);
        res.json({ mensaje: "PIN enviado a tu correo." });
    } catch (e) {
        console.error("❌ Error en solicitarPin:", e);
        res.status(500).json({ mensaje: "Error al solicitar el PIN." });
    }
};

// 2. VALIDAR PIN Y ABRIR (Sin cambios en lógica)
const abrirLockerRemoto = async (req, res) => {
    const userId = req.user.id;
    const { pin_ingresado } = req.body;

    try {
        const result = await db.query(
            `SELECT a.id as assignment_id, l.id as locker_id 
             FROM assignment_users au
             JOIN assignments a ON au.assignment_id = a.id
             JOIN lockers l ON a.locker_id = l.id
             WHERE au.user_id = $1 AND a.status IN ('activo', 'activa', 'active')`, [userId]
        );

        if (result.rows.length === 0) return res.status(404).json({ mensaje: "No tienes casillero asignado." });

        const { assignment_id, locker_id } = result.rows[0];
        const pinData = await db.query("SELECT pin_hash, expires_at FROM pin_tokens WHERE assignment_id = $1", [assignment_id]);

        if (pinData.rows.length === 0 || new Date() > new Date(pinData.rows[0].expires_at)) {
            return res.status(400).json({ mensaje: "El PIN expiró o no existe." });
        }

        const hash = crypto.createHash("sha256").update(pin_ingresado.toString()).digest("hex");
        if (hash !== pinData.rows[0].pin_hash) return res.status(400).json({ mensaje: "PIN incorrecto." });

        await db.query("INSERT INTO iot_commands (locker_id, accion) VALUES ($1, $2)", [locker_id, 'abrir']);
        await db.query("INSERT INTO access_logs (assignment_id, user_id, accion) VALUES ($1, $2, $3)", 
            [assignment_id, userId, 'acceso_remoto_emergencia']);
        await db.query("DELETE FROM pin_tokens WHERE assignment_id = $1", [assignment_id]);

        res.json({ mensaje: "Locker abierto correctamente." });
    } catch (e) {
        console.error("❌ Error en abrirLockerRemoto:", e);
        res.status(500).json({ mensaje: "Error interno del servidor." });
    }
};

module.exports = { solicitarPinCorreo, abrirLockerRemoto };
