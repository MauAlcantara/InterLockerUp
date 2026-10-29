const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const service = require('../services/backupService');
const scheduler = require('../services/backupScheduler');

// ------------------------------------------------------------
// HISTORIAL DE RESPALDOS
// ------------------------------------------------------------

const getBackups = async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT id, filename, tipo, origen, size_bytes, checksum_sha256, estado, notas,
                   TO_CHAR(creado_el, 'YYYY-MM-DD HH24:MI:SS') AS creado_el
            FROM gestion.backup_jobs
            ORDER BY creado_el DESC
            LIMIT 100
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo el historial de respaldos:', error);
        res.status(500).json({ mensaje: 'Error al cargar el historial de respaldos' });
    }
};

const getBackup = async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT id, filename, tipo, origen, size_bytes, checksum_sha256, estado, notas,
                   TO_CHAR(creado_el, 'YYYY-MM-DD HH24:MI:SS') AS creado_el
            FROM gestion.backup_jobs
            WHERE id = $1
        `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'Respaldo no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error obteniendo el respaldo:', error);
        res.status(500).json({ mensaje: 'Error al obtener el respaldo' });
    }
};

// Ejecutar un respaldo manual ahora
const createBackup = async (req, res) => {
    try {
        const result = await service.ejecutarRespaldo({ origen: 'manual' });
        res.status(201).json({ mensaje: 'Respaldo creado correctamente', respaldo: result });
    } catch (error) {
        console.error('Error creando el respaldo:', error);
        res.status(500).json({ mensaje: error.message || 'Error al crear el respaldo' });
    }
};

// Descargar el archivo del respaldo
const downloadBackup = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT filename FROM gestion.backup_jobs WHERE id = $1', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'Respaldo no encontrado' });
        }
        const file = path.join(service.getBackupDir(), rows[0].filename);
        if (!fs.existsSync(file)) {
            return res.status(404).json({ mensaje: 'El archivo del respaldo no existe en disco' });
        }
        res.download(file, rows[0].filename);
    } catch (error) {
        console.error('Error descargando el respaldo:', error);
        res.status(500).json({ mensaje: 'Error al descargar el respaldo' });
    }
};

// Verificar integridad (checksum) de un respaldo
const verifyBackup = async (req, res) => {
    try {
        const result = await service.verificarRespaldo(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Error verificando el respaldo:', error);
        res.status(500).json({ mensaje: error.message || 'Error al verificar el respaldo' });
    }
};

// Restaurar un respaldo sobre la base activa (requiere confirmacion explicita)
const restoreBackup = async (req, res) => {
    try {
        if (req.body && req.body.confirmar !== true) {
            return res.status(400).json({ mensaje: 'Se requiere confirmacion explicita para restaurar la base de datos' });
        }
        const result = await service.restaurarRespaldo(req.params.id);
        res.json({ mensaje: 'Base de datos restaurada correctamente', ...result });
    } catch (error) {
        console.error('Error restaurando el respaldo:', error);
        res.status(500).json({ mensaje: error.message || 'Error al restaurar el respaldo' });
    }
};

// ------------------------------------------------------------
// PROGRAMACION DE RESPALDOS
// ------------------------------------------------------------

function validarSchedule(body, { parcial = false } = {}) {
    const errores = [];
    const { frecuencia, hora, dia_semana, dias_retencion } = body;

    if (!parcial || frecuencia !== undefined) {
        if (!['diaria', 'semanal'].includes(frecuencia)) {
            errores.push('La frecuencia debe ser "diaria" o "semanal"');
        }
    }
    if (!parcial || hora !== undefined) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora || '')) {
            errores.push('La hora debe tener formato HH:MM (ej. 03:00)');
        }
    }
    if (!parcial || dia_semana !== undefined) {
        if (dia_semana !== null && (!Number.isInteger(dia_semana) || dia_semana < 0 || dia_semana > 6)) {
            errores.push('El dia de la semana debe ser un entero de 0 (domingo) a 6 (sabado)');
        }
    }
    if (!parcial || dias_retencion !== undefined) {
        if (!Number.isInteger(dias_retencion) || dias_retencion < 1 || dias_retencion > 365) {
            errores.push('La retencion debe ser un entero de 1 a 365 dias');
        }
    }
    return errores;
}

const getSchedules = async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT id, frecuencia, hora, dia_semana, dias_retencion, activo, cron_expr,
                   TO_CHAR(ultimo_ejecutado, 'YYYY-MM-DD HH24:MI:SS') AS ultimo_ejecutado,
                   TO_CHAR(creado_el, 'YYYY-MM-DD HH24:MI:SS') AS creado_el
            FROM gestion.backup_schedules
            ORDER BY creado_el ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo la programacion:', error);
        res.status(500).json({ mensaje: 'Error al cargar la programacion de respaldos' });
    }
};

const createSchedule = async (req, res) => {
    try {
        const { frecuencia, hora, dia_semana, dias_retencion, activo } = req.body;
        const errores = validarSchedule(req.body);
        if (errores.length > 0) {
            return res.status(400).json({ mensaje: errores.join('. ') });
        }
        if (frecuencia === 'semanal' && (dia_semana === undefined || dia_semana === null)) {
            return res.status(400).json({ mensaje: 'Para frecuencia semanal se debe indicar el dia de la semana (0-6)' });
        }

        const cronExpr = service.cronExpr(frecuencia, hora, dia_semana);
        const { rows } = await db.query(
            `INSERT INTO gestion.backup_schedules (frecuencia, hora, dia_semana, dias_retencion, activo, cron_expr)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, frecuencia, hora, dia_semana, dias_retencion, activo, cron_expr`,
            [frecuencia, hora, frecuencia === 'semanal' ? dia_semana : null, dias_retencion, activo !== false, cronExpr]
        );

        await scheduler.cargarSchedules();
        res.status(201).json({ mensaje: 'Programa de respaldo creado correctamente', programa: rows[0] });
    } catch (error) {
        console.error('Error creando el programa de respaldo:', error);
        res.status(500).json({ mensaje: 'Error al crear el programa de respaldo' });
    }
};

const updateSchedule = async (req, res) => {
    try {
        const id = req.params.id;
        const { rows } = await db.query('SELECT * FROM gestion.backup_schedules WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'Programa no encontrado' });
        }
        const actual = rows[0];

        const errores = validarSchedule(req.body, { parcial: true });
        if (errores.length > 0) {
            return res.status(400).json({ mensaje: errores.join('. ') });
        }

        const frecuencia = req.body.frecuencia ?? actual.frecuencia;
        const hora = req.body.hora ?? actual.hora;
        const dia_semana = req.body.dia_semana !== undefined ? req.body.dia_semana : actual.dia_semana;
        const dias_retencion = req.body.dias_retencion ?? actual.dias_retencion;
        const activo = req.body.activo ?? actual.activo;

        if (frecuencia === 'semanal' && (dia_semana === undefined || dia_semana === null)) {
            return res.status(400).json({ mensaje: 'Para frecuencia semanal se debe indicar el dia de la semana (0-6)' });
        }

        const cronExpr = service.cronExpr(frecuencia, hora, dia_semana);

        await db.query(
            `UPDATE gestion.backup_schedules
             SET frecuencia = $1, hora = $2, dia_semana = $3, dias_retencion = $4, activo = $5, cron_expr = $6
             WHERE id = $7`,
            [frecuencia, hora, frecuencia === 'semanal' ? dia_semana : null, dias_retencion, activo, cronExpr, id]
        );

        await scheduler.cargarSchedules();
        res.json({ mensaje: 'Programa de respaldo actualizado correctamente' });
    } catch (error) {
        console.error('Error actualizando el programa de respaldo:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el programa de respaldo' });
    }
};

const deleteSchedule = async (req, res) => {
    try {
        const { rowCount } = await db.query('DELETE FROM gestion.backup_schedules WHERE id = $1', [req.params.id]);
        if (rowCount === 0) {
            return res.status(404).json({ mensaje: 'Programa no encontrado' });
        }
        await scheduler.cargarSchedules();
        res.json({ mensaje: 'Programa de respaldo eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando el programa de respaldo:', error);
        res.status(500).json({ mensaje: 'Error al eliminar el programa de respaldo' });
    }
};

module.exports = {
    getBackups,
    getBackup,
    createBackup,
    downloadBackup,
    verifyBackup,
    restoreBackup,
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
};
