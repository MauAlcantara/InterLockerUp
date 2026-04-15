const express = require('express');
const router = express.Router();

// Middleware
const verificarToken = require('../middlewares/authMiddleware');

// Controlador
const { 
    solicitarPinCorreo, 
    abrirLockerRemoto 
} = require('../controllers/accessController');

//  IMPORTANTE: DB para el endpoint IoT
const db = require('../config/db');

// SOLICITAR PIN POR CORREO

router.post('/request-pin', verificarToken, solicitarPinCorreo);

// VALIDAR PIN Y ABRIR (lógica backend)

router.post('/remote-unlock', verificarToken, abrirLockerRemoto);

// NUEVO: ENDPOINT PARA ESP32
router.get('/iot/pending', async (req, res) => {

    const { locker } = req.query; // Ej: "K-01"

    try {
        const result = await db.query(
            `SELECT ic.id, l.identificador 
             FROM iot_commands ic
             JOIN lockers l ON ic.locker_id = l.id
             WHERE ic.ejecutado = false 
             AND l.identificador = $1
             LIMIT 1`,
            [locker]
        );

        if (result.rows.length > 0) {

            const comando = result.rows[0];

            // marcar como ejecutado (para no repetir)
            await db.query(
                "UPDATE iot_commands SET ejecutado = true WHERE id = $1",
                [comando.id]
            );

            return res.json({
                abrir: true,
                locker: comando.identificador
            });
        }

        res.json({ abrir: false });

    } catch (error) {
        console.error("Error en /iot/pending:", error);
        res.status(500).json({ abrir: false });
    }
});

module.exports = router;
