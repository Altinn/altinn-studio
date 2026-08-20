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
        "workflow_dependency",
        "workflow_id",
        "depends_on_workflow_id",
        SchemaNames.Engine
    );

    private static readonly Func<NpgsqlConnection, IEnumerable<(Guid, Guid)>, CancellationToken, Task> _insertLinks =
        SqlBulkInserter.CreateForJoinTable("workflow_link", "workflow_id", "linked_workflow_id", SchemaNames.Engine);

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

            // The first act on mailbox state, and scoped to requests that are actually new: a receiver's whole
            // verdict — its position, any delivery already at it, and the mailbox's status — has to come from one
            // snapshot nobody can move underneath it. After the idempotency insert, because a replay consumes no
            // position and locking for one would stall the rest of the flush behind it.
            var mailboxes = await LockAndReadMailboxes(conn, requests, newRequestIndices, cancellationToken);

            var receiverPlan = PlanMailboxReceivers(
                requests,
                newRequestIndices,
                bulkInsertData,
                mailboxes,
                results,
                cancellationToken
            );

            if (receiverPlan.RejectedRequestIndices.Count > 0)
            {
                await ReleaseIdempotencyKeys(conn, requests, receiverPlan.RejectedRequestIndices, cancellationToken);
            }

            await BulkCopyNewWorkflows(conn, newRequestIndices, bulkInsertData, cancellationToken);

            await ProcessCollections(conn, requests, newRequestIndices, perRequestWorkflows, cancellationToken);

            await WriteMailboxReceivers(conn, receiverPlan, cancellationToken);

            await tx.CommitAsync(cancellationToken);

            receiverPlan.Births.Record();

            foreach (var i in newRequestIndices)
            {
                results[i] = BatchEnqueueResult.Created([.. perRequestWorkflows[i].Select(w => w.DatabaseId)]);
            }

            foreach (var (index, primaryIndex) in duplicates)
            {
                // An intra-batch duplicate normally classifies against the stored idempotency key. A duplicate of a
                // request the flush *refused* cannot: the flush released that key, so the primary's own verdict is
                // the only honest answer.
                if (results[primaryIndex] is { } primary && IsMailboxRejection(primary.Status))
                    results[index] = primary;
                else
                    existingRequestIndices.Add(index);
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
                            AS t(idempotency_key, namespace, request_body_hash, wf_id_text, created_at, idx)
                    ),
                    inserted AS (
                        INSERT INTO engine.idempotency_keys (idempotency_key, namespace, request_body_hash, workflow_ids, created_at)
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
        // Three requests sharing one (namespace, key) leave two intra-batch duplicates classifying against the
        // same stored row. Distinct() keeps the unnest a set, so the join cannot return that row per repeat.
        var (keys, namespaces) = existingRequestIndices
            .Select(i =>
                (requests[i].Metadata.IdempotencyKey, WorkflowNamespace.Normalize(requests[i].Metadata.Namespace))
            )
            .Distinct()
            .ToArray()
            .Unzip();

        var existingEntities = await dbContext
            .IdempotencyKeys.FromSql(
                $"""
                SELECT ik.*
                FROM unnest({keys}, {namespaces})
                    AS t(idempotency_key, namespace)
                JOIN engine.idempotency_keys ik USING (idempotency_key, namespace)
                """
            )
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        // Indexer rather than ToDictionary: a duplicate key here throws from inside the flush and fails every
        // unrelated caller batched into the same transaction. A repeated row carries the same stored values.
        var existingLookup = new Dictionary<(string Key, string Namespace), (byte[] Hash, Guid[] WorkflowIds)>();
        foreach (var entity in existingEntities)
            existingLookup[(entity.IdempotencyKey, entity.Namespace)] = (entity.RequestBodyHash, entity.WorkflowIds);

        foreach (var i in existingRequestIndices)
        {
            var req = requests[i];
            var compositeKey = (req.Metadata.IdempotencyKey, WorkflowNamespace.Normalize(req.Metadata.Namespace));
            if (existingLookup.TryGetValue(compositeKey, out var existing))
            {
                if (existing.Hash.AsSpan().SequenceEqual(req.RequestBodyHash))
                    results[i] = BatchEnqueueResult.Duplicate(existing.WorkflowIds);
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

    /// <summary>
    /// Removes requests that share a (namespace, idempotency key) with an earlier request in the same batch from
    /// <paramref name="indicesToCheck"/>, and returns each one paired with the index of the request it duplicates.
    /// The pairing matters because a request the flush refuses over its mailbox releases its key, so its
    /// intra-batch duplicates have to inherit its verdict rather than read a key that no longer exists.
    /// </summary>
    private static List<(int Index, int PrimaryIndex)> RemoveDuplicates(
        IReadOnlyList<BufferedEnqueueRequest> requests,
        List<int> indicesToCheck
    )
    {
        var duplicates = new List<(int Index, int PrimaryIndex)>();
        BufferedEnqueueRequest? previous = null;
        int previousKeptIndex = -1;
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
                duplicates.Add((index, previousKeptIndex));
                indicesToCheck.Remove(index);
            }
            else
            {
                previousKeptIndex = index;
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

    /// <summary>
    /// One mailbox's state, read under its row lock: everything a receiver's birth depends on and nothing else.
    /// Deliveries are gapless, so <c>seq &lt; NextIdx</c> is exactly "a delivery already sits at this receiver's
    /// position".
    /// </summary>
    private sealed record MailboxReceiverRow(string Namespace, bool IsDisposed, long NextIdx, long NextSeq);

    /// <summary>
    /// How many receivers a flush created in each of the three birth states, and how to publish that — after the
    /// commit, because a birth that rolled back is not a birth.
    /// </summary>
    private readonly record struct MailboxBirthCounts(long Delivered, long Closed, long Held)
    {
        public void Record()
        {
            if (Delivered > 0)
                Metrics.MailboxReceiversCreated.Add(Delivered, new KeyValuePair<string, object?>("birth", "delivered"));

            if (Closed > 0)
                Metrics.MailboxReceiversCreated.Add(Closed, new KeyValuePair<string, object?>("birth", "closed"));

            if (Held > 0)
                Metrics.MailboxReceiversCreated.Add(Held, new KeyValuePair<string, object?>("birth", "held"));
        }
    }

    /// <summary>
    /// One receiver's registration at the position the flush handed it. Exactly one of <c>HeldAt</c> and
    /// <c>ReleasedAt</c> is set: the receiver parked, or it was born runnable.
    /// </summary>
    private readonly record struct MailboxReceiverRegistration(
        Guid MailboxId,
        long Seq,
        Guid WorkflowId,
        DateTimeOffset? HeldAt,
        DateTimeOffset? ReleasedAt
    );

    /// <summary>
    /// What one flush decided about the mailbox receivers it was handed. <c>RejectedRequestIndices</c> are already
    /// out of the new-request set and already answered, but their idempotency keys must be released before commit.
    /// <c>Registrations</c> covers every receiver the flush created, not only the parked ones: the position is what
    /// the executor reads its delivery by.
    /// </summary>
    private sealed record MailboxReceiverPlan(
        List<int> RejectedRequestIndices,
        List<MailboxReceiverRegistration> Registrations,
        Dictionary<Guid, long> SeqAdvances,
        MailboxBirthCounts Births
    )
    {
        public static readonly MailboxReceiverPlan Empty = new([], [], [], default);
    }

    private static bool IsMailboxRejection(BatchEnqueueResultStatus status) =>
        status is BatchEnqueueResultStatus.MailboxNotFound or BatchEnqueueResultStatus.MailboxLogFull;

    /// <summary>
    /// Locks the row of every mailbox this batch declares a receiver for and reads the state their birth is decided
    /// from. The lock is what leaves only two interleavings between a delivery and its receiver's enqueue:
    /// delivery first, and this read sees a <c>next_idx</c> past the receiver's position, so it is born runnable;
    /// enqueue first, and its held registry row exists before the delivery can take the lock, so the wake finds it.
    /// Returns <c>null</c> when the batch declares no mailbox at all, which is what keeps the ordinary enqueue path
    /// free of mailbox statements — an empty dictionary means the named mailboxes do not exist and must be refused.
    /// </summary>
    private static async Task<Dictionary<Guid, MailboxReceiverRow>?> LockAndReadMailboxes(
        NpgsqlConnection conn,
        IReadOnlyList<BufferedEnqueueRequest> requests,
        List<int> validRequestIndices,
        CancellationToken cancellationToken
    )
    {
        SortedSet<Guid>? mailboxIds = null;
        foreach (var i in validRequestIndices)
        {
            foreach (var workflow in requests[i].Request.Workflows)
            {
                if (workflow.Mailbox is { } mailbox)
                    (mailboxIds ??= []).Add(mailbox.Id);
            }
        }

        if (mailboxIds is null)
            return null;

        var ids = mailboxIds.ToArray();

        // ORDER BY is what makes concurrent flushes take these rows in the same order and therefore unable to
        // deadlock each other.
        const string sql = """
            SELECT m.id, m.namespace, m.status, m.next_idx, m.next_seq
            FROM engine.mailboxes m
            WHERE m.id = ANY(@ids)
            ORDER BY m.id
            FOR UPDATE
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", ids));

        var rows = new Dictionary<Guid, MailboxReceiverRow>(ids.Length);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
#pragma warning disable CA1849, S6966 // Synchronous accessors are intentional - the row is buffered after ReadAsync
            rows[reader.GetGuid(0)] = new MailboxReceiverRow(
                Namespace: reader.GetString(1),
                IsDisposed: MailboxStatusMap.FromDbValue(reader.GetString(2)) == MailboxStatus.Disposed,
                NextIdx: reader.GetInt64(3),
                NextSeq: reader.GetInt64(4)
            );
#pragma warning restore CA1849, S6966
        }

        return rows;
    }

    /// <summary>
    /// Decides, for every mailbox receiver this flush is about to insert, the position it consumes and the state it
    /// is born in. A receiver is born <see cref="PersistentItemStatus.Enqueued"/> with its delivery when one
    /// already sits at its position; born <see cref="PersistentItemStatus.Enqueued"/> with the closing signal when
    /// the mailbox is closed; and born <see cref="PersistentItemStatus.Held"/> otherwise. The first case outranks
    /// the second, so a saga replaying after the deadline still drains the backlog it was promised. Positions fold
    /// sequentially in request order, and a request is refused whole or not at all.
    /// </summary>
    private MailboxReceiverPlan PlanMailboxReceivers(
        IReadOnlyList<BufferedEnqueueRequest> requests,
        List<int> newRequestIndices,
        BulkInsertData bulkInsertData,
        Dictionary<Guid, MailboxReceiverRow>? mailboxes,
        BatchEnqueueResult[] results,
        CancellationToken cancellationToken
    )
    {
        if (mailboxes is null)
            return MailboxReceiverPlan.Empty;

        var cap = settings.Value.MaxMailboxLogLength;

        // One clock read for the whole flush, from the engine's own time provider: these stamps are compared
        // against release and claim instants the engine writes.
        var now = timeProvider.GetUtcNow();
        var rejected = new List<int>();
        var registrations = new List<MailboxReceiverRegistration>();
        var advances = new Dictionary<Guid, long>(mailboxes.Count);
        long bornDelivered = 0;
        long bornClosed = 0;
        long bornHeld = 0;
        var pending = new List<(Guid MailboxId, long Seq, WorkflowEntity Entity)>();
        var reserved = new Dictionary<Guid, long>();

        foreach (var reqIdx in newRequestIndices)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var request = requests[reqIdx];
            var ns = WorkflowNamespace.Normalize(request.Metadata.Namespace);
            var workflowRequests = request.Request.Workflows;
            var entities = bulkInsertData.WorkflowEntities[reqIdx];

            pending.Clear();
            reserved.Clear();
            BatchEnqueueResult? rejection = null;

            for (int j = 0; j < workflowRequests.Count && rejection is null; j++)
            {
                if (workflowRequests[j].Mailbox is not { } declared)
                    continue;

                if (!mailboxes.TryGetValue(declared.Id, out var mailbox) || mailbox.Namespace != ns)
                {
                    rejection = BatchEnqueueResult.MailboxRejected(
                        BatchEnqueueResultStatus.MailboxNotFound,
                        $"Workflow '{workflowRequests[j].Ref ?? $"#{j}"}' declares mailbox {declared.Id}, "
                            + $"which does not exist in namespace '{ns}'."
                    );
                    continue;
                }

                var seq =
                    mailbox.NextSeq + advances.GetValueOrDefault(declared.Id) + reserved.GetValueOrDefault(declared.Id);

                if (seq >= cap)
                {
                    rejection = BatchEnqueueResult.MailboxRejected(
                        BatchEnqueueResultStatus.MailboxLogFull,
                        $"The receivers log of mailbox {declared.Id} already holds {seq} positions, maximum is {cap}."
                    );
                    continue;
                }

                pending.Add((declared.Id, seq, entities[j]));
                reserved[declared.Id] = reserved.GetValueOrDefault(declared.Id) + 1;
            }

            if (rejection is not null)
            {
                results[reqIdx] = rejection;
                rejected.Add(reqIdx);
                continue;
            }

            foreach (var (mailboxId, seq, entity) in pending)
            {
                var mailbox = mailboxes[mailboxId];
                var hasDelivery = seq < mailbox.NextIdx;

                if (hasDelivery || mailbox.IsDisposed)
                {
                    // Runnable at birth: its truth is already frozen. It still registers, because the position
                    // is what the executor reads its delivery by. Born released, never held, so no release
                    // statement can match it.
                    entity.Status = PersistentItemStatus.Enqueued;
                    registrations.Add(new MailboxReceiverRegistration(mailboxId, seq, entity.Id, null, now));

                    if (hasDelivery)
                        bornDelivered++;
                    else
                        bornClosed++;
                }
                else
                {
                    entity.Status = PersistentItemStatus.Held;
                    registrations.Add(new MailboxReceiverRegistration(mailboxId, seq, entity.Id, now, null));
                    bornHeld++;
                }

                advances[mailboxId] = advances.GetValueOrDefault(mailboxId) + 1;
            }
        }

        foreach (var reqIdx in rejected)
        {
            newRequestIndices.Remove(reqIdx);
        }

        return new MailboxReceiverPlan(
            rejected,
            registrations,
            advances,
            new MailboxBirthCounts(bornDelivered, bornClosed, bornHeld)
        );
    }

    /// <summary>
    /// Deletes the idempotency keys this transaction inserted for requests it then refused, so the same request may
    /// be made again once the reason for the refusal is gone.
    /// </summary>
    private static async Task ReleaseIdempotencyKeys(
        NpgsqlConnection conn,
        IReadOnlyList<BufferedEnqueueRequest> requests,
        List<int> requestIndices,
        CancellationToken cancellationToken
    )
    {
        var (keys, namespaces) = requestIndices
            .Select(i =>
                (requests[i].Metadata.IdempotencyKey, WorkflowNamespace.Normalize(requests[i].Metadata.Namespace))
            )
            .ToArray()
            .Unzip();

        const string sql = """
            DELETE FROM engine.idempotency_keys ik
            USING unnest(@keys, @namespaces) AS t(idempotency_key, namespace)
            WHERE ik.idempotency_key = t.idempotency_key AND ik.namespace = t.namespace
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.Add(new NpgsqlParameter<string[]>("keys", keys));
        cmd.Parameters.Add(new NpgsqlParameter<string[]>("namespaces", namespaces));
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <summary>
    /// Writes the rendezvous half of the flush: a registry row for every receiver the flush created, and the
    /// advance of each mailbox's receivers counter by the number of positions the flush consumed. The transaction
    /// is what makes the log gapless — every position handed out is written with the counter that consumed it, or
    /// not at all.
    /// </summary>
    private static async Task WriteMailboxReceivers(
        NpgsqlConnection conn,
        MailboxReceiverPlan plan,
        CancellationToken cancellationToken
    )
    {
        if (plan.SeqAdvances.Count == 0)
            return;

        var (mailboxIds, counts) = plan.SeqAdvances.Select(kvp => (kvp.Key, kvp.Value)).ToArray().Unzip();

        const string advanceSql = """
            UPDATE engine.mailboxes AS m
            SET next_seq = m.next_seq + v.n
            FROM unnest(@ids, @counts) AS v(id, n)
            WHERE m.id = v.id
            """;

        await using (var advanceCmd = new NpgsqlCommand(advanceSql, conn))
        {
            advanceCmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", mailboxIds));
            advanceCmd.Parameters.Add(new NpgsqlParameter<long[]>("counts", counts));
            await advanceCmd.ExecuteNonQueryAsync(cancellationToken);
        }

        if (plan.Registrations.Count == 0)
            return;

        var (registryMailboxIds, seqs, workflowIds, heldAt, releasedAt) = plan
            .Registrations.Select(r => (r.MailboxId, r.Seq, r.WorkflowId, r.HeldAt, r.ReleasedAt))
            .ToArray()
            .Unzip();

        const string registrySql = """
            INSERT INTO engine.mailbox_receivers (mailbox_id, seq, workflow_id, held_at, released_at, claimed_at)
            SELECT mailbox_id, seq, workflow_id, held_at, released_at, NULL
            FROM unnest(@mailbox_ids, @seqs, @workflow_ids, @held_at, @released_at)
                AS t(mailbox_id, seq, workflow_id, held_at, released_at)
            """;

        await using var registryCmd = new NpgsqlCommand(registrySql, conn);
        registryCmd.Parameters.Add(new NpgsqlParameter<Guid[]>("mailbox_ids", registryMailboxIds));
        registryCmd.Parameters.Add(new NpgsqlParameter<long[]>("seqs", seqs));
        registryCmd.Parameters.Add(new NpgsqlParameter<Guid[]>("workflow_ids", workflowIds));
        registryCmd.Parameters.Add(
            new NpgsqlParameter("held_at", NpgsqlDbType.Array | NpgsqlDbType.TimestampTz) { Value = heldAt }
        );
        registryCmd.Parameters.Add(
            new NpgsqlParameter("released_at", NpgsqlDbType.Array | NpgsqlDbType.TimestampTz) { Value = releasedAt }
        );
        await registryCmd.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <summary>
    /// Processes workflow collection updates for confirmed-new requests that have a CollectionKey.
    /// Seeds and then acquires FOR UPDATE locks on all affected collection rows in two small
    /// statements (after the heavy bulk COPY) so the first-writer path is serialized too.
    /// Handles same-batch merging: when multiple requests in the same flush target the same collection,
    /// they are folded sequentially in arrival order so the second request sees the heads left by the first.
    /// </summary>
    private async Task ProcessCollections(
        NpgsqlConnection conn,
        IReadOnlyList<BufferedEnqueueRequest> requests,
        List<int> newRequestIndices,
        Workflow[][] perRequestWorkflows,
        CancellationToken cancellationToken
    )
    {
        // Group new request indices by (collectionKey, namespace)
        var collectionGroups = new Dictionary<(string Key, string Ns), List<int>>();
        foreach (var reqIdx in newRequestIndices)
        {
            var request = requests[reqIdx];
            if (request.Metadata.CollectionKey is null)
            {
                continue;
            }

            var groupKey = (request.Metadata.CollectionKey, WorkflowNamespace.Normalize(request.Metadata.Namespace));
            if (!collectionGroups.TryGetValue(groupKey, out var group))
            {
                group = [];
                collectionGroups[groupKey] = group;
            }
            group.Add(reqIdx);
        }

        if (collectionGroups.Count == 0)
            return;

        var now = timeProvider.GetUtcNow();

        // 1. Seed and then lock all collection rows in one round-trip
        var allHeads = await LockAndReadCollectionHeads(conn, collectionGroups.Keys, now, cancellationToken);

        // 2. Compute head dep edges and new heads per collection
        var allHeadDepEdges = new List<(Guid, Guid)>();
        var upsertData = new List<(string Key, string Ns, Guid[] Heads)>(collectionGroups.Count);

        foreach (var ((collectionKey, ns), reqIndices) in collectionGroups)
        {
            var runningHeads = allHeads.GetValueOrDefault((collectionKey, ns), []);

            foreach (var reqIdx in reqIndices)
            {
                var req = requests[reqIdx].Request;
                var workflows = perRequestWorkflows[reqIdx];

                var headEdges = ComputeHeadDependencyEdges(req.Workflows, workflows, runningHeads);
                allHeadDepEdges.AddRange(headEdges);
                runningHeads = ComputeNewHeads(req.Workflows, workflows, runningHeads, headEdges);
            }

            upsertData.Add((collectionKey, ns, runningHeads));
        }

        // 3. Batch insert all head dependency edges in one round-trip
        if (allHeadDepEdges.Count > 0)
        {
            await _insertDependencies(conn, allHeadDepEdges, cancellationToken);
        }

        // 4. Batch upsert all collection heads in one round-trip
        await BatchUpdateCollectionHeads(conn, upsertData, now, cancellationToken);
    }

    /// <summary>
    /// Seeds multiple collection rows if needed, then locks them with SELECT ... FOR UPDATE and
    /// returns their current heads. Using one command keeps first-writer serialization without
    /// adding a second database round-trip.
    /// ORDER BY ensures consistent lock acquisition order to prevent deadlocks
    /// </summary>
    private static async Task<Dictionary<(string Key, string Ns), Guid[]>> LockAndReadCollectionHeads(
        NpgsqlConnection conn,
        Dictionary<(string, string), List<int>>.KeyCollection collectionKeys,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        var (keys, namespaces) = collectionKeys.ToArray().Unzip();

        const string sql = """
            INSERT INTO engine.workflow_collections (key, namespace, heads, created_at)
            SELECT key, namespace, ARRAY[]::uuid[], @now
            FROM unnest(@keys, @namespaces) AS t(key, namespace)
            ORDER BY key, namespace
            ON CONFLICT (key, namespace) DO NOTHING;

            SELECT wc.key, wc.namespace, wc.heads
            FROM unnest(@keys, @namespaces) AS t(key, namespace)
            JOIN engine.workflow_collections wc USING (key, namespace)
            ORDER BY wc.key, wc.namespace
            FOR UPDATE
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.Add(new NpgsqlParameter<string[]>("keys", keys));
        cmd.Parameters.Add(new NpgsqlParameter<string[]>("namespaces", namespaces));
        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));

        var result = new Dictionary<(string Key, string Ns), Guid[]>(collectionKeys.Count);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
#pragma warning disable CA1849, S6966 // Synchronous GetFieldValue is intentional - data is already buffered after ReadAsync
            var key = reader.GetString(0);
            var ns = reader.GetString(1);
            var heads = reader.GetFieldValue<Guid[]>(2);
#pragma warning restore CA1849, S6966
            result[(key, ns)] = heads;
        }

        return result;
    }

    /// <summary>
    /// Computes dependency edges to inject from root workflows to current collection heads.
    /// A "root" workflow is one with no intra-batch DependsOn refs that has DependsOnHeads = true.
    /// </summary>
    internal static List<(Guid WorkflowId, Guid DependsOnId)> ComputeHeadDependencyEdges(
        IReadOnlyList<WorkflowRequest> workflowRequests,
        Workflow[] workflows,
        Guid[] currentHeads
    )
    {
        var edges = new List<(Guid, Guid)>();

        if (currentHeads.Length == 0)
            return edges;

        for (int i = 0; i < workflowRequests.Count; i++)
        {
            var req = workflowRequests[i];

            if (!req.DependsOnHeads)
            {
                continue;
            }

            // A root workflow has no intra-batch DependsOn refs (external IDs are fine)
            bool hasIntraBatchDeps = req.DependsOn?.Any(d => d.IsRef) == true;
            if (hasIntraBatchDeps)
            {
                continue;
            }

            var wfId = workflows[i].DatabaseId;
            HashSet<Guid>? explicitCurrentHeadDeps = null;
            if (req.DependsOn is not null)
            {
                foreach (var dep in req.DependsOn)
                {
                    if (!dep.IsId || !currentHeads.Contains(dep.Id))
                    {
                        continue;
                    }

                    explicitCurrentHeadDeps ??= [];
                    explicitCurrentHeadDeps.Add(dep.Id);
                }
            }

            foreach (var headId in currentHeads)
            {
                if (explicitCurrentHeadDeps?.Contains(headId) == true)
                {
                    continue;
                }

                edges.Add((wfId, headId));
            }
        }

        return edges;
    }

    /// <summary>
    /// Computes the new collection heads after processing a request. Merges previous heads with new leaves:
    /// <list type="bullet">
    ///   <item>A previous head is "consumed" (removed) if a <em>visible</em> workflow depends on it — either via
    ///         injected head dependency edges or via an explicit DependsOn by database ID.</item>
    ///   <item>Workflows with <c>IsHead == false</c> are "invisible" — they are excluded from heads and their
    ///         dependency edges do not consume existing heads.</item>
    ///   <item>Unconsumed previous heads are retained.</item>
    ///   <item>New leaf workflows (not depended-on by other batch workflows) and <c>IsHead == true</c> overrides
    ///         are added. <c>IsHead == null</c> (default) uses natural leaf detection.</item>
    /// </list>
    /// </summary>
    internal static Guid[] ComputeNewHeads(
        IReadOnlyList<WorkflowRequest> workflowRequests,
        Workflow[] workflows,
        Guid[] currentHeads,
        List<(Guid WorkflowId, Guid DependsOnId)> headDepEdges
    )
    {
        // 1. Compute new leaf workflows from the batch
        var dependedOnRefs = new HashSet<string>();
        foreach (var req in workflowRequests)
        {
            if (req.DependsOn is null || req.IsHead == false)
            {
                continue;
            }

            foreach (var dep in req.DependsOn)
            {
                if (dep.IsRef)
                    dependedOnRefs.Add(dep.Ref);
            }
        }

        var newLeaves = new List<Guid>();
        for (int i = 0; i < workflowRequests.Count; i++)
        {
            var req = workflowRequests[i];
            var wfId = workflows[i].DatabaseId;

            // IsHead == false: force-exclude — invisible to collection head tracking
            if (req.IsHead == false)
                continue;

            // IsHead == true: force-include; IsHead == null: natural leaf detection
            if (req.IsHead == true || req.Ref is null || !dependedOnRefs.Contains(req.Ref))
            {
                newLeaves.Add(wfId);
            }
        }

        if (currentHeads.Length == 0)
            return [.. newLeaves];

        // 2. Build set of invisible workflow IDs (IsHead == false)
        var invisibleIds = new HashSet<Guid>();
        for (int i = 0; i < workflowRequests.Count; i++)
        {
            if (workflowRequests[i].IsHead == false)
                invisibleIds.Add(workflows[i].DatabaseId);
        }

        // 3. Compute consumed heads - heads that any visible workflow depends on
        var currentHeadSet = new HashSet<Guid>(currentHeads);
        var consumedHeads = new HashSet<Guid>();

        // From injected head dependency edges (skip invisible workflows)
        foreach (var (workflowId, dependsOnId) in headDepEdges)
        {
            if (!invisibleIds.Contains(workflowId) && currentHeadSet.Contains(dependsOnId))
                consumedHeads.Add(dependsOnId);
        }

        // From explicit DependsOn by database ID (skip invisible workflows)
        for (int i = 0; i < workflowRequests.Count; i++)
        {
            var req = workflowRequests[i];
            if (req.IsHead == false)
                continue;
            if (req.DependsOn is null)
                continue;
            foreach (var dep in req.DependsOn)
            {
                if (dep.IsId && currentHeadSet.Contains(dep.Id))
                    consumedHeads.Add(dep.Id);
            }
        }

        // 4. Merge: retained previous heads + new leaves
        var heads = new List<Guid>(currentHeads.Length + newLeaves.Count);
        foreach (var h in currentHeads)
        {
            if (!consumedHeads.Contains(h))
                heads.Add(h);
        }
        heads.AddRange(newLeaves);

        return [.. heads];
    }

    /// <summary>
    /// Batch-updates collection rows after the seed-and-lock step has guaranteed they exist.
    /// Uses the text[] → ::uuid[] cast pattern to avoid unsupported jagged Guid[][] parameters.
    /// </summary>
    private static async Task BatchUpdateCollectionHeads(
        NpgsqlConnection conn,
        List<(string Key, string Ns, Guid[] Heads)> collections,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        var keys = new string[collections.Count];
        var namespaces = new string[collections.Count];
        var headsTexts = new string[collections.Count];
        for (int i = 0; i < collections.Count; i++)
        {
            keys[i] = collections[i].Key;
            namespaces[i] = collections[i].Ns;
            headsTexts[i] = "{" + string.Join(",", collections[i].Heads) + "}";
        }

        const string sql = """
            UPDATE engine.workflow_collections AS wc
            SET heads = t.heads_text::uuid[],
                updated_at = @now
            FROM unnest(@keys, @namespaces, @heads_texts)
                AS t(key, namespace, heads_text)
            WHERE wc.key = t.key
              AND wc.namespace = t.namespace
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.Add(new NpgsqlParameter<string[]>("keys", keys));
        cmd.Parameters.Add(new NpgsqlParameter<string[]>("namespaces", namespaces));
        cmd.Parameters.Add(new NpgsqlParameter<string[]>("heads_texts", headsTexts));
        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
        var rowsAffected = await cmd.ExecuteNonQueryAsync(cancellationToken);
        if (rowsAffected != collections.Count)
        {
            throw new UnreachableException(
                $"Expected to update {collections.Count} workflow collections after seed-and-lock, but updated {rowsAffected}."
            );
        }
    }

    /// <inheritdoc/>
    public async Task<List<Workflow>> FetchAndLockWorkflows(int count, CancellationToken cancellationToken)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.FetchAndLockWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        var now = timeProvider.GetUtcNow();

        await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        // Fetch ready rows and stamp a LeaseToken in a single atomic UPDATE. Poisoned finalization
        // and stale reclaim run as separate sweeps in DbMaintenanceService — reclaimed rows
        // re-enter here as Enqueued.
        //
        // A pending cancellation bypasses the backoff gate: the handler cancels a flagged workflow
        // before executing anything. Without the bypass, a cancel accepted while the row still read
        // Processing (so RequestCancellation's backoff-clearing CASE did not fire) would sit behind
        // the subsequently written backoff — no lease means no watcher or sweep reaches it — for up
        // to the wait budget of a deferred step.
        //
        // The dependency gate is deliberately NOT bypassed: wrapping the NOT EXISTS in an OR turns
        // the planner's per-row anti-join into a hashed subplan over every dependency edge per fetch
        // cycle. A cancelled dependent therefore still waits for its dependency to settle.
        var ids = await context
            .Database.SqlQuery<Guid>(
                $"""
                WITH ready AS (
                    SELECT w.id
                    FROM engine.workflows w
                    WHERE w.status IN ({PersistentItemStatus.Enqueued}, {PersistentItemStatus.Requeued}, {PersistentItemStatus.Waiting})
                      AND (
                        w.backoff_until IS NULL
                        OR w.backoff_until <= {now}
                        OR w.cancellation_requested_at IS NOT NULL
                      )
                      AND NOT EXISTS (
                          SELECT 1 FROM engine.workflow_dependency wd
                          JOIN engine.workflows dep ON dep.id = wd.depends_on_workflow_id
                          WHERE wd.workflow_id = w.id
                            AND dep.status <> {PersistentItemStatus.Completed}
                            AND dep.status <> {PersistentItemStatus.Failed}
                            AND dep.status <> {PersistentItemStatus.DependencyFailed}
                            AND dep.status <> {PersistentItemStatus.Canceled}
                            AND dep.status <> {PersistentItemStatus.Abandoned}
                      )
                    ORDER BY w.backoff_until NULLS FIRST, w.created_at
                    FOR UPDATE SKIP LOCKED
                    LIMIT {count}
                ),
                updated AS (
                    UPDATE engine.workflows w
                    SET status       = {PersistentItemStatus.Processing},
                        updated_at   = {now},
                        heartbeat_at = {now},
                        lease_token  = gen_random_uuid()
                    FROM ready r
                    WHERE w.id = r.id
                    RETURNING w.id
                )
                SELECT id AS "Value" FROM updated
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

        await RecordWakeToClaimLatency(context, entities, now, cancellationToken);

        var workflows = entities.Select(x => x.ToDomainModel()).ToList();

        Metrics.DbOperationsSucceeded.Add(1);

        return workflows;
    }

    /// <summary>
    /// Records how long each just-claimed mailbox receiver waited between its release and this claim, and stamps
    /// the registry so no later claim of the same receiver is timed again. A batch of ordinary workflows returns
    /// before issuing any SQL. <c>claimed_at IS NULL</c> keeps the measurement once per release rather than once
    /// per retry attempt, and <c>held_at IS NOT NULL</c> keeps it about the wake: a receiver born runnable never
    /// waited, so its gap is an ordinary fetch cycle. The duration is clamped at zero because its two ends are
    /// read from two pods' clocks.
    /// </summary>
    private static async Task RecordWakeToClaimLatency(
        EngineDbContext context,
        List<WorkflowEntity> claimed,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        List<Guid>? receiverIds = null;
        foreach (var entity in claimed)
        {
            if (entity.MailboxId is not null)
                (receiverIds ??= []).Add(entity.Id);
        }

        if (receiverIds is null)
            return;

        var ids = receiverIds.ToArray();

        var releasedAt = await context
            .Database.SqlQuery<DateTimeOffset?>(
                $"""
                UPDATE engine.mailbox_receivers mr
                SET claimed_at = {now}
                WHERE mr.workflow_id = ANY({ids})
                  AND mr.released_at IS NOT NULL
                  AND mr.claimed_at IS NULL
                RETURNING CASE WHEN mr.held_at IS NOT NULL THEN mr.released_at END AS "Value"
                """
            )
            .ToListAsync(cancellationToken);

        foreach (var released in releasedAt)
        {
            if (released is { } releaseInstant)
                Metrics.MailboxReceiverWakeLatency.Record(Math.Max(0, (now - releaseInstant).TotalSeconds));
        }
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
                    // Clearing the backoff moves a parked (Requeued/Waiting) workflow to the front
                    // of the fetch order (backoff_until NULLS FIRST). Promptness does not depend on
                    // it: the fetch gate claims any row with a pending cancellation regardless of
                    // backoff, which also covers a cancel that lands before a write-back parks the
                    // row. Enqueued is excluded only because its backoff_until carries StartAt.
                    const string sql = """
                        UPDATE engine.workflows
                        SET cancellation_requested_at = @requestedAt,
                            updated_at = @now,
                            backoff_until = CASE WHEN status IN (@requeued, @waiting) THEN NULL ELSE backoff_until END
                        WHERE id = @id
                          AND namespace = @ns
                          AND status != ALL(@terminalStatuses)
                          AND cancellation_requested_at IS NULL
                        """;

                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("requestedAt", requestedAt));
                    cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
                    cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", workflowId));
                    cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));
                    cmd.Parameters.Add(new NpgsqlParameter<int[]>("terminalStatuses", terminalStatuses));
                    cmd.Parameters.Add(new NpgsqlParameter<int>("requeued", (int)PersistentItemStatus.Requeued));
                    cmd.Parameters.Add(new NpgsqlParameter<int>("waiting", (int)PersistentItemStatus.Waiting));
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
                        UPDATE engine.workflows w
                        SET heartbeat_at = @now
                        FROM unnest(@ids, @lease_tokens) AS i(id, lease_token)
                        WHERE w.id = i.id
                          AND w.lease_token = i.lease_token
                          AND w.status = @status
                          AND w.updated_at < @updatedBefore
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
                    var backoffDeadlines = new object[sorted.Count];
                    var engineTraceContexts = new object[sorted.Count];
                    var leaseTokens = new Guid[sorted.Count];

                    for (int i = 0; i < sorted.Count; i++)
                    {
                        var w = sorted[i].Workflow;
                        ids[i] = w.DatabaseId;
                        statuses[i] = (int)w.Status;
                        backoffDeadlines[i] = w.BackoffUntil.HasValue ? w.BackoffUntil.Value : DBNull.Value;
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
                        UPDATE engine.workflows AS w
                        SET status               = v.status,
                            updated_at           = @now,
                            backoff_until        = v.backoff_until,
                            heartbeat_at         = CASE WHEN v.status = @processing THEN @now ELSE NULL END,
                            lease_token          = CASE WHEN v.status = @processing THEN w.lease_token ELSE NULL END,
                            engine_trace_context = v.engine_trace_context
                        FROM (
                            SELECT *
                            FROM unnest(@ids, @statuses, @backoff_deadlines, @engine_trace_contexts, @lease_tokens)
                                AS t(id, status, backoff_until, engine_trace_context, lease_token)
                            ORDER BY t.id
                        ) AS v
                        WHERE w.id = v.id
                          AND w.lease_token = v.lease_token
                        RETURNING w.id
                        """;

                    await using (var cmd = new NpgsqlCommand(updateWorkflowsSql, conn, tx))
                    {
                        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", ids));
                        cmd.Parameters.Add(new NpgsqlParameter<int[]>("statuses", statuses));
                        cmd.Parameters.Add(
                            new NpgsqlParameter("backoff_deadlines", NpgsqlDbType.Array | NpgsqlDbType.TimestampTz)
                            {
                                Value = backoffDeadlines,
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
                        var stepDeferCounts = new int[allSteps.Count];
                        var stepFirstDeferredAt = new object[allSteps.Count];
                        var stepLastDeferredAt = new object[allSteps.Count];
                        var stepLastDeferReasons = new object[allSteps.Count];
                        var stepErrorHistories = new object[allSteps.Count];
                        var stepStateOuts = new object[allSteps.Count];
                        var stepEngineTraceContexts = new object[allSteps.Count];

                        for (int i = 0; i < allSteps.Count; i++)
                        {
                            var s = allSteps[i];
                            stepIds[i] = s.DatabaseId;
                            stepStatuses[i] = (int)s.Status;
                            stepRequeueCounts[i] = s.RequeueCount;
                            stepDeferCounts[i] = s.DeferCount;
                            stepFirstDeferredAt[i] = s.FirstDeferredAt.HasValue
                                ? s.FirstDeferredAt.Value
                                : DBNull.Value;
                            stepLastDeferredAt[i] = s.LastDeferredAt.HasValue ? s.LastDeferredAt.Value : DBNull.Value;
                            stepLastDeferReasons[i] = (object?)s.LastDeferReason ?? DBNull.Value;
                            stepErrorHistories[i] =
                                s.ErrorHistory.Count > 0
                                    ? JsonSerializer.Serialize(s.ErrorHistory, JsonOptions.Default)
                                    : DBNull.Value;
                            stepStateOuts[i] = (object?)s.StateOut ?? DBNull.Value;
                            stepEngineTraceContexts[i] = (object?)s.EngineTraceContext ?? DBNull.Value;
                        }

                        const string updateStepsSql = """
                            UPDATE engine.steps AS s
                            SET status               = v.status,
                                requeue_count        = v.requeue_count,
                                defer_count          = v.defer_count,
                                first_deferred_at    = v.first_deferred_at,
                                last_deferred_at     = v.last_deferred_at,
                                last_defer_reason    = v.last_defer_reason,
                                error_history        = v.error_history,
                                state_out            = v.state_out,
                                engine_trace_context = v.engine_trace_context,
                                updated_at           = @now
                            FROM (
                                SELECT *
                                FROM unnest(@ids, @statuses, @requeue_counts, @defer_counts, @first_deferred_at, @last_deferred_at, @last_defer_reasons, @error_histories, @engine_trace_contexts, @state_outs)
                                    AS t(id, status, requeue_count, defer_count, first_deferred_at, last_deferred_at, last_defer_reason, error_history, engine_trace_context, state_out)
                                ORDER BY t.id
                            ) AS v
                            WHERE s.id = v.id
                            """;

                        await using var cmd = new NpgsqlCommand(updateStepsSql, conn, tx);
                        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", stepIds));
                        cmd.Parameters.Add(new NpgsqlParameter<int[]>("statuses", stepStatuses));
                        cmd.Parameters.Add(new NpgsqlParameter<int[]>("requeue_counts", stepRequeueCounts));
                        cmd.Parameters.Add(new NpgsqlParameter<int[]>("defer_counts", stepDeferCounts));
                        cmd.Parameters.Add(
                            new NpgsqlParameter("first_deferred_at", NpgsqlDbType.Array | NpgsqlDbType.TimestampTz)
                            {
                                Value = stepFirstDeferredAt,
                            }
                        );
                        cmd.Parameters.Add(
                            new NpgsqlParameter("last_deferred_at", NpgsqlDbType.Array | NpgsqlDbType.TimestampTz)
                            {
                                Value = stepLastDeferredAt,
                            }
                        );
                        cmd.Parameters.Add(
                            new NpgsqlParameter("last_defer_reasons", NpgsqlDbType.Array | NpgsqlDbType.Text)
                            {
                                Value = stepLastDeferReasons,
                            }
                        );
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

                    // Reset from terminal + Requeued/Waiting (both skip the backoff wait). Clearing
                    // LeaseToken preserves the "NOT NULL iff Processing" invariant.
                    const string resetPrimarySql = """
                        UPDATE engine.workflows
                        SET status = @enqueued,
                            cancellation_requested_at = NULL,
                            backoff_until = NULL,
                            heartbeat_at = NULL,
                            lease_token = NULL,
                            reclaim_count = 0,
                            updated_at = @now
                        WHERE id = @id
                          AND namespace = @ns
                          AND status IN (@failed, @canceled, @depFailed, @requeued, @abandoned, @waiting)
                        RETURNING id
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
                        cmd.Parameters.Add(new NpgsqlParameter<int>("abandoned", (int)PersistentItemStatus.Abandoned));
                        cmd.Parameters.Add(new NpgsqlParameter<int>("waiting", (int)PersistentItemStatus.Waiting));
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
                                SELECT wd.workflow_id AS id
                                FROM engine.workflow_dependency wd
                                JOIN engine.workflows w ON w.id = wd.workflow_id
                                WHERE wd.depends_on_workflow_id = @id
                                  AND w.status = @depFailed
                                UNION
                                SELECT wd.workflow_id
                                FROM engine.workflow_dependency wd
                                JOIN engine.workflows w ON w.id = wd.workflow_id
                                JOIN dependents d ON wd.depends_on_workflow_id = d.id
                                WHERE w.status = @depFailed
                            )
                            UPDATE engine.workflows w
                            SET status = @enqueued,
                                cancellation_requested_at = NULL,
                                backoff_until = NULL,
                                heartbeat_at = NULL,
                                lease_token = NULL,
                                reclaim_count = 0,
                                updated_at = @now
                            FROM dependents d
                            WHERE w.id = d.id
                            RETURNING w.id
                            """;
                        await using var cmd = new NpgsqlCommand(cascadeSql, conn, tx);
                        cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", workflowId));
                        cmd.Parameters.Add(
                            new NpgsqlParameter<int>("depFailed", (int)PersistentItemStatus.DependencyFailed)
                        );
                        cmd.Parameters.Add(new NpgsqlParameter<int>("enqueued", (int)PersistentItemStatus.Enqueued));
                        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", resumedAt));

                        await using var reader = await cmd.ExecuteReaderAsync(ct);
                        while (await reader.ReadAsync(ct))
                            resumedIds.Add(reader.GetGuid(0));
                    }

                    // Reset non-completed steps for all resumed workflows
                    const string resetStepsSql = """
                        UPDATE engine.steps
                        SET status = @enqueued,
                            requeue_count = 0,
                            defer_count = 0,
                            first_deferred_at = NULL,
                            last_deferred_at = NULL,
                            last_defer_reason = NULL,
                            updated_at = @now
                        WHERE job_id = ANY(@ids)
                          AND status != @completed
                        """;
                    await using (var cmd = new NpgsqlCommand(resetStepsSql, conn, tx))
                    {
                        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", [.. resumedIds]));
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
    public async Task<bool> ClearBackoff(Guid workflowId, string ns, CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.ClearBackoff");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            int rowsAffected = 0;
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);

                    const string sql = """
                        UPDATE engine.workflows
                        SET backoff_until = NULL, updated_at = @now
                        WHERE id = @id AND namespace = @ns AND status IN (@requeued, @waiting) AND backoff_until IS NOT NULL
                        """;
                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", workflowId));
                    cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));
                    cmd.Parameters.Add(new NpgsqlParameter<int>("requeued", (int)PersistentItemStatus.Requeued));
                    cmd.Parameters.Add(new NpgsqlParameter<int>("waiting", (int)PersistentItemStatus.Waiting));
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
            logger.FailedToUpdateWorkflow("clear-backoff", workflowId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<bool> AbandonWorkflow(
        Guid workflowId,
        string ns,
        DateTimeOffset abandonedAt,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.AbandonWorkflow");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            int rowsAffected = 0;
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);

                    // Compare-and-set from the unsuccessful terminal states only. A concurrent resume
                    // moves the row out of the source set and this becomes a no-op — the caller must
                    // re-read and re-decide rather than write off a workflow that is running again.
                    //
                    // The released_keys CTE atomically releases the enqueue fingerprint: abandoned
                    // means the action may be retried, so replaying the request that created this
                    // workflow must enqueue a fresh one instead of deduplicating onto the write-off.
                    // For a batch enqueue the key covers the whole batch — abandoning any member
                    // releases the fingerprint for all of them. The DELETE joins the CAS result, so
                    // it only fires when this statement performed the transition (concurrent abandons
                    // race on the CAS, exactly one releases the key). The unindexed @> containment
                    // scan is fine: abandon is a rare operator/supersede action and the key table is
                    // bounded by retention.
                    const string sql = """
                        WITH abandoned AS (
                            UPDATE engine.workflows
                            SET status = @abandoned, updated_at = @now
                            WHERE id = @id
                              AND namespace = @ns
                              AND status IN (@failed, @canceled, @depFailed)
                            RETURNING id, namespace
                        ),
                        released_keys AS (
                            DELETE FROM engine.idempotency_keys ik
                            USING abandoned a
                            WHERE ik.namespace = a.namespace
                              AND ik.workflow_ids @> ARRAY[a.id]
                        )
                        SELECT count(*)::int FROM abandoned
                        """;
                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", workflowId));
                    cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));
                    cmd.Parameters.Add(new NpgsqlParameter<int>("abandoned", (int)PersistentItemStatus.Abandoned));
                    cmd.Parameters.Add(new NpgsqlParameter<int>("failed", (int)PersistentItemStatus.Failed));
                    cmd.Parameters.Add(new NpgsqlParameter<int>("canceled", (int)PersistentItemStatus.Canceled));
                    cmd.Parameters.Add(
                        new NpgsqlParameter<int>("depFailed", (int)PersistentItemStatus.DependencyFailed)
                    );
                    cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", abandonedAt));
                    rowsAffected = (int)(await cmd.ExecuteScalarAsync(ct) ?? 0);

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
            logger.FailedToUpdateWorkflow("abandon", workflowId, ex.Message, ex);
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
