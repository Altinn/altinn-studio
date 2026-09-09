ALTER TABLE qrtz_fired_triggers
    DROP COLUMN execution_group;

ALTER TABLE qrtz_triggers
    DROP COLUMN preferred_node_auto,
    DROP COLUMN preferred_node,
    DROP COLUMN execution_group,
    DROP COLUMN misfire_orig_fire_time;
