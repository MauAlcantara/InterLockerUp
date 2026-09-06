const crypto = require('crypto');

const SECRET_IOT = process.env.IOT_SECRET_KEY || 'clave_secreta_default_segura';
const MAX_TIMESTAMP_DIFF_MS = 30000; // Ventana de 30 segundos
const NONCE_CACHE = new Map();
const NONCE_TTL_MS = 60000; // 1 minuto de vida en caché

exports.iotAntiReplay = (req, res, next) => {
  // Soporta GET (query) y POST (body)
  const { timestamp, nonce, signature } = req.body || req.query;

  if (!timestamp || !nonce || !signature) {
    return res.status(400).json({ error: 'Faltan parámetros IoT: timestamp, nonce, signature' });
  }

  // Detectar si el timestamp viene en segundos (ESP32 común) y convertir a ms
  const timestampNum = Number(timestamp);
  const reqTime = timestampNum < 1e12 ? timestampNum * 1000 : timestampNum; // Si es < 1e12, asume segundos
  const currentTime = Date.now();
  if (Math.abs(currentTime - reqTime) > MAX_TIMESTAMP_DIFF_MS) {
    return res.status(403).json({ error: 'Solicitud expirada. El timestamp no está dentro de la ventana de seguridad.' });
  }

  if (NONCE_CACHE.has(nonce)) {
    return res.status(403).json({ error: 'Solicitud ya procesada. Nonce duplicado detectado.' });
  }
  NONCE_CACHE.set(nonce, true);
  setTimeout(() => NONCE_CACHE.delete(nonce), NONCE_TTL_MS);

  const payloadToSign = `${timestamp}:${nonce}`;
  const expectedSignature = crypto.createHmac('sha256', SECRET_IOT).update(payloadToSign).digest('hex');

  if (signature !== expectedSignature) {
    return res.status(403).json({ error: 'Firma HMAC inválida. Posible manipulación de datos.' });
  }

  next();
};
