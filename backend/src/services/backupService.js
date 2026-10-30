const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('../config/db');

// Directorio donde se guardan los dumps locales (configurable por variable de entorno)
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups');
// Retencion por defecto si ningun programa la especifica (3 meses)
const DEFAULT_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '90', 10);

let isRunning = false;

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------

function getBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    return BACKUP_DIR;
}

// Entorno para pg_dump / pg_restore (no interpola credenciales en la linea de comandos)
function dbEnv() {
    return {
        ...process.env,
        PGUSER: process.env.DB_USER,
        PGPASSWORD: process.env.DB_PASSWORD,
        PGHOST: process.env.DB_HOST,
        PGPORT: process.env.DB_PORT,
        PGDATABASE: process.env.DB_NAME,
    };
}

function runCommand(cmd, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { env: dbEnv() });
        let stderr = '';
        child.stderr.on('data', (d) => (stderr += d));
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${cmd} termino con codigo ${code}: ${stderr.trim().slice(0, 400)}`));
        });
        child.on('error', (err) => reject(new Error(`No se pudo ejecutar ${cmd}: ${err.message}`)));
    });
}

function sha256File(file) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(file);
        stream.on('data', (d) => hash.update(d));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

// Deriva la expresion cron a partir de los campos del programa
function cronExpr(frecuencia, hora, diaSemana) {
    const [h, m] = hora.split(':').map(Number);
    if (frecuencia === 'diaria') return `${m} ${h} * * *`;
    return `${m} ${h} * * ${Number(diaSemana)}`;
}

// ------------------------------------------------------------
// Almacenamiento S3 / DigitalOcean Spaces
// Si no hay variables S3_* configuradas, todo queda en disco local
// ------------------------------------------------------------

let s3Client = null;

function s3Configurado() {
    return Boolean(
        process.env.S3_BUCKET &&
        process.env.S3_ACCESS_KEY_ID &&
        process.env.S3_SECRET_ACCESS_KEY
    );
}

function getS3Client() {
    if (!s3Client) {
        const { S3Client } = require('@aws-sdk/client-s3');
        s3Client = new S3Client({
            region: process.env.S3_REGION || 'us-east-1',
            endpoint: process.env.S3_ENDPOINT || undefined, // p. ej. https://nyc3.digitaloceanspaces.com
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            },
        });
    }
    return s3Client;
}

function s3KeyFor(filename) {
    let prefix = process.env.S3_PREFIX || '';
    if (prefix && !prefix.endsWith('/')) prefix += '/';
    return prefix + filename;
}

// Sube el dump al bucket y borra la copia local. Devuelve { almacen, s3_key }
async function subirAStorage(fileLocal, filename) {
    if (!s3Configurado()) return { almacen: 'local', s3_key: null };

    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await getS3Client().send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: s3KeyFor(filename),
        Body: fs.createReadStream(fileLocal),
        ContentType: 'application/octet-stream',
    }));
    fs.unlinkSync(fileLocal); // la copia local ya no es necesaria
    return { almacen: 's3', s3_key: s3KeyFor(filename) };
}

// Devuelve un path local con el contenido del respaldo.
// Si esta en S3, lo descarga a un archivo temporal (temporal = true).
async function materializarLocal(job) {
    if (job.almacen !== 's3') {
        const file = path.join(getBackupDir(), job.filename);
        if (!fs.existsSync(file)) throw new Error('El archivo del respaldo no existe en disco');
        return { file, temporal: false };
    }
    if (!job.s3_key) throw new Error('El respaldo no tiene clave S3 registrada');

    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const obj = await getS3Client().send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: job.s3_key,
    }));

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interlockerup-backup-'));
    const file = path.join(tmpDir, job.filename);
    await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(file);
        obj.Body.on('error', reject);
        out.on('error', reject);
        out.on('finish', resolve);
        obj.Body.pipe(out);
    });
    return { file, temporal: true };
}

// Devuelve el objeto S3 (con Body como stream) para servir la descarga
async function streamS3(job) {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    return getS3Client().send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: job.s3_key,
    }));
}

// ------------------------------------------------------------
// Retencion: borra los respaldos mas antiguos que excedan los dias indicados
// ------------------------------------------------------------
async function aplicarRetencion(dias) {
    const { rows } = await db.query(
        `SELECT id, filename, almacen, s3_key FROM gestion.backup_jobs
         WHERE estado = 'ok' AND creado_el < NOW() - ($1 || ' days')::interval
         ORDER BY creado_el ASC`,
        [dias]
    );
    for (const r of rows) {
        try {
            if (r.almacen === 's3' && r.s3_key) {
                const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
                await getS3Client().send(new DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET,
                    Key: r.s3_key,
                }));
            } else {
                fs.unlinkSync(path.join(getBackupDir(), r.filename));
            }
        } catch (e) {
            // Si no se pudo borrar el archivo, conservar el registro para reintentar
            console.error(`⚠️  No se pudo borrar el respaldo #${r.id} (${r.filename}):`, e.message);
            continue;
        }
        await db.query('DELETE FROM gestion.backup_jobs WHERE id = $1', [r.id]);
    }
}

// ------------------------------------------------------------
// Ejecutar un respaldo (pg_dump en formato custom)
// Si S3 esta configurado, el dump sube al bucket y se borra la copia local
// ------------------------------------------------------------
async function ejecutarRespaldo({ origen = 'manual', scheduleId = null, diasRetencion = null } = {}) {
    if (isRunning) throw new Error('Ya hay un respaldo en curso. Intenta de nuevo en unos segundos.');
    isRunning = true;

    const dir = getBackupDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${stamp}.dump`;
    const file = path.join(dir, filename);

    const insert = await db.query(
        `INSERT INTO gestion.backup_jobs (filename, tipo, origen, estado)
         VALUES ($1, 'full', $2, 'en_proceso') RETURNING id`,
        [filename, origen]
    );
    const id = insert.rows[0].id;

    try {
        await runCommand('pg_dump', ['-Fc', '--no-owner', '--no-privileges', '--file', file]);
        const checksum = await sha256File(file);
        const size = fs.statSync(file).size;

        const { almacen, s3_key } = await subirAStorage(file, filename);

        await db.query(
            `UPDATE gestion.backup_jobs
             SET estado = 'ok', size_bytes = $1, checksum_sha256 = $2, almacen = $3, s3_key = $4
             WHERE id = $5`,
            [size, checksum, almacen, s3_key, id]
        );

        // Aplicar retencion
        await aplicarRetencion(diasRetencion || DEFAULT_RETENTION_DAYS);

        // Registrar ultimo_ejecutado si corresponde a un programa
        if (scheduleId) {
            await db.query('UPDATE gestion.backup_schedules SET ultimo_ejecutado = NOW() WHERE id = $1', [scheduleId]);
        }

        return { id, filename, size_bytes: size, checksum_sha256: checksum, almacen, estado: 'ok' };
    } catch (err) {
        try { fs.unlinkSync(file); } catch (e) { /* ignorar */ }
        await db.query(
            `UPDATE gestion.backup_jobs SET estado = 'fallo', notas = $1 WHERE id = $2`,
            [String(err.message).slice(0, 500), id]
        );
        throw err;
    } finally {
        isRunning = false;
    }
}

// ------------------------------------------------------------
// Verificar integridad de un respaldo (checksum SHA-256)
// ------------------------------------------------------------
async function verificarRespaldo(id) {
    const { rows } = await db.query('SELECT * FROM gestion.backup_jobs WHERE id = $1', [id]);
    if (rows.length === 0) throw new Error('Respaldo no encontrado');
    const job = rows[0];

    let actual;
    if (job.almacen === 's3') {
        if (!job.s3_key) {
            return { id, valido: false, motivo: 'El respaldo no tiene clave S3 registrada' };
        }
        const obj = await streamS3(job);
        const hash = crypto.createHash('sha256');
        for await (const chunk of obj.Body) hash.update(chunk);
        actual = hash.digest('hex');
    } else {
        const file = path.join(getBackupDir(), job.filename);
        if (!fs.existsSync(file)) {
            await db.query(
                `UPDATE gestion.backup_jobs SET estado = 'fallo', notas = 'El archivo del respaldo no existe en disco' WHERE id = $1`,
                [id]
            );
            return { id, valido: false, motivo: 'El archivo del respaldo no existe en disco' };
        }
        actual = await sha256File(file);
    }

    const valido = Boolean(job.checksum_sha256) && actual === job.checksum_sha256;

    await db.query(
        `UPDATE gestion.backup_jobs
         SET estado = $1, notas = $2
         WHERE id = $3`,
        [
            valido ? 'ok' : 'fallo',
            valido ? 'Checksum verificado correctamente' : `Checksum no coincide (esperado: ${job.checksum_sha256})`,
            id
        ]
    );

    return { id, valido, checksum_esperado: job.checksum_sha256, checksum_actual: actual };
}

// ------------------------------------------------------------
// Restaurar un respaldo sobre la base de datos activa
// 1) Verifica integridad  2) Toma un respaldo de seguridad  3) pg_restore
// ------------------------------------------------------------
async function restaurarRespaldo(id) {
    const { rows } = await db.query('SELECT * FROM gestion.backup_jobs WHERE id = $1', [id]);
    if (rows.length === 0) throw new Error('Respaldo no encontrado');
    const job = rows[0];

    const { file, temporal } = await materializarLocal(job);

    try {
        // 1. Integridad
        const actual = await sha256File(file);
        if (job.checksum_sha256 && actual !== job.checksum_sha256) {
            throw new Error('El respaldo no supero la verificacion de integridad (checksum). No se realizo la restauracion.');
        }

        // 2. Respaldo de seguridad antes de sobrescribir
        const seguridad = await ejecutarRespaldo({ origen: 'pre_restauracion' });

        // 3. Restaurar (sobrescribe la base activa)
        try {
            await runCommand('pg_restore', [
                '-d', process.env.DB_NAME,
                '--clean', '--if-exists',
                '--no-owner', '--no-privileges',
                file
            ]);
            return { id, restaurado: true, respaldo_seguridad: seguridad.filename };
        } catch (err) {
            throw new Error(`La restauracion fallo: ${err.message}. Se conservo el respaldo de seguridad (${seguridad.filename}).`);
        }
    } finally {
        if (temporal) {
            try {
                fs.unlinkSync(file);
                fs.rmdirSync(path.dirname(file));
            } catch (e) { /* ignorar */ }
        }
    }
}

module.exports = {
    getBackupDir,
    cronExpr,
    s3Configurado,
    subirAStorage,
    materializarLocal,
    streamS3,
    ejecutarRespaldo,
    verificarRespaldo,
    restaurarRespaldo,
    aplicarRetencion,
    DEFAULT_RETENTION_DAYS,
};
