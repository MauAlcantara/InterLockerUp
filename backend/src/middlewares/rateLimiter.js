const rateLimit = require('express-rate-limit');

// Activación/desactivación global (útil para testeo en desarrollo).
// En producción déjala en "true" (o no definirla: el default es true).
const enabled = (process.env.RATE_LIMIT_ENABLED ?? 'true').toString().toLowerCase() !== 'false';

const noLimit = (req, res, next) => next();

exports.authLimiter = enabled
  ? rateLimit({
      windowMs: (Number(process.env.RATE_LIMIT_AUTH_WINDOW_MIN) || 15) * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 5,
      message: { error: 'Demasiados intentos de autenticación. Intente nuevamente en 15 minutos.' },
      standardHeaders: true,
      legacyHeaders: false,
    })
  : noLimit;

exports.generalLimiter = enabled
  ? rateLimit({
      windowMs: (Number(process.env.RATE_LIMIT_GENERAL_WINDOW_MIN) || 60) * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_GENERAL_MAX) || 100,
      message: { error: 'Límite de peticiones excedido. Intente más tarde.' },
      standardHeaders: true,
      legacyHeaders: false,
    })
  : noLimit;
