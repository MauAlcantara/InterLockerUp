# 2.1 Establecimiento del Indicador RPO (Recovery Point Objective)

**RPO Definido:** `24 horas`

**Justificación basada en el modelo de negocio y transaccionalidad:**
En InterLockerUp, las transacciones críticas del sistema son la asignación de casilleros (`gestion.assignments`) y la generación de tokens de acceso (`iot.qr_tokens`, `iot.pin_tokens`). A diferencia de plataformas de comercio electrónico o banca en línea, donde cada segundo de latencia o pérdida de datos implica fallos financieros directos o abandono de carrito, la operatividad de InterLockerUp es de naturaleza administrativa y de acceso físico. Las asignaciones de casilleros se realizan en ventanas controladas (inicio de semestre, solicitudes puntuales o renovaciones) y no requieren procesamiento de alta frecuencia (*high-throughput*). 

Por lo tanto, se establece un **RPO de 24 horas** como el margen máximo tolerable de pérdida de datos. Esta ventana es técnicamente viable y operativamente segura porque:
1. **Recuperabilidad Administrativa:** En caso de pérdida de registros de asignación, el personal administrativo puede reasignar manualmente los casilleros utilizando registros físicos, correos de confirmación o logs de auditoría externos, sin generar penalizaciones económicas ni afectar la continuidad del servicio de acceso.
2. **Impacto en el Usuario Final:** Un estudiante que pierda temporalmente el registro de su asignación no ve comprometida su seguridad física ni su acceso inmediato al campus, ya que los tokens de acceso (QR/PIN) se regeneran bajo supervisión o mediante procesos de respaldo manual.
3. **Optimización de Recursos:** Mantener un RPO menor (ej. 5 minutos) requeriría una sobrecarga innecesaria en el servidor de producción (mayor frecuencia de *checkpoints* y escritura en WAL), incrementando el I/O y el costo operativo sin aportar un beneficio tangible proporcional al modelo de negocio.

**Interacción técnica entre Respaldo Base y Archivos WAL:**
El cumplimiento del RPO de 24 horas se garantiza mediante la arquitectura de recuperación continua de PostgreSQL, que combina un **respaldo base** (captura consistente del estado de la base de datos en un punto fijo, generado mediante `pg_basebackup` o `pg_dump`) con los **archivos de registro WAL** (*Write-Ahead Logging*). 

Técnicamente, PostgreSQL escribe todas las modificaciones de datos (DML/DDL) en los archivos WAL antes de confirmarlas en los archivos de datos principales (propiedad D de ACID). Cuando se realiza un respaldo base, se genera un punto de control (*checkpoint*) que marca el estado consistente inicial. Los archivos WAL subsiguientes registran cronológicamente cada transacción posterior. Ante un desastre (ej. corrupción de datos, fallo de hardware o borrado accidental), el motor de recuperación de PostgreSQL aplica los archivos WAL acumulados desde el último respaldo base hasta el instante del fallo (o hasta un `recovery_target_time` específico). 

Esta interacción permite que, aunque el respaldo base sea antiguo (ej. hace 24 horas), los WAL actúan como un "historial de transacciones inmutable" que reconstruye el estado exacto de la base de datos, reduciendo efectivamente la ventana de pérdida de datos y asegurando que la recuperación sea puntual, íntegra y alineada con el RPO definido.
