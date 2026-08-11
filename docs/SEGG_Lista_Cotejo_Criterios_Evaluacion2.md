# SEGURIDAD EN EL DESARROLLO DE APLICACIONES
## LISTA DE COTEJO Y CRITERIOS DE EVALUACIÓN
### Evaluación 2 — Auditoría de Seguridad de Software
**STRIDE · SAST · DAST · SCA · Hardening**

Cuatrimestre Mayo–Agosto 2026 · Guía para el estudiante

Esta evaluación cubre la Unidad 2 completa: modelado de amenazas STRIDE, pruebas automatizadas SAST y DAST, análisis de dependencias SCA, y configuración segura (hardening), todo aplicado sobre el caso de estudio real que tu equipo desarrolla en otra materia. Se evalúa en tres niveles progresivos y acumulativos.

---

## Estructura de la evaluación

| Nivel | Puntos | Lo que se evalúa | Prerrequisito |
|---|---|---|---|
| **SA — Satisfactorio** | 80 | Auditoría base: STRIDE + SAST + DAST + SCA aplicados al caso de estudio + Entregable E2 completo | — |
| **DE — Destacado** | 90 | SA + profundización de hallazgos (CVSS completo) + remediación con evidencia + suite de pruebas de seguridad | Cumplir 100% SA |
| **AU — Autónomo** | 100 | DE + threat modeling avanzado (árboles de ataque) + revisión por par + verificación de remediación + presentación oral | Cumplir 100% DE |

## Contexto del caso de estudio

El proyecto auditado es la aplicación que tu equipo desarrolla en otra materia.

### El nivel de la Evaluación 1 condiciona el máximo posible aquí

| Nivel Evaluación 1 | Máximo alcanzable en Evaluación 2 | Razón |
|---|---|---|
| SA | SA en Evaluación 2 máximo | Base sólida pero limitada |
| DE | DE en Evaluación 2 máximo | Experiencia suficiente para nivel medio |
| AU | AU en Evaluación 2 posible | Progresión natural de competencias |

---

# NIVEL SA — SATISFACTORIO (80 puntos)

Para alcanzar SA, aplicas STRIDE, SAST, DAST, SCA y configuración segura (hardening) sobre el proyecto real de tu equipo —cubriendo todos los temas del programa de la Unidad 2— y entregas un reporte de auditoría (E2) con estructura completa y trazabilidad básica.

## SA.1 — Dominio conceptual aplicado

| Elemento a evaluar | Cumplido |
|---|---|
| Distingue SAST, DAST, IAST y SCA: qué analiza cada uno, cuándo se usa, y por qué son complementarios | ☐ |
| Explica el mecanismo interno de SAST (taint analysis, pattern matching) y DAST (fuzzing, active scanning) | ☐ |
| Define correctamente las 6 categorías STRIDE con un ejemplo propio para cada una | ☐ |
| Explica Shift Left Security y el concepto de pipeline DevSecOps (pre-commit → CI → staging) | ☐ |
| Distingue falso positivo de falso negativo y explica por qué el segundo es más peligroso | ☐ |
| Enumera obligaciones de la LFPDPPP relevantes para un desarrollador de software | ☐ |

**Subtotal SA.1: ___ / 6 elementos**

## SA.2 — Modelado de amenazas STRIDE aplicado al caso de estudio

| Elemento a evaluar | Cumplido |
|---|---|
| DFD (Design For Deconstruction) de la arquitectura del proyecto: actores, procesos, almacenes de datos y flujos de información | ☐ |
| Límites de confianza (trust boundaries) identificados y etiquetados en el DFD | ☐ |
| Tabla STRIDE con mínimo 12 amenazas específicas del proyecto (no genéricas) (# amenazas: ___) | ☐ |
| Las 6 categorías STRIDE representadas con al menos 1 amenaza real del sistema | ☐ |
| Top 3 amenazas críticas analizadas: mecanismo de explotación y consecuencia real en el proyecto | ☐ |
| Control de mitigación propuesto para cada amenaza crítica (técnico y concreto) | ☐ |

**Subtotal SA.2: ___ / 6 elementos**

## SA.3 — SAST aplicado al caso de estudio (SonarQube + Semgrep)

| Elemento a evaluar | Cumplido |
|---|---|
| SonarQube ejecutado sobre el proyecto: reporte de análisis generado con captura incluida en E2 | ☐ |
| Hallazgos de seguridad clasificados por severidad (Critical, High, Medium, Low) (Críticos: ___) | ☐ |
| Al menos 2 hallazgos Security documentados: archivo, línea, CWE, descripción del riesgo | ☐ |
| Porcentaje de cobertura de pruebas unitarias registrado (aunque sea bajo) (Cobertura: ___%) | ☐ |
| Semgrep ejecutado con al menos p/owasp-top-ten sobre el repositorio del proyecto | ☐ |
| Resultado de Semgrep documentado: número de hallazgos por regla, archivos afectados (Hallazgos: ___) | ☐ |

**Subtotal SA.3: ___ / 6 elementos**

## SA.4 — DAST aplicado al caso de estudio (OWASP ZAP)

| Elemento a evaluar | Cumplido |
|---|---|
| OWASP ZAP baseline scan ejecutado contra el proyecto (o justificación técnica de alternativa) | ☐ |
| Reporte ZAP incluido en E2 (HTML o captura): alertas clasificadas por nivel de riesgo | ☐ |
| Al menos 1 alerta High o Medium documentada: nombre, descripción y URL/endpoint afectado | ☐ |
| Explicación del mecanismo de ataque de la alerta más crítica encontrada | ☐ |
| Al menos 1 cabecera de seguridad HTTP ausente identificada (CSP, HSTS, X-Frame-Options) (Cabecera: ___) | ☐ |

**Subtotal SA.4: ___ / 5 elementos**

## SA.5 — SCA: análisis de dependencias del caso de estudio

| Elemento a evaluar | Cumplido |
|---|---|
| Herramienta SCA ejecutada sobre el proyecto (Snyk, npm audit, dotnet list --vulnerable, o equivalente) (Herramienta: ___) | ☐ |
| Reporte generado: dependencias con vulnerabilidades conocidas (o resultado limpio documentado) (CVEs: ___) | ☐ |
| Cada dependencia vulnerable documentada: nombre, versión actual, CVE, severidad, versión corregida | ☐ |
| Al menos 1 dependencia actualizada o justificación técnica de por qué no se actualizó | ☐ |

**Subtotal SA.5: ___ / 4 elementos**

## SA.6 — Configuración segura y hardening del caso de estudio

| Elemento a evaluar | Cumplido |
|---|---|
| Cabeceras HTTP de seguridad revisadas e implementadas: CSP, HSTS, X-Frame-Options, X-Content-Type-Options (Cabeceras: ___) | ☐ |
| Gestión de secretos revisada: credenciales fuera de código, uso de variables de entorno o archivo .env (Método: ___) | ☐ |
| Logging de eventos de seguridad básico implementado (intentos fallidos de login, errores 4xx/5xx) | ☐ |
| Configuración de defaults seguros verificada: sin cuentas o credenciales por defecto, permisos mínimos **CRÍTICO** ⚠ | ☐ |
| Checklist de defensa en profundidad documentado: validación de entrada, autenticación, sesión, cifrado, logging (Capas: ___/5) | ☐ |

**Subtotal SA.6: ___ / 5 elementos**

## SA.7 — E2: Reporte de auditoría con estructura completa

| Elemento a evaluar | Cumplido |
|---|---|
| Portada, tabla de contenido y resumen ejecutivo legible por audiencia no técnica | ☐ |
| Descripción del sistema auditado: arquitectura, tecnologías y alcance de la auditoría | ☐ |
| Metodología descrita: STRIDE + SAST + DAST + SCA con justificación de uso de cada herramienta | ☐ |
| Tabla de trazabilidad básica: hallazgo → herramienta → OWASP Top 10 → CWE → severidad | ☐ |
| Aviso de privacidad LFPDPPP incluido como anexo | ☐ |
| Reporte firmado con nombre del alumno, fecha y versión | ☐ |
| Sin credenciales, tokens ni secretos expuestos en el repositorio ni en las evidencias ⚠ **CRÍTICO** | ☐ |

**Subtotal SA.7: ___ / 7 elementos**

### Decisión Nivel SA — 80 puntos

- ✅ Mínimo 5/6 elementos en SA.1 (dominio conceptual)
- ✅ Mínimo 5/6 elementos en SA.2 (STRIDE aplicado)
- ✅ Mínimo 5/6 elementos en SA.3 (SAST aplicado)
- ✅ Mínimo 4/5 elementos en SA.4 (DAST aplicado)
- ✅ Mínimo 3/4 elementos en SA.5 (SCA aplicado)
- ✅ Mínimo 4/5 elementos en SA.6 (configuración segura y hardening)
- ✅ Mínimo 6/7 elementos en SA.7 (Entregable E2 estructurado)
- ✅ DAST ejecutado únicamente contra el proyecto propio del equipo (nunca sistemas externos)
- ✅ Sin credenciales o secretos expuestos en el repositorio (requisito crítico)

---

# NIVEL DE — DESTACADO (90 puntos)

Para DE, cumples 100% de SA más actividades nuevas: profundización técnica de los hallazgos con CVSS (Common Vulnerability Scoring System) completo, remediación real con evidencia de commits, y una suite de pruebas de seguridad que valida automáticamente las correcciones aplicadas.

### Actividades para DE

- **DE.1:** CVSS v3.1 completo (vector string) para los hallazgos críticos, no solo severidad nominal.
- **DE.2:** Remediación real en código —antes/después con commit— no solo propuesta en el reporte.
- **DE.3:** Suite de pruebas de seguridad (unit tests) que validan localmente que las correcciones funcionan.

## DE.1 — Profundización técnica de hallazgos

| Elemento a evaluar | Cumplido |
|---|---|
| CVSS v3.1 completo (vector string AV/AC/PR/UI/S/C/I/A) calculado para mínimo 3 hallazgos críticos (Score: ___) | ☐ |
| Causa raíz de cada hallazgo explicada a nivel de código (no solo "es una vulnerabilidad conocida") | ☐ |
| Cadena de explotación (attack path) descrita paso a paso para el hallazgo más crítico | ☐ |
| Impacto de negocio estimado para el caso de estudio (qué pasaría si se explota en producción) | ☐ |
| Comparación de severidad SAST vs DAST vs SCA: cuál herramienta encontró el riesgo más crítico y por qué | ☐ |

**Subtotal DE.1: ___ / 5 elementos**

## DE.2 — Remediación real con evidencia

| Elemento a evaluar | Cumplido |
|---|---|
| Mínimo 3 hallazgos corregidos en código real del proyecto (no solo propuesta teórica) (Commits: ___) | ☐ |
| Cada corrección documentada con código antes/después en el reporte E2 | ☐ |
| Commits de corrección identificables en el historial de Git del proyecto (hash o link) | ☐ |
| Re-escaneo ejecutado tras la corrección, confirmando que el hallazgo ya no aparece | ☐ |
| Al menos 1 supresión de falso positivo documentada con justificación técnica (no silenciada) | ☐ |

**Subtotal DE.2: ___ / 5 elementos**

## DE.3 — Suite de pruebas de seguridad (validación local)

| Elemento a evaluar | Cumplido |
|---|---|
| Mínimo 5 pruebas unitarias (xUnit, Jest, pytest o equivalente) que validan las correcciones aplicadas (# pruebas: ___) | ☐ |
| Cada prueba corresponde a un hallazgo específico corregido (nombre de la prueba referencia el hallazgo) | ☐ |
| Incluye casos negativos: entradas maliciosas/inválidas que deben ser rechazadas (SQLi, XSS, payloads) | ☐ |
| Todas las pruebas ejecutadas localmente con evidencia del resultado (dotnet test / npm test, captura o log) (Comando: ___) | ☐ |
| Las pruebas fallan si se revierte la corrección (demostrado intencionalmente al menos una vez) | ☐ |

**Subtotal DE.3: ___ / 5 elementos**

## DE.4 — Reporte E2 ampliado

| Elemento a evaluar | Cumplido |
|---|---|
| Plan de remediación con 3 horizontes: inmediato (0-30d), mediano (30-60d), largo plazo (60-90d) | ☐ |
| Tabla de trazabilidad ampliada: incluye commit de corrección o estado "pendiente" justificado | ☐ |
| Sección de lección aprendida: qué cambiarías en el proceso de desarrollo de tu equipo | ☐ |

**Subtotal DE.4: ___ / 3 elementos**

### Decisión Nivel DE — 90 puntos

- ✅ Cumplir 100% de TODOS los requisitos SA
- ✅ Mínimo 4/5 en DE.1 (CVSS completo + causa raíz + cadena de explotación)
- ✅ Mínimo 4/5 en DE.2 (remediación real con commits verificables)
- ✅ Mínimo 4/5 en DE.3 (suite de pruebas de seguridad ejecutada localmente)
- ✅ Mínimo 2/3 en DE.4 (plan de acción y trazabilidad ampliada)
- ✅ Los commits de corrección son verificables en el historial real del proyecto

---

# NIVEL AU — AUTÓNOMO (100 puntos)

Para AU, cumples 100% de DE más actividades avanzadas: threat modeling profundo con árboles de ataque, revisión de pares sobre el reporte o las correcciones, verificación cuantitativa de remediación, y presentación oral de la auditoría.

### Actividades para AU

- **AU.1:** Árboles de ataque y casos de abuso — profundización del modelo STRIDE de SA con análisis de rutas de ataque.
- **AU.2:** Revisión por un compañero (par) que valida las correcciones o el reporte, con retroalimentación documentada.
- **AU.3:** Verificación cuantitativa: métricas antes/después de hallazgos totales por severidad.
- **AU.4:** Presentación oral de 10-15 minutos explicando metodología, hallazgos clave y remediación.

## AU.1 — Threat modeling avanzado: árboles de ataque y casos de abuso

| Elemento a evaluar | Cumplido |
|---|---|
| Árbol de ataque (attack tree) construido para la amenaza más crítica identificada en STRIDE (SA.2) (Amenaza raíz: ___) | ☐ |
| El árbol muestra mínimo 2 caminos alternativos de ataque (nodos OR) hacia el objetivo raíz | ☐ |
| Cada nodo hoja del árbol es una acción concreta y verificable (no genérica) | ☐ |
| Casos de abuso (abuse cases) documentados: mínimo 3, describiendo cómo un atacante mal-usa una funcionalidad legítima | ☐ |
| Para cada camino del árbol se propone un control que lo interrumpe (defensa específica por nodo) | ☐ |

**Subtotal AU.1: ___ / 5 elementos**

## AU.2 — Revisión por pares

| Elemento a evaluar | Cumplido |
|---|---|
| Un compañero (par) revisa el reporte E2 o las correcciones aplicadas al código (Revisor: ___) | ☐ |
| El par tiene una guía o checklist mínima para su revisión (no revisión informal) | ☐ |
| Retroalimentación del par documentada por escrito: qué encontró, qué sugirió | ☐ |
| Al menos 1 observación del par fue atendida o respondida con justificación | ☐ |
| El proceso de revisión está fechado y firmado por ambas partes | ☐ |

**Subtotal AU.2: ___ / 5 elementos**

## AU.3 — Verificación cuantitativa de remediación

| Elemento a evaluar | Cumplido |
|---|---|
| Tabla comparativa: número de hallazgos por severidad ANTES vs DESPUÉS de la remediación (Antes: ___ / Después: ___) | ☐ |
| Porcentaje de reducción de hallazgos Critical/High calculado y reportado | ☐ |
| Métricas de SonarQube (Security Rating, cobertura) comparadas antes/después | ☐ |
| Gráfica o tabla visual que resuma el progreso de la auditoría a lo largo del tiempo | ☐ |

**Subtotal AU.3: ___ / 4 elementos**

## AU.4 — Presentación oral de la auditoría (10 minutos)

| Elemento a evaluar | Cumplido |
|---|---|
| El alumno presenta metodología, hallazgos clave y plan de remediación ante el profesor | ☐ |
| Explica el hallazgo más crítico con su mecanismo de ataque sin leer del reporte | ☐ |
| Explica las decisiones de priorización: por qué corrigió primero ciertos hallazgos | ☐ |
| Muestra evidencia en vivo: dashboard SonarQube, reporte ZAP o pruebas de seguridad ejecutándose | ☐ |
| Responde preguntas del profesor sobre la auditoría sin consultar apuntes | ☐ |

**Subtotal AU.4: ___ / 5 elementos**

### Decisión Nivel AU — 100 puntos

- ✅ Cumplir 100% de TODOS los requisitos DE
- ✅ Mínimo 4/5 en AU.1 (árboles de ataque y casos de abuso construidos sobre STRIDE)
- ✅ Mínimo 4/5 en AU.2 (revisión por pares documentada)
- ✅ Mínimo 3/4 en AU.3 (verificación cuantitativa antes/después)
- ✅ Mínimo 4/5 en AU.4 (presentación oral fluida y técnica)
- ✅ El árbol de ataque conecta directamente con la amenaza crítica identificada en SA.2

---

# Requisitos críticos y penalizaciones

## Requisitos críticos — NA automático si se incumple

| Requisito crítico | Verificación | Consecuencia |
|---|---|---|
| Credencial, token o API key en el repositorio o en evidencias del reporte | `git log --all -S 'secret' -- .` | NA automático — -50 pts irrecuperable |
| DAST ejecutado contra sistemas que no son el proyecto propio del equipo | Revisar URL/IP objetivo en el reporte ZAP | NA automático — -30 pts |
| Credenciales o secretos hardcodeados en el código fuente del proyecto | Revisar código fuente y archivos de configuración | NA automático — -40 pts |
| Plagio detectado en el Entregable E2 | Herramienta antiplagio + criterio docente | NA automático — -100 pts |

## Penalizaciones aplicables (recuperables)

| Penalización | Puntos | Recuperable |
|---|---|---|
| Tabla de trazabilidad ausente en E2 (hallazgo → OWASP → CWE → acción) | -15 pts | Con actualización del reporte antes de la entrega |
| Supresiones de hallazgos SAST sin justificación documentada | -10 pts | Con comentario de justificación agregado |
| Reporte sin firmar (sin nombre, fecha o versión) | -5 pts | Con edición del documento |
| Evidencia de alguna herramienta faltante o ilegible | -5 pts c/u | Con evidencia adicional entregada |
| Contenedor Docker (si aplica DAST en contenedor) dejado corriendo al finalizar | -5 pts | Sin recuperación |

---

*Materia: Seguridad en el Desarrollo de Aplicaciones (SEGG) | Cuatrimestre Mayo–Agosto 2026 | Evaluación 2*
