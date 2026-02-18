-- Cascades failure status through the dependency chain.
--
-- When a workflow fails or is canceled (status 4 or 5), any non-terminal workflows
-- that depend on it (directly or transitively) can never execute. This procedure
-- marks them as DependencyFailed (status 6) so they don't occupy active slots or
-- get picked up for processing.
--
-- The cascade is recursive: if A failed/was canceled and B depends on A, B gets
-- DependencyFailed. If C depends on B, C also gets DependencyFailed, and so on.
--
-- Status values: Enqueued=0, Processing=1, Requeued=2, Completed=3, Failed=4, Canceled=5, DependencyFailed=6

CREATE OR REPLACE FUNCTION cascade_dependency_failures()
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v_affected INTEGER;
BEGIN
    WITH RECURSIVE
    -- Find all workflows that have failed, been canceled, or had a dependency fail
    failed_workflows AS (
        SELECT "Id"
        FROM "Workflows"
        WHERE "Status" IN (4, 5, 6)  -- Failed, Canceled, or DependencyFailed
    ),
    -- Recursively find all non-terminal workflows that depend on a failed one
    cascade AS (
        -- Direct dependents of failed workflows
        SELECT wd."WorkflowId" AS id
        FROM "WorkflowDependency" wd
        INNER JOIN failed_workflows fw ON wd."DependsOnWorkflowId" = fw."Id"
        INNER JOIN "Workflows" w ON wd."WorkflowId" = w."Id"
        WHERE w."Status" NOT IN (3, 4, 5, 6)  -- non-terminal only

        UNION

        -- Transitive dependents
        SELECT wd."WorkflowId"
        FROM "WorkflowDependency" wd
        INNER JOIN cascade c ON wd."DependsOnWorkflowId" = c.id
        INNER JOIN "Workflows" w ON wd."WorkflowId" = w."Id"
        WHERE w."Status" NOT IN (3, 4, 5, 6)
    )
    UPDATE "Workflows"
    SET "Status" = 6,  -- DependencyFailed
        "UpdatedAt" = NOW()
    WHERE "Id" IN (SELECT id FROM cascade);

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    RETURN v_affected;
END;
$$;
