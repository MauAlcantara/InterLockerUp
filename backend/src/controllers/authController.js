const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');

// 1. Importamos y configuramos Resend en lugar de Nodemailer
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const getPublicKey = (req, res) => {
    res.json({ publicKey });
}

// Verifica si el usuario ya tiene una sesión activa (no expirada).
const haySesionActiva = async (user) => {
    const result = await db.query(
        'SELECT 1 FROM user_sessions WHERE user_id = $1 AND expires_at > NOW()',
        [user.id]
    );
    return result.rows.length > 0;
};

// Crea la sesión activa del usuario y devuelve el jti del token.
// Solo se puede crear si no hay otra sesión activa (sesión única por usuario).
const crearSesion = async (user, deviceId) => {
    const jti = crypto.randomUUID();
    // Los admins tienen sesión corta (por defecto 1 h, configurable por env);
    // los estudiantes conservan 8 h para no interrumpir su uso normal.
    const horas = user.rol === 'admin'
        ? Math.max(1, Number(process.env.ADMIN_SESSION_HOURS) || 1)
        : 8;
    await db.query(
        'INSERT INTO user_sessions (user_id, token_jti, device_fingerprint, expires_at) '
        + 'VALUES ($1, $2, $3, NOW() + ($4 * INTERVAL \'1 hour\')) '
        + 'ON CONFLICT (user_id) DO UPDATE '
        + 'SET token_jti = EXCLUDED.token_jti, device_fingerprint = EXCLUDED.device_fingerprint, created_at = NOW(), expires_at = EXCLUDED.expires_at',
        [user.id, jti, deviceId || null, horas]
    );
    return jti;
};

const login = async (req, res) => {
    const { studentId, email, encryptedPassword, encryptedAesKey, iv, password, otpCode } = req.body;
    const deviceId = req.body.deviceId || null;

    try {
        let decryptedPassword = password; 

        if (encryptedPassword && encryptedAesKey && iv) {
            const aesKeyBuffer = crypto.privateDecrypt(
                {
                    key: privateKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
                },
                Buffer.from(encryptedAesKey, 'base64')
            );
            
            const decipher = crypto.createDecipheriv(
                'aes-256-cbc', 
                aesKeyBuffer, 
                Buffer.from(iv, 'base64')
            );
            decryptedPassword = decipher.update(encryptedPassword, 'base64', 'utf8');
            decryptedPassword += decipher.final('utf8');
        }

        const identificador = studentId || email;
        const result = await db.query('SELECT * FROM users WHERE email = $1 OR matricula = $1', [identificador]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        const user = result.rows[0];

        // Validar contraseña (SIEMPRE se valida para evitar bypass)
        const validPassword = await bcrypt.compare(decryptedPassword || "", user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ mensaje: 'Contraseña incorrecta.' });
        }

        // --- VERIFICACIÓN DE DISPOSITIVO ---
        const deviceCheck = await db.query(
            'SELECT * FROM user_devices WHERE user_id = $1 AND device_fingerprint = $2',
            [user.id, deviceId]
        );

        if (deviceCheck.rows.length === 0) {
            if (!otpCode) {
               const generatedCode = crypto.randomInt(100000, 1000000).toString();
                
                await db.query(
                    'UPDATE users SET temp_otp = $1, otp_expires = NOW() + INTERVAL \'5 minutes\' WHERE id = $2',
                    [generatedCode, user.id]
                );

              // 2. Enviamos el correo usando Resend
              await resend.emails.send({
                  from: process.env.RESEND_FROM, // Usa la variable de entorno que ya tienes configurada
                  to: user.email,
                  subject: "🔒 Verificación de inicio de sesión - InterLockerUp",
                  html: `
                    <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
                      <div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        
                        <h2 style="color: #0b4dbb; text-align: center; margin-bottom: 10px;">
                          InterLockerUp
                        </h2>

                        <p style="font-size: 16px; color: #333;">
                          Hola,
                        </p>

                        <p style="font-size: 14px; color: #555;">
                          Hemos detectado un intento de inicio de sesión desde un dispositivo no reconocido en tu cuenta.
                          Para garantizar la seguridad de tu información, es necesario verificar tu identidad.
                        </p>

                        <p style="font-size: 14px; color: #555;">
                          Por favor, utiliza el siguiente código de verificación:
                        </p>

                        <div style="text-align: center; margin: 20px 0;">
                          <span style="display: inline-block; background: #eaf2ff; color: #0b4dbb; font-size: 28px; font-weight: bold; padding: 12px 24px; border-radius: 8px; letter-spacing: 4px;">
                            ${generatedCode}
                          </span>
                        </div>

                        <p style="font-size: 13px; color: #777; text-align: center;">
                          Este código es válido por unos minutos y es de un solo uso.
                        </p>

                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

                        <p style="font-size: 12px; color: #999; text-align: center;">
                          Si no intentaste iniciar sesión, te recomendamos cambiar tu contraseña inmediatamente.
                        </p>

                        <p style="font-size: 12px; color: #bbb; text-align: center; margin-top: 10px;">
                          © 2026 InterLockerUp - Seguridad de acceso a casilleros
                        </p>

                      </div>
                    </div>
                  `
              });

                return res.status(203).json({ mensaje: 'Verificación requerida', requiereOTP: true });
            }

            // Validar OTP
            const isOtpValid = (otpCode === user.temp_otp) && (new Date() < new Date(user.otp_expires));
            if (!isOtpValid) {
                return res.status(401).json({ mensaje: 'Código de verificación inválido o expirado.' });
            }

            // Registrar dispositivo (solo si el cliente envió huella válida)
            if (deviceId) {
                await db.query(
                    'INSERT INTO user_devices (user_id, device_fingerprint) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [user.id, deviceId]
                );
            }
        }

        // Login exitoso
        // Sesión única para administradores: si ya hay una sesión activa,
        // se rechaza el nuevo login hasta que se cierre o expire.
        if (user.rol === 'admin' && await haySesionActiva(user)) {
            return res.status(409).json({
                mensaje: 'Esta cuenta ya tiene una sesión activa. Ciérrala primero o espera a que expire.'
            });
        }
        const jti = await crearSesion(user, deviceId);
        const token = jwt.sign(
            { id: user.id, rol: user.rol, jti },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            mensaje: '¡Bienvenido!',
            token,
            usuario: { id: user.id, nombre: user.nombre_completo, rol: user.rol }
        });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ mensaje: 'Error de seguridad en el inicio de sesión.' });
    }
};

const getCarreras = async (req, res) => {
    try {
        // Buscamos las carreras únicas (DISTINCT) en la tabla buildings y las ordenamos alfabéticamente
        const result = await db.query('SELECT DISTINCT career FROM gestion.buildings ORDER BY career ASC');
        
        // Transformamos el resultado para enviar un arreglo simple de textos
        const carreras = result.rows.map(row => row.career);
        res.json(carreras);
    } catch (error) {
        console.error("Error al obtener carreras:", error);
        res.status(500).json({ mensaje: 'Error al cargar las divisiones académicas' });
    }
};

const verifyOTP = async (req, res) => {
    const { studentId, otp, deviceId } = req.body;

    try {
        // 1. Buscamos al usuario por su matrícula
        const result = await db.query(
            'SELECT * FROM users WHERE matricula = $1', 
            [studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        const user = result.rows[0];

        // 2. Validamos el código y la expiración (usando las columnas de tu DB)
        const isOtpValid = (otp === user.temp_otp) && (new Date() < new Date(user.otp_expires));

        if (!isOtpValid) {
            return res.status(401).json({ mensaje: 'Código de verificación inválido o expirado.' });
        }

        // 3. Limpiamos el código usado para que no se use de nuevo
        await db.query(
            'UPDATE users SET temp_otp = NULL, otp_expires = NULL WHERE id = $1',
            [user.id]
        );

        // 3.5. Registrar el dispositivo verificado para no pedir OTP en futuras sesiones
        if (deviceId) {
            await db.query(
                'INSERT INTO user_devices (user_id, device_fingerprint) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [user.id, deviceId]
            );
        }

        // 4. Sesión única para administradores: si ya hay una sesión activa,
        // se rechaza el nuevo login hasta que se cierre o expire.
        if (user.rol === 'admin' && await haySesionActiva(user)) {
            return res.status(409).json({
                mensaje: 'Esta cuenta ya tiene una sesión activa. Ciérrala primero o espera a que expire.'
            });
        }

        // 5. Generamos el token de acceso real
        const jti = await crearSesion(user, deviceId);
        const token = jwt.sign(
            { id: user.id, rol: user.rol, jti },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            mensaje: '¡Verificación exitosa!',
            token,
            usuario: { 
                id: user.id, 
                nombre: user.nombre_completo, 
                rol: user.rol 
            }
        });

    } catch (error) {
        console.error("Error en verifyOTP:", error);
        res.status(500).json({ mensaje: 'Error al verificar el código de seguridad.' });
    }
};

// Cierra la sesión activa del usuario (invalida su token en el servidor)
const logout = async (req, res) => {
    try {
        const { id } = req.user;
        await db.query('DELETE FROM user_sessions WHERE user_id = $1', [id]);
        res.json({ mensaje: 'Sesión cerrada correctamente.' });
    } catch (error) {
        console.error("Error en logout:", error);
        res.status(500).json({ mensaje: 'Error al cerrar la sesión.' });
    }
};

module.exports = { login, getPublicKey, getCarreras, verifyOTP, logout };
