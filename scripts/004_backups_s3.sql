-- ============================================================
-- 004_backups_s3.sql
-- Fase 2: almacenamiento de respaldos en S3 / DigitalOcean Spaces
-- Ejecutar en PostgreSQL: psql -f scripts/004_backups_s3.sql
-- (Requiere que 003_backups.sql ya haya sido ejecutado)
-- ============================================================

-- Donde vive el archivo del respaldo: 'local' (disco del servidor) o 's3' (bucket)
ALTER TABLE gestion.backup_jobs
    ADD COLUMN IF NOT EXISTS almacen TEXT NOT NULL DEFAULT 'local';

-- Clave del objeto dentro del bucket (solo tiene valor si almacen = 's3')
ALTER TABLE gestion.backup_jobs
    ADD COLUMN IF NOT EXISTS s3_key TEXT;

COMMENT ON COLUMN gestion.backup_jobs.almacen IS 'Ubicacion del archivo: local | s3';
COMMENT ON COLUMN gestion.backup_jobs.s3_key IS 'Clave del objeto en el bucket (solo si almacen = s3)';
