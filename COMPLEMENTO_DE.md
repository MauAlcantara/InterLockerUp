# Complemento DE - Análisis de Seguridad y Remediación

## 1. Vectores CVSS v3.1

### 1.1 Fuerza Bruta en Login
- **Vector:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`
- **Puntuación:** 7.5 (Alto)
- **Justificación:** 
  - **AV:N (Red):** El ataque se origina desde la red.
  - **AC:L (Baja):** No se requiere conocimiento especializado para ejecutarlo.
  - **PR:N (Ninguno):** No se necesitan permisos previos.
  - **UI:N (Ninguno):** No se requiere interacción del usuario.
  - **S:U (Sin Cambio):** El impacto se limita al componente afectado.
  - **C:H/I:H (Alto):** Compromiso total de confidencialidad e integridad de la cuenta.
  - **A:N (Ninguno):** No hay impacto directo en la disponibilidad del sistema.

### 1.2 Bypass de Autenticación IoT / Anti-Replay
- **Vector:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`
- **Puntuación:** 9.8 (Crítico)
- **Justificación:**
  - **AV:N (Red):** Ataque remoto.
  - **AC:L (Baja):** Reutilización de tramas capturadas es trivial.
  - **PR:N (Ninguno):** No requiere autenticación previa.
  - **UI:N (Ninguno):** Automatizable sin intervención humana.
  - **S:U (Sin Cambio):** Impacto directo en el dispositivo IoT y el locker.
  - **C:H/I:H/A:H (Alto):** Compromiso total de confidencialidad, integridad y **disponibilidad** (apertura no autorizada de lockers físicos).

---

## 2. Cadena de Explotación (IoT Anti-Replay)

**Riesgo Crítico:** Apertura de Locker por Reutilización de Tramas (Replay Attack)

1. **Reconocimiento:** El atacante identifica la API IoT (`/api/access/iot/pending`) y observa que acepta parámetros `timestamp`, `nonce` y `signature`.
2. **Intercepción:** Mediante un proxy (Burp Suite/Charles) o sniffing en red local, el atacante captura una trama legítima enviada por un ESP32 autorizado.
3. **Análisis:** El atacante descifra la estructura HMAC-SHA256 y obtiene la firma válida.
4. **Reutilización:** El atacante envía la misma trama capturada repetidamente al servidor.
5. **Ejecución:** Sin la validación de `nonce` (cache de memoria) y `timestamp` (ventana de 30s), el servidor acepta la solicitud como legítima.
6. **Impacto:** El locker se abre físicamente sin autorización, comprometiendo la seguridad física de los activos almacenados.

---

## 3. Comparación de Severidad y Alcance: SAST vs DAST vs SCA

| Herramienta | Tipo | Alcance en InterLockerUp | Severidad Detectada | Limitaciones |
|-------------|------|--------------------------|---------------------|--------------|
| **SAST** (SonarQube/ESLint) | Estática | Revisa código fuente en busca de patrones inseguros (ej. concatenación SQL, regex restrictivos). | Media-Alta (Falsos positivos en caracteres especiales). | No detecta vulnerabilidades en tiempo de ejecución ni dependencias de terceros. |
| **DAST** (OWASP ZAP/Burp) | Dinámica | Prueba la aplicación en ejecución. Detecta falta de Rate Limiting y fallos en Anti-Replay si no están implementados. | Alta (Valida exploits reales como el Replay IoT). | Requiere entorno desplegado; puede ser lento y generar ruido. |
| **SCA** (Snyk/Dependabot) | Composición | Analiza `package.json` y `node_modules` buscando librerías con CVEs conocidos. | Baja-Media (Dependencias actualizadas en el proyecto). | No analiza la lógica de negocio ni la configuración del middleware. |

**Conclusión:** La combinación de las tres es necesaria. SAST previene errores de código, DAST valida la efectividad de los controles en producción y SCA asegura la integridad de las dependencias.

---

## 4. Plan de Remediación

### 🟢 Inmediato (0-30 días)
- **Refuerzo de Rate Limiting:** Ajustar `express-rate-limit` para aplicar también a endpoints de IoT (`/api/access/iot/*`) y reducir el window a 5 minutos.
- **Hardening de Nonce:** Migrar el `Map` de memoria a Redis o base de datos para soportar escalabilidad horizontal y persistencia.
- **Logging de Alertas:** Implementar `winston` para registrar intentos de replay y fuerza bruta en un sistema centralizado (ELK/Splunk).

### 🟡 Mediano Plazo (30-60 días)
- **MFA para IoT:** Exigir autenticación mutua (mTLS) entre el ESP32 y el servidor para eliminar la dependencia exclusiva del HMAC.
- **Rotación de Claves:** Implementar rotación automática de `IOT_SECRET_KEY` sin downtime (doble firma temporal).
- **WAF (Web Application Firewall):** Desplegar Cloudflare o AWS WAF para bloquear patrones de ataque conocidos a nivel de red.

### 🔴 Largo Plazo (60-90 días)
- **Arquitectura Zero Trust:** Validar cada petición IoT con un token de corta vida emitido por un servicio de identidad centralizado.
- **Auditoría Continua:** Integrar pipelines de seguridad (DevSecOps) que ejecuten SAST/DAST/SCA en cada PR automáticamente.
- **Respuesta a Incidentes:** Documentar y automatizar playbooks de contención ante detección de replay o brute force masivo.

---

## 5. Lecciones Aprendidas: Secure by Design

1. **La validación de entrada no es suficiente:** Permitir caracteres especiales legítimos requiere confiar en las defensas en profundidad (parametrización, escape), no solo en regex restrictivas.
2. **Los controles de seguridad deben ser verificables:** La implementación de Rate Limiting y Anti-Replay sin pruebas automatizadas de reversión (`REVERSION_TEST.md`) deja la seguridad como una "caja negra".
3. **La seguridad es un proceso, no un estado:** Las vulnerabilidades como el Replay Attack demuestran que un control implementado puede volverse obsoleto si no se monitorea y actualiza constantemente.
4. **El principio de menor privilegio aplica a la IoT:** Los dispositivos deben enviar solo los datos necesarios y validar su integridad en cada interacción, nunca asumir confianza por conexión previa.
5. **Documentar los falsos positivos:** Un registro técnico claro evita que futuras auditorías o desarrolladores "rompan" defensas por malentendidos de seguridad.
