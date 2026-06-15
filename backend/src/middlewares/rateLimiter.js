const rateLimit = require('express-rate-limit');

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos por IP
  message: { error: 'Demasiados intentos de autenticación. Intente nuevamente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.generalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 100, // 100 peticiones por IP
  message: { error: 'Límite de peticiones excedido. Intente más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
