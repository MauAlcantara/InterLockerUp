const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { reportarIncidencia, getIncidenciasAdmin, actualizarIncidencia } = require('../controllers/incidentsController');
const verificarToken = require('../middlewares/authMiddleware');

if (!fs.existsSync('./uploads')){
    fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/') 
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-zA-Z0-9.]/g, '');
        cb(null, crypto.randomUUID() + ext);
    }
});
const upload = multer({ storage: storage });

router.post('/reportar', verificarToken, upload.single('evidencia'), reportarIncidencia);
router.get('/admin', verificarToken, getIncidenciasAdmin);
router.patch('/admin/:id', verificarToken, actualizarIncidencia);

module.exports = router;
