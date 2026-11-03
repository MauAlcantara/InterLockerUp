-- ============================================================================
-- 008_iot_monitoring.sql
-- Integración IoT: dispositivos por locker, lecturas de sensores y alertas.
-- Ejecutar DESPUÉS de 007_rotation.sql.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS iot;

-- ----------------------------------------------------------------------------
-- Dispositivos IoT (uno por locker). El ESP32 se registra/actualiza con cada
-- envío de telemetría; `last_seen` permite detectar dispositivos fuera de
-- línea.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS iot.iot_devices (
    id SERIAL PRIMARY KEY,
    locker_id INTEGER NOT NULL UNIQUE
        REFERENCES gestion.lockers(id) ON DELETE CASCADE,
    device_id VARCHAR(50) NOT NULL UNIQUE,
    estado VARCHAR(10) NOT NULL DEFAULT 'online'
        CHECK (estado IN ('online', 'offline')),
    last_seen TIMESTAMP DEFAULT NOW(),
    battery NUMERIC(4,1),
    firmware VARCHAR(50)
);

-- ----------------------------------------------------------------------------
-- Lecturas de sensores reportadas por el dispositivo (temperatura, vibración,
-- estado de puerta, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS iot.sensor_readings (
    id SERIAL PRIMARY KEY,
    locker_id INTEGER NOT NULL
        REFERENCES gestion.lockers(id) ON DELETE CASCADE,
    device_id VARCHAR(50),
    sensor VARCHAR(30) NOT NULL,
    valor NUMERIC(8,2) NOT NULL,
    unidad VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_locker_time
    ON iot.sensor_readings (locker_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- Alertas generadas por el backend a partir de umbrales de sensores o del
-- estado de conexión del dispositivo.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS iot.iot_alerts (
    id SERIAL PRIMARY KEY,
    locker_id INTEGER NOT NULL
        REFERENCES gestion.lockers(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL,
    severidad VARCHAR(10) NOT NULL DEFAULT 'warning'
        CHECK (severidad IN ('warning', 'critical')),
    mensaje TEXT,
    resuelta BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iot_alerts_pendientes
    ON iot.iot_alerts (locker_id, resuelta);
