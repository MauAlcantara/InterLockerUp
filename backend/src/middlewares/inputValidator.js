const { body, validationResult } = require('express-validator');

exports.validateLogin = [
  body('matricula').notEmpty().withMessage('La matrícula es obligatoria'),
  body('password').notEmpty().withMessage('La contraseña es obligatoria'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
  }
];

exports.validateLockerRequest = [
  body('pin_ingresado').isLength({ min: 4, max: 6 }).withMessage('El PIN debe tener entre 4 y 6 dígitos'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
  }
];
