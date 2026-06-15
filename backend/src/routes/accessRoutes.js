const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { solicitarPinCorreo, abrirLockerRemoto } = require('../controllers/accessController');
const db = require('../config/db');
const { generalLimiter } = require('../middlewares/rateLimiter');
const { validateLockerRequest } = require('../middlewares/inputValidator');
const { iotAntiReplay } = require('../middlewares/iotAntiReplay');

router.post('/request-pin', verificarToken, solicitarPinCorreo);
router.post('/remote-unlock', verificarToken, validateLockerRequest, abrirLockerRemoto);

router.get('/iot/pending', iotAntiReplay, async (req, res) => {
    const { locker } = req.query;
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
            await db.query("UPDATE iot_commands SET ejecutado = true WHERE id = $1", [comando.id]);
            return res.json({ abrir: true, locker: comando.identificador });
        }
        res.json({ abrir: false });
    } catch (error) {
        console.error("Error en /iot/pending:", error);
        res.status(500).json({ abrir: false });
    }
});

module.exports = router;
