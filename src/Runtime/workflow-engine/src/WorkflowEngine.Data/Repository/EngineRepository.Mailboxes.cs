using System.Diagnostics;
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
    /// Releases parked receivers: a wake names one position, a closure release its mailbox's whole range. One
    /// statement so the status transition and the <c>released_at</c> stamp cannot diverge.
    /// The range is two bounds rather than a nullable position on purpose: a
    /// <c>t.seq IS NULL OR mr.seq = t.seq</c> disjunction over a joined column never becomes an index qual, so
    /// the position drops out of the <c>(mailbox_id, seq)</c> probe and every wake reads its mailbox's entire
    /// registry slice — a measured 100× the reads. Hoisted for <c>QueryPlanTests</c>.
    /// </summary>
    internal const string ReleaseMailboxReceiversSql = """
        WITH released AS (
            UPDATE engine.workflows AS w
            SET status = @enqueued,
                backoff_until = NULL,
                updated_at = t.now
            FROM engine.mailbox_receivers AS mr
                JOIN unnest(@mailbox_ids, @seq_los, @seq_his, @nows) AS t(mailbox_id, seq_lo, seq_hi, now)
                    ON mr.mailbox_id = t.mailbox_id
                    AND mr.seq >= t.seq_lo
                    AND mr.seq <= t.seq_hi
            WHERE mr.released_at IS NULL
              AND w.id = mr.workflow_id
              AND w.status = @held
            RETURNING mr.mailbox_id, mr.seq, t.now
        )
        UPDATE engine.mailbox_receivers AS mr
        SET released_at = released.now
        FROM released
        WHERE mr.mailbox_id = released.mailbox_id
          AND mr.seq = released.seq
        RETURNING mr.mailbox_id, mr.seq
        """;

    /// <summary>
    /// Returns the positions released, in no particular order. Ranges over one mailbox must not overlap: an
    /// overlapped position is released once, stamped by an arbitrary element's <c>Now</c>.
    /// </summary>
    private static async Task<List<(Guid MailboxId, long Seq)>> ReleaseMailboxReceivers(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        (Guid MailboxId, long SeqLo, long SeqHi, DateTimeOffset Now)[] releases,
        CancellationToken cancellationToken
    )
    {
        var released = new List<(Guid MailboxId, long Seq)>();
        if (releases.Length == 0)
            return released;

        var (mailboxIds, seqLos, seqHis, nows) = releases.Unzip();

        await using var cmd = new NpgsqlCommand(ReleaseMailboxReceiversSql, conn, tx);
        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("mailbox_ids", mailboxIds));
        cmd.Parameters.Add(new NpgsqlParameter<long[]>("seq_los", seqLos));
        cmd.Parameters.Add(new NpgsqlParameter<long[]>("seq_his", seqHis));
        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset[]>("nows", nows));
        cmd.Parameters.Add(new NpgsqlParameter<int>("enqueued", (int)PersistentItemStatus.Enqueued));
        cmd.Parameters.Add(new NpgsqlParameter<int>("held", (int)PersistentItemStatus.Held));

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            released.Add((reader.GetGuid(0), reader.GetInt64(1)));
        }

        return released;
    }

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
    /// The lock every mutation of existing mailboxes takes as its transaction's first act. <c>ORDER BY m.id</c>
    /// is what makes the order binding — PostgreSQL sorts before it locks — so the close, delivery and enqueue
    /// flushes take their rows in one total order and convoy instead of deadlocking. Hoisted for
    /// <c>QueryPlanTests</c>.
    /// </summary>
    internal const string LockMailboxesForMutationSql = $"""
        SELECT {MailboxColumns}
        FROM engine.mailboxes m
        JOIN unnest(@ids, @namespaces) AS t(id, ns) ON m.id = t.id AND m.namespace = t.ns
        ORDER BY m.id
        FOR UPDATE
        """;

    /// <summary>
    /// Runs <see cref="LockMailboxesForMutationSql"/>, keyed back by the pair that named each row. The C#
    /// ordering below is presentational: it is the statement's <c>ORDER BY</c> that binds, .NET's <c>Guid</c>
    /// comparison not being PostgreSQL's <c>uuid</c> ordering.
    /// </summary>
    private static async Task<Dictionary<(Guid Id, string Namespace), MailboxResponse>> LockMailboxesForMutation(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        IReadOnlyList<(Guid Id, string Namespace)> pairs,
        CancellationToken cancellationToken
    )
    {
        var (ids, namespaces) = pairs.Distinct().OrderBy(pair => pair.Id).ToArray().Unzip();

        var locked = new Dictionary<(Guid, string), MailboxResponse>(ids.Length);
        if (ids.Length == 0)
            return locked;

        await using var cmd = new NpgsqlCommand(LockMailboxesForMutationSql, conn, tx);
        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", ids));
        cmd.Parameters.Add(new NpgsqlParameter<string[]>("namespaces", namespaces));

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var mailbox = ReadMailbox(reader);
            locked[(mailbox.Id, mailbox.Namespace)] = mailbox;
        }

        return locked;
    }

    /// <summary>
    /// The mint, for a whole batch. The unique index on <c>(namespace, idempotency_key)</c> is the serialization
    /// point, so no lock and no transaction; the cap is one snapshot's count and best-effort by design.
    /// <para>
    /// The <c>ORDER BY</c> is what keeps two flushes overlapping on several keys from deadlocking: an insert
    /// meeting another transaction's uncommitted speculative tuple waits for it, so contested keys have to go in
    /// one agreed order — here the unique index's own, as <c>InsertIdempotencyKeys</c> (<c>Writes.cs</c>) does.
    /// </para>
    /// <para>
    /// The <c>AS MATERIALIZED</c> fence on <c>open_counts</c> is there for what it guarantees: evaluated once,
    /// the CTE is one index probe per distinct <c>(namespace, collection_key)</c>. Inlined — and PostgreSQL does
    /// inline it — the count becomes a <c>SubPlan</c> in the join filter, with nothing holding it to one
    /// evaluation per key rather than one per candidate row.
    /// </para>
    /// Hoisted for <c>QueryPlanTests</c>.
    /// </summary>
    internal const string MintMailboxesSql = $"""
        WITH input AS (
            SELECT *
            FROM unnest(@ids, @namespaces, @keys, @collection_keys, @timeouts, @deadlines, @nows)
                WITH ORDINALITY
                AS t(id, ns, idempotency_key, collection_key, timeout, deadline, now, ord)
        ),
        fresh AS (
            SELECT i.*,
                   (row_number() OVER (PARTITION BY i.ns, i.collection_key ORDER BY i.ord) - 1)::int AS peers_ahead
            FROM input i
            WHERE NOT EXISTS (
                SELECT 1
                FROM engine.mailboxes taken
                WHERE taken.namespace = i.ns
                  AND taken.idempotency_key = i.idempotency_key
            )
        ),
        open_counts AS MATERIALIZED (
            SELECT k.ns,
                   k.collection_key,
                   (
                       SELECT count(*)::int
                       FROM engine.mailboxes counted
                       WHERE counted.namespace = k.ns
                         AND counted.collection_key = k.collection_key
                         AND counted.status = '{MailboxStatusMap.Open}'
                   ) AS n
            FROM (SELECT DISTINCT f.ns, f.collection_key FROM fresh f WHERE f.collection_key IS NOT NULL) k
        )
        INSERT INTO engine.mailboxes AS m (
            id, namespace, idempotency_key, collection_key, timeout, deadline,
            next_idx, next_seq, status, disposed_reason, created_at, disposed_at
        )
        SELECT f.id, f.ns, f.idempotency_key, f.collection_key, f.timeout, f.deadline,
               0, 0, '{MailboxStatusMap.Open}', NULL, f.now, NULL
        FROM fresh f
        LEFT JOIN open_counts oc ON oc.ns = f.ns AND oc.collection_key = f.collection_key
        WHERE f.collection_key IS NULL OR COALESCE(oc.n, 0) + f.peers_ahead < @cap
        ORDER BY f.ns, f.idempotency_key
        ON CONFLICT (namespace, idempotency_key) DO NOTHING
        RETURNING {MailboxColumns}
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
            MailboxMintResult result = new MailboxMintResult.AtCollectionCapacity();

            await ExecuteWithRetry(
                async ct =>
                    result = (
                        await MintMailboxes(
                            [(mailboxId, ns, idempotencyKey, collectionKey, timeout, now)],
                            maxOpenPerCollection,
                            ct
                        )
                    )[0],
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
    public async Task<MailboxMintResult[]> BatchMintMailboxes(
        IReadOnlyList<BufferedMailboxMintRequest> requests,
        int maxOpenPerCollection,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.BatchMintMailboxes");

        try
        {
            var results = await MintMailboxes(
                [
                    .. requests.Select(request =>
                        (
                            request.MailboxId,
                            request.Namespace,
                            request.IdempotencyKey,
                            request.CollectionKey,
                            request.Timeout,
                            request.Now
                        )
                    ),
                ],
                maxOpenPerCollection,
                cancellationToken
            );

            Metrics.DbOperationsSucceeded.Add(1);

            return results;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToBatchMintMailboxes(requests.Count, ex.Message, ex);
            throw;
        }
    }

    /// <summary>
    /// The two statements both mint entry points run. Results are positional — the answer to
    /// <paramref name="mints"/><c>[i]</c> sits at index <c>i</c>. The two share neither a transaction nor a lock:
    /// each is correct alone, and an attempt that dies between them leaves committed mailboxes the caller's retry
    /// reads back as its own.
    /// </summary>
    private async Task<MailboxMintResult[]> MintMailboxes(
        (
            Guid MailboxId,
            string Namespace,
            string IdempotencyKey,
            string? CollectionKey,
            TimeSpan Timeout,
            DateTimeOffset Now
        )[] mints,
        int maxOpenPerCollection,
        CancellationToken cancellationToken
    )
    {
        var results = new MailboxMintResult[mints.Length];
        if (mints.Length == 0)
            return results;

        var keys = new (string Namespace, string IdempotencyKey)[mints.Length];
        for (var i = 0; i < mints.Length; i++)
            keys[i] = (WorkflowNamespace.Normalize(mints[i].Namespace), mints[i].IdempotencyKey);

        // Folded here rather than left to ON CONFLICT, which tolerates a self-conflict within one statement:
        // which of two equal keys was credited with the mint would fall out of the sort order
        var candidates = new List<int>(mints.Length);
        var firstOccurrence = new Dictionary<(string, string), int>(mints.Length);
        var repeats = new List<(int Index, int PrimaryIndex)>();

        for (var i = 0; i < mints.Length; i++)
        {
            if (firstOccurrence.TryGetValue(keys[i], out var primary))
            {
                repeats.Add((i, primary));
                continue;
            }

            firstOccurrence[keys[i]] = i;
            candidates.Add(i);
        }

        var (ids, namespaces, idempotencyKeys, collectionKeys, timeouts, deadlines, nows) = candidates
            .Select(i =>
                (
                    mints[i].MailboxId,
                    keys[i].Namespace,
                    keys[i].IdempotencyKey,
                    mints[i].CollectionKey,
                    mints[i].Timeout,
                    Deadline: mints[i].Now + mints[i].Timeout,
                    mints[i].Now
                )
            )
            .ToArray()
            .Unzip();

        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);

        var inserted = new Dictionary<(string Namespace, string IdempotencyKey), MailboxResponse>(candidates.Count);
        await using (var cmd = new NpgsqlCommand(MintMailboxesSql, conn))
        {
            cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", ids));
            cmd.Parameters.Add(new NpgsqlParameter<string[]>("namespaces", namespaces));
            cmd.Parameters.Add(new NpgsqlParameter<string[]>("keys", idempotencyKeys));
            cmd.Parameters.Add(new NpgsqlParameter<string?[]>("collection_keys", collectionKeys));
            cmd.Parameters.Add(new NpgsqlParameter<TimeSpan[]>("timeouts", timeouts));
            cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset[]>("deadlines", deadlines));
            cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset[]>("nows", nows));
            cmd.Parameters.Add(new NpgsqlParameter<int>("cap", maxOpenPerCollection));

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var mailbox = ReadMailbox(reader);
                inserted[(mailbox.Namespace, mailbox.IdempotencyKey)] = mailbox;
            }
        }

        var existing = await ReadMailboxesByIdempotencyKey(
            conn,
            [.. candidates.Where(i => !inserted.ContainsKey(keys[i])).Select(i => keys[i])],
            cancellationToken
        );

        foreach (var i in candidates)
        {
            if (!inserted.TryGetValue(keys[i], out var row) && !existing.TryGetValue(keys[i], out row))
            {
                results[i] = new MailboxMintResult.AtCollectionCapacity();
                continue;
            }

            results[i] =
                row.Id == mints[i].MailboxId ? new MailboxMintResult.Minted(row) : new MailboxMintResult.Existing(row);
        }

        foreach (var (index, primaryIndex) in repeats)
            results[index] = RepeatOfMint(results[primaryIndex]);

        if (results.Any(result => result is null))
        {
            throw new UnreachableException("Not all results were set.");
        }

        return results;
    }

    private static MailboxMintResult RepeatOfMint(MailboxMintResult primary) =>
        primary switch
        {
            MailboxMintResult.Minted minted => new MailboxMintResult.Existing(minted.Mailbox),
            _ => primary,
        };

    /// <summary>
    /// The mint's classification read: one probe of the unique index per key. Pairs must be distinct, as a
    /// repeated pair would multiply its joined row.
    /// </summary>
    private static async Task<
        Dictionary<(string Namespace, string IdempotencyKey), MailboxResponse>
    > ReadMailboxesByIdempotencyKey(
        NpgsqlConnection conn,
        (string Namespace, string IdempotencyKey)[] keys,
        CancellationToken cancellationToken
    )
    {
        var found = new Dictionary<(string Namespace, string IdempotencyKey), MailboxResponse>(keys.Length);
        if (keys.Length == 0)
            return found;

        const string sql = $"""
            SELECT {MailboxColumns}
            FROM unnest(@namespaces, @keys) AS t(ns, idempotency_key)
            JOIN engine.mailboxes m ON m.namespace = t.ns AND m.idempotency_key = t.idempotency_key
            """;

        var (namespaces, idempotencyKeys) = keys.Unzip();

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.Add(new NpgsqlParameter<string[]>("namespaces", namespaces));
        cmd.Parameters.Add(new NpgsqlParameter<string[]>("keys", idempotencyKeys));

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var mailbox = ReadMailbox(reader);
            found[(mailbox.Namespace, mailbox.IdempotencyKey)] = mailbox;
        }

        return found;
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

    /// <summary>The dashboard's read. Hoisted so <c>QueryPlanTests</c> can <c>EXPLAIN</c> it.</summary>
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

    /// <summary>Deliberately the sweep's own predicate, so the two cannot drift on what "overdue" means.</summary>
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

    /// <inheritdoc/>
    /// <remarks>
    /// One statement so a concurrent close cannot launder a genuine
    /// <see cref="MailboxReceiptResult.Undecided"/> into an ordinary closing signal.
    /// </remarks>
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
            MailboxCloseResult result = new MailboxCloseResult.NotFound();

            await ExecuteWithRetry(
                async ct => result = (await LockAndCloseMailboxes([(mailboxId, ns, reason, now)], ct))[0],
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

    /// <inheritdoc/>
    public async Task<MailboxCloseResult[]> BatchCloseMailboxes(
        IReadOnlyList<BufferedMailboxCloseRequest> requests,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.BatchCloseMailboxes");

        try
        {
            var results = await LockAndCloseMailboxes(
                [.. requests.Select(request => (request.MailboxId, request.Namespace, request.Reason, request.Now))],
                cancellationToken
            );

            foreach (var result in results)
                result.Record();

            Metrics.DbOperationsSucceeded.Add(1);

            return results;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToBatchCloseMailboxes(requests.Count, ex.Message, ex);
            throw;
        }
    }

    /// <summary>
    /// The transaction both close entry points run. Results are positional — the answer to
    /// <paramref name="closes"/><c>[i]</c> sits at index <c>i</c>. Records nothing; both entry points publish
    /// after their own commit.
    /// </summary>
    private async Task<MailboxCloseResult[]> LockAndCloseMailboxes(
        (Guid MailboxId, string Namespace, MailboxDisposedReason Reason, DateTimeOffset Now)[] closes,
        CancellationToken cancellationToken
    )
    {
        var results = new MailboxCloseResult[closes.Length];
        if (closes.Length == 0)
            return results;

        var pairs = new (Guid Id, string Namespace)[closes.Length];
        for (var i = 0; i < closes.Length; i++)
            pairs[i] = (closes[i].MailboxId, WorkflowNamespace.Normalize(closes[i].Namespace));

        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        var locked = await LockMailboxesForMutation(conn, tx, pairs, cancellationToken);

        var matched = new List<(int Index, MailboxResponse Locked)>(closes.Length);
        var firstOccurrence = new Dictionary<(Guid, string), int>(closes.Length);
        var repeats = new List<(int Index, int PrimaryIndex)>();

        for (var i = 0; i < closes.Length; i++)
        {
            if (firstOccurrence.TryGetValue(pairs[i], out var primary))
            {
                repeats.Add((i, primary));
                continue;
            }

            firstOccurrence[pairs[i]] = i;

            if (locked.TryGetValue(pairs[i], out var mailbox))
                matched.Add((i, mailbox));
            else
                results[i] = new MailboxCloseResult.NotFound();
        }

        if (matched.Count > 0)
        {
            var closed = await CloseLockedMailboxes(
                conn,
                tx,
                [.. matched.Select(m => (m.Locked, closes[m.Index].Reason, closes[m.Index].Now))],
                cancellationToken
            );

            for (var i = 0; i < matched.Count; i++)
                results[matched[i].Index] = closed[i];
        }

        await tx.CommitAsync(cancellationToken);

        foreach (var (index, primaryIndex) in repeats)
            results[index] = RepeatOf(results[primaryIndex]);

        if (results.Any(result => result is null))
        {
            throw new UnreachableException("Not all results were set.");
        }

        return results;
    }

    private static MailboxCloseResult RepeatOf(MailboxCloseResult primary) =>
        primary switch
        {
            MailboxCloseResult.Closed closed => new MailboxCloseResult.AlreadyClosed(closed.Mailbox),
            _ => primary,
        };

    /// <summary>
    /// Closes a whole set of mailboxes in one statement. Hoisted for <c>QueryPlanTests</c>.
    /// </summary>
    internal const string CloseLockedMailboxesSql = $"""
        UPDATE engine.mailboxes AS m
        SET status = '{MailboxStatusMap.Disposed}',
            disposed_reason = t.reason,
            disposed_at = t.now
        FROM unnest(@ids, @reasons, @nows) AS t(id, reason, now)
        WHERE m.id = t.id
        RETURNING {MailboxColumns}
        """;

    /// <summary>
    /// Closes mailboxes whose rows the caller already locked and read, and releases every receiver parked on
    /// them. Releasing under the caller's lock is what keeps a concurrent enqueue from parking a receiver on a
    /// mailbox this closes.
    /// Precondition: the staged ids are distinct, because one <c>UPDATE</c> row per id is what the results and
    /// the release counts are read back through.
    /// </summary>
    private static async Task<MailboxCloseResult[]> CloseLockedMailboxes(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        (MailboxResponse Locked, MailboxDisposedReason Reason, DateTimeOffset Now)[] closures,
        CancellationToken cancellationToken
    )
    {
        var results = new MailboxCloseResult[closures.Length];
        var staged = new List<int>(closures.Length);
        var stagedIds = new HashSet<Guid>(closures.Length);

        for (var i = 0; i < closures.Length; i++)
        {
            var locked = closures[i].Locked;

            if (locked.Status == MailboxStatus.Disposed)
            {
                results[i] = new MailboxCloseResult.AlreadyClosed(locked);
                continue;
            }

            // Caught here because the rows-affected guard below would blame a mailbox that never vanished
            if (!stagedIds.Add(locked.Id))
            {
                throw new InvalidOperationException(
                    $"Mailbox {locked.Id} was staged for closing twice; callers fold their duplicates first."
                );
            }

            staged.Add(i);
        }

        if (staged.Count == 0)
            return results;

        var (ids, reasons, nows) = staged
            .Select(i => (closures[i].Locked.Id, MailboxStatusMap.ToDbValue(closures[i].Reason), closures[i].Now))
            .ToArray()
            .Unzip();

        var closed = new Dictionary<Guid, MailboxResponse>(staged.Count);
        await using (var closeCmd = new NpgsqlCommand(CloseLockedMailboxesSql, conn, tx))
        {
            closeCmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", ids));
            closeCmd.Parameters.Add(new NpgsqlParameter<string[]>("reasons", reasons));
            closeCmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset[]>("nows", nows));

            await using var reader = await closeCmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var row = ReadMailbox(reader);
                closed[row.Id] = row;
            }
        }

        if (closed.Count != staged.Count)
        {
            var missing = ids.Where(id => !closed.ContainsKey(id));
            throw new InvalidOperationException(
                $"Mailbox(es) [{string.Join(", ", missing)}] vanished while their row locks were held."
            );
        }

        var released = await ReleaseMailboxReceivers(
            conn,
            tx,
            [.. staged.Select(i => (closures[i].Locked.Id, SeqLo: 0L, SeqHi: long.MaxValue, closures[i].Now))],
            cancellationToken
        );

        if (released.Count > 0)
            await NotifyStatusChanged(conn, tx, cancellationToken);

        var releasedPerMailbox = new Dictionary<Guid, int>(staged.Count);
        foreach (var (mailboxId, _) in released)
        {
            releasedPerMailbox[mailboxId] = releasedPerMailbox.GetValueOrDefault(mailboxId) + 1;
        }

        foreach (var i in staged)
        {
            var id = closures[i].Locked.Id;
            results[i] = new MailboxCloseResult.Closed(
                closed[id],
                new MailboxReleaseCounts(Delivered: 0, Closed: releasedPerMailbox.GetValueOrDefault(id))
            );
        }

        return results;
    }

    /// <summary>
    /// <c>SKIP LOCKED</c> leaves a held mailbox for the next tick, and the predicates are re-evaluated against
    /// the row once locked.
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

        var result = (
            await CloseLockedMailboxes(conn, tx, [(claimed, MailboxDisposedReason.Deadline, now)], cancellationToken)
        )[0];

        await tx.CommitAsync(cancellationToken);

        result.Record();

        if (result is not MailboxCloseResult.Closed closed)
            return default;

        // The sweep's alone to publish: a mailbox that aged out has no caller to report the number to.
        var unpaired = closed.Mailbox.UnpairedDeliveries;
        if (unpaired > 0)
        {
            Metrics.MailboxDeliveriesUnpaired.Add(unpaired);
            logger.MailboxClosedWithUnpairedDeliveries(mailboxId, unpaired);
        }

        return new MailboxSweepResult(
            Closed: 1,
            ReceiversReleased: closed.Released.Closed,
            UnpairedDeliveries: unpaired,
            Failed: 0
        );
    }

    /// <summary>
    /// The replay lookup, for a whole batch: one probe of the <c>(mailbox_id, idempotency_key)</c> unique index
    /// per pair named. Hoisted for <c>QueryPlanTests</c>. It is an <c>Index Scan</c> and not an
    /// <c>Index Only Scan</c> because the projection needs the position and the acceptance instant, which the
    /// two-column index does not carry.
    /// </summary>
    internal const string SelectExistingMailboxDeliveriesSql = $"""
        SELECT {MailboxDeliveryColumns}
        FROM unnest(@mailbox_ids, @keys) AS t(mailbox_id, idempotency_key)
        JOIN engine.mailbox_deliveries d
            ON d.mailbox_id = t.mailbox_id AND d.idempotency_key = t.idempotency_key
        """;

    /// <summary>
    /// Runs <see cref="SelectExistingMailboxDeliveriesSql"/>, keyed back by the pair that named each row. Pairs
    /// must be distinct, as a repeated pair would multiply its joined row.
    /// </summary>
    private static async Task<
        Dictionary<(Guid MailboxId, string IdempotencyKey), MailboxDeliveryResponse>
    > SelectExistingMailboxDeliveries(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        (Guid MailboxId, string IdempotencyKey)[] pairs,
        CancellationToken cancellationToken
    )
    {
        var existing = new Dictionary<(Guid, string), MailboxDeliveryResponse>(pairs.Length);
        if (pairs.Length == 0)
            return existing;

        var (mailboxIds, keys) = pairs.Unzip();

        await using var cmd = new NpgsqlCommand(SelectExistingMailboxDeliveriesSql, conn, tx);
        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("mailbox_ids", mailboxIds));
        cmd.Parameters.Add(new NpgsqlParameter<string[]>("keys", keys));

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var delivery = ReadMailboxDelivery(reader);
            existing[(delivery.MailboxId, delivery.IdempotencyKey)] = delivery;
        }

        return existing;
    }

    private const string AdvanceMailboxDeliveryCountersSql = """
        UPDATE engine.mailboxes AS m
        SET next_idx = m.next_idx + v.n
        FROM unnest(@ids, @counts) AS v(id, n)
        WHERE m.id = v.id
        """;

    /// <summary>
    /// What makes the log gapless: the bump and the insert consuming what it reserved are statements of one
    /// transaction, under mailbox row locks the caller holds across both, so no concurrent delivery can hand out
    /// a position from the counter's old value.
    /// </summary>
    private static async Task AdvanceMailboxDeliveryCounters(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Dictionary<Guid, long> counts,
        CancellationToken cancellationToken
    )
    {
        var (ids, appended) = counts.Select(count => (count.Key, count.Value)).ToArray().Unzip();

        await using var cmd = new NpgsqlCommand(AdvanceMailboxDeliveryCountersSql, conn, tx);
        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", ids));
        cmd.Parameters.Add(new NpgsqlParameter<long[]>("counts", appended));

        var affected = await cmd.ExecuteNonQueryAsync(cancellationToken);

        if (affected != counts.Count)
        {
            throw new InvalidOperationException(
                $"Advancing the delivery counters of {counts.Count} locked mailbox(es) updated {affected} row(s)."
            );
        }
    }

    /// <summary>
    /// Appends the batch's accepted messages, each at the position the plan assigned it. No <c>ON CONFLICT</c>,
    /// because neither of the table's keys can conflict here: the position came from a counter read and bumped
    /// under the mailbox's row lock, and the message key was looked up under that same lock by
    /// <see cref="SelectExistingMailboxDeliveriesSql"/>. A conflict would be a bug, and a defensive clause added
    /// later would mask it.
    /// </summary>
    private const string InsertMailboxDeliveriesSql = $"""
        INSERT INTO engine.mailbox_deliveries AS d (mailbox_id, idx, idempotency_key, payload, accepted_at)
        SELECT t.mailbox_id, t.idx, t.idempotency_key, t.payload, t.accepted_at
        FROM unnest(@mailbox_ids, @idxs, @keys, @payloads, @accepted_ats)
            AS t(mailbox_id, idx, idempotency_key, payload, accepted_at)
        RETURNING {MailboxDeliveryColumns}
        """;

    /// <summary>
    /// Rows are read back rather than assembled in C# so an append and a later replay of the same key report the
    /// same <c>acceptedAt</c>, at the precision the column holds it.
    /// </summary>
    private static async Task<Dictionary<(Guid MailboxId, long Idx), MailboxDeliveryResponse>> InsertMailboxDeliveries(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        (Guid MailboxId, long Idx, string IdempotencyKey, string Payload, DateTimeOffset AcceptedAt)[] appends,
        CancellationToken cancellationToken
    )
    {
        var (mailboxIds, idxs, keys, payloads, acceptedAts) = appends.Unzip();

        await using var cmd = new NpgsqlCommand(InsertMailboxDeliveriesSql, conn, tx);
        cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("mailbox_ids", mailboxIds));
        cmd.Parameters.Add(new NpgsqlParameter<long[]>("idxs", idxs));
        cmd.Parameters.Add(new NpgsqlParameter<string[]>("keys", keys));
        cmd.Parameters.Add(new NpgsqlParameter<string[]>("payloads", payloads));
        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset[]>("accepted_ats", acceptedAts));

        var inserted = new Dictionary<(Guid, long), MailboxDeliveryResponse>(appends.Length);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var delivery = ReadMailboxDelivery(reader);
            inserted[(delivery.MailboxId, delivery.Idx)] = delivery;
        }

        if (inserted.Count != appends.Length)
        {
            throw new InvalidOperationException(
                $"Appending {appends.Length} message(s) returned {inserted.Count} delivery row(s)."
            );
        }

        return inserted;
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
            MailboxDeliveryResult result = new MailboxDeliveryResult.NotFound();

            await ExecuteWithRetry(
                async ct =>
                    result = (
                        await LockAndDeliverToMailboxes(
                            [(mailboxId, ns, idempotencyKey, payload, now)],
                            maxLogLength,
                            ct
                        )
                    )[0],
                cancellationToken
            );

            RecordDeliveryReleases([result]);

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

    /// <inheritdoc/>
    public async Task<MailboxDeliveryResult[]> BatchDeliverToMailboxes(
        IReadOnlyList<BufferedMailboxDeliveryRequest> requests,
        int maxLogLength,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.BatchDeliverToMailboxes");

        try
        {
            var results = await LockAndDeliverToMailboxes(
                [
                    .. requests.Select(request =>
                        (request.MailboxId, request.Namespace, request.IdempotencyKey, request.Payload, request.Now)
                    ),
                ],
                maxLogLength,
                cancellationToken
            );

            RecordDeliveryReleases(results);

            Metrics.DbOperationsSucceeded.Add(1);

            return results;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToBatchDeliverToMailboxes(requests.Count, ex.Message, ex);
            throw;
        }
    }

    /// <summary>
    /// Publishes the wake metric a settled batch owes, one increment per flush. Call once, after the commit: a
    /// wake an attempt rolled back woke nobody.
    /// </summary>
    private static void RecordDeliveryReleases(IReadOnlyList<MailboxDeliveryResult> results)
    {
        var released = results.Count(result => result is MailboxDeliveryResult.Accepted { ReleasedReceiver: true });
        new MailboxReleaseCounts(Delivered: released, Closed: 0).Record();
    }

    /// <summary>
    /// The transaction both delivery entry points run. Results are positional — the answer to
    /// <paramref name="deliveries"/><c>[i]</c> sits at index <c>i</c>. Records nothing; both entry points publish
    /// after their own commit.
    /// </summary>
    private async Task<MailboxDeliveryResult[]> LockAndDeliverToMailboxes(
        (Guid MailboxId, string Namespace, string IdempotencyKey, string Payload, DateTimeOffset Now)[] deliveries,
        int maxLogLength,
        CancellationToken cancellationToken
    )
    {
        var results = new MailboxDeliveryResult[deliveries.Length];
        if (deliveries.Length == 0)
            return results;

        var pairs = new (Guid Id, string Namespace)[deliveries.Length];
        for (var i = 0; i < deliveries.Length; i++)
            pairs[i] = (deliveries[i].MailboxId, WorkflowNamespace.Normalize(deliveries[i].Namespace));

        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        var locked = await LockMailboxesForMutation(conn, tx, pairs, cancellationToken);

        // The namespace belongs in the fold key: without it, two requests naming one mailbox under different
        // namespaces would be each other's repeat, and the one that cannot see the mailbox would be answered
        // Duplicate for a delivery it never made.
        var primaries = new List<(int Index, MailboxResponse Locked)>(deliveries.Length);
        var firstOccurrence = new Dictionary<(Guid, string, string), int>(deliveries.Length);
        var repeats = new List<(int Index, int PrimaryIndex)>();

        for (var i = 0; i < deliveries.Length; i++)
        {
            var foldKey = (pairs[i].Id, pairs[i].Namespace, deliveries[i].IdempotencyKey);
            if (firstOccurrence.TryGetValue(foldKey, out var primary))
            {
                repeats.Add((i, primary));
                continue;
            }

            firstOccurrence[foldKey] = i;

            if (locked.TryGetValue(pairs[i], out var mailbox))
                primaries.Add((i, mailbox));
            else
                results[i] = new MailboxDeliveryResult.NotFound();
        }

        var existing = await SelectExistingMailboxDeliveries(
            conn,
            tx,
            [.. primaries.Select(primary => (primary.Locked.Id, deliveries[primary.Index].IdempotencyKey))],
            cancellationToken
        );

        var accepted = new List<(int Index, Guid MailboxId, long Idx)>(primaries.Count);
        var appendCounts = new Dictionary<Guid, long>(locked.Count);

        foreach (var (index, mailbox) in primaries)
        {
            var delivery = deliveries[index];

            if (existing.TryGetValue((mailbox.Id, delivery.IdempotencyKey), out var kept))
            {
                results[index] = new MailboxDeliveryResult.Duplicate(kept);
                continue;
            }

            if (mailbox.Status == MailboxStatus.Disposed)
            {
                results[index] = new MailboxDeliveryResult.Closed(mailbox);
                continue;
            }

            var idx = mailbox.NextIdx + appendCounts.GetValueOrDefault(mailbox.Id);

            if (idx >= maxLogLength)
            {
                results[index] = new MailboxDeliveryResult.LogFull(idx);
                continue;
            }

            accepted.Add((index, mailbox.Id, idx));
            appendCounts[mailbox.Id] = appendCounts.GetValueOrDefault(mailbox.Id) + 1;
        }

        if (accepted.Count > 0)
        {
            await AdvanceMailboxDeliveryCounters(conn, tx, appendCounts, cancellationToken);

            var appended = await InsertMailboxDeliveries(
                conn,
                tx,
                [
                    .. accepted.Select(append =>
                        (
                            append.MailboxId,
                            append.Idx,
                            deliveries[append.Index].IdempotencyKey,
                            deliveries[append.Index].Payload,
                            AcceptedAt: deliveries[append.Index].Now
                        )
                    ),
                ],
                cancellationToken
            );

            // Inside the delivery's own transaction: a held receiver has no timer, so a wake that could commit
            // separately would park it to its mailbox's deadline
            var released = await ReleaseMailboxReceivers(
                conn,
                tx,
                [
                    .. accepted.Select(append =>
                        (append.MailboxId, SeqLo: append.Idx, SeqHi: append.Idx, deliveries[append.Index].Now)
                    ),
                ],
                cancellationToken
            );

            if (released.Count > 0)
                await NotifyStatusChanged(conn, tx, cancellationToken);

            // Keyed off the positions returned, never their order — RETURNING has none
            var woken = new HashSet<(Guid MailboxId, long Seq)>(released);

            foreach (var (index, mailboxId, idx) in accepted)
            {
                results[index] = new MailboxDeliveryResult.Accepted(
                    appended[(mailboxId, idx)],
                    ReleasedReceiver: woken.Contains((mailboxId, idx))
                );
            }
        }

        await tx.CommitAsync(cancellationToken);

        foreach (var (index, primaryIndex) in repeats)
            results[index] = RepeatOfDelivery(results[primaryIndex]);

        if (results.Any(result => result is null))
        {
            throw new UnreachableException("Not all results were set.");
        }

        return results;
    }

    private static MailboxDeliveryResult RepeatOfDelivery(MailboxDeliveryResult primary) =>
        primary switch
        {
            MailboxDeliveryResult.Accepted accepted => new MailboxDeliveryResult.Duplicate(accepted.Delivery),
            _ => primary,
        };

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

/// <summary>The mailboxes, newest first, and the keys whose window was full.</summary>
internal sealed record MailboxCollectionPage(
    IReadOnlyList<MailboxSnapshot> Mailboxes,
    IReadOnlyList<string> TruncatedCollections
)
{
    internal static MailboxCollectionPage Empty { get; } = new([], []);
}

/// <summary>
/// <see cref="Positions"/> is empty for a mailbox minted but not yet delivered into or received from — a real
/// and often long-lived state.
/// </summary>
internal sealed record MailboxSnapshot(MailboxResponse Mailbox, IReadOnlyList<MailboxPosition> Positions);

/// <summary>The two logs share one position space, so a position carries a delivery, a receiver, or both.</summary>
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

    /// <summary>Refused before the database: an over-long key would read as a transient error and be retried.</summary>
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
    long UnpairedDeliveries = 0,
    int Failed = 0
)
{
    public static MailboxSweepResult operator +(MailboxSweepResult left, MailboxSweepResult right) =>
        new(
            left.Closed + right.Closed,
            left.ReceiversReleased + right.ReceiversReleased,
            left.UnpairedDeliveries + right.UnpairedDeliveries,
            left.Failed + right.Failed
        );

    public bool IsEmpty => Closed == 0 && Failed == 0;
}

internal abstract record MailboxCloseResult
{
    private MailboxCloseResult() { }

    /// <summary>Publishes the telemetry this outcome owes; call once, after the commit.</summary>
    public virtual void Record() { }

    internal sealed record Closed(MailboxResponse Mailbox, MailboxReleaseCounts Released) : MailboxCloseResult
    {
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

    /// <summary>Refused before the database: an over-long key would read as a transient error and be retried.</summary>
    internal sealed record Invalid(string Message) : MailboxDeliveryResult;
}
