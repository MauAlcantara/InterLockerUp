// ============================================================================
// rotationScheduler.js — Cron diario de rotación por cuatrimestre
// Patrón idéntico a backupScheduler.js
//
// 02:00 → limpieza/rotación diaria (limpiezaDiaria)
// 09:00 → notificación anticipada de rotación (notificarRotacion)
// ============================================================================

const cron = require('node-cron');
const rotationService = require('./rotationService');

let tareaLimpieza = null;
let tareaNotificacion = null;

function programar() {
    if (tareaLimpieza) return;

    // 02:00 de la mañana, todos los días
    tareaLimpieza = cron.schedule('0 2 * * *', async () => {
        try {
            console.log('🔄 Ejecutando limpieza/rotación diaria...');
            const resumen = await rotationService.limpiezaDiaria();
            console.log('✅ Rotación diaria completada:', resumen);
        } catch (err) {
            console.error('❌ Error en la rotación diaria:', err.message);
        }
    });

    // 09:00 de la mañana, todos los días (idempotente: solo envía una vez por periodo)
    tareaNotificacion = cron.schedule('0 9 * * *', async () => {
        try {
            const resultado = await rotationService.notificarRotacion();
            if (resultado.enviada) {
                console.log('📣 Notificación de rotación enviada:', resultado);
            } else {
                console.log('⏸️ Notificación de rotación omitida:', resultado.motivo);
            }
        } catch (err) {
            console.error('❌ Error en la notificación de rotación:', err.message);
        }
    });

    console.log('🕑 Programador de rotación activo (02:00 limpieza, 09:00 notificación).');
}

function detener() {
    if (tareaLimpieza) {
        tareaLimpieza.stop();
        tareaLimpieza = null;
    }
    if (tareaNotificacion) {
        tareaNotificacion.stop();
        tareaNotificacion = null;
    }
}

module.exports = { programar, detener };
