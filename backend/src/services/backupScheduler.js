const cron = require('node-cron');
const db = require('../config/db');
const service = require('./backupService');

// Mapa de tareas cron activas (id del programa -> tarea)
const tasks = new Map();

/**
 * Recarga el programador: detiene las tareas actuales y agenda
 * los programas activos de la tabla backup_schedules.
 * Llamar en el arranque del servidor y tras cada cambio de programa.
 */
async function cargarSchedules() {
    // Detener tareas previas
    for (const task of tasks.values()) task.stop();
    tasks.clear();

    const { rows } = await db.query(
        'SELECT id, cron_expr, dias_retencion FROM gestion.backup_schedules WHERE activo = TRUE'
    );

    for (const s of rows) {
        if (!cron.validate(s.cron_expr)) {
            console.warn(`⚠️  Expresion cron invalida en el programa de respaldo #${s.id}: ${s.cron_expr}`);
            continue;
        }

        const task = cron.schedule(s.cron_expr, async () => {
            console.log(`⏰ Ejecutando respaldo programado (#${s.id})...`);
            try {
                await service.ejecutarRespaldo({
                    origen: 'programado',
                    scheduleId: s.id,
                    diasRetencion: s.dias_retencion,
                });
                console.log(`✅ Respaldo programado #${s.id} completado`);
            } catch (err) {
                console.error(`❌ Fallo en respaldo programado #${s.id}:`, err.message);
            }
        });

        tasks.set(s.id, task);
    }

    console.log(`📦 Programador de respaldos: ${tasks.size} programa(s) activo(s)`);
}

module.exports = { cargarSchedules };
