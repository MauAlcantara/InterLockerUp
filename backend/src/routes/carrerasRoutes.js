const express = require('express');
const router = express.Router();
const { getCarreras } = require('../controllers/carrerasController');

router.get('/carreras', getCarreras);

module.exports = router;
