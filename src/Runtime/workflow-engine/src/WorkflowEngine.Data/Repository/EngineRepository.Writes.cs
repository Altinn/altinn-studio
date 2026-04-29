using System.Diagnostics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Data.Extensions;
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
        "DependsOnWorkflowId",
        SchemaNames.Engine
    );

    private static readonly Func<NpgsqlConnection, IEnumerable<(Guid, Guid)>, CancellationToken, Task> _insertLinks =
        SqlBulkInserter.CreateForJoinTable("WorkflowLink", "WorkflowId", "LinkedWorkflowId", SchemaNames.Engine);

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
                                    .SetProperty(t => t.BackoffUntil, workflow.BackoffUntil)
                                    .SetProperty(t => t.EngineTraceContext, workflow.EngineTraceContext),
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
                                    .SetProperty(t => t.UpdatedAt, step.UpdatedAt)
                                    .SetProperty(t => t.EngineTraceContext, step.EngineTraceContext),
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
    public async Task<BatchEnqueueResult[]> BatchEnqueueWorkflows(
        IReadOnlyList<BufferedEnqueueRequest> requests,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.BatchEnqueueWorkflows");

        var results = new BatchEnqueueResult[requests.Count];
        var perRequestWorkflows = new Workflow[requests.Count][];

        for (int i = 0; i < requests.Count; i++)
        {
            var request = requests[i];
            perRequestWorkflows[i] =
            [
                .. request.Request.Workflows.Select(workflowRequest =>
                    workflowRequest.ToWorkflow(request.Metadata, request.Request)
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
                    req.Metadata.IdempotencyKey,
                    WorkflowNamespace.Normalize(req.Metadata.Namespace),
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
                            AS t("IdempotencyKey", "Namespace", "RequestBodyHash", wf_id_text, "CreatedAt", idx)
                    ),
                    inserted AS (
                        INSERT INTO "engine"."IdempotencyKeys" ("IdempotencyKey", "Namespace", "RequestBodyHash", "WorkflowIds", "CreatedAt")
                        SELECT "IdempotencyKey", "Namespace", "RequestBodyHash", wf_id_text::uuid[], "CreatedAt"
                        FROM input
                        ORDER BY "IdempotencyKey", "Namespace"
                        ON CONFLICT ("IdempotencyKey", "Namespace") DO NOTHING
                        RETURNING "IdempotencyKey", "Namespace"
                    )
                    SELECT (i.idx - 1)::int AS "Value"
                    FROM inserted ins
                    JOIN input i USING ("IdempotencyKey", "Namespace")
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
            .Select(i =>
                (requests[i].Metadata.IdempotencyKey, WorkflowNamespace.Normalize(requests[i].Metadata.Namespace))
            )
            .ToArray()
            .Unzip();

        var existingEntities = await dbContext
            .IdempotencyKeys.FromSql(
                $"""
                SELECT ik.*
                FROM unnest({keys}, {namespaces})
                    AS t("IdempotencyKey", "Namespace")
                JOIN "engine"."IdempotencyKeys" ik USING ("IdempotencyKey", "Namespace")
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
            var compositeKey = (req.Metadata.IdempotencyKey, WorkflowNamespace.Normalize(req.Metadata.Namespace));
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
            var ns = WorkflowNamespace.Normalize(request.Metadata.Namespace);
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
            var ns = WorkflowNamespace.Normalize(requests[i].Metadata.Namespace);
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
                .Select((value, index) => (Value: value, Index: index))
                .OrderBy(x => WorkflowNamespace.Normalize(x.Value.Metadata.Namespace))
                .ThenBy(x => x.Value.Metadata.IdempotencyKey)
        )
        {
            if (!indicesToCheck.Contains(index))
            {
                continue;
            }

            if (
                previous is not null
                && WorkflowNamespace.Normalize(current.Metadata.Namespace)
                    == WorkflowNamespace.Normalize(previous.Metadata.Namespace)
                && current.Metadata.IdempotencyKey == previous.Metadata.IdempotencyKey
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

        // Fetch ready rows and stamp a LeaseToken in a single atomic UPDATE. Poison abandonment
        // and stale reclaim run as separate sweeps in DbMaintenanceService — reclaimed rows
        // re-enter here as Enqueued.
        var ids = await context
            .Database.SqlQuery<Guid>(
                $"""
                WITH ready AS (
                    SELECT w."Id"
                    FROM "engine"."Workflows" w
                    WHERE w."Status" IN ({PersistentItemStatus.Enqueued}, {PersistentItemStatus.Requeued})
                      AND (w."BackoffUntil" IS NULL OR w."BackoffUntil" <= {now})
                      AND NOT EXISTS (
                          SELECT 1 FROM "engine"."WorkflowDependency" wd
                          JOIN "engine"."Workflows" dep ON dep."Id" = wd."DependsOnWorkflowId"
                          WHERE wd."WorkflowId" = w."Id"
                            AND dep."Status" <> {PersistentItemStatus.Completed}
                            AND dep."Status" <> {PersistentItemStatus.Failed}
                            AND dep."Status" <> {PersistentItemStatus.DependencyFailed}
                            AND dep."Status" <> {PersistentItemStatus.Canceled}
                      )
                    ORDER BY w."BackoffUntil" NULLS FIRST, w."CreatedAt"
                    FOR UPDATE SKIP LOCKED
                    LIMIT {count}
                ),
                updated AS (
                    UPDATE "engine"."Workflows" w
                    SET "Status"      = {PersistentItemStatus.Processing},
                        "UpdatedAt"   = {now},
                        "HeartbeatAt" = {now},
                        "LeaseToken"  = gen_random_uuid()
                    FROM ready r
                    WHERE w."Id" = r."Id"
                    RETURNING w."Id"
                )
                SELECT "Id" AS "Value" FROM updated
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
    public async Task<bool> RequestCancellation(
        Guid workflowId,
        string ns,
        DateTimeOffset requestedAt,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.RequestCancellation");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        var now = timeProvider.GetUtcNow();

        try
        {
            int rowsAffected = 0;
            var terminalStatuses = PersistentItemStatusMap.Finished.Select(s => (int)s).ToArray();
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);
                    const string sql = """
                    UPDATE "engine"."Workflows"
                    SET "CancellationRequestedAt" = @requestedAt, "UpdatedAt" = @now
                    WHERE "Id" = @id
                      AND "Namespace" = @ns
                      AND "Status" != ALL(@terminalStatuses)
                      AND "CancellationRequestedAt" IS NULL
                    """;

                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("requestedAt", requestedAt));
                    cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
                    cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", workflowId));
                    cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));
                    cmd.Parameters.Add(new NpgsqlParameter<int[]>("terminalStatuses", terminalStatuses));
                    rowsAffected = await cmd.ExecuteNonQueryAsync(ct);
                },
                cancellationToken
            );

            return rowsAffected > 0;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToUpdateWorkflow("cancel", workflowId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task BatchUpdateHeartbeats(
        IReadOnlyList<(Guid WorkflowId, Guid LeaseToken)> leases,
        TimeSpan staleThreshold,
        CancellationToken cancellationToken
    )
    {
        if (leases.Count == 0)
            return;

        using var activity = Metrics.Source.StartActivity("EngineRepository.BatchUpdateHeartbeats");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        var now = timeProvider.GetUtcNow();
        var updatedBefore = now - staleThreshold;

        var ids = new Guid[leases.Count];
        var tokens = new Guid[leases.Count];
        for (int i = 0; i < leases.Count; i++)
        {
            ids[i] = leases[i].WorkflowId;
            tokens[i] = leases[i].LeaseToken;
        }

        try
        {
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);
                    // (id, lease_token) paired via unnest so WHERE matches both columns on the
                    // same row — ANY(@ids) + ANY(@tokens) would accept any cross-product.
                    // Stale-token rows silently no-op: the new owner's lease token is on the row,
                    // the old worker's heartbeat write skips it, and the row keeps aging normally.
                    const string sql = """
                    UPDATE "engine"."Workflows" w
                    SET "HeartbeatAt" = @now
                    FROM unnest(@ids, @lease_tokens) AS i(id, lease_token)
                    WHERE w."Id" = i.id
                      AND w."LeaseToken" = i.lease_token
                      AND w."Status" = @status
                      AND w."UpdatedAt" < @updatedBefore
                    """;

                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
                    cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", ids));
                    cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("lease_tokens", tokens));
                    cmd.Parameters.Add(new NpgsqlParameter<int>("status", (int)PersistentItemStatus.Processing));
                    cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("updatedBefore", updatedBefore));

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
            logger.FailedToBatchUpdateHeartbeats(leases.Count, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<BatchUpdateResult> BatchUpdateWorkflowsAndSteps(
        IReadOnlyList<BatchWorkflowStatusUpdate> updates,
        CancellationToken cancellationToken
    )
    {
        if (updates.Count == 0)
        {
            return new BatchUpdateResult([], []);
        }

        using var activity = Metrics.Source.StartActivity("EngineRepository.BatchUpdateWorkflowsAndSteps");

        var now = timeProvider.GetUtcNow();

        try
        {
            List<Guid> accepted = [];
            await ExecuteWithRetry(
                async ct =>
                {
                    accepted.Clear();

                    await using var conn = await dataSource.OpenConnectionAsync(ct);
                    await using var tx = await conn.BeginTransactionAsync(ct);

                    // Sort by ID for consistent row-lock order across concurrent transactions,
                    // preventing deadlocks.
                    var sorted = updates.OrderBy(u => u.Workflow.DatabaseId).ToList();

                    var ids = new Guid[sorted.Count];
                    var statuses = new int[sorted.Count];
                    var backoffUntils = new object[sorted.Count];
                    var engineTraceContexts = new object[sorted.Count];
                    var leaseTokens = new Guid[sorted.Count];

                    for (int i = 0; i < sorted.Count; i++)
                    {
                        var w = sorted[i].Workflow;
                        ids[i] = w.DatabaseId;
                        statuses[i] = (int)w.Status;
                        backoffUntils[i] = w.BackoffUntil.HasValue ? w.BackoffUntil.Value : DBNull.Value;
                        engineTraceContexts[i] = (object?)w.EngineTraceContext ?? DBNull.Value;
                        // FetchAndLockWorkflows always stamps a LeaseToken; the throw is an invariant check.
                        leaseTokens[i] =
                            w.LeaseToken
                            ?? throw new UnreachableException(
                                $"Workflow {w.DatabaseId} reached write-back without a LeaseToken; expected FetchAndLockWorkflows to stamp one"
                            );
                    }

                    // Lease-token CAS: mismatched rows are silently skipped; RETURNING yields the
                    // accepted ids, any input id not in that set is lease-lost.
                    //
                    // Writes leaving Processing clear LeaseToken, preserving the invariant
                    // "LeaseToken IS NOT NULL iff Status = Processing". Without this, a frozen
                    // worker's later CAS could match a row that has since moved on under the
                    // same token.
                    const string updateWorkflowsSql = """
                    UPDATE "engine"."Workflows" AS w
                    SET "Status"             = v.status,
                        "UpdatedAt"          = @now,
                        "BackoffUntil"       = v.backoff_until,
                        "HeartbeatAt"        = CASE WHEN v.status = @processing THEN @now ELSE NULL END,
                        "LeaseToken"         = CASE WHEN v.status = @processing THEN w."LeaseToken" ELSE NULL END,
                        "EngineTraceContext" = v.engine_trace_context
                    FROM (
                        SELECT *
                        FROM unnest(@ids, @statuses, @backoff_untils, @engine_trace_contexts, @lease_tokens)
                            AS t(id, status, backoff_until, engine_trace_context, lease_token)
                        ORDER BY t.id
                    ) AS v
                    WHERE w."Id" = v.id
                      AND w."LeaseToken" = v.lease_token
                    RETURNING w."Id"
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
                            new NpgsqlParameter("engine_trace_contexts", NpgsqlDbType.Array | NpgsqlDbType.Text)
                            {
                                Value = engineTraceContexts,
                            }
                        );
                        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("lease_tokens", leaseTokens));
                        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
                        cmd.Parameters.Add(
                            new NpgsqlParameter<int>("processing", (int)PersistentItemStatus.Processing)
                        );

                        await using var reader = await cmd.ExecuteReaderAsync(ct);
                        while (await reader.ReadAsync(ct))
                        {
                            accepted.Add(reader.GetGuid(0));
                        }
                    }

                    // Only update steps for accepted workflows — otherwise we leak step state
                    // into a workflow we no longer own.
                    var acceptedIds = accepted.ToHashSet();
                    var allSteps = sorted
                        .Where(u => acceptedIds.Contains(u.Workflow.DatabaseId))
                        .SelectMany(u => u.DirtySteps)
                        .OrderBy(s => s.DatabaseId)
                        .ToList();

                    if (allSteps.Count > 0)
                    {
                        var stepIds = new Guid[allSteps.Count];
                        var stepStatuses = new int[allSteps.Count];
                        var stepRequeueCounts = new int[allSteps.Count];
                        var stepErrorHistories = new object[allSteps.Count];
                        var stepStateOuts = new object[allSteps.Count];
                        var stepEngineTraceContexts = new object[allSteps.Count];

                        for (int i = 0; i < allSteps.Count; i++)
                        {
                            var s = allSteps[i];
                            stepIds[i] = s.DatabaseId;
                            stepStatuses[i] = (int)s.Status;
                            stepRequeueCounts[i] = s.RequeueCount;
                            stepErrorHistories[i] =
                                s.ErrorHistory.Count > 0
                                    ? JsonSerializer.Serialize(s.ErrorHistory, JsonOptions.Default)
                                    : DBNull.Value;
                            stepStateOuts[i] = (object?)s.StateOut ?? DBNull.Value;
                            stepEngineTraceContexts[i] = (object?)s.EngineTraceContext ?? DBNull.Value;
                        }

                        const string updateStepsSql = """
                        UPDATE "engine"."Steps" AS s
                        SET "Status"             = v.status,
                            "RequeueCount"       = v.requeue_count,
                            "ErrorHistory"       = v.error_history,
                            "StateOut"           = v.state_out,
                            "EngineTraceContext" = v.engine_trace_context,
                            "UpdatedAt"          = @now
                        FROM (
                            SELECT *
                            FROM unnest(@ids, @statuses, @requeue_counts, @error_histories, @engine_trace_contexts, @state_outs)
                                AS t(id, status, requeue_count, error_history, engine_trace_context, state_out)
                            ORDER BY t.id
                        ) AS v
                        WHERE s."Id" = v.id
                        """;

                        await using var cmd = new NpgsqlCommand(updateStepsSql, conn, tx);
                        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", stepIds));
                        cmd.Parameters.Add(new NpgsqlParameter<int[]>("statuses", stepStatuses));
                        cmd.Parameters.Add(new NpgsqlParameter<int[]>("requeue_counts", stepRequeueCounts));
                        cmd.Parameters.Add(
                            new NpgsqlParameter("error_histories", NpgsqlDbType.Array | NpgsqlDbType.Jsonb)
                            {
                                Value = stepErrorHistories,
                            }
                        );
                        cmd.Parameters.Add(
                            new NpgsqlParameter("state_outs", NpgsqlDbType.Array | NpgsqlDbType.Text)
                            {
                                Value = stepStateOuts,
                            }
                        );
                        cmd.Parameters.Add(
                            new NpgsqlParameter("engine_trace_contexts", NpgsqlDbType.Array | NpgsqlDbType.Text)
                            {
                                Value = stepEngineTraceContexts,
                            }
                        );
                        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
                        await cmd.ExecuteNonQueryAsync(ct);
                    }

                    // NOTIFY inside the tx: PG queues it until commit and drops it on rollback,
                    // so it's safe to run before CommitAsync. Running after commit would allow a
                    // transient NOTIFY failure to re-enter the retry, whose CAS would then see
                    // LeaseToken already cleared and classify every workflow as lease-lost.
                    await using (var notifyCmd = new NpgsqlCommand("NOTIFY status_changed", conn, tx))
                    {
                        await notifyCmd.ExecuteNonQueryAsync(ct);
                    }

                    // Known gap: an ambiguous CommitAsync failure (server committed, client saw a
                    // transient ack error) triggers a retry whose CAS sees LeaseToken already
                    // cleared and misclassifies terminal-transition writes as lease-lost.
                    // Telemetry-only: DB state is consistent, callers get a spurious
                    // LeaseLostException, WorkflowsLeaseLost over-counts. Accepted as-is —
                    // ambiguous commits are rare and the alternatives (hoisting CommitAsync out
                    // of the retry, or a verification SELECT) are worse trade-offs.
                    await tx.CommitAsync(ct);
                },
                cancellationToken
            );

            var acceptedSet = accepted.ToHashSet();
            List<Guid> rejected = [];
            foreach (var u in updates)
            {
                if (!acceptedSet.Contains(u.Workflow.DatabaseId))
                {
                    rejected.Add(u.Workflow.DatabaseId);
                }
            }

            if (rejected.Count > 0)
            {
                activity?.SetTag("lease.lost", true);
                activity?.SetTag("lease.lost.count", rejected.Count);
                logger.BatchUpdateLeaseLost(rejected.Count, updates.Count);
            }

            return new BatchUpdateResult(accepted, rejected);
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

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Guid>> ResumeWorkflow(
        Guid workflowId,
        string ns,
        DateTimeOffset resumedAt,
        bool cascade = false,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.ResumeWorkflow");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            List<Guid> resumedIds = [];
            await ExecuteWithRetry(
                async ct =>
                {
                    resumedIds.Clear();

                    await using var conn = await dataSource.OpenConnectionAsync(ct);
                    await using var tx = await conn.BeginTransactionAsync(ct);

                    // Reset from terminal + Requeued (Requeued skips the backoff wait). Clearing
                    // LeaseToken preserves the "NOT NULL iff Processing" invariant.
                    const string resetPrimarySql = """
                    UPDATE engine."Workflows"
                    SET "Status" = @enqueued,
                        "CancellationRequestedAt" = NULL,
                        "BackoffUntil" = NULL,
                        "HeartbeatAt" = NULL,
                        "LeaseToken" = NULL,
                        "ReclaimCount" = 0,
                        "UpdatedAt" = @now
                    WHERE "Id" = @id
                      AND "Namespace" = @ns
                      AND "Status" IN (@failed, @canceled, @depFailed, @requeued)
                    RETURNING "Id"
                    """;
                    await using (var cmd = new NpgsqlCommand(resetPrimarySql, conn, tx))
                    {
                        cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", workflowId));
                        cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));
                        cmd.Parameters.Add(new NpgsqlParameter<int>("enqueued", (int)PersistentItemStatus.Enqueued));
                        cmd.Parameters.Add(new NpgsqlParameter<int>("failed", (int)PersistentItemStatus.Failed));
                        cmd.Parameters.Add(new NpgsqlParameter<int>("canceled", (int)PersistentItemStatus.Canceled));
                        cmd.Parameters.Add(
                            new NpgsqlParameter<int>("depFailed", (int)PersistentItemStatus.DependencyFailed)
                        );
                        cmd.Parameters.Add(new NpgsqlParameter<int>("requeued", (int)PersistentItemStatus.Requeued));
                        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", resumedAt));

                        await using var reader = await cmd.ExecuteReaderAsync(ct);
                        if (await reader.ReadAsync(ct))
                            resumedIds.Add(reader.GetGuid(0));
                    }

                    if (resumedIds.Count == 0)
                    {
                        await tx.RollbackAsync(ct);
                        return;
                    }

                    // Cascade: resume transitively dependent DependencyFailed workflows
                    if (cascade)
                    {
                        const string cascadeSql = """
                        WITH RECURSIVE dependents AS (
                            SELECT wd."WorkflowId" AS "Id"
                            FROM engine."WorkflowDependency" wd
                            JOIN engine."Workflows" w ON w."Id" = wd."WorkflowId"
                            WHERE wd."DependsOnWorkflowId" = @id
                              AND w."Status" = @depFailed
                            UNION
                            SELECT wd."WorkflowId"
                            FROM engine."WorkflowDependency" wd
                            JOIN engine."Workflows" w ON w."Id" = wd."WorkflowId"
                            JOIN dependents d ON wd."DependsOnWorkflowId" = d."Id"
                            WHERE w."Status" = @depFailed
                        )
                        UPDATE engine."Workflows" w
                        SET "Status" = @enqueued,
                            "CancellationRequestedAt" = NULL,
                            "BackoffUntil" = NULL,
                            "HeartbeatAt" = NULL,
                            "LeaseToken" = NULL,
                            "ReclaimCount" = 0,
                            "UpdatedAt" = @now
                        FROM dependents d
                        WHERE w."Id" = d."Id"
                        RETURNING w."Id"
                        """;
                        await using (var cmd = new NpgsqlCommand(cascadeSql, conn, tx))
                        {
                            cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", workflowId));
                            cmd.Parameters.Add(
                                new NpgsqlParameter<int>("depFailed", (int)PersistentItemStatus.DependencyFailed)
                            );
                            cmd.Parameters.Add(
                                new NpgsqlParameter<int>("enqueued", (int)PersistentItemStatus.Enqueued)
                            );
                            cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", resumedAt));

                            await using var reader = await cmd.ExecuteReaderAsync(ct);
                            while (await reader.ReadAsync(ct))
                                resumedIds.Add(reader.GetGuid(0));
                        }
                    }

                    // Reset non-completed steps for all resumed workflows
                    const string resetStepsSql = """
                    UPDATE engine."Steps"
                    SET "Status" = @enqueued, "RequeueCount" = 0, "UpdatedAt" = @now
                    WHERE "JobId" = ANY(@ids)
                      AND "Status" != @completed
                    """;
                    await using (var cmd = new NpgsqlCommand(resetStepsSql, conn, tx))
                    {
                        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", resumedIds.ToArray()));
                        cmd.Parameters.Add(new NpgsqlParameter<int>("enqueued", (int)PersistentItemStatus.Enqueued));
                        cmd.Parameters.Add(new NpgsqlParameter<int>("completed", (int)PersistentItemStatus.Completed));
                        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", resumedAt));
                        await cmd.ExecuteNonQueryAsync(ct);
                    }

                    await tx.CommitAsync(ct);

                    await using var notifyCmd = new NpgsqlCommand("NOTIFY status_changed", conn);
                    await notifyCmd.ExecuteNonQueryAsync(ct);
                },
                cancellationToken
            );

            return resumedIds;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToUpdateWorkflow("resume", workflowId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<bool> SkipBackoff(Guid workflowId, string ns, CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.SkipBackoff");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            int rowsAffected = 0;
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);

                    const string sql = """
                    UPDATE engine."Workflows"
                    SET "BackoffUntil" = NULL, "UpdatedAt" = @now
                    WHERE "Id" = @id AND "Namespace" = @ns AND "Status" = @requeued AND "BackoffUntil" IS NOT NULL
                    """;
                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", workflowId));
                    cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));
                    cmd.Parameters.Add(new NpgsqlParameter<int>("requeued", (int)PersistentItemStatus.Requeued));
                    cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", timeProvider.GetUtcNow()));
                    rowsAffected = await cmd.ExecuteNonQueryAsync(ct);

                    if (rowsAffected > 0)
                    {
                        await using var notifyCmd = new NpgsqlCommand("NOTIFY status_changed", conn);
                        await notifyCmd.ExecuteNonQueryAsync(ct);
                    }
                },
                cancellationToken
            );

            return rowsAffected > 0;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToUpdateWorkflow("skip-backoff", workflowId, ex.Message, ex);
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
