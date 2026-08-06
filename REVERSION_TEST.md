# Prueba de Reversión de Controles de Seguridad - InterLockerUp

Este documento describe formalmente el procedimiento de prueba de reversión para verificar la efectividad de los controles de seguridad implementados en el proyecto InterLockerUp. El objetivo es demostrar que, al desactivar temporalmente las correcciones aplicadas, los scripts de validación automatizada (`test_seguridad_DE.sh`) fallan, confirmando que los controles son los responsables directos de la protección.

## 1. Reversión del Rate Limiting (Límite de Frecuencia)

### Procedimiento
1. Localizar la aplicación de `authLimiter` en `backend/src/index.js` (o en el router de autenticación).
2. Comentar la línea que aplica el middleware:
   ```javascript
   // app.use('/api/auth', authLimiter, authRoutes);
   ```
3. Reiniciar el servidor backend.
4. Ejecutar `test_seguridad_DE.sh`.

### Observación Esperada
- El script realiza 6 intentos de login inválidos consecutivos.
- **Sin el control:** El servidor no bloquea la sexta petición. Todas las respuestas devuelven códigos HTTP normales (como `401 Unauthorized` o `400 Bad Request`), en lugar del esperado `429 Too Many Requests`.
- Esto demuestra que el middleware `express-rate-limit` es el único responsable de interceptar y rechazar la fuerza bruta.

## 2. Reversión de la Protección Anti-Replay IoT

### Procedimiento
1. Abrir `backend/src/middlewares/iotAntiReplay.js`.
2. Comentar o eliminar la lógica de validación de `timestamp`, `nonce` y `signature` dentro de la función `iotAntiReplay`.
3. Opcionalmente, hacer que el middleware simplemente ejecute `next()` sin verificar nada.
4. Reiniciar el servidor.
5. Ejecutar las secciones 3.2, 3.3 y 3.4 del script `test_seguridad_DE.sh`.

### Observación Esperada
- **Sin el control:**
  - Las peticiones con `timestamp` expirado (sección 3.2) no reciben un `403 Forbidden`.
  - Las peticiones con `signature` inválida (sección 3.3) no son rechazadas.
  - Las peticiones con `nonce` duplicado (sección 3.4) no son bloqueadas, permitiendo la reutilización del comando IoT (ataque de repetición).
- El servidor responde con códigos genéricos de éxito (`200 OK`) o errores de autenticación JWT (`401`), ignorando por completo la integridad de la señal IoT.

## 3. Conclusión Empírica

La ejecución de `test_seguridad_DE.sh` actúa como un **test de humo de seguridad**. Cuando los controles están activos, el script pasa todas las verificaciones (devolviendo `429` en fuerza bruta y `403` en anti-replay). 

Al revertir cualquiera de las dos correcciones, el script **falla inmediatamente** en las secciones correspondientes, devolviendo códigos HTTP incorrectos. Esto valida empíricamente que:
1. Los controles de seguridad no son decorativos; son funcionales y necesarios.
2. La automatización de pruebas detecta con precisión la ausencia de las defensas.
3. Cualquier intento de "relajar" la seguridad sin actualizar el script de pruebas será detectado automáticamente como una regresión crítica.

---
*Documento generado para fines de auditoría y validación técnica del Criterio DE.*
