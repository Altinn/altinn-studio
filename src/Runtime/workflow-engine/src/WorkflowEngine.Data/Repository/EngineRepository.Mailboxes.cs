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
    /// The only statement that ever releases a parked receiver, used by both releases the design has: the wake,
    /// which passes the position a delivery landed at, and the closure release, which passes <c>null</c> and takes
    /// every receiver still parked. One statement so the status transition and the <c>released_at</c> stamp cannot
    /// diverge.
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

    /// <summary>The wake: releases the receiver standing at <paramref name="seq"/>, if one is.</summary>
    private static async Task<bool> ReleaseReceiverAt(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid mailboxId,
        long seq,
        DateTimeOffset now,
        CancellationToken cancellationToken
    ) => await ReleaseMailboxReceivers(conn, tx, mailboxId, seq, now, cancellationToken) > 0;

    /// <summary>The closure release: releases every receiver still parked on the mailbox.</summary>
    private static Task<int> ReleaseAllParkedReceivers(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid mailboxId,
        DateTimeOffset now,
        CancellationToken cancellationToken
    ) => ReleaseMailboxReceivers(conn, tx, mailboxId, seq: null, now, cancellationToken);

    /// <summary>
    /// Signals the processor that a release made work runnable. Issued inside the releasing transaction: PostgreSQL
    /// queues the <c>NOTIFY</c> until commit, so a statement that could fail on an already-committed transaction —
    /// and make <see cref="ExecuteWithRetry"/> re-run the whole delegate — is avoided.
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
    /// The mint, as one statement whose CTE order is its semantics. Hoisted so <c>QueryPlanTests</c> can
    /// <c>EXPLAIN</c> the statement the mint actually issues. <c>existing</c> is consulted first and
    /// unconditionally, so a replay is answered even when the collection is at its cap, and the <c>INSERT</c> uses
    /// <c>ON CONFLICT DO UPDATE</c> so a mint that loses the race returns the winner's row instead of nothing.
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
            // Normalized on entry, as every other namespaced repository operation does.
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
    /// The dashboard's read: the mailboxes of the named collections, each with its log laid out position by
    /// position. Hoisted so <c>QueryPlanTests</c> can <c>EXPLAIN</c> it. The limit is per collection — one
    /// <c>LATERAL</c> per key, so one busy collection cannot starve the rest — and each key is asked for one extra
    /// row so a truncated window is distinguishable from a full one.
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

                    // One more than the caller's limit, so a key with more history than fits is distinguishable.
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

    /// <summary>Drops each collection's overflow row and names the collections that had one.</summary>
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
    /// The gauge's read: how many mailboxes are still open past <c>@cutoff</c>, saturating at <c>@limit</c>.
    /// Deliberately the sweep's own predicate with a different instant, so the two cannot drift apart on what
    /// "overdue" means. Saturating because it runs on the metrics cadence and the alert only reads "greater than
    /// zero".
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
    /// The executor's read of the rendezvous — the receiver's position and the message standing at it, in one
    /// statement. It takes no lock and writes nothing: by the time a receiver can be fetched, whether a delivery
    /// exists at its position is already frozen. One statement rather than several so a concurrent close cannot
    /// launder a genuine <see cref="MailboxReceiptResult.Undecided"/> into an ordinary closing signal.
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

                    // The mailbox row lock is this transaction's first act, so the state read below can be decided on.
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
    /// Closes a mailbox whose row the caller has already locked and read: mark it disposed, and release every
    /// receiver parked on it. Split from <see cref="CloseMailbox"/> so the deadline sweep can run the identical
    /// routine from under its own claim. Releasing under the same lock is what keeps a concurrent enqueue from
    /// parking a receiver on a closed mailbox.
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
        // Whoever closed it first wins, including the deadline sweep: the replay reports the original reason and
        // instant, and releases nothing — the first close released every parked receiver that existed.
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
    /// The overdue claim. <c>FOR UPDATE</c> makes it the mailbox row lock <see cref="CloseLockedMailbox"/>
    /// requires, and <c>SKIP LOCKED</c> makes it a claim: a mailbox someone else is holding is left for the next
    /// tick. The predicates are re-evaluated against the locked row, so a mailbox closed in between is not swept.
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
                // Per-mailbox isolation: a throw here rolled that mailbox's close back and left it open, overdue, and
                // claimable next tick. Letting it escape would abandon the rest of the batch, and the deadline-ordered
                // scan would put the same mailbox at the head of the next one.
                result = result with
                {
                    Failed = result.Failed + 1,
                };

                // Tagged apart from the sweep pass's own failures: this one is self-healing, while a failed pass means
                // the deadline guarantee is off for everything — and the two want opposite responses.
                Metrics.Errors.Add(1, ("operation", "mailboxDeadlineClose"));
                logger.FailedMailboxOperation("close at its deadline", mailboxId, ex.Message, ex);
            }
        }

        return result;
    }

    /// <summary>
    /// The deadline sweep's candidate scan, hoisted so <c>QueryPlanTests</c> can <c>EXPLAIN</c> the statement the
    /// sweep actually issues. The predicate and ordering are what <c>ix_mailboxes_deadline_open</c> is keyed on.
    /// </summary>
    internal const string SelectOverdueMailboxCandidatesSql = $"""
        SELECT m.id
        FROM engine.mailboxes m
        WHERE m.status = '{MailboxStatusMap.Open}'
          AND m.deadline <= @now
        ORDER BY m.deadline
        LIMIT @batch_size
        """;

    /// <summary>
    /// Reads the ids of mailboxes whose deadline has passed while they are still open, oldest first. Takes no
    /// locks: each candidate is claimed under its own transaction below.
    /// </summary>
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
    /// Closes one overdue mailbox in its own transaction, running exactly the routine <c>DELETE</c> runs. No
    /// <see cref="ExecuteWithRetry"/>: the sweep's cadence is its retry, and a re-run after a lost commit
    /// acknowledgement would report a close it had performed as a no-op.
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

                    // The mailbox row lock is this transaction's first act. Everything below decides on state that row
                    // carries, which another delivery, enqueue, or close is otherwise free to invalidate.
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

                    // Looked up before the refusals below — the "accepted versus kept" rule in code: a resend
                    // of a message accepted while the mailbox was open is a replay even now that it is closed or
                    // full. It is also what makes ExecuteWithRetry safe to re-run this delegate over.
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

                    // Every path from here that is not an append rolls back, so a refusal inserts nothing and claims no
                    // idempotency key.
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

                    // The position comes from the row's own counter, so the log is gapless: increment and
                    // insert are one statement, serialized by the mailbox lock.
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

                    // The wake, inside the delivery's own transaction: a held receiver has no timer of its
                    // own, so a lost wake would park it until the mailbox's deadline. The mailbox row lock leaves
                    // exactly two interleavings — a receiver is registered here and released, or the enqueue's
                    // own `seq < next_idx` comparison finds the message waiting.
                    var released = await ReleaseReceiverAt(conn, tx, mailboxId, appended.Idx, now, ct);

                    if (released)
                        await NotifyStatusChanged(conn, tx, ct);

                    result = new MailboxDeliveryResult.Accepted(appended, released);

                    await tx.CommitAsync(ct);
                },
                cancellationToken
            );

            // After the commit, because a release that rolled back is not a release.
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

    /// <summary>Projects one row of <see cref="MailboxColumns"/> into its response shape.</summary>
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

    /// <summary>Projects the receipt read's one row into the answer the executor acts on.</summary>
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

        // No delivery and the mailbox still open: the rendezvous makes this unreachable. Reported rather than
        // smoothed over into the closing signal, which would conclude an exchange that is still live.
        if (status != MailboxStatus.Disposed)
            return new MailboxReceiptResult.Undecided(mailboxId, seq);

        // `ck_mailboxes_disposal_is_complete` is biconditional, so a disposed mailbox always carries its reason.
        return new MailboxReceiptResult.Resolved(
            MailboxReceipt.Closed(mailboxId, seq, MailboxStatusMap.ReasonFromDbValue(reader.GetString(3)))
        );
#pragma warning restore CA1849, S6966
    }

    /// <summary>
    /// Folds the dashboard read's rows into one snapshot per mailbox. Grouped by adjacency, which the query's
    /// <c>ORDER BY</c> is what makes safe.
    /// </summary>
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

    /// <summary>Projects one row of <see cref="MailboxDeliveryColumns"/> into its response shape.</summary>
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
/// What one per-collection mailbox read returned: the mailboxes, newest-minted first, and the collection keys
/// whose window was full. Reported per collection because the limit is per collection.
/// </summary>
internal sealed record MailboxCollectionPage(
    IReadOnlyList<MailboxSnapshot> Mailboxes,
    IReadOnlyList<string> TruncatedCollections
)
{
    internal static MailboxCollectionPage Empty { get; } = new([], []);
}

/// <summary>
/// One mailbox as a monitoring surface reads it: the mailbox row, and its log laid out position by position.
/// <see cref="Positions"/> is empty for a mailbox minted but not yet delivered into or received from, which is
/// a real and often long-lived state.
/// </summary>
internal sealed record MailboxSnapshot(MailboxResponse Mailbox, IReadOnlyList<MailboxPosition> Positions);

/// <summary>
/// One position of a mailbox's log, from both sides: the message standing there, if one is, and the receiver
/// holding it, if one does. The two logs share one position space, so a position carries a delivery, a
/// receiver, or both. <see cref="HeldAt"/> is what separates a receiver that parked from one that ran straight
/// away.
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

/// <summary>What the executor's read of the rendezvous found for one receive workflow.</summary>
internal abstract record MailboxReceiptResult
{
    private MailboxReceiptResult() { }

    /// <summary>The rendezvous answered: the message at the receiver's position, or the closure.</summary>
    internal sealed record Resolved(MailboxReceipt Receipt) : MailboxReceiptResult;

    /// <summary>
    /// The workflow holds no position in any mailbox's receivers log. Every receiver registers at enqueue, so the
    /// reachable cause is retention purging the mailbox under a receive workflow that outlived it.
    /// </summary>
    internal sealed record Unregistered : MailboxReceiptResult;

    /// <summary>
    /// The receiver holds a position, no delivery stands at it, and the mailbox is still open — so the receiver is
    /// running before its truth was frozen. Unreachable through the rendezvous. The executor fails the step
    /// critically rather than retryably, so an invariant violation cannot heal itself unnoticed once the deadline
    /// sweep closes the mailbox.
    /// </summary>
    internal sealed record Undecided(Guid MailboxId, long Seq) : MailboxReceiptResult;
}

/// <summary>Outcome of a mailbox mint.</summary>
internal abstract record MailboxMintResult
{
    private MailboxMintResult() { }

    /// <summary>This call created the mailbox.</summary>
    internal sealed record Minted(MailboxResponse Mailbox) : MailboxMintResult;

    /// <summary>The key had already minted a mailbox, which is returned unchanged even at the cap.</summary>
    internal sealed record Existing(MailboxResponse Mailbox) : MailboxMintResult;

    /// <summary>
    /// The request could not be minted from. Refused before the database, so an over-long key is answered rather
    /// than surfacing as a transient-looking database error and being retried to the command timeout.
    /// </summary>
    internal sealed record Invalid(string Message) : MailboxMintResult;

    /// <summary>
    /// The collection already holds <see cref="EngineSettings.MaxOpenMailboxesPerCollection"/> open mailboxes.
    /// </summary>
    internal sealed record AtCollectionCapacity : MailboxMintResult;
}

/// <summary>
/// How many receivers a release made runnable, split by the only two causes there are, and how to publish
/// that. Published after the commit — a release that rolled back released nobody — and carried on the result
/// so a caller releasing inside its own transaction publishes the same telemetry without re-deriving it.
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

/// <summary>
/// What one pass of the deadline sweep did, summed over the mailboxes it claimed. A nonzero <c>Failed</c> is a
/// delayed close rather than a lost one, but one that stays nonzero across passes is a mailbox that never
/// drains.
/// </summary>
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

    /// <summary>Whether this pass has anything worth reporting.</summary>
    public bool IsEmpty => Closed == 0 && Failed == 0;
}

/// <summary>Outcome of closing a mailbox.</summary>
internal abstract record MailboxCloseResult
{
    private MailboxCloseResult() { }

    /// <summary>
    /// Publishes whatever telemetry this outcome owes. Call it once, after the producing transaction committed.
    /// </summary>
    public virtual void Record() { }

    /// <summary>This call closed the mailbox, releasing every receiver parked on it in the same transaction.</summary>
    internal sealed record Closed(MailboxResponse Mailbox, MailboxReleaseCounts Released) : MailboxCloseResult
    {
        /// <summary>
        /// Counts the closure and the receivers it released together, because they are one event. The reason is read
        /// from the row that was actually written rather than from the parameter that asked for it.
        /// </summary>
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

    /// <summary>
    /// The mailbox was already closed. Carries the mailbox as it stands, so the caller reports the original
    /// reason and instant.
    /// </summary>
    internal sealed record AlreadyClosed(MailboxResponse Mailbox) : MailboxCloseResult;

    /// <summary>No mailbox with that id exists in the namespace.</summary>
    internal sealed record NotFound : MailboxCloseResult;
}

/// <summary>
/// Outcome of delivering a message into a mailbox. The line between success and refusal is the design's
/// <em>accepted versus kept</em> rule: what the engine kept it keeps answering <see cref="Duplicate"/> for,
/// and what it refused it keeps refusing, having written nothing.
/// </summary>
internal abstract record MailboxDeliveryResult
{
    private MailboxDeliveryResult() { }

    /// <summary>
    /// This call appended the delivery, which now holds the position it reports.
    /// <paramref name="ReleasedReceiver"/> is bookkeeping for the release metric, not a difference the caller
    /// answers differently: acceptance is not consumption.
    /// </summary>
    internal sealed record Accepted(MailboxDeliveryResponse Delivery, bool ReleasedReceiver) : MailboxDeliveryResult;

    /// <summary>
    /// The key had already delivered a message into this mailbox, returned at the position it has held since.
    /// Answered even on a closed or full mailbox.
    /// </summary>
    internal sealed record Duplicate(MailboxDeliveryResponse Delivery) : MailboxDeliveryResult;

    /// <summary>No mailbox with that id exists in the namespace.</summary>
    internal sealed record NotFound : MailboxDeliveryResult;

    /// <summary>
    /// The mailbox is closed, so the message is too late. Carries the mailbox so the caller can report how it
    /// closed, which is what makes a dead-letter record worth reading.
    /// </summary>
    internal sealed record Closed(MailboxResponse Mailbox) : MailboxDeliveryResult;

    /// <summary>The deliveries log already holds <see cref="EngineSettings.MaxMailboxLogLength"/> positions.</summary>
    internal sealed record LogFull(long LogLength) : MailboxDeliveryResult;

    /// <summary>
    /// The payload exceeds <see cref="EngineSettings.MaxMailboxPayloadSize"/>. Refused before the database.
    /// </summary>
    internal sealed record PayloadTooLarge(string Message) : MailboxDeliveryResult;

    /// <summary>
    /// The request could not be delivered from. Refused before the database, so an over-long idempotency key is
    /// answered rather than retried to the command timeout as a transient-looking database error.
    /// </summary>
    internal sealed record Invalid(string Message) : MailboxDeliveryResult;
}
