CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_gin_subscription_consumer ON events.subscription USING gin (consumer gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_subscription_subject_source_type ON events.subscription(subjectfilter, sourcefilter, typefilter)