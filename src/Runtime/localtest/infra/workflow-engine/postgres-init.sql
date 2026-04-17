-- PostgreSQL init for local development (applied on first init)
-- Source: workflow-engine/.docker/postgres-init.sql

-- Create application databases
CREATE DATABASE workflow_engine;

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

-- IO (SSD optimized)
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET maintenance_io_concurrency = 200;
ALTER SYSTEM SET random_page_cost = 1.1;

-- Compression
ALTER SYSTEM SET default_toast_compression = 'lz4';

-- Autovacuum
ALTER SYSTEM SET autovacuum_vacuum_cost_limit = 2400;

-- TCP keepalive
ALTER SYSTEM SET tcp_keepalives_idle = 120;
ALTER SYSTEM SET tcp_keepalives_interval = 30;
ALTER SYSTEM SET tcp_keepalives_count = 3;

-- Monitoring (requires shared_preload_libraries=pg_stat_statements via container command)
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.track_planning = 'on';

-- Logging
ALTER SYSTEM SET log_min_duration_statement = 500;
ALTER SYSTEM SET log_statement = 'ddl';
ALTER SYSTEM SET log_checkpoints = 'on';
ALTER SYSTEM SET log_lock_waits = 'on';
ALTER SYSTEM SET log_autovacuum_min_duration = 0;

SELECT pg_reload_conf();
