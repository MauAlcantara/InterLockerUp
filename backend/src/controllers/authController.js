const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const getPublicKey = (req, res) => {
    res.json({ publicKey });
}

// const register = async (req, res) => {
//     // Desestructuramos con los nombres que vienen del frontend
//     const { studentId, fullName, email, phone, carrera, password } = req.body;

//     try {
//         const userExists = await db.query(
//             'SELECT * FROM users WHERE matricula = $1 OR email = $2', 
//             [studentId, email]
//         );
        
//         if (userExists.rows.length > 0) {
//             return res.status(400).json({ mensaje: 'La matrícula o el correo ya están registrados.' });
//         }

//         const salt = await bcrypt.genSalt(10);
//         const passwordHash = await bcrypt.hash(password, salt);

//         const newUser = await db.query(
//             `INSERT INTO users (matricula, nombre_completo, email, telefono, carrera, password_hash) 
//              VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre_completo`,
//             [studentId, fullName, email, phone, carrera, passwordHash]
//         );

//         res.status(201).json({ mensaje: '¡Cuenta creada con éxito!', usuario: newUser.rows[0] });
//     } catch (error) {
//         res.status(500).json({ mensaje: 'Error al crear la cuenta. Inténtalo más tarde.' });
//     }
// };

const login = async (req, res) => {
    // Agregamos 'password' a la desestructuración
    const { studentId, email, encryptedPassword, encryptedAesKey, iv, password } = req.body;

    try {
        let decryptedPassword = password; // Por defecto, asumimos que viene normal

        // Si vienen los datos del Cifrado Híbrido, los desciframos
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
        } else if (!password) {
            return res.status(400).json({ mensaje: 'Falta la contraseña.' });
        }
        
        // --- CONTINÚA EL FLUJO NORMAL ---
        const identificador = studentId || email;
        const result = await db.query('SELECT * FROM users WHERE email = $1 OR matricula = $1', [identificador]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(decryptedPassword, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ mensaje: 'Contraseña incorrecta.' });
        }

        const token = jwt.sign(
            { id: user.id, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            mensaje: '¡Bienvenido!',
            token,
            usuario: { id: user.id, nombre: user.nombre_completo, rol: user.rol }
        });
    } catch (error) {
        console.error("Error en desencriptación o login:", error);
        res.status(500).json({ mensaje: 'Error de seguridad en el inicio de sesión.' });
    }
};

const getCarreras = async (req, res) => {
    try {
        // Buscamos las carreras únicas (DISTINCT) en la tabla buildings y las ordenamos alfabéticamente
        const result = await db.query('SELECT DISTINCT career FROM buildings ORDER BY career ASC');
        
        // Transformamos el resultado para enviar un arreglo simple de textos
        const carreras = result.rows.map(row => row.career);
        res.json(carreras);
    } catch (error) {
        console.error("Error al obtener carreras:", error);
        res.status(500).json({ mensaje: 'Error al cargar las divisiones académicas' });
    }
};

module.exports = { login, getPublicKey, getCarreras};