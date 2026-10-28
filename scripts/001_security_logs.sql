CREATE TABLE IF NOT EXISTS iot.security_logs (
    id SERIAL PRIMARY KEY,
    user_id integer NOT NULL REFERENCES gestion.users(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    hora smallint,
    dia_semana smallint,
    fecha date,
    peticiones_recientes integer,
    score_neurona numeric,
    es_sospechoso boolean,
    accion varchar(50),
    resultado varchar(20)
);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_time
    ON iot.security_logs (user_id, created_at);
