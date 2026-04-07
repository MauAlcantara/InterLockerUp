const db = require('../config/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// --- CONFIGURACIÓN DE NODEMAILER ---
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 1. Genera el PIN de emergencia y lo envía por correo
const solicitarPinCorreo = async (req, res) => {
    const userId = req.user.id;
    try {
        const assignmentResult = await db.query(
            `SELECT a.id as assignment_id, u.email, u.nombre_completo
            FROM assignment_users au
            JOIN assignments a ON au.assignment_id = a.id
            JOIN users u ON au.user_id = u.id
            WHERE au.user_id = $1 AND a.status IN ('activo', 'activa', 'active') LIMIT 1`, [userId]
        );

        if (assignmentResult.rows.length === 0) return res.status(404).json({ mensaje: 'Sin casillero asignado.' });

        const { assignment_id, email, nombre_completo } = assignmentResult.rows[0];

        // Generar PIN de 6 dígitos
        const rawPin = Math.floor(100000 + Math.random() * 900000).toString();
        const pinHash = crypto.createHash("sha256").update(rawPin).digest("hex");
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

        await db.query("DELETE FROM pin_tokens WHERE assignment_id = $1", [assignment_id]);
        await db.query(
            "INSERT INTO pin_tokens (assignment_id, pin_hash, expires_at) VALUES ($1, $2, $3)",
            [assignment_id, pinHash, expiresAt]
        );

        // --- ENVIAR EL CORREO ---
        const mailOptions = {
            from: `"InterLockerUp" <${process.env.EMAIL_USER}>`,
            to: email, // Se envía al correo que el alumno tiene registrado en la BD
            subject: '🚨 PIN de Apertura de Emergencia',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f8f9fb; border-radius: 10px;">
                    <h2 style="color: #0b4dbb;">Apertura Remota - InterLockerUp</h2>
                    <p>Hola <b>${nombre_completo}</b>,</p>
                    <p>Has solicitado un código de emergencia para abrir tu casillero.</p>
                    <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px auto; width: 200px; border: 2px solid #eaf2ff;">
                        <h1 style="font-size: 36px; color: #2e2e2e; letter-spacing: 6px; margin: 0;">${rawPin}</h1>
                    </div>
                    <p style="color: #c94a4a; font-size: 13px; font-weight: bold;">Este PIN es válido por 5 minutos y es de un solo uso.</p>
                    <p style="color: #8a8a8a; font-size: 12px; margin-top: 30px;">Si tú no solicitaste esto, ignora este mensaje.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[CORREO ENVIADO EXITOSAMENTE] PIN enviado a ${email}`);

        res.json({ mensaje: "PIN de emergencia enviado a tu correo." });
    } catch (error) {
        console.error("Error en solicitarPinCorreo:", error);
        res.status(500).json({ mensaje: "Error al solicitar el PIN o enviar el correo." });
    }
};

// 2. Recibe el PIN ingresado en la app y abre el locker
const abrirLockerRemoto = async (req, res) => {
    const userId = req.user.id;
    const { pin_ingresado } = req.body;

    try {
        const assignmentResult = await db.query(
            `SELECT a.id as assignment_id, l.id as locker_id, l.identificador
            FROM assignment_users au
            JOIN assignments a ON au.assignment_id = a.id
            JOIN lockers l ON a.locker_id = l.id
            WHERE au.user_id = $1 AND a.status IN ('activo', 'activa', 'active') LIMIT 1`, [userId]
        );

        if (assignmentResult.rows.length === 0) return res.status(404).json({ mensaje: 'Sin casillero asignado.' });
        const { assignment_id, locker_id, identificador } = assignmentResult.rows[0];

        // Buscar el PIN en la BD
        const pinQuery = await db.query("SELECT pin_hash, expires_at FROM pin_tokens WHERE assignment_id = $1", [assignment_id]);
        if (pinQuery.rows.length === 0) return res.status(400).json({ mensaje: "No has solicitado un PIN." });

        const { pin_hash, expires_at } = pinQuery.rows[0];

        if (new Date() > new Date(expires_at)) {
            return res.status(400).json({ mensaje: "El PIN ha expirado. Solicita uno nuevo." });
        }

        const hashIngresado = crypto.createHash("sha256").update(pin_ingresado.toString()).digest("hex");
        if (hashIngresado !== pin_hash) {
            return res.status(400).json({ mensaje: "PIN incorrecto." });
        }

        // ¡ÉXITO! Aquí te comunicas con el ESP32 (IoT)
        console.log(`[IoT COMMAND] -> ABRIR CHAPA DEL LOCKER ${identificador}`);

        // Registrar en access_logs
        await db.query(
            "INSERT INTO access_logs (assignment_id, user_id, accion) VALUES ($1, $2, $3)",
            [assignment_id, userId, 'acceso_remoto_emergencia']
        );

        // Borrar el PIN para que sea de un solo uso
        await db.query("DELETE FROM pin_tokens WHERE assignment_id = $1", [assignment_id]);

        res.json({ mensaje: "¡Locker abierto exitosamente!" });
    } catch (error) {
        console.error("Error en abrirLockerRemoto:", error);
        res.status(500).json({ mensaje: "Error al validar el PIN." });
    }
};

module.exports = { solicitarPinCorreo, abrirLockerRemoto };