-- PostgreSQL tuning for the workflow engine.
-- Applied via docker-entrypoint-initdb.d on first container init.
-- Also serves as a reference for production (managed DB) configuration.
--
-- Uses ALTER SYSTEM SET so settings persist in postgresql.auto.conf
-- and survive container restarts. Takes effect after pg_reload_conf()
-- at the bottom (except shared_preload_libraries, which requires a
-- server restart and is passed as a command-line arg in docker-compose).
--
-- To re-trigger after changes: docker compose down -v && docker compose up -d

-- Memory
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '768MB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';

-- WAL
ALTER SYSTEM SET wal_compression = 'lz4';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET min_wal_size = '256MB';
ALTER SYSTEM SET max_wal_size = '1GB';

-- Checkpoints
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET checkpoint_timeout = '15min';

-- IO / SSD
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET maintenance_io_concurrency = 200;
ALTER SYSTEM SET random_page_cost = 1.1;

-- Compression
ALTER SYSTEM SET default_toast_compression = 'lz4';

-- Autovacuum (aggressive — appropriate for high-churn workflow tables)
ALTER SYSTEM SET autovacuum_vacuum_cost_limit = 2400;

-- TCP keepalive
ALTER SYSTEM SET tcp_keepalives_idle = 120;
ALTER SYSTEM SET tcp_keepalives_interval = 30;
ALTER SYSTEM SET tcp_keepalives_count = 3;

-- Monitoring: pg_stat_statements
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.track_planning = on;

-- Slow query log (500ms threshold)
ALTER SYSTEM SET log_min_duration_statement = 500;

-- Logging: DDL, checkpoints, lock waits, autovacuum
ALTER SYSTEM SET log_statement = 'ddl';
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET log_autovacuum_min_duration = 0;

-- Apply changes immediately (for settings that don't require restart)
SELECT pg_reload_conf();
