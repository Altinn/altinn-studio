using System.Diagnostics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

// NpgsqlDbType.Array is designed to be bitwise-OR'd with element types (e.g. Array | Text),
// but the enum is not marked [Flags], causing a false positive from SonarAnalyzer.
#pragma warning disable S3265 // Non-flags enums should not be used in bitwise operations

namespace WorkflowEngine.Data.Repository;

internal sealed partial class EngineRepository
{
    /// <inheritdoc/>
    public async Task UpdateWorkflow(
        Workflow workflow,
        bool updateTimestamp = true,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.UpdateWorkflow");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.UpdatingWorkflow(workflow);
            workflow.UpdatedAt = updateTimestamp ? timeProvider.GetUtcNow() : workflow.UpdatedAt;

            await ExecuteWithRetry(
                async ct =>
                {
                    await using var context = await dbContextFactory.CreateDbContextAsync(ct);
                    await context
                        .Workflows.Where(t => t.Id == workflow.DatabaseId)
                        .ExecuteUpdateAsync(
                            setters =>
                                setters
                                    .SetProperty(t => t.Status, workflow.Status)
                                    .SetProperty(t => t.UpdatedAt, workflow.UpdatedAt)
                                    .SetProperty(t => t.EngineTraceId, workflow.EngineTraceContext),
                            ct
                        );
                },
                cancellationToken
            );

            logger.SuccessfullyUpdatedWorkflow(workflow);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToUpdateWorkflow(workflow.OperationId, workflow.DatabaseId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task UpdateStep(Step step, bool updateTimestamp = true, CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.UpdateStep");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.UpdatingStep(step);
            step.UpdatedAt = updateTimestamp ? timeProvider.GetUtcNow() : step.UpdatedAt;

            await ExecuteWithRetry(
                async ct =>
                {
                    await using var context = await dbContextFactory.CreateDbContextAsync(ct);
                    await context
                        .Steps.Where(t => t.Id == step.DatabaseId)
                        .ExecuteUpdateAsync(
                            setters =>
                                setters
                                    .SetProperty(t => t.Status, step.Status)
                                    .SetProperty(t => t.BackoffUntil, step.BackoffUntil)
                                    .SetProperty(t => t.RequeueCount, step.RequeueCount)
                                    .SetProperty(t => t.UpdatedAt, step.UpdatedAt),
                            ct
                        );
                },
                cancellationToken
            );

            logger.SuccessfullyUpdatedStep(step);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToUpdateStep(step.OperationId, step.DatabaseId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<BatchEnqueueResult[]> BatchEnqueueWorkflowsAsync(
        IReadOnlyList<BufferedEnqueueRequest> requests,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.BatchEnqueueWorkflowsAsync");

        var results = new BatchEnqueueResult[requests.Count];

        // ── Pre-generate workflow IDs for all requests up-front ───────────
        var perRequestWorkflowIds = new Guid[requests.Count][];
        for (int i = 0; i < requests.Count; i++)
        {
            var count = requests[i].Request.Workflows.Count;
            var ids = new Guid[count];
            for (int j = 0; j < count; j++)
                ids[j] = Guid.CreateVersion7();
            perRequestWorkflowIds[i] = ids;
        }

        // Build arrays for the idempotency INSERT
        var idempKeys = new string[requests.Count];
        var idempOrgs = new string[requests.Count];
        var idempApps = new string[requests.Count];
        var idempOwnerPartyIds = new int[requests.Count];
        var idempInstanceGuids = new Guid[requests.Count];
        var idempHashes = new byte[requests.Count][];
        var idempWfIdTexts = new string[requests.Count];

        for (int i = 0; i < requests.Count; i++)
        {
            var req = requests[i];
            idempKeys[i] = req.Request.IdempotencyKey;
            idempOrgs[i] = req.Metadata.InstanceInformation.Org;
            idempApps[i] = req.Metadata.InstanceInformation.App;
            idempOwnerPartyIds[i] = req.Metadata.InstanceInformation.InstanceOwnerPartyId;
            idempInstanceGuids[i] = req.Metadata.InstanceInformation.InstanceGuid;
            idempHashes[i] = req.RequestBodyHash;
            idempWfIdTexts[i] = "{" + string.Join(",", perRequestWorkflowIds[i]) + "}";
        }

        var now = timeProvider.GetUtcNow();

        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        try
        {
            // ── Phase 1: Batch idempotency check+insert ──────────────────
            const string insertIdempSql = """
                WITH input AS (
                    SELECT * FROM unnest(@keys, @orgs, @apps, @ownerPartyIds, @instanceGuids, @hashes, @wfIdTexts)
                        WITH ORDINALITY
                        AS t(idempotency_key, instance_org, instance_app, instance_owner_party_id, instance_guid, request_body_hash, wf_id_text, idx)
                ),
                inserted AS (
                    INSERT INTO idempotency_keys (idempotency_key, instance_org, instance_app, instance_owner_party_id, instance_guid, request_body_hash, workflow_ids, created_at)
                    SELECT idempotency_key, instance_org, instance_app, instance_owner_party_id::int, instance_guid, request_body_hash, wf_id_text::uuid[], @now
                    FROM input
                    ON CONFLICT (idempotency_key, instance_org, instance_app, instance_owner_party_id, instance_guid) DO NOTHING
                    RETURNING idempotency_key, instance_org, instance_app, instance_owner_party_id, instance_guid
                )
                SELECT (i.idx - 1)::int AS idx
                FROM inserted ins
                JOIN input i USING (idempotency_key, instance_org, instance_app, instance_owner_party_id, instance_guid)
                """;

            var insertedIndices = new HashSet<int>();
            await using (var cmd = new NpgsqlCommand(insertIdempSql, conn, tx))
            {
                cmd.Parameters.Add(new NpgsqlParameter<string[]>("keys", idempKeys));
                cmd.Parameters.Add(new NpgsqlParameter<string[]>("orgs", idempOrgs));
                cmd.Parameters.Add(new NpgsqlParameter<string[]>("apps", idempApps));
                cmd.Parameters.Add(new NpgsqlParameter<int[]>("ownerPartyIds", idempOwnerPartyIds));
                cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("instanceGuids", idempInstanceGuids));
                cmd.Parameters.Add(new NpgsqlParameter<byte[][]>("hashes", idempHashes));
                cmd.Parameters.Add(new NpgsqlParameter<string[]>("wfIdTexts", idempWfIdTexts));
                cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));

                await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                    insertedIndices.Add(reader.GetInt32(0));
            }

            var newRequestIndices = new List<int>(requests.Count);
            var existingRequestIndices = new List<int>();

            for (int i = 0; i < requests.Count; i++)
            {
                if (insertedIndices.Contains(i))
                    newRequestIndices.Add(i);
                else
                    existingRequestIndices.Add(i);
            }

            // For existing keys, fetch stored hash + workflow_ids to classify Duplicate vs Conflict
            if (existingRequestIndices.Count > 0)
            {
                var existKeys = existingRequestIndices.Select(i => idempKeys[i]).ToArray();
                var existOrgs = existingRequestIndices.Select(i => idempOrgs[i]).ToArray();
                var existApps = existingRequestIndices.Select(i => idempApps[i]).ToArray();
                var existOwnerIds = existingRequestIndices.Select(i => idempOwnerPartyIds[i]).ToArray();
                var existInstGuids = existingRequestIndices.Select(i => idempInstanceGuids[i]).ToArray();

                const string selectExistingSql = """
                    SELECT ik.idempotency_key, ik.instance_org, ik.instance_app,
                           ik.instance_owner_party_id, ik.instance_guid,
                           ik.request_body_hash, ik.workflow_ids
                    FROM unnest(@keys, @orgs, @apps, @ownerPartyIds, @instanceGuids)
                        AS t(idempotency_key, instance_org, instance_app, instance_owner_party_id, instance_guid)
                    JOIN idempotency_keys ik USING (idempotency_key, instance_org, instance_app, instance_owner_party_id, instance_guid)
                    """;

                var existingLookup =
                    new Dictionary<(string, string, string, int, Guid), (byte[] hash, Guid[] workflowIds)>();
                await using (var cmd = new NpgsqlCommand(selectExistingSql, conn, tx))
                {
                    cmd.Parameters.Add(new NpgsqlParameter<string[]>("keys", existKeys));
                    cmd.Parameters.Add(new NpgsqlParameter<string[]>("orgs", existOrgs));
                    cmd.Parameters.Add(new NpgsqlParameter<string[]>("apps", existApps));
                    cmd.Parameters.Add(new NpgsqlParameter<int[]>("ownerPartyIds", existOwnerIds));
                    cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("instanceGuids", existInstGuids));

                    await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
                    while (await reader.ReadAsync(cancellationToken))
                    {
                        var key = (
                            reader.GetString(0),
                            reader.GetString(1),
                            reader.GetString(2),
                            reader.GetInt32(3),
                            reader.GetGuid(4)
                        );
                        var hash = (byte[])reader.GetValue(5);
                        var wfIds = (Guid[])reader.GetValue(6);
                        existingLookup[key] = (hash, wfIds);
                    }
                }

                foreach (var i in existingRequestIndices)
                {
                    var req = requests[i];
                    var info = req.Metadata.InstanceInformation;
                    var compositeKey = (
                        req.Request.IdempotencyKey,
                        info.Org,
                        info.App,
                        info.InstanceOwnerPartyId,
                        info.InstanceGuid
                    );
                    if (existingLookup.TryGetValue(compositeKey, out var existing))
                    {
                        if (existing.hash.AsSpan().SequenceEqual(req.RequestBodyHash))
                            results[i] = BatchEnqueueResult.Duplicate(existing.workflowIds);
                        else
                            results[i] = BatchEnqueueResult.Conflicted();
                    }
                    else
                    {
                        throw new UnreachableException(
                            "Idempotency key was not inserted but also not found in existing lookup"
                        );
                    }
                }
            }

            // ── Phase 1b: Validate external workflow references ──────────
            if (newRequestIndices.Count > 0)
            {
                var externalRefPairs = new HashSet<(Guid id, Guid instanceGuid)>();
                foreach (var reqIdx in newRequestIndices)
                {
                    var req = requests[reqIdx];
                    var instanceGuid = req.Metadata.InstanceInformation.InstanceGuid;
                    foreach (var wf in req.Request.Workflows)
                    {
                        CollectExternalIds(wf.DependsOn, instanceGuid, externalRefPairs);
                        CollectExternalIds(wf.Links, instanceGuid, externalRefPairs);
                    }
                }

                HashSet<(Guid, Guid)>? verifiedPairs = null;
                if (externalRefPairs.Count > 0)
                {
                    var extIds = externalRefPairs.Select(p => p.id).Distinct().ToArray();
                    var extInstanceGuids = externalRefPairs.Select(p => p.instanceGuid).Distinct().ToArray();

                    const string verifyRefsSql = """
                        SELECT "Id", "InstanceGuid"
                        FROM "Workflows"
                        WHERE "Id" = ANY(@ids) AND "InstanceGuid" = ANY(@instanceGuids)
                        """;

                    verifiedPairs = [];
                    await using (var cmd = new NpgsqlCommand(verifyRefsSql, conn, tx))
                    {
                        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", extIds));
                        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("instanceGuids", extInstanceGuids));

                        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
                        while (await reader.ReadAsync(cancellationToken))
                            verifiedPairs.Add((reader.GetGuid(0), reader.GetGuid(1)));
                    }

                    // Remove requests with invalid external refs
                    var invalidReqIndices = new List<int>();
                    for (int idx = newRequestIndices.Count - 1; idx >= 0; idx--)
                    {
                        var reqIdx = newRequestIndices[idx];
                        var req = requests[reqIdx];
                        var missingRef = FindMissingExternalRef(req, verifiedPairs);
                        if (missingRef is not null)
                        {
                            results[reqIdx] = BatchEnqueueResult.InvalidRef(
                                $"Referenced workflow {missingRef.Value} does not exist for this instance."
                            );
                            invalidReqIndices.Add(reqIdx);
                            newRequestIndices.RemoveAt(idx);
                        }
                    }

                    // Roll back idempotency keys for invalid requests
                    if (invalidReqIndices.Count > 0)
                    {
                        var delKeys = invalidReqIndices.Select(i => idempKeys[i]).ToArray();
                        var delOrgs = invalidReqIndices.Select(i => idempOrgs[i]).ToArray();
                        var delApps = invalidReqIndices.Select(i => idempApps[i]).ToArray();
                        var delOwnerIds = invalidReqIndices.Select(i => idempOwnerPartyIds[i]).ToArray();
                        var delInstGuids = invalidReqIndices.Select(i => idempInstanceGuids[i]).ToArray();

                        const string deleteIdempSql = """
                            DELETE FROM idempotency_keys ik
                            USING unnest(@keys, @orgs, @apps, @ownerPartyIds, @instanceGuids)
                                AS t(idempotency_key, instance_org, instance_app, instance_owner_party_id, instance_guid)
                            WHERE ik.idempotency_key = t.idempotency_key
                              AND ik.instance_org = t.instance_org
                              AND ik.instance_app = t.instance_app
                              AND ik.instance_owner_party_id = t.instance_owner_party_id::int
                              AND ik.instance_guid = t.instance_guid
                            """;

                        await using var cmd = new NpgsqlCommand(deleteIdempSql, conn, tx);
                        cmd.Parameters.Add(new NpgsqlParameter<string[]>("keys", delKeys));
                        cmd.Parameters.Add(new NpgsqlParameter<string[]>("orgs", delOrgs));
                        cmd.Parameters.Add(new NpgsqlParameter<string[]>("apps", delApps));
                        cmd.Parameters.Add(new NpgsqlParameter<int[]>("ownerPartyIds", delOwnerIds));
                        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("instanceGuids", delInstGuids));
                        await cmd.ExecuteNonQueryAsync(cancellationToken);
                    }
                }
            }

            // ── Phase 2: COPY workflows and steps for new requests ───────
            if (newRequestIndices.Count > 0)
            {
                int totalNewWorkflows = 0;
                int totalNewSteps = 0;
                foreach (var i in newRequestIndices)
                {
                    var req = requests[i];
                    totalNewWorkflows += req.Request.Workflows.Count;
                    foreach (var wf in req.Request.Workflows)
                        totalNewSteps += wf.Steps.Count();
                }

                // Flatten workflow IDs
                var workflowIds = new Guid[totalNewWorkflows];
                int workflowOffset = 0;
                foreach (var reqIdx in newRequestIndices)
                {
                    var ids = perRequestWorkflowIds[reqIdx];
                    Array.Copy(ids, 0, workflowIds, workflowOffset, ids.Length);
                    workflowOffset += ids.Length;
                }

                var stepIds = new Guid[totalNewSteps];
                for (int i = 0; i < totalNewSteps; i++)
                    stepIds[i] = Guid.CreateVersion7();

                // Build flattened step list (serialization happens outside COPY)
                var stepEntries = new List<(
                    int workflowIndex,
                    string operationId,
                    string idempotencyKey,
                    int order,
                    string actorUserId,
                    string? actorLanguage,
                    string commandJson,
                    string? retryJson,
                    string? metadata
                )>(totalNewSteps);

                workflowOffset = 0;
                foreach (var reqIdx in newRequestIndices)
                {
                    var req = requests[reqIdx];
                    foreach (var wf in req.Request.Workflows)
                    {
                        int order = 0;
                        foreach (var step in wf.Steps)
                        {
                            stepEntries.Add(
                                (
                                    workflowOffset,
                                    step.Command.OperationId,
                                    $"{req.Request.IdempotencyKey}/{step.Command}",
                                    order++,
                                    req.Request.Actor.UserIdOrOrgNumber,
                                    req.Request.Actor.Language,
                                    JsonSerializer.Serialize(step.Command, JsonOptions.Default),
                                    step.RetryStrategy != null
                                        ? JsonSerializer.Serialize(step.RetryStrategy, JsonOptions.Default)
                                        : null,
                                    step.Metadata
                                )
                            );
                        }
                        workflowOffset++;
                    }
                }

                // -- COPY workflows (with engine-specific columns) --
                await using (
                    var writer = await conn.BeginBinaryImportAsync(
                        """
                        COPY "Workflows" (
                            "Id", "OperationId", "IdempotencyKey", "InstanceLockKey", "Status", "CreatedAt", "StartAt",
                            "ActorUserIdOrOrgNumber", "ActorLanguage",
                            "InstanceOrg", "InstanceApp", "InstanceOwnerPartyId", "InstanceGuid",
                            "TraceContext", "MetadataJson", "EngineTraceId", "InitialState"
                        ) FROM STDIN (FORMAT BINARY)
                        """,
                        cancellationToken
                    )
                )
                {
                    workflowOffset = 0;
                    foreach (var reqIdx in newRequestIndices)
                    {
                        var req = requests[reqIdx];
                        var info = req.Metadata.InstanceInformation;

                        foreach (var wf in req.Request.Workflows)
                        {
                            await writer.StartRowAsync(cancellationToken);
                            await writer.WriteAsync(workflowIds[workflowOffset], NpgsqlDbType.Uuid, cancellationToken); // Id
                            await writer.WriteAsync(wf.OperationId, NpgsqlDbType.Varchar, cancellationToken); // OperationId
                            await writer.WriteAsync(req.Request.IdempotencyKey, NpgsqlDbType.Text, cancellationToken); // IdempotencyKey

                            if (req.Request.LockToken != null) // InstanceLockKey
                                await writer.WriteAsync(req.Request.LockToken, NpgsqlDbType.Varchar, cancellationToken);
                            else
                                await writer.WriteNullAsync(cancellationToken);

                            await writer.WriteAsync(
                                (int)PersistentItemStatus.Enqueued,
                                NpgsqlDbType.Integer,
                                cancellationToken
                            ); // Status (integer enum)
                            await writer.WriteAsync(now, NpgsqlDbType.TimestampTz, cancellationToken); // CreatedAt

                            if (wf.StartAt.HasValue) // StartAt
                                await writer.WriteAsync(wf.StartAt.Value, NpgsqlDbType.TimestampTz, cancellationToken);
                            else
                                await writer.WriteNullAsync(cancellationToken);

                            await writer.WriteAsync(
                                req.Request.Actor.UserIdOrOrgNumber,
                                NpgsqlDbType.Varchar,
                                cancellationToken
                            ); // ActorUserIdOrOrgNumber

                            if (req.Request.Actor.Language != null) // ActorLanguage
                                await writer.WriteAsync(
                                    req.Request.Actor.Language,
                                    NpgsqlDbType.Varchar,
                                    cancellationToken
                                );
                            else
                                await writer.WriteNullAsync(cancellationToken);

                            await writer.WriteAsync(info.Org, NpgsqlDbType.Varchar, cancellationToken); // InstanceOrg
                            await writer.WriteAsync(info.App, NpgsqlDbType.Varchar, cancellationToken); // InstanceApp
                            await writer.WriteAsync(info.InstanceOwnerPartyId, NpgsqlDbType.Integer, cancellationToken); // InstanceOwnerPartyId
                            await writer.WriteAsync(info.InstanceGuid, NpgsqlDbType.Uuid, cancellationToken); // InstanceGuid

                            if (req.Metadata.TraceContext != null) // TraceContext
                                await writer.WriteAsync(req.Metadata.TraceContext, NpgsqlDbType.Varchar, cancellationToken);
                            else
                                await writer.WriteNullAsync(cancellationToken);

                            if (wf.Metadata != null) // MetadataJson
                                await writer.WriteAsync(wf.Metadata, NpgsqlDbType.Jsonb, cancellationToken);
                            else
                                await writer.WriteNullAsync(cancellationToken);

                            await writer.WriteNullAsync(cancellationToken); // EngineTraceId (null at creation)

                            if (wf.State != null) // InitialState
                                await writer.WriteAsync(wf.State, NpgsqlDbType.Text, cancellationToken);
                            else
                                await writer.WriteNullAsync(cancellationToken);

                            workflowOffset++;
                        }
                    }

                    await writer.CompleteAsync(cancellationToken);
                }

                // -- COPY steps (with engine-specific columns) --
                if (stepEntries.Count > 0)
                {
                    await using var writer = await conn.BeginBinaryImportAsync(
                        """
                        COPY "Steps" (
                            "Id", "OperationId", "IdempotencyKey", "Status", "CreatedAt", "ProcessingOrder",
                            "BackoffUntil", "RequeueCount",
                            "ActorUserIdOrOrgNumber", "ActorLanguage",
                            "CommandJson", "RetryStrategyJson", "MetadataJson",
                            "StateOut", "JobId"
                        ) FROM STDIN (FORMAT BINARY)
                        """,
                        cancellationToken
                    );
                    for (int stepIndex = 0; stepIndex < stepEntries.Count; stepIndex++)
                    {
                        var (
                            workflowIndex,
                            operationId,
                            idempotencyKey,
                            order,
                            actorUserId,
                            actorLanguage,
                            commandJson,
                            retryJson,
                            metadata
                        ) = stepEntries[stepIndex];

                        await writer.StartRowAsync(cancellationToken);
                        await writer.WriteAsync(stepIds[stepIndex], NpgsqlDbType.Uuid, cancellationToken); // Id
                        await writer.WriteAsync(operationId, NpgsqlDbType.Varchar, cancellationToken); // OperationId
                        await writer.WriteAsync(idempotencyKey, NpgsqlDbType.Text, cancellationToken); // IdempotencyKey
                        await writer.WriteAsync(
                            (int)PersistentItemStatus.Enqueued,
                            NpgsqlDbType.Integer,
                            cancellationToken
                        ); // Status
                        await writer.WriteAsync(now, NpgsqlDbType.TimestampTz, cancellationToken); // CreatedAt
                        await writer.WriteAsync(order, NpgsqlDbType.Integer, cancellationToken); // ProcessingOrder
                        await writer.WriteNullAsync(cancellationToken); // BackoffUntil (null at creation)
                        await writer.WriteAsync(0, NpgsqlDbType.Integer, cancellationToken); // RequeueCount (0 at creation)
                        await writer.WriteAsync(actorUserId, NpgsqlDbType.Varchar, cancellationToken); // ActorUserIdOrOrgNumber

                        if (actorLanguage != null) // ActorLanguage
                            await writer.WriteAsync(actorLanguage, NpgsqlDbType.Varchar, cancellationToken);
                        else
                            await writer.WriteNullAsync(cancellationToken);

                        await writer.WriteAsync(commandJson, NpgsqlDbType.Jsonb, cancellationToken); // CommandJson

                        if (retryJson != null) // RetryStrategyJson
                            await writer.WriteAsync(retryJson, NpgsqlDbType.Jsonb, cancellationToken);
                        else
                            await writer.WriteNullAsync(cancellationToken);

                        if (metadata != null) // MetadataJson
                            await writer.WriteAsync(metadata, NpgsqlDbType.Jsonb, cancellationToken);
                        else
                            await writer.WriteNullAsync(cancellationToken);

                        await writer.WriteNullAsync(cancellationToken); // StateOut (null at creation)
                        await writer.WriteAsync(workflowIds[workflowIndex], NpgsqlDbType.Uuid, cancellationToken); // JobId (FK)
                    }

                    await writer.CompleteAsync(cancellationToken);
                }

                // -- COPY workflow dependencies and links --
                var depEdges = new List<(Guid workflowId, Guid dependencyId)>();
                var linkEdges = new List<(Guid workflowId, Guid linkId)>();

                foreach (var reqIdx in newRequestIndices)
                {
                    var req = requests[reqIdx];
                    var workflows = req.Request.Workflows;
                    var ids = perRequestWorkflowIds[reqIdx];

                    // Build per-request ref->guid map for within-batch resolution
                    var refToGuid = new Dictionary<string, Guid>(workflows.Count);
                    for (int j = 0; j < workflows.Count; j++)
                    {
                        if (workflows[j].Ref is { } workflowRef)
                            refToGuid[workflowRef] = ids[j];
                    }

                    for (int j = 0; j < workflows.Count; j++)
                    {
                        var wf = workflows[j];
                        var wfId = ids[j];

                        if (wf.DependsOn is not null)
                        {
                            foreach (var dep in wf.DependsOn)
                            {
                                var depId = dep.IsRef ? refToGuid[dep.Ref] : dep.Id;
                                depEdges.Add((wfId, depId));
                            }
                        }

                        if (wf.Links is not null)
                        {
                            foreach (var link in wf.Links)
                            {
                                var linkId = link.IsRef ? refToGuid[link.Ref] : link.Id;
                                linkEdges.Add((wfId, linkId));
                            }
                        }
                    }
                }

                if (depEdges.Count > 0)
                {
                    await using var depWriter = await conn.BeginBinaryImportAsync(
                        """COPY "WorkflowDependency" ("WorkflowId", "DependsOnWorkflowId") FROM STDIN (FORMAT BINARY)""",
                        cancellationToken
                    );

                    foreach (var (workflowId, dependencyId) in depEdges)
                    {
                        await depWriter.StartRowAsync(cancellationToken);
                        await depWriter.WriteAsync(workflowId, NpgsqlDbType.Uuid, cancellationToken);
                        await depWriter.WriteAsync(dependencyId, NpgsqlDbType.Uuid, cancellationToken);
                    }

                    await depWriter.CompleteAsync(cancellationToken);
                }

                if (linkEdges.Count > 0)
                {
                    await using var linkWriter = await conn.BeginBinaryImportAsync(
                        """COPY "WorkflowLink" ("WorkflowId", "LinkedWorkflowId") FROM STDIN (FORMAT BINARY)""",
                        cancellationToken
                    );

                    foreach (var (workflowId, linkId) in linkEdges)
                    {
                        await linkWriter.StartRowAsync(cancellationToken);
                        await linkWriter.WriteAsync(workflowId, NpgsqlDbType.Uuid, cancellationToken);
                        await linkWriter.WriteAsync(linkId, NpgsqlDbType.Uuid, cancellationToken);
                    }

                    await linkWriter.CompleteAsync(cancellationToken);
                }

                // Set results for new requests
                foreach (var reqIdx in newRequestIndices)
                    results[reqIdx] = BatchEnqueueResult.Created(perRequestWorkflowIds[reqIdx]);
            }

            await tx.CommitAsync(cancellationToken);

            Metrics.DbOperationsSucceeded.Add(1);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToBatchEnqueueWorkflows(ex.Message, ex);
            throw;
        }

        return results;
    }

    /// <inheritdoc/>
    public async Task<List<Workflow>> FetchAndLockWorkflows(int count, CancellationToken cancellationToken)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.FetchAndLockWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        var now = timeProvider.GetUtcNow();

        await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        // TODO: Check BackoffUntil?
        var ids = await context
            .Database.SqlQuery<Guid>(
                $"""
                UPDATE "Workflows"
                SET "Status" = {PersistentItemStatus.Processing}, "UpdatedAt" = {now}
                WHERE "Id" IN (
                    SELECT w."Id" FROM "Workflows" w
                    WHERE w."Status" IN ({PersistentItemStatus.Enqueued}, {PersistentItemStatus.Requeued})
                      AND (w."StartAt" IS NULL OR w."StartAt" <= {now})
                      AND NOT EXISTS (
                          SELECT 1 FROM "WorkflowDependency" wd
                          JOIN "Workflows" dep ON dep."Id" = wd."DependsOnWorkflowId"
                          WHERE wd."WorkflowId" = w."Id"
                            AND dep."Status" <> {PersistentItemStatus.Completed}
                            AND dep."Status" <> {PersistentItemStatus.Failed}
                            AND dep."Status" <> {PersistentItemStatus.DependencyFailed}
                      )
                    ORDER BY w."StartAt" NULLS FIRST, w."CreatedAt"
                    FOR UPDATE SKIP LOCKED
                    LIMIT {count}
                )
                RETURNING "Id"
                """
            )
            .ToListAsync(cancellationToken);

        if (ids.Count == 0)
        {
            return [];
        }

        var entities = await context
            .Workflows.AsNoTracking()
            .AsSplitQuery()
            .Include(w => w.Steps.OrderBy(s => s.ProcessingOrder))
            .Include(w => w.Dependencies)
            .Where(w => ids.Contains(w.Id))
            .ToListAsync(cancellationToken);

        var workflows = entities.Select(x => x.ToDomainModel()).ToList();

        Metrics.DbOperationsSucceeded.Add(1);

        return workflows;
    }

    /// <inheritdoc/>
    public async Task BatchUpdateWorkflowStatuses(
        IReadOnlyList<WorkflowResult> results,
        CancellationToken cancellationToken
    )
    {
        if (results.Count == 0)
            return;

        using var activity = Metrics.Source.StartActivity("EngineRepository.BatchUpdateWorkflowStatuses");

        var now = timeProvider.GetUtcNow();
        var ids = results.Select(r => r.WorkflowId).ToArray();
        var statuses = results.Select(r => (int)r.Status).ToArray();

        // Uses integer status enum values
        const string sql = """
            UPDATE "Workflows" AS w
            SET "Status"     = v.status,
                "UpdatedAt"  = v.now
            FROM unnest(@ids, @statuses) AS v(id, status)
            WHERE w."Id" = v.id
            """;

        try
        {
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);
                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", ids));
                    cmd.Parameters.Add(new NpgsqlParameter<int[]>("statuses", statuses));
                    cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
                    await cmd.ExecuteNonQueryAsync(ct);
                },
                cancellationToken
            );
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToBatchUpdateWorkflowStatuses(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task BatchUpdateWorkflowsAndSteps(
        IReadOnlyList<BatchWorkflowStatusUpdate> updates,
        CancellationToken cancellationToken
    )
    {
        if (updates.Count == 0)
        {
            return;
        }

        using var activity = Metrics.Source.StartActivity("EngineRepository.BatchUpdateWorkflowsAndSteps");

        var now = timeProvider.GetUtcNow();

        try
        {
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);
                    await using var tx = await conn.BeginTransactionAsync(ct);

                    // 1. Bulk update all workflows
                    var ids = new Guid[updates.Count];
                    var statuses = new int[updates.Count];
                    var engineTraceIds = new object[updates.Count];

                    for (int i = 0; i < updates.Count; i++)
                    {
                        var w = updates[i].Workflow;
                        ids[i] = w.DatabaseId;
                        statuses[i] = (int)w.Status;
                        engineTraceIds[i] = (object?)w.EngineTraceContext ?? DBNull.Value;
                    }

                    const string updateWorkflowsSql = """
                    UPDATE "Workflows" AS w
                    SET "Status"        = v.status,
                        "UpdatedAt"     = @now,
                        "EngineTraceId" = v.engine_trace_id
                    FROM unnest(@ids, @statuses, @engine_trace_ids)
                        AS v(id, status, engine_trace_id)
                    WHERE w."Id" = v.id
                    """;

                    await using (var cmd = new NpgsqlCommand(updateWorkflowsSql, conn, tx))
                    {
                        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", ids));
                        cmd.Parameters.Add(new NpgsqlParameter<int[]>("statuses", statuses));
                        cmd.Parameters.Add(
                            new NpgsqlParameter("engine_trace_ids", NpgsqlDbType.Array | NpgsqlDbType.Text)
                            {
                                Value = engineTraceIds,
                            }
                        );
                        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
                        await cmd.ExecuteNonQueryAsync(ct);
                    }

                    // 2. Bulk update all dirty steps across all workflows
                    var allSteps = updates.SelectMany(u => u.DirtySteps).ToList();

                    if (allSteps.Count > 0)
                    {
                        var stepIds = new Guid[allSteps.Count];
                        var stepStatuses = new int[allSteps.Count];
                        var stepBackoffUntils = new object[allSteps.Count];
                        var stepRequeueCounts = new int[allSteps.Count];
                        var stepStateOuts = new object[allSteps.Count];

                        for (int i = 0; i < allSteps.Count; i++)
                        {
                            var s = allSteps[i];
                            stepIds[i] = s.DatabaseId;
                            stepStatuses[i] = (int)s.Status;
                            stepBackoffUntils[i] = s.BackoffUntil.HasValue
                                ? (object)s.BackoffUntil.Value
                                : DBNull.Value;
                            stepRequeueCounts[i] = s.RequeueCount;
                            stepStateOuts[i] = (object?)s.StateOut ?? DBNull.Value;
                        }

                        const string updateStepsSql = """
                        UPDATE "Steps" AS s
                        SET "Status"       = v.status,
                            "BackoffUntil" = v.backoff_until,
                            "RequeueCount" = v.requeue_count,
                            "StateOut"     = v.state_out,
                            "UpdatedAt"    = @now
                        FROM unnest(@ids, @statuses, @backoff_untils, @requeue_counts, @state_outs)
                            AS v(id, status, backoff_until, requeue_count, state_out)
                        WHERE s."Id" = v.id
                        """;

                        await using var cmd = new NpgsqlCommand(updateStepsSql, conn, tx);
                        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", stepIds));
                        cmd.Parameters.Add(new NpgsqlParameter<int[]>("statuses", stepStatuses));
                        cmd.Parameters.Add(
                            new NpgsqlParameter("backoff_untils", NpgsqlDbType.Array | NpgsqlDbType.TimestampTz)
                            {
                                Value = stepBackoffUntils,
                            }
                        );
                        cmd.Parameters.Add(new NpgsqlParameter<int[]>("requeue_counts", stepRequeueCounts));
                        cmd.Parameters.Add(
                            new NpgsqlParameter("state_outs", NpgsqlDbType.Array | NpgsqlDbType.Text)
                            {
                                Value = stepStateOuts,
                            }
                        );
                        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
                        await cmd.ExecuteNonQueryAsync(ct);

                        // Clear pending changes flags
                        foreach (var step in allSteps)
                            step.HasPendingChanges = false;
                    }

                    await tx.CommitAsync(ct);
                },
                cancellationToken
            );
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToBatchUpdateWorkflowsAndSteps(updates.Count, ex.Message, ex);
            throw;
        }
    }

    private static void CollectExternalIds(
        IEnumerable<WorkflowRef>? refs,
        Guid instanceGuid,
        HashSet<(Guid id, Guid instanceGuid)> target
    )
    {
        if (refs is null)
            return;

        foreach (var r in refs)
        {
            if (r.IsId)
                target.Add((r.Id, instanceGuid));
        }
    }

    private static Guid? FindMissingExternalRef(
        BufferedEnqueueRequest request,
        HashSet<(Guid id, Guid instanceGuid)> verifiedPairs
    )
    {
        var instanceGuid = request.Metadata.InstanceInformation.InstanceGuid;
        foreach (var wf in request.Request.Workflows)
        {
            var missing =
                FindMissingInRefs(wf.DependsOn, instanceGuid, verifiedPairs)
                ?? FindMissingInRefs(wf.Links, instanceGuid, verifiedPairs);
            if (missing is not null)
                return missing;
        }

        return null;
    }

    private static Guid? FindMissingInRefs(
        IEnumerable<WorkflowRef>? refs,
        Guid instanceGuid,
        HashSet<(Guid id, Guid instanceGuid)> verifiedPairs
    )
    {
        if (refs is null)
            return null;

        foreach (var r in refs)
        {
            if (r.IsId && !verifiedPairs.Contains((r.Id, instanceGuid)))
                return r.Id;
        }

        return null;
    }
}
