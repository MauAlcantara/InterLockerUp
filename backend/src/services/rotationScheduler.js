// ============================================================================
// rotationScheduler.js — Cron diario de rotación por cuatrimestre
// Patrón idéntico a backupScheduler.js
// ============================================================================

const cron = require('node-cron');
const rotationService = require('./rotationService');

let tarea = null;

function programar() {
    if (tarea) return;
    // 02:00 de la mañana, todos los días
    tarea = cron.schedule('0 2 * * *', async () => {
        try {
            console.log('🔄 Ejecutando limpieza/rotación diaria...');
            const resumen = await rotationService.limpiezaDiaria();
            console.log('✅ Rotación diaria completada:', resumen);
        } catch (err) {
            console.error('❌ Error en la rotación diaria:', err.message);
        }
    });
    console.log('🕑 Programador de rotación activo (02:00 diario).');
}

function detener() {
    if (tarea) {
        tarea.stop();
        tarea = null;
    }
}

module.exports = { programar, detener };
