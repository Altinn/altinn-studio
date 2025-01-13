DO $$
DECLARE
    rec RECORD;
    entity_data JSONB;
    build_data JSONB;
    new_build_id BIGINT;
    build_type CONSTANT INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT sequenceno, entity::jsonb AS entity_data
        FROM designer.deployments
    LOOP
        entity_data := rec.entity_data;
        build_data := entity_data->'build';

        BEGIN -- Inner block for exception handling only
            INSERT INTO designer.builds (external_id, status, result, build_type, started, finished)
            VALUES (
                build_data->>'id',
                build_data->>'status',
                build_data->>'result',
                build_type,
                NULLIF(build_data->>'started', 'null')::TIMESTAMPTZ,
                NULLIF(build_data->>'finished', 'null')::TIMESTAMPTZ
            )
            RETURNING id INTO new_build_id;

            UPDATE designer.deployments
            SET internal_build_id = new_build_id,
                created_by = entity_data->>'createdBy',
                envname = entity_data->>'envName'
            WHERE sequenceno = rec.sequenceno;

        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error processing deployment sequenceno %: %', rec.sequenceno, SQLERRM;
        END;
    END LOOP;
END $$;
