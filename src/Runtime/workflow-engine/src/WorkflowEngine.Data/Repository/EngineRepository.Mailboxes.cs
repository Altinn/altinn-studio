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
    /// The one statement that releases parked receivers: a wake names one position, a closure release names its
    /// mailbox's whole position range. One statement so the status transition and the <c>released_at</c> stamp
    /// cannot diverge. Arrays so one round-trip releases for a whole batch of mailboxes, each element carrying
    /// its own <c>now</c> so the timestamps a caller pinned stay per-mailbox. The range is expressed as two
    /// bounds rather than a nullable position on purpose: a <c>t.seq IS NULL OR mr.seq = t.seq</c> disjunction
    /// over a joined column cannot be const-folded, so the position drops out of the index probe and every wake
    /// reads its mailbox's entire registry slice. Hoisted so <c>QueryPlanTests</c> can <c>EXPLAIN</c> that both
    /// key columns stay in the probe.
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
    /// Runs <see cref="ReleaseMailboxReceiversSql"/> and returns the positions it released, in no particular
    /// order. Each element names a mailbox and an inclusive range of its positions. Ranges over one mailbox must
    /// not overlap: an overlapped position is released once, and which element's <c>Now</c> gets stamped on it is
    /// arbitrary — so callers fold their duplicates before getting here.
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

    private static async Task<bool> ReleaseReceiverAt(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid mailboxId,
        long seq,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        var released = await ReleaseMailboxReceivers(
            conn,
            tx,
            [(mailboxId, SeqLo: seq, SeqHi: seq, now)],
            cancellationToken
        );
        return released.Count > 0;
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
    /// is what makes the order binding: PostgreSQL sorts before it locks, so a close flush, a delivery flush and
    /// an enqueue flush all take their rows in one total order — the order
    /// <c>LockAndReadMailboxes</c> takes too — and concurrent flushes convoy instead of deadlocking. Hoisted so
    /// <c>QueryPlanTests</c> can <c>EXPLAIN</c> that the ids stay a primary-key probe rather than degrading into
    /// a scan filtered by the array, which would have one flush of a hundred read the whole table.
    /// </summary>
    internal const string LockMailboxesForMutationSql = $"""
        SELECT {MailboxColumns}
        FROM engine.mailboxes m
        JOIN unnest(@ids, @namespaces) AS t(id, ns) ON m.id = t.id AND m.namespace = t.ns
        ORDER BY m.id
        FOR UPDATE
        """;

    /// <summary>
    /// Runs <see cref="LockMailboxesForMutationSql"/> over the pairs a flush is about to decide on, keyed back by
    /// the pair that named each row. Pairs are deduplicated before the statement sees them: a mailbox named by a
    /// hundred requests of one batch is locked and read once, not a hundred times. They are presented in id order
    /// too, as <c>LockAndReadMailboxes</c> presents its own, but it is the statement's <c>ORDER BY</c> that binds
    /// — PostgreSQL's <c>uuid</c> ordering is the order the locks are taken in, and .NET's <c>Guid</c> comparison
    /// is not the same one. A pair with no entry in the result matched no row; what that means is the caller's,
    /// since only it knows whether a missing mailbox is a refusal or an error.
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
    /// The mint, for a whole batch: one <c>INSERT ... SELECT</c> over the batch's arrays, and no lock and no
    /// transaction anywhere near it. The unique index on <c>(namespace, idempotency_key)</c> is the
    /// serialization point — two minters racing over one key convoy on it, and the loser reads the winner's row
    /// afterwards — so a mint that took the mailbox row lock would only be taking a lock on a row it is
    /// creating. <c>fresh</c> drops the keys this snapshot already sees, which is what makes a replay consume no
    /// collection slot; the survivors then rank within their collection (<c>peers_ahead</c>), so a batch counts
    /// its own fresh mints against the cap instead of admitting all of them off one <c>open_counts</c> reading.
    /// The cap stays best-effort by design: it is one snapshot's count, and a concurrent mint that has not
    /// committed is invisible to it. <c>DO NOTHING</c> rather than a token <c>DO UPDATE</c>: a key that lost the
    /// race is simply absent from the result, and the classification read answers it, as it answers the key this
    /// call itself inserted on an attempt whose commit it never saw.
    /// <para>
    /// The <c>ORDER BY</c> is what keeps two flushes that overlap on several keys from deadlocking against each
    /// other: an insert meeting another transaction's uncommitted speculative tuple waits for it, so what has to
    /// hold is that every flush inserts contested keys in one agreed total order. Any consistent order would do;
    /// this one is the unique index's own column order, <c>(namespace, idempotency_key)</c>, which is the order
    /// to reach for per table. <c>InsertIdempotencyKeys</c> (<c>Writes.cs</c>) is the same discipline spelled the
    /// other way round, its own table's key being <c>(idempotency_key, namespace)</c>.
    /// </para>
    /// <para>
    /// <c>open_counts</c> counts through a correlated subquery per distinct collection key, behind an
    /// <c>AS MATERIALIZED</c> fence. The fence is there for what it guarantees, not for a cost it overrides:
    /// evaluated once, the CTE is one index probe per distinct <c>(namespace, collection_key)</c>, which is all
    /// the work this count should ever be. Inlined — and PostgreSQL does inline it — the count moves into the
    /// outer join's filter as a <c>SubPlan</c>, where nothing holds it to one evaluation per distinct key rather
    /// than one per candidate row. Spelled the other obvious way, as a grouped <c>count(*)</c> over a join, the
    /// planner is free to turn the count round entirely and read the whole open-mailbox set once instead of
    /// probing per key, which at a flush's width is thousands of rows to answer for a few dozen collections.
    /// </para>
    /// Hoisted so <c>QueryPlanTests</c> can <c>EXPLAIN</c> that both reads of <c>engine.mailboxes</c> stay index
    /// probes driven by the batch's arrays. Both widths are explained there: PostgreSQL plans a custom plan from
    /// the array length it is given, so neither width is evidence about the other.
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

            // A batch of one: the slot and the retry are this path's own, but the statements inside are the
            // batch's, so one routine answers a single caller and a whole flush identically.
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

            // Nothing per item, unlike the close flush: the mint's one metric belongs to the verdict the Engine
            // hands its caller, not to the row written here. The round-trip itself is all this owes.
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
    /// The two statements both mint entry points run: <see cref="MintMailboxesSql"/> over the batch's candidate
    /// keys, then a classification read for the keys it did not return. Results are positional — the answer to
    /// <paramref name="mints"/><c>[i]</c> sits at index <c>i</c>.
    /// <para>
    /// Split from <see cref="BatchMintMailboxes"/> so the per-request path can keep its own envelope: routed
    /// through the public method instead, a single mint would count <see cref="Metrics.DbOperationsSucceeded"/>
    /// twice (once here, once from its retry), log a failure as a batch of one on top of its own line, and have
    /// to fabricate a buffer's <c>TaskCompletionSource</c> per attempt to name its request. That is the whole
    /// reason for this layer — there is no second entry point holding locks, the way the deadline sweep enters
    /// <see cref="CloseLockedMailboxes"/>.
    /// </para>
    /// The two statements deliberately share neither a transaction nor a lock: each is correct on its own, and
    /// an attempt that dies between them leaves committed mailboxes that the caller's retry reads back as its
    /// own. Nothing is recorded here, because the per-request path publishes its telemetry outside its retry.
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

        // The fold, in batch order: one candidate per key reaches the statement, standing in for the
        // unique-index race two separate calls would have had, and the repeats inherit its verdict once it is
        // settled. Two properties rest on folding here rather than letting the statement sort it out. The cap:
        // only candidates rank, so a key named twice costs its collection one slot and not two. And attribution:
        // ON CONFLICT DO NOTHING tolerates a self-conflict within one statement, so both requests would be
        // answered even unfolded — but which of them was the one that minted would fall out of the order the
        // sort happened to emit two equal keys in. Folding first is what makes "the first occurrence mints, the
        // repeat replays" a rule rather than a coincidence.
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

        // What the insert did not return is one of three things, and one read tells them apart: a key somebody
        // already holds, this call's own insert from an attempt whose commit it never saw, or a candidate the
        // cap refused — the only one of the three with no row anywhere.
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

            // One rule for both reads: the row is this request's own mint exactly when it carries the candidate
            // id, and anything else is a replay of a mailbox somebody already holds. A row the insert returned
            // always carries it; a row the classification found carries it only when this call's own earlier
            // attempt committed after the client had given up on it.
            results[i] =
                row.Id == mints[i].MailboxId ? new MailboxMintResult.Minted(row) : new MailboxMintResult.Existing(row);
        }

        foreach (var (index, primaryIndex) in repeats)
            results[index] = RepeatOfMint(results[primaryIndex]);

        // Every position is a candidate's verdict or a repeat of one, so this holds by construction — but the
        // buffer hands each result straight to a waiting caller, and a fourth path added above must not answer
        // one with null.
        if (results.Any(result => result is null))
        {
            throw new UnreachableException("Not all results were set.");
        }

        return results;
    }

    /// <summary>
    /// What the second request naming a key is answered: the row the first one settled on, but never a second
    /// <see cref="MailboxMintResult.Minted"/> — one insert is one mint, and the repeat is the replay it would
    /// have been as a separate call. A refusal repeats unchanged, the collection being no emptier for it.
    /// Named for its verdict rather than overloading the close fold's <c>RepeatOf</c>, which would have to sit
    /// adjacent to this and away from the fold it serves.
    /// </summary>
    private static MailboxMintResult RepeatOfMint(MailboxMintResult primary) =>
        primary switch
        {
            MailboxMintResult.Minted minted => new MailboxMintResult.Existing(minted.Mailbox),
            _ => primary,
        };

    /// <summary>
    /// Reads the mailboxes behind a set of idempotency keys — the mint's classification read, following the
    /// <c>ClassifyExistingIdempotencyKeys</c> pattern (<c>Writes.cs</c>): the array join makes it one probe of
    /// the unique index per key rather than one statement per key. Pairs must be distinct, as a repeated pair
    /// would multiply its joined row. A pair absent from the result has no mailbox at all, which on the mint
    /// path is how a candidate the cap refused is recognised.
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
            MailboxCloseResult result = new MailboxCloseResult.NotFound();

            // A batch of one: the retry and the slot are this path's own, but the transaction inside is the
            // batch's, so one routine answers a single caller and a whole flush identically.
            await ExecuteWithRetry(
                async ct => result = (await LockAndCloseMailboxes([(mailboxId, ns, reason, now)], ct))[0],
                cancellationToken
            );

            // Outside the retry: an attempt that was rolled back and re-run closed nothing to report.
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

            // After the commit, per request: a repeat and a miss owe no telemetry, so this is the closes and
            // their release counts only.
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
    /// The transaction both close entry points run: lock every named mailbox, fold the batch down to one close
    /// per mailbox, close them, release what was parked on them. Results are positional — the answer to
    /// <paramref name="closes"/><c>[i]</c> sits at index <c>i</c> — and nothing is recorded here, because the
    /// per-request path publishes its telemetry outside its retry.
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

        // The fold, in batch order: a pair the lock did not match is this method's own refusal, and a pair named
        // twice is folded away here, standing in for the row-lock race two separate calls would have had. What
        // survives is one request per mailbox — distinct pairs, and a matched pair's namespace is its row's, so
        // distinct ids — which is what CloseLockedMailboxes requires of its input.
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

        // Resolved once the primaries are settled, so a repeat reports the disposal that is now on the row.
        foreach (var (index, primaryIndex) in repeats)
            results[index] = RepeatOf(results[primaryIndex]);

        // Every position is a repeat, a close, or a miss, so this holds by construction — but the buffer hands
        // each result straight to a waiting caller, and a fifth path added above must not answer one with null.
        if (results.Any(result => result is null))
        {
            throw new UnreachableException("Not all results were set.");
        }

        return results;
    }

    /// <summary>
    /// What the second request naming a mailbox is answered: the same verdict as the first, except that a close
    /// is a close only once — the repeat replays it, as it would have on the next call.
    /// </summary>
    private static MailboxCloseResult RepeatOf(MailboxCloseResult primary) =>
        primary switch
        {
            MailboxCloseResult.Closed closed => new MailboxCloseResult.AlreadyClosed(closed.Mailbox),
            _ => primary,
        };

    /// <summary>
    /// Closes a whole set of mailboxes in one statement, each row taking its own reason and timestamp from the
    /// array element naming it, so a batch's per-request <c>now</c> values stay distinct. Hoisted so
    /// <c>QueryPlanTests</c> can <c>EXPLAIN</c> that the ids stay a primary-key probe.
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
    /// them — two statements however many mailboxes are closing. Split from <see cref="CloseMailbox"/> so the
    /// deadline sweep can run the identical routine under its own claim; releasing under the same lock keeps a
    /// concurrent enqueue from parking a receiver on a closed mailbox. Each element carries the reason and
    /// timestamp to stamp on its locked mailbox, and is answered by the result at the same position.
    /// Precondition: the ids staged for closing are distinct, because one <c>UPDATE</c> row per id is what the
    /// results and the release counts are read back through. Callers fold their duplicates — deciding what the
    /// second one is answered — before getting here, and a repeat is refused below rather than closed twice.
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

            // First close wins: the replay reports the original disposal and releases nothing.
            if (locked.Status == MailboxStatus.Disposed)
            {
                results[i] = new MailboxCloseResult.AlreadyClosed(locked);
                continue;
            }

            // The precondition, failing by its own name: a repeated id would close its row once, and the
            // rows-affected guard below would then blame a mailbox that never vanished.
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

        // Unreachable: we hold every one of these rows' locks, and the ids are distinct, so every one of them
        // has a row of its own to write. Kept as a loud failure rather than a silent NotFound.
        if (closed.Count != staged.Count)
        {
            var missing = ids.Where(id => !closed.ContainsKey(id));
            throw new InvalidOperationException(
                $"Mailbox(es) [{string.Join(", ", missing)}] vanished while their row locks were held."
            );
        }

        // A closure takes every parked receiver its mailbox has, so each element spans the whole position
        // range: the lower bound is where the counter starts, the upper the largest position the column can
        // hold, there being no bound on how far a live mailbox's counter has run.
        var released = await ReleaseMailboxReceivers(
            conn,
            tx,
            [.. staged.Select(i => (closures[i].Locked.Id, SeqLo: 0L, SeqHi: long.MaxValue, closures[i].Now))],
            cancellationToken
        );

        if (released.Count > 0)
            await NotifyStatusChanged(conn, tx, cancellationToken);

        // The release statement answers in no particular order, so the counts are grouped by mailbox rather
        // than read off positions.
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
    /// <c>FOR UPDATE</c> is the row lock <see cref="CloseLockedMailboxes"/> requires; <c>SKIP LOCKED</c> leaves a
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

        var result = (
            await CloseLockedMailboxes(conn, tx, [(claimed, MailboxDisposedReason.Deadline, now)], cancellationToken)
        )[0];

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
