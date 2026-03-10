const db = require('../config/db');
const crypto = require('crypto');
const fs = require('fs');

const reportarIncidencia = async (req, res) => {
    try {
        // 1. Recibe los datos que coinciden con la tabla incidents
        const { userId, lockerId, categoria, descripcion } = req.body;
        
        // 2. Genera un folio único
        const folio = 'INC-' + Math.floor(10000 + Math.random() * 90000);
        
        let evidenciaUrl = null;
        let archivoHash = null;

        // 3. Procesamiento del archivo y generación de Hash
        if (req.file) {
            evidenciaUrl = req.file.path; // multer guarda la foto y da la ruta

            // Genera el Hash SHA-256 leyendo los bytes físicos de la imagen
            const fileBuffer = fs.readFileSync(evidenciaUrl);
            const hashSum = crypto.createHash('sha256');
            hashSum.update(fileBuffer);
            archivoHash = hashSum.digest('hex'); // Lo convierte a texto hexadecimal
        }

        // 4. Inserción en la tabla incidents
        const result = await db.query(
            `INSERT INTO incidents 
            (folio, user_id, locker_id, categoria, descripcion, evidencia_url, archivo_hash) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [folio, userId, lockerId, categoria, descripcion, evidenciaUrl, archivoHash]
        );

        res.status(201).json({
            mensaje: 'Incidencia reportada con éxito.',
            hashGenerado: archivoHash,
            incidencia: result.rows[0]
        });

    } catch (error) {
        console.error("Error al procesar la incidencia:", error);
        res.status(500).json({ mensaje: 'Error interno al procesar el reporte.' });
    }
};

// Obtener todas las incidencias para el panel de Admin
const getIncidenciasAdmin = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                i.id, i.folio, i.descripcion, i.estado, i.categoria, 
                i.evidencia_url, i.archivo_hash, i.observaciones_admin, 
                TO_CHAR(i.created_at, 'YYYY-MM-DD HH24:MI') as fecha_reporte,
                u.nombre_completo as user_name, u.matricula,
                l.identificador as locker_name, l.ubicacion_detallada as location
            FROM incidents i
            JOIN users u ON i.user_id = u.id
            JOIN lockers l ON i.locker_id = l.id
            ORDER BY i.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo incidencias:", error);
        res.status(500).json({ mensaje: "Error interno del servidor" });
    }
};

// Actualizar estado y agregar comentarios
const actualizarIncidencia = async (req, res) => {
    const { id } = req.params;
    const { estado, nuevo_comentario } = req.body;
    
    try {
        const actual = await db.query("SELECT observaciones_admin FROM incidents WHERE id = $1", [id]);
        let observaciones = actual.rows[0].observaciones_admin;
        
        // se guarda los comentarios como un arreglo JSON en la base de datos
        let comentariosArray = [];
        if (observaciones) {
            try { comentariosArray = JSON.parse(observaciones); } 
            catch(e) { comentariosArray = []; }
        }

        if (nuevo_comentario) {
            comentariosArray.push({
                author: "Admin UTEQ",
                text: nuevo_comentario,
                date: new Date().toISOString().replace("T", " ").substring(0, 16)
            });
        }

        // Mapeo de estado de React a la base de datos
        const estadoDB = estado === 'en_proceso' ? 'en proceso' : estado === 'resuelto' ? 'resuelta' : estado;

        await db.query(
            `UPDATE incidents SET estado = $1, observaciones_admin = $2 WHERE id = $3`,
            [estadoDB, JSON.stringify(comentariosArray), id]
        );
        res.json({ mensaje: "Incidencia actualizada" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al actualizar" });
    }
};

module.exports = { reportarIncidencia, getIncidenciasAdmin, actualizarIncidencia };