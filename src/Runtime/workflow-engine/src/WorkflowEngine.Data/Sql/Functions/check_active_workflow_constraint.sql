-- Enforces the SingleActive concurrency constraint for a given (instance, type) scope.
--
-- Invariant: at most 2 non-terminal workflows may exist for a given (instance, type):
--   one Processing + one Pending (Enqueued/Requeued) connected to it via dependency chain.
--
-- Returns 0 rows if the new workflow is allowed, or 1 row describing the violation.
--
-- Status values: Enqueued=0, Processing=1, Requeued=2, Completed=3, Failed=4, Canceled=5, DependencyFailed=6

CREATE OR REPLACE FUNCTION check_active_workflow_constraint(
    p_new_workflow_id  BIGINT,
    p_workflow_type    INTEGER,
    p_instance_guid    UUID
) RETURNS TABLE(rejection_reason TEXT, blocking_workflow_id BIGINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_active_count INTEGER;
    v_processing_id BIGINT;
    v_pending_id BIGINT;
    v_is_connected BOOLEAN;
BEGIN
    -- Count non-terminal workflows of this type for this instance, excluding the new one
    SELECT COUNT(*) INTO v_active_count
    FROM "Workflows"
    WHERE "InstanceGuid" = p_instance_guid
      AND "Type" = p_workflow_type
      AND "Status" NOT IN (3, 4, 5, 6)
      AND "Id" != p_new_workflow_id;

    -- No active workflows → ALLOW unconditionally
    IF v_active_count = 0 THEN
        RETURN;
    END IF;

    -- 2+ active workflows already exist → slot full, REJECT
    IF v_active_count > 1 THEN
        SELECT "Id" INTO blocking_workflow_id
        FROM "Workflows"
        WHERE "InstanceGuid" = p_instance_guid
          AND "Type" = p_workflow_type
          AND "Status" NOT IN (3, 4, 5, 6)
          AND "Id" != p_new_workflow_id
        LIMIT 1;

        rejection_reason := 'slot_full';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Exactly 1 active workflow exists. Check if it's Pending or Processing.

    -- If the sole active workflow is Pending (Enqueued/Requeued) → REJECT
    -- Can't add another while one is queued but not yet processing
    SELECT "Id" INTO v_pending_id
    FROM "Workflows"
    WHERE "InstanceGuid" = p_instance_guid
      AND "Type" = p_workflow_type
      AND "Status" IN (0, 2)
      AND "Id" != p_new_workflow_id
    LIMIT 1;

    IF v_pending_id IS NOT NULL THEN
        rejection_reason := 'pending_exists';
        blocking_workflow_id := v_pending_id;
        RETURN NEXT;
        RETURN;
    END IF;

    -- The sole active workflow must be Processing — find it
    SELECT "Id" INTO v_processing_id
    FROM "Workflows"
    WHERE "InstanceGuid" = p_instance_guid
      AND "Type" = p_workflow_type
      AND "Status" = 1
      AND "Id" != p_new_workflow_id
    LIMIT 1;

    -- New workflow must connect to the processing one via its dependency chain
    WITH RECURSIVE dep_chain AS (
        SELECT "DependsOnWorkflowId" AS id
        FROM "WorkflowDependency"
        WHERE "WorkflowId" = p_new_workflow_id
        UNION
        SELECT wd."DependsOnWorkflowId"
        FROM "WorkflowDependency" wd
        INNER JOIN dep_chain dc ON wd."WorkflowId" = dc.id
    )
    SELECT EXISTS(
        SELECT 1 FROM dep_chain WHERE id = v_processing_id
    ) INTO v_is_connected;

    IF NOT v_is_connected THEN
        rejection_reason := 'disconnected';
        blocking_workflow_id := v_processing_id;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Connected to the processing workflow → ALLOW (fills the pending slot)
    RETURN;
END;
$$;
