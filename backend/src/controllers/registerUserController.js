const db = require('../config/db')
const bcrypt = require('bcrypt')

/**
 * Controlador para el registro de nuevos usuarios en la plataforma.
 * Gestiona la validación de datos, verificación de duplicados, cifrado de credenciales
 * y persistencia en la base de datos.
 */
const registerUserController = async (req, res) => {

    // Desestructuración de los datos enviados en el cuerpo de la solicitud.
    const { matricula, nombre_completo, email, password, carrera } = req.body

    try {

        /**
         * Validación de campos obligatorios.
         * Verifica que la información esencial esté presente antes de proceder.
         */
        if(!matricula || !nombre_completo || !email || !password){
            return res.status(400).json({
                mensaje: "Todos los campos obligatorios deben completarse"
            })
        }

        /**
         * Verificación de existencia previa.
         * Realiza una consulta para evitar duplicidad de matrícula o correo electrónico,
         * los cuales deben ser únicos en el sistema.
         */
        const userExists = await db.query(
            `select * from users
            where matricula = $1
            or email = $2`,
            [matricula, email]
        )

        if(userExists.rows.length > 0){
            return res.status(400).json({
                mensaje: "La matrícula o el correo ya están registrados"
            })
        }

        /**
         * Seguridad de credenciales.
         * Genera una semilla (salt) de factor 10 y cifra la contraseña utilizando bcrypt
         * para asegurar que la contraseña en texto plano nunca se almacene.
         */
        const salt = await bcrypt.genSalt(10)
        const passwordHash = await bcrypt.hash(password, salt)

        /**
         * Inserción del nuevo usuario.
         * Guarda el registro con el rol predeterminado de 'estudiante'.
         * El uso de 'returning' permite obtener los datos recién creados sin la contraseña.
         */
        const newUser = await db.query(
            `insert into users
            (matricula, nombre_completo, email, password_hash, rol, carrera)
            values ($1,$2,$3,$4,$5,$6)
            returning id, matricula, nombre_completo, email`,
            [
                matricula,
                nombre_completo,
                email,
                passwordHash,
                'alumno', // Rol asignado por defecto para nuevos registros.
                carrera
            ]
        )

        // Respuesta exitosa con los datos del usuario (excluyendo el hash de contraseña).
        res.status(201).json({
            mensaje: "Usuario registrado correctamente",
            usuario: newUser.rows[0]
        })

    } catch (error) {
        // Registro del error para auditoría y respuesta de fallo genérico.
        console.error(error)

        res.status(500).json({
            mensaje: "Error al registrar usuario"
        })
    }
}

// Exportación del controlador para su integración en las rutas de autenticación.
module.exports = registerUserController