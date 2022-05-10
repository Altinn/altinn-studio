CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_gin_events_source ON events.events USING gin (source gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_events_time ON events.events USING btree ("time" ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_events_subject ON events.events USING btree (subject ASC NULLS LAST);
