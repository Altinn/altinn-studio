using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

// NpgsqlDbType.Array is designed to be bitwise-OR'd with element types (e.g. Array | Text),
// but the enum is not marked [Flags], causing a false positive from SonarAnalyzer.
#pragma warning disable S3265 // Non-flags enums should not be used in bitwise operations

namespace WorkflowEngine.Data.Repository;

internal sealed partial class EngineRepository
{
    private readonly Func<NpgsqlConnection, IEnumerable<WorkflowEntity>, CancellationToken, Task> _insertWorkflows =
        sqlBulkInserter.Create<WorkflowEntity>();

    private readonly Func<NpgsqlConnection, IEnumerable<StepEntity>, CancellationToken, Task> _insertSteps =
        sqlBulkInserter.Create<StepEntity>();

    private static readonly Func<
        NpgsqlConnection,
        IEnumerable<(Guid, Guid)>,
        CancellationToken,
        Task
    > _insertDependencies = SqlBulkInserter.CreateForJoinTable(
        "WorkflowDependency",
        "WorkflowId",
        "DependsOnWorkflowId"
    );

    private static readonly Func<NpgsqlConnection, IEnumerable<(Guid, Guid)>, CancellationToken, Task> _insertLinks =
        SqlBulkInserter.CreateForJoinTable("WorkflowLink", "WorkflowId", "LinkedWorkflowId");

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
                                    .SetProperty(t => t.UpdatedAt, workflow.UpdatedAt),
                            ct
                        );
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
                                    .SetProperty(t => t.RequeueCount, step.RequeueCount)
                                    .SetProperty(t => t.StateOut, step.StateOut)
                                    .SetProperty(t => t.UpdatedAt, step.UpdatedAt),
                            ct
                        );
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
        var perRequestWorkflows = new Workflow[requests.Count][];

        for (int i = 0; i < requests.Count; i++)
        {
            var request = requests[i];
            perRequestWorkflows[i] =
            [
                .. request.Request.Workflows.Select(workflowRequest =>
                    Workflow.FromRequest(workflowRequest, request.Metadata, request.Request)
                ),
            ];
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        try
        {
            var validRequestIndices = await ValidateExternalReferences(dbContext, requests, results, cancellationToken);
            var duplicates = RemoveDuplicates(requests, validRequestIndices);

            var idempotencyData = BuildIdempotencyArrays(requests, validRequestIndices, perRequestWorkflows);
            var bulkInsertData = BuildBulkInsertData(requests, validRequestIndices, perRequestWorkflows);

            await using var tx = await dbContext.Database.BeginTransactionAsync(cancellationToken);
            var conn = (NpgsqlConnection)dbContext.Database.GetDbConnection();

            var (newRequestIndices, existingRequestIndices) = await InsertIdempotencyKeys(
                dbContext,
                validRequestIndices,
                idempotencyData,
                cancellationToken
            );

            await BulkCopyNewWorkflows(conn, newRequestIndices, bulkInsertData, cancellationToken);

            await tx.CommitAsync(cancellationToken);

            existingRequestIndices.AddRange(duplicates);

            foreach (var i in newRequestIndices)
            {
                results[i] = BatchEnqueueResult.Created([.. perRequestWorkflows[i].Select(w => w.DatabaseId)]);
            }

            if (existingRequestIndices.Count > 0)
            {
                await ClassifyExistingIdempotencyKeys(
                    dbContext,
                    requests,
                    existingRequestIndices,
                    results,
                    cancellationToken
                );
            }

            if (results.Any(x => x is null))
            {
                throw new UnreachableException("Not all results were set.");
            }

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

    /// <summary>
    /// Pre-computes the unnest arrays needed for the idempotency key INSERT.
    /// </summary>
    private static IdempotencyArrays BuildIdempotencyArrays(
        IReadOnlyList<BufferedEnqueueRequest> requests,
        List<int> validRequestIndices,
        Workflow[][] perRequestWorkflows
    )
    {
        if (validRequestIndices.Count == 0)
        {
            return IdempotencyArrays.Empty;
        }

        var (keys, namespaces, hashes, wfIdTexts, creationDates) = validRequestIndices
            .Select(i =>
            {
                var req = requests[i];
                return (
                    req.Request.IdempotencyKey,
                    req.Request.Namespace,
                    req.RequestBodyHash,
                    "{" + string.Join(",", perRequestWorkflows[i].Select(w => w.DatabaseId)) + "}",
                    req.Metadata.CreatedAt
                );
            })
            .ToArray()
            .Unzip();

        return new IdempotencyArrays(keys, namespaces, hashes, wfIdTexts, creationDates);
    }

    private sealed record IdempotencyArrays(
        string[] Keys,
        string[] Namespaces,
        byte[][] Hashes,
        string[] WfIdTexts,
        DateTimeOffset[] CreationDates
    )
    {
        public static readonly IdempotencyArrays Empty = new([], [], [], [], []);
    }

    /// <summary>
    /// Inserts idempotency keys for candidate-new requests using INSERT ... ON CONFLICT DO NOTHING.
    /// Returns the indices of requests that were actually inserted (confirmed new) and the indices
    /// of requests whose keys already existed (need post-tx classification).
    /// </summary>
    private static async Task<(List<int> NewRequestIndices, List<int> ExistingRequestIndices)> InsertIdempotencyKeys(
        EngineDbContext dbContext,
        List<int> validRequestIndices,
        IdempotencyArrays arrays,
        CancellationToken cancellationToken
    )
    {
        if (validRequestIndices.Count == 0)
            return ([], []);

        var hashesParam = new NpgsqlParameter<byte[][]>("hashes", arrays.Hashes);

        // The SQL returns 0-based indices into the arrays (not the original request indices).
        // We map them back to original request indices via validRequestIndices.
        var insertedArrayIndices = (
            await dbContext
                .Database.SqlQuery<int>(
                    $"""
                    WITH input AS (
                        SELECT * FROM unnest({arrays.Keys}, {arrays.Namespaces}, {hashesParam}, {arrays.WfIdTexts}, {arrays.CreationDates})
                            WITH ORDINALITY
                            AS t(idempotency_key, namespace, request_body_hash, wf_id_text, created_at, idx)
                    ),
                    inserted AS (
                        INSERT INTO idempotency_keys (idempotency_key, namespace, request_body_hash, workflow_ids, created_at)
                        SELECT idempotency_key, namespace, request_body_hash, wf_id_text::uuid[], created_at
                        FROM input
                        ORDER BY idempotency_key, namespace
                        ON CONFLICT (idempotency_key, namespace) DO NOTHING
                        RETURNING idempotency_key, namespace
                    )
                    SELECT (i.idx - 1)::int AS "Value"
                    FROM inserted ins
                    JOIN input i USING (idempotency_key, namespace)
                    """
                )
                .ToListAsync(cancellationToken)
        ).ToHashSet();

        var newRequestIndices = new List<int>(validRequestIndices.Count);
        var existingRequestIndices = new List<int>();

        for (int arrayIdx = 0; arrayIdx < validRequestIndices.Count; arrayIdx++)
        {
            var reqIdx = validRequestIndices[arrayIdx];
            if (insertedArrayIndices.Contains(arrayIdx))
                newRequestIndices.Add(reqIdx);
            else
                existingRequestIndices.Add(reqIdx);
        }

        return (newRequestIndices, existingRequestIndices);
    }

    /// <summary>
    /// Fetches stored idempotency keys for requests that were not inserted (already existed)
    /// and classifies them as Duplicate (same hash) or Conflict (different hash).
    /// Runs outside any transaction.
    /// </summary>
    private static async Task ClassifyExistingIdempotencyKeys(
        EngineDbContext dbContext,
        IReadOnlyList<BufferedEnqueueRequest> requests,
        List<int> existingRequestIndices,
        BatchEnqueueResult[] results,
        CancellationToken cancellationToken
    )
    {
        var (keys, namespaces) = existingRequestIndices
            .Select(i => (requests[i].Request.IdempotencyKey, requests[i].Request.Namespace))
            .ToArray()
            .Unzip();

        var existingEntities = await dbContext
            .IdempotencyKeys.FromSql(
                $"""
                SELECT ik.*
                FROM unnest({keys}, {namespaces})
                    AS t(idempotency_key, namespace)
                JOIN idempotency_keys ik USING (idempotency_key, namespace)
                """
            )
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var existingLookup = existingEntities.ToDictionary(
            e => (e.IdempotencyKey, e.Namespace),
            e => (hash: e.RequestBodyHash, workflowIds: e.WorkflowIds)
        );

        foreach (var i in existingRequestIndices)
        {
            var req = requests[i];
            var compositeKey = (req.Request.IdempotencyKey, req.Request.Namespace);
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

    /// <summary>
    /// Validates that external workflow references (DependsOn/Links by ID) point to existing workflows.
    /// Returns the indices of requests that passed validation. Sets <see cref="BatchEnqueueResult.InvalidRef"/>
    /// results for requests with missing references.
    /// </summary>
    private static async Task<List<int>> ValidateExternalReferences(
        EngineDbContext dbContext,
        IReadOnlyList<BufferedEnqueueRequest> requests,
        BatchEnqueueResult[] results,
        CancellationToken cancellationToken
    )
    {
        var externalRefPairs = new HashSet<(Guid id, string ns)>();
        foreach (var request in requests)
        {
            var ns = request.Request.Namespace;
            foreach (var workflow in request.Request.Workflows)
            {
                CollectExternalIds(workflow.DependsOn, ns, externalRefPairs);
                CollectExternalIds(workflow.Links, ns, externalRefPairs);
            }
        }

        if (externalRefPairs.Count == 0)
        {
            return [.. Enumerable.Range(0, requests.Count)];
        }

        var referenceIds = externalRefPairs.Select(p => p.id).Distinct().ToArray();

        var verifiedPairs = (
            await dbContext
                .Workflows.Where(w => referenceIds.Contains(w.Id))
                .Select(w => new { w.Id, w.Namespace })
                .AsNoTracking()
                .ToListAsync(cancellationToken)
        )
            .Select(w => (w.Id, w.Namespace))
            .ToHashSet();

        var validIndices = new List<int>(requests.Count);

        for (var i = 0; i < requests.Count; i++)
        {
            var ns = requests[i].Request.Namespace;
            var nonExistentReferences = requests[i]
                .Request.Workflows.SelectMany(wf => (wf.DependsOn ?? []).Concat(wf.Links ?? []))
                .Where(r => r.IsId && !verifiedPairs.Contains((r.Id, ns)))
                .Select(r => r.Id)
                .Distinct();

            if (nonExistentReferences.Any())
            {
                results[i] = BatchEnqueueResult.InvalidRef(
                    $"The following referenced workflows do not exist for this namespace: {string.Join(", ", nonExistentReferences)}"
                );
            }
            else
            {
                validIndices.Add(i);
            }
        }

        return validIndices;
    }

    private static List<int> RemoveDuplicates(IReadOnlyList<BufferedEnqueueRequest> requests, List<int> indicesToCheck)
    {
        var duplicates = new List<int>();
        BufferedEnqueueRequest? previous = null;
        foreach (
            var (current, index) in requests
                .Select((Value, Index) => (Value, Index))
                .OrderBy(x => x.Value.Request.Namespace)
                .ThenBy(x => x.Value.Request.IdempotencyKey)
        )
        {
            if (!indicesToCheck.Contains(index))
            {
                continue;
            }

            if (
                previous is not null
                && current.Request.Namespace == previous.Request.Namespace
                && current.Request.IdempotencyKey == previous.Request.IdempotencyKey
            )
            {
                duplicates.Add(index);
                indicesToCheck.Remove(index);
            }
            previous = current;
        }

        return duplicates;
    }

    /// <summary>
    /// Pre-builds all workflow entities, step entities, and edge data for all valid requests.
    /// Pure CPU work — no database access. Built optimistically; only entries for confirmed-new
    /// requests will actually be inserted.
    /// </summary>
    private static BulkInsertData BuildBulkInsertData(
        IReadOnlyList<BufferedEnqueueRequest> requests,
        List<int> requestIndices,
        Workflow[][] perRequestWorkflows
    )
    {
        if (requestIndices.Count == 0)
            return BulkInsertData.Empty;

        int totalWorkflows = 0;
        foreach (var i in requestIndices)
            totalWorkflows += perRequestWorkflows[i].Length;

        var workflowEntities = new Dictionary<int, List<WorkflowEntity>>(requestIndices.Count);
        var depEdges = new Dictionary<int, List<(Guid, Guid)>>();
        var linkEdges = new Dictionary<int, List<(Guid, Guid)>>();

        foreach (var reqIdx in requestIndices)
        {
            var req = requests[reqIdx];
            var workflowRequests = req.Request.Workflows;
            var workflows = perRequestWorkflows[reqIdx];

            var entities = new List<WorkflowEntity>(workflows.Length);

            // Build per-request ref->guid map for within-batch resolution
            var refToGuid = new Dictionary<string, Guid>(workflows.Length);
            for (int j = 0; j < workflows.Length; j++)
            {
                if (workflowRequests[j].Ref is { } workflowRef)
                    refToGuid[workflowRef] = workflows[j].DatabaseId;
            }

            List<(Guid, Guid)>? reqDepEdges = null;
            List<(Guid, Guid)>? reqLinkEdges = null;

            for (int j = 0; j < workflows.Length; j++)
            {
                var wfReq = workflowRequests[j];
                var wfId = workflows[j].DatabaseId;

                entities.Add(WorkflowEntity.FromDomainModel(workflows[j]));

                if (wfReq.DependsOn is not null)
                {
                    reqDepEdges ??= [];
                    foreach (var dep in wfReq.DependsOn)
                    {
                        var depId = dep.IsRef ? refToGuid[dep.Ref] : dep.Id;
                        reqDepEdges.Add((wfId, depId));
                    }
                }

                if (wfReq.Links is not null)
                {
                    reqLinkEdges ??= [];
                    foreach (var link in wfReq.Links)
                    {
                        var linkId = link.IsRef ? refToGuid[link.Ref] : link.Id;
                        reqLinkEdges.Add((wfId, linkId));
                    }
                }
            }

            workflowEntities[reqIdx] = entities;
            if (reqDepEdges is not null)
                depEdges[reqIdx] = reqDepEdges;
            if (reqLinkEdges is not null)
                linkEdges[reqIdx] = reqLinkEdges;
        }

        return new BulkInsertData(workflowEntities, depEdges, linkEdges);
    }

    private sealed record BulkInsertData(
        Dictionary<int, List<WorkflowEntity>> WorkflowEntities,
        Dictionary<int, List<(Guid, Guid)>> DepEdges,
        Dictionary<int, List<(Guid, Guid)>> LinkEdges
    )
    {
        public static readonly BulkInsertData Empty = new([], [], []);
    }

    /// <summary>
    /// Bulk COPY inserts workflow entities, steps, dependency edges, and link edges
    /// for confirmed-new requests only. Must run inside a transaction.
    /// </summary>
    private async Task BulkCopyNewWorkflows(
        NpgsqlConnection conn,
        List<int> newRequestIndices,
        BulkInsertData data,
        CancellationToken cancellationToken
    )
    {
        if (newRequestIndices.Count == 0)
            return;

        var allEntities = new List<WorkflowEntity>();
        var allDepEdges = new List<(Guid, Guid)>();
        var allLinkEdges = new List<(Guid, Guid)>();

        foreach (var reqIdx in newRequestIndices)
        {
            allEntities.AddRange(data.WorkflowEntities[reqIdx]);

            if (data.DepEdges.TryGetValue(reqIdx, out var deps))
                allDepEdges.AddRange(deps);

            if (data.LinkEdges.TryGetValue(reqIdx, out var links))
                allLinkEdges.AddRange(links);
        }

        await _insertWorkflows(conn, allEntities, cancellationToken);
        await _insertSteps(conn, allEntities.SelectMany(w => w.Steps), cancellationToken);

        if (allDepEdges.Count > 0)
        {
            await _insertDependencies(conn, allDepEdges, cancellationToken);
        }

        if (allLinkEdges.Count > 0)
        {
            await _insertLinks(conn, allLinkEdges, cancellationToken);
        }
    }

    /// <inheritdoc/>
    public async Task<List<Workflow>> FetchAndLockWorkflows(int count, CancellationToken cancellationToken)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.FetchAndLockWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        var now = timeProvider.GetUtcNow();

        await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var ids = await context
            .Database.SqlQuery<Guid>(
                $"""
                UPDATE "Workflows"
                SET "Status" = {PersistentItemStatus.Processing}, "UpdatedAt" = {now}
                WHERE "Id" IN (
                    SELECT w."Id" FROM "Workflows" w
                    WHERE w."Status" IN ({PersistentItemStatus.Enqueued}, {PersistentItemStatus.Requeued})
                      AND (w."StartAt" IS NULL OR w."StartAt" <= {now})
                      AND (w."BackoffUntil" IS NULL OR w."BackoffUntil" <= {now})
                      AND NOT EXISTS (
                          SELECT 1 FROM "WorkflowDependency" wd
                          JOIN "Workflows" dep ON dep."Id" = wd."DependsOnWorkflowId"
                          WHERE wd."WorkflowId" = w."Id"
                            AND dep."Status" <> {PersistentItemStatus.Completed}
                            AND dep."Status" <> {PersistentItemStatus.Failed}
                            AND dep."Status" <> {PersistentItemStatus.DependencyFailed}
                      )
                    ORDER BY w."BackoffUntil" NULLS FIRST, w."CreatedAt"
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
                    var backoffUntils = new object[updates.Count];
                    var engineTraceIds = new object[updates.Count];

                    for (int i = 0; i < updates.Count; i++)
                    {
                        var w = updates[i].Workflow;
                        ids[i] = w.DatabaseId;
                        statuses[i] = (int)w.Status;
                        backoffUntils[i] = w.BackoffUntil.HasValue ? w.BackoffUntil.Value : DBNull.Value;
                        engineTraceIds[i] = (object?)w.EngineTraceContext ?? DBNull.Value;
                    }

                    const string updateWorkflowsSql = """
                    UPDATE "Workflows" AS w
                    SET "Status"        = v.status,
                        "UpdatedAt"     = @now,
                        "BackoffUntil" = v.backoff_until,
                        "EngineTraceId" = v.engine_trace_id
                    FROM unnest(@ids, @statuses, @backoff_untils, @engine_trace_ids)
                        AS v(id, status, backoff_until, engine_trace_id)
                    WHERE w."Id" = v.id
                    """;

                    await using (var cmd = new NpgsqlCommand(updateWorkflowsSql, conn, tx))
                    {
                        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", ids));
                        cmd.Parameters.Add(new NpgsqlParameter<int[]>("statuses", statuses));
                        cmd.Parameters.Add(
                            new NpgsqlParameter("backoff_untils", NpgsqlDbType.Array | NpgsqlDbType.TimestampTz)
                            {
                                Value = backoffUntils,
                            }
                        );
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
                        var stepRequeueCounts = new int[allSteps.Count];
                        var stepStateOuts = new object[allSteps.Count];

                        for (int i = 0; i < allSteps.Count; i++)
                        {
                            var s = allSteps[i];
                            stepIds[i] = s.DatabaseId;
                            stepStatuses[i] = (int)s.Status;
                            stepRequeueCounts[i] = s.RequeueCount;
                            stepStateOuts[i] = (object?)s.StateOut ?? DBNull.Value;
                        }

                        const string updateStepsSql = """
                        UPDATE "Steps" AS s
                        SET "Status"       = v.status,
                            "RequeueCount" = v.requeue_count,
                            "StateOut"     = v.state_out,
                            "UpdatedAt"    = @now
                        FROM unnest(@ids, @statuses, @requeue_counts, @state_outs)
                            AS v(id, status, requeue_count, state_out)
                        WHERE s."Id" = v.id
                        """;

                        await using var cmd = new NpgsqlCommand(updateStepsSql, conn, tx);
                        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", stepIds));
                        cmd.Parameters.Add(new NpgsqlParameter<int[]>("statuses", stepStatuses));
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
        string ns,
        HashSet<(Guid id, string ns)> target
    )
    {
        if (refs is null)
        {
            return;
        }

        foreach (var r in refs)
        {
            if (r.IsId)
            {
                target.Add((r.Id, ns));
            }
        }
    }
}
