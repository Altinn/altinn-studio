using Npgsql;
using NpgsqlTypes;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Data.Repository;

internal sealed partial class EngineRepository
{
    private const string MailboxColumns = """
        m.id, m.namespace, m.idempotency_key, m.collection_key, m.timeout, m.deadline,
        m.status, m.disposed_reason, m.next_idx, m.next_seq, m.created_at, m.disposed_at
        """;

    /// <summary>The delivery columns every delivery read projects. <c>payload</c> is deliberately absent.</summary>
    private const string MailboxDeliveryColumns = "d.mailbox_id, d.idx, d.idempotency_key, d.accepted_at";

    /// <summary>
    /// The one statement that releases parked receivers: the wake passes a position, the closure release passes
    /// <c>null</c>. One statement so the status transition and the <c>released_at</c> stamp cannot diverge.
    /// </summary>
    private const string ReleaseMailboxReceiversSql = """
        WITH released AS (
            UPDATE engine.workflows AS w
            SET status = @enqueued,
                backoff_until = NULL,
                updated_at = @now
            FROM engine.mailbox_receivers AS mr
            WHERE mr.mailbox_id = @mailbox_id
              AND (@seq IS NULL OR mr.seq = @seq)
              AND mr.released_at IS NULL
              AND w.id = mr.workflow_id
              AND w.status = @held
            RETURNING w.id
        )
        UPDATE engine.mailbox_receivers AS mr
        SET released_at = @now
        FROM released
        WHERE mr.workflow_id = released.id
        """;

    private static async Task<int> ReleaseMailboxReceivers(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid mailboxId,
        long? seq,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        await using var cmd = new NpgsqlCommand(ReleaseMailboxReceiversSql, conn, tx);
        cmd.Parameters.Add(new NpgsqlParameter<Guid>("mailbox_id", mailboxId));
        cmd.Parameters.Add(
            new NpgsqlParameter("seq", NpgsqlDbType.Bigint) { Value = seq.HasValue ? seq.Value : DBNull.Value }
        );
        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
        cmd.Parameters.Add(new NpgsqlParameter<int>("enqueued", (int)PersistentItemStatus.Enqueued));
        cmd.Parameters.Add(new NpgsqlParameter<int>("held", (int)PersistentItemStatus.Held));
        return await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<bool> ReleaseReceiverAt(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid mailboxId,
        long seq,
        DateTimeOffset now,
        CancellationToken cancellationToken
    ) => await ReleaseMailboxReceivers(conn, tx, mailboxId, seq, now, cancellationToken) > 0;

    private static Task<int> ReleaseAllParkedReceivers(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid mailboxId,
        DateTimeOffset now,
        CancellationToken cancellationToken
    ) => ReleaseMailboxReceivers(conn, tx, mailboxId, seq: null, now, cancellationToken);

    /// <summary>
    /// Issued inside the releasing transaction: PostgreSQL queues the <c>NOTIFY</c> until commit, and a separate
    /// post-commit statement could fail and make <see cref="ExecuteWithRetry"/> re-run the whole delegate.
    /// </summary>
    private static async Task NotifyStatusChanged(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        CancellationToken cancellationToken
    )
    {
        await using var cmd = new NpgsqlCommand("NOTIFY status_changed", conn, tx);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <summary>
    /// The mint. <c>existing</c> is consulted first so a replay is answered even at the collection cap, and
    /// <c>ON CONFLICT DO UPDATE</c> hands a losing racer the winner's row instead of nothing. Hoisted so
    /// <c>QueryPlanTests</c> can <c>EXPLAIN</c> the statement the mint actually issues.
    /// </summary>
    internal const string MintMailboxSql = $"""
        WITH existing AS (
            SELECT {MailboxColumns}
            FROM engine.mailboxes m
            WHERE m.namespace = @ns AND m.idempotency_key = @key
        ),
        open_count AS (
            SELECT count(*)::int AS n
            FROM engine.mailboxes m
            WHERE m.namespace = @ns
              AND m.collection_key = @collection_key
              AND m.status = '{MailboxStatusMap.Open}'
        ),
        inserted AS (
            INSERT INTO engine.mailboxes AS m (
                id, namespace, idempotency_key, collection_key, timeout, deadline,
                next_idx, next_seq, status, disposed_reason, created_at, disposed_at
            )
            SELECT @id, @ns, @key, @collection_key, @timeout, @deadline,
                   0, 0, '{MailboxStatusMap.Open}', NULL, @now, NULL
            WHERE NOT EXISTS (SELECT 1 FROM existing)
              AND (@collection_key IS NULL OR (SELECT n FROM open_count) < @cap)
            ON CONFLICT (namespace, idempotency_key) DO UPDATE
                SET namespace = EXCLUDED.namespace
            RETURNING {MailboxColumns}
        )
        SELECT * FROM inserted
        UNION ALL
        SELECT * FROM existing
        """;

    /// <inheritdoc/>
    public async Task<MailboxMintResult> MintMailbox(
        Guid mailboxId,
        string ns,
        string idempotencyKey,
        string? collectionKey,
        TimeSpan timeout,
        DateTimeOffset now,
        int maxOpenPerCollection,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.MintMailbox");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            ns = WorkflowNamespace.Normalize(ns);

            MailboxMintResult result = new MailboxMintResult.AtCollectionCapacity();
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);

                    await using var cmd = new NpgsqlCommand(MintMailboxSql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
                    cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));
                    cmd.Parameters.Add(new NpgsqlParameter<string>("key", idempotencyKey));
                    cmd.Parameters.Add(
                        new NpgsqlParameter("collection_key", (object?)collectionKey ?? DBNull.Value)
                        {
                            NpgsqlDbType = NpgsqlDbType.Varchar,
                        }
                    );
                    cmd.Parameters.Add(new NpgsqlParameter<TimeSpan>("timeout", timeout));
                    cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("deadline", now + timeout));
                    cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
                    cmd.Parameters.Add(new NpgsqlParameter<int>("cap", maxOpenPerCollection));

                    await using var reader = await cmd.ExecuteReaderAsync(ct);
                    if (!await reader.ReadAsync(ct))
                    {
                        result = new MailboxMintResult.AtCollectionCapacity();
                        return;
                    }

                    var mailbox = ReadMailbox(reader);
                    result =
                        mailbox.Id == mailboxId
                            ? new MailboxMintResult.Minted(mailbox)
                            : new MailboxMintResult.Existing(mailbox);
                },
                cancellationToken
            );

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedMailboxOperation("mint", mailboxId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<MailboxResponse?> GetMailbox(
        Guid mailboxId,
        string ns,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetMailbox");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            ns = WorkflowNamespace.Normalize(ns);

            MailboxResponse? mailbox = null;
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);

                    const string sql = $"""
                        SELECT {MailboxColumns}
                        FROM engine.mailboxes m
                        WHERE m.id = @id AND m.namespace = @ns
                        """;

                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
                    cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));

                    await using var reader = await cmd.ExecuteReaderAsync(ct);
                    mailbox = await reader.ReadAsync(ct) ? ReadMailbox(reader) : null;
                },
                cancellationToken
            );

            return mailbox;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedMailboxOperation("get", mailboxId, ex.Message, ex);
            throw;
        }
    }

    /// <summary>
    /// The dashboard's read. The limit is per collection — one <c>LATERAL</c> per key, so one busy collection
    /// cannot starve the rest — with one extra row per key so a truncated window is distinguishable from a full
    /// one. Hoisted so <c>QueryPlanTests</c> can <c>EXPLAIN</c> it.
    /// </summary>
    internal const string SelectMailboxesForCollectionsSql = $"""
        WITH picked AS (
            SELECT p.*
            FROM (SELECT DISTINCT unnest(@collection_keys) AS collection_key) k
            CROSS JOIN LATERAL (
                SELECT {MailboxColumns}
                FROM engine.mailboxes m
                WHERE m.collection_key = k.collection_key
                  AND (@ns IS NULL OR m.namespace = @ns)
                ORDER BY m.created_at DESC, m.id
                LIMIT @per_collection
            ) p
        )
        SELECT {MailboxColumns},
               pos.position, pos.idempotency_key, pos.accepted_at,
               pos.workflow_id, pos.held_at, pos.released_at, pos.claimed_at
        FROM picked m
        LEFT JOIN LATERAL (
            SELECT COALESCE(d.idx, r.seq) AS position,
                   d.idempotency_key, d.accepted_at,
                   r.workflow_id, r.held_at, r.released_at, r.claimed_at
            FROM (
                SELECT idx, idempotency_key, accepted_at
                FROM engine.mailbox_deliveries
                WHERE mailbox_id = m.id
            ) d
            FULL JOIN (
                SELECT seq, workflow_id, held_at, released_at, claimed_at
                FROM engine.mailbox_receivers
                WHERE mailbox_id = m.id
            ) r ON r.seq = d.idx
        ) pos ON TRUE
        ORDER BY m.created_at DESC, m.id, pos.position
        """;

    /// <inheritdoc/>
    public async Task<MailboxCollectionPage> GetMailboxesForCollections(
        string? ns,
        IReadOnlyList<string> collectionKeys,
        int limitPerCollection,
        CancellationToken cancellationToken = default
    )
    {
        if (collectionKeys.Count == 0 || limitPerCollection <= 0)
            return MailboxCollectionPage.Empty;

        using var activity = Metrics.Source.StartActivity("EngineRepository.GetMailboxesForCollections");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            string? nsFilter = ns is null ? null : WorkflowNamespace.Normalize(ns);

            var snapshots = new List<MailboxSnapshot>();
            await ExecuteWithRetry(
                async ct =>
                {
                    snapshots.Clear();

                    await using var conn = await dataSource.OpenConnectionAsync(ct);

                    await using var cmd = new NpgsqlCommand(SelectMailboxesForCollectionsSql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<string[]>("collection_keys", [.. collectionKeys]));
                    cmd.Parameters.Add(
                        new NpgsqlParameter("ns", NpgsqlDbType.Varchar)
                        {
                            Value = nsFilter is null ? DBNull.Value : nsFilter,
                        }
                    );

                    // One more than the caller's limit, so truncation is detectable.
                    cmd.Parameters.Add(new NpgsqlParameter<int>("per_collection", limitPerCollection + 1));

                    await using var reader = await cmd.ExecuteReaderAsync(ct);
                    await ReadMailboxSnapshots(reader, snapshots, ct);
                },
                cancellationToken
            );

            return TrimToPerCollectionLimit(snapshots, collectionKeys, limitPerCollection);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedMailboxRead("read the mailboxes of a collection", ex.Message, ex);
            throw;
        }
    }

    private static MailboxCollectionPage TrimToPerCollectionLimit(
        List<MailboxSnapshot> snapshots,
        IReadOnlyList<string> collectionKeys,
        int limitPerCollection
    )
    {
        var seenPerCollection = new Dictionary<string, int>(StringComparer.Ordinal);
        var kept = new List<MailboxSnapshot>(snapshots.Count);
        HashSet<string>? truncated = null;

        foreach (var snapshot in snapshots)
        {
            // Never null in practice — every row matched a key equality — but the column is nullable.
            var key = snapshot.Mailbox.CollectionKey ?? string.Empty;
            seenPerCollection.TryGetValue(key, out var seen);
            seenPerCollection[key] = seen + 1;

            if (seen < limitPerCollection)
                kept.Add(snapshot);
            else if (seen == limitPerCollection)
                (truncated ??= new HashSet<string>(StringComparer.Ordinal)).Add(key);
        }

        if (truncated is null)
            return new MailboxCollectionPage(kept, []);

        return new MailboxCollectionPage(
            kept,
            [.. collectionKeys.Distinct(StringComparer.Ordinal).Where(truncated.Contains)]
        );
    }

    /// <summary>
    /// The gauge's read: open mailboxes past <c>@cutoff</c>, saturating at <c>@limit</c>. Deliberately the
    /// sweep's own predicate, so the two cannot drift apart on what "overdue" means.
    /// </summary>
    internal const string CountOverdueOpenMailboxesSql = $"""
        SELECT count(*)
        FROM (
            SELECT 1
            FROM engine.mailboxes m
            WHERE m.status = '{MailboxStatusMap.Open}'
              AND m.deadline <= @cutoff
            LIMIT @limit
        ) capped
        """;

    /// <inheritdoc/>
    public async Task<long> CountOverdueOpenMailboxes(
        DateTimeOffset cutoff,
        int limit,
        CancellationToken cancellationToken = default
    )
    {
        if (limit <= 0)
            return 0;

        using var activity = Metrics.Source.StartActivity("EngineRepository.CountOverdueOpenMailboxes");
        activity?.DontRecord();
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            long count = 0;
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);

                    await using var cmd = new NpgsqlCommand(CountOverdueOpenMailboxesSql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("cutoff", cutoff));
                    cmd.Parameters.Add(new NpgsqlParameter<int>("limit", limit));

                    count = (long)(await cmd.ExecuteScalarAsync(ct) ?? 0L);
                },
                cancellationToken
            );

            return count;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedMailboxRead("count the mailboxes open past their deadline", ex.Message, ex);
            throw;
        }
    }

    /// <summary>
    /// The executor's read of the rendezvous. No lock and no write: delivery existence at the position is frozen
    /// before the receiver can run. One statement so a concurrent close cannot launder a genuine
    /// <see cref="MailboxReceiptResult.Undecided"/> into an ordinary closing signal.
    /// </summary>
    public async Task<MailboxReceiptResult> ReadMailboxReceipt(
        Guid workflowId,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.ReadMailboxReceipt");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            MailboxReceiptResult result = new MailboxReceiptResult.Unregistered();
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);

                    const string sql = """
                        SELECT mr.mailbox_id, mr.seq, m.status, m.disposed_reason,
                               d.idempotency_key, d.payload, d.accepted_at
                        FROM engine.mailbox_receivers mr
                        JOIN engine.mailboxes m ON m.id = mr.mailbox_id
                        LEFT JOIN engine.mailbox_deliveries d
                               ON d.mailbox_id = mr.mailbox_id AND d.idx = mr.seq
                        WHERE mr.workflow_id = @workflow_id
                        """;

                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<Guid>("workflow_id", workflowId));

                    await using var reader = await cmd.ExecuteReaderAsync(ct);
                    result = await reader.ReadAsync(ct)
                        ? ReadMailboxReceipt(reader)
                        : new MailboxReceiptResult.Unregistered();
                },
                cancellationToken
            );

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedMailboxReceiptRead(workflowId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<MailboxCloseResult> CloseMailbox(
        Guid mailboxId,
        string ns,
        MailboxDisposedReason reason,
        DateTimeOffset now,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.CloseMailbox");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            ns = WorkflowNamespace.Normalize(ns);

            MailboxCloseResult result = new MailboxCloseResult.NotFound();
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);
                    await using var tx = await conn.BeginTransactionAsync(ct);

                    // The mailbox row lock is this transaction's first act.
                    const string lockSql = $"""
                        SELECT {MailboxColumns}
                        FROM engine.mailboxes m
                        WHERE m.id = @id AND m.namespace = @ns
                        FOR UPDATE
                        """;

                    MailboxResponse? locked;
                    await using (var lockCmd = new NpgsqlCommand(lockSql, conn, tx))
                    {
                        lockCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
                        lockCmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));

                        await using var reader = await lockCmd.ExecuteReaderAsync(ct);
                        locked = await reader.ReadAsync(ct) ? ReadMailbox(reader) : null;
                    }

                    if (locked is null)
                    {
                        await tx.RollbackAsync(ct);
                        result = new MailboxCloseResult.NotFound();
                        return;
                    }

                    result = await CloseLockedMailbox(conn, tx, locked, reason, now, ct);

                    await tx.CommitAsync(ct);
                },
                cancellationToken
            );

            result.Record();

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedMailboxOperation("close", mailboxId, ex.Message, ex);
            throw;
        }
    }

    /// <summary>
    /// Closes a mailbox whose row the caller already locked and read. Split from <see cref="CloseMailbox"/> so
    /// the deadline sweep can run the identical routine under its own claim; releasing under the same lock keeps
    /// a concurrent enqueue from parking a receiver on a closed mailbox.
    /// </summary>
    private static async Task<MailboxCloseResult> CloseLockedMailbox(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        MailboxResponse locked,
        MailboxDisposedReason reason,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        // First close wins: the replay reports the original disposal and releases nothing.
        if (locked.Status == MailboxStatus.Disposed)
            return new MailboxCloseResult.AlreadyClosed(locked);

        const string closeSql = $"""
            UPDATE engine.mailboxes AS m
            SET status = '{MailboxStatusMap.Disposed}',
                disposed_reason = @reason,
                disposed_at = @now
            WHERE m.id = @id
            RETURNING {MailboxColumns}
            """;

        MailboxResponse closed;
        await using (var closeCmd = new NpgsqlCommand(closeSql, conn, tx))
        {
            closeCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", locked.Id));
            closeCmd.Parameters.Add(new NpgsqlParameter<string>("reason", MailboxStatusMap.ToDbValue(reason)));
            closeCmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));

            await using var reader = await closeCmd.ExecuteReaderAsync(cancellationToken);

            // Unreachable: we hold this row's lock. Kept as a loud failure rather than a silent NotFound.
            if (!await reader.ReadAsync(cancellationToken))
                throw new InvalidOperationException($"Mailbox {locked.Id} vanished while its row lock was held.");

            closed = ReadMailbox(reader);
        }

        var released = await ReleaseAllParkedReceivers(conn, tx, locked.Id, now, cancellationToken);

        if (released > 0)
            await NotifyStatusChanged(conn, tx, cancellationToken);

        return new MailboxCloseResult.Closed(closed, new MailboxReleaseCounts(Delivered: 0, Closed: released));
    }

    /// <summary>
    /// <c>FOR UPDATE</c> is the row lock <see cref="CloseLockedMailbox"/> requires; <c>SKIP LOCKED</c> leaves a
    /// held mailbox for the next tick. The predicates are re-evaluated against the locked row.
    /// </summary>
    private const string ClaimOverdueMailboxSql = $"""
        SELECT {MailboxColumns}
        FROM engine.mailboxes m
        WHERE m.id = @id
          AND m.status = '{MailboxStatusMap.Open}'
          AND m.deadline <= @now
        FOR UPDATE SKIP LOCKED
        """;

    /// <inheritdoc/>
    public async Task<MailboxSweepResult> SweepOverdueMailboxes(
        DateTimeOffset now,
        int batchSize,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.SweepOverdueMailboxes");
        activity?.DontRecord();

        var candidates = await SelectOverdueMailboxCandidates(now, batchSize, cancellationToken);
        if (candidates.Count == 0)
            return default;

        activity?.Record();
        activity?.SetTag("mailboxes.overdue", candidates.Count);

        var result = new MailboxSweepResult();
        foreach (var mailboxId in candidates)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                result += await CloseOverdueMailbox(mailboxId, now, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                // Per-mailbox isolation: the failed close rolled back and is claimable next tick. Escaping would
                // abandon the batch — and the deadline-ordered scan would put the same mailbox first again.
                result = result with
                {
                    Failed = result.Failed + 1,
                };

                // Tagged apart from the sweep pass's own failures: the two want opposite operator responses.
                Metrics.Errors.Add(1, ("operation", "mailboxDeadlineClose"));
                logger.FailedMailboxOperation("close at its deadline", mailboxId, ex.Message, ex);
            }
        }

        return result;
    }

    /// <summary>Hoisted so <c>QueryPlanTests</c> can <c>EXPLAIN</c> the statement the sweep issues.</summary>
    internal const string SelectOverdueMailboxCandidatesSql = $"""
        SELECT m.id
        FROM engine.mailboxes m
        WHERE m.status = '{MailboxStatusMap.Open}'
          AND m.deadline <= @now
        ORDER BY m.deadline
        LIMIT @batch_size
        """;

    /// <summary>Takes no locks: each candidate is claimed under its own transaction below.</summary>
    private async Task<List<Guid>> SelectOverdueMailboxCandidates(
        DateTimeOffset now,
        int batchSize,
        CancellationToken cancellationToken
    )
    {
        using var slot = await limiter.AcquireDbSlot(cancellationToken: cancellationToken);

        var candidates = new List<Guid>();
        await ExecuteWithRetry(
            async ct =>
            {
                candidates.Clear();

                await using var conn = await dataSource.OpenConnectionAsync(ct);

                await using var cmd = new NpgsqlCommand(SelectOverdueMailboxCandidatesSql, conn);
                cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
                cmd.Parameters.Add(new NpgsqlParameter<int>("batch_size", batchSize));

                await using var reader = await cmd.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
#pragma warning disable CA1849, S6966 // The row is already buffered
                    candidates.Add(reader.GetGuid(0));
#pragma warning restore CA1849, S6966
                }
            },
            cancellationToken
        );

        return candidates;
    }

    /// <summary>
    /// One overdue close, in its own transaction, running exactly the routine <c>DELETE</c> runs. No
    /// <see cref="ExecuteWithRetry"/>: the sweep's cadence is its retry.
    /// </summary>
    private async Task<MailboxSweepResult> CloseOverdueMailbox(
        Guid mailboxId,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        using var slot = await limiter.AcquireDbSlot(cancellationToken: cancellationToken);

        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        MailboxResponse? claimed;
        await using (var claimCmd = new NpgsqlCommand(ClaimOverdueMailboxSql, conn, tx))
        {
            claimCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
            claimCmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));

            await using var reader = await claimCmd.ExecuteReaderAsync(cancellationToken);
            claimed = await reader.ReadAsync(cancellationToken) ? ReadMailbox(reader) : null;
        }

        if (claimed is null)
        {
            await tx.RollbackAsync(cancellationToken);
            return default;
        }

        var result = await CloseLockedMailbox(
            conn,
            tx,
            claimed,
            MailboxDisposedReason.Deadline,
            now,
            cancellationToken
        );

        await tx.CommitAsync(cancellationToken);

        result.Record();

        if (result is not MailboxCloseResult.Closed closed)
            return default;

        // The sweep's alone to publish: a mailbox that aged out has no caller to report the number to.
        var unconsumed = closed.Mailbox.UnconsumedDeliveries;
        if (unconsumed > 0)
        {
            Metrics.MailboxDeliveriesUnconsumed.Add(unconsumed);
            logger.MailboxClosedWithUnconsumedDeliveries(mailboxId, unconsumed);
        }

        return new MailboxSweepResult(
            Closed: 1,
            ReceiversReleased: closed.Released.Closed,
            UnconsumedDeliveries: unconsumed,
            Failed: 0
        );
    }

    /// <inheritdoc/>
    public async Task<MailboxDeliveryResult> DeliverToMailbox(
        Guid mailboxId,
        string ns,
        string idempotencyKey,
        string payload,
        DateTimeOffset now,
        int maxLogLength,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.DeliverToMailbox");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            ns = WorkflowNamespace.Normalize(ns);

            MailboxDeliveryResult result = new MailboxDeliveryResult.NotFound();
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);
                    await using var tx = await conn.BeginTransactionAsync(ct);

                    // The mailbox row lock is this transaction's first act; everything below decides on
                    // that row's state.
                    const string lockSql = $"""
                        SELECT {MailboxColumns}
                        FROM engine.mailboxes m
                        WHERE m.id = @id AND m.namespace = @ns
                        FOR UPDATE
                        """;

                    MailboxResponse? locked;
                    await using (var lockCmd = new NpgsqlCommand(lockSql, conn, tx))
                    {
                        lockCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
                        lockCmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));

                        await using var reader = await lockCmd.ExecuteReaderAsync(ct);
                        locked = await reader.ReadAsync(ct) ? ReadMailbox(reader) : null;
                    }

                    if (locked is null)
                    {
                        await tx.RollbackAsync(ct);
                        result = new MailboxDeliveryResult.NotFound();
                        return;
                    }

                    // Looked up before the refusals — the "accepted versus kept" rule: a kept message replays
                    // even once the mailbox is closed or full. Also what makes ExecuteWithRetry safe here.
                    const string existingSql = $"""
                        SELECT {MailboxDeliveryColumns}
                        FROM engine.mailbox_deliveries d
                        WHERE d.mailbox_id = @id AND d.idempotency_key = @key
                        """;

                    MailboxDeliveryResponse? existing;
                    await using (var existingCmd = new NpgsqlCommand(existingSql, conn, tx))
                    {
                        existingCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
                        existingCmd.Parameters.Add(new NpgsqlParameter<string>("key", idempotencyKey));

                        await using var reader = await existingCmd.ExecuteReaderAsync(ct);
                        existing = await reader.ReadAsync(ct) ? ReadMailboxDelivery(reader) : null;
                    }

                    if (existing is not null)
                    {
                        await tx.RollbackAsync(ct);
                        result = new MailboxDeliveryResult.Duplicate(existing);
                        return;
                    }

                    // Every non-append path rolls back, so a refusal inserts nothing and claims no key.
                    if (locked.Status == MailboxStatus.Disposed)
                    {
                        await tx.RollbackAsync(ct);
                        result = new MailboxDeliveryResult.Closed(locked);
                        return;
                    }

                    if (locked.NextIdx >= maxLogLength)
                    {
                        await tx.RollbackAsync(ct);
                        result = new MailboxDeliveryResult.LogFull(locked.NextIdx);
                        return;
                    }

                    // The increment and the insert that consumes it are one statement, so the log is gapless.
                    const string appendSql = $"""
                        WITH bumped AS (
                            UPDATE engine.mailboxes
                            SET next_idx = next_idx + 1
                            WHERE id = @id
                            RETURNING next_idx - 1 AS idx
                        )
                        INSERT INTO engine.mailbox_deliveries AS d (
                            mailbox_id, idx, idempotency_key, payload, accepted_at
                        )
                        SELECT @id, bumped.idx, @key, @payload, @now FROM bumped
                        RETURNING {MailboxDeliveryColumns}
                        """;

                    MailboxDeliveryResponse appended;
                    await using (var appendCmd = new NpgsqlCommand(appendSql, conn, tx))
                    {
                        appendCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
                        appendCmd.Parameters.Add(new NpgsqlParameter<string>("key", idempotencyKey));
                        appendCmd.Parameters.Add(new NpgsqlParameter<string>("payload", payload));
                        appendCmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));

                        await using var reader = await appendCmd.ExecuteReaderAsync(ct);

                        // Unreachable: this row's lock is held. Kept loud rather than silently answering NotFound.
                        if (!await reader.ReadAsync(ct))
                            throw new InvalidOperationException(
                                $"Mailbox {mailboxId} vanished while its row lock was held."
                            );

                        appended = ReadMailboxDelivery(reader);
                    }

                    // The wake, inside the delivery's own transaction: a held receiver has no timer, so a lost wake
                    // would park it until the deadline.
                    var released = await ReleaseReceiverAt(conn, tx, mailboxId, appended.Idx, now, ct);

                    if (released)
                        await NotifyStatusChanged(conn, tx, ct);

                    result = new MailboxDeliveryResult.Accepted(appended, released);

                    await tx.CommitAsync(ct);
                },
                cancellationToken
            );

            // After the commit: a release that rolled back is not a release.
            if (result is MailboxDeliveryResult.Accepted { ReleasedReceiver: true })
                new MailboxReleaseCounts(Delivered: 1, Closed: 0).Record();

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedMailboxOperation("deliver to", mailboxId, ex.Message, ex);
            throw;
        }
    }

    private static MailboxResponse ReadMailbox(NpgsqlDataReader reader)
    {
#pragma warning disable CA1849, S6966 // Synchronous accessors are intentional - the row is already buffered
        return new MailboxResponse
        {
            Id = reader.GetGuid(0),
            Namespace = reader.GetString(1),
            IdempotencyKey = reader.GetString(2),
            CollectionKey = reader.IsDBNull(3) ? null : reader.GetString(3),
            Timeout = reader.GetFieldValue<TimeSpan>(4),
            Deadline = reader.GetFieldValue<DateTimeOffset>(5),
            Status = MailboxStatusMap.FromDbValue(reader.GetString(6)),
            DisposedReason = reader.IsDBNull(7) ? null : MailboxStatusMap.ReasonFromDbValue(reader.GetString(7)),
            NextIdx = reader.GetInt64(8),
            NextSeq = reader.GetInt64(9),
            CreatedAt = reader.GetFieldValue<DateTimeOffset>(10),
            DisposedAt = reader.IsDBNull(11) ? null : reader.GetFieldValue<DateTimeOffset>(11),
        };
#pragma warning restore CA1849, S6966
    }

    private static MailboxReceiptResult ReadMailboxReceipt(NpgsqlDataReader reader)
    {
#pragma warning disable CA1849, S6966 // Synchronous accessors are intentional - the row is already buffered
        var mailboxId = reader.GetGuid(0);
        var seq = reader.GetInt64(1);
        var status = MailboxStatusMap.FromDbValue(reader.GetString(2));

        if (!reader.IsDBNull(4))
        {
            return new MailboxReceiptResult.Resolved(
                MailboxReceipt.Delivered(
                    mailboxId,
                    seq,
                    new MailboxDelivery
                    {
                        IdempotencyKey = reader.GetString(4),
                        Payload = reader.GetString(5),
                        AcceptedAt = reader.GetFieldValue<DateTimeOffset>(6),
                    }
                )
            );
        }

        // Unreachable through the rendezvous; reported rather than smoothed into the closing signal.
        if (status != MailboxStatus.Disposed)
            return new MailboxReceiptResult.Undecided(mailboxId, seq);

        // `ck_mailboxes_disposal_is_complete` is biconditional, so a disposed mailbox always has a reason.
        return new MailboxReceiptResult.Resolved(
            MailboxReceipt.Closed(mailboxId, seq, MailboxStatusMap.ReasonFromDbValue(reader.GetString(3)))
        );
#pragma warning restore CA1849, S6966
    }

    /// <summary>Groups rows by adjacency, which the query's <c>ORDER BY</c> makes safe.</summary>
    private static async Task ReadMailboxSnapshots(
        NpgsqlDataReader reader,
        List<MailboxSnapshot> snapshots,
        CancellationToken cancellationToken
    )
    {
        Guid? currentId = null;
        List<MailboxPosition> positions = [];

        while (await reader.ReadAsync(cancellationToken))
        {
#pragma warning disable CA1849, S6966 // Synchronous accessors are intentional - the row is already buffered
            var mailbox = ReadMailbox(reader);
            if (mailbox.Id != currentId)
            {
                currentId = mailbox.Id;
                positions = [];
                snapshots.Add(new MailboxSnapshot(mailbox, positions));
            }

            if (reader.IsDBNull(12))
                continue;

            positions.Add(
                new MailboxPosition(
                    Position: reader.GetInt64(12),
                    DeliveryIdempotencyKey: reader.IsDBNull(13) ? null : reader.GetString(13),
                    AcceptedAt: reader.IsDBNull(14) ? null : reader.GetFieldValue<DateTimeOffset>(14),
                    ReceiverWorkflowId: reader.IsDBNull(15) ? null : reader.GetGuid(15),
                    HeldAt: reader.IsDBNull(16) ? null : reader.GetFieldValue<DateTimeOffset>(16),
                    ReleasedAt: reader.IsDBNull(17) ? null : reader.GetFieldValue<DateTimeOffset>(17),
                    ClaimedAt: reader.IsDBNull(18) ? null : reader.GetFieldValue<DateTimeOffset>(18)
                )
            );
#pragma warning restore CA1849, S6966
        }
    }

    private static MailboxDeliveryResponse ReadMailboxDelivery(NpgsqlDataReader reader)
    {
#pragma warning disable CA1849, S6966 // Synchronous accessors are intentional - the row is already buffered
        return new MailboxDeliveryResponse
        {
            MailboxId = reader.GetGuid(0),
            Idx = reader.GetInt64(1),
            IdempotencyKey = reader.GetString(2),
            AcceptedAt = reader.GetFieldValue<DateTimeOffset>(3),
        };
#pragma warning restore CA1849, S6966
    }
}

/// <summary>
/// One per-collection read's result: the mailboxes, newest first, and the keys whose window was full.
/// </summary>
internal sealed record MailboxCollectionPage(
    IReadOnlyList<MailboxSnapshot> Mailboxes,
    IReadOnlyList<string> TruncatedCollections
)
{
    internal static MailboxCollectionPage Empty { get; } = new([], []);
}

/// <summary>
/// A mailbox with its log laid out by position. <see cref="Positions"/> is empty for a mailbox minted but
/// not yet delivered into or received from — a real and often long-lived state.
/// </summary>
internal sealed record MailboxSnapshot(MailboxResponse Mailbox, IReadOnlyList<MailboxPosition> Positions);

/// <summary>
/// One position of the log, from both sides: the two logs share one position space, so a position carries a
/// delivery, a receiver, or both.
/// </summary>
internal sealed record MailboxPosition(
    long Position,
    string? DeliveryIdempotencyKey,
    DateTimeOffset? AcceptedAt,
    Guid? ReceiverWorkflowId,
    DateTimeOffset? HeldAt,
    DateTimeOffset? ReleasedAt,
    DateTimeOffset? ClaimedAt
);

internal abstract record MailboxReceiptResult
{
    private MailboxReceiptResult() { }

    internal sealed record Resolved(MailboxReceipt Receipt) : MailboxReceiptResult;

    /// <summary>
    /// No position in any receivers log. Every receiver registers at enqueue, so the reachable cause is
    /// retention purging the mailbox under a receiver that outlived it.
    /// </summary>
    internal sealed record Unregistered : MailboxReceiptResult;

    /// <summary>
    /// A position with no delivery on a still-open mailbox — unreachable through the rendezvous. The executor
    /// fails the step critically, so the invariant violation cannot heal itself unnoticed.
    /// </summary>
    internal sealed record Undecided(Guid MailboxId, long Seq) : MailboxReceiptResult;
}

internal abstract record MailboxMintResult
{
    private MailboxMintResult() { }

    internal sealed record Minted(MailboxResponse Mailbox) : MailboxMintResult;

    /// <summary>A replay, answered even at the collection cap.</summary>
    internal sealed record Existing(MailboxResponse Mailbox) : MailboxMintResult;

    /// <summary>
    /// Refused before the database: an over-long key would otherwise read as a transient database error and be
    /// retried to the command timeout.
    /// </summary>
    internal sealed record Invalid(string Message) : MailboxMintResult;

    internal sealed record AtCollectionCapacity : MailboxMintResult;
}

/// <summary>
/// Release counts by cause, published after the commit — a release that rolled back released nobody — and
/// carried on the result so callers with their own transactions publish the same telemetry.
/// </summary>
internal readonly record struct MailboxReleaseCounts(int Delivered, int Closed)
{
    public void Record()
    {
        if (Delivered > 0)
            Metrics.MailboxReceiversReleased.Add(Delivered, new KeyValuePair<string, object?>("cause", "delivered"));

        if (Closed > 0)
            Metrics.MailboxReceiversReleased.Add(Closed, new KeyValuePair<string, object?>("cause", "closed"));
    }
}

/// <summary>One deadline-sweep pass. A nonzero <c>Failed</c> is a delayed close, not a lost one.</summary>
internal readonly record struct MailboxSweepResult(
    int Closed = 0,
    int ReceiversReleased = 0,
    long UnconsumedDeliveries = 0,
    int Failed = 0
)
{
    public static MailboxSweepResult operator +(MailboxSweepResult left, MailboxSweepResult right) =>
        new(
            left.Closed + right.Closed,
            left.ReceiversReleased + right.ReceiversReleased,
            left.UnconsumedDeliveries + right.UnconsumedDeliveries,
            left.Failed + right.Failed
        );

    public bool IsEmpty => Closed == 0 && Failed == 0;
}

/// <summary>Outcome of closing a mailbox.</summary>
internal abstract record MailboxCloseResult
{
    private MailboxCloseResult() { }

    /// <summary>Publishes the telemetry this outcome owes; call once, after the commit.</summary>
    public virtual void Record() { }

    internal sealed record Closed(MailboxResponse Mailbox, MailboxReleaseCounts Released) : MailboxCloseResult
    {
        /// <summary>The reason is read from the row that was written, not from the parameter that asked.</summary>
        public override void Record()
        {
            if (Mailbox.DisposedReason is { } reason)
            {
                Metrics.MailboxesClosed.Add(
                    1,
                    new KeyValuePair<string, object?>("reason", MailboxStatusMap.ToDbValue(reason))
                );
            }

            Released.Record();
        }
    }

    /// <summary>Already closed; carries the mailbox so the caller reports the original disposal.</summary>
    internal sealed record AlreadyClosed(MailboxResponse Mailbox) : MailboxCloseResult;

    internal sealed record NotFound : MailboxCloseResult;
}

/// <summary>
/// Outcome of a delivery. The line between success and refusal is the <em>accepted versus kept</em> rule:
/// what the engine kept it keeps answering <see cref="Duplicate"/> for; what it refused it keeps refusing.
/// </summary>
internal abstract record MailboxDeliveryResult
{
    private MailboxDeliveryResult() { }

    /// <summary>
    /// Appended. <paramref name="ReleasedReceiver"/> is bookkeeping for the release metric, not a difference
    /// the caller answers differently.
    /// </summary>
    internal sealed record Accepted(MailboxDeliveryResponse Delivery, bool ReleasedReceiver) : MailboxDeliveryResult;

    /// <summary>A replay, answered at its original position even on a closed or full mailbox.</summary>
    internal sealed record Duplicate(MailboxDeliveryResponse Delivery) : MailboxDeliveryResult;

    internal sealed record NotFound : MailboxDeliveryResult;

    /// <summary>Too late; carries the mailbox so the caller can report how the exchange ended.</summary>
    internal sealed record Closed(MailboxResponse Mailbox) : MailboxDeliveryResult;

    internal sealed record LogFull(long LogLength) : MailboxDeliveryResult;

    internal sealed record PayloadTooLarge(string Message) : MailboxDeliveryResult;

    /// <summary>
    /// Refused before the database: an over-long key would otherwise read as a transient database error and be
    /// retried to the command timeout.
    /// </summary>
    internal sealed record Invalid(string Message) : MailboxDeliveryResult;
}
