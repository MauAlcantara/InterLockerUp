const express = require('express');
const router = express.Router();
const { getAuditorias } = require('../controllers/auditsController');

router.get('/', getAuditorias);

module.exports = router;