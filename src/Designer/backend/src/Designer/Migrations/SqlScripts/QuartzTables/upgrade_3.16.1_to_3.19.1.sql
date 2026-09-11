ALTER TABLE qrtz_triggers
    ADD COLUMN misfire_orig_fire_time BIGINT NULL,
    ADD COLUMN execution_group VARCHAR(200) NULL,
    ADD COLUMN preferred_node VARCHAR(200) NULL,
    ADD COLUMN preferred_node_auto BOOL NOT NULL DEFAULT FALSE;

ALTER TABLE qrtz_fired_triggers
    ADD COLUMN execution_group VARCHAR(200) NULL;
