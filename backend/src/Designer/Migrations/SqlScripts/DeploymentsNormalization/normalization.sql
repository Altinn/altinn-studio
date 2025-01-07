DO $$
DECLARE
    rec RECORD;
    entity_data JSONB;
    build_data JSONB;
    new_build_id BIGINT;
    build_type CONSTANT INTEGER := 0; -- this is a placeholder for the Deployment build type
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM designer.deployments;

    IF row_count > 0 THEN
        -- Start a transaction
        BEGIN
            -- Open a cursor to iterate over the deployments table
            FOR rec IN
                SELECT sequenceno, entity::jsonb AS entity_data
                FROM designer.deployments
            LOOP
                -- Extract data from the JSONB column
                entity_data := rec.entity_data;
                build_data := entity_data->'build';

                -- Insert data into the builds table and get the new id
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

                -- Update the internal_build_id and created_by columns in the deployments table
                UPDATE designer.deployments
                SET internal_build_id = new_build_id,
                    created_by = entity_data->>'createdBy'
                WHERE sequenceno = rec.sequenceno;
            END LOOP;

            -- Commit the transaction
            COMMIT;
        EXCEPTION
            -- Rollback the transaction in case of an error
            WHEN OTHERS THEN
                ROLLBACK;
                RAISE;
        END;
    END IF;
END $$;
