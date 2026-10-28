-- 002_user_sessions.sql
-- Tabla de sesión activa por usuario (para forzar sesión única en administradores).
-- Cada login nuevo reemplaza la sesión previa: el token anterior queda invalidado.

CREATE TABLE IF NOT EXISTS gestion.user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES gestion.users(id) ON DELETE CASCADE,
    token_jti UUID NOT NULL,
    device_fingerprint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON gestion.user_sessions(user_id);
