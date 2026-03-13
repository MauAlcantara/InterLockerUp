const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { reportarIncidencia, getIncidenciasAdmin, actualizarIncidencia } = require('../controllers/incidentsController');

if (!fs.existsSync('./uploads')){
    fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/') 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname) 
    }
});
const upload = multer({ storage: storage });

router.post('/reportar', upload.single('evidencia'), reportarIncidencia);
router.get('/admin', getIncidenciasAdmin);
router.patch('/admin/:id', actualizarIncidencia);

module.exports = router;